import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import { getDataFilePath, ensureDataFileExists } from '../utils/dataDirectory.js';
// Get file paths using the utility module
const FAILURES_FILE = getDataFilePath('failures.json');
const DEBUG_SESSIONS_FILE = getDataFilePath('debug_sessions.json');
// Initialize files if they don't exist
ensureDataFileExists('failures.json');
ensureDataFileExists('debug_sessions.json');
class PytestFailureTool extends MCPTool {
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
    async execute(input) {
        const failureId = Date.now().toString();
        let success = true;
        let errorMessage = '';
        try {
            // Load current failures
            let failures = {};
            try {
                // Check if the failures file exists and is readable
                if (fs.existsSync(FAILURES_FILE)) {
                    const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
                    try {
                        failures = JSON.parse(failuresData);
                    }
                    catch (parseError) {
                        console.error(`Warning: Failures file contains invalid JSON. Creating new file.`);
                        // Backup the corrupted file
                        const backupPath = `${FAILURES_FILE}.backup-${Date.now()}`;
                        fs.copyFileSync(FAILURES_FILE, backupPath);
                        console.error(`Backed up corrupted file to ${backupPath}`);
                    }
                }
            }
            catch (error) {
                console.error(`Error reading failures file: ${error.message}`);
                // Continue with empty object
            }
            // Add new failure
            failures[failureId] = {
                id: failureId,
                timestamp: new Date().toISOString(),
                status: "new",
                current_debug_step: 1, // Start with principle 1
                ...input
            };
            // Save updated failures with error handling
            try {
                fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));
            }
            catch (writeError) {
                console.error(`Error writing failures file: ${writeError.message}`);
                success = false;
                errorMessage = `Failed to save failure data: ${writeError.message}`;
            }
            // Create debug session
            const sessionId = `session_${failureId}`;
            let sessions = {};
            try {
                // Check if the sessions file exists and is readable
                if (fs.existsSync(DEBUG_SESSIONS_FILE)) {
                    const sessionsData = fs.readFileSync(DEBUG_SESSIONS_FILE, 'utf-8');
                    try {
                        sessions = JSON.parse(sessionsData);
                    }
                    catch (parseError) {
                        console.error(`Warning: Debug sessions file contains invalid JSON. Creating new file.`);
                        // Backup the corrupted file
                        const backupPath = `${DEBUG_SESSIONS_FILE}.backup-${Date.now()}`;
                        fs.copyFileSync(DEBUG_SESSIONS_FILE, backupPath);
                        console.error(`Backed up corrupted file to ${backupPath}`);
                    }
                }
            }
            catch (error) {
                console.error(`Error reading debug sessions file: ${error.message}`);
                // Continue with empty object
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
            // Save updated sessions with error handling
            try {
                fs.writeFileSync(DEBUG_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
            }
            catch (writeError) {
                console.error(`Error writing debug sessions file: ${writeError.message}`);
                if (success) { // Only update if we haven't already failed
                    success = false;
                    errorMessage = `Failed to save debug session data: ${writeError.message}`;
                }
            }
            // Return success or error response
            if (success) {
                return {
                    failureId,
                    sessionId,
                    message: "Failure registered successfully and debug session created",
                    next_step: "Apply debugging principle 1: Understand the System"
                };
            }
            else {
                return {
                    failureId,
                    sessionId,
                    error: true,
                    message: errorMessage || "Failed to register failure due to file system errors",
                    suggestion: "Check server logs and data directory permissions"
                };
            }
        }
        catch (error) {
            // Catch any unexpected errors
            console.error(`Unexpected error in register_pytest_failure: ${error.message}`);
            return {
                error: true,
                message: `Unexpected error: ${error.message}`,
                suggestion: "Check server logs for details"
            };
        }
    }
}
export default PytestFailureTool;
