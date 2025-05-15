# Developer Onboarding Guide: Pytest MCP Server

This guide provides a comprehensive introduction to the architecture and design of the Pytest MCP Server project for new technical developers joining the team.

## Project Overview

The Pytest MCP Server is a debugging assistant for pytest test failures that implements the 9 principles of debugging by David Agans. It provides:

1. Automated collection of test failures
2. Structured debugging using the 9 principles
3. Analytics and grouping of similar failures
4. Multiple interfaces for both humans and AI tools

The system enables developers and AI tools like Claude to systematically debug test failures using a proven methodology.

## Key Architecture Concepts

The project follows a Domain-Driven Design approach with several key bounded contexts:

### Bounded Contexts

1. **Test Failure Management**
   - Captures and organizes test failures
   - Handles basic CRUD operations for failures
   - Core entities: `FailureRecord`

2. **Debugging Process**
   - Implements the 9 principles of debugging
   - Manages debugging sessions and progress
   - Core entities: `DebugSession`, `DebugStep`

3. **Analytics and Reporting**
   - Groups similar failures
   - Generates insights and debug prompts
   - Core entities: `FailureGroup`

4. **Infrastructure**
   - Provides multiple interfaces (MCP, HTTP)
   - Handles persistence and communication

### Core Design Patterns

1. **Tool-Based Architecture**
   - Each capability is implemented as a separate `MCPTool`
   - Tools are automatically discovered and registered
   - Tools contain domain logic and handle persistence

2. **JSON File-Based Storage**
   - Simple key-value storage in JSON files
   - No external database dependencies
   - Entities stored in `failures.json`, `debug_sessions.json`, and `failure_groups.json`

3. **Multi-Interface Approach**
   - MCP interface for LLM/AI tool access
   - HTTP/REST API for web and programmatic access
   - React-based web UI for visualization

4. **Structured Debugging Process**
   - Sequential application of 9 debugging principles
   - Tracked progress through debugging steps
   - Captured analysis at each stage

## Technology Stack

- **Backend**
  - TypeScript/Node.js
  - MCP Framework for LLM tool integration
  - Express.js for HTTP API
  - File-based JSON storage

- **Frontend**
  - React.js
  - Axios for API communication
  - CSS for styling

- **Integration**
  - Python pytest client

## Code Organization

```
/
├── src/                  # Main TypeScript source code
│   ├── tools/            # MCP tool implementations
│   │   ├── PytestFailureTool.ts
│   │   ├── DebugWithPrincipleTool.ts
│   │   ├── GetFailureInfoTool.ts
│   │   ├── ListFailuresTool.ts
│   │   ├── PytestDocsGuideTool.ts
│   │   ├── FailureAnalyticsTool.ts
│   │   └── FailurePromptGeneratorTool.ts
│   ├── http-server.ts    # HTTP/REST API
│   ├── index.ts          # MCP server entry point
│   └── types.d.ts        # TypeScript type definitions
├── data/                 # Data storage directory
│   ├── failures.json
│   ├── debug_sessions.json
│   └── failure_groups.json
├── web-ui/               # React web interface
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── App.js        # Main application component
│   │   └── index.js      # React entry point
│   └── public/           # Static assets
├── test-client.py        # Python test client
└── conftest.py           # Pytest integration
```

## Key Domain Models

### FailureRecord

The `FailureRecord` is the central entity for storing information about test failures:

```typescript
interface FailureRecord {
  id: string;
  timestamp: string;
  status: string;  // "new", "in_progress", "resolved"
  current_debug_step: number;
  test_name: string;
  file_path: string;
  line_number: number;
  error_message: string;
  traceback: string;
  locals?: Record<string, any>;
}
```

### DebugSession

The `DebugSession` tracks the debugging process for a failure:

```typescript
interface DebugSession {
  id: string;
  failure_id: string;
  created_at: string;
  debug_steps: DebugStep[];
}

interface DebugStep {
  step: number;
  name: string;
  status: string;  // "pending", "in_progress", "completed"
  started_at: string;
  completed_at: string | null;
  llm_analysis: any | null;
}
```

### FailureGroup

The `FailureGroup` represents a collection of related failures:

```typescript
interface FailureGroup {
  id: string;
  name: string;
  pattern: string;
  failure_ids: string[];
  created_at: string;
}
```

## Interface Implementations

### MCP Tools

Each tool follows this general structure:

```typescript
class SomeTool extends MCPTool<InputType> {
  name = "tool_name";
  description = "Tool description";

  schema = {
    // Parameter schema using zod
  };

  async execute(input: InputType) {
    // Tool implementation that reads/writes to JSON files
    return {
      // Result data
    };
  }
}
```

### HTTP API Endpoints

The HTTP server maps endpoints to tool invocations:

- `GET /api/failures` → `ListFailuresTool`
- `POST /api/failures` → `PytestFailureTool`
- `GET /api/failures/:id` → `GetFailureInfoTool`
- `POST /api/debug` → `DebugWithPrincipleTool`
- `GET /api/analytics` → `FailureAnalyticsTool`
- `GET /api/prompt` → `FailurePromptGeneratorTool`
- `GET /api/docs` → `PytestDocsGuideTool`

## Getting Started

1. **Setup Development Environment**
   ```bash
   npm install
   ```

2. **Build the Project**
   ```bash
   npm run build
   ```

3. **Start the MCP Server**
   ```bash
   npm start
   ```

4. **Start the HTTP Server with Web UI**
   ```bash
   npm run start-http
   ```

## Development Workflow

1. **Adding a New Tool**
   - Create a new TypeScript class in `src/tools/`
   - Extend `MCPTool` from the MCP Framework
   - Implement the required methods
   - Import the tool in `src/index.ts`
   - Add corresponding HTTP endpoint in `src/http-server.ts`

2. **Modifying Data Models**
   - Update the relevant interfaces in `src/types.d.ts`
   - Ensure backward compatibility with existing data
   - Update the schema in the corresponding tools

3. **Adding Web UI Features**
   - Add components in `web-ui/src/components/`
   - Add API services in `web-ui/src/services/api.js`
   - Update the main `App.js` to include new components

## Debugging Sessions Workflow

The core debugging workflow follows these steps:

1. A pytest failure is registered via `PytestFailureTool`
2. A debug session is created with 9 steps (one for each principle)
3. The first principle is applied using `DebugWithPrincipleTool`
4. As each principle is completed, the session advances to the next
5. The debugging progress is tracked and visualized
6. Once all principles are applied, the issue is resolved

## Additional Resources

- [Architecture Decision Records](./adrs/) - Detailed explanations of key architectural decisions
- [9 Rules of Debugging](https://debuggingrules.com/) - The debugging principles by David Agans
- [MCP Framework Documentation](https://github.com/anthropic-labs/mcp-framework) - Documentation for the MCP Framework

## Common Development Tasks

### Adding a New Debugging Feature

1. Identify which tool(s) should implement the feature
2. Update the tool implementation in `src/tools/`
3. Update data structures if necessary
4. Add HTTP endpoints and React components as needed

### Extending Analytics Capabilities

1. Modify the `FailureAnalyticsTool` to implement new analytics
2. Update the `failure_groups.json` structure if needed
3. Add visualization components to the web UI

### Implementing a New Debugging Principle

1. Update the `DebugWithPrincipleTool` to support the new principle
2. Modify the debug session initialization in `PytestFailureTool`
3. Update the web UI to display the new principle 