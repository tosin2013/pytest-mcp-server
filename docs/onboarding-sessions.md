# Technical Onboarding Sessions

This document outlines a series of onboarding sessions for new technical developers joining the Pytest MCP Server project. Each session focuses on different aspects of the architecture and implementation.

## Session 1: Project Overview and Architecture

**Duration**: 2 hours

**Topics**:
1. Introduction to the project's purpose and goals
2. Overview of the 9 principles of debugging
3. High-level architecture and bounded contexts
4. Key design decisions
5. Development environment setup

**Key Diagrams**:
- System component diagram
- Bounded contexts diagram
- Main aggregates and entities

**Hands-on Activities**:
- Set up the development environment
- Run the MCP server and HTTP server
- Register a sample test failure
- Navigate the web UI

## Session 2: Core Domain Models and Tools

**Duration**: 2 hours

**Topics**:
1. Deep dive into domain models (FailureRecord, DebugSession, FailureGroup)
2. MCP Tool structure and implementation
3. JSON file-based persistence
4. Tool discovery and registration

**Key Diagrams**:
- Domain model class diagrams
- Tool relationship diagrams
- Data storage structure

**Hands-on Activities**:
- Examine the JSON data structures
- Trace the execution flow of registering a failure
- Modify an existing tool to add a minor feature
- Implement a simple test tool

## Session 3: Multi-Interface Architecture

**Duration**: 2 hours

**Topics**:
1. MCP server implementation and protocol
2. HTTP/REST API design
3. Interface mapping and consistency
4. Web UI architecture and components

**Key Diagrams**:
- Multi-interface architecture
- HTTP endpoint to tool mapping
- Web UI component hierarchy

**Hands-on Activities**:
- Invoke tools via the MCP protocol
- Make REST API calls
- Examine the web UI component structure
- Add a simple HTTP endpoint and React component

## Session 4: Debugging Process and Workflow

**Duration**: 2 hours

**Topics**:
1. The 9 principles of debugging in depth
2. Debug session structure and state management
3. Debug step progression and analysis
4. Debug visualization and reporting

**Key Diagrams**:
- Debug session state machine
- Debug process sequence diagram
- Debug principle relationships

**Hands-on Activities**:
- Walk through a complete debugging session
- Apply each debugging principle to a sample failure
- Examine the captured analysis at each step
- Visualize the debugging progress

## Session 5: Analytics and Failure Grouping

**Duration**: 2 hours

**Topics**:
1. Failure analytics algorithms and strategies
2. Grouping mechanisms and criteria
3. Debug prompt generation
4. Analytics visualization and insights

**Key Diagrams**:
- Failure grouping strategies
- Analytics data flow
- Prompt generation templates

**Hands-on Activities**:
- Analyze a set of failures using different grouping criteria
- Generate debug prompts for specific failure types
- Implement a simple custom grouping strategy
- Create an analytics visualization

## Session 6: Integration and Deployment

**Duration**: 2 hours

**Topics**:
1. Pytest client integration
2. Claude Desktop integration
3. Deployment strategies and considerations
4. Monitoring and maintenance

**Key Diagrams**:
- Integration architecture
- Deployment workflow
- Client-server interaction

**Hands-on Activities**:
- Set up a pytest project with the client
- Integrate with Claude Desktop
- Deploy the server and web UI
- Monitor and debug the live system

## Session 7: Extending the System

**Duration**: 2 hours

**Topics**:
1. Adding new tools and capabilities
2. Extending the web UI
3. Implementing new debugging features
4. Best practices and coding standards

**Key Diagrams**:
- Extension points
- Feature implementation workflow
- Code organization guidelines

**Hands-on Activities**:
- Design and implement a new tool
- Add a new web UI feature
- Create a new debugging capability
- Review and refine the implementation

## Further Learning Resources

### Documentation
- [Architecture Decision Records](./adrs/)
- [Developer Onboarding Guide](./developer-onboarding.md)
- [API Documentation](./api-docs.md)

### External Resources
- [Domain-Driven Design](https://domaindrivendesign.org/)
- [9 Rules of Debugging](https://debuggingrules.com/)
- [Model Context Protocol](https://github.com/anthropic-labs/mcp-specification)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)

### Code Examples
- [Sample Tool Implementation](../src/tools/PytestFailureTool.ts)
- [HTTP Server Implementation](../src/http-server.ts)
- [Web UI Components](../web-ui/src/components/) 