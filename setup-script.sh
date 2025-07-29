#!/bin/bash
# Advanced CDN Setup Script
# This script sets up your existing high-performance CDN application

set -e # Exit on any error

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Banner
echo -e "${BOLD}${BLUE}"
echo "============================================="
echo "   Advanced CDN Setup Script"
echo "============================================="
echo -e "${NC}"

# Check for required tools and files
echo -e "${BOLD}Checking requirements...${NC}"
  
# Check for Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js 16 or newer.${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ $NODE_MAJOR -lt 16 ]; then
  echo -e "${RED}Node.js version 16 or newer is required. You have ${NODE_VERSION}.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js ${NODE_VERSION} is installed${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}npm is not installed. Please install npm.${NC}"
  exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION} is installed${NC}"

# Verify required files exist
echo -e "\n${BOLD}Verifying required files...${NC}"
REQUIRED_FILES=("app.js" "cache-manager.js" "cluster-manager.js" "config.js" "domain-manager.js" 
               "path-rewriter.js" "env-example.txt" "health-manager.js" "index.js" "logger.js" 
               "metrics-manager.js" "proxy-manager.js" "rate-limiter.js" "production-package-json.json")

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}Missing required file: $file${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Found $file${NC}"
done

# Create required directories
echo -e "\n${BOLD}Creating required directories...${NC}"
mkdir -p logs ssl
echo -e "${GREEN}✓ Created logs directory${NC}"
echo -e "${GREEN}✓ Created ssl directory${NC}"

# Create .env file from example
echo -e "\n${BOLD}Creating .env file...${NC}"
if [ ! -f ".env" ]; then
  cp env-example.txt .env
  echo -e "${GREEN}✓ Created .env file from env-example.txt${NC}"
else
  echo -e "${YELLOW}⚠ .env file already exists. Keeping existing file.${NC}"
fi

# Setup proper package.json
echo -e "\n${BOLD}Setting up package.json...${NC}"
if [ ! -f "package.json" ]; then
  cp production-package-json.json package.json
  echo -e "${GREEN}✓ Created package.json from production-package-json.json${NC}"
else
  echo -e "${YELLOW}⚠ package.json already exists. Keeping existing file.${NC}"
fi

# Install dependencies
echo -e "\n${BOLD}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed successfully${NC}"

# Generate self-signed SSL certificates for development
echo -e "\n${BOLD}Generating self-signed SSL certificates for development...${NC}"
if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
  echo -e "${YELLOW}Generating self-signed certificates (for development only)${NC}"
  
  # Check if openssl is available
  if command -v openssl &> /dev/null; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -subj "/CN=localhost" -batch
    echo -e "${GREEN}✓ Self-signed certificates generated${NC}"
  else
    echo -e "${YELLOW}⚠ openssl not found. Skipping certificate generation.${NC}"
    echo -e "${YELLOW}⚠ You will need to provide your own SSL certificates or disable SSL in .env${NC}"
  fi
else
  echo -e "${YELLOW}⚠ SSL certificates already exist. Keeping existing files.${NC}"
fi

# Update SSL settings in .env if certificates were generated
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
  sed -i.bak 's/ENABLE_SSL=false/ENABLE_SSL=true/' .env
  sed -i.bak 's|SSL_CERT_PATH=./ssl/cert.pem|SSL_CERT_PATH=./ssl/cert.pem|' .env
  sed -i.bak 's|SSL_KEY_PATH=./ssl/key.pem|SSL_KEY_PATH=./ssl/key.pem|' .env
  rm -f .env.bak
  echo -e "${GREEN}✓ Updated SSL settings in .env${NC}"
fi

# Make scripts executable
chmod +x index.js app.js cluster-manager.js git-setup.sh
echo -e "${GREEN}✓ Made scripts executable${NC}"

# Configure Git repository
echo -e "\n${BOLD}Configuring Git repository...${NC}"
if [ -f "git-setup.sh" ]; then
  ./git-setup.sh
  echo -e "${GREEN}✓ Git repository configured${NC}"
else
  echo -e "${YELLOW}⚠ git-setup.sh not found. Skipping Git configuration.${NC}"
fi

# Configure domain-to-path prefix mapping
echo -e "\n${BOLD}Configuring domain-to-path prefix mapping...${NC}"

# Check if path rewriting is already enabled
if grep -q "PATH_REWRITE_ENABLED=true" .env; then
  echo -e "${GREEN}✓ Path rewriting already enabled${NC}"
else
  echo "PATH_REWRITE_ENABLED=true" >> .env
  echo -e "${GREEN}✓ Enabled path rewriting${NC}"
fi

# Add example domain mapping if not present
if ! grep -q "DOMAIN_PATH_MAPPING" .env; then
  echo 'DOMAIN_PATH_MAPPING={"ddt.com": "/ddt"}' >> .env
  echo -e "${GREEN}✓ Added example domain mapping (ddt.com → /ddt)${NC}"
else
  echo -e "${YELLOW}⚠ Domain path mapping already configured${NC}"
fi

# Add additional domains if not present
if ! grep -q "ADDITIONAL_DOMAINS.*ddt.com" .env; then
  if grep -q "ADDITIONAL_DOMAINS=" .env; then
    sed -i.bak 's/ADDITIONAL_DOMAINS=/ADDITIONAL_DOMAINS=ddt.com/' .env
  else
    echo "ADDITIONAL_DOMAINS=ddt.com" >> .env
  fi
  echo -e "${GREEN}✓ Added ddt.com to additional domains${NC}"
  rm -f .env.bak
else
  echo -e "${YELLOW}⚠ ddt.com already in additional domains${NC}"
fi

# Validate configuration
echo -e "\n${BOLD}Validating configuration...${NC}"

# Check if jq is available for JSON validation
if command -v jq &> /dev/null; then
  DOMAIN_MAPPING=$(grep DOMAIN_PATH_MAPPING .env | cut -d '=' -f 2-)
  if echo "$DOMAIN_MAPPING" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Domain path mapping JSON is valid${NC}"
  else
    echo -e "${RED}✗ Domain path mapping JSON is invalid${NC}"
    echo -e "${YELLOW}⚠ Please check your DOMAIN_PATH_MAPPING configuration${NC}"
  fi
else
  echo -e "${YELLOW}⚠ jq not found. Skipping JSON validation.${NC}"
fi

# Test path rewriter module
if node -e "require('./path-rewriter.js')" 2>/dev/null; then
  echo -e "${GREEN}✓ Path rewriter module loads successfully${NC}"
else
  echo -e "${RED}✗ Path rewriter module failed to load${NC}"
fi

# Setup complete
echo -e "\n${BOLD}${GREEN}Setup complete!${NC}"
echo -e "${BOLD}You can now run the CDN with:${NC}"
echo -e "  npm start"
echo -e "\n${BOLD}Or for development mode:${NC}"
echo -e "  npm run dev"
echo -e "\n${BOLD}Your CDN will serve:${NC}"
ORIGIN_DOMAIN=$(grep ORIGIN_DOMAIN .env | cut -d '=' -f 2)
TARGET_DOMAIN=$(grep TARGET_DOMAIN .env | cut -d '=' -f 2)
PORT=$(grep PORT .env | head -1 | cut -d '=' -f 2)
echo -e "  Primary Domain: ${GREEN}${ORIGIN_DOMAIN}${NC}"
echo -e "  Target Backend: ${GREEN}${TARGET_DOMAIN}${NC}"
echo -e "  Port: ${GREEN}${PORT}${NC}"

# Show domain-to-path mapping if configured
if grep -q "PATH_REWRITE_ENABLED=true" .env; then
  echo -e "\n${BOLD}Domain-to-Path Prefix Mapping:${NC}"
  echo -e "  ${GREEN}✓ Path rewriting enabled${NC}"
  
  if grep -q "ddt.com" .env; then
    echo -e "  ${BLUE}ddt.com${NC} → ${GREEN}${TARGET_DOMAIN}/ddt${NC}"
  fi
  
  echo -e "\n${BOLD}${BLUE}API Endpoints:${NC}"
  echo -e "  Health Check: ${GREEN}http://localhost:${PORT}/health${NC}"
  echo -e "  Domain Config: ${GREEN}http://localhost:${PORT}/api/domains${NC}"
  echo -e "  Cache Stats: ${GREEN}http://localhost:${PORT}/api/cache/stats${NC}"
  echo -e "  Metrics: ${GREEN}http://localhost:${PORT}/metrics${NC}"
fi

echo -e "\n${BOLD}${BLUE}To test locally, add these to your hosts file:${NC}"
echo -e "  127.0.0.1 ${ORIGIN_DOMAIN}"
if grep -q "ddt.com" .env; then
  echo -e "  127.0.0.1 ddt.com"
fi

echo -e "\n${BOLD}${BLUE}Test domain-to-path mapping:${NC}"
if grep -q "ddt.com" .env; then
  echo -e "  ${GREEN}curl -H \"Host: ddt.com\" http://localhost:${PORT}/about${NC}"
  echo -e "  ${YELLOW}Should route to: ${TARGET_DOMAIN}/ddt/about${NC}"
fi

echo -e "\n${BOLD}${BLUE}Documentation:${NC}"
echo -e "  User Manual: ${GREEN}docs/user-manual.md${NC}"
echo -e "  API Docs: ${GREEN}docs/api-documentation.md${NC}"
echo -e "  Examples: ${GREEN}examples.md${NC}"
echo -e "  Troubleshooting: ${GREEN}docs/troubleshooting-guide.md${NC}"

echo -e "\n${BOLD}Enjoy your enhanced high-performance CDN with domain-to-path prefix mapping!${NC}"
