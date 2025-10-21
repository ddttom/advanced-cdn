// index.js
// Main entry point for the application

// Set default NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Start the cluster manager
// Note: Logging initialization happens in cluster-manager.js
require('./cluster-manager').startCluster();
