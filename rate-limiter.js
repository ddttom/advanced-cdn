// rate-limiter.js
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./logger').getModuleLogger('rate-limiter');

class RateLimiter {
  constructor() {
    this.enabled = config.security.rateLimit.enabled;
    
    if (!this.enabled) {
      logger.info('Rate limiting disabled');
      return;
    }
    
    // Create rate limiter middleware
    this.limiter = rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      message: {
        status: 'error',
        message: 'Too many requests, please try again later.'
      },
      keyGenerator: (req) => {
        // Use IP address as key or a header-based key if behind a proxy
        return req.ip || 
               req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress;
      },
      handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded: ${req.ip} - ${req.method} ${req.originalUrl}`);
        res.status(429).json(options.message);
      },
      skip: (req, res) => {
        // Skip health checks and metrics endpoints
        if (req.path === config.monitoring.healthCheck.path || 
            req.path === config.monitoring.metrics.path) {
          return true;
        }
        
        // Don't rate limit internal IPs if configured
        const trustedIps = ['127.0.0.1', '::1'];
        if (trustedIps.includes(req.ip)) {
          return true;
        }
        
        return false;
      }
    });
    
    logger.info(`Rate limiting initialized: ${config.security.rateLimit.max} requests per ${config.security.rateLimit.windowMs}ms`);
  }
  
  /**
   * Get rate limiter middleware
   * @returns {Function} Rate limiter middleware or pass-through function
   */
  getMiddleware() {
    if (!this.enabled) {
      // Return pass-through middleware if disabled
      return (req, res, next) => next();
    }
    
    return this.limiter;
  }
}

module.exports = new RateLimiter();
