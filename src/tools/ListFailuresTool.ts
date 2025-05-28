import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { getDataFilePath, ensureDataFileExists } from '../utils/dataDirectory.js';

interface ListFailuresInput {
  status?: string;
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
}

// Get file paths using the utility module
const FAILURES_FILE = getDataFilePath('failures.json');

// Initialize files if they don't exist
ensureDataFileExists('failures.json');

class ListFailuresTool extends MCPTool<ListFailuresInput> {
  name = "list_failures";
  description = "List all pytest failures with optional status filtering";

  schema = {
    status: {
      type: z.string().optional(),
      description: "Optional status filter (e.g., 'new', 'in_progress', 'resolved')",
    },
  };

  async execute(input: ListFailuresInput) {

    // Load failures
    let failures: Record<string, FailureRecord> = {};
    try {
      const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
      failures = JSON.parse(failuresData);
    } catch (error) {
      return { failures: [] };
    }

    // Convert to array and filter by status if provided
    let failuresList = Object.values(failures);
    
    if (input.status) {
      failuresList = failuresList.filter(failure => failure.status === input.status);
    }
    
    // Sort by timestamp (newest first)
    failuresList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Return simplified failure records
    const responseData = {
      total: failuresList.length,
      failures: failuresList.map(failure => ({
        id: failure.id,
        timestamp: failure.timestamp,
        status: failure.status,
        test_name: failure.test_name,
        file_path: failure.file_path,
        error_message: failure.error_message,
        current_debug_step: failure.current_debug_step
      }))
    };
    
    // Return in MCP-compatible format
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(responseData, null, 2)
        }
      ]
    };
  }
}

export default ListFailuresTool; 