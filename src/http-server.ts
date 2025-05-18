import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

// Get the directory where the package is installed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

// Import our tools
import PytestFailureTool from './tools/PytestFailureTool.js';
import DebugWithPrincipleTool from './tools/DebugWithPrincipleTool.js';
import GetFailureInfoTool from './tools/GetFailureInfoTool.js';
import ListFailuresTool from './tools/ListFailuresTool.js';
import PytestDocsGuideTool from './tools/PytestDocsGuideTool.js';
import FailureAnalyticsTool from './tools/FailureAnalyticsTool.js';
import FailurePromptGeneratorTool from './tools/FailurePromptGeneratorTool.js';

// Initialize tools
const pytestFailureTool = new PytestFailureTool();
const debugWithPrincipleTool = new DebugWithPrincipleTool();
const getFailureInfoTool = new GetFailureInfoTool();
const listFailuresTool = new ListFailuresTool();
const pytestDocsGuideTool = new PytestDocsGuideTool();
const failureAnalyticsTool = new FailureAnalyticsTool();
const failurePromptGeneratorTool = new FailurePromptGeneratorTool();

// Initialize express app
const app = express();
const PORT = process.env.HTTP_PORT || 0; // Use port 0 to let the OS assign an available port

// Middleware
app.use(cors());
// Standard JSON parsing (no custom limit)
app.use(bodyParser.json());

// Use DATA_DIR from environment variable or default to a directory in the current working directory
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Set DATA_DIR in the environment for other modules to use
process.env.DATA_DIR = DATA_DIR;

// Stream endpoint implementations
// Helper function to handle streaming responses
function handleStreamResponse(req: Request, res: Response, silent: boolean = false) {
  // Track whether this was a direct /mcp request or a redirected /stream request
  const wasRedirected = req.path === '/stream';
  
  // Set headers for streaming response
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  
  // Set CORS headers with more permissive settings to reduce connection issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-api-key, Mcp-Session-Id, Last-Event-ID, *');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization, x-api-key, Mcp-Session-Id, *');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Create a session ID for this connection
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  // Store the session ID on the response object for reference
  (res as any).mcpSessionId = sessionId;
  
  // Track connection state
  let connectionActive = true;
  let lastPingSent = 0;
  let lastPingResponse = 0;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5; // Increased from 3 to 5 for more resilience
  
  if (!silent) {
    const endpoint = req.path;
    console.error(`HTTP Stream connection established: ${sessionId} on ${endpoint}`);
    // Log connection details for debugging
    console.error(`Connection details: ${req.method} ${req.url} from ${req.ip}`);
    console.error(`User-Agent: ${req.get('User-Agent')}`);
  }
  
  // Extract client information from request
  const clientInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    queryParams: req.query,
    endpoint: req.path
  };
  
  // Check for URL or transport type mismatches
  const queryTransportType = req.query.transportType as string;
  const queryUrl = req.query.url as string;
  
  let guidanceMessage = null;
  
  // Check for endpoint usage error
  if (wasRedirected) {
    guidanceMessage = "Note: You connected to /stream which is deprecated. Please use /mcp endpoint for future connections.";
    if (!silent) {
      console.error(`Warning: Client connected to deprecated /stream endpoint. Redirected to /mcp.`);
    }
  }
  
  // Check for URL mismatch
  if (queryUrl && !queryUrl.includes('/mcp')) {
    guidanceMessage = `Warning: Your client is configured to use URL: ${queryUrl} - Please update to use /mcp endpoint.`;
    if (!silent) {
      console.error(`Warning: Client is using incorrect URL: ${queryUrl} - should be /mcp endpoint`);
    }
  }
  
  // Check for transport type mismatch
  if (queryTransportType && queryTransportType !== 'streamable-http') {
    if (!silent) {
      console.error(`Warning: Client is using unexpected transport type: ${queryTransportType}`);
    }
  }
  
  // Check for potential port mismatch
  const requestPort = req.get('host')?.split(':')[1] || '3000';
  const configuredPort = process.env.MCP_PORT || process.env.HTTP_PORT || process.env.PORT || '3000';
  
  if (requestPort !== configuredPort) {
    guidanceMessage = `Warning: Possible port mismatch. Server is configured for port ${configuredPort}, but request came on port ${requestPort}.`;
    if (!silent) {
      console.error(`Warning: Possible port mismatch. Client connected on port ${requestPort}, server configured for ${configuredPort}`);
    }
  }
  
  // Function to send a message safely
  const sendMessage = (message: any) => {
    if (!connectionActive) return false;
    
    try {
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      res.write(messageString + '\n');
      return true;
    } catch (error) {
      connectionActive = false;
      if (!silent) {
        console.error(`Failed to send message to ${sessionId}: ${error}`);
      }
      return false;
    }
  };
  
  // Send initial response to confirm connection
  const initialMessage = {
    jsonrpc: "2.0",
    id: null,
    method: "connection",
    params: {
      sessionId: sessionId,
      serverInfo: {
        name: "pytest-mcp-server",
        version: process.env.npm_package_version || "1.0.0",
        port: configuredPort,
        defaultEndpoint: "/mcp"
      },
      timestamp: Date.now(),
      clientInfo: clientInfo,
      guidance: guidanceMessage 
    }
  };
  
  // Try to send the initial message, but handle any errors
  if (!sendMessage(initialMessage)) {
    if (!silent) {
      console.error(`Failed to send initial message to ${sessionId}`);
    }
    return;
  }
  
  // Keep-alive interval with adaptive timing and recovery
  const keepAliveInterval = setInterval(() => {
    if (!connectionActive) {
      clearInterval(keepAliveInterval);
      return;
    }
    
    const now = Date.now();
    lastPingSent = now;
    
    try {
      const pingMessage = {
        jsonrpc: "2.0",
        id: null,
        method: "ping",
        params: {
          timestamp: now,
          sessionId: sessionId
        }
      };
      
      if (!sendMessage(pingMessage)) {
        // If we failed to send the ping, try to reconnect
        reconnectAttempts++;
        
        if (reconnectAttempts <= maxReconnectAttempts) {
          if (!silent) {
            console.error(`Connection issue detected for ${sessionId}, attempting recovery (${reconnectAttempts}/${maxReconnectAttempts})...`);
          }
          
          // Attempt to send a recovery message after a short delay with exponential backoff
          setTimeout(() => {
            if (connectionActive) {
              sendMessage({
                jsonrpc: "2.0",
                id: null,
                method: "reconnect_attempt",
                params: {
                  timestamp: Date.now(),
                  sessionId: sessionId,
                  attempt: reconnectAttempts,
                  guidance: "If you're experiencing connection issues, please check that you're using the correct endpoint (/mcp) and port."
                }
              });
            }
          }, 500 * Math.pow(2, reconnectAttempts - 1)); // Exponential backoff
        } else {
          if (!silent) {
            console.error(`Connection recovery failed for ${sessionId} after ${maxReconnectAttempts} attempts, closing connection.`);
          }
          connectionActive = false;
          clearInterval(keepAliveInterval);
          
          // Send a final error message before ending
          try {
            res.write(JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              method: "connection_error",
              params: {
                error: "connection_failed",
                message: "Connection could not be maintained after multiple recovery attempts.",
                guidance: "Please reconnect using the correct endpoint (/mcp) and port. Check server logs for more information."
              }
            }) + '\n');
          } catch (e) {
            // Ignore any errors when sending final message
          }
          
          // Attempt to end the response gracefully
          try {
            res.end();
          } catch (error) {
            // Ignore any errors when ending the response
          }
        }
      } else {
        // Successful ping resets reconnect counter
        if (reconnectAttempts > 0) {
          reconnectAttempts = 0;
          if (!silent) {
            console.error(`Connection recovered for ${sessionId}`);
          }
          
          // Send recovery confirmation
          sendMessage({
            jsonrpc: "2.0",
            id: null,
            method: "recovery_success",
            params: {
              timestamp: Date.now(),
              sessionId: sessionId,
              message: "Connection successfully recovered."
            }
          });
        }
      }
    } catch (error) {
      // Connection might be closed
      connectionActive = false;
      clearInterval(keepAliveInterval);
      if (!silent) {
        console.error(`Error in keep-alive for ${sessionId}: ${error}`);
      }
    }
  }, 5000); // Keep-alive interval at 5 seconds
  
  // Handle client disconnect
  req.on('close', () => {
    connectionActive = false;
    clearInterval(keepAliveInterval);
    if (!silent) {
      console.error(`HTTP Stream client disconnected: ${sessionId}`);
    }
  });
  
  // Handle aborted requests
  req.on('aborted', () => {
    connectionActive = false;
    clearInterval(keepAliveInterval);
    if (!silent) {
      console.error(`Request aborted for session ${sessionId}`);
    }
  });
  
  // Handle timeout
  req.on('timeout', () => {
    connectionActive = false;
    clearInterval(keepAliveInterval);
    if (!silent) {
      console.error(`Request timeout for session ${sessionId}`);
    }
  });
}

// Define MCP Stream endpoints
// Primary MCP endpoint - GET /mcp
app.get('/mcp', (req: Request, res: Response) => {
  const silent = process.env.SILENT === "true" || false;
  if (!silent) {
    console.error('Received GET request to standard /mcp endpoint');
  }
  handleStreamResponse(req, res, silent);
});

// Primary MCP endpoint - POST /mcp
app.post('/mcp', (req: Request, res: Response) => {
  const silent = process.env.SILENT === "true" || false;
  if (!silent) {
    console.error('Received POST request to standard /mcp endpoint');
  }
  handleStreamResponse(req, res, silent);
});

// Legacy endpoint - GET /stream redirects to /mcp
app.get('/stream', (req: Request, res: Response) => {
  const silent = process.env.SILENT === "true" || false;
  if (!silent) {
    console.error('Received GET request to legacy /stream endpoint - redirecting to /mcp');
  }
  // Redirect to the standard /mcp endpoint
  res.redirect('/mcp');
});

// Legacy endpoint - POST /stream handles directly as /mcp
app.post('/stream', (req: Request, res: Response) => {
  const silent = process.env.SILENT === "true" || false;
  if (!silent) {
    console.error('Received POST request to legacy /stream endpoint - handling as /mcp');
  }
  // Directly handle as /mcp since POST redirects may lose data
  handleStreamResponse(req, res, silent);
});

// Handle preflight OPTIONS requests for CORS
app.options('/mcp', (req: Request, res: Response) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-api-key, Mcp-Session-Id, Last-Event-ID, *');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Handle preflight OPTIONS requests for CORS on legacy endpoint
app.options('/stream', (req: Request, res: Response) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-api-key, Mcp-Session-Id, Last-Event-ID, *');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Get documentation
app.get('/api/docs', async (req: Request, res: Response) => {
  try {
    const result = await pytestDocsGuideTool.execute({
      topic: req.query.topic as string
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error retrieving documentation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get failure analytics
app.get('/api/analytics', async (req: Request, res: Response) => {
  try {
    const result = await failureAnalyticsTool.execute({
      group_by: req.query.group_by as string,
      time_range: req.query.time_range as string,
      include_resolved: req.query.include_resolved === 'true'
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate debug prompt
app.get('/api/prompt', async (req: Request, res: Response) => {
  try {
    const result = await failurePromptGeneratorTool.execute({
      group_id: req.query.group_id as string,
      failure_id: req.query.failure_id as string,
      prompt_style: req.query.prompt_style as string
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error generating debug prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all failures
app.get('/api/failures', async (req: Request, res: Response) => {
  try {
    const result = await listFailuresTool.execute({
      status: req.query.status as string
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error listing failures:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register a new failure
app.post('/api/failures', async (req: Request, res: Response) => {
  try {
    const result = await pytestFailureTool.execute(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error registering failure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get failure info
app.get('/api/failures/:id', async (req: Request, res: Response) => {
  try {
    const result = await getFailureInfoTool.execute({
      failure_id: req.params.id
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error getting failure info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply debugging principle
app.post('/api/debug', async (req: Request, res: Response) => {
  try {
    const result = await debugWithPrincipleTool.execute({
      failure_id: req.body.failure_id,
      principle_number: req.body.principle_number,
      analysis: req.body.analysis
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error applying debug principle:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from web UI build directory if it exists
const WEB_UI_BUILD_DIR = path.join(PACKAGE_ROOT, 'web-ui/build');
if (fs.existsSync(WEB_UI_BUILD_DIR)) {
  console.error(`Serving web UI from ${WEB_UI_BUILD_DIR}`);
  app.use(express.static(WEB_UI_BUILD_DIR));
  
  // For any routes that don't match the API, serve the index.html
  app.get('*', (req: Request, res: Response) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path === '/health' || 
        req.path === '/sse' || req.path === '/stream' || req.path === '/mcp') {
      return res.status(404).json({ 
        error: 'API endpoint not found',
        message: 'The requested endpoint does not exist. Use /mcp for MCP connections.'
      });
    }
    
    res.sendFile(path.join(WEB_UI_BUILD_DIR, 'index.html'));
  });
} else {
  console.error(`Web UI build directory not found at ${WEB_UI_BUILD_DIR}`);
  console.error('Run "cd web-ui && npm run build" to create the web UI build');
}

// Start server
// Updated to accept silent parameter and handle port conflicts
export function startServer(port = PORT, silent: boolean = false) {
  // Improved port finding with better randomization
  const findAvailablePort = async (startPort: number, range: number = 1000): Promise<number> => {
    // Ensure numeric port
    const start = typeof startPort === 'string' ? parseInt(startPort, 10) : startPort;
    
    // Function to check if a port is available
    const isPortAvailable = (port: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => {
          resolve(false); // Port is in use
        });
        server.once('listening', () => {
          server.close();
          resolve(true); // Port is available
        });
        server.listen(port);
      });
    };
    
    // Try the requested port first
    if (await isPortAvailable(start)) {
      return start;
    }
    
    // If not available, try sequential ports within range
    for (let i = 1; i < 20; i++) {
      const testPort = start + i;
      if (await isPortAvailable(testPort)) {
        return testPort;
      }
    }
    
    // If still not found, try random ports within the range
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomPort = start + Math.floor(Math.random() * range);
      if (await isPortAvailable(randomPort)) {
        return randomPort;
      }
    }
    
    // Last resort - try a completely different range
    const fallbackPort = 8000 + Math.floor(Math.random() * 2000);
    return fallbackPort;
  };

  // Enhanced tryListen function with better error handling
  const tryListen = async (retry = 0, maxRetries = 5): Promise<number> => {
    if (retry > maxRetries) {
      throw new Error(`Failed to start server after ${maxRetries} retries`);
    }
    
    try {
      // Find an available port - ensure numeric port
      const numericPort = typeof port === 'string' ? parseInt(port, 10) : port;
      const availablePort = await findAvailablePort(numericPort);
      
      return new Promise<number>((resolve, reject) => {
        const server = app.listen(availablePort)
          .on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              if (!silent) {
                console.error(`Port ${availablePort} is in use, trying another port...`);
              }
              // Close the server and try again
              server.close();
              tryListen(retry + 1, maxRetries)
                .then(resolve)
                .catch(reject);
            } else {
              reject(err);
            }
          })
          .on('listening', () => {
            const actualPort = (server.address() as any).port;
            // Store the port in environment variables for other components
            process.env.HTTP_PORT = actualPort.toString();
            process.env.MCP_PORT = actualPort.toString();
            
            if (!silent) {
              console.error(`HTTP server running on port ${actualPort}`);
              console.error(`API endpoints:`);
              console.error(`  GET  /health - Health check`);
              console.error(`  GET  /api/docs - Get documentation about using the server`);
              console.error(`  GET  /api/failures - List all failures`);
              console.error(`  POST /api/failures - Register a new failure`);
              console.error(`  GET  /api/failures/:id - Get failure info`);
              console.error(`  POST /api/debug - Apply debugging principle`);
              console.error(`  GET  /api/analytics - Analyze and group failures`);
              console.error(`  GET  /api/prompt - Generate debugging prompts for failures`);
              console.error(`  GET  /mcp - STANDARD MCP endpoint for client connections`);
              console.error(`  POST /mcp - STANDARD MCP endpoint for client connections`);
              console.error(`  GET  /stream - Legacy alias that redirects to /mcp (for backward compatibility)`);
              console.error(`  GET  /sse - SSE transport endpoint (if enabled)`);
              console.error(`Web UI available at http://localhost:${actualPort}`);
              
              // Important note to guide users
              console.error(`===============================================================`);
              console.error(`IMPORTANT CONFIGURATION NOTES:`);
              console.error(`✓ MCP Server is using port ${actualPort}`);
              console.error(`✓ Always use the /mcp endpoint for MCP connections`);
              console.error(`✓ Client connection URL should be: http://localhost:${actualPort}/mcp`);
              console.error(`===============================================================`);
            }
            resolve(actualPort);
          });
      });
    } catch (error) {
      if (!silent) {
        console.error(`Error finding available port: ${error}`);
      }
      
      // Try again with a different starting port - using numeric value
      port = 8000 + Math.floor(Math.random() * 2000);
      return tryListen(retry + 1, maxRetries);
    }
  };
  
  return tryListen();
}

export default app; 