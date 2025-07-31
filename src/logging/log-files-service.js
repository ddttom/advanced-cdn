// logging/log-files-service.js
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { createReadStream } = require('fs');

/**
 * Log Files Service
 * Provides access to historical log files with search and pagination
 */
class LogFilesService {
  constructor(logDir) {
    this.logDir = logDir || path.join(__dirname, '..', 'logs');
    this.supportedFiles = ['app.log', 'error.log', 'access.log', 'exceptions.log', 'rejections.log'];
  }

  /**
   * Get list of available log files
   */
  async getLogFiles() {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = [];

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          
          logFiles.push({
            name: file,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime,
            type: this.getLogFileType(file)
          });
        }
      }

      return logFiles.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      console.error('Error reading log directory:', error);
      return [];
    }
  }

  /**
   * Get log file type based on filename
   */
  getLogFileType(filename) {
    if (filename.includes('error')) return 'error';
    if (filename.includes('access')) return 'access';
    if (filename.includes('exception')) return 'exception';
    if (filename.includes('rejection')) return 'rejection';
    return 'application';
  }

  /**
   * Read log file with pagination
   */
  async readLogFile(filename, options = {}) {
    const {
      page = 1,
      limit = 100,
      search = '',
      level = '',
      startDate = '',
      endDate = ''
    } = options;

    try {
      const filePath = path.join(this.logDir, filename);
      
      // Check if file exists and is safe to read
      await this.validateLogFile(filePath);

      const lines = await this.readFileLines(filePath, {
        search,
        level,
        startDate,
        endDate
      });

      // Calculate pagination
      const totalLines = lines.length;
      const totalPages = Math.ceil(totalLines / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLines = lines.slice(startIndex, endIndex);

      return {
        filename,
        lines: paginatedLines,
        pagination: {
          page,
          limit,
          totalLines,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          search,
          level,
          startDate,
          endDate
        }
      };
    } catch (error) {
      throw new Error(`Failed to read log file: ${error.message}`);
    }
  }

  /**
   * Search logs across multiple files
   */
  async searchLogs(searchTerm, options = {}) {
    const {
      files = this.supportedFiles,
      level = '',
      startDate = '',
      endDate = '',
      limit = 500
    } = options;

    const results = [];

    for (const filename of files) {
      try {
        const filePath = path.join(this.logDir, filename);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          continue; // Skip non-existent files
        }

        const lines = await this.readFileLines(filePath, {
          search: searchTerm,
          level,
          startDate,
          endDate
        });

        lines.forEach(line => {
          results.push({
            file: filename,
            ...line
          });
        });

        // Stop if we've reached the limit
        if (results.length >= limit) {
          break;
        }
      } catch (error) {
        console.error(`Error searching in ${filename}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return results.slice(0, limit);
  }

  /**
   * Read and filter file lines
   */
  async readFileLines(filePath, filters = {}) {
    const { search, level, startDate, endDate } = filters;
    const lines = [];

    return new Promise((resolve, reject) => {
      const fileStream = createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        try {
          const logEntry = this.parseLogLine(line);
          
          // Apply filters
          if (this.matchesFilters(logEntry, filters)) {
            lines.push(logEntry);
          }
        } catch (error) {
          // Skip invalid lines
        }
      });

      rl.on('close', () => {
        // Sort by timestamp (newest first)
        lines.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        resolve(lines);
      });

      rl.on('error', reject);
    });
  }

  /**
   * Parse a log line into structured data
   */
  parseLogLine(line) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(line);
      return {
        timestamp: parsed.timestamp || new Date().toISOString(),
        level: parsed.level || 'info',
        message: parsed.message || line,
        module: parsed.module || 'system',
        meta: parsed.meta || {},
        raw: line
      };
    } catch {
      // Fallback for non-JSON lines
      // Try to extract timestamp and level from common formats
      const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      const levelMatch = line.match(/\b(error|warn|info|debug|verbose|silly)\b/i);
      
      return {
        timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
        level: levelMatch ? levelMatch[1].toLowerCase() : 'info',
        message: line,
        module: 'system',
        meta: {},
        raw: line
      };
    }
  }

  /**
   * Check if log entry matches filters
   */
  matchesFilters(logEntry, filters) {
    const { search, level, startDate, endDate } = filters;

    // Level filter
    if (level && logEntry.level !== level) {
      return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const entryDate = new Date(logEntry.timestamp);
      
      if (startDate && entryDate < new Date(startDate)) {
        return false;
      }
      
      if (endDate && entryDate > new Date(endDate)) {
        return false;
      }
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const messageMatch = logEntry.message.toLowerCase().includes(searchLower);
      const moduleMatch = logEntry.module.toLowerCase().includes(searchLower);
      
      if (!messageMatch && !moduleMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate log file path for security
   */
  async validateLogFile(filePath) {
    // Ensure file is within log directory
    const resolvedPath = path.resolve(filePath);
    const resolvedLogDir = path.resolve(this.logDir);
    
    if (!resolvedPath.startsWith(resolvedLogDir)) {
      throw new Error('Invalid file path');
    }

    // Check if file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      throw new Error('File not found or not readable');
    }

    // Check file size (limit to 100MB)
    const stats = await fs.stat(filePath);
    if (stats.size > 100 * 1024 * 1024) {
      throw new Error('File too large to read');
    }
  }

  /**
   * Download log file
   */
  async downloadLogFile(filename) {
    const filePath = path.join(this.logDir, filename);
    await this.validateLogFile(filePath);
    
    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      filename,
      size: stats.size,
      mimeType: 'text/plain'
    };
  }

  /**
   * Get log file statistics
   */
  async getLogFileStats(filename) {
    try {
      const filePath = path.join(this.logDir, filename);
      await this.validateLogFile(filePath);

      const stats = await fs.stat(filePath);
      const lines = await this.readFileLines(filePath);
      
      // Count by level
      const levelCounts = {};
      lines.forEach(line => {
        levelCounts[line.level] = (levelCounts[line.level] || 0) + 1;
      });

      return {
        filename,
        size: stats.size,
        totalLines: lines.length,
        levelCounts,
        modified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      throw new Error(`Failed to get file stats: ${error.message}`);
    }
  }
}

module.exports = LogFilesService;