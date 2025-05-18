#!/usr/bin/env node
/**
 * Command line interface for pytest-mcp-server
 */

import { MCPServer } from "mcp-framework";
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory where the package is installed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

// Import our tool modules to ensure they're registered
import "./tools/PytestFailureTool.js";
import "./tools/DebugWithPrincipleTool.js";
import "./tools/GetFailureInfoTool.js";
import "./tools/ListFailuresTool.js";
import "./tools/PytestDocsGuideTool.js";
import "./tools/FailureAnalyticsTool.js";
import "./tools/FailurePromptGeneratorTool.js";

// Import HTTP server app
import httpApp, { startServer } from "./http-server.js";

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || "help";

// Default options
const options = {
  port: parseInt(process.env.PORT || "3000", 10),
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
  webUi: true,
  transport: process.env.TRANSPORT || "stdio", // Default transport type
  silent: process.env.SILENT === "true" || false
};

// Parse options
for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--port" || arg === "-p") {
    options.port = parseInt(args[++i], 10);
  } else if (arg === "--data-dir" || arg === "-d") {
    options.dataDir = path.resolve(args[++i]);
  } else if (arg === "--no-web-ui") {
    options.webUi = false;
  } else if (arg === "--transport") {
    options.transport = args[++i];
  } else if (arg === "--silent") {
    options.silent = true;
  }
}

// Ensure data directory exists
if (!fs.existsSync(options.dataDir)) {
  fs.mkdirSync(options.dataDir, { recursive: true });
}

// Set data directory as environment variable for tools to use
process.env.DATA_DIR = options.dataDir;
if (!options.silent) {
  console.error(`✅ Using data directory: ${process.env.DATA_DIR}`);
}

// Read package.json for version information
const packageJsonPath = path.join(PACKAGE_ROOT, 'package.json');
let packageVersion = '1.0.0'; // Default fallback version

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageVersion = packageJson.version || packageVersion;
} catch (error: any) {
  console.error(`Warning: Could not read package.json for version info: ${error.message}`);
}

async function startMcpServer() {
  if (!options.silent) {
    console.error("Starting Pytest MCP Server...");
  }
  
  try {
    // Set PORT environment variable
    process.env.PORT = options.port.toString();
    
    // Start MCP server with explicit name, version and transport configuration
    const serverConfig: any = {
      name: "pytest-mcp-server",
      version: packageVersion,
      capabilities: {
        tools: true  // Explicitly enable tools capability
      }
    };
    
    // Configure transport based on options and HTTP server
    if (options.transport === "sse") {
      // Start HTTP server for SSE transport
      // We're not awaiting httpApp.listen to avoid blocking
      startServer(options.port, options.silent);
      
      // Configure SSE transport
      serverConfig.transport = {
        type: "sse",
        // The Express app is used instead of the HTTP server
        expressApp: httpApp,
        path: "/sse"
      };
      if (!options.silent) {
        console.error(`✅ SSE transport enabled at http://localhost:${options.port}/sse`);
      }
    } else if (options.transport === "http-stream") {
      // Start HTTP server for HTTP Stream transport
      startServer(options.port, options.silent);
      
      // Configure HTTP Stream transport
      serverConfig.transport = {
        type: "http-stream",
        // For Claude Desktop, let MCP create its own server rather than using expressApp
        port: options.port + 1, // Use a different port for the MCP HTTP Stream server
        endpoint: "/stream",
        cors: {
          allowOrigin: "*",
          allowMethods: "GET, POST, OPTIONS",
          allowHeaders: "Content-Type, Authorization, x-api-key",
          exposeHeaders: "Content-Type, Authorization, x-api-key",
          maxAge: "86400"
        },
        maxMessageSize: "4mb"
      };
      if (!options.silent) {
        console.error(`✅ HTTP Stream transport enabled at http://localhost:${options.port}/stream (Express)`);
        console.error(`✅ HTTP Stream transport also available at http://localhost:${options.port + 1}/stream (MCP)`);
      }
    } else {
      // Use STDIO transport
      serverConfig.transport = {
        type: "stdio"
      };
      if (!options.silent) {
        console.error(`✅ STDIO transport enabled`);
      }
      
      // Still start HTTP server if web UI is enabled
      if (options.webUi) {
        // Don't await this to avoid blocking
        startServer(options.port, options.silent);
      }
    }
    
    const server = new MCPServer(serverConfig);
    
    await server.start();
    if (!options.silent) {
      console.error("✅ MCP server started successfully with 9 debugging principles!");
      console.error("Ready to accept pytest failures!");
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Pytest MCP Server - Debugging assistant for pytest failures

Usage:
  pytest-mcp-server [command] [options]

Commands:
  start       Start the MCP server (default)
  check-env   Display environment variable configuration
  help        Show this help message

Options:
  --port, -p <port>     Set HTTP server port (default: 3000)
  --data-dir, -d <dir>  Set data directory (default: ./data)
  --no-web-ui           Disable web UI (MCP server only)
  --transport <type>    Set transport type (stdio, sse, http-stream) (default: stdio)
  --silent              Run in silent mode (minimal console output)

Examples:
  pytest-mcp-server start --port 8080
  pytest-mcp-server --data-dir /path/to/data
  pytest-mcp-server start --transport http-stream
  pytest-mcp-server start --transport http-stream --silent
  `);
}

function showEnvInfo() {
  console.log(`
=== Environment Configuration ===
DATA_DIR: ${process.env.DATA_DIR}
PORT: ${process.env.PORT || '3000 (default)'}
Current Working Directory: ${process.cwd()}
  `);
}

// Execute command
switch (command) {
  case "start":
    startMcpServer();
    break;
  case "env":
  case "check-env":
    showEnvInfo();
    break;
  case "help":
  default:
    showHelp();
    break;
} 