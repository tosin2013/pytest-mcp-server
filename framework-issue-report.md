# MCP Framework Validation Error Type Issue Report

## Summary
The mcp-framework (versions 0.2.11 through 0.2.13) has a validation error reporting bug where it returns error responses with `"type": "error"` instead of the MCP-compliant `"type": "text"` as specified in the official MCP error reporting standards.

## Environment
- **mcp-framework version**: 0.2.13 (latest, previously 0.2.11)
- **mcp-testing-framework version**: 1.0.2 (latest)
- **MCP server**: Custom TypeScript server using mcp-framework
- **Node.js**: v18+
- **OS**: macOS 24.5.0

## Authoritative Reference
This issue directly contradicts the **Standardized Error Reporting Formats for Model Context Protocol Servers** document, which clearly states:

> "The content array within the CallToolResult object is used to convey details about the error... Typically, for errors, this array will contain a single ContentPart object of **type text**"

> "**type: "text"**: The Python SDK's TextContent type is defined with type: Literal["text"]"

## Issue Description

### Expected Behavior (Per MCP Specification)
When a tool execution fails due to validation errors, the framework should return:
```json
{
  "jsonrpc": "2.0",
  "id": "request123",
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Validation error details"
      }
    ],
    "meta": null
  }
}
```

### Actual Behavior (mcp-framework Bug)
The framework returns:
```json
{
  "content": [
    {
      "type": "error",  // ❌ NON-COMPLIANT
      "text": "Validation error details"
    }
  ]
}
```

### Impact
1. **MCP Testing Framework Validation Fails**: The testing framework correctly validates that content should have `"type": "text"` and rejects `"type": "error"`
2. **Non-Standard Behavior**: This violates the MCP specification for error reporting
3. **Ecosystem Fragmentation**: Creates inconsistency in MCP implementations

## Evidence

### Test Results
```bash
# Testing validation error format
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "debug_with_principle", "arguments": {}}}' | node dist/index.js | jq '.result.content[0].type'
# Returns: "error" (should be "text")
```

### MCP Testing Framework Results
```
pytest-mcp-server_debug_with_principle_execution │ ERROR │ Tool execution error for debug_with_principle: 
6 validation errors for CallToolResult
content.0.TextContent.type
  Input should be 'text'
```

## Pattern Recognition
This issue fits the documented pattern in the MCP error reporting standards document:

> "Several community-reported issues and observed SDK behaviors highlight challenges in consistently implementing MCP error reporting standards"

> "These SDK issues directly contribute to non-standard MCP server behavior, forcing client implementers to anticipate and handle a wider variety of potentially non-compliant error responses"

## Reproduction Steps
1. Create an MCP server using mcp-framework 0.2.11-0.2.13
2. Define a tool with required parameters
3. Call the tool with missing/invalid arguments
4. Observe that validation errors return `"type": "error"` instead of `"type": "text"`

## Recommended Fix
The mcp-framework should be updated to return validation errors with `"type": "text"` to comply with the MCP specification.

## Workaround
Currently, there is no clean workaround as this is handled internally by the framework's validation system.

## Status
- **Confirmed**: Issue persists in mcp-framework 0.2.13 (latest)
- **Impact**: High - affects MCP compliance testing
- **Priority**: Medium - server functions correctly in real-world usage despite testing framework validation failure

## Related Issues
This issue is part of a broader pattern of SDK implementation challenges documented in the MCP ecosystem, similar to issues reported with:
- Spring AI MCP integration
- Python SDK exception handling
- Pydantic AI structural nesting problems 