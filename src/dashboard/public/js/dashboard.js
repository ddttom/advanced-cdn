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
    this.settings = this.getSettings();
    this.settingsListenersSetup = false;
    this.init();
  }

  /**
   * Initialize dashboard
   */
  async init() {
    console.log('CDNDashboard initializing...');
    this.setupEventListeners();
    await this.loadInitialData();
    this.applySettings(this.settings);
  }

  /**
   * Setup event listeners with robust error handling
   */
  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Header actions with validation
    this.attachEventListener('refresh-btn', 'click', () => {
      this.refreshData();
    });

    this.attachEventListener('settings-btn', 'click', () => {
      console.log('Settings button clicked!');
      this.showSettingsModal();
    });

    // Category filter
    this.attachEventListener('category-filter', 'change', (e) => {
      this.filterEndpoints(e.target.value);
    });

    // API testing
    this.attachEventListener('test-endpoint-btn', 'click', () => {
      this.testEndpoint();
    });

    this.attachEventListener('test-all-btn', 'click', () => {
      this.testAllHealthEndpoints();
    });

    this.attachEventListener('clear-test-form-btn', 'click', () => {
      this.clearTestForm();
    });

    // Cache keys management
    this.attachEventListener('refresh-cache-keys-btn', 'click', () => {
      this.loadCacheKeys();
    });

    this.attachEventListener('export-cache-keys-btn', 'click', () => {
      this.exportCacheKeys();
    });

    this.attachEventListener('search-cache-keys-btn', 'click', () => {
      this.searchCacheKeys();
    });

    this.attachEventListener('clear-search-btn', 'click', () => {
      this.clearCacheKeySearch();
    });

    this.attachEventListener('cache-type-filter', 'change', () => {
      this.filterCacheKeys();
    });

    this.attachEventListener('copy-visible-keys-btn', 'click', () => {
      this.copyVisibleKeys();
    });

    // Enter key support for cache key search
    this.attachEventListener('cache-key-search', 'keydown', (e) => {
      if (e.key === 'Enter') {
        this.searchCacheKeys();
      }
    });

    // Log viewer event listeners
    this.setupLogViewerEventListeners();
    
    // Settings modal event listeners
    this.setupSettingsModalListeners();
  }

  /**
   * Robust event listener attachment with validation and fallback
   */
  attachEventListener(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    
    if (element) {
      element.addEventListener(eventType, handler);
      
      // Add visual feedback for settings button
      if (elementId === 'settings-btn') {
        element.style.cursor = 'pointer';
        element.addEventListener('mouseenter', () => {
          element.style.transform = 'scale(1.05)';
        });
        element.addEventListener('mouseleave', () => {
          element.style.transform = 'scale(1)';
        });
      }
    } else {
      console.error(`Element with ID '${elementId}' not found!`);
      
      // Fallback: try again after DOM is fully loaded
      if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', () => {
          this.attachEventListener(elementId, eventType, handler);
        });
      }
    }
  }

  /**
   * Show settings modal with enhanced debugging
   */
  showSettingsModal() {
    console.log('🔧 showSettingsModal called');
    
    const modal = document.getElementById('settings-modal');
    console.log('Settings modal element:', modal);
    console.log('Modal classes before:', modal ? modal.className : 'N/A');
    console.log('Modal computed styles:', modal ? window.getComputedStyle(modal).display : 'N/A');
    
    if (!modal) {
      console.error('❌ Settings modal not found in DOM!');
      this.showNotification('Settings modal not found', 'error');
      return;
    }
    
    console.log('✅ Settings modal found, displaying...');
    
    // Populate current settings
    this.populateSettingsForm();
    
    // Show modal - Force display with multiple approaches
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.classList.add('show');
    
    // Ensure modal content has proper styling
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.backgroundColor = 'white';
      modalContent.style.color = '#333';
      modalContent.style.borderRadius = '12px';
      modalContent.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.3)';
      modalContent.style.maxWidth = '800px';
      modalContent.style.width = '90%';
      modalContent.style.maxHeight = '90vh';
      modalContent.style.overflow = 'hidden';
    }
    
    // Add temporary visual feedback
    modal.style.border = '3px solid #007bff';
    setTimeout(() => {
      modal.style.border = '';
    }, 2000);
    
    console.log('Modal classes after:', modal.className);
    console.log('Modal display style:', modal.style.display);
    console.log('Modal computed styles after:', window.getComputedStyle(modal).display);
    console.log('Modal z-index:', modal.style.zIndex);
    console.log('✅ Settings modal displayed successfully');
  }

  /**
   * Hide settings modal
   */
  hideSettingsModal() {
    console.log('🔧 hideSettingsModal called');
    
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.style.position = '';
      modal.style.top = '';
      modal.style.left = '';
      modal.style.width = '';
      modal.style.height = '';
      modal.style.backgroundColor = '';
      modal.style.justifyContent = '';
      modal.style.alignItems = '';
      modal.style.zIndex = '';
      modal.classList.remove('show');
      modal.classList.add('hidden');
      console.log('✅ Settings modal hidden');
    }
  }

  /**
   * Setup settings modal event listeners
   */
  setupSettingsModalListeners() {
    console.log('🔧 Setting up settings modal listeners...');
    
    if (this.settingsListenersSetup) {
      console.log('⚠️ Settings listeners already setup, skipping');
      return;
    }
    
    // Save settings
    this.attachEventListener('settings-save-btn', 'click', () => {
      console.log('Save settings button clicked');
      this.saveSettings();
    });
    
    // Reset settings
    this.attachEventListener('settings-reset-btn', 'click', () => {
      console.log('Reset settings button clicked');
      this.resetSettings();
    });
    
    // Close modal
    this.attachEventListener('settings-modal-close', 'click', () => {
      console.log('Close settings button clicked');
      this.hideSettingsModal();
    });
    
    // Close on overlay click
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          console.log('Modal overlay clicked, closing');
          this.hideSettingsModal();
        }
      });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('settings-modal');
        if (modal && modal.style.display === 'block') {
          console.log('Escape key pressed, closing modal');
          this.hideSettingsModal();
        }
      }
    });
    
    this.settingsListenersSetup = true;
    console.log('✅ Settings modal listeners setup complete');
  }

  /**
   * Get settings from localStorage
   */
  getSettings() {
    const defaultSettings = {
      autoScan: true,
      scanInterval: 5,
      refreshInterval: 30,
      theme: 'light',
      compactView: false,
      cacheAutoRefresh: true,
      cacheRefreshInterval: 2,
      logPageSize: 100,
      logAutoRefresh: true,
      showSuccessNotifications: true,
      showErrorNotifications: true,
      notificationDuration: 5
    };
    
    try {
      const stored = localStorage.getItem('dashboard-settings');
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    return defaultSettings;
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    console.log('🔧 saveSettings called');
    
    try {
      // Collect settings from actual form elements
      const autoScanEl = document.getElementById('auto-scan-enabled');
      const scanIntervalEl = document.getElementById('scan-interval');
      const refreshIntervalEl = document.getElementById('refresh-interval');
      const themeSelectEl = document.getElementById('theme-select');
      const compactViewEl = document.getElementById('compact-view');
      const cacheAutoRefreshEl = document.getElementById('cache-auto-refresh');
      const cacheRefreshIntervalEl = document.getElementById('cache-refresh-interval');
      const logPageSizeEl = document.getElementById('log-page-size');
      const logAutoRefreshEl = document.getElementById('log-auto-refresh');
      const showSuccessNotificationsEl = document.getElementById('show-success-notifications');
      const showErrorNotificationsEl = document.getElementById('show-error-notifications');
      const notificationDurationEl = document.getElementById('notification-duration');
      
      const settings = {
        autoScan: autoScanEl ? autoScanEl.checked : true,
        scanInterval: scanIntervalEl ? parseInt(scanIntervalEl.value) : 5,
        refreshInterval: refreshIntervalEl ? parseInt(refreshIntervalEl.value) : 30,
        theme: themeSelectEl ? themeSelectEl.value : 'light',
        compactView: compactViewEl ? compactViewEl.checked : false,
        cacheAutoRefresh: cacheAutoRefreshEl ? cacheAutoRefreshEl.checked : true,
        cacheRefreshInterval: cacheRefreshIntervalEl ? parseInt(cacheRefreshIntervalEl.value) : 2,
        logPageSize: logPageSizeEl ? parseInt(logPageSizeEl.value) : 100,
        logAutoRefresh: logAutoRefreshEl ? logAutoRefreshEl.checked : true,
        showSuccessNotifications: showSuccessNotificationsEl ? showSuccessNotificationsEl.checked : true,
        showErrorNotifications: showErrorNotificationsEl ? showErrorNotificationsEl.checked : true,
        notificationDuration: notificationDurationEl ? parseInt(notificationDurationEl.value) : 5
      };
      
      console.log('New settings:', settings);
      
      localStorage.setItem('dashboard-settings', JSON.stringify(settings));
      this.settings = settings;
      this.applySettings(settings);
      
      this.showNotification('Settings saved successfully', 'success');
      this.hideSettingsModal();
      
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  /**
   * Reset settings to defaults
   */
  resetSettings() {
    console.log('🔧 resetSettings called');
    
    const defaultSettings = {
      autoScan: true,
      scanInterval: 5,
      refreshInterval: 30,
      theme: 'light',
      compactView: false,
      cacheAutoRefresh: true,
      cacheRefreshInterval: 2,
      logPageSize: 100,
      logAutoRefresh: true,
      showSuccessNotifications: true,
      showErrorNotifications: true,
      notificationDuration: 5
    };
    
    try {
      localStorage.setItem('dashboard-settings', JSON.stringify(defaultSettings));
      this.settings = defaultSettings;
      this.populateSettingsForm();
      this.applySettings(defaultSettings);
      
      this.showNotification('Settings reset to defaults', 'success');
      console.log('✅ Settings reset successfully');
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showNotification('Failed to reset settings', 'error');
    }
  }

  /**
   * Populate settings form with current values
   */
  populateSettingsForm() {
    console.log('🔧 populateSettingsForm called with settings:', this.settings);
    
    // Map settings to actual HTML form elements
    const autoScanEl = document.getElementById('auto-scan-enabled');
    const scanIntervalEl = document.getElementById('scan-interval');
    const refreshIntervalEl = document.getElementById('refresh-interval');
    const themeSelectEl = document.getElementById('theme-select');
    const compactViewEl = document.getElementById('compact-view');
    const cacheAutoRefreshEl = document.getElementById('cache-auto-refresh');
    const cacheRefreshIntervalEl = document.getElementById('cache-refresh-interval');
    const logPageSizeEl = document.getElementById('log-page-size');
    const logAutoRefreshEl = document.getElementById('log-auto-refresh');
    const showSuccessNotificationsEl = document.getElementById('show-success-notifications');
    const showErrorNotificationsEl = document.getElementById('show-error-notifications');
    const notificationDurationEl = document.getElementById('notification-duration');
    
    // Populate form with current settings
    if (autoScanEl) autoScanEl.checked = this.settings.autoScan !== false;
    if (scanIntervalEl) scanIntervalEl.value = this.settings.scanInterval || 5;
    if (refreshIntervalEl) refreshIntervalEl.value = this.settings.refreshInterval || 30;
    if (themeSelectEl) themeSelectEl.value = this.settings.theme || 'light';
    if (compactViewEl) compactViewEl.checked = this.settings.compactView || false;
    if (cacheAutoRefreshEl) cacheAutoRefreshEl.checked = this.settings.cacheAutoRefresh !== false;
    if (cacheRefreshIntervalEl) cacheRefreshIntervalEl.value = this.settings.cacheRefreshInterval || 2;
    if (logPageSizeEl) logPageSizeEl.value = this.settings.logPageSize || 100;
    if (logAutoRefreshEl) logAutoRefreshEl.checked = this.settings.logAutoRefresh !== false;
    if (showSuccessNotificationsEl) showSuccessNotificationsEl.checked = this.settings.showSuccessNotifications !== false;
    if (showErrorNotificationsEl) showErrorNotificationsEl.checked = this.settings.showErrorNotifications !== false;
    if (notificationDurationEl) notificationDurationEl.value = this.settings.notificationDuration || 5;
    
    console.log('✅ Settings form populated');
  }

  /**
   * Apply settings to dashboard
   */
  applySettings(settings) {
    console.log('🔧 applySettings called with:', settings);
    
    // Apply theme
    document.body.className = `theme-${settings.theme}`;
    
    // Apply auto-refresh
    if (settings.autoRefresh) {
      this.startAutoRefresh(settings.refreshInterval);
    } else {
      this.stopAutoRefresh();
    }
    
    // Update cache timeout
    if (settings.cacheTimeout) {
      this.cacheTimeout = settings.cacheTimeout * 1000;
    }
    
    console.log('✅ Settings applied successfully');
  }

  /**
   * Start auto-refresh with custom interval
   */
  startAutoRefresh(intervalSeconds = 30) {
    this.stopAutoRefresh(); // Clear any existing interval
    
    this.refreshInterval = setInterval(() => {
      this.loadDashboardStatus();
    }, intervalSeconds * 1000);
    
    console.log(`✅ Auto-refresh started with ${intervalSeconds}s interval`);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('✅ Auto-refresh stopped');
    }
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
        this.loadCategories(),
        this.loadCacheKeys(),
        this.initializeLogViewer()
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
    if (healthElement) {
      healthElement.textContent = status.status === 'healthy' ? 'Healthy' : 'Issues';
      healthElement.parentElement.parentElement.className = 
        `status-card ${status.status === 'healthy' ? 'healthy' : 'warning'}`;
    }

    // Update uptime
    const uptimeElement = document.getElementById('uptime-value');
    if (uptimeElement) {
      const uptimeHours = Math.floor(status.uptime / 3600);
      uptimeElement.textContent = uptimeHours;
    }

    // Update discovery stats if available
    if (status.discovery) {
      this.updateEndpointsCount(status.discovery.totalEndpoints || 0);
    }
  }

  /**
   * Update endpoints count
   */
  updateEndpointsCount(count) {
    const element = document.getElementById('endpoints-count');
    if (element) {
      element.textContent = count;
    }
  }

  /**
   * Update categories count
   */
  updateCategoriesCount(count) {
    const element = document.getElementById('categories-count');
    if (element) {
      element.textContent = count;
    }
  }

  /**
   * Update last scan time
   */
  updateLastScanTime(timestamp) {
    if (timestamp) {
      const element = document.getElementById('last-scan-time');
      if (element) {
        const date = new Date(timestamp);
        element.textContent = date.toLocaleString();
      }
    }
  }

  /**
   * Update categories filter
   */
  updateCategoriesFilter() {
    const select = document.getElementById('category-filter');
    if (!select) return;
    
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
    if (!grid) return;
    
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
    
    // Add parameter indicator
    const hasParams = endpoint.parameters && (
      endpoint.parameters.query || 
      endpoint.parameters.path || 
      endpoint.parameters.body
    );
    
    card.innerHTML = `
      <div class="endpoint-header">
        <span class="endpoint-method method-${endpoint.method.toLowerCase()}">
          ${endpoint.method}
        </span>
        <span class="endpoint-category">
          ${this.formatCategoryName(endpoint.category)}
        </span>
        ${hasParams ? '<span class="parameter-indicator" title="Has parameters">📝</span>' : ''}
      </div>
      <div class="endpoint-path">${endpoint.path}</div>
      <div class="endpoint-description">
        ${endpoint.description || 'No description available'}
      </div>
      <div class="endpoint-actions">
        <button class="btn btn-execute btn-sm" data-endpoint-id="${endpoint.id || endpoint.path}" data-method="${endpoint.method}" data-path="${endpoint.path}">
          <span class="btn-icon">▶️</span>
          Execute
        </button>
      </div>
    `;

    // Add click handler to populate test form (but not when clicking action buttons)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.endpoint-actions')) {
        return; // Don't populate test form when clicking action buttons
      }
      
      this.populateTestForm(endpoint);
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
    const pathElement = document.getElementById('test-path');
    const methodElement = document.getElementById('test-method');
    
    if (!pathElement) {
      this.showNotification('Path input field not found', 'error');
      return;
    }
    
    const method = methodElement ? methodElement.value : '';
    const path = pathElement.value.trim();
    
    if (!path || !method) {
      this.showNotification('Please select an endpoint from the cards above first', 'error');
      return;
    }
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    
    try {
      const response = await fetch(`${this.apiBase}/test/endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method, path: normalizedPath })
      });

      const result = await response.json();
      this.displayTestResult(result, `${method} ${normalizedPath}`);
      
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
   * Display test result with enhanced response inspection and visibility fixes
   */
  displayTestResult(result, endpoint) {
    console.log('displayTestResult called with:', { result, endpoint });
    
    const resultsContainer = document.getElementById('test-results');
    if (!resultsContainer) {
      console.error('Test results container not found!');
      return;
    }
    
    console.log('Test results container found, proceeding with display...');
    
    // Ensure the container is visible and has proper styling
    resultsContainer.style.display = 'block';
    resultsContainer.style.minHeight = '200px';
    resultsContainer.style.maxHeight = '600px';
    resultsContainer.style.overflowY = 'auto';
    resultsContainer.style.border = '2px solid #e2e8f0';
    resultsContainer.style.borderRadius = '8px';
    resultsContainer.style.padding = '1rem';
    resultsContainer.style.backgroundColor = '#f8fafc';
    resultsContainer.style.fontFamily = 'Monaco, Menlo, Ubuntu Mono, monospace';
    resultsContainer.style.fontSize = '0.85rem';
    
    const resultElement = document.createElement('div');
    resultElement.className = `test-result ${result.success ? 'success' : 'error'}`;
    
    // Create timestamp for this test
    const timestamp = new Date().toLocaleTimeString();
    
    if (result.success) {
      const data = result.data;
      
      resultElement.innerHTML = `
        <div class="test-result-header">
          <div class="test-result-title">
            <span class="test-result-method">${endpoint.split(' ')[0]}</span>
            <span class="test-result-path">${endpoint.split(' ').slice(1).join(' ')}</span>
            <span class="test-result-timestamp">${timestamp}</span>
          </div>
          <div class="test-result-status">
            <span class="status-badge status-${Math.floor(data.statusCode / 100)}xx">${data.statusCode}</span>
            <span class="timing-info">${data.responseTime}ms</span>
          </div>
        </div>
        
        <div class="test-result-content">
          ${this.createResponseHeadersSection(data.headers)}
          ${this.createResponseBodySection(data.body, data.headers)}
          ${this.createTimingSection(data)}
        </div>
      `;
    } else {
      resultElement.innerHTML = `
        <div class="test-result-header">
          <div class="test-result-title">
            <span class="test-result-method">${endpoint.split(' ')[0]}</span>
            <span class="test-result-path">${endpoint.split(' ').slice(1).join(' ')}</span>
            <span class="test-result-timestamp">${timestamp}</span>
          </div>
          <div class="test-result-status">
            <span class="status-badge status-error">ERROR</span>
          </div>
        </div>
        
        <div class="test-result-content">
          <div class="error-details">
            <h4>Error Details</h4>
            <div class="error-message">${result.error}</div>
            ${result.details ? `<div class="error-stack">${result.details}</div>` : ''}
          </div>
        </div>
      `;
    }
    
    // Clear any existing "no results" message
    if (resultsContainer.children.length === 0 || resultsContainer.textContent.includes('No results')) {
      resultsContainer.innerHTML = '';
    }
    
    // Append the new result
    resultsContainer.appendChild(resultElement);
    
    // Ensure the result is visible by scrolling to it
    resultsContainer.scrollTop = resultsContainer.scrollHeight;
    
    // Add a visual highlight to the new result
    resultElement.style.animation = 'fadeIn 0.5s ease-in';
    resultElement.style.border = '2px solid #4f46e5';
    resultElement.style.marginBottom = '1rem';
    resultElement.style.padding = '1rem';
    resultElement.style.borderRadius = '6px';
    resultElement.style.backgroundColor = result.success ? '#f0fdf4' : '#fef2f2';
    
    setTimeout(() => {
      resultElement.style.border = '';
    }, 2000);
    
    console.log('Result element appended to container. Container children count:', resultsContainer.children.length);
    console.log('Result element HTML:', resultElement.outerHTML.substring(0, 200) + '...');
  }

  /**
   * Create response headers section
   */
  createResponseHeadersSection(headers) {
    if (!headers || Object.keys(headers).length === 0) {
      return '<div class="response-section"><h4>Response Headers</h4><div class="no-data">No headers available</div></div>';
    }

    const headerRows = Object.entries(headers)
      .map(([key, value]) => `
        <tr>
          <td class="header-name">${key}</td>
          <td class="header-value">${value}</td>
        </tr>
      `).join('');

    return `
      <div class="response-section">
        <h4 class="section-toggle" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="toggle-icon">▼</span>
          Response Headers (${Object.keys(headers).length})
        </h4>
        <div class="section-content">
          <table class="headers-table">
            <thead>
              <tr>
                <th>Header</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${headerRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Create response body section with formatting
   */
  createResponseBodySection(body, headers) {
    if (!body) {
      return '<div class="response-section"><h4>Response Body</h4><div class="no-data">No response body</div></div>';
    }

    const contentType = headers && headers['content-type'] ? headers['content-type'].toLowerCase() : '';
    let formattedBody = body;
    let bodyClass = 'response-body-text';

    // Format based on content type
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        formattedBody = JSON.stringify(parsed, null, 2);
        bodyClass = 'response-body-json';
      } catch (e) {
        // Keep original body if JSON parsing fails
      }
    } else if (contentType.includes('text/html')) {
      bodyClass = 'response-body-html';
    } else if (contentType.includes('text/css')) {
      bodyClass = 'response-body-css';
    }

    // Calculate body size
    const bodySize = new Blob([formattedBody]).size;
    const sizeFormatted = this.formatBytes(bodySize);

    return `
      <div class="response-section">
        <h4 class="section-toggle" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="toggle-icon">▼</span>
          Response Body (${sizeFormatted})
        </h4>
        <div class="section-content">
          <div class="response-body-container">
            <pre class="${bodyClass}"><code>${this.escapeHtml(formattedBody)}</code></pre>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create timing section
   */
  createTimingSection(data) {
    const timing = data.timing || {};
    const responseTime = data.responseTime || 0;

    return `
      <div class="response-section">
        <h4 class="section-toggle" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="toggle-icon">▼</span>
          Timing Information
        </h4>
        <div class="section-content">
          <div class="timing-breakdown">
            <div class="timing-item">
              <span class="timing-label">Total Time:</span>
              <span class="timing-value">${responseTime}ms</span>
            </div>
            ${timing.dns ? `
              <div class="timing-item">
                <span class="timing-label">DNS Lookup:</span>
                <span class="timing-value">${timing.dns}ms</span>
              </div>
            ` : ''}
            ${timing.connect ? `
              <div class="timing-item">
                <span class="timing-label">Connection:</span>
                <span class="timing-value">${timing.connect}ms</span>
              </div>
            ` : ''}
            ${timing.transfer ? `
              <div class="timing-item">
                <span class="timing-label">Transfer:</span>
                <span class="timing-value">${timing.transfer}ms</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Display multiple test results
   */
  displayTestResults(results) {
    const resultsContainer = document.getElementById('test-results');
    if (!resultsContainer) return;
    
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
   * Setup execute button event listeners
   */
  setupExecuteButtonListeners() {
    const executeButtons = document.querySelectorAll('.btn-execute');
    executeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleExecuteButtonClick(button);
      });
    });
  }

  /**
   * Find endpoint metadata by method and path
   */
  findEndpointByMethodAndPath(method, path) {
    return this.endpoints.find(endpoint => 
      endpoint.method === method && endpoint.path === path
    );
  }

  /**
   * Generate parameter form based on endpoint metadata
   */
  generateParameterForm(method, path, endpoint) {
    let formHtml = '<div class="parameter-form">';
    
    // Check if endpoint has parameter definitions
    if (endpoint && endpoint.parameters) {
      formHtml += '<div class="known-parameters-section">';
      formHtml += '<h4>Required Parameters</h4>';
      
      // Generate path parameters
      if (endpoint.parameters.path) {
        formHtml += '<div class="parameter-group">';
        formHtml += '<h5>Path Parameters</h5>';
        Object.entries(endpoint.parameters.path).forEach(([name, param]) => {
          formHtml += this.generateParameterField('path', name, param);
        });
        formHtml += '</div>';
      }
      
      // Generate query parameters
      if (endpoint.parameters.query) {
        formHtml += '<div class="parameter-group">';
        formHtml += '<h5>Query Parameters</h5>';
        Object.entries(endpoint.parameters.query).forEach(([name, param]) => {
          formHtml += this.generateParameterField('query', name, param);
        });
        formHtml += '</div>';
      }
      
      // Generate body parameters
      if (endpoint.parameters.body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        formHtml += '<div class="parameter-group">';
        formHtml += '<h5>Request Body</h5>';
        Object.entries(endpoint.parameters.body).forEach(([name, param]) => {
          formHtml += this.generateParameterField('body', name, param);
        });
        formHtml += '</div>';
      }
      
      formHtml += '</div>';
    }
    
    // Add custom parameters section
    formHtml += '<div class="custom-parameters-section">';
    formHtml += '<h4>Additional Parameters (Optional)</h4>';
    formHtml += '<div class="form-group">';
    formHtml += '<label for="custom-query-params">Custom Query Parameters (key=value, separated by &):</label>';
    formHtml += '<input type="text" id="custom-query-params" class="form-control" placeholder="param1=value1&param2=value2">';
    formHtml += '</div>';
    
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      formHtml += '<div class="form-group">';
      formHtml += '<label for="custom-body-data">Custom Request Body (JSON):</label>';
      formHtml += '<textarea id="custom-body-data" class="form-control" rows="4" placeholder=\'{"key": "value"}\'></textarea>';
      formHtml += '</div>';
    }
    
    formHtml += '</div>';
    formHtml += '</div>';
    
    return formHtml;
  }

  /**
   * Generate individual parameter field
   */
  generateParameterField(type, name, param) {
    const fieldId = `param-${type}-${name}`;
    const required = param.required ? 'required' : '';
    const requiredMark = param.required ? ' *' : '';
    
    let fieldHtml = '<div class="form-group">';
    fieldHtml += `<label for="${fieldId}">${name}${requiredMark}</label>`;
    
    if (param.description) {
      fieldHtml += `<small class="param-description">${param.description}</small>`;
    }
    
    // Generate appropriate input based on parameter type
    if (param.type === 'string') {
      fieldHtml += `<input type="text" id="${fieldId}" class="form-control" ${required} data-param-type="${type}" data-param-name="${name}">`;
    } else if (param.type === 'number') {
      fieldHtml += `<input type="number" id="${fieldId}" class="form-control" ${required} data-param-type="${type}" data-param-name="${name}">`;
    } else if (param.type === 'boolean') {
      fieldHtml += `<select id="${fieldId}" class="form-control" ${required} data-param-type="${type}" data-param-name="${name}">`;
      fieldHtml += '<option value="">Select...</option>';
      fieldHtml += '<option value="true">True</option>';
      fieldHtml += '<option value="false">False</option>';
      fieldHtml += '</select>';
    } else if (param.type === 'array') {
      fieldHtml += `<textarea id="${fieldId}" class="form-control" rows="2" placeholder="Enter comma-separated values" ${required} data-param-type="${type}" data-param-name="${name}"></textarea>`;
    } else {
      // Default to text input
      fieldHtml += `<input type="text" id="${fieldId}" class="form-control" ${required} data-param-type="${type}" data-param-name="${name}">`;
    }
    
    fieldHtml += '</div>';
    return fieldHtml;
  }

  /**
   * Collect parameters from form
   */
  collectParametersFromForm(modalContent, endpoint) {
    const parameters = {};
    let hasValidationErrors = false;
    
    // Collect known parameters
    const paramInputs = modalContent.querySelectorAll('[data-param-type]');
    paramInputs.forEach(input => {
      const paramType = input.dataset.paramType;
      const paramName = input.dataset.paramName;
      const value = input.value.trim();
      
      // Validate required parameters
      if (input.hasAttribute('required') && !value) {
        input.style.borderColor = 'red';
        hasValidationErrors = true;
        return;
      } else {
        input.style.borderColor = '';
      }
      
      if (value) {
        if (!parameters[paramType]) {
          parameters[paramType] = {};
        }
        
        // Type conversion
        if (input.dataset.paramType === 'query' || input.dataset.paramType === 'path') {
          parameters[paramType][paramName] = value;
        } else if (input.dataset.paramType === 'body') {
          if (!parameters._body) {
            parameters._body = {};
          }
          parameters._body[paramName] = this.convertParameterValue(value, input);
        }
      }
    });
    
    // Collect custom query parameters
    const customQueryParams = modalContent.querySelector('#custom-query-params')?.value.trim();
    if (customQueryParams) {
      if (!parameters.query) parameters.query = {};
      const queryPairs = customQueryParams.split('&');
      queryPairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          parameters.query[key.trim()] = decodeURIComponent(value.trim());
        }
      });
    }
    
    // Collect custom body data
    const customBodyData = modalContent.querySelector('#custom-body-data')?.value.trim();
    if (customBodyData) {
      try {
        const bodyData = JSON.parse(customBodyData);
        if (parameters._body) {
          parameters._body = { ...parameters._body, ...bodyData };
        } else {
          parameters._body = bodyData;
        }
      } catch (error) {
        alert('Invalid JSON in custom request body. Please check your syntax.');
        return null;
      }
    }
    
    if (hasValidationErrors) {
      alert('Please fill in all required parameters.');
      return null;
    }
    
    return parameters;
  }

  /**
   * Convert parameter value based on input type
   */
  convertParameterValue(value, input) {
    const paramType = input.type;
    
    if (paramType === 'number') {
      return parseFloat(value);
    } else if (input.tagName === 'SELECT' && (value === 'true' || value === 'false')) {
      return value === 'true';
    } else if (input.tagName === 'TEXTAREA' && input.placeholder.includes('comma-separated')) {
      return value.split(',').map(v => v.trim());
    }
    
    return value;
  }

  /**
   * Prompt user for parameters with endpoint metadata
   */
  async promptForParametersWithMetadata(method, path, endpoint) {
    return new Promise((resolve) => {
      // Create a smart modal for parameter input
      const modal = document.createElement('div');
      modal.className = 'parameter-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
      `;
      
      const modalContent = document.createElement('div');
      modalContent.className = 'parameter-modal-content';
      modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      `;
      
      // Generate form content based on endpoint metadata
      const formContent = this.generateParameterForm(method, path, endpoint);
      
      modalContent.innerHTML = `
        <h3>Execute ${method} ${path}</h3>
        ${endpoint && endpoint.description ? `<p class="endpoint-description">${endpoint.description}</p>` : ''}
        ${formContent}
        <div class="modal-actions" style="margin-top: 20px; text-align: right;">
          <button id="cancel-params" class="btn btn-secondary" style="margin-right: 10px;">Cancel</button>
          <button id="execute-with-params" class="btn btn-primary">Execute</button>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Handle cancel
      modalContent.querySelector('#cancel-params').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });
      
      // Handle execute
      modalContent.querySelector('#execute-with-params').addEventListener('click', () => {
        const parameters = this.collectParametersFromForm(modalContent, endpoint);
        if (parameters !== null) {
          document.body.removeChild(modal);
          resolve(parameters);
        }
      });
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });
    });
  }

  /**
   * Handle execute button click
   */
  async handleExecuteButtonClick(button) {
    const method = button.dataset.method;
    const path = button.dataset.path;
    
    // Get endpoint metadata from the endpoints array
    const endpoint = this.findEndpointByMethodAndPath(method, path);
    
    // Always show smart parameter form
    const userParams = await this.promptForParametersWithMetadata(method, path, endpoint);
    if (userParams === null) {
      return; // User cancelled
    }
    
    const parameters = userParams;
    
    try {
      // Show loading state
      button.disabled = true;
      button.innerHTML = '<span class="btn-icon">⏳</span> Executing...';
      
      console.log('Sending request to API:', {
        method,
        path,
        parameters,
        requestBody: { 
          method, 
          path, 
          parameters: Object.keys(parameters).length > 0 ? parameters : undefined 
        }
      });

      const response = await fetch(`${this.apiBase}/test/endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          method, 
          path, 
          parameters: Object.keys(parameters).length > 0 ? parameters : undefined 
        })
      });

      console.log('API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      console.log('API result:', result);
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        console.error('Invalid API result structure:', result);
        throw new Error('Invalid API response structure');
      }
      
      console.log('Displaying test result...');
      // Display result in the test results section
      this.displayTestResult(result, `${method} ${path}`);
      console.log('Test result displayed successfully');
      
      // Show success notification
      if (result.success) {
        this.showNotification(`${method} ${path} executed successfully`, 'success');
      } else {
        this.showNotification(`${method} ${path} execution failed: ${result.error}`, 'error');
      }
      
    } catch (error) {
      console.error('Error executing endpoint:', error);
      this.showNotification('Failed to execute endpoint', 'error');
    } finally {
      // Restore button state
      button.disabled = false;
      button.innerHTML = '<span class="btn-icon">▶️</span> Execute';
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
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
   * Show/hide loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated() {
    const element = document.getElementById('last-updated');
    if (element) {
      element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  /**
   * Populate test form with endpoint data
   */
  populateTestForm(endpoint) {
    const methodEl = document.getElementById('test-method');
    const pathEl = document.getElementById('test-path');
    const testBtn = document.getElementById('test-endpoint-btn');
    const clearBtn = document.getElementById('clear-test-form-btn');
    
    if (methodEl) {
      methodEl.disabled = false;
      methodEl.value = endpoint.method;
    }
    
    if (pathEl) {
      pathEl.readOnly = false;
      pathEl.value = endpoint.path;
      pathEl.readOnly = true; // Make it read-only after setting value
    }
    
    if (testBtn) {
      testBtn.disabled = false;
    }
    
    if (clearBtn) {
      clearBtn.disabled = false;
    }
    
    // Show visual feedback that an endpoint was selected
    this.showNotification(`Selected endpoint: ${endpoint.method} ${endpoint.path}`, 'info');
  }

  /**
   * Clear test form
   */
  clearTestForm() {
    const methodEl = document.getElementById('test-method');
    const pathEl = document.getElementById('test-path');
    const testBtn = document.getElementById('test-endpoint-btn');
    const clearBtn = document.getElementById('clear-test-form-btn');
    
    if (methodEl) {
      methodEl.value = '';
      methodEl.disabled = true;
    }
    
    if (pathEl) {
      pathEl.readOnly = false;
      pathEl.value = '';
      pathEl.placeholder = 'Click an endpoint card above to select';
      pathEl.readOnly = true;
    }
    
    if (testBtn) {
      testBtn.disabled = true;
    }
    
    if (clearBtn) {
      clearBtn.disabled = true;
    }
    
    // Clear test results
    const resultsContainer = document.getElementById('test-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
    }
    
    this.showNotification('Test form cleared', 'info');
  }

  // Placeholder methods for cache and log functionality
  async loadCacheKeys() { /* Implementation needed */ }
  async searchCacheKeys() { /* Implementation needed */ }
  clearCacheKeySearch() { /* Implementation needed */ }
  filterCacheKeys() { /* Implementation needed */ }
  exportCacheKeys() { /* Implementation needed */ }
  async copyVisibleKeys() { /* Implementation needed */ }
  setupLogViewerEventListeners() { /* Implementation needed */ }
  async initializeLogViewer() { /* Implementation needed */ }
  async refreshData() { await this.loadInitialData(); }
}

// Global flag to prevent multiple initializations
let dashboardInitialized = false;

// Initialize dashboard function with guard
function initializeDashboard() {
  if (dashboardInitialized) {
    console.log('⚠️ Dashboard already initialized, skipping...');
    return;
  }
  
  console.log('🚀 Initializing CDN Dashboard...');
  dashboardInitialized = true;
  window.dashboard = new CDNDashboard();
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded event fired');
  initializeDashboard();
});

// Fallback initialization for cases where DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
} else {
  console.log('📄 Document already loaded, initializing immediately...');
  initializeDashboard();
}

// Additional fallback using window.onload
window.addEventListener('load', () => {
  console.log('🪟 Window load event fired');
  if (!dashboardInitialized) {
    console.log('🚀 Window loaded fallback, initializing CDN Dashboard...');
    initializeDashboard();
  }
});

// Page visibility change handler for debugging
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.dashboard) {
    console.log('🔍 Page became visible, dashboard instance:', window.dashboard);
    console.log('🔍 Settings button element:', document.getElementById('settings-btn'));
  }
});
