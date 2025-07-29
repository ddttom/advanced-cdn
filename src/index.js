// index.js
// Main entry point for the application

// Set default NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Start the cluster manager
require('./cluster-manager').startCluster();

// This file serves as a simple entry point
// The actual initialization happens in cluster-manager.js
console.log(`Starting Advanced CDN in ${process.env.NODE_ENV} mode`);
