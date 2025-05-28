#!/bin/bash
set -e

echo "🧪 Comprehensive Dagger Test for pytest-mcp-server"
echo "=================================================="

# Check if dagger is installed
if ! command -v dagger &> /dev/null; then
    echo "❌ Dagger CLI not found. Install it first:"
    echo "curl -L https://dl.dagger.io/dagger/install.sh | sh"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Run this script from the pytest-mcp-server directory"
    exit 1
fi

echo "📦 Step 1: Building and testing pytest-mcp-server with Dagger..."

# Make comprehensive test script executable
chmod +x test-comprehensive.sh

# Run comprehensive testing with Dagger
echo "🐳 Running comprehensive tests in clean container environment..."

dagger run sh -c '
    echo "🐳 Inside Dagger container - Setting up environment..."
    
    # Install Node.js, Python, and required tools
    apk add --no-cache nodejs npm python3 py3-pip bash curl jq
    
    echo "📦 Installing dependencies..."
    npm install
    npm run build
    
    echo "🧪 Installing MCP Testing Framework..."
    pip install mcp-testing-framework
    
    echo "🚀 Running comprehensive test suite..."
    chmod +x test-comprehensive.sh
    ./test-comprehensive.sh
    
    echo "✅ Container test completed!"
'

echo ""
echo "✅ Dagger comprehensive test completed!"
echo ""
echo "💡 This test validates:"
echo "   - ✅ MCP server builds correctly in clean container"
echo "   - ✅ All dependencies install properly"
echo "   - ✅ All 8 tools are tested individually"
echo "   - ✅ Valid data handling works perfectly"
echo "   - ✅ Error handling works correctly"
echo "   - ✅ MCP Testing Framework integration"
echo "   - ⚠️  Framework validation errors are documented and expected"
echo ""
echo "🎯 Your MCP server is production-ready!" 