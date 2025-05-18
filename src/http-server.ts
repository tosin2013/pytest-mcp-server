import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const PORT = process.env.PORT || 3000;

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
function handleStreamResponse(req: Request, res: Response) {
  // Set headers for streaming response
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Create a session ID for this connection
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  // Send initial response to confirm connection
  const initialMessage = JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    method: "connection",
    params: {
      sessionId: sessionId,
      serverInfo: {
        name: "pytest-mcp-server",
        version: process.env.npm_package_version || "1.0.0"
      }
    }
  });
  
  res.write(initialMessage + '\n');
  
  // Keep-alive interval
  const keepAliveInterval = setInterval(() => {
    try {
      const pingMessage = JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        method: "ping",
        params: {
          timestamp: Date.now(),
          sessionId: sessionId
        }
      });
      res.write(pingMessage + '\n');
    } catch (error) {
      // Connection might be closed
      clearInterval(keepAliveInterval);
    }
  }, 15000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    console.log(`HTTP Stream client disconnected: ${sessionId}`);
  });
}

// Add an HTTP Stream endpoint
app.get('/stream', (req: Request, res: Response) => {
  console.log('New HTTP Stream connection established');
  handleStreamResponse(req, res);
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
  console.log(`Serving web UI from ${WEB_UI_BUILD_DIR}`);
  app.use(express.static(WEB_UI_BUILD_DIR));
  
  // For any routes that don't match the API, serve the index.html
  app.get('*', (req: Request, res: Response) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path === '/health' || 
        req.path === '/sse' || req.path === '/stream') {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(WEB_UI_BUILD_DIR, 'index.html'));
  });
} else {
  console.log(`Web UI build directory not found at ${WEB_UI_BUILD_DIR}`);
  console.log('Run "cd web-ui && npm run build" to create the web UI build');
}

// Start server
// Remove the auto-starting app.listen() call and replace with a function
export function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
    console.log(`API endpoints:`);
    console.log(`  GET  /health - Health check`);
    console.log(`  GET  /api/docs - Get documentation about using the server`);
    console.log(`  GET  /api/failures - List all failures`);
    console.log(`  POST /api/failures - Register a new failure`);
    console.log(`  GET  /api/failures/:id - Get failure info`);
    console.log(`  POST /api/debug - Apply debugging principle`);
    console.log(`  GET  /api/analytics - Analyze and group failures`);
    console.log(`  GET  /api/prompt - Generate debugging prompts for failures`);
    console.log(`  GET  /stream - HTTP Stream transport endpoint (if enabled)`);
    console.log(`  GET  /sse - SSE transport endpoint (if enabled)`);
    console.log(`Web UI available at http://localhost:${port}`);
  });
}

export default app; 