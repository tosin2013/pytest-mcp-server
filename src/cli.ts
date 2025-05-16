#!/usr/bin/env node
/**
 * Command line interface for pytest-mcp-server
 */

import { MCPServer } from "mcp-framework";
import express from 'express';
import fs from 'fs';
import path from 'path';

// Import our tool modules to ensure they're registered
import "./tools/PytestFailureTool.js";
import "./tools/DebugWithPrincipleTool.js";
import "./tools/GetFailureInfoTool.js";
import "./tools/ListFailuresTool.js";
import "./tools/PytestDocsGuideTool.js";
import "./tools/FailureAnalyticsTool.js";
import "./tools/FailurePromptGeneratorTool.js";

// Import HTTP server app
import httpApp from "./http-server.js";

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || "help";

// Default options
const options = {
  port: parseInt(process.env.PORT || "3000", 10),
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
  webUi: true,
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
  }
}

// Ensure data directory exists
if (!fs.existsSync(options.dataDir)) {
  fs.mkdirSync(options.dataDir, { recursive: true });
}

// Set data directory as environment variable for tools to use
process.env.DATA_DIR = options.dataDir;
console.log(`✅ Using data directory: ${process.env.DATA_DIR}`);

// Read package.json for version information
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
let packageVersion = '1.0.0'; // Default fallback version

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageVersion = packageJson.version || packageVersion;
} catch (error: any) {
  console.warn(`Warning: Could not read package.json for version info: ${error.message}`);
}

async function startMcpServer() {
  console.log("Starting Pytest MCP Server...");
  
  try {
    // Start MCP server with explicit name and version from package.json
    const server = new MCPServer({
      name: "pytest-mcp-server",
      version: packageVersion
    });
    await server.start();
    console.log("✅ MCP server started successfully with 9 debugging principles!");
    
    // Start HTTP server if web UI is enabled
    if (options.webUi) {
      httpApp.listen(options.port, () => {
        console.log(`✅ HTTP server running on port ${options.port}`);
        console.log(`🔍 Web UI available at http://localhost:${options.port}`);
        console.log("Ready to accept pytest failures!");
      });
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

Examples:
  pytest-mcp-server start --port 8080
  pytest-mcp-server --data-dir /path/to/data
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