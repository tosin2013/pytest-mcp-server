# Pytest MCP Server

A Model Context Protocol (MCP) server designed to help track pytest failures and resolve errors faster using the 9 principles of debugging.

## Overview

This MCP server provides tools for:

1. Registering pytest failures
2. Debugging failures using systematic debugging principles
3. Tracking the debug progress
4. Retrieving failure information
5. Analyzing and grouping similar failures
6. Generating targeted debugging prompts for LLMs

The server enables Large Language Models (LLMs) like Claude to systematically debug test failures using David Agans' 9 Rules of Debugging:

1. **Understand the System** - Gain high-level awareness of the code and test behavior
2. **Make It Fail** - Reproduce the failure consistently, eliminate flakiness
3. **Quit Thinking and Look** - Examine actual runtime values and unexpected behavior
4. **Divide and Conquer** - Narrow down where in the code the issue is occurring
5. **Change One Thing at a Time** - Test isolated changes to validate hypotheses
6. **Keep an Audit Trail** - Track changes and their effects during debugging
7. **Check the Plug** - Verify basic configuration and environment issues
8. **Get a Fresh View** - Approach the problem from a different perspective
9. **If You Didn't Fix It, It Ain't Fixed** - Verify your solution works and addresses root causes

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A pytest project to debug

### Install the MCP Server

#### Option 1: Using npm (recommended)

```bash
# Install the package globally
npm install -g pytest-mcp-server

# Start the server
pytest-mcp-server start
```

#### Option 2: From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/pytest-mcp-server.git
cd pytest-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Running the MCP Server

### When installed via npm

```bash
# Start the server with default settings
pytest-mcp-server start

# Use a different port
pytest-mcp-server start --port 8080

# Specify a custom data directory
pytest-mcp-server start --data-dir ./my-data
```

### When installed from source

```bash
# Start the MCP server
npm start

# Build and start the HTTP server with web UI
npm run build:all
npm run start-http
```

The web UI will be available at http://localhost:3000

## Using with Claude Desktop

To use the server with Claude Desktop, add the following to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pytest-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/pytest-mcp-server/dist/index.js"]
    }
  }
}
```

## Pytest Integration

To integrate with pytest, you'll need to install and configure the pytest-mcp plugin:

```bash
pip install pytest-mcp
```

Create a `conftest.py` file in your pytest project with the following content:

```python
# conftest.py
import json
import requests
from pathlib import Path
import pytest
import traceback

def pytest_sessionstart(session):
    """Called after the Session object has been created and before tests are collected."""
    print("Starting test session with MCP integration")

def pytest_runtest_makereport(item, call):
    """Called when a test completes to build a report for the test."""
    if call.when == "call" and call.excinfo:
        # Only report when actual test calls fail
        tb_str = ''.join(traceback.format_exception(*call.excinfo._excinfo))
        
        # Extract locals from the frame where the test failed
        locals_dict = {}
        if call.excinfo.traceback:
            tb = call.excinfo.traceback[-1]  # Get the last frame in the traceback
            if hasattr(tb, 'locals'):
                locals_dict = tb.locals
        
        # Filter out non-serializable objects from locals
        filtered_locals = {}
        for key, value in locals_dict.items():
            try:
                # Try to serialize the value to test serializability
                json.dumps({key: str(value)})
                filtered_locals[key] = str(value)
            except (TypeError, OverflowError, ValueError):
                filtered_locals[key] = f"<non-serializable: {type(value).__name__}>"
        
        # Get source line number where the failure occurred
        line_number = item.function.__code__.co_firstlineno
        if call.excinfo.traceback:
            line_number = call.excinfo.traceback[-1].lineno
        
        # Prepare data to send to MCP server
        failure_data = {
            "test_name": item.name,
            "file_path": str(Path(item.fspath).resolve()),
            "line_number": line_number,
            "error_message": str(call.excinfo.value),
            "traceback": tb_str,
            "locals": filtered_locals
        }
        
        # Print debug info
        print("\n===== MCP Test Failure Registration =====")
        print(f"Test: {failure_data['test_name']}")
        print(f"File: {failure_data['file_path']}")
        print(f"Line: {failure_data['line_number']}")
        print(f"Error: {failure_data['error_message']}")
        
        # Send to MCP server - try both the HTTP API and MCP protocol
        endpoints = [
            "http://localhost:3000/api/failures",  # HTTP API endpoint
            "http://localhost:3000/mcp/failures"   # MCP protocol endpoint (if configured)
        ]
        
        success = False
        for endpoint in endpoints:
            try:
                response = requests.post(
                    endpoint, 
                    json=failure_data,
                    headers={"Content-Type": "application/json"},
                    timeout=5  # Set a timeout to avoid hanging
                )
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Failure registered with MCP server at {endpoint}")
                    print(f"🔍 Failure ID: {result.get('failureId')}")
                    print(f"🔍 Session ID: {result.get('sessionId')}")
                    success = True
                    break
                else:
                    print(f"❌ Failed to register failure with MCP server at {endpoint}: {response.status_code}")
                    print(f"Response: {response.text}")
            except requests.RequestException as e:
                print(f"❌ Error connecting to MCP server at {endpoint}: {e}")
        
        if not success:
            print("⚠️ Could not register failure with any MCP server endpoint")
```

## Using with Claude

Once you have failures registered with the MCP server, you can use Claude to debug them:

1. Open Claude Desktop
2. Ask questions like:
   - "I have a pytest failure. Can you help me debug it using the pytest-mcp-server?"
   - "List all the pytest failures in the server and help me debug the most recent one."
   - "Apply the 'Divide and Conquer' debugging principle to my latest test failure."
   - "Analyze my test failures and identify common patterns."
   - "Generate a detailed debug prompt for my TypeError failures."

## Web UI Features

The pytest-mcp-server includes a web interface for visualizing and interacting with test failures:

### Dashboard

- Failure count by status (new, in-progress, resolved)
- Recent failures list
- Debugging progress charts

## Architecture Documentation

To understand the architectural decisions and domain design of this project, explore our Architecture Decision Records (ADRs):

1. [MCP Tools Architecture](docs/adrs/001-mcp-tools-architecture.md) - Core tool-based approach for implementing debugging capabilities
2. [JSON File-Based Storage](docs/adrs/002-json-file-storage.md) - Data persistence strategy using JSON files
3. [Debugging Principles Process](docs/adrs/003-debugging-principles-process.md) - Implementation of the 9 principles of debugging workflow
4. [Analytics and Failure Grouping](docs/adrs/004-analytics-and-failure-grouping.md) - Approach for analyzing and grouping similar failures
5. [Multi-Interface Architecture](docs/adrs/005-multi-interface-architecture.md) - Design for supporting both MCP and HTTP interfaces
6. [Automated npm.js Package Publishing](docs/adrs/006-npm-package-publishing.md) - Strategy for distributing the package via npm.js using GitHub Actions

Additional architecture documentation:
- [Architecture Overview](docs/architecture-overview.md) - High-level system architecture from a Domain-Driven Design perspective
- [Developer Onboarding Guide](docs/developer-onboarding.md) - Comprehensive guide for new developers
- [Onboarding Sessions](docs/onboarding-sessions.md) - Structured training session outlines
- Failure group analytics
- Trending error types

### Failure Analytics

- Group failures by error type, file path, or pattern
- Filter by time ranges (today, week, month, all time)
- Visualize error trends and most frequent failure locations
- Auto-generated root cause hypotheses
- Priority ranking of failures

### Debugging Interface

- Apply and track the 9 debugging principles
- AI-assisted prompt generation
- One-click application of common solutions
- Debugging history timeline

## MCP Tools 

### 1. Register Pytest Failure

Registers a new test failure for debugging.

Parameters:
- `test_name`: Name of the failing test
- `file_path`: Path to the file containing the test
- `line_number`: Line number of the failure
- `error_message`: Error message from the test failure
- `traceback`: Full traceback of the failure
- `locals`: Local variables at the point of failure (optional)

### 2. Debug with Principle

Apply a debugging principle to a pytest failure and record the analysis.

Parameters:
- `failure_id`: ID of the test failure to debug
- `principle_number`: Number of the debugging principle to apply (1-9, optional)
- `analysis`: Your analysis of the test failure using the specified debugging principle

### 3. Get Failure Info

Get information about a pytest failure and its debugging progress.

Parameters:
- `failure_id`: ID of the test failure to get information about

### 4. List Failures

List all pytest failures with optional status filtering.

Parameters:
- `status`: Optional status filter (e.g., 'new', 'in_progress', 'resolved')

### 5. Analyze Failures

Group and analyze similar test failures, generate insights, and automate triage.

Parameters:
- `group_by`: Method to group failures (error_type, file_path, pattern)
- `time_range`: Time range for analysis (all, today, week, month)
- `include_resolved`: Whether to include resolved failures in the analysis

### 6. Generate Debug Prompt

Create targeted debugging prompts for LLM-based debugging.

Parameters:
- `group_id`: ID of the failure group to generate a prompt for (optional)
- `failure_id`: ID of a specific failure to generate a prompt for (optional)
- `prompt_style`: Style of prompt to generate (detailed, concise, step_by_step, root_cause)

### 7. Get Documentation

Get information about using the pytest-mcp-server.

Parameters:
- `topic`: Optional topic to get documentation for (general, integration, principles, api, client, webui, analytics, prompts)

## Command-Line Interface

The pytest-mcp-server includes a Python client for interacting with the server:

```bash
# Register a test failure
python test-client.py --action register

# List all failures
python test-client.py --action list

# Get details about a failure
python test-client.py --action info --failure-id <failure_id>

# Apply a debugging principle
python test-client.py --action debug --failure-id <failure_id> --principle <1-9> --analysis "Your analysis..."

# Analyze failures and create groups
python test-client.py --action analyze --group-by error_type

# Generate a debug prompt
python test-client.py --action prompt --failure-id <failure_id> --style detailed

# Run a full demo
python test-client.py --action demo
```

## Development

### Project Structure

```
pytest-mcp-server/
├── src/
│   ├── tools/
│   │   ├── PytestFailureTool.ts        # Tool for registering failures
│   │   ├── DebugWithPrincipleTool.ts   # Tool for applying debugging principles
│   │   ├── GetFailureInfoTool.ts       # Tool for getting failure info
│   │   ├── ListFailuresTool.ts         # Tool for listing failures
│   │   ├── FailureAnalyticsTool.ts     # Tool for analyzing and grouping failures
│   │   ├── FailurePromptGeneratorTool.ts # Tool for generating debug prompts
│   │   └── PytestDocsGuideTool.ts      # Tool for providing documentation
│   ├── cli.ts                          # Command-line interface for npm package
│   ├── http-server.ts                  # HTTP API server
│   └── index.ts                        # Server entry point
├── .github/
│   └── workflows/
│       └── npm-publish.yml             # GitHub Actions workflow for npm publishing
├── data/                               # Data storage directory (created at runtime)
│   ├── failures.json                   # Stored failures
│   ├── debug_sessions.json             # Debug session data
│   └── failure_groups.json             # Failure grouping data
├── web-ui/                             # React-based web interface
│   ├── src/                            # Web UI source code
│   │   ├── components/                 # React components
│   │   ├── services/                   # API services
│   │   └── pages/                      # Page components
│   └── package.json                    # Web UI dependencies
├── test-client.py                      # Python test client
├── package.json                        # Server dependencies
└── tsconfig.json                       # TypeScript configuration
```

### Publishing to npm.js

The project uses GitHub Actions to automate the npm publishing process. To release a new version:

1. Update the version in `package.json` (following semantic versioning)
2. Create and push your changes
3. Create a new GitHub release with tag `v{version}` (e.g., `v1.0.1`)
4. The GitHub Actions workflow will automatically publish the new version to npm.js

You can also manually trigger the workflow from the GitHub Actions tab.

### Building Custom Tools

To add a new tool, create a new TypeScript file in the `src/tools` directory:

```typescript
import { MCPTool } from "mcp-framework";
import { z } from "zod";

interface YourToolInput {
  param1: string;
  param2: number;
}

class YourTool extends MCPTool<YourToolInput> {
  name = "your_tool_name";
  description = "Description of your tool";

  schema = {
    param1: {
      type: z.string(),
      description: "Description of param1",
    },
    param2: {
      type: z.number(),
      description: "Description of param2",
    },
  };

  async execute(input: YourToolInput) {
    // Tool implementation
    return {
      result: "Your result here"
    };
  }
}

export default YourTool;
```

## HTTP API Endpoints

The server provides a RESTful HTTP API for programmatic access:

- **GET /api/failures** - List all registered failures
- **POST /api/failures** - Register a new test failure
- **GET /api/failures/:id** - Get details about a specific failure
- **POST /api/debug** - Apply a debugging principle to a failure
- **GET /api/analytics** - Get analytics and grouping for test failures
- **GET /api/prompts/:id** - Generate a debugging prompt for a failure or group
- **GET /api/docs** - Get documentation about using the server

For full API documentation, see the [API Documentation](http://localhost:3000/docs).

## License

MIT
