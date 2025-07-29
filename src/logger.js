// logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Ensure log directory exists
if (config.logging.logToFile && !fs.existsSync(config.logging.logDir)) {
  fs.mkdirSync(config.logging.logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (more readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [];

// Add console transport if enabled
if (config.logging.logToConsole) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.server.env === 'production' ? 'info' : 'debug'
    })
  );
}

// Add file transports if enabled
if (config.logging.logToFile) {
  // Application log - all levels
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'app.log'),
      format: logFormat,
      level: config.logging.level,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );

  // Error log - only errors
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'error.log'),
      format: logFormat,
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  );

  // Access log - for HTTP requests
  if (config.logging.accessLog) {
    transports.push(
      new winston.transports.File({
        filename: path.join(config.logging.logDir, 'access.log'),
        format: logFormat,
        level: 'http',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })
    );
  }
}

// Create Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels: winston.config.npm.levels,
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'exceptions.log'),
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'rejections.log'),
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ],
  exitOnError: false
});

// Create HTTP logging middleware
logger.httpLogger = (req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress;
  
  // Process response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      contentLength: res.get('content-length') || 0,
      userAgent: req.get('user-agent'),
      referrer: req.get('referrer'),
      ip,
      duration,
      cacheStatus: res.get('x-cache') || 'NONE',
      path: req.path,
      host: req.get('host')
    };
    
    // Log at appropriate level
    if (res.statusCode >= 500) {
      logger.error('HTTP Error', message);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Warning', message);
    } else {
      logger.http('HTTP Access', message);
    }
  });
  
  next();
};

// Allow easy access to child loggers for different modules
logger.getModuleLogger = (moduleName) => {
  return logger.child({ module: moduleName });
};

module.exports = logger;
