# conftest.py
import json
import requests
from pathlib import Path
import pytest
import traceback
import sys

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