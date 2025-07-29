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
  }

  /**
   * Create endpoint card element
   */
  createEndpointCard(endpoint) {
    const card = document.createElement('div');
    card.className = 'endpoint-card';
    
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
    `;

    // Add click handler to populate test form
    card.addEventListener('click', () => {
      document.getElementById('test-method').value = endpoint.method;
      document.getElementById('test-path').value = endpoint.path;
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
   * Test a specific endpoint
   */
  async testEndpoint() {
    const method = document.getElementById('test-method').value;
    const path = document.getElementById('test-path').value;
    
    if (!path) {
      this.showNotification('Please enter a path to test', 'error');
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/test/endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method, path })
      });

      const result = await response.json();
      this.displayTestResult(result, `${method} ${path}`);
      
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
