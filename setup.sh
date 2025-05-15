#!/bin/bash

# Setup script for pytest-mcp-server

echo "🚀 Setting up pytest-mcp-server..."

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create data directory if it doesn't exist
echo "📁 Creating data directory..."
mkdir -p data

# Create empty data files if they don't exist
echo "📄 Creating data files..."
touch data/failures.json
touch data/debug_sessions.json

echo "
{
  \"failures\": {}
}" > data/failures.json

echo "
{
  \"debug_sessions\": {}
}" > data/debug_sessions.json

# Build the project
echo "🔨 Building the MCP server..."
npm run build

# Ask if user wants to build the web UI
read -p "Do you want to build the web UI? (y/n) " -n 1 -r
echo    # move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "🔨 Building the web UI..."
  npm run build:web
fi

echo "✅ Setup complete!"
echo ""
echo "To start the MCP server, run:"
echo "  npm start"
echo ""
echo "To start the HTTP server with web UI, run:"
echo "  npm run start-http"
echo ""
echo "To test the server with a sample failure, run:"
echo "  python test-client.py --action demo" 