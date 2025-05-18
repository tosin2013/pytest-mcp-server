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

// Import tool classes
import PytestFailureTool from './tools/PytestFailureTool.js';
import DebugWithPrincipleTool from './tools/DebugWithPrincipleTool.js';
import GetFailureInfoTool from './tools/GetFailureInfoTool.js';
import ListFailuresTool from './tools/ListFailuresTool.js';
import PytestDocsGuideTool from './tools/PytestDocsGuideTool.js';
import FailureAnalyticsTool from './tools/FailureAnalyticsTool.js';
import FailurePromptGeneratorTool from './tools/FailurePromptGeneratorTool.js';

// Import HTTP server app
import httpApp, { startServer } from "./http-server.js";

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || "help";

// Default options
const options = {
  port: parseInt(process.env.PORT || "3000", 10),
  mcpPort: parseInt(process.env.MCP_PORT || "3001", 10), // Added separate MCP port default
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
  } else if (arg === "--mcp-port") {    // Added CLI option for MCP port
    options.mcpPort = parseInt(args[++i], 10);
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
    // Set PORT environment variable for Express web server
    process.env.PORT = options.port.toString();
    
    // Start MCP server with explicit name, version and transport configuration
    const serverConfig: any = {
      name: "pytest-mcp-server",
      version: packageVersion,
      capabilities: {
        tools: {}  // Changed from 'true' to empty object as required by MCP-Framework
      }
    };
    
    // Configure transport based on options and HTTP server
    if (options.transport === "sse") {
      // Start HTTP server for SSE transport
      // We're not awaiting httpApp.listen to avoid blocking
      const actualPort = await startServer(options.port, options.silent);
      
      // Configure SSE transport
      serverConfig.transport = {
        type: "sse",
        // The Express app is used instead of the HTTP server
        expressApp: httpApp,
        path: "/sse"
      };
      if (!options.silent) {
        console.error(`✅ SSE transport enabled at http://localhost:${actualPort}/sse`);
      }
    } else if (options.transport === "http-stream") {
      // Start HTTP server for the web UI - using dynamic port allocation
      const actualWebUiPort = await startServer(options.port, options.silent);
      
      // Configure HTTP Stream transport with different port
      // Use the mcpPort option specifically for the MCP server, different from the Express UI port
      serverConfig.transport = {
        type: "http-stream",
        options: {
          port: options.mcpPort,   // Use separate dedicated port for MCP transport
          endpoint: "/mcp", 
          hostname: "0.0.0.0", 
          cors: {
            allowOrigin: "*",
            allowMethods: "GET, POST, DELETE, OPTIONS",
            allowHeaders: "Content-Type, Accept, Authorization, x-api-key, Mcp-Session-Id, Last-Event-ID",
            exposeHeaders: "Content-Type, Authorization, x-api-key, Mcp-Session-Id",
            maxAge: "86400"
          },
          maxMessageSize: "4mb",
          enableWebSocket: true,
          connectionTimeout: 300000,
          keepAliveInterval: 5000,
          session: {
            enabled: true,
            headerName: "Mcp-Session-Id",
            allowClientTermination: true,
            terminationGracePeriod: 10000
          },
          resumability: {
            enabled: true,
            historyDuration: 600000
          }
        }
      };
      
      // Log the actual configuration for debugging
      if (!options.silent) {
        console.error("MCP Server Configuration:", JSON.stringify(serverConfig, null, 2));
      }
      
      // Store the ports in environment variables for use by other components
      process.env.HTTP_PORT = actualWebUiPort.toString();
      process.env.MCP_PORT = options.mcpPort.toString();
      
      if (!options.silent) {
        console.error(`✅ HTTP Stream transport enabled at http://localhost:${options.mcpPort}/mcp (MCP Server)`);
        console.error(`✅ Express web server running on port ${actualWebUiPort}`);
        
        // User guidance with clear formatting
        console.error(`===============================================================`);
        console.error(`IMPORTANT CONNECTION INFORMATION:`);
        console.error(`✓ Web UI port: ${actualWebUiPort}`);
        console.error(`✓ MCP server port: ${options.mcpPort}`);
        console.error(`✓ Use the /mcp endpoint for all MCP connections (not /stream)`);
        console.error(`✓ Connection URL: http://localhost:${options.mcpPort}/mcp`);
        console.error(`===============================================================`);
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
        const actualPort = await startServer(options.port, options.silent);
        // Store the port in an environment variable
        process.env.HTTP_PORT = actualPort.toString();
      }
    }
    
    // Create instances of each tool
    const pytestFailureTool = new PytestFailureTool();
    const debugWithPrincipleTool = new DebugWithPrincipleTool();
    const getFailureInfoTool = new GetFailureInfoTool();
    const listFailuresTool = new ListFailuresTool();
    const pytestDocsGuideTool = new PytestDocsGuideTool();
    const failureAnalyticsTool = new FailureAnalyticsTool();
    const failurePromptGeneratorTool = new FailurePromptGeneratorTool();

    // Instead of post-initialization registration, include the tools in the initial configuration
    serverConfig.capabilities.tools = {
      [pytestFailureTool.name]: {
        description: pytestFailureTool.description,
        handler: pytestFailureTool.execute.bind(pytestFailureTool),
        schema: pytestFailureTool.schema
      },
      [debugWithPrincipleTool.name]: {
        description: debugWithPrincipleTool.description,
        handler: debugWithPrincipleTool.execute.bind(debugWithPrincipleTool),
        schema: debugWithPrincipleTool.schema
      },
      [getFailureInfoTool.name]: {
        description: getFailureInfoTool.description,
        handler: getFailureInfoTool.execute.bind(getFailureInfoTool),
        schema: getFailureInfoTool.schema
      },
      [listFailuresTool.name]: {
        description: listFailuresTool.description,
        handler: listFailuresTool.execute.bind(listFailuresTool),
        schema: listFailuresTool.schema
      },
      [pytestDocsGuideTool.name]: {
        description: pytestDocsGuideTool.description,
        handler: pytestDocsGuideTool.execute.bind(pytestDocsGuideTool),
        schema: pytestDocsGuideTool.schema
      },
      [failureAnalyticsTool.name]: {
        description: failureAnalyticsTool.description,
        handler: failureAnalyticsTool.execute.bind(failureAnalyticsTool),
        schema: failureAnalyticsTool.schema
      },
      [failurePromptGeneratorTool.name]: {
        description: failurePromptGeneratorTool.description,
        handler: failurePromptGeneratorTool.execute.bind(failurePromptGeneratorTool),
        schema: failurePromptGeneratorTool.schema
      }
    };

    // Create the server with all tools configured
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
  --port, -p <port>     Set HTTP server port for web UI (default: 3000)
  --mcp-port <port>     Set MCP transport server port (default: 3001)
  --data-dir, -d <dir>  Set data directory (default: ./data)
  --no-web-ui           Disable web UI (MCP server only)
  --transport <type>    Set transport type (stdio, sse, http-stream) (default: stdio)
  --silent              Run in silent mode (minimal console output)

Examples:
  pytest-mcp-server start --port 8080 --mcp-port 8081
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
MCP_PORT: ${process.env.MCP_PORT || '3001 (default)'}
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