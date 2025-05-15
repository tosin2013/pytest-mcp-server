#!/usr/bin/env python3
"""
Test client for the pytest-mcp-server.
This script simulates a pytest failure and sends it to the MCP server.
"""

import requests
import json
import sys
import argparse

MCP_SERVER_URL = "http://localhost:3000"

def register_test_failure():
    """Registers a simulated test failure with the MCP server."""
    print("📋 Registering a simulated test failure...")
    
    failure_data = {
        "test_name": "test_user_authentication",
        "file_path": "/path/to/test_auth.py",
        "line_number": 42,
        "error_message": "AssertionError: Expected 'authenticated', got None",
        "traceback": """
Traceback (most recent call last):
  File "/path/to/test_auth.py", line 42, in test_user_authentication
    assert user.status == 'authenticated', f"User status is {user.status}"
AssertionError: Expected 'authenticated', got None
""",
        "locals": {
            "user": {
                "id": 123,
                "username": "testuser",
                "status": None
            },
            "expected_status": "authenticated"
        }
    }
    
    try:
        response = requests.post(
            f"{MCP_SERVER_URL}/api/failures", 
            json=failure_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Failure registered with ID: {result.get('failureId')}")
            print(f"🔍 Session ID: {result.get('sessionId')}")
            return result.get('failureId')
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return None
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return None

def list_failures():
    """Lists all failures registered with the MCP server."""
    print("📋 Listing all registered failures...")
    
    try:
        response = requests.get(
            f"{MCP_SERVER_URL}/api/failures",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            failures = response.json().get('failures', [])
            print(f"✅ Found {len(failures)} registered failures:")
            
            for i, failure in enumerate(failures, 1):
                print(f"\n--- Failure #{i} ---")
                print(f"ID: {failure.get('id')}")
                print(f"Test: {failure.get('test_name')}")
                print(f"Error: {failure.get('error_message')}")
                print(f"Status: {failure.get('status')}")
                print(f"Current debug step: {failure.get('current_debug_step')}")
            
            return failures
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return []
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return []

def get_failure_info(failure_id):
    """Gets detailed information about a specific failure."""
    print(f"🔍 Getting details for failure: {failure_id}...")
    
    try:
        response = requests.get(
            f"{MCP_SERVER_URL}/api/failures/{failure_id}",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            failure_info = response.json()
            print("\n=== Failure Details ===")
            print(f"Test: {failure_info.get('failure', {}).get('test_name')}")
            print(f"File: {failure_info.get('failure', {}).get('file_path')}")
            print(f"Error: {failure_info.get('failure', {}).get('error_message')}")
            
            # Debug information
            debugging = failure_info.get('debugging', {})
            current = debugging.get('current_principle', {})
            print("\n=== Debugging Progress ===")
            print(f"Current principle: #{current.get('number')} - {current.get('name')}")
            print(f"Progress: {debugging.get('progress', {}).get('completed')}/9 principles completed")
            
            # Completed principles
            completed = debugging.get('completed_principles', [])
            if completed:
                print("\n=== Completed Debugging Steps ===")
                for step in completed:
                    print(f"#{step.get('number')} - {step.get('name')}")
                    print(f"Analysis: {step.get('analysis')}")
                    print("---")
            
            return failure_info
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return None
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return None

def debug_with_principle(failure_id, principle_number, analysis):
    """Applies a debugging principle to a failure."""
    print(f"🧠 Applying debugging principle #{principle_number} to failure {failure_id}...")
    
    debug_data = {
        "failure_id": failure_id,
        "principle_number": principle_number,
        "analysis": analysis
    }
    
    try:
        response = requests.post(
            f"{MCP_SERVER_URL}/api/debug",
            json=debug_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Successfully applied principle #{principle_number}")
            
            if result.get('next_principle'):
                next_principle = result.get('next_principle')
                print(f"📝 Next principle: #{next_principle.get('number')} - {next_principle.get('name')}")
                print(f"Description: {next_principle.get('description')}")
            
            return result
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return None
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return None

def analyze_failures(group_by=None, time_range=None, include_resolved=False):
    """Analyze failures and group them based on specified criteria."""
    print("🔍 Analyzing test failures...")
    
    params = {}
    if group_by:
        params['group_by'] = group_by
    if time_range:
        params['time_range'] = time_range
    if include_resolved:
        params['include_resolved'] = 'true'
    
    try:
        response = requests.get(
            f"{MCP_SERVER_URL}/api/analytics",
            params=params,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n=== Failure Analysis Results ===")
            print(f"Total Failures: {result.get('total_failures', 0)}")
            print(f"Groups Found: {result.get('group_count', 0)}")
            print(f"Grouped By: {result.get('group_by', 'unknown')}")
            
            # Display groups
            groups = result.get('groups', [])
            if groups:
                print("\n--- Failure Groups ---")
                for i, group in enumerate(groups, 1):
                    print(f"\nGroup #{i}: {group.get('name')}")
                    print(f"  Count: {group.get('count')} failures")
                    print(f"  Error Type: {group.get('common_error_type')}")
                    print(f"  Hypothesis: {group.get('root_cause_hypothesis')}")
                    
            # Display insights
            insights = result.get('insights', {})
            if insights:
                print("\n--- Insights ---")
                print(f"Most Common Error: {insights.get('most_common_error')}")
                
                print("\nError Distribution:")
                for error_type, count in insights.get('error_distribution', {}).items():
                    print(f"  {error_type}: {count} failures")
                
                print("\nTriage Recommendations:")
                for rec in insights.get('triage_recommendations', []):
                    print(f"  [Priority: {rec.get('priority')}] {rec.get('recommendation')}")
            
            return result
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return None
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return None

def generate_debug_prompt(group_id=None, failure_id=None, prompt_style=None):
    """Generate a targeted debug prompt for a failure group or individual failure."""
    if not group_id and not failure_id:
        print("❌ Error: Either group_id or failure_id must be provided")
        return None
    
    target_type = "group" if group_id else "failure"
    target_id = group_id or failure_id
    print(f"📝 Generating debug prompt for {target_type} {target_id}...")
    
    params = {}
    if group_id:
        params['group_id'] = group_id
    if failure_id:
        params['failure_id'] = failure_id
    if prompt_style:
        params['prompt_style'] = prompt_style
    
    try:
        response = requests.get(
            f"{MCP_SERVER_URL}/api/prompt",
            params=params,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if 'error' in result:
                print(f"❌ Error: {result['error']}")
                return None
            
            print(f"\n=== Debug Prompt ===")
            print(f"Title: {result.get('title')}")
            print(f"Style: {result.get('prompt_style')}")
            print(f"\nInstructions for LLM:\n{result.get('instructions')}")
            
            print(f"\nPrompt Content:")
            print("=" * 60)
            print(result.get('prompt'))
            print("=" * 60)
            
            return result
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return None
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return None

def get_documentation(topic=None):
    """Gets documentation about the pytest-mcp-server."""
    topic_str = f" on {topic}" if topic else ""
    print(f"📚 Getting documentation{topic_str}...")
    
    params = {}
    if topic:
        params['topic'] = topic
    
    try:
        response = requests.get(
            f"{MCP_SERVER_URL}/api/docs",
            params=params,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if 'error' in result:
                print(f"❌ Error: {result['error']}")
                if 'available_topics' in result:
                    print(f"Available topics: {', '.join(result['available_topics'])}")
                return None
            
            topic = result.get('topic', 'general')
            print(f"\n=== Documentation: {topic} ===")
            print(f"{result.get('description', '')}")
            print("\n" + result.get('docs', ''))
            
            return result
        else:
            print(f"❌ Error: Server returned {response.status_code}")
            print(response.text)
            return None
    except requests.RequestException as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Test client for the pytest-mcp-server")
    parser.add_argument('--action', 
                        choices=['register', 'list', 'info', 'debug', 'docs', 'analyze', 'prompt', 'demo', 'analytics_demo'], 
                        default='demo', help='Action to perform')
    parser.add_argument('--failure-id', help='Failure ID for info or debug actions')
    parser.add_argument('--group-id', help='Group ID for prompt generation')
    parser.add_argument('--principle', type=int, choices=range(1, 10), 
                        help='Principle number (1-9) for debug action')
    parser.add_argument('--analysis', help='Analysis text for debug action')
    parser.add_argument('--topic', help='Documentation topic to retrieve')
    parser.add_argument('--group-by', choices=['error_type', 'file_path', 'pattern'], 
                        help='How to group failures in analysis')
    parser.add_argument('--time-range', choices=['all', 'today', 'week', 'month'], 
                        help='Time range for analysis')
    parser.add_argument('--include-resolved', action='store_true', 
                        help='Include resolved failures in analysis')
    parser.add_argument('--prompt-style', choices=['detailed', 'concise', 'step_by_step', 'root_cause'], 
                        help='Style of debug prompt to generate')
    
    args = parser.parse_args()
    
    if args.action == 'register':
        register_test_failure()
    
    elif args.action == 'list':
        list_failures()
    
    elif args.action == 'info':
        if not args.failure_id:
            print("❌ Error: --failure-id is required for 'info' action")
            sys.exit(1)
        get_failure_info(args.failure_id)
    
    elif args.action == 'debug':
        if not args.failure_id:
            print("❌ Error: --failure-id is required for 'debug' action")
            sys.exit(1)
        if not args.principle:
            print("❌ Error: --principle is required for 'debug' action")
            sys.exit(1)
        if not args.analysis:
            print("❌ Error: --analysis is required for 'debug' action")
            sys.exit(1)
        
        debug_with_principle(args.failure_id, args.principle, args.analysis)
    
    elif args.action == 'docs':
        get_documentation(args.topic)
    
    elif args.action == 'analyze':
        analyze_failures(args.group_by, args.time_range, args.include_resolved)
    
    elif args.action == 'prompt':
        if not args.failure_id and not args.group_id:
            print("❌ Error: Either --failure-id or --group-id is required for 'prompt' action")
            sys.exit(1)
        
        generate_debug_prompt(args.group_id, args.failure_id, args.prompt_style)
    
    elif args.action == 'analytics_demo':
        print("🚀 Running a demo of the failure analytics features...")
        print("=" * 60)
        
        # Step 1: Register some test failures if needed
        failures = list_failures()
        if not failures or len(failures) < 2:
            print("\nRegistering some test failures for the demo...")
            register_test_failure()
            register_test_failure()
        
        print("\n" + "=" * 60)
        
        # Step 2: Run analytics
        print("\nRunning failure analytics with default grouping (by error type)...")
        analytics_result = analyze_failures()
        
        if analytics_result and analytics_result.get('groups'):
            # Step 3: Generate a debug prompt for the first group
            first_group = analytics_result['groups'][0]
            group_id = first_group['id']
            
            print("\n" + "=" * 60)
            print(f"\nGenerating a detailed debug prompt for group: {first_group['name']}...")
            generate_debug_prompt(group_id=group_id, prompt_style='detailed')
            
            print("\n" + "=" * 60)
            print(f"\nGenerating a concise debug prompt for the same group...")
            generate_debug_prompt(group_id=group_id, prompt_style='concise')
        
        # Step 4: Show documentation
        print("\n" + "=" * 60)
        print("\nShowing documentation about the analytics features...")
        get_documentation('principles')
    
    elif args.action == 'demo':
        print("🚀 Running a full demo of the pytest-mcp-server client...")
        print("=" * 60)
        
        # Step 1: Register a failure
        failure_id = register_test_failure()
        if not failure_id:
            print("❌ Demo failed: Could not register a test failure")
            sys.exit(1)
        
        print("\n" + "=" * 60)
        
        # Step 2: List all failures
        list_failures()
        
        print("\n" + "=" * 60)
        
        # Step 3: Get failure details
        get_failure_info(failure_id)
        
        print("\n" + "=" * 60)
        
        # Step 4: Apply debugging principle 1
        analysis1 = """
I've analyzed the test_user_authentication function and understand that it's verifying a user's authentication status.
The test expects the user.status to be 'authenticated', but it's actually None.
This suggests that either the authentication process failed or the status was not properly set.
        """
        debug_with_principle(failure_id, 1, analysis1)
        
        print("\n" + "=" * 60)
        
        # Step 5: Apply debugging principle 2
        analysis2 = """
I've verified that this failure is consistent and reproducible. Each time the test runs,
the user.status is None instead of 'authenticated'. This is not a flaky test but a 
consistent behavior indicating a real issue with the authentication process.
        """
        debug_with_principle(failure_id, 2, analysis2)
        
        print("\n" + "=" * 60)
        
        # Step 6: Get updated failure info
        get_failure_info(failure_id)
        
        print("\n" + "=" * 60)
        
        # Step 7: Generate a debug prompt for this failure
        generate_debug_prompt(failure_id=failure_id, prompt_style='step_by_step')

if __name__ == "__main__":
    main() 