// logging/log-stream-server.js
const WebSocket = require('ws');
const { EventEmitter } = require('events');
const crypto = require('crypto');

/**
 * Real-time Log Streaming Server
 * Provides WebSocket-based live log streaming with authentication and filtering
 */
class LogStreamServer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      port: config.port || 8081,
      maxConnections: config.maxConnections || 100,
      heartbeatInterval: config.heartbeatInterval || 30000,
      bufferSize: config.bufferSize || 1000,
      compressionEnabled: config.compressionEnabled !== false,
      rateLimitEnabled: config.rateLimitEnabled !== false,
      maxMessagesPerSecond: config.maxMessagesPerSecond || 50,
      ...config
    };
    
    this.wss = null;
    this.clients = new Map();
    this.logManager = null;
    this.heartbeatTimer = null;
    this.messageBuffer = [];
    this.isRunning = false;
    
    // Rate limiting
    this.rateLimitMap = new Map();
  }
  
  /**
   * Initialize the streaming server
   */
  async initialize(logManager) {
    try {
      this.logManager = logManager;
      
      // Create WebSocket server
      this.wss = new WebSocket.Server({
        port: this.config.port,
        perMessageDeflate: this.config.compressionEnabled
      });
      
      // Setup WebSocket event handlers
      this.wss.on('connection', (ws, request) => {
        this.handleConnection(ws, request);
      });
      
      this.wss.on('error', (error) => {
        this.emit('error', { error: error.message, component: 'websocket_server' });
      });
      
      // Listen to log manager events
      this.logManager.on('logEntry', (data) => {
        this.broadcastLogEntry(data);
      });
      
      this.logManager.on('error', (error) => {
        this.broadcastError(error);
      });
      
      // Start heartbeat timer
      this.startHeartbeat();
      
      this.isRunning = true;
      this.emit('initialized', { port: this.config.port });
      
      console.log(`Log streaming server started on port ${this.config.port}`);
    } catch (error) {
      this.emit('error', { error: error.message, operation: 'initialization' });
      throw error;
    }
  }
  
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, request) {
    const clientId = crypto.randomUUID();
    const clientIp = request.socket.remoteAddress;
    
    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1013, 'Server overloaded');
      return;
    }
    
    const client = {
      id: clientId,
      ws: ws,
      ip: clientIp,
      connectedAt: new Date().toISOString(),
      authenticated: false,
      subscriptions: new Set(),
      filters: {},
      lastPing: Date.now(),
      messageCount: 0,
      rateLimitReset: Date.now() + 1000
    };
    
    this.clients.set(clientId, client);
    
    // Setup client event handlers
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });
    
    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });
    
    ws.on('error', (error) => {
      this.emit('error', { 
        error: error.message, 
        component: 'websocket_client',
        clientId,
        clientIp
      });
    });
    
    ws.on('pong', () => {
      if (this.clients.has(clientId)) {
        this.clients.get(clientId).lastPing = Date.now();
      }
    });
    
    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId: clientId,
      serverTime: new Date().toISOString(),
      config: {
        heartbeatInterval: this.config.heartbeatInterval,
        maxMessagesPerSecond: this.config.maxMessagesPerSecond
      }
    });
    
    this.emit('clientConnected', { clientId, clientIp });
  }
  
  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.emit('clientDisconnected', { 
        clientId, 
        clientIp: client.ip,
        code, 
        reason: reason?.toString(),
        connectedDuration: Date.now() - new Date(client.connectedAt).getTime()
      });
    }
  }
  
  /**
   * Handle incoming message from client
   */
  async handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Rate limiting
    if (this.config.rateLimitEnabled && !this.checkRateLimit(client)) {
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Rate limit exceeded',
        maxMessagesPerSecond: this.config.maxMessagesPerSecond
      });
      return;
    }
    
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'authenticate':
          await this.handleAuthentication(clientId, message);
          break;
          
        case 'subscribe':
          await this.handleSubscription(clientId, message);
          break;
          
        case 'unsubscribe':
          await this.handleUnsubscription(clientId, message);
          break;
          
        case 'setFilters':
          await this.handleSetFilters(clientId, message);
          break;
          
        case 'getHistory':
          await this.handleGetHistory(clientId, message);
          break;
          
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          this.sendToClient(clientId, {
            type: 'error',
            error: `Unknown message type: ${message.type}`
          });
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Invalid JSON message'
      });
    }
  }
  
  /**
   * Handle client authentication
   */
  async handleAuthentication(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { apiKey } = message;
    if (!apiKey) {
      this.sendToClient(clientId, {
        type: 'authResult',
        success: false,
        error: 'API key required'
      });
      return;
    }
    
    const authResult = this.logManager.authenticateRequest(apiKey, 'read');
    if (!authResult.valid) {
      this.sendToClient(clientId, {
        type: 'authResult',
        success: false,
        error: authResult.error
      });
      return;
    }
    
    client.authenticated = true;
    client.apiKey = apiKey;
    client.permissions = authResult.keyData.permissions;
    
    this.sendToClient(clientId, {
      type: 'authResult',
      success: true,
      permissions: client.permissions,
      availableSubsystems: this.logManager.getSubsystems()
    });
    
    this.emit('clientAuthenticated', { clientId, permissions: client.permissions });
  }
  
  /**
   * Handle subscription to subsystems
   */
  async handleSubscription(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Authentication required'
      });
      return;
    }
    
    const { subsystems = [] } = message;
    const availableSubsystems = this.logManager.getSubsystems();
    
    for (const subsystem of subsystems) {
      if (availableSubsystems.includes(subsystem)) {
        client.subscriptions.add(subsystem);
      }
    }
    
    this.sendToClient(clientId, {
      type: 'subscriptionResult',
      subscriptions: Array.from(client.subscriptions)
    });
  }
  
  /**
   * Handle unsubscription from subsystems
   */
  async handleUnsubscription(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { subsystems = [] } = message;
    
    for (const subsystem of subsystems) {
      client.subscriptions.delete(subsystem);
    }
    
    this.sendToClient(clientId, {
      type: 'subscriptionResult',
      subscriptions: Array.from(client.subscriptions)
    });
  }
  
  /**
   * Handle setting filters
   */
  async handleSetFilters(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { filters = {} } = message;
    client.filters = {
      statusCodes: filters.statusCodes || [],
      methods: filters.methods || [],
      clientIps: filters.clientIps || [],
      searchText: filters.searchText || '',
      minLevel: filters.minLevel || 'info'
    };
    
    this.sendToClient(clientId, {
      type: 'filtersSet',
      filters: client.filters
    });
  }
  
  /**
   * Handle history request
   */
  async handleGetHistory(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Authentication required'
      });
      return;
    }
    
    const { limit = 100, subsystems } = message;
    const targetSubsystems = subsystems || Array.from(client.subscriptions);
    
    try {
      const searchResult = await this.logManager.searchLogs({
        subsystems: targetSubsystems,
        limit: Math.min(limit, 1000),
        ...client.filters
      });
      
      this.sendToClient(clientId, {
        type: 'history',
        entries: searchResult.results,
        total: searchResult.total
      });
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        error: `Failed to get history: ${error.message}`
      });
    }
  }
  
  /**
   * Check rate limit for client
   */
  checkRateLimit(client) {
    const now = Date.now();
    
    if (now > client.rateLimitReset) {
      client.messageCount = 0;
      client.rateLimitReset = now + 1000;
    }
    
    client.messageCount++;
    return client.messageCount <= this.config.maxMessagesPerSecond;
  }
  
  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      client.ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      this.emit('error', { 
        error: error.message, 
        component: 'send_message',
        clientId 
      });
      return false;
    }
  }
  
  /**
   * Broadcast log entry to subscribed clients
   */
  broadcastLogEntry(data) {
    const { subsystem, entry } = data;
    
    for (const [clientId, client] of this.clients) {
      if (!client.authenticated || !client.subscriptions.has(subsystem)) {
        continue;
      }
      
      // Apply filters
      if (!this.entryMatchesFilters(entry, client.filters)) {
        continue;
      }
      
      this.sendToClient(clientId, {
        type: 'logEntry',
        subsystem,
        entry
      });
    }
  }
  
  /**
   * Broadcast error to all authenticated clients
   */
  broadcastError(error) {
    for (const [clientId, client] of this.clients) {
      if (client.authenticated) {
        this.sendToClient(clientId, {
          type: 'systemError',
          error
        });
      }
    }
  }
  
  /**
   * Check if entry matches client filters
   */
  entryMatchesFilters(entry, filters) {
    // Status code filter
    if (filters.statusCodes?.length > 0 && !filters.statusCodes.includes(entry.statusCode)) {
      return false;
    }
    
    // Method filter
    if (filters.methods?.length > 0 && !filters.methods.includes(entry.method)) {
      return false;
    }
    
    // Client IP filter
    if (filters.clientIps?.length > 0 && !filters.clientIps.includes(entry.clientIp)) {
      return false;
    }
    
    // Text search filter
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const entryText = [
        entry.method,
        entry.url,
        entry.path,
        entry.userAgent,
        entry.error?.message,
        JSON.stringify(entry.subsystemData)
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!entryText.includes(searchText)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Start heartbeat to keep connections alive
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const deadClients = [];
      
      for (const [clientId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client responded to last ping
          if (now - client.lastPing > this.config.heartbeatInterval * 2) {
            deadClients.push(clientId);
          } else {
            // Send ping
            client.ws.ping();
          }
        } else {
          deadClients.push(clientId);
        }
      }
      
      // Remove dead clients
      for (const clientId of deadClients) {
        this.handleDisconnection(clientId, 1006, 'Connection timeout');
      }
      
    }, this.config.heartbeatInterval);
  }
  
  /**
   * Get server statistics
   */
  getStats() {
    const stats = {
      isRunning: this.isRunning,
      port: this.config.port,
      totalConnections: this.clients.size,
      authenticatedConnections: 0,
      subscriptions: {},
      messagesSent: 0,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
    
    for (const [clientId, client] of this.clients) {
      if (client.authenticated) {
        stats.authenticatedConnections++;
      }
      
      for (const subscription of client.subscriptions) {
        stats.subscriptions[subscription] = (stats.subscriptions[subscription] || 0) + 1;
      }
    }
    
    return stats;
  }
  
  /**
   * Shutdown the streaming server
   */
  async shutdown() {
    try {
      this.isRunning = false;
      
      // Clear heartbeat timer
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      
      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.ws.close(1001, 'Server shutting down');
      }
      this.clients.clear();
      
      // Close WebSocket server
      if (this.wss) {
        await new Promise((resolve) => {
          this.wss.close(resolve);
        });
      }
      
      this.emit('shutdown');
      console.log('Log streaming server shut down');
    } catch (error) {
      this.emit('error', { error: error.message, operation: 'shutdown' });
    }
  }
}

module.exports = LogStreamServer;