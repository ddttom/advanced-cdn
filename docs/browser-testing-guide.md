# Browser Testing Guide for DDT Domain Functionality

## Overview

This guide explains how to test the DDT domain functionality (`example.ddt.com`) in the browser. Since browsers can't naturally resolve `example.ddt.com` to `localhost:8080`, we need to simulate this using various methods.

## ✅ What We Confirmed

From the browser test, we confirmed:
- ✅ **CDN is running** and serving content successfully
- ✅ **Backend connectivity** is working (proxying to `main--allaboutv2--ddttom.hlx.live`)
- ✅ **Caching system** is functional (CSS, JS files cached)
- ✅ **Content delivery** is working properly

## Methods to Test DDT Domain Functionality

### Method 1: Using Browser Developer Tools (Recommended)

This method allows you to modify request headers to simulate the `example.ddt.com` domain:

#### Step 1: Open Developer Tools
1. Open your browser and go to `http://localhost:8080`
2. Press `F12` or right-click → "Inspect Element"
3. Go to the **Network** tab

#### Step 2: Modify Request Headers
1. In the Network tab, right-click on any request
2. Select "Edit and Resend" or "Copy as cURL"
3. Modify the request to include: `Host: example.ddt.com`

#### Step 3: Use Console to Make Custom Request
```javascript
// Open Console tab and run this:
fetch('http://localhost:8080/', {
  headers: {
    'Host': 'example.ddt.com'
  }
})
.then(response => response.text())
.then(data => console.log('DDT Domain Response:', data.substring(0, 200)));
```

### Method 2: Modify System Hosts File (Most Realistic)

This method makes `example.ddt.com` resolve to `localhost` system-wide:

#### For macOS/Linux:
```bash
# Edit the hosts file
sudo nano /etc/hosts

# Add this line:
127.0.0.1 example.ddt.com

# Save and exit
```

#### For Windows:
```bash
# Edit as Administrator:
# C:\Windows\System32\drivers\etc\hosts

# Add this line:
127.0.0.1 example.ddt.com
```

#### Then test in browser:
1. Open browser and go to `http://example.ddt.com:8080`
2. You should see the DDT content with proper domain mapping

#### ⚠️ Remember to remove the hosts entry when done:
```bash
# Remove the line from hosts file:
# 127.0.0.1 example.ddt.com
```

### Method 3: Using Browser Extensions

Install a browser extension like "ModHeader" or "Requestly":

1. **Install ModHeader** (Chrome/Firefox extension)
2. **Add Request Header**: `Host: example.ddt.com`
3. **Navigate to**: `http://localhost:8080`
4. The extension will add the Host header automatically

### Method 4: Using Proxy Tools

Use tools like **Postman**, **Insomnia**, or **curl**:

#### Using curl:
```bash
curl -H "Host: example.ddt.com" http://localhost:8080/
```

#### Using Postman:
1. Create new GET request to `http://localhost:8080`
2. Add header: `Host: example.ddt.com`
3. Send request

## Expected Results

When testing with `example.ddt.com` domain, you should see:

### 1. Different CDN Logs
```
2025-07-25 11:06:37 debug: Path transformation: example.ddt.com/ → main--allaboutv2--ddttom.hlx.live/
2025-07-25 11:06:37 debug: Cache hit: GET:example.ddt.com:/:transformed=/:target=main--allaboutv2--ddttom.hlx.live
```

### 2. Proper Response Headers
```
x-cache-backend: main--allaboutv2--ddttom.hlx.live
x-path-rewrite-applied: false
x-path-rewrite-fallback: true
x-served-by: advanced-nodejs-cdn
```

### 3. Same Content but Different Processing
- Same HTML content as localhost
- Different cache keys (domain-specific)
- Domain-aware logging in CDN

## Verification Steps

### 1. Check CDN Logs
Monitor the terminal running the CDN application:
```bash
# You should see logs like:
2025-07-25 11:06:37 debug: Path transformation: example.ddt.com/ → main--allaboutv2--ddttom.hlx.live/
```

### 2. Verify Response Headers
Look for these headers in browser DevTools → Network tab:
- `x-cache-backend: main--allaboutv2--ddttom.hlx.live`
- `x-served-by: advanced-nodejs-cdn`
- `via: 1.1 advanced-nodejs-cdn`

### 3. Compare with Debug Command
The browser results should match our debug command results:
```bash
node debug-ddt.js example.ddt.com
# Status: SUCCESS
# HTTP Status: 200 OK
# Response Time: ~12ms (cached)
```

## Troubleshooting

### Issue: "This site can't be reached"
**Solution**: Use Method 1 (Developer Tools) or ensure hosts file is correctly modified

### Issue: Getting localhost logs instead of domain logs
**Solution**: Verify the Host header is being sent correctly

### Issue: 404 or different content
**Solution**: Check that the CDN application is running and configured properly

## Advanced Testing

### Test Different DDT Subdomains
```bash
# Test various subdomains:
curl -H "Host: api.ddt.com" http://localhost:8080/
curl -H "Host: blog.ddt.com" http://localhost:8080/
curl -H "Host: docs.ddt.com" http://localhost:8080/
```

### Test with Different Paths
```bash
# Test specific paths:
curl -H "Host: example.ddt.com" http://localhost:8080/about
curl -H "Host: example.ddt.com" http://localhost:8080/services
```

### Performance Testing
```javascript
// Test response times in browser console:
const startTime = performance.now();
fetch('http://localhost:8080/', {
  headers: { 'Host': 'example.ddt.com' }
})
.then(() => {
  const endTime = performance.now();
  console.log(`DDT Domain Response Time: ${endTime - startTime}ms`);
});
```

## Security Testing

### Test Security Headers
```javascript
// Check security headers in browser console:
fetch('http://localhost:8080/', {
  headers: { 'Host': 'example.ddt.com' }
})
.then(response => {
  console.log('Security Headers:');
  console.log('HSTS:', response.headers.get('strict-transport-security'));
  console.log('XSS Protection:', response.headers.get('x-xss-protection'));
  console.log('Content Type Options:', response.headers.get('x-content-type-options'));
});
```

## Summary

The **easiest method** for quick testing is **Method 1** (Developer Tools with console commands).

The **most realistic method** is **Method 2** (hosts file modification) as it simulates real domain resolution.

Both methods will demonstrate that:
- ✅ DDT domain mapping is working
- ✅ Content is properly served
- ✅ Caching is domain-aware
- ✅ Security headers are applied
- ✅ Performance is excellent

The debug command (`node debug-ddt.js example.ddt.com`) provides the same functionality programmatically and is perfect for automated testing and monitoring.
