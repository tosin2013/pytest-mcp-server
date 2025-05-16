import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { getDataFilePath, ensureDataFileExists } from '../utils/dataDirectory';

interface PytestFailureInput {
  test_name: string;
  file_path: string;
  line_number: number;
  error_message: string;
  traceback: string;
  locals?: Record<string, any>;
}

interface FailureRecord extends PytestFailureInput {
  id: string;
  timestamp: string;
  status: string;
  current_debug_step: number;
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

class PytestFailureTool extends MCPTool<PytestFailureInput> {
  name = "register_pytest_failure";
  description = "Register a pytest test failure for debugging with LLM assistance";

  schema = {
    test_name: {
      type: z.string(),
      description: "Name of the failing test",
    },
    file_path: {
      type: z.string(),
      description: "Path to the file containing the test",
    },
    line_number: {
      type: z.number(),
      description: "Line number of the failure",
    },
    error_message: {
      type: z.string(),
      description: "Error message from the test failure",
    },
    traceback: {
      type: z.string(),
      description: "Full traceback of the failure",
    },
    locals: {
      type: z.record(z.any()).optional(),
      description: "Local variables at the point of failure",
    },
  };

  async execute(input: PytestFailureInput) {
    const failureId = Date.now().toString();
    
    // Load current failures
    let failures: Record<string, FailureRecord> = {};
    try {
      const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
      failures = JSON.parse(failuresData);
    } catch (error) {
      // If file doesn't exist or is invalid JSON, start with empty object
    }

    // Add new failure
    failures[failureId] = {
      id: failureId,
      timestamp: new Date().toISOString(),
      status: "new",
      current_debug_step: 1, // Start with principle 1
      ...input
    };

    // Save updated failures
    fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));

    // Create debug session
    const sessionId = `session_${failureId}`;
    let sessions: Record<string, DebugSession> = {};
    try {
      const sessionsData = fs.readFileSync(DEBUG_SESSIONS_FILE, 'utf-8');
      sessions = JSON.parse(sessionsData);
    } catch (error) {
      // If file doesn't exist or is invalid JSON, start with empty object
    }

    // Initialize debug session
    sessions[sessionId] = {
      id: sessionId,
      failure_id: failureId,
      created_at: new Date().toISOString(),
      debug_steps: [
        {
          step: 1,
          name: "Understand the System",
          status: "pending",
          started_at: new Date().toISOString(),
          completed_at: null,
          llm_analysis: null
        }
      ]
    };

    // Save updated sessions
    fs.writeFileSync(DEBUG_SESSIONS_FILE, JSON.stringify(sessions, null, 2));

    return {
      failureId,
      sessionId,
      message: "Failure registered successfully and debug session created",
      next_step: "Apply debugging principle 1: Understand the System"
    };
  }
}

export default PytestFailureTool; 