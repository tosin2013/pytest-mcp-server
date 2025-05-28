import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { getDataFilePath, ensureDataFileExists } from '../utils/dataDirectory.js';

interface GetFailureInfoInput {
  failure_id: string;
}

interface FailureRecord {
  id: string;
  timestamp: string;
  status: string;
  current_debug_step: number;
  test_name: string;
  file_path: string;
  line_number: number;
  error_message: string;
  traceback: string;
  locals?: Record<string, any>;
  debug_session: string;
}

interface DebugStep {
  step: number;
  name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  llm_analysis: any | null;
}

interface DebugSession {
  id: string;
  failure_id: string;
  created_at: string;
  debug_steps: DebugStep[];
}

// Get file paths using the utility module
const FAILURES_FILE = getDataFilePath('failures.json');
const DEBUG_SESSIONS_FILE = getDataFilePath('debug_sessions.json');

// Initialize files if they don't exist
ensureDataFileExists('failures.json');
ensureDataFileExists('debug_sessions.json');

// Define the 9 debugging principles
const DEBUG_PRINCIPLES = [
  {
    number: 1,
    name: "Understand the System",
    description: "Gain high-level awareness of what the system and test are supposed to do.",
    prompt: "You are debugging a test. Summarize what this test is intended to do and identify the system components it touches."
  },
  {
    number: 2,
    name: "Make It Fail",
    description: "Reproduce the failure consistently, eliminate flakiness.",
    prompt: "Analyze the logs and inputs to determine if the test failure is reproducible. If it seems flaky, suggest test isolation strategies."
  },
  {
    number: 3,
    name: "Quit Thinking and Look",
    description: "Avoid assumptions and inspect actual runtime values and logs.",
    prompt: "Here are the runtime logs and variable states at failure. Highlight anything that looks suspicious or unexpected."
  },
  {
    number: 4,
    name: "Divide and Conquer",
    description: "Narrow down where in the code the issue is occurring.",
    prompt: "Given the stack trace and code, suggest a narrower scope where the bug likely resides."
  },
  {
    number: 5,
    name: "Change One Thing at a Time",
    description: "Suggest isolated experiments to test assumptions.",
    prompt: "Propose a minimal input or configuration change that could validate an assumption or rule out a cause."
  },
  {
    number: 6,
    name: "Keep an Audit Trail",
    description: "Maintain a history of tests, changes, and observations.",
    prompt: "Here is the audit trail of changes. Suggest what changed right before the bug appeared."
  },
  {
    number: 7,
    name: "Check the Plug",
    description: "Verify basic configuration and environment issues.",
    prompt: "Look for missing config, uninitialized mocks, or broken imports that could cause the test to fail before it even runs meaningfully."
  },
  {
    number: 8,
    name: "Get a Fresh View",
    description: "Rethink the problem from another perspective (like a junior dev).",
    prompt: "Imagine you're seeing this failure for the first time. What would you ask or check differently?"
  },
  {
    number: 9,
    name: "If You Didn't Fix It, It Ain't Fixed",
    description: "Verify your fix worked and didn't just mask the issue.",
    prompt: "We applied a fix. The test now passes, but did we really fix the issue or just silence the symptoms?"
  }
];

class GetFailureInfoTool extends MCPTool<GetFailureInfoInput> {
  name = "get_failure_info";
  description = "Get information about a pytest failure and its debugging progress";

  schema = {
    failure_id: {
      type: z.string(),
      description: "ID of the test failure to get information about",
    },
  };

  async execute(input: GetFailureInfoInput) {
    // Load failures
    let failures: Record<string, FailureRecord> = {};
    try {
      const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
      failures = JSON.parse(failuresData);
    } catch (error) {
      throw new Error("Failed to read failures data file");
    }

    // Check if failure exists
    if (!failures[input.failure_id]) {
      return {
        error: `Failure with ID ${input.failure_id} not found`
      };
    }
    
    const failure = failures[input.failure_id];
    
    // Return detailed failure information directly - MCP framework will wrap it
    return {
      id: failure.id,
      timestamp: failure.timestamp,
      status: failure.status,
      current_debug_step: failure.current_debug_step,
      test_name: failure.test_name,
      file_path: failure.file_path,
      line_number: failure.line_number,
      error_message: failure.error_message,
      traceback: failure.traceback,
      locals: failure.locals,
      debug_session: failure.debug_session
    };
  }
}

export default GetFailureInfoTool; 