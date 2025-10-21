// input-sanitizer.js
/**
 * Input sanitization utilities for validating and cleaning user input
 */

/**
 * Sanitize a string input by removing potentially dangerous characters
 * @param {*} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string|null} Sanitized string or null if invalid
 */
function sanitizeString(input, options = {}) {
  const {
    maxLength = 1000,
    allowWildcard = false,
    allowSlash = false,
    allowDot = false,
    allowDash = false,
    allowUnderscore = true,
    allowColon = false
  } = options;

  // Return null for non-string inputs
  if (input === null || input === undefined) {
    return null;
  }

  // Convert to string
  let sanitized = String(input);

  // Check length
  if (sanitized.length > maxLength) {
    return null;
  }

  // Build allowed character pattern
  let allowedChars = 'a-zA-Z0-9';
  if (allowWildcard) allowedChars += '\\*';
  if (allowSlash) allowedChars += '\\/';
  if (allowDot) allowedChars += '\\.';
  if (allowDash) allowedChars += '\\-';
  if (allowUnderscore) allowedChars += '_';
  if (allowColon) allowedChars += ':';

  // Create regex pattern for allowed characters
  const pattern = new RegExp(`^[${allowedChars}]+$`);

  // Validate against pattern
  if (!pattern.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize a cache pattern (allows wildcards, slashes, dots, dashes, colons, underscores)
 * @param {*} pattern - Cache pattern to sanitize
 * @returns {string} Sanitized pattern or default '*'
 */
function sanitizeCachePattern(pattern) {
  if (!pattern) {
    return '*';
  }

  const sanitized = sanitizeString(pattern, {
    maxLength: 500,
    allowWildcard: true,
    allowSlash: true,
    allowDot: true,
    allowDash: true,
    allowUnderscore: true,
    allowColon: true
  });

  // Return default if sanitization failed
  return sanitized || '*';
}

/**
 * Sanitize query parameters object
 * @param {Object} query - Express req.query object
 * @param {Object} schema - Schema defining allowed parameters and their sanitization
 * @returns {Object} Sanitized query parameters
 */
function sanitizeQueryParams(query, schema) {
  const sanitized = {};

  for (const [key, config] of Object.entries(schema)) {
    const value = query[key];

    if (value === undefined || value === null) {
      // Use default value if provided
      if (config.default !== undefined) {
        sanitized[key] = config.default;
      }
      continue;
    }

    // Apply custom sanitizer if provided
    if (config.sanitizer) {
      sanitized[key] = config.sanitizer(value);
      continue;
    }

    // Apply type-based sanitization
    switch (config.type) {
      case 'string':
        sanitized[key] = sanitizeString(value, config.options || {});
        break;
      case 'number':
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= (config.min || -Infinity) && num <= (config.max || Infinity)) {
          sanitized[key] = num;
        }
        break;
      case 'boolean':
        sanitized[key] = value === 'true' || value === '1';
        break;
      case 'pattern':
        sanitized[key] = sanitizeCachePattern(value);
        break;
      default:
        // Unknown type, skip
        break;
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize an IP address
 * @param {string} ip - IP address to validate
 * @returns {string|null} Sanitized IP or null if invalid
 */
function sanitizeIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return null;
  }

  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  // IPv6 mapped IPv4
  const ipv6MappedPattern = /^::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

  if (ipv4Pattern.test(ip)) {
    // Validate each octet is 0-255
    const octets = ip.split('.');
    if (octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    })) {
      return ip;
    }
  } else if (ipv6Pattern.test(ip) || ipv6MappedPattern.test(ip)) {
    return ip;
  }

  return null;
}

module.exports = {
  sanitizeString,
  sanitizeCachePattern,
  sanitizeQueryParams,
  sanitizeIP
};
