#!/bin/bash
# Git Setup Script for Advanced CDN Project
# This script configures git settings for the project

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
echo "   Git Setup for Advanced CDN Project"
echo "============================================="
echo -e "${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git is not installed. Please install Git first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Git is installed${NC}"

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo -e "\n${BOLD}Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✓ Git repository initialized${NC}"
else
    echo -e "${GREEN}✓ Git repository already exists${NC}"
fi

# Set up git configuration
echo -e "\n${BOLD}Configuring Git settings...${NC}"

# Set user name and email for this repository
git config user.name "Tom Cranstoun"
git config user.email "tom@ddttom.com"
echo -e "${GREEN}✓ Set user name: Tom Cranstoun${NC}"
echo -e "${GREEN}✓ Set user email: tom@ddttom.com${NC}"

# Set default branch to main
git config init.defaultBranch main
echo -e "${GREEN}✓ Set default branch to main${NC}"

# Set line ending handling
git config core.autocrlf false
git config core.eol lf
echo -e "${GREEN}✓ Configured line endings (LF)${NC}"

# Set editor (if not already set)
if ! git config --get core.editor > /dev/null 2>&1; then
    git config core.editor "nano"
    echo -e "${GREEN}✓ Set default editor to nano${NC}"
fi

# Configure remote repository
echo -e "\n${BOLD}Configuring remote repository...${NC}"

# Check if remote 'origin' exists
if git remote get-url origin > /dev/null 2>&1; then
    CURRENT_REMOTE=$(git remote get-url origin)
    echo -e "${YELLOW}Current remote origin: ${CURRENT_REMOTE}${NC}"
    
    # Update remote URL if it's not correct
    if [ "$CURRENT_REMOTE" != "https://github.com/ddttom/advanced-cdn.git" ]; then
        git remote set-url origin https://github.com/ddttom/advanced-cdn.git
        echo -e "${GREEN}✓ Updated remote origin to: https://github.com/ddttom/advanced-cdn.git${NC}"
    else
        echo -e "${GREEN}✓ Remote origin is already correctly set${NC}"
    fi
else
    # Add remote origin
    git remote add origin https://github.com/ddttom/advanced-cdn.git
    echo -e "${GREEN}✓ Added remote origin: https://github.com/ddttom/advanced-cdn.git${NC}"
fi

# Set up upstream tracking
echo -e "\n${BOLD}Setting up branch tracking...${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")

if [ "$CURRENT_BRANCH" != "main" ]; then
    # Create main branch if it doesn't exist
    if ! git show-ref --verify --quiet refs/heads/main; then
        git checkout -b main
        echo -e "${GREEN}✓ Created and switched to main branch${NC}"
    else
        git checkout main
        echo -e "${GREEN}✓ Switched to main branch${NC}"
    fi
fi

# Stage all files for initial commit
echo -e "\n${BOLD}Preparing files for commit...${NC}"

# Add all files except those in .gitignore
git add .
echo -e "${GREEN}✓ Staged all files${NC}"

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠ No changes to commit${NC}"
else
    # Create initial commit if this is a new repository
    if ! git log --oneline -1 > /dev/null 2>&1; then
        git commit -m "Initial commit: Advanced CDN with domain-to-path prefix mapping

Features:
- Domain-to-path prefix mapping (ddt.com → /ddt)
- Advanced path rewriting engine
- Performance optimization and monitoring
- Comprehensive documentation
- Error handling and circuit breaker protection
- API management endpoints
- Benchmarking framework

Author: Tom Cranstoun (@ddttom)"
        echo -e "${GREEN}✓ Created initial commit${NC}"
    else
        echo -e "${YELLOW}⚠ Repository already has commits. Use 'git commit' manually if needed.${NC}"
    fi
fi

# Display git status
echo -e "\n${BOLD}Git Status:${NC}"
git status --short

# Display remote information
echo -e "\n${BOLD}Remote Configuration:${NC}"
git remote -v

# Display current branch
echo -e "\n${BOLD}Current Branch:${NC}"
git branch --show-current

echo -e "\n${BOLD}${GREEN}Git setup complete!${NC}"
echo -e "\n${BOLD}Next steps:${NC}"
echo -e "1. Review your changes: ${GREEN}git status${NC}"
echo -e "2. Push to GitHub: ${GREEN}git push -u origin main${NC}"
echo -e "3. Create pull requests for new features"
echo -e "\n${BOLD}Repository URL: ${GREEN}https://github.com/ddttom/advanced-cdn${NC}"