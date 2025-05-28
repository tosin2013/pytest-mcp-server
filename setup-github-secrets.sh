#!/bin/bash

# GitHub Secrets Setup Script for pytest-mcp-server
# This script helps you configure the required secrets for GitHub Actions

set -e

echo "🔧 GitHub Secrets Setup for pytest-mcp-server"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it from: https://cli.github.com/"
    echo ""
    echo "On macOS: brew install gh"
    echo "On Ubuntu: sudo apt install gh"
    exit 1
fi

# Check if user is logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  You need to authenticate with GitHub CLI first.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is installed and authenticated${NC}"
echo ""

# Get repository information
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login' 2>/dev/null || echo "")
REPO_NAME=$(gh repo view --json name --jq '.name' 2>/dev/null || echo "")

if [[ -z "$REPO_OWNER" || -z "$REPO_NAME" ]]; then
    echo -e "${RED}❌ Could not detect GitHub repository.${NC}"
    echo "Please run this script from within your pytest-mcp-server repository."
    exit 1
fi

echo -e "${BLUE}📁 Repository: ${REPO_OWNER}/${REPO_NAME}${NC}"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_required=$3
    
    echo -e "${YELLOW}🔑 Setting up: ${secret_name}${NC}"
    echo "Description: $secret_description"
    
    if [[ "$is_required" == "true" ]]; then
        echo -e "${RED}⚠️  This secret is REQUIRED${NC}"
    else
        echo -e "${GREEN}ℹ️  This secret is optional${NC}"
    fi
    
    # Check if secret already exists
    if gh secret list | grep -q "^${secret_name}"; then
        echo -e "${GREEN}✅ Secret ${secret_name} already exists${NC}"
        read -p "Do you want to update it? (y/N): " update_secret
        if [[ ! "$update_secret" =~ ^[Yy]$ ]]; then
            echo "Skipping ${secret_name}"
            echo ""
            return
        fi
    fi
    
    echo "Please enter the value for ${secret_name}:"
    read -s secret_value
    
    if [[ -z "$secret_value" ]]; then
        if [[ "$is_required" == "true" ]]; then
            echo -e "${RED}❌ This secret is required and cannot be empty${NC}"
            return 1
        else
            echo "Skipping empty optional secret"
            echo ""
            return
        fi
    fi
    
    # Set the secret
    if echo "$secret_value" | gh secret set "$secret_name"; then
        echo -e "${GREEN}✅ Successfully set ${secret_name}${NC}"
    else
        echo -e "${RED}❌ Failed to set ${secret_name}${NC}"
        return 1
    fi
    
    echo ""
}

# Set up required secrets
echo -e "${BLUE}🚀 Setting up required secrets...${NC}"
echo ""

# OpenAI API Key
set_secret "OPENAI_API_KEY" "OpenAI API key for AI-powered testing (starts with sk-)" "true"

# Optional secrets
echo -e "${BLUE}🔧 Setting up optional secrets...${NC}"
echo ""

set_secret "DAGGER_CLOUD_TOKEN" "Dagger Cloud token for enhanced performance and caching" "false"

# Verify secrets
echo -e "${BLUE}📋 Verifying secrets...${NC}"
echo ""

echo "Current secrets in repository:"
gh secret list

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Push your code to trigger the GitHub Action"
echo "2. Check the Actions tab to see test results"
echo "3. Create a pull request to see automated testing in action"
echo ""
echo "For more information, see: GITHUB_ACTIONS_README.md"
echo ""
echo -e "${BLUE}📚 Useful commands:${NC}"
echo "• View workflow runs: gh run list"
echo "• View specific run: gh run view <run-id>"
echo "• Trigger manual run: gh workflow run 'Test pytest-mcp-server with Dagger Cloud'"
echo ""
echo -e "${GREEN}Happy testing! 🧪${NC}" 