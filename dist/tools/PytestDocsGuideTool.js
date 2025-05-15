import { MCPTool } from "mcp-framework";
import { z } from "zod";
const DOCS = {
    // General usage
    general: `
# Pytest MCP Server Documentation

The Pytest MCP Server helps track and debug pytest failures using a systematic approach based on
the 9 principles of debugging. This tool provides documentation about how to use the server and its features.

## Core Features

1. **Automated Failure Registration**: Capture test failures and their context
2. **Structured Debugging Process**: Apply the 9 debugging principles systematically
3. **Debugging History**: Track progress and analysis for each failure
4. **Web UI Dashboard**: Visualize failures and debugging status

## Available Tools

- **register_pytest_failure**: Register a test failure for debugging
- **debug_with_principle**: Apply a debugging principle to a failure
- **get_failure_info**: Retrieve information about a failure
- **list_failures**: List all registered failures
- **pytest_docs_guide**: Get documentation about using the server (this tool)
  `,
    // Integration
    integration: `
# Integrating with Pytest

To automatically capture and register test failures from your pytest suite:

## Step 1: Create conftest.py

Add a conftest.py file to your pytest project root with failure registration hooks:

\`\`\`python
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
        print("\\n===== MCP Test Failure Registration =====")
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
\`\`\`

## Step 2: Start the MCP Server

Make sure both server components are running:

\`\`\`bash
# Start the MCP server (in one terminal)
cd /path/to/pytest-mcp-server
npm start

# Start the HTTP server (in another terminal)
cd /path/to/pytest-mcp-server
node dist/http-server.js
\`\`\`

## Step 3: Run Your Tests

Run your pytest suite as normal - failures will be automatically captured and registered:

\`\`\`bash
cd /path/to/your/project
python -m pytest
\`\`\`
  `,
    // Debugging principles
    principles: `
# The 9 Debugging Principles

The pytest-mcp-server uses these 9 principles for systematic debugging:

## 1. Understand the System

**Goal**: Build a mental model of how the code is supposed to work.
**Activities**:
- Review the test's purpose and assertions
- Analyze the functions being tested
- Understand expected behavior vs. actual behavior
- Identify key interfaces and their relationships

## 2. Make It Fail

**Goal**: Ensure you can reliably reproduce the failure.
**Activities**:
- Verify the test fails consistently
- Identify test dependencies and environment factors
- Document the exact steps to reproduce
- Confirm it's not a flaky test

## 3. Quit Thinking and Look

**Goal**: Gather evidence instead of jumping to conclusions.
**Activities**:
- Add logging or print statements
- Use debuggers to inspect runtime values
- Compare expected vs. actual values
- Observe actual behavior without preconceptions

## 4. Divide and Conquer

**Goal**: Narrow down the scope of the problem.
**Activities**:
- Use binary search techniques to isolate the issue
- Test components in isolation
- Comment out code sections to identify failing sections
- Step through the code execution path

## 5. Change One Thing at a Time

**Goal**: Make controlled changes to verify hypotheses.
**Activities**:
- Test one fix at a time
- Document each change and its effect
- Revert changes that don't solve the problem
- Avoid fixing multiple issues at once

## 6. Keep an Audit Trail

**Goal**: Track your debugging process and discoveries.
**Activities**:
- Document all attempted solutions
- Record what worked and what didn't
- Note any patterns or insights
- Build a history of the debugging process

## 7. Check the Plug

**Goal**: Verify basic assumptions and environment issues.
**Activities**:
- Check test environment configuration
- Verify dependencies and versions
- Confirm access to required resources
- Validate test data and fixtures

## 8. Get a Fresh View

**Goal**: Approach the problem from a different perspective.
**Activities**:
- Ask another developer to review the problem
- Explain the issue to someone else
- Try alternative debugging approaches
- Step away and return with fresh eyes

## 9. If You Didn't Fix It, It Ain't Fixed

**Goal**: Verify your solution thoroughly.
**Activities**:
- Confirm the test now passes consistently
- Check for any new failures introduced
- Understand why your fix works
- Ensure you've fixed the root cause, not just the symptoms
  `,
    // API
    api: `
# HTTP API Documentation

The pytest-mcp-server provides a RESTful HTTP API for integrating with other tools:

## Endpoints

### GET /health
Health check endpoint to verify server is running.

### GET /api/failures
List all registered failures.

**Optional Query Parameters**:
- status: Filter by status ('new', 'in_progress', 'resolved')

**Response**:
\`\`\`json
{
  "failures": [
    {
      "id": "1234567890",
      "test_name": "test_example",
      "file_path": "/path/to/test.py",
      "error_message": "AssertionError: ...",
      "status": "new",
      "current_debug_step": 1
    }
  ]
}
\`\`\`

### POST /api/failures
Register a new test failure.

**Request Body**:
\`\`\`json
{
  "test_name": "test_example",
  "file_path": "/path/to/test.py",
  "line_number": 42,
  "error_message": "AssertionError: Expected True, got False",
  "traceback": "Traceback (most recent call last): ...",
  "locals": {
    "variable1": "value1",
    "variable2": "value2"
  }
}
\`\`\`

**Response**:
\`\`\`json
{
  "failureId": "1234567890",
  "sessionId": "session_1234567890",
  "message": "Failure registered successfully and debug session created",
  "next_step": "Apply debugging principle 1: Understand the System"
}
\`\`\`

### GET /api/failures/:id
Get detailed information about a specific failure.

**Response**:
\`\`\`json
{
  "failure": {
    "id": "1234567890",
    "test_name": "test_example",
    "file_path": "/path/to/test.py",
    "line_number": 42,
    "error_message": "AssertionError: Expected True, got False",
    "traceback": "Traceback (most recent call last): ...",
    "status": "in_progress",
    "current_debug_step": 2
  },
  "debugging": {
    "current_principle": {
      "number": 2,
      "name": "Make It Fail",
      "description": "..."
    },
    "progress": {
      "completed": 1,
      "total": 9
    },
    "completed_principles": [
      {
        "number": 1,
        "name": "Understand the System",
        "analysis": "The test is verifying that..."
      }
    ]
  }
}
\`\`\`

### POST /api/debug
Apply a debugging principle to a failure.

**Request Body**:
\`\`\`json
{
  "failure_id": "1234567890",
  "principle_number": 2,
  "analysis": "The test failure is consistent and reproducible..."
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "message": "Successfully applied principle #2",
  "next_principle": {
    "number": 3,
    "name": "Quit Thinking and Look",
    "description": "..."
  }
}
\`\`\`
  `,
    // Command-line client
    client: `
# Test Client Usage

The pytest-mcp-server includes a Python test client for interacting with the server from the command line:

## Commands

### Register a Test Failure

\`\`\`bash
python test-client.py --action register
\`\`\`

### List Failures

\`\`\`bash
python test-client.py --action list
\`\`\`

### Get Failure Details

\`\`\`bash
python test-client.py --action info --failure-id <failure_id>
\`\`\`

### Apply Debugging Principle

\`\`\`bash
python test-client.py --action debug --failure-id <failure_id> --principle <1-9> --analysis "Your analysis here..."
\`\`\`

### Run Full Demo

\`\`\`bash
python test-client.py --action demo
\`\`\`

## Examples

### Register a custom failure

\`\`\`python
import requests

# Define your failure data
failure_data = {
    "test_name": "test_user_login",
    "file_path": "/path/to/test_auth.py",
    "line_number": 42,
    "error_message": "AssertionError: Expected 'logged_in', got 'pending'",
    "traceback": "Traceback (most recent call last): ...",
    "locals": {
        "user": {
            "id": 123,
            "username": "testuser",
            "status": "pending"
        }
    }
}

# Send to the server
response = requests.post(
    "http://localhost:3000/api/failures",
    json=failure_data,
    headers={"Content-Type": "application/json"}
)

if response.status_code == 200:
    result = response.json()
    print(f"Failure registered with ID: {result.get('failureId')}")
\`\`\`
  `,
    // Web UI
    webui: `
# Web UI Documentation

The pytest-mcp-server includes a web interface for visualizing and interacting with test failures:

## Dashboard

The dashboard provides an overview of all registered failures and their debugging status.

**Features**:
- Failure count by status (new, in-progress, resolved)
- Recent failures list
- Debugging progress charts

## Failure Details

The failure details view shows comprehensive information about a specific test failure:

**Features**:
- Test metadata (name, file path, line number)
- Error message and traceback
- Local variables at failure point
- Debugging history and timeline
- Applied principles and their analyses

## Debugging Interface

The debugging interface helps apply the 9 principles to a failure:

**Features**:
- Current principle guidance
- Analysis input form
- Recommendation for next steps
- Debugging history timeline

## Settings

The settings page allows configuration of the server:

**Features**:
- Server connection settings
- Notification preferences
- UI theme options
  `
};
const ALL_TOPICS = Object.keys(DOCS);
class PytestDocsGuideTool extends MCPTool {
    name = "pytest_docs_guide";
    description = "Get information about a pytest failure and its debugging progress";
    schema = {
        topic: {
            type: z.string().optional(),
            description: "Optional topic to get documentation for (general, integration, principles, api, client, webui)",
        }
    };
    async execute(input) {
        const topic = input.topic?.toLowerCase() || 'general';
        if (topic === 'all') {
            // Return a list of all available topics
            return {
                docs: `# Available Documentation Topics

The following documentation topics are available:

${ALL_TOPICS.map(t => `- ${t}: ${this.getTopicDescription(t)}`).join('\n')}

To view a specific topic, call this tool with the topic parameter:
\`\`\`
pytest_docs_guide(topic="integration")
\`\`\``,
                available_topics: ALL_TOPICS
            };
        }
        // Return docs for the specified topic
        if (DOCS[topic]) {
            return {
                topic,
                docs: DOCS[topic],
                description: this.getTopicDescription(topic)
            };
        }
        else {
            // Topic not found, return available topics
            return {
                error: `Topic '${topic}' not found.`,
                available_topics: ALL_TOPICS,
                suggestion: `Try one of these topics: ${ALL_TOPICS.join(', ')}`
            };
        }
    }
    getTopicDescription(topic) {
        const descriptions = {
            general: "Overview of the pytest-mcp-server and its features",
            integration: "How to integrate the server with your pytest project",
            principles: "Detailed explanation of the 9 debugging principles",
            api: "HTTP API documentation for programmatic integration",
            client: "Command-line client usage examples",
            webui: "Web UI features and usage guide"
        };
        return descriptions[topic] || "Documentation topic";
    }
}
export default PytestDocsGuideTool;
