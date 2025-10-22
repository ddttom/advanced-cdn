// query-sanitizer.js - Query parameter sanitization utilities

/**
 * Sanitize query parameters to prevent injection attacks and invalid input
 * @param {Object} queryParams - Query parameters object from req.query
 * @param {Object} options - Sanitization options
 * @returns {Object|null} Sanitized query parameters or null if validation fails
 */
function sanitizeQueryParams(queryParams, options = {}) {
  if (!queryParams || typeof queryParams !== 'object') {
    return null;
  }

  const {
    maxKeyLength = 100,
    maxValueLength = 1000,
    maxParams = 50,
    allowedKeys = null, // Array of allowed keys, null = allow all
    allowedPattern = /^[a-zA-Z0-9_\-\.\*\s,/:]*$/ // Default: alphanumeric, _, -, ., *, space, comma, /, :
  } = options;

  const sanitized = {};
  const keys = Object.keys(queryParams);

  // Check if too many parameters
  if (keys.length > maxParams) {
    return null;
  }

  for (const key of keys) {
    // Check key length
    if (key.length > maxKeyLength) {
      return null;
    }

    // Check if key is allowed
    if (allowedKeys && !allowedKeys.includes(key)) {
      return null;
    }

    const value = queryParams[key];

    // Handle different value types
    if (typeof value === 'string') {
      // Check value length
      if (value.length > maxValueLength) {
        return null;
      }

      // Check for malicious patterns
      if (!allowedPattern.test(value)) {
        return null;
      }

      sanitized[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      // Handle array values
      const sanitizedArray = [];
      for (const item of value) {
        if (typeof item !== 'string' || item.length > maxValueLength) {
          return null;
        }
        if (!allowedPattern.test(item)) {
          return null;
        }
        sanitizedArray.push(item);
      }
      sanitized[key] = sanitizedArray;
    } else {
      // Invalid value type
      return null;
    }
  }

  return sanitized;
}

/**
 * Validate a single query parameter value
 * @param {string} value - Parameter value to validate
 * @param {Object} options - Validation options
 * @returns {boolean} True if valid, false otherwise
 */
function validateQueryValue(value, options = {}) {
  const {
    maxLength = 1000,
    pattern = /^[a-zA-Z0-9_\-\.\*\s,/:]*$/
  } = options;

  if (typeof value !== 'string') {
    return false;
  }

  if (value.length > maxLength) {
    return false;
  }

  return pattern.test(value);
}

/**
 * Sanitize a cache pattern parameter
 * @param {string} pattern - Cache pattern to sanitize
 * @returns {string|null} Sanitized pattern or null if invalid
 */
function sanitizeCachePattern(pattern) {
  if (!pattern || typeof pattern !== 'string') {
    return null;
  }

  // Allow alphanumeric, *, /, -, _, .
  const allowedPattern = /^[a-zA-Z0-9*\/\-_\.]+$/;

  if (pattern.length > 500) {
    return null;
  }

  if (!allowedPattern.test(pattern)) {
    return null;
  }

  return pattern;
}

/**
 * Sanitize a domain parameter
 * @param {string} domain - Domain to sanitize
 * @returns {string|null} Sanitized domain or null if invalid
 */
function sanitizeDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return null;
  }

  // Allow valid domain characters: alphanumeric, dots, hyphens
  const domainPattern = /^[a-zA-Z0-9\-\.]+$/;

  if (domain.length > 253) { // Max DNS name length
    return null;
  }

  if (!domainPattern.test(domain)) {
    return null;
  }

  return domain.toLowerCase();
}

/**
 * Sanitize a path parameter
 * @param {string} path - Path to sanitize
 * @returns {string|null} Sanitized path or null if invalid
 */
function sanitizePath(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  // Allow valid path characters
  const pathPattern = /^[a-zA-Z0-9\/\-_\.]+$/;

  if (path.length > 2000) {
    return null;
  }

  if (!pathPattern.test(path)) {
    return null;
  }

  return path;
}

/**
 * Middleware to sanitize all query parameters
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware
 */
function sanitizeQueryMiddleware(options = {}) {
  return (req, res, next) => {
    if (req.query && Object.keys(req.query).length > 0) {
      const sanitized = sanitizeQueryParams(req.query, options);

      if (sanitized === null) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          message: 'Query parameters contain invalid or potentially malicious content'
        });
      }

      req.query = sanitized;
    }
    next();
  };
}

module.exports = {
  sanitizeQueryParams,
  validateQueryValue,
  sanitizeCachePattern,
  sanitizeDomain,
  sanitizePath,
  sanitizeQueryMiddleware
};
