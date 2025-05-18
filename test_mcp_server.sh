#!/bin/bash

# Function to find an available port
find_available_port() {
  local start_port=${1:-3000}
  local max_attempts=${2:-100}
  local port=$start_port
  local attempts=0
  
  while [ $attempts -lt $max_attempts ]; do
    # Check if port is in use
    if ! lsof -i:$port > /dev/null 2>&1; then
      echo $port
      return 0
    fi
    # Try next port
    port=$((port + 1))
    attempts=$((attempts + 1))
  done
  
  # Fallback if no port found
  echo $((start_port + 1000 + $RANDOM % 1000))
  return 1
}

# Function to ensure a port is free by killing any process using it
ensure_port_is_free() {
  local port=$1
  local max_attempts=${2:-3}
  local attempts=0
  
  while [ $attempts -lt $max_attempts ]; do
    # Check if port is in use
    EXISTING_PID=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$EXISTING_PID" ]; then
      echo "Warning: Port $port is in use by PID $EXISTING_PID. Killing..."
      kill -9 $EXISTING_PID
      sleep 1
      attempts=$((attempts + 1))
    else
      echo "Port $port is free."
      return 0
    fi
  done
  
  if lsof -i:$port > /dev/null 2>&1; then
    echo "Error: Failed to free port $port after $max_attempts attempts."
    return 1
  else
    echo "Successfully freed port $port after $attempts attempts."
    return 0
  fi
}

# Array to keep track of all PIDs to kill on exit
ALL_PIDS=()

# Setup fixed port allocation with default values
BASE_PORT=3000
APP_PORT=$BASE_PORT
MCP_API_PORT=$((BASE_PORT + 1))  # MCP API runs on a different port than web UI (3001)
MCP_INSPECTOR_PORT=$((BASE_PORT + 1000))
MCP_UI_PORT=$((BASE_PORT + 2000))
MCP_PROXY_PORT=$((BASE_PORT + 3000))

# Ensure all ports are free
echo "Ensuring all required ports are free..."
for PORT in $APP_PORT $MCP_API_PORT $MCP_INSPECTOR_PORT $MCP_UI_PORT $MCP_PROXY_PORT 8080; do
  ensure_port_is_free $PORT
  if [ $? -ne 0 ]; then
    echo "Error: Failed to free port $PORT. Please try again or choose different ports."
    exit 1
  fi
done

# Additional check for the problematic port 6274
if lsof -ti:6274 > /dev/null 2>&1; then
  echo "Freeing problematic port 6274..."
  ensure_port_is_free 6274
fi

# Create APP_START_COMMAND with the fixed port and separate MCP port
APP_START_COMMAND="node dist/cli.js start --transport http-stream --port $APP_PORT --mcp-port $MCP_API_PORT"

# Store port allocation in a file for other processes to use
PORT_INFO_FILE="/tmp/mcp_server_ports_$$.txt"
cat > $PORT_INFO_FILE << EOF
APP_PORT=$APP_PORT
MCP_API_PORT=$MCP_API_PORT
MCP_INSPECTOR_PORT=$MCP_INSPECTOR_PORT
MCP_UI_PORT=$MCP_UI_PORT
MCP_PROXY_PORT=$MCP_PROXY_PORT
EOF

# Enable proxy settings
ENABLE_PROXY=false
PROXY_HOST=""
SKIP_VERIFICATION=false

# Display port allocation information
echo "Using fixed port allocation:"
echo "- Web UI Server: $APP_PORT"
echo "- MCP API Server: $MCP_API_PORT"
echo "- MCP Inspector: $MCP_INSPECTOR_PORT"
echo "- MCP UI: $MCP_UI_PORT"
echo "- MCP Proxy: $MCP_PROXY_PORT"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --proxy)
      ENABLE_PROXY=true
      shift
      ;;
    --proxy-host)
      PROXY_HOST="$2"
      shift 2
      ;;
    --skip-verification)
      SKIP_VERIFICATION=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--proxy] [--proxy-host hostname] [--skip-verification]"
      exit 1
      ;;
  esac
done

# Display proxy status
if [ "$ENABLE_PROXY" = true ]; then
  echo "Proxy mode enabled. Will set up port forwarding for remote access."
  if [ -n "$PROXY_HOST" ]; then
    echo "Using proxy host: $PROXY_HOST"
  fi
fi

# Function to clean up resources properly
cleanup() {
  echo "Cleaning up resources..."
  
  # Terminate main processes
  echo "Terminating MCP Inspector and server..."
  for PID in "${ALL_PIDS[@]}"; do
    if kill -0 $PID 2>/dev/null; then
      kill $PID 2>/dev/null || true
      sleep 1
      # Force kill if still running
      if kill -0 $PID 2>/dev/null; then
        kill -9 $PID 2>/dev/null || true
      fi
    fi
  done
  
  # Remove temporary files
  rm -f $TEMP_LOG_FILE
  rm -f $PORT_INFO_FILE
  
  # Extra cleanup for any related processes
  for PORT in $APP_PORT $MCP_API_PORT $MCP_INSPECTOR_PORT $MCP_UI_PORT $MCP_PROXY_PORT 6274 8080; do
    EXISTING_PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$EXISTING_PID" ]; then
      echo "Cleaning up process on port $PORT (PID: $EXISTING_PID)..."
      kill -9 $EXISTING_PID 2>/dev/null || true
    fi
  done
  
  echo "Cleanup complete."
}

# Set up trap to ensure cleanup happens on exit
trap cleanup EXIT INT TERM

# Start your application in the background and capture output
echo "Starting pytest-mcp-server with HTTP Stream transport on port $APP_PORT (MCP API on port $MCP_API_PORT)..."
TEMP_LOG_FILE=$(mktemp)
$APP_START_COMMAND > $TEMP_LOG_FILE 2>&1 &
APP_PID=$!
ALL_PIDS+=($APP_PID)

# Wait for the app to initialize
echo "Waiting for the server to start..."
sleep 5

# Verify the server is running and accepting connections
if [ "$SKIP_VERIFICATION" = false ]; then
  echo "Verifying MCP server connection..."
  
  # Make verify_connection.sh executable if it isn't already
  if [ -f "verify_connection.sh" ]; then
    chmod +x verify_connection.sh
    
    # Run the verification script - use the MCP_API_PORT
    ./verify_connection.sh $MCP_API_PORT "/mcp"
    VERIFICATION_STATUS=$?
    
    # Check verification status
    if [ $VERIFICATION_STATUS -ne 0 ]; then
      echo "Connection verification failed with status $VERIFICATION_STATUS"
      echo "Check server logs for more details:"
      tail -n 50 $TEMP_LOG_FILE
      
      # Prompt to continue anyway or exit
      read -p "Connection verification failed. Continue anyway? (y/n): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting due to failed verification."
        cleanup
        exit 1
      fi
      echo "Continuing despite verification failure..."
    else
      echo "Connection verification passed! Server is accepting connections."
    fi
  else
    echo "Verification script (verify_connection.sh) not found. Skipping verification."
    echo "You can create this script to enable connection verification."
    echo "Continuing without verification..."
  fi
else
  echo "Skipping connection verification (--skip-verification flag set)"
fi

# Set up port forwarding if proxy mode is enabled
PROXY_PIDS=()
if [ "$ENABLE_PROXY" = true ]; then
  echo "Setting up port forwarding for remote access..."
  
  # Determine the public IP if proxy host isn't specified
  if [ -z "$PROXY_HOST" ]; then
    PROXY_HOST=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "your_server_ip")
    echo "Detected external IP: $PROXY_HOST"
  fi
  
  # Set up SSH port forwarding for MCP Inspector ports
  # Forward local ports to allow remote access
  for PORT in $APP_PORT $MCP_API_PORT $MCP_INSPECTOR_PORT $MCP_UI_PORT $MCP_PROXY_PORT; do
    echo "Setting up port forwarding for port $PORT..."
    # Use socat or ssh for port forwarding
    if command -v socat &> /dev/null; then
      socat TCP-LISTEN:$PORT,fork TCP:127.0.0.1:$PORT &
      PROXY_PID=$!
      PROXY_PIDS+=($PROXY_PID)
      ALL_PIDS+=($PROXY_PID)
    else
      echo "Warning: socat not found. SSH tunneling requires manual setup."
      echo "Run this command on your local machine:"
      echo "ssh -L $PORT:localhost:$PORT your_server_username@$PROXY_HOST"
    fi
  done
  
  echo "Port forwarding set up. You can access:"
  echo "- MCP Inspector UI at: http://$PROXY_HOST:$MCP_UI_PORT"
  echo "- MCP Stream at: http://$PROXY_HOST:$MCP_API_PORT/mcp"
fi

# Run MCP Inspector against your app
echo "Starting MCP Inspector on port $MCP_INSPECTOR_PORT (UI on $MCP_UI_PORT)..."

# Check if port 6274 is in use (problematic port from previous errors)
CONFLICTING_PID=$(lsof -ti:6274 2>/dev/null)
if [ -n "$CONFLICTING_PID" ]; then
  echo "Warning: Port 6274 is in use by PID $CONFLICTING_PID, which may cause issues with MCP Inspector."
  echo "Attempting to kill process on port 6274..."
  kill -9 $CONFLICTING_PID
  sleep 1
  
  # Check if it's still running
  if lsof -ti:6274 > /dev/null 2>&1; then
    echo "Failed to free port 6274. This may cause issues with the MCP Inspector."
  else
    echo "Successfully freed port 6274."
  fi
fi

# Start the Inspector with more resilient connection settings
if [ "$ENABLE_PROXY" = true ]; then
  # When using proxy mode, set the public URL to use the proxy host
  INSPECTOR_URL="http://$PROXY_HOST:$MCP_API_PORT/mcp"
  npx @modelcontextprotocol/inspector inspect $INSPECTOR_URL --port $MCP_INSPECTOR_PORT --ui-port $MCP_UI_PORT --proxy-port $MCP_PROXY_PORT --public-url "http://$PROXY_HOST" --timeout 300000 --keep-alive-interval 5000 --retry-limit 3 --retry-delay 2000 &
else
  # Ensure we use the correct MCP_API_PORT in the connection URL
  echo "Using connection URL: http://localhost:$MCP_API_PORT/mcp"
  
  # Start the inspector with more resilient retry settings
  npx @modelcontextprotocol/inspector inspect http://localhost:$MCP_API_PORT/mcp --port $MCP_INSPECTOR_PORT --ui-port $MCP_UI_PORT --proxy-port $MCP_PROXY_PORT --timeout 300000 --keep-alive-interval 5000 --retry-limit 3 --retry-delay 2000 &
fi
INSPECTOR_PID=$!
ALL_PIDS+=($INSPECTOR_PID)

# Wait longer for MCP Inspector to start
echo "Waiting for MCP Inspector to fully initialize..."
sleep 10

# Open the MCP Inspector UI if not in a remote environment
if [ "$ENABLE_PROXY" = false ] && [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* && -n "$DISPLAY" ]]; then
  echo "Opening MCP Inspector UI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:$MCP_UI_PORT
  else
    xdg-open http://localhost:$MCP_UI_PORT
  fi
else
  if [ "$ENABLE_PROXY" = true ]; then
    echo "MCP Inspector is running at: http://$PROXY_HOST:$MCP_UI_PORT"
  else
    echo "MCP Inspector is running at: http://localhost:$MCP_UI_PORT"
  fi
fi

# Display the MCP connection URL for the user
if [ "$ENABLE_PROXY" = true ]; then
  echo "Connect to MCP server at: http://$PROXY_HOST:$MCP_API_PORT/mcp"
else
  echo "Connect to MCP server at: http://localhost:$MCP_API_PORT/mcp"
fi
echo "Web UI available at: http://localhost:$APP_PORT"
echo "IMPORTANT: Always use the /mcp endpoint for MCP connections (not /stream)"

# Wait for user input to terminate
read -p "Press Enter to terminate the server and MCP Inspector..."

# Cleanup happens automatically via the trap 