# Deployment Guide

This guide provides comprehensive instructions for deploying the Advanced CDN application in production environments, with special attention to memory management, resource cleanup, and operational best practices.

## Pre-Deployment Checklist

### Memory Management Verification

Before deploying, ensure your application includes proper memory leak prevention:

1. **Interval Cleanup**: Verify all `setInterval` calls have corresponding cleanup in shutdown handlers
2. **Cache Management**: Confirm cache stores are properly flushed during shutdown
3. **Metrics Cleanup**: Ensure Prometheus registries are cleared on shutdown
4. **Connection Pooling**: Verify HTTP agents and connections are properly destroyed

### Configuration Validation

1. **Environment Variables**: Review all configuration settings in `config/env-example.txt`
2. **Domain Setup**: Configure `ORIGIN_DOMAIN`, `TARGET_DOMAIN`, and `ADDITIONAL_DOMAINS`
3. **Security Settings**: Enable `SECURITY_HEADERS`, configure `CORS`, and set appropriate `RATE_LIMIT` values
4. **Memory Settings**: Configure memory monitoring and cleanup options

## Production Deployment

### System Requirements

- **Node.js**: Version 18.x or higher (LTS recommended)
- **Memory**: Minimum 1GB RAM (2GB+ recommended for high traffic)
- **CPU**: Multi-core processor (application supports clustering)
- **Storage**: 500MB for application files, additional space for logs
- **Network**: Reliable internet connection with low latency to target domains

### Memory Optimization for Production

Configure these environment variables for optimal memory usage:

```bash
# Production memory settings
NODE_ENV=production
ENABLE_CLUSTER=true
CLUSTER_WORKERS=0  # Auto-detect CPU cores

# Memory management
GRACEFUL_SHUTDOWN_ENABLED=true
GRACEFUL_SHUTDOWN_TIMEOUT=30000
CLEANUP_INTERVALS_ON_SHUTDOWN=true
CLEANUP_CACHES_ON_SHUTDOWN=true
CLEANUP_METRICS_ON_SHUTDOWN=true

# Memory monitoring
MEMORY_MONITORING_ENABLED=true
MEMORY_LOG_INTERVAL=300000  # 5 minutes
MEMORY_WARNING_THRESHOLD=80
MEMORY_CRITICAL_THRESHOLD=95

# Cache optimization
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
CACHE_MAX_ITEMS=5000
CACHE_CHECK_PERIOD=120
```

### Installation Steps

1. **Server Setup**:
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js (using NodeSource repository)
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 process manager
   sudo npm install -g pm2
   ```

2. **Application Deployment**:
   ```bash
   # Clone repository
   git clone <repository-url> /opt/advanced-cdn
   cd /opt/advanced-cdn
   
   # Install dependencies
   npm ci --production
   
   # Create necessary directories
   mkdir -p logs ssl config
   
   # Set proper permissions
   chown -R node:node /opt/advanced-cdn
   chmod +x /opt/advanced-cdn/src/cluster-manager.js
   ```

3. **Configuration**:
   ```bash
   # Copy and configure environment file
   cp config/env-example.txt .env
   
   # Edit configuration (use your preferred editor)
   nano .env
   ```

4. **SSL Certificate Setup** (if using HTTPS):
   ```bash
   # For Let's Encrypt certificates
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   
   # Copy certificates to application directory
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
   sudo chown node:node ssl/*.pem
   ```

### Process Management with PM2

Create a PM2 ecosystem file for advanced process management:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'advanced-cdn',
    script: './src/cluster-manager.js',
    instances: 1,  // Let the app handle clustering internally
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Memory management settings
    max_memory_restart: '2G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Logging
    log_file: './logs/pm2-app.log',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Memory monitoring
    monitoring: true,
    pmx: true,
    
    // Graceful shutdown
    kill_timeout: 30000,
    listen_timeout: 30000,
    
    // Advanced settings for memory optimization
    node_args: [
      '--max-old-space-size=2048',  // 2GB heap limit
      '--max-semi-space-size=256',   // Optimize garbage collection
      '--optimize-for-size'          // Optimize for memory usage
    ]
  }]
};
```

Start the application:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

## Load Balancer Configuration

### Nginx Configuration

```nginx
upstream advanced_cdn {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Health check endpoint
    location /health {
        proxy_pass http://advanced_cdn;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Quick health check timeout
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }

    # Main application
    location / {
        proxy_pass http://advanced_cdn;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings for memory efficiency
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
}
```

## Memory Monitoring and Alerting

### System-Level Monitoring

1. **Memory Usage Monitoring**:
   ```bash
   # Create monitoring script
   cat > /opt/advanced-cdn/scripts/memory-monitor.sh << 'EOF'
   #!/bin/bash
   
   # Get memory usage
   MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
   NODE_MEMORY=$(ps -o pid,ppid,cmd,%mem --sort=-%mem | grep "node.*cluster-manager" | head -1 | awk '{print $4}')
   
   # Log memory usage
   echo "$(date): System Memory: ${MEMORY_USAGE}%, Node.js Process: ${NODE_MEMORY}%" >> /var/log/advanced-cdn-memory.log
   
   # Alert if memory usage is high
   if [ "$MEMORY_USAGE" -gt 90 ]; then
       echo "HIGH MEMORY USAGE ALERT: ${MEMORY_USAGE}%" | logger -t advanced-cdn
   fi
   
   if [ "${NODE_MEMORY%.*}" -gt 80 ]; then
       echo "HIGH NODE MEMORY USAGE: ${NODE_MEMORY}%" | logger -t advanced-cdn
   fi
   EOF
   
   chmod +x /opt/advanced-cdn/scripts/memory-monitor.sh
   
   # Add to crontab for regular monitoring
   echo "*/5 * * * * /opt/advanced-cdn/scripts/memory-monitor.sh" | crontab -
   ```

2. **PM2 Memory Monitoring**:
   ```bash
   # Monitor PM2 processes
   pm2 monit
   
   # Set memory limit alerts
   pm2 set pm2:max_memory_threshold 2048
   ```

### Application-Level Memory Tracking

The application includes built-in memory monitoring that can be configured:

```bash
# Enable comprehensive memory tracking
MEMORY_MONITORING_ENABLED=true
MEMORY_MONITORING_DETAILED=true
MEMORY_LOG_INTERVAL=60000

# Set memory thresholds
MEMORY_WARNING_THRESHOLD=75
MEMORY_CRITICAL_THRESHOLD=90

# Enable cleanup logging
CLEANUP_LOGGING_ENABLED=true
SHUTDOWN_LOGGING_ENABLED=true
```

## Troubleshooting Production Issues

### Memory Leak Detection

1. **Enable Debug Logging**:
   ```bash
   # Temporarily enable debug mode
   pm2 set advanced-cdn NODE_ENV development
   pm2 set advanced-cdn LOG_LEVEL debug
   pm2 restart advanced-cdn
   ```

2. **Monitor Memory Growth**:
   ```bash
   # Watch memory usage in real-time
   watch -n 5 'ps -o pid,ppid,cmd,%mem --sort=-%mem | grep node'
   
   # Check application memory logs
   tail -f logs/app.log | grep -i memory
   ```

3. **Heap Dump Analysis**:
   ```bash
   # Generate heap dump
   kill -USR2 $(pgrep -f cluster-manager)
   
   # Analyze with clinic.js (install first: npm install -g clinic)
   clinic doctor -- node src/cluster-manager.js
   ```

### Common Production Issues

1. **High Memory Usage**:
   - Check cache settings and reduce `CACHE_MAX_ITEMS`
   - Verify interval cleanup is working
   - Monitor for memory leaks in custom code
   - Consider reducing `CLUSTER_WORKERS`

2. **Process Crashes**:
   - Check PM2 logs: `pm2 logs advanced-cdn`
   - Verify graceful shutdown is enabled
   - Monitor system resources
   - Check for unhandled promise rejections

3. **Performance Degradation**:
   - Monitor cache hit rates
   - Check backend response times
   - Verify proper connection pooling
   - Monitor garbage collection frequency

## Security Hardening

### System Security

1. **User Permissions**:
   ```bash
   # Create dedicated user
   sudo useradd -r -s /bin/false -d /opt/advanced-cdn node
   sudo chown -R node:node /opt/advanced-cdn
   
   # Run application as non-root user
   pm2 start ecosystem.config.js --user node
   ```

2. **Firewall Configuration**:
   ```bash
   # Configure UFW firewall
   sudo ufw enable
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw default deny incoming
   ```

3. **File Permissions**:
   ```bash
   # Secure configuration files
   chmod 600 .env
   chmod 600 ssl/*.pem
   chmod 755 src/
   chmod 644 src/*.js
   ```

### Application Security

Configure security headers and settings:

```bash
# Security configuration
SECURITY_HEADERS=true
CONTENT_SECURITY_POLICY="default-src 'self'"
ENABLE_CORS=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Trust proxy headers (important for load balancers)
TRUST_PROXY=true
```

## Backup and Recovery

### Configuration Backup

```bash
# Create backup script
cat > /opt/advanced-cdn/scripts/backup-config.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/advanced-cdn"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" .env config/ ssl/

# Backup logs (last 7 days)
find logs/ -name "*.log" -mtime -7 -exec tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" {} +

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/advanced-cdn/scripts/backup-config.sh

# Schedule daily backups
echo "0 2 * * * /opt/advanced-cdn/scripts/backup-config.sh" | crontab -
```

### Disaster Recovery

1. **Application Recovery**:
   ```bash
   # Stop application
   pm2 stop advanced-cdn
   
   # Restore from backup
   cd /opt/advanced-cdn
   tar -xzf /opt/backups/advanced-cdn/config_latest.tar.gz
   
   # Restart application
   pm2 start advanced-cdn
   ```

2. **Memory State Recovery**:
   - Caches will rebuild automatically
   - Metrics will reset but begin collecting immediately
   - All intervals will restart properly

## Monitoring and Alerting

### Health Checks

Set up external monitoring:

```bash
# Example health check script for external monitoring
curl -f http://localhost:3000/health || exit 1
```

### Log Monitoring

```bash
# Monitor for memory-related issues
tail -f logs/app.log | grep -E "(memory|leak|cleanup|shutdown)"

# Monitor for errors
tail -f logs/error.log | grep -E "(error|exception|crash)"
```

### Metrics Collection

The application exposes Prometheus metrics at `/metrics`. Configure your monitoring system to scrape:

- Memory usage metrics
- Cache performance metrics
- Request processing metrics
- Domain routing metrics
- Cleanup operation metrics

## Performance Optimization

### Memory Optimization

1. **Node.js Flags**:
   ```bash
   # Optimize for memory usage
   node --max-old-space-size=2048 --max-semi-space-size=256 --optimize-for-size src/cluster-manager.js
   ```

2. **Cache Tuning**:
   ```bash
   # Optimize cache settings for available memory
   CACHE_MAX_ITEMS=5000      # Adjust based on available memory
   CACHE_DEFAULT_TTL=300     # 5 minutes
   CACHE_CHECK_PERIOD=120    # 2 minutes
   ```

3. **Clustering**:
   ```bash
   # Optimize worker count for available CPU/memory
   CLUSTER_WORKERS=4         # Or 0 for auto-detection
   ```

### Production Tuning

```bash
# Production optimization environment variables
NODE_ENV=production
ENABLE_CLUSTER=true
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6

# Memory and performance
MAX_BODY_SIZE=1mb
REQUEST_TIMEOUT=30000
GRACEFUL_SHUTDOWN_TIMEOUT=30000

# Logging (reduced for performance)
LOG_LEVEL=warn
ACCESS_LOG_ENABLED=false   # Disable in high-traffic scenarios
```

This deployment guide ensures your Advanced CDN application runs efficiently in production with proper memory management, monitoring, and operational best practices.