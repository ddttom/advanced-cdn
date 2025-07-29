# Domain-to-Path Prefix Mapping Examples

This document provides comprehensive examples of domain-to-path prefix mapping scenarios and configuration patterns for various use cases. Each example includes complete configuration, expected behavior, and testing instructions.

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [E-commerce Scenarios](#e-commerce-scenarios)
3. [API Gateway Patterns](#api-gateway-patterns)
4. [Content Delivery Networks](#content-delivery-networks)
5. [Multi-Tenant Applications](#multi-tenant-applications)
6. [Development and Staging](#development-and-staging)
7. [Geographic Routing](#geographic-routing)
8. [Complex Regex Patterns](#complex-regex-patterns)
9. [Performance Optimization Examples](#performance-optimization-examples)
10. [Migration Scenarios](#migration-scenarios)

## Basic Examples

### Example 1: Personal Website with Custom Domain

**Scenario**: Route personal domain `ddt.com` to `/ddt` prefix on main backend.

**Configuration**:

```bash
# .env file
ORIGIN_DOMAIN=allabout.network
TARGET_DOMAIN=main--allaboutv2--ddttom.hlx.live
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={"ddt.com": "/ddt"}
ADDITIONAL_DOMAINS=ddt.com
STRICT_DOMAIN_CHECK=true

# Performance settings
PATH_REWRITE_CACHE_ENABLED=true
PATH_REWRITE_CACHE_SIZE=10000
```

**Expected Behavior**:

- `ddt.com/about` → `main--allaboutv2--ddttom.hlx.live/ddt/about`
- `ddt.com/projects/web` → `main--allaboutv2--ddttom.hlx.live/ddt/projects/web`
- `allabout.network/home` → `main--allaboutv2--ddttom.hlx.live/home` (no prefix)

**Testing**:

```bash
# Test actual request with domain mapping
curl -H "Host: ddt.com" http://localhost:3000/about

# Check domain configuration
curl http://localhost:3000/api/domains
```

### Example 2: Blog Subdomain

**Scenario**: Route blog subdomain to dedicated blog section.

**Configuration**:

```bash
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={"blog.mywebsite.com": "/blog"}
ADDITIONAL_DOMAINS=blog.mywebsite.com

# Blog-specific caching
CACHE_DEFAULT_TTL=1800
CACHE_MAX_TTL=7200
```

**Expected Behavior**:

- `blog.mywebsite.com/latest-post` → `backend.mywebsite.com/blog/latest-post`
- `blog.mywebsite.com/category/tech` → `backend.mywebsite.com/blog/category/tech`

**Testing**:

```bash
curl -H "Host: blog.mywebsite.com" http://localhost:3000/latest-post
```

## E-commerce Scenarios

### Example 3: Multi-Brand Store

**Scenario**: Multiple brand domains routing to different store sections.

**Configuration**:

```bash
ORIGIN_DOMAIN=mainstore.com
TARGET_DOMAIN=backend.ecommerce.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={
  "brand-electronics.com": "/stores/electronics",
  "brand-clothing.com": "/stores/clothing",
  "brand-home.com": "/stores/home",
  "wholesale.mainstore.com": "/wholesale"
}

ADDITIONAL_DOMAINS=brand-electronics.com,brand-clothing.com,brand-home.com,wholesale.mainstore.com

# E-commerce optimizations
CACHE_DEFAULT_TTL=300
PATH_REWRITE_CACHE_SIZE=50000
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
```

**Expected Behavior**:

- `brand-electronics.com/products/laptops` → `backend.ecommerce.com/stores/electronics/products/laptops`
- `brand-clothing.com/categories/mens` → `backend.ecommerce.com/stores/clothing/categories/mens`
- `wholesale.mainstore.com/bulk-orders` → `backend.ecommerce.com/wholesale/bulk-orders`

**Testing**:

```bash
# Test each brand
for brand in brand-electronics.com brand-clothing.com brand-home.com; do
  curl -H "Host: $brand" http://localhost:3000/products
done
```

### Example 4: Marketplace with Vendor Stores

**Scenario**: Individual vendor domains routing to vendor-specific sections.

**Configuration**:

```bash
ORIGIN_DOMAIN=marketplace.com
TARGET_DOMAIN=backend.marketplace.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true
DOMAIN_PATH_MAPPING={
  "vendor1.marketplace.com": "/vendors/vendor1",
  "vendor2.marketplace.com": "/vendors/vendor2",
  "vendor3.marketplace.com": "/vendors/vendor3"
}

# Vendor-specific backends for isolation
DOMAIN_TARGETS={
  "vendor1.marketplace.com": "vendor1-backend.marketplace.com",
  "vendor2.marketplace.com": "vendor2-backend.marketplace.com"
}

ADDITIONAL_DOMAINS=vendor1.marketplace.com,vendor2.marketplace.com,vendor3.marketplace.com
```

**Expected Behavior**:

- `vendor1.marketplace.com/products` → `vendor1-backend.marketplace.com/vendors/vendor1/products`
- `vendor2.marketplace.com/orders` → `vendor2-backend.marketplace.com/vendors/vendor2/orders`
- `vendor3.marketplace.com/inventory` → `backend.marketplace.com/vendors/vendor3/inventory`

## API Gateway Patterns

### Example 5: Versioned API Gateway

**Scenario**: API versioning with subdomain and path-based routing.

**Configuration**:

```bash
ORIGIN_DOMAIN=api.myservice.com
TARGET_DOMAIN=backend.myservice.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

# Simple subdomain versioning
DOMAIN_PATH_MAPPING={
  "api-v1.myservice.com": "/api/v1",
  "api-v2.myservice.com": "/api/v2",
  "api-v3.myservice.com": "/api/v3"
}

# Complex path-based versioning for main domain
PATH_REWRITE_RULES={
  "api.myservice.com": {
    "^/v1/(.*)": "/api/v1/$1",
    "^/v2/(.*)": "/api/v2/$1",
    "^/v3/(.*)": "/api/v3/$1",
    "^/latest/(.*)": "/api/v3/$1",
    "^/(.*)": "/api/v3/$1"
  }
}

ADDITIONAL_DOMAINS=api-v1.myservice.com,api-v2.myservice.com,api-v3.myservice.com

# API-specific settings
PATH_REWRITE_ERROR_RATE_THRESHOLD=0.05
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=1000
```

**Expected Behavior**:

- `api-v1.myservice.com/users` → `backend.myservice.com/api/v1/users`
- `api.myservice.com/v2/users` → `backend.myservice.com/api/v2/users`
- `api.myservice.com/users` → `backend.myservice.com/api/v3/users`
- `api.myservice.com/latest/users` → `backend.myservice.com/api/v3/users`

**Testing**:

```bash
# Test version routing
curl -H "Host: api-v1.myservice.com" http://localhost:3000/users
curl -H "Host: api.myservice.com" http://localhost:3000/v2/users
curl -H "Host: api.myservice.com" http://localhost:3000/users
```

### Example 6: Microservices API Gateway

**Scenario**: Route different service domains to microservice backends.

**Configuration**:

```bash
ORIGIN_DOMAIN=gateway.mycompany.com
TARGET_DOMAIN=default-backend.mycompany.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "users-api.mycompany.com": "/services/users",
  "orders-api.mycompany.com": "/services/orders",
  "inventory-api.mycompany.com": "/services/inventory",
  "payments-api.mycompany.com": "/services/payments"
}

# Service-specific backends
DOMAIN_TARGETS={
  "users-api.mycompany.com": "users-service.mycompany.com",
  "orders-api.mycompany.com": "orders-service.mycompany.com",
  "inventory-api.mycompany.com": "inventory-service.mycompany.com",
  "payments-api.mycompany.com": "payments-service.mycompany.com"
}

ADDITIONAL_DOMAINS=users-api.mycompany.com,orders-api.mycompany.com,inventory-api.mycompany.com,payments-api.mycompany.com

# Microservices optimizations
PATH_REWRITE_CACHE_SIZE=100000
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
PATH_REWRITE_ERROR_RATE_THRESHOLD=0.1
```

**Expected Behavior**:

- `users-api.mycompany.com/profile` → `users-service.mycompany.com/services/users/profile`
- `orders-api.mycompany.com/recent` → `orders-service.mycompany.com/services/orders/recent`
- `payments-api.mycompany.com/process` → `payments-service.mycompany.com/services/payments/process`

## Content Delivery Networks

### Example 7: Asset-Specific CDN Routing

**Scenario**: Route different asset types to optimized backends.

**Configuration**:

```bash
ORIGIN_DOMAIN=mywebsite.com
TARGET_DOMAIN=backend.mywebsite.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "static.mywebsite.com": "/static",
  "images.mywebsite.com": "/media/images",
  "videos.mywebsite.com": "/media/videos",
  "downloads.mywebsite.com": "/files/downloads"
}

# Asset-optimized backends
DOMAIN_TARGETS={
  "static.mywebsite.com": "static-cdn.mywebsite.com",
  "images.mywebsite.com": "images-cdn.mywebsite.com",
  "videos.mywebsite.com": "videos-cdn.mywebsite.com"
}

ADDITIONAL_DOMAINS=static.mywebsite.com,images.mywebsite.com,videos.mywebsite.com,downloads.mywebsite.com

# CDN-optimized caching
CACHE_DEFAULT_TTL=3600
CACHE_MAX_TTL=86400
CACHE_MAX_ITEMS=100000
PATH_REWRITE_CACHE_SIZE=200000
```

**Expected Behavior**:

- `static.mywebsite.com/css/styles.css` → `static-cdn.mywebsite.com/static/css/styles.css`
- `images.mywebsite.com/logo.png` → `images-cdn.mywebsite.com/media/images/logo.png`
- `videos.mywebsite.com/intro.mp4` → `videos-cdn.mywebsite.com/media/videos/intro.mp4`
- `downloads.mywebsite.com/software.zip` → `backend.mywebsite.com/files/downloads/software.zip`

**Testing**:

```bash
# Test asset routing
curl -H "Host: static.mywebsite.com" http://localhost:3000/css/main.css
curl -H "Host: images.mywebsite.com" http://localhost:3000/banner.jpg
```

### Example 8: Geographic CDN Distribution

**Scenario**: Route traffic based on geographic regions.

**Configuration**:

```bash
ORIGIN_DOMAIN=global.mywebsite.com
TARGET_DOMAIN=global-backend.mywebsite.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "us.mywebsite.com": "/regions/us",
  "eu.mywebsite.com": "/regions/eu",
  "asia.mywebsite.com": "/regions/asia",
  "au.mywebsite.com": "/regions/au"
}

# Region-specific backends
DOMAIN_TARGETS={
  "us.mywebsite.com": "us-backend.mywebsite.com",
  "eu.mywebsite.com": "eu-backend.mywebsite.com",
  "asia.mywebsite.com": "asia-backend.mywebsite.com",
  "au.mywebsite.com": "au-backend.mywebsite.com"
}

ADDITIONAL_DOMAINS=us.mywebsite.com,eu.mywebsite.com,asia.mywebsite.com,au.mywebsite.com
```

**Expected Behavior**:

- `us.mywebsite.com/content` → `us-backend.mywebsite.com/regions/us/content`
- `eu.mywebsite.com/content` → `eu-backend.mywebsite.com/regions/eu/content`
- `asia.mywebsite.com/content` → `asia-backend.mywebsite.com/regions/asia/content`

## Multi-Tenant Applications

### Example 9: SaaS Platform with Tenant Isolation

**Scenario**: Route tenant domains to isolated backend sections.

**Configuration**:

```bash
ORIGIN_DOMAIN=app.saasplatform.com
TARGET_DOMAIN=backend.saasplatform.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "tenant1.saasplatform.com": "/tenants/tenant1",
  "tenant2.saasplatform.com": "/tenants/tenant2",
  "tenant3.saasplatform.com": "/tenants/tenant3",
  "admin.saasplatform.com": "/admin"
}

# Tenant-specific backends for isolation
DOMAIN_TARGETS={
  "tenant1.saasplatform.com": "tenant1-backend.saasplatform.com",
  "tenant2.saasplatform.com": "tenant2-backend.saasplatform.com",
  "admin.saasplatform.com": "admin-backend.saasplatform.com"
}

ADDITIONAL_DOMAINS=tenant1.saasplatform.com,tenant2.saasplatform.com,tenant3.saasplatform.com,admin.saasplatform.com

# SaaS-specific settings
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=500
```

**Expected Behavior**:

- `tenant1.saasplatform.com/dashboard` → `tenant1-backend.saasplatform.com/tenants/tenant1/dashboard`
- `tenant2.saasplatform.com/settings` → `tenant2-backend.saasplatform.com/tenants/tenant2/settings`
- `admin.saasplatform.com/users` → `admin-backend.saasplatform.com/admin/users`

### Example 10: White-Label Platform

**Scenario**: Custom branded domains for white-label customers.

**Configuration**:

```bash
ORIGIN_DOMAIN=platform.mycompany.com
TARGET_DOMAIN=backend.mycompany.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "customer1.com": "/whitelabel/customer1",
  "customer2.net": "/whitelabel/customer2",
  "customer3.org": "/whitelabel/customer3"
}

# Customer-specific branding and backends
DOMAIN_TARGETS={
  "customer1.com": "customer1-backend.mycompany.com",
  "customer2.net": "customer2-backend.mycompany.com"
}

ADDITIONAL_DOMAINS=customer1.com,customer2.net,customer3.org

# White-label optimizations
CACHE_DEFAULT_TTL=1800
PATH_REWRITE_CACHE_SIZE=75000
```

**Expected Behavior**:

- `customer1.com/app` → `customer1-backend.mycompany.com/whitelabel/customer1/app`
- `customer2.net/dashboard` → `customer2-backend.mycompany.com/whitelabel/customer2/dashboard`
- `customer3.org/reports` → `backend.mycompany.com/whitelabel/customer3/reports`

## Development and Staging

### Example 11: Environment-Based Routing

**Scenario**: Route development and staging domains to appropriate environments.

**Configuration**:

```bash
ORIGIN_DOMAIN=myapp.com
TARGET_DOMAIN=prod-backend.myapp.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "dev.myapp.com": "/environments/dev",
  "staging.myapp.com": "/environments/staging",
  "qa.myapp.com": "/environments/qa"
}

# Environment-specific backends
DOMAIN_TARGETS={
  "dev.myapp.com": "dev-backend.myapp.com",
  "staging.myapp.com": "staging-backend.myapp.com",
  "qa.myapp.com": "qa-backend.myapp.com"
}

ADDITIONAL_DOMAINS=dev.myapp.com,staging.myapp.com,qa.myapp.com

# Development settings
LOG_LEVEL=debug
PATH_REWRITE_LOG_ENABLED=true
CACHE_DEFAULT_TTL=60
```

**Expected Behavior**:

- `dev.myapp.com/api/test` → `dev-backend.myapp.com/environments/dev/api/test`
- `staging.myapp.com/features` → `staging-backend.myapp.com/environments/staging/features`
- `qa.myapp.com/tests` → `qa-backend.myapp.com/environments/qa/tests`

### Example 12: Feature Branch Routing

**Scenario**: Route feature branch domains to specific deployments.

**Configuration**:

```bash
ORIGIN_DOMAIN=app.mycompany.com
TARGET_DOMAIN=main-backend.mycompany.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "feature-auth.mycompany.com": "/branches/feature-auth",
  "feature-ui.mycompany.com": "/branches/feature-ui",
  "feature-api.mycompany.com": "/branches/feature-api"
}

# Feature-specific backends
DOMAIN_TARGETS={
  "feature-auth.mycompany.com": "feature-auth-backend.mycompany.com",
  "feature-ui.mycompany.com": "feature-ui-backend.mycompany.com",
  "feature-api.mycompany.com": "feature-api-backend.mycompany.com"
}

ADDITIONAL_DOMAINS=feature-auth.mycompany.com,feature-ui.mycompany.com,feature-api.mycompany.com

# Feature branch settings
CACHE_DEFAULT_TTL=30
STRICT_DOMAIN_CHECK=false
```

**Expected Behavior**:

- `feature-auth.mycompany.com/login` → `feature-auth-backend.mycompany.com/branches/feature-auth/login`
- `feature-ui.mycompany.com/dashboard` → `feature-ui-backend.mycompany.com/branches/feature-ui/dashboard`

## Complex Regex Patterns

### Example 13: Advanced API Routing with Parameters

**Scenario**: Complex API routing with parameter extraction and transformation.

**Configuration**:

```bash
ORIGIN_DOMAIN=api.advanced.com
TARGET_DOMAIN=backend.advanced.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

# Complex regex transformations
PATH_REWRITE_RULES={
  "api.advanced.com": {
    "^/v([1-9])/users/([0-9]+)/profile$": "/api/v$1/user-profiles/$2",
    "^/v([1-9])/products/([a-zA-Z0-9-]+)/reviews/([0-9]+)$": "/api/v$1/product-reviews/$2/$3",
    "^/legacy/([a-zA-Z0-9-_/]+)$": "/api/v1/legacy/$1",
    "^/mobile/(.*)$": "/api/mobile/$1",
    "^/(.*)$": "/api/v2/$1"
  }
}

# Performance settings for complex regex
PATH_REWRITE_CACHE_SIZE=50000
PATH_REWRITE_SLOW_THRESHOLD=0.005
```

**Expected Behavior**:

- `api.advanced.com/v1/users/123/profile` → `backend.advanced.com/api/v1/user-profiles/123`
- `api.advanced.com/v2/products/laptop-x1/reviews/456` → `backend.advanced.com/api/v2/product-reviews/laptop-x1/456`
- `api.advanced.com/legacy/old-endpoint` → `backend.advanced.com/api/v1/legacy/old-endpoint`
- `api.advanced.com/mobile/app-data` → `backend.advanced.com/api/mobile/app-data`
- `api.advanced.com/new-endpoint` → `backend.advanced.com/api/v2/new-endpoint`

### Example 14: Content Management System Routing

**Scenario**: CMS with complex content routing patterns.

**Configuration**:

```bash
ORIGIN_DOMAIN=cms.mysite.com
TARGET_DOMAIN=backend.mysite.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

PATH_REWRITE_RULES={
  "cms.mysite.com": {
    "^/content/([a-z]+)/([0-9]{4})/([0-9]{2})/([a-zA-Z0-9-]+)$": "/cms/content/$1/$2/$3/$4",
    "^/media/([a-z]+)/([a-zA-Z0-9-_]+)\\.([a-z]{3,4})$": "/cms/media/$1/$2.$3",
    "^/admin/([a-z]+)/([a-zA-Z0-9-_]+)$": "/cms/admin/$1/$2",
    "^/api/([a-z]+)/?(.*)$": "/cms/api/$1/$2",
    "^/(.*)$": "/cms/public/$1"
  }
}

# CMS-specific settings
CACHE_DEFAULT_TTL=900
PATH_REWRITE_CACHE_SIZE=25000
```

**Expected Behavior**:

- `cms.mysite.com/content/blog/2024/01/my-post` → `backend.mysite.com/cms/content/blog/2024/01/my-post`
- `cms.mysite.com/media/images/hero-banner.jpg` → `backend.mysite.com/cms/media/images/hero-banner.jpg`
- `cms.mysite.com/admin/posts/edit-123` → `backend.mysite.com/cms/admin/posts/edit-123`
- `cms.mysite.com/api/posts/recent` → `backend.mysite.com/cms/api/posts/recent`

## Performance Optimization Examples

### Example 15: High-Traffic E-commerce Site

**Scenario**: Optimize for high-traffic e-commerce with multiple domains.

**Configuration**:

```bash
ORIGIN_DOMAIN=shop.bigstore.com
TARGET_DOMAIN=backend.bigstore.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "www.bigstore.com": "/storefront",
  "mobile.bigstore.com": "/mobile",
  "api.bigstore.com": "/api",
  "cdn.bigstore.com": "/static",
  "checkout.bigstore.com": "/checkout"
}

# High-performance backends
DOMAIN_TARGETS={
  "api.bigstore.com": "api-cluster.bigstore.com",
  "cdn.bigstore.com": "cdn-cluster.bigstore.com",
  "checkout.bigstore.com": "secure-backend.bigstore.com"
}

ADDITIONAL_DOMAINS=www.bigstore.com,mobile.bigstore.com,api.bigstore.com,cdn.bigstore.com,checkout.bigstore.com

# Performance optimizations
ENABLE_CLUSTER=true
CLUSTER_WORKERS=0
CACHE_DEFAULT_TTL=1800
CACHE_MAX_ITEMS=500000
PATH_REWRITE_CACHE_SIZE=1000000
PATH_REWRITE_CIRCUIT_BREAKER_ENABLED=true
PATH_REWRITE_ERROR_RATE_THRESHOLD=0.02

# Rate limiting for API
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=2000
RATE_LIMIT_WINDOW_MS=60000
```

**Performance Testing**:

```bash
# Run high-load benchmark
node benchmark.js

# Monitor performance
curl http://localhost:3000/metrics | grep -E "(path_rewrite|cache|http_requests)"

# Check circuit breaker status
curl http://localhost:3000/health | jq '.pathRewriting'
```

### Example 16: Global CDN with Edge Optimization

**Scenario**: Global CDN with edge-optimized routing.

**Configuration**:

```bash
ORIGIN_DOMAIN=global.fastcdn.com
TARGET_DOMAIN=origin.fastcdn.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "edge-us-east.fastcdn.com": "/edges/us-east",
  "edge-us-west.fastcdn.com": "/edges/us-west",
  "edge-eu.fastcdn.com": "/edges/eu",
  "edge-asia.fastcdn.com": "/edges/asia"
}

# Edge-optimized backends
DOMAIN_TARGETS={
  "edge-us-east.fastcdn.com": "us-east-origin.fastcdn.com",
  "edge-us-west.fastcdn.com": "us-west-origin.fastcdn.com",
  "edge-eu.fastcdn.com": "eu-origin.fastcdn.com",
  "edge-asia.fastcdn.com": "asia-origin.fastcdn.com"
}

ADDITIONAL_DOMAINS=edge-us-east.fastcdn.com,edge-us-west.fastcdn.com,edge-eu.fastcdn.com,edge-asia.fastcdn.com

# CDN optimizations
CACHE_DEFAULT_TTL=7200
CACHE_MAX_TTL=86400
CACHE_MAX_ITEMS=1000000
PATH_REWRITE_CACHE_SIZE=2000000
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6
```

## Migration Scenarios

### Example 17: Legacy System Migration

**Scenario**: Gradual migration from legacy system to new architecture.

**Configuration**:

```bash
ORIGIN_DOMAIN=myapp.com
TARGET_DOMAIN=new-backend.myapp.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

# Migration routing
PATH_REWRITE_RULES={
  "myapp.com": {
    "^/api/v2/(.*)$": "/new-api/$1",
    "^/new-features/(.*)$": "/features/$1",
    "^/legacy/(.*)$": "/legacy-api/$1",
    "^/(.*)$": "/legacy-api/$1"
  }
}

# Gradual backend migration
DOMAIN_TARGETS={
  "api-v2.myapp.com": "new-backend.myapp.com"
}

# Migration-specific settings
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_FALLBACK_PREFIX=/legacy-api
CACHE_DEFAULT_TTL=300
```

**Expected Behavior**:

- `myapp.com/api/v2/users` → `new-backend.myapp.com/new-api/users`
- `myapp.com/new-features/dashboard` → `new-backend.myapp.com/features/dashboard`
- `myapp.com/old-endpoint` → `new-backend.myapp.com/legacy-api/old-endpoint`

### Example 18: Domain Consolidation

**Scenario**: Consolidate multiple legacy domains into a single backend.

**Configuration**:

```bash
ORIGIN_DOMAIN=newsite.com
TARGET_DOMAIN=unified-backend.com
TARGET_HTTPS=true

PATH_REWRITE_ENABLED=true

DOMAIN_PATH_MAPPING={
  "oldsite1.com": "/legacy/site1",
  "oldsite2.com": "/legacy/site2",
  "oldsite3.com": "/legacy/site3",
  "blog.oldsite1.com": "/legacy/site1/blog",
  "shop.oldsite2.com": "/legacy/site2/shop"
}

ADDITIONAL_DOMAINS=oldsite1.com,oldsite2.com,oldsite3.com,blog.oldsite1.com,shop.oldsite2.com

# Consolidation settings
PATH_REWRITE_FALLBACK_ENABLED=true
PATH_REWRITE_FALLBACK_PREFIX=/legacy/unknown
CACHE_DEFAULT_TTL=600
```

**Expected Behavior**:

- `oldsite1.com/about` → `unified-backend.com/legacy/site1/about`
- `blog.oldsite1.com/posts` → `unified-backend.com/legacy/site1/blog/posts`
- `shop.oldsite2.com/products` → `unified-backend.com/legacy/site2/shop/products`

## Testing and Validation

### Comprehensive Testing Script

```bash
#!/bin/bash
# test-domain-mapping.sh

echo "Testing Domain-to-Path Prefix Mapping"
echo "====================================="

# Test configuration validation
echo "1. Validating configuration..."
echo $DOMAIN_PATH_MAPPING | jq . > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ DOMAIN_PATH_MAPPING is valid JSON"
else
    echo "❌ DOMAIN_PATH_MAPPING is invalid JSON"
    exit 1
fi

# Test service health
echo "2. Checking service health..."
HEALTH=$(curl -s http://localhost:3000/health | jq -r '.status')
if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Service is healthy"
else
    echo "❌ Service is not healthy"
    exit 1
fi

# Test domain configuration
echo "3. Testing domain configuration..."
DOMAINS=$(curl -s http://localhost:3000/api/domains | jq -r '.domains | keys[]')
for domain in $DOMAINS; do
    echo "Testing domain: $domain"
    curl -s -X POST http://localhost:3000/api/domains/test-transformation \
        -H "Content-Type: application/json" \
        -d "{\"domain\": \"$domain\", \"path\": \"/test\"}" | jq .
done

# Test performance
echo "4. Running performance test..."
node -e "
const { PerformanceBenchmark } = require('./benchmark');
const benchmark = new PerformanceBenchmark();
benchmark.
