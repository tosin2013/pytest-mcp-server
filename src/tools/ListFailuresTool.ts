import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import path from 'path';

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

// Constants for file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const FAILURES_FILE = path.join(DATA_DIR, 'failures.json');

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
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Initialize failures file if it doesn't exist
    if (!fs.existsSync(FAILURES_FILE)) {
      fs.writeFileSync(FAILURES_FILE, JSON.stringify({}));
    }

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
    return {
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
  }
}

export default ListFailuresTool; 