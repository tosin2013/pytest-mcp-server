# Pytest MCP Server Architecture Overview

This document provides a high-level overview of the Pytest MCP Server architecture from a Domain-Driven Design perspective.

## Architecture Diagram

```mermaid
graph TD
    classDef userInterfaces fill:#f9d5e5,stroke:#333,stroke-width:1px
    classDef applicationLayer fill:#eeac99,stroke:#333,stroke-width:1px
    classDef domainLayer fill:#e06377,stroke:#333,stroke-width:1px
    classDef infrastructureLayer fill:#c83349,stroke:#333,stroke-width:1px
    classDef storageLayer fill:#5b9aa0,stroke:#333,stroke-width:1px

    %% User Interface Layer
    subgraph "User Interface Layer"
        Claude[Claude/LLM Interface]:::userInterfaces
        WebUI[Web UI]:::userInterfaces
        PytestClient[Pytest Client]:::userInterfaces
    end

    %% Application Layer
    subgraph "Application Layer"
        MCPServer[MCP Server]:::applicationLayer
        HTTPServer[HTTP Server]:::applicationLayer
    end

    %% Domain Layer - Bounded Contexts
    subgraph "Domain Layer"
        
        subgraph "Test Failure Management BC"
            PytestFailureTool[PytestFailureTool]:::domainLayer
            GetFailureInfoTool[GetFailureInfoTool]:::domainLayer
            ListFailuresTool[ListFailuresTool]:::domainLayer
        end
        
        subgraph "Debugging Process BC"
            DebugWithPrincipleTool[DebugWithPrincipleTool]:::domainLayer
            PytestDocsGuideTool[PytestDocsGuideTool]:::domainLayer
            DebugProcess[Debug Process - 9 Principles]:::domainLayer
        end
        
        subgraph "Analytics and Reporting BC"
            FailureAnalyticsTool[FailureAnalyticsTool]:::domainLayer
            FailurePromptGeneratorTool[FailurePromptGeneratorTool]:::domainLayer
            FailureGrouping[Failure Grouping]:::domainLayer
        end
        
    end

    %% Infrastructure Layer
    subgraph "Infrastructure Layer"
        ToolRegistry[Tool Registry & Discovery]:::infrastructureLayer
        FileOperations[File Operations]:::infrastructureLayer
    end

    %% Storage Layer
    subgraph "Storage Layer"
        FailuresJSON[failures.json]:::storageLayer
        DebugSessionsJSON[debug_sessions.json]:::storageLayer
        FailureGroupsJSON[failure_groups.json]:::storageLayer
    end

    %% Connections - User Interface to Application
    Claude -->|"invokes tools via MCP protocol"| MCPServer
    WebUI -->|"HTTP requests"| HTTPServer
    PytestClient -->|"HTTP requests"| HTTPServer

    %% Connections - Application to Domain
    MCPServer -->|"discovers and invokes"| ToolRegistry
    HTTPServer -->|"maps endpoints to tools"| PytestFailureTool
    HTTPServer -->|"maps endpoints to tools"| DebugWithPrincipleTool
    HTTPServer -->|"maps endpoints to tools"| GetFailureInfoTool
    HTTPServer -->|"maps endpoints to tools"| ListFailuresTool
    HTTPServer -->|"maps endpoints to tools"| FailureAnalyticsTool
    HTTPServer -->|"maps endpoints to tools"| FailurePromptGeneratorTool
    HTTPServer -->|"maps endpoints to tools"| PytestDocsGuideTool

    %% Connections - Tool Registry to Domain
    ToolRegistry -->|"registers"| PytestFailureTool
    ToolRegistry -->|"registers"| DebugWithPrincipleTool
    ToolRegistry -->|"registers"| GetFailureInfoTool
    ToolRegistry -->|"registers"| ListFailuresTool
    ToolRegistry -->|"registers"| FailureAnalyticsTool
    ToolRegistry -->|"registers"| FailurePromptGeneratorTool
    ToolRegistry -->|"registers"| PytestDocsGuideTool

    %% Connections - Domain to Infrastructure
    PytestFailureTool -->|"uses"| FileOperations
    DebugWithPrincipleTool -->|"uses"| FileOperations
    GetFailureInfoTool -->|"uses"| FileOperations
    ListFailuresTool -->|"uses"| FileOperations
    FailureAnalyticsTool -->|"uses"| FileOperations
    FailurePromptGeneratorTool -->|"uses"| FileOperations

    %% Connections - Domain Internal
    PytestFailureTool -->|"initializes"| DebugProcess
    DebugWithPrincipleTool -->|"advances"| DebugProcess
    FailureAnalyticsTool -->|"uses"| FailureGrouping

    %% Connections - Infrastructure to Storage
    FileOperations -->|"reads/writes"| FailuresJSON
    FileOperations -->|"reads/writes"| DebugSessionsJSON
    FileOperations -->|"reads/writes"| FailureGroupsJSON
```

## Architecture Layers

### User Interface Layer
This layer provides various interfaces for interacting with the system:
- **Claude/LLM Interface**: Allows LLMs like Claude to interact with the system via the Model Context Protocol
- **Web UI**: React-based user interface for human interaction
- **Pytest Client**: Python client for direct integration with pytest test runs

### Application Layer
This layer coordinates the application's activities:
- **MCP Server**: Handles MCP protocol requests, tool discovery, and invocation
- **HTTP Server**: Provides RESTful API endpoints and serves the web UI

### Domain Layer
This layer contains the core business logic organized into bounded contexts:

#### Test Failure Management BC
- **PytestFailureTool**: Registers test failures
- **GetFailureInfoTool**: Retrieves failure information
- **ListFailuresTool**: Lists all failures

#### Debugging Process BC
- **DebugWithPrincipleTool**: Applies debugging principles
- **PytestDocsGuideTool**: Provides documentation and guidance
- **Debug Process**: Implements the 9 principles of debugging workflow

#### Analytics and Reporting BC
- **FailureAnalyticsTool**: Analyzes and groups failures
- **FailurePromptGeneratorTool**: Generates debugging prompts
- **Failure Grouping**: Implements strategies for grouping similar failures

### Infrastructure Layer
This layer provides technical capabilities to support the system:
- **Tool Registry & Discovery**: Discovers and registers MCP tools
- **File Operations**: Handles reading and writing to JSON files

### Storage Layer
This layer persists data:
- **failures.json**: Stores failure records
- **debug_sessions.json**: Stores debugging sessions
- **failure_groups.json**: Stores failure grouping analytics

## Key Domain Aggregates

### Failure Aggregate
- Root entity: `FailureRecord`
- Contains information about a test failure, its status, and related debug sessions

### Debug Session Aggregate
- Root entity: `DebugSession`
- Contains a sequence of `DebugStep` entities representing the application of each debugging principle

### Failure Group Aggregate
- Root entity: `FailureGroup`
- Contains references to multiple failures that share common characteristics

## Architecture Patterns

1. **Tool-Based Architecture**: Each capability is implemented as a separate `MCPTool`
2. **File-Based Storage**: Simple key-value storage in JSON files
3. **Multi-Interface Design**: Supports both MCP for LLMs and HTTP/REST for web clients
4. **Process-Oriented Debugging**: Structured workflow based on the 9 principles of debugging 