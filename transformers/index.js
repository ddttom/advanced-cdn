// transformers/index.js
const { readFile } = require('fs/promises');
const { URL } = require('url');
const http = require('http');
const https = require('https');
const config = require('../config');
const logger = require('../logger').getModuleLogger('transformers');

/**
 * Transformer Plugin System
 * 
 * This module provides a plugin-based system for transforming content
 * based on file extensions. It includes built-in transformers for:
 * - HTML: Minification and optimization
 * - Markdown: Conversion to HTML
 * - JSON: Formatting and validation
 * - CSV: Conversion to HTML tables
 * - Text: Basic formatting and encoding
 * - XML: Pretty printing and validation
 */

/**
 * Base Transformer class
 */
class BaseTransformer {
    constructor(name, options = {}) {
        this.name = name;
        this.options = options;
    }
    
    /**
     * Transform content
     * @param {string} content - Content to transform
     * @param {Object} context - Transformation context
     * @returns {Promise<Object>} Transformed result
     */
    async transform(content, context = {}) {
        throw new Error(`Transform method not implemented for ${this.name}`);
    }
    
    /**
     * Check if transformer can handle content type
     * @param {string} contentType - Content type
     * @param {string} extension - File extension
     * @returns {boolean} Can handle
     */
    canHandle(contentType, extension) {
        return false;
    }
    
    /**
     * Get output content type
     * @param {string} inputContentType - Input content type
     * @returns {string} Output content type
     */
    getOutputContentType(inputContentType) {
        return inputContentType;
    }
}

/**
 * HTML Transformer
 */
class HtmlTransformer extends BaseTransformer {
    constructor(options = {}) {
        super('html', options);
        this.minify = options.minify || config.fileResolution?.transformers?.htmlMinify || false;
    }
    
    canHandle(contentType, extension) {
        return extension === 'html' || contentType?.includes('text/html');
    }
    
    async transform(content, context = {}) {
        try {
            let transformed = content;
            
            if (this.minify) {
                // Basic HTML minification
                transformed = transformed
                    .replace(/\s+/g, ' ')
                    .replace(/>\s+</g, '><')
                    .replace(/\s+>/g, '>')
                    .replace(/<\s+/g, '<')
                    .trim();
            }
            
            // Add basic meta tags if not present
            if (!transformed.includes('<meta charset')) {
                transformed = transformed.replace(
                    /<head>/i,
                    '<head>\n    <meta charset="utf-8">'
                );
            }
            
            return {
                success: true,
                content: transformed,
                contentType: 'text/html; charset=utf-8',
                transformer: this.name,
                originalSize: content.length,
                transformedSize: transformed.length
            };
            
        } catch (error) {
            logger.error('HTML transformation error', { error: error.message });
            return {
                success: false,
                error: error.message,
                transformer: this.name
            };
        }
    }
}

/**
 * Markdown Transformer
 */
class MarkdownTransformer extends BaseTransformer {
    constructor(options = {}) {
        super('markdown', options);
        this.markdownOptions = {
            breaks: true,
            linkify: true,
            typographer: true,
            ...options.markdownOptions
        };
    }
    
    canHandle(contentType, extension) {
        return extension === 'md' || 
               extension === 'markdown' || 
               contentType?.includes('text/markdown');
    }
    
    getOutputContentType(inputContentType) {
        return 'text/html; charset=utf-8';
    }
    
    async transform(content, context = {}) {
        try {
            // Simple markdown to HTML conversion
            let html = content
                // Headers
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                // Bold
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/__(.*?)__/gim, '<strong>$1</strong>')
                // Italic
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/_(.*?)_/gim, '<em>$1</em>')
                // Code blocks
                .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
                .replace(/`(.*?)`/gim, '<code>$1</code>')
                // Links
                .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
                // Line breaks
                .replace(/\n\n/gim, '</p><p>')
                .replace(/\n/gim, '<br>');
            
            // Wrap in paragraphs
            if (!html.startsWith('<h') && !html.startsWith('<p')) {
                html = '<p>' + html + '</p>';
            }
            
            // Create full HTML document
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Markdown Document</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 2px; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
    </style>
</head>
<body>
${html}
</body>
</html>`;
            
            return {
                success: true,
                content: fullHtml,
                contentType: 'text/html; charset=utf-8',
                transformer: this.name,
                originalSize: content.length,
                transformedSize: fullHtml.length
            };
            
        } catch (error) {
            logger.error('Markdown transformation error', { error: error.message });
            return {
                success: false,
                error: error.message,
                transformer: this.name
            };
        }
    }
}

/**
 * JSON Transformer
 */
class JsonTransformer extends BaseTransformer {
    constructor(options = {}) {
        super('json', options);
        this.indent = options.indent || config.fileResolution?.transformers?.jsonFormatterIndent || 2;
    }
    
    canHandle(contentType, extension) {
        return extension === 'json' || contentType?.includes('application/json');
    }
    
    getOutputContentType(inputContentType) {
        return 'text/html; charset=utf-8';
    }
    
    async transform(content, context = {}) {
        try {
            // Parse and validate JSON
            const parsed = JSON.parse(content);
            const formatted = JSON.stringify(parsed, null, this.indent);
            
            // Create HTML representation
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>JSON Document</title>
    <style>
        body { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; margin: 20px; }
        .json-container { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 20px; overflow-x: auto; }
        .json-key { color: #d73a49; }
        .json-string { color: #032f62; }
        .json-number { color: #005cc5; }
        .json-boolean { color: #e36209; }
        .json-null { color: #6f42c1; }
    </style>
</head>
<body>
    <h1>JSON Document</h1>
    <div class="json-container">
        <pre>${this.syntaxHighlight(formatted)}</pre>
    </div>
</body>
</html>`;
            
            return {
                success: true,
                content: html,
                contentType: 'text/html; charset=utf-8',
                transformer: this.name,
                originalSize: content.length,
                transformedSize: html.length,
                parsed: parsed
            };
            
        } catch (error) {
            logger.error('JSON transformation error', { error: error.message });
            return {
                success: false,
                error: error.message,
                transformer: this.name
            };
        }
    }
    
    syntaxHighlight(json) {
        return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
                (match) => {
                    let cls = 'json-number';
                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = 'json-key';
                        } else {
                            cls = 'json-string';
                        }
                    } else if (/true|false/.test(match)) {
                        cls = 'json-boolean';
                    } else if (/null/.test(match)) {
                        cls = 'json-null';
                    }
                    return '<span class="' + cls + '">' + match + '</span>';
                });
    }
}

/**
 * CSV Transformer
 */
class CsvTransformer extends BaseTransformer {
    constructor(options = {}) {
        super('csv', options);
        this.hasHeaders = options.hasHeaders !== false;
        this.delimiter = options.delimiter || ',';
    }
    
    canHandle(contentType, extension) {
        return extension === 'csv' || contentType?.includes('text/csv');
    }
    
    getOutputContentType(inputContentType) {
        return 'text/html; charset=utf-8';
    }
    
    async transform(content, context = {}) {
        try {
            const lines = content.trim().split('\n');
            if (lines.length === 0) {
                throw new Error('Empty CSV content');
            }
            
            const rows = lines.map(line => this.parseCSVLine(line));
            
            let tableHtml = '<table class="csv-table">\n';
            
            if (this.hasHeaders && rows.length > 0) {
                tableHtml += '  <thead>\n    <tr>\n';
                rows[0].forEach(cell => {
                    tableHtml += `      <th>${this.escapeHtml(cell)}</th>\n`;
                });
                tableHtml += '    </tr>\n  </thead>\n';
                
                tableHtml += '  <tbody>\n';
                for (let i = 1; i < rows.length; i++) {
                    tableHtml += '    <tr>\n';
                    rows[i].forEach(cell => {
                        tableHtml += `      <td>${this.escapeHtml(cell)}</td>\n`;
                    });
                    tableHtml += '    </tr>\n';
                }
                tableHtml += '  </tbody>\n';
            } else {
                tableHtml += '  <tbody>\n';
                rows.forEach(row => {
                    tableHtml += '    <tr>\n';
                    row.forEach(cell => {
                        tableHtml += `      <td>${this.escapeHtml(cell)}</td>\n`;
                    });
                    tableHtml += '    </tr>\n';
                });
                tableHtml += '  </tbody>\n';
            }
            
            tableHtml += '</table>';
            
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CSV Document</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .csv-table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        .csv-table th, .csv-table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        .csv-table th { background-color: #f2f2f2; font-weight: bold; }
        .csv-table tr:nth-child(even) { background-color: #f9f9f9; }
        .csv-table tr:hover { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <h1>CSV Document</h1>
    <p>Rows: ${rows.length}${this.hasHeaders ? ' (including header)' : ''}</p>
    ${tableHtml}
</body>
</html>`;
            
            return {
                success: true,
                content: html,
                contentType: 'text/html; charset=utf-8',
                transformer: this.name,
                originalSize: content.length,
                transformedSize: html.length,
                rowCount: rows.length
            };
            
        } catch (error) {
            logger.error('CSV transformation error', { error: error.message });
            return {
                success: false,
                error: error.message,
                transformer: this.name
            };
        }
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === this.delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
    
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

/**
 * Text Transformer
 */
class TextTransformer extends BaseTransformer {
    constructor(options = {}) {
        super('text', options);
    }
    
    canHandle(contentType, extension) {
        return extension === 'txt' || 
               extension === 'text' || 
               contentType?.includes('text/plain');
    }
    
    getOutputContentType(inputContentType) {
        return 'text/html; charset=utf-8';
    }
    
    async transform(content, context = {}) {
        try {
            const escapedContent = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Text Document</title>
    <style>
        body { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; margin: 20px; line-height: 1.6; }
        .text-container { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 20px; white-space: pre-wrap; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Text Document</h1>
    <div class="text-container">${escapedContent}</div>
</body>
</html>`;
            
            return {
                success: true,
                content: html,
                contentType: 'text/html; charset=utf-8',
                transformer: this.name,
                originalSize: content.length,
                transformedSize: html.length
            };
            
        } catch (error) {
            logger.error('Text transformation error', { error: error.message });
            return {
                success: false,
                error: error.message,
                transformer: this.name
            };
        }
    }
}

/**
 * XML Transformer
 */
class XmlTransformer extends BaseTransformer {
    constructor(options = {}) {
        super('xml', options);
        this.prettyPrint = options.prettyPrint !== false;
    }
    
    canHandle(contentType, extension) {
        return extension === 'xml' || 
               contentType?.includes('application/xml') ||
               contentType?.includes('text/xml');
    }
    
    getOutputContentType(inputContentType) {
        return 'text/html; charset=utf-8';
    }
    
    async transform(content, context = {}) {
        try {
            let formatted = content;
            
            if (this.prettyPrint) {
                // Basic XML formatting
                formatted = content
                    .replace(/></g, '>\n<')
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map((line, index, array) => {
                        let indent = 0;
                        for (let i = 0; i < index; i++) {
                            if (array[i].match(/<[^\/][^>]*[^\/]>$/)) indent++;
                            if (array[i].match(/<\/[^>]+>$/)) indent--;
                        }
                        if (line.match(/<\/[^>]+>$/)) indent--;
                        return '  '.repeat(Math.max(0, indent)) + line;
                    })
                    .join('\n');
            }
            
            const escapedContent = formatted
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>XML Document</title>
    <style>
        body { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; margin: 20px; }
        .xml-container { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 20px; overflow-x: auto; }
        .xml-tag { color: #d73a49; }
        .xml-attr { color: #005cc5; }
        .xml-value { color: #032f62; }
    </style>
</head>
<body>
    <h1>XML Document</h1>
    <div class="xml-container">
        <pre>${this.syntaxHighlight(escapedContent)}</pre>
    </div>
</body>
</html>`;
            
            return {
                success: true,
                content: html,
                contentType: 'text/html; charset=utf-8',
                transformer: this.name,
                originalSize: content.length,
                transformedSize: html.length
            };
            
        } catch (error) {
            logger.error('XML transformation error', { error: error.message });
            return {
                success: false,
                error: error.message,
                transformer: this.name
            };
        }
    }
    
    syntaxHighlight(xml) {
        return xml
            .replace(/(&lt;[^&]*&gt;)/g, '<span class="xml-tag">$1</span>')
            .replace(/(\w+)=/g, '<span class="xml-attr">$1</span>=')
            .replace(/="([^"]*)"/g, '="<span class="xml-value">$1</span>"');
    }
}

/**
 * Transformer Manager
 */
class TransformerManager {
    constructor() {
        this.transformers = new Map();
        this.stats = {
            transformations: 0,
            successes: 0,
            failures: 0
        };
        
        // Register built-in transformers
        this.registerBuiltInTransformers();
        
        logger.info('TransformerManager initialized', {
            transformers: Array.from(this.transformers.keys())
        });
    }
    
    /**
     * Register built-in transformers
     */
    registerBuiltInTransformers() {
        const transformerConfig = config.fileResolution?.transformers || {};
        
        this.register(new HtmlTransformer(transformerConfig));
        this.register(new MarkdownTransformer(transformerConfig));
        this.register(new JsonTransformer(transformerConfig));
        this.register(new CsvTransformer(transformerConfig));
        this.register(new TextTransformer(transformerConfig));
        this.register(new XmlTransformer(transformerConfig));
    }
    
    /**
     * Register a transformer
     * @param {BaseTransformer} transformer - Transformer instance
     */
    register(transformer) {
        this.transformers.set(transformer.name, transformer);
        logger.debug('Transformer registered', { name: transformer.name });
    }
    
    /**
     * Get transformer by name
     * @param {string} name - Transformer name
     * @returns {BaseTransformer|null} Transformer instance
     */
    getTransformer(name) {
        return this.transformers.get(name) || null;
    }
    
    /**
     * Find transformer for content type and extension
     * @param {string} contentType - Content type
     * @param {string} extension - File extension
     * @returns {BaseTransformer|null} Transformer instance
     */
    findTransformer(contentType, extension) {
        for (const transformer of this.transformers.values()) {
            if (transformer.canHandle(contentType, extension)) {
                return transformer;
            }
        }
        return null;
    }
    
    /**
     * Transform content using appropriate transformer
     * @param {string} content - Content to transform
     * @param {string} contentType - Content type
     * @param {string} extension - File extension
     * @param {Array} preferredTransformers - Preferred transformer names
     * @param {Object} context - Transformation context
     * @returns {Promise<Object>} Transformation result
     */
    async transform(content, contentType, extension, preferredTransformers = [], context = {}) {
        const startTime = Date.now();
        this.stats.transformations++;
        
        try {
            // Try preferred transformers first
            for (const name of preferredTransformers) {
                const transformer = this.getTransformer(name);
                if (transformer && transformer.canHandle(contentType, extension)) {
                    const result = await transformer.transform(content, context);
                    result.duration = Date.now() - startTime;
                    
                    if (result.success) {
                        this.stats.successes++;
                    } else {
                        this.stats.failures++;
                    }
                    
                    return result;
                }
            }
            
            // Find any suitable transformer
            const transformer = this.findTransformer(contentType, extension);
            if (!transformer) {
                return {
                    success: false,
                    error: 'No suitable transformer found',
                    contentType,
                    extension,
                    duration: Date.now() - startTime
                };
            }
            
            const result = await transformer.transform(content, context);
            result.duration = Date.now() - startTime;
            
            if (result.success) {
                this.stats.successes++;
            } else {
                this.stats.failures++;
            }
            
            return result;
            
        } catch (error) {
            this.stats.failures++;
            logger.error('Transformation error', {
                contentType,
                extension,
                error: error.message
            });
            
            return {
                success: false,
                error: error.message,
                contentType,
                extension,
                duration: Date.now() - startTime
            };
        }
    }
    
    /**
     * Fetch and transform content from URL
     * @param {string} url - URL to fetch
     * @param {string} extension - File extension
     * @param {Array} preferredTransformers - Preferred transformer names
     * @param {Object} context - Transformation context
     * @returns {Promise<Object>} Transformation result
     */
    async fetchAndTransform(url, extension, preferredTransformers = [], context = {}) {
        try {
            const content = await this.fetchContent(url);
            return await this.transform(
                content.data, 
                content.contentType, 
                extension, 
                preferredTransformers, 
                { ...context, url }
            );
        } catch (error) {
            return {
                success: false,
                error: error.message,
                url,
                extension
            };
        }
    }
    
    /**
     * Fetch content from URL
     * @param {string} url - URL to fetch
     * @returns {Promise<Object>} Content data
     */
    async fetchContent(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                method: 'GET',
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                headers: {
                    'User-Agent': config.fileResolution?.userAgent || 'Advanced-CDN-FileResolver/1.0'
                },
                timeout: config.fileResolution?.timeout || 5000
            };
            
            const req = client.request(options, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    return;
                }
                
                let data = '';
                res.setEncoding('utf8');
                
                res.on('data', chunk => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        data,
                        contentType: res.headers['content-type'],
                        contentLength: res.headers['content-length']
                    });
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.end();
        });
    }
    
    /**
     * Get transformer statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.stats,
            transformers: Array.from(this.transformers.keys()),
            successRate: this.stats.transformations > 0 ? 
                (this.stats.successes / this.stats.transformations) : 0
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            transformations: 0,
            successes: 0,
            failures: 0
        };
    }
}

// Create singleton instance
const transformerManager = new TransformerManager();

module.exports = transformerManager;
module.exports.BaseTransformer = BaseTransformer;
module.exports.HtmlTransformer = HtmlTransformer;
module.exports.MarkdownTransformer = MarkdownTransformer;
module.exports.JsonTransformer = JsonTransformer;
module.exports.CsvTransformer = CsvTransformer;
module.exports.TextTransformer = TextTransformer;
module.exports.XmlTransformer = XmlTransformer;
module.exports.TransformerManager = TransformerManager;
