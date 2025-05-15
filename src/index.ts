import { MCPServer } from "mcp-framework";

// Explicitly import all tools to ensure they're registered
import "./tools/PytestFailureTool.js";
import "./tools/DebugWithPrincipleTool.js";
import "./tools/GetFailureInfoTool.js";
import "./tools/ListFailuresTool.js";
import "./tools/PytestDocsGuideTool.js";
import "./tools/FailureAnalyticsTool.js";
import "./tools/FailurePromptGeneratorTool.js";

// Create an instance of the MCP server
// Tools will be automatically discovered from the src/tools directory
const server = new MCPServer();

// Start the server
server.start()
  .then(() => {
    console.log("Pytest MCP Server started successfully with 9 debugging principles!");
    console.log("Analytics tools enabled for failure grouping and automatic triage.");
  })
  .catch((error) => {
    console.error("Server startup error:", error);
    process.exit(1);
  });