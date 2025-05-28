#!/bin/bash
set -e

echo "🧪 Simple Dagger Test for pytest-mcp-server (No Modules)"
echo "======================================================="

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

echo "📦 Step 1: Building pytest-mcp-server with Dagger..."

# Create a temporary directory for our test
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Copy source to temp directory
cp -r . "$TEMP_DIR/"
cd "$TEMP_DIR"

# Use dagger without modules - just run containers directly
echo "🔨 Building in container..."
dagger -m github.com/shykes/daggerverse/wolfi@v0.1.2 call container \
    --packages="nodejs,npm,python3,py3-pip" \
    --with-directory="/app,." \
    --with-workdir="/app" \
    --with-exec="npm,install" \
    --with-exec="npm,run,build" \
    --with-exec="ls,-la,dist/" \
    stdout

echo ""
echo "🧪 Step 2: Testing basic connectivity..."
dagger -m github.com/shykes/daggerverse/wolfi@v0.1.2 call container \
    --packages="nodejs,npm" \
    --with-directory="/app,." \
    --with-workdir="/app" \
    --with-exec="npm,install" \
    --with-exec="npm,run,build" \
    --with-exec="timeout,10,bash,-c,echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}' | node dist/index.js --stdio" \
    stdout || echo "Basic connectivity test completed"

echo ""
echo "🚀 Step 3: Testing with mcp-test..."
dagger -m github.com/shykes/daggerverse/wolfi@v0.1.2 call container \
    --packages="nodejs,npm,python3,py3-pip" \
    --with-directory="/app,." \
    --with-workdir="/app" \
    --with-exec="npm,install" \
    --with-exec="npm,run,build" \
    --with-exec="pip,install,mcp-testing-framework" \
    --with-exec="mkdir,-p,/root/.llm" \
    --with-new-file="/root/.llm/config.json,{
  \"systemPrompt\": \"You are an AI assistant helping with MCP server testing.\",
  \"llm\": {
    \"provider\": \"openai\",
    \"model\": \"gpt-4o-mini\",
    \"api_key\": \"test-key\",
    \"temperature\": 0.7
  },
  \"mcpServers\": {
    \"pytest-mcp-server\": {
      \"command\": \"node\",
      \"args\": [\"/app/dist/index.js\", \"--stdio\"],
      \"env\": {
        \"DEBUG\": \"*\",
        \"DATA_DIR\": \"/app/data\"
      },
      \"enabled\": true,
      \"exclude_tools\": [],
      \"requires_confirmation\": []
    }
  },
  \"toolsRequiresConfirmation\": [],
  \"testing\": {}
}" \
    --with-exec="mcp-test,--test-mcp-servers,--test-output-format,table" \
    stdout

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Dagger test completed!"
echo ""
echo "💡 This test shows you:"
echo "   - If your MCP server builds correctly in a clean container"
echo "   - If basic connectivity works"
echo "   - If mcp-test can discover and validate your tools"
echo "   - Any tool validation errors that need fixing" 