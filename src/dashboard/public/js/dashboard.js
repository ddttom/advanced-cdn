// dashboard/public/js/dashboard.js

/**
 * CDN API Dashboard Frontend
 * Vanilla JavaScript implementation for the dashboard interface
 */
class CDNDashboard {
  constructor() {
    this.apiBase = '/dashboard/api';
    this.endpoints = [];
    this.categories = [];
    this.refreshInterval = null;
    this.executionHistory = new Map();
    this.executionCache = new Map();
    this.maxHistorySize = 100;
    this.cacheTimeout = 30000; // 30 seconds
    this.init();
  }

  /**
   * Initialize dashboard
   */
  async init() {
    this.setupEventListeners();
    await this.loadInitialData();
    this.startAutoRefresh();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Header actions
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refreshData();
    });

    document.getElementById('scan-btn').addEventListener('click', () => {
      this.triggerScan();
    });

    // Category filter
    document.getElementById('category-filter').addEventListener('change', (e) => {
      this.filterEndpoints(e.target.value);
    });

    // API testing
    document.getElementById('test-endpoint-btn').addEventListener('click', () => {
      this.testEndpoint();
    });

    document.getElementById('test-all-btn').addEventListener('click', () => {
      this.testAllHealthEndpoints();
    });
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    this.showLoading(true);
    
    try {
      await Promise.all([
        this.loadDashboardStatus(),
        this.loadEndpoints(),
        this.loadCategories()
      ]);
      
      this.updateLastUpdated();
      this.showNotification('Dashboard loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showNotification('Failed to load dashboard data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load dashboard status
   */
  async loadDashboardStatus() {
    try {
      const response = await fetch(`${this.apiBase}/dashboard/status`);
      const result = await response.json();
      
      if (result.success) {
        this.updateStatusCards(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard status:', error);
    }
  }

  /**
   * Load endpoints
   */
  async loadEndpoints() {
    try {
      const response = await fetch(`${this.apiBase}/discovery/endpoints`);
      const result = await response.json();
      
      if (result.success) {
        this.endpoints = result.data;
        this.renderEndpoints(this.endpoints);
        this.updateEndpointsCount(result.meta.total);
        this.updateLastScanTime(result.meta.lastScan);
      }
    } catch (error) {
      console.error('Error loading endpoints:', error);
    }
  }

  /**
   * Load categories
   */
  async loadCategories() {
    try {
      const response = await fetch(`${this.apiBase}/discovery/categories`);
      const result = await response.json();
      
      if (result.success) {
        this.categories = result.data;
        this.updateCategoriesFilter();
        this.updateCategoriesCount(result.data.length);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  /**
   * Update status cards
   */
  updateStatusCards(status) {
    // Update health status
    const healthElement = document.getElementById('health-status');
    healthElement.textContent = status.status === 'healthy' ? 'Healthy' : 'Issues';
    healthElement.parentElement.parentElement.className = 
      `status-card ${status.status === 'healthy' ? 'healthy' : 'warning'}`;

    // Update uptime
    const uptimeHours = Math.floor(status.uptime / 3600);
    document.getElementById('uptime-value').textContent = uptimeHours;

    // Update discovery stats if available
    if (status.discovery) {
      this.updateEndpointsCount(status.discovery.totalEndpoints || 0);
    }
  }

  /**
   * Update endpoints count
   */
  updateEndpointsCount(count) {
    document.getElementById('endpoints-count').textContent = count;
  }

  /**
   * Update categories count
   */
  updateCategoriesCount(count) {
    document.getElementById('categories-count').textContent = count;
  }

  /**
   * Update last scan time
   */
  updateLastScanTime(timestamp) {
    if (timestamp) {
      const date = new Date(timestamp);
      document.getElementById('last-scan-time').textContent = 
        date.toLocaleString();
    }
  }

  /**
   * Update categories filter
   */
  updateCategoriesFilter() {
    const select = document.getElementById('category-filter');
    
    // Clear existing options except "All Categories"
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }

    // Add category options
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = this.formatCategoryName(category);
      select.appendChild(option);
    });
  }

  /**
   * Format category name for display
   */
  formatCategoryName(category) {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Create execute button for endpoint
   */
  createExecuteButton(endpoint) {
    const buttonId = `execute-${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const safetyClass = endpoint.safeToExecute ? 'btn-execute-safe' : 'btn-execute-warning';
    const confirmText = endpoint.confirmationRequired ? 'data-confirm="true"' : '';
    const authText = endpoint.requiresAuth ? 'data-auth="true"' : '';
    
    return `
      <button 
        id="${buttonId}" 
        class="btn-execute ${safetyClass}" 
        ${confirmText}
        ${authText}
        data-method="${endpoint.method}"
        data-path="${endpoint.path}"
        data-endpoint='${JSON.stringify(endpoint)}'
        title="Execute ${endpoint.method} ${endpoint.path}"
        aria-label="Execute endpoint ${endpoint.method} ${endpoint.path}"
      >
        <span class="btn-execute-icon">▶️</span>
        <span class="btn-execute-text">Execute</span>
        <span class="btn-execute-spinner hidden">⏳</span>
      </button>
    `;
  }

  /**
   * Render endpoints
   */
  renderEndpoints(endpoints) {
    const grid = document.getElementById('endpoints-grid');
    grid.innerHTML = '';

    if (endpoints.length === 0) {
      grid.innerHTML = '<div class="text-center text-muted">No endpoints found</div>';
      return;
    }

    endpoints.forEach(endpoint => {
      const card = this.createEndpointCard(endpoint);
      grid.appendChild(card);
    });

    // Set up execute button event listeners
    this.setupExecuteButtonListeners();
  }

  /**
   * Create endpoint card element
   */
  createEndpointCard(endpoint) {
    const card = document.createElement('div');
    card.className = 'endpoint-card';
    
    const executeButton = endpoint.executable ? this.createExecuteButton(endpoint) : '';
    
    card.innerHTML = `
      <div class="endpoint-header">
        <span class="endpoint-method method-${endpoint.method.toLowerCase()}">
          ${endpoint.method}
        </span>
        <span class="endpoint-category">
          ${this.formatCategoryName(endpoint.category)}
        </span>
      </div>
      <div class="endpoint-path">${endpoint.path}</div>
      <div class="endpoint-description">
        ${endpoint.description || 'No description available'}
      </div>
      <div class="endpoint-actions">
        ${executeButton}
      </div>
    `;

    // Add click handler to populate test form (only on non-button areas)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.endpoint-actions')) {
        document.getElementById('test-method').value = endpoint.method;
        document.getElementById('test-path').value = endpoint.path;
        this.updateTestFormParameters(endpoint);
      }
    });

    return card;
  }

  /**
   * Filter endpoints by category
   */
  filterEndpoints(category) {
    let filteredEndpoints = this.endpoints;
    
    if (category) {
      filteredEndpoints = this.endpoints.filter(endpoint => 
        endpoint.category === category
      );
    }
    
    this.renderEndpoints(filteredEndpoints);
  }

  /**
   * Update test form with parameter inputs for the selected endpoint
   */
  updateTestFormParameters(endpoint) {
    // Find or create parameters container
    let parametersContainer = document.getElementById('test-parameters');
    if (!parametersContainer) {
      // Create parameters container after the path field
      parametersContainer = document.createElement('div');
      parametersContainer.id = 'test-parameters';
      parametersContainer.className = 'test-parameters';
      
      const pathGroup = document.querySelector('.form-group:has(#test-path)') || 
                       document.querySelector('input[id="test-path"]').closest('.form-group');
      pathGroup.parentNode.insertBefore(parametersContainer, pathGroup.nextSibling);
    }
    
    // Clear existing parameters
    parametersContainer.innerHTML = '';
    
    // Add parameter fields if endpoint has parameters
    if (endpoint.parameters && endpoint.parameters.query) {
      const parametersTitle = document.createElement('h4');
      parametersTitle.textContent = 'Parameters';
      parametersContainer.appendChild(parametersTitle);
      
      Object.entries(endpoint.parameters.query).forEach(([name, param]) => {
        const paramGroup = document.createElement('div');
        paramGroup.className = 'form-group';
        
        const labelContainer = document.createElement('div');
        labelContainer.className = 'parameter-label-container';
        
        const label = document.createElement('label');
        label.setAttribute('for', `test-param-${name}`);
        label.textContent = name;
        
        const infoButton = document.createElement('button');
        infoButton.type = 'button';
        infoButton.className = 'parameter-info-btn';
        infoButton.innerHTML = 'ℹ️';
        infoButton.title = 'Show parameter details and examples';
        infoButton.addEventListener('click', () => {
          this.showParameterInfo(name, param);
        });
        
        labelContainer.appendChild(label);
        labelContainer.appendChild(infoButton);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `test-param-${name}`;
        input.name = name;
        input.className = 'form-control';
        input.placeholder = `Enter ${name}`;
        if (param.required) {
          input.required = true;
          label.textContent += ' *';
        }
        
        paramGroup.appendChild(labelContainer);
        paramGroup.appendChild(input);
        
        parametersContainer.appendChild(paramGroup);
      });
    }
  }

  /**
   * Show detailed parameter information with examples
   */
  showParameterInfo(paramName, paramConfig) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'parameter-info-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'parameter-info-modal';
    
    // Get detailed info based on parameter name
    const paramInfo = this.getParameterDetails(paramName, paramConfig);
    
    modal.innerHTML = `
      <div class="parameter-info-header">
        <h3>Parameter: ${paramName}</h3>
        <button class="parameter-info-close" aria-label="Close">&times;</button>
      </div>
      <div class="parameter-info-body">
        <div class="parameter-info-section">
          <h4>Description</h4>
          <p>${paramInfo.description}</p>
        </div>
        <div class="parameter-info-section">
          <h4>Examples</h4>
          <ul class="parameter-examples">
            ${paramInfo.examples.map(example => `
              <li>
                <code>${example.value}</code>
                <span class="example-description">${example.description}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        ${paramInfo.notes ? `
          <div class="parameter-info-section">
            <h4>Notes</h4>
            <p>${paramInfo.notes}</p>
          </div>
        ` : ''}
      </div>
      <div class="parameter-info-footer">
        <button type="button" class="btn-info-close">Got it</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Handle close events
    const closeModal = () => {
      document.body.removeChild(overlay);
    };
    
    // Event listeners
    modal.querySelector('.parameter-info-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-info-close').addEventListener('click', closeModal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
    
    // Handle Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escapeHandler);
        closeModal();
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Get detailed parameter information with examples
   */
  getParameterDetails(paramName, paramConfig) {
    const paramDetails = {
      pattern: {
        description: 'A pattern to match cache keys for selective deletion. Cache keys are unique identifiers used to store and retrieve cached data. They often follow naming conventions like "type:id" or "module:action:data".',
        examples: [
          { value: 'user:*', description: 'Clear all cached user data (e.g., user:123, user:456, user:profile:789)' },
          { value: 'session:abc123:*', description: 'Clear all cache for a specific session (e.g., session:abc123:data, session:abc123:permissions)' },
          { value: '*:temp', description: 'Clear all temporary cache entries (e.g., upload:temp, process:temp, data:temp)' },
          { value: 'api:v1:users:*', description: 'Clear all API v1 user endpoint cache (e.g., api:v1:users:list, api:v1:users:123)' },
          { value: 'page:home', description: 'Clear cache for a specific page (exact match, no wildcards)' },
          { value: '', description: 'Clear ALL cache entries - this will remove everything from the cache' }
        ],
        notes: 'Cache keys are like file paths that identify stored data. The asterisk (*) is a wildcard that matches any characters. For example, "user:*" matches "user:123", "user:profile", "user:settings:theme", etc. Be careful with broad patterns as they can clear large amounts of cached data and may impact performance.'
      }
    };

    return paramDetails[paramName] || {
      description: paramConfig.description || 'No description available',
      examples: [
        { value: 'example_value', description: 'Example usage' }
      ],
      notes: null
    };
  }

  /**
   * Show detailed execution result information
   */
  showExecutionResultInfo(result) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'execution-info-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'execution-info-modal';
    
    // Format execution details
    const executionDetails = this.getExecutionDetails(result);
    
    modal.innerHTML = `
      <div class="execution-info-header">
        <h3>Execution Details</h3>
        <button class="execution-info-close" aria-label="Close">&times;</button>
      </div>
      <div class="execution-info-body">
        <div class="execution-info-section">
          <h4>Endpoint Information</h4>
          <div class="execution-detail-grid">
            <div class="detail-item">
              <span class="detail-label">Method:</span>
              <span class="detail-value method-${result.endpoint.method.toLowerCase()}">${result.endpoint.method}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Path:</span>
              <code class="detail-value">${result.endpoint.path}</code>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${this.formatCategoryName(result.endpoint.category)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Description:</span>
              <span class="detail-value">${result.endpoint.description || 'No description available'}</span>
            </div>
          </div>
        </div>
        
        <div class="execution-info-section">
          <h4>Response Information</h4>
          <div class="execution-detail-grid">
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value ${result.success ? 'status-success' : 'status-error'}">
                ${result.success ? '✅ Success' : '❌ Error'}
              </span>
            </div>
            ${result.status ? `
              <div class="detail-item">
                <span class="detail-label">HTTP Status:</span>
                <span class="detail-value">${result.status} ${result.statusText || ''}</span>
              </div>
            ` : ''}
            <div class="detail-item">
              <span class="detail-label">Response Time:</span>
              <span class="detail-value">${result.responseTime}ms</span>
            </div>
            ${result.contentType ? `
              <div class="detail-item">
                <span class="detail-label">Content Type:</span>
                <span class="detail-value">${result.contentType}</span>
              </div>
            ` : ''}
            <div class="detail-item">
              <span class="detail-label">Executed At:</span>
              <span class="detail-value">${new Date(result.timestamp).toLocaleString()}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Cached:</span>
              <span class="detail-value">${result.cached ? '📋 Yes' : '🔄 No'}</span>
            </div>
          </div>
        </div>

        ${result.endpoint.userParameters ? `
          <div class="execution-info-section">
            <h4>Parameters Used</h4>
            <div class="parameter-list">
              ${Object.entries(result.endpoint.userParameters.query || {}).map(([key, value]) => `
                <div class="parameter-item">
                  <code class="param-name">${key}</code>
                  <span class="param-value">${value}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="execution-info-section">
          <h4>Response Data</h4>
          <div class="response-preview">
            <pre class="response-data">${this.formatResponseData(result.data)}</pre>
          </div>
        </div>

        ${executionDetails.history.length > 0 ? `
          <div class="execution-info-section">
            <h4>Recent Executions</h4>
            <div class="execution-history">
              ${executionDetails.history.slice(0, 5).map(historyItem => `
                <div class="history-item ${historyItem.success ? 'success' : 'error'}">
                  <span class="history-status">${historyItem.success ? '✅' : '❌'}</span>
                  <span class="history-time">${new Date(historyItem.timestamp).toLocaleTimeString()}</span>
                  <span class="history-duration">${historyItem.responseTime}ms</span>
                  ${historyItem.cached ? '<span class="history-cached">📋</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="execution-info-footer">
        <button type="button" class="btn-info-close">Close</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Handle close events
    const closeModal = () => {
      document.body.removeChild(overlay);
    };
    
    // Event listeners
    modal.querySelector('.execution-info-close').addEventListener('click', closeModal);
    modal.querySelector('.btn-info-close').addEventListener('click', closeModal);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
    
    // Handle Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escapeHandler);
        closeModal();
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Get execution details including history
   */
  getExecutionDetails(result) {
    const history = this.getExecutionHistory(result.endpoint);
    
    return {
      history: history,
      cacheStats: this.getCacheStats(),
      endpoint: result.endpoint
    };
  }

  /**
   * Test a specific endpoint
   */
  async testEndpoint() {
    const pathElement = document.getElementById('test-path');
    const methodElement = document.getElementById('test-method');
    
    console.log('Path element:', pathElement);
    console.log('Method element:', methodElement);
    
    if (!pathElement) {
      console.error('Path element not found!');
      this.showNotification('Path input field not found', 'error');
      return;
    }
    
    const method = methodElement ? methodElement.value : 'GET';
    const rawPath = pathElement.value;
    const path = rawPath.trim();
    
    console.log('Raw path value:', JSON.stringify(rawPath));
    console.log('Trimmed path value:', JSON.stringify(path));
    console.log('Path length:', path.length);
    console.log('Method:', method);
    console.log('Input field innerHTML:', pathElement.innerHTML);
    console.log('Input field outerHTML:', pathElement.outerHTML);
    
    // If path is empty, try to use placeholder or set a default
    if (!path) {
      const placeholder = pathElement.placeholder;
      console.log('Path is empty, placeholder is:', placeholder);
      if (placeholder) {
        // Use placeholder as default
        const defaultPath = placeholder.startsWith('/') ? placeholder : '/' + placeholder;
        console.log('Using placeholder as path:', defaultPath);
        pathElement.value = defaultPath;
        // Re-read the value
        const newPath = pathElement.value.trim();
        if (newPath) {
          console.log('Successfully set path to:', newPath);
          // Continue with the new path
          const normalizedPath = newPath.startsWith('/') ? newPath : '/' + newPath;
          this.performTest(method, normalizedPath);
          return;
        }
      }
      
      // If no placeholder or setting value failed, use /health as fallback
      console.log('No placeholder available, using /health as fallback');
      const fallbackPath = '/health';
      this.performTest(method, fallbackPath);
      return;
    }
    
    if (!path) {
      console.log('Path validation failed - empty path');
      this.showNotification('Please complete path field', 'error');
      return;
    }
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    console.log('Normalized path:', JSON.stringify(normalizedPath));
    
    this.performTest(method, normalizedPath);
  }

  /**
   * Perform the actual API test
   */
  async performTest(method, normalizedPath) {
    try {
      // Collect parameter values
      const parameters = {};
      const parameterInputs = document.querySelectorAll('#test-parameters input');
      parameterInputs.forEach(input => {
        if (input.value.trim()) {
          parameters[input.name] = input.value.trim();
        }
      });

      // Build URL with query parameters if any
      let testUrl = normalizedPath;
      if (Object.keys(parameters).length > 0) {
        const queryParams = new URLSearchParams(parameters);
        testUrl += '?' + queryParams.toString();
      }

      const response = await fetch(`${this.apiBase}/test/endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method, path: testUrl })
      });

      const result = await response.json();
      this.displayTestResult(result, `${method} ${testUrl}`);
      
    } catch (error) {
      console.error('Error testing endpoint:', error);
      this.showNotification('Failed to test endpoint', 'error');
    }
  }

  /**
   * Test all health endpoints
   */
  async testAllHealthEndpoints() {
    try {
      this.showLoading(true);
      
      const response = await fetch(`${this.apiBase}/test/health`);
      const result = await response.json();
      
      if (result.success) {
        this.displayTestResults(result.data);
        this.showNotification('Health tests completed', 'success');
      } else {
        this.showNotification('Health tests failed', 'error');
      }
      
    } catch (error) {
      console.error('Error testing health endpoints:', error);
      this.showNotification('Failed to run health tests', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Display test result
   */
  displayTestResult(result, endpoint) {
    const resultsContainer = document.getElementById('test-results');
    
    const resultElement = document.createElement('div');
    resultElement.className = `test-result ${result.success ? 'success' : 'error'}`;
    
    resultElement.innerHTML = `
      <div class="test-result-header">${endpoint}</div>
      <div class="test-result-details">
        ${result.success ? 
          `Status: ${result.data.statusCode}, Response Time: ${result.data.responseTime}ms` :
          `Error: ${result.error}`
        }
      </div>
    `;
    
    resultsContainer.appendChild(resultElement);
    resultsContainer.scrollTop = resultsContainer.scrollHeight;
  }

  /**
   * Display multiple test results
   */
  displayTestResults(results) {
    const resultsContainer = document.getElementById('test-results');
    resultsContainer.innerHTML = '';
    
    results.forEach(result => {
      const resultElement = document.createElement('div');
      resultElement.className = `test-result ${result.status === 'success' ? 'success' : 'error'}`;
      
      resultElement.innerHTML = `
        <div class="test-result-header">${result.endpoint}</div>
        <div class="test-result-details">
          ${result.status === 'success' ? 
            `Status: ${result.statusCode}, Response Time: ${result.responseTime}ms` :
            `Error: ${result.error}`
          }
        </div>
      `;
      
      resultsContainer.appendChild(resultElement);
    });
  }

  /**
   * Trigger API scan
   */
  async triggerScan() {
    try {
      this.showLoading(true);
      
      const response = await fetch(`${this.apiBase}/discovery/scan`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('API scan completed successfully', 'success');
        await this.loadEndpoints();
      } else {
        this.showNotification('API scan failed', 'error');
      }
      
    } catch (error) {
      console.error('Error triggering scan:', error);
      this.showNotification('Failed to trigger API scan', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Refresh all data
   */
  async refreshData() {
    await this.loadInitialData();
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadDashboardStatus();
    }, 30000);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Show/hide loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated() {
    const element = document.getElementById('last-updated');
    element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }

  /**
   * Setup execute button event listeners
   */
  setupExecuteButtonListeners() {
    const executeButtons = document.querySelectorAll('.btn-execute');
    executeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleExecuteButtonClick(button);
      });

      // Add keyboard support
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          this.handleExecuteButtonClick(button);
        }
      });
    });
  }

  /**
   * Handle execute button click
   */
  async handleExecuteButtonClick(button) {
    const endpoint = JSON.parse(button.dataset.endpoint);
    const method = button.dataset.method;
    const path = button.dataset.path;

    // Debug logging
    console.log('Execute button clicked for:', method, path);
    console.log('Endpoint object:', endpoint);
    console.log('Has parameters?', !!endpoint.parameters);
    console.log('Parameters:', endpoint.parameters);

    // Check if endpoint has parameters
    if (endpoint.parameters) {
      console.log('Showing parameter dialog...');
      const parameters = await this.showParameterDialog(endpoint);
      if (parameters === null) {
        console.log('User cancelled parameter dialog');
        return; // User cancelled
      }
      console.log('User provided parameters:', parameters);
      endpoint.userParameters = parameters;
    }

    // Check if confirmation is required
    if (button.dataset.confirm === 'true') {
      const confirmed = confirm(`Are you sure you want to execute ${method} ${path}?\n\nThis operation may modify data or system state.`);
      if (!confirmed) {
        return;
      }
    }

    // Check if auth is required (placeholder for future auth implementation)
    if (button.dataset.auth === 'true') {
      this.showNotification('Note: This endpoint typically requires authentication', 'info');
      // For now, we'll continue without auth, but this could be enhanced
    }

    await this.executeEndpoint(endpoint, button);
  }

  /**
   * Show parameter dialog for endpoints with parameters
   */
  async showParameterDialog(endpoint) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'parameter-modal-overlay';
      
      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'parameter-modal';
      
      let parametersHtml = '';
      
      // Generate form fields for query parameters
      if (endpoint.parameters.query) {
        parametersHtml += '<h4>Query Parameters</h4>';
        Object.entries(endpoint.parameters.query).forEach(([name, param]) => {
          parametersHtml += `
            <div class="parameter-field">
              <div class="parameter-label-container">
                <label for="param-${name}">${name}</label>
                <button type="button" class="parameter-info-btn" data-param-name="${name}" title="Show parameter details and examples">ℹ️</button>
              </div>
              <input 
                type="text" 
                id="param-${name}" 
                name="${name}"
                placeholder="${param.description || ''}"
                ${param.required ? 'required' : ''}
              >
              <small class="parameter-description">${param.description || ''}</small>
            </div>
          `;
        });
      }
      
      modal.innerHTML = `
        <div class="parameter-modal-header">
          <h3>Parameters for ${endpoint.method} ${endpoint.path}</h3>
          <button class="parameter-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="parameter-modal-body">
          <form id="parameter-form">
            ${parametersHtml}
          </form>
        </div>
        <div class="parameter-modal-footer">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="button" class="btn-execute-with-params">Execute</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Focus first input
      const firstInput = modal.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
      
      // Handle close events
      const closeModal = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      
      // Handle execute with parameters
      const executeWithParams = () => {
        const form = modal.querySelector('#parameter-form');
        const formData = new FormData(form);
        const parameters = {};
        
        // Collect query parameters
        if (endpoint.parameters.query) {
          parameters.query = {};
          Object.keys(endpoint.parameters.query).forEach(name => {
            const value = formData.get(name);
            if (value && value.trim()) {
              parameters.query[name] = value.trim();
            }
          });
        }
        
        document.body.removeChild(overlay);
        resolve(parameters);
      };
      
      // Event listeners
      modal.querySelector('.parameter-modal-close').addEventListener('click', closeModal);
      modal.querySelector('.btn-cancel').addEventListener('click', closeModal);
      modal.querySelector('.btn-execute-with-params').addEventListener('click', executeWithParams);
      
      // Add info button event listeners
      const infoButtons = modal.querySelectorAll('.parameter-info-btn');
      infoButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const paramName = button.dataset.paramName;
          const param = endpoint.parameters.query[paramName];
          this.showParameterInfo(paramName, param);
        });
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
      
      // Handle Enter key in form
      modal.querySelector('#parameter-form').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeWithParams();
        }
      });
      
      // Handle Escape key
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escapeHandler);
          closeModal();
        }
      });
    });
  }

  /**
   * Execute an endpoint
   */
  async executeEndpoint(endpoint, button) {
    const cacheKey = `${endpoint.method}:${endpoint.path}`;
    const startTime = Date.now();
    
    // Check cache for GET requests
    if (endpoint.method === 'GET') {
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.displayExecutionResult(cachedResult, button);
        this.showNotification(
          `${endpoint.method} ${endpoint.path} (cached result - ${cachedResult.responseTime}ms)`, 
          'info'
        );
        return;
      }
    }
    
    try {
      // Show loading state
      this.setButtonLoadingState(button, true);
      
      // Build URL with query parameters
      let url = endpoint.path;
      if (endpoint.userParameters && endpoint.userParameters.query) {
        const queryParams = new URLSearchParams(endpoint.userParameters.query);
        url += '?' + queryParams.toString();
      }
      
      // Make the HTTP request
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Get response data
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Create execution result
      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        contentType,
        data: responseData,
        endpoint: endpoint,
        timestamp: new Date().toISOString(),
        cached: false
      };

      // Cache GET requests if successful
      if (endpoint.method === 'GET' && response.ok) {
        this.setCachedResult(cacheKey, result);
      }

      // Add to execution history
      this.addToHistory(result);

      // Display the result
      this.displayExecutionResult(result, button);
      
      // Show success notification
      this.showNotification(
        `${endpoint.method} ${endpoint.path} executed successfully (${responseTime}ms)`, 
        'success'
      );

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Create error result
      const result = {
        success: false,
        error: error.message,
        responseTime,
        endpoint: endpoint,
        timestamp: new Date().toISOString(),
        cached: false
      };

      // Add to execution history
      this.addToHistory(result);

      // Display the error
      this.displayExecutionResult(result, button);
      
      // Show error notification
      this.showNotification(`Failed to execute ${endpoint.method} ${endpoint.path}: ${error.message}`, 'error');
      
    } finally {
      // Reset button state
      this.setButtonLoadingState(button, false);
    }
  }

  /**
   * Set button loading state
   */
  setButtonLoadingState(button, loading) {
    const icon = button.querySelector('.btn-execute-icon');
    const text = button.querySelector('.btn-execute-text');
    const spinner = button.querySelector('.btn-execute-spinner');

    if (loading) {
      button.disabled = true;
      icon.classList.add('hidden');
      text.textContent = 'Executing...';
      spinner.classList.remove('hidden');
    } else {
      button.disabled = false;
      icon.classList.remove('hidden');
      text.textContent = 'Execute';
      spinner.classList.add('hidden');
    }
  }

  /**
   * Display execution result
   */
  displayExecutionResult(result, button) {
    // Find or create result container for this endpoint
    const card = button.closest('.endpoint-card');
    let resultContainer = card.querySelector('.execution-result');
    
    if (!resultContainer) {
      resultContainer = document.createElement('div');
      resultContainer.className = 'execution-result';
      card.appendChild(resultContainer);
    }

    // Format the result
    const statusClass = result.success ? 'success' : 'error';
    const formattedData = this.formatResponseData(result.data);
    
    const cacheIndicator = result.cached ? '<span class="cache-indicator">📋 Cached</span>' : '';
    
    resultContainer.innerHTML = `
      <div class="execution-result-header ${statusClass}">
        <span class="result-status">
          ${result.success ? '✅' : '❌'} 
          ${result.status || 'Error'} ${result.statusText || ''}
          ${cacheIndicator}
        </span>
        <div class="result-actions">
          <span class="result-time">${result.responseTime}ms</span>
          <button class="result-info-btn" title="Show execution details" aria-label="Show execution details">ℹ️</button>
          <button class="result-close" aria-label="Close result">×</button>
        </div>
      </div>
      <div class="execution-result-body">
        <pre class="result-data">${formattedData}</pre>
      </div>
    `;

    // Add close button functionality
    const closeButton = resultContainer.querySelector('.result-close');
    closeButton.addEventListener('click', () => {
      resultContainer.remove();
    });

    // Add info button functionality
    const infoButton = resultContainer.querySelector('.result-info-btn');
    infoButton.addEventListener('click', () => {
      this.showExecutionResultInfo(result);
    });

    // Scroll result into view
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Format response data for display
   */
  formatResponseData(data) {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  }

  /**
   * Get cached result for an endpoint
   */
  getCachedResult(cacheKey) {
    const cached = this.executionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      // Mark as cached for display
      return { ...cached.result, cached: true };
    }
    
    // Remove expired cache entry
    if (cached) {
      this.executionCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Set cached result for an endpoint
   */
  setCachedResult(cacheKey, result) {
    this.executionCache.set(cacheKey, {
      result: { ...result },
      timestamp: Date.now()
    });
  }

  /**
   * Add execution result to history
   */
  addToHistory(result) {
    const historyKey = `${result.endpoint.method}:${result.endpoint.path}`;
    
    if (!this.executionHistory.has(historyKey)) {
      this.executionHistory.set(historyKey, []);
    }
    
    const history = this.executionHistory.get(historyKey);
    history.unshift(result); // Add to beginning
    
    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.splice(this.maxHistorySize);
    }
  }

  /**
   * Get execution history for an endpoint
   */
  getExecutionHistory(endpoint) {
    const historyKey = `${endpoint.method}:${endpoint.path}`;
    return this.executionHistory.get(historyKey) || [];
  }

  /**
   * Clear execution cache
   */
  clearExecutionCache() {
    this.executionCache.clear();
    this.showNotification('Execution cache cleared', 'info');
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    this.executionHistory.clear();
    this.showNotification('Execution history cleared', 'info');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, cached] of this.executionCache.entries()) {
      if (now - cached.timestamp < this.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.executionCache.size,
      validEntries,
      expiredEntries,
      historySize: Array.from(this.executionHistory.values()).reduce((total, history) => total + history.length, 0)
    };
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new CDNDashboard();
});

// Handle page visibility changes to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
  if (window.dashboard) {
    if (document.hidden) {
      window.dashboard.stopAutoRefresh();
    } else {
      window.dashboard.startAutoRefresh();
    }
  }
});
