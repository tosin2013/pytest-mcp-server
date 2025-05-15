import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
// Constants for file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const FAILURES_FILE = path.join(DATA_DIR, 'failures.json');
const DEBUG_SESSIONS_FILE = path.join(DATA_DIR, 'debug_sessions.json');
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
class DebugWithPrincipleTool extends MCPTool {
    name = "debug_with_principle";
    description = "Apply a debugging principle to a pytest failure and record the analysis";
    schema = {
        failure_id: {
            type: z.string(),
            description: "ID of the test failure to debug",
        },
        principle_number: {
            type: z.number().min(1).max(9).optional(),
            description: "Number of the debugging principle to apply (1-9). If not provided, the current step from the failure record will be used.",
        },
        analysis: {
            type: z.string(),
            description: "Your analysis of the test failure using the specified debugging principle",
        },
    };
    async execute(input) {
        // Load failures
        let failures = {};
        try {
            const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
            failures = JSON.parse(failuresData);
        }
        catch (error) {
            throw new Error("Failed to read failures data file");
        }
        // Check if failure exists
        if (!failures[input.failure_id]) {
            throw new Error(`Failure with ID ${input.failure_id} not found`);
        }
        const failure = failures[input.failure_id];
        // Determine which principle to apply
        const principleNumber = input.principle_number || failure.current_debug_step;
        if (principleNumber < 1 || principleNumber > 9) {
            throw new Error(`Invalid principle number: ${principleNumber}`);
        }
        const principle = DEBUG_PRINCIPLES[principleNumber - 1];
        // Load debug sessions
        let sessions = {};
        try {
            const sessionsData = fs.readFileSync(DEBUG_SESSIONS_FILE, 'utf-8');
            sessions = JSON.parse(sessionsData);
        }
        catch (error) {
            throw new Error("Failed to read debug sessions data file");
        }
        // Find the debug session for this failure
        const sessionId = `session_${input.failure_id}`;
        if (!sessions[sessionId]) {
            // Create a new session if it doesn't exist
            sessions[sessionId] = {
                id: sessionId,
                failure_id: input.failure_id,
                created_at: new Date().toISOString(),
                debug_steps: []
            };
        }
        const session = sessions[sessionId];
        // Find existing debug step or create a new one
        let debugStep = session.debug_steps.find(step => step.step === principleNumber);
        if (!debugStep) {
            // Create a new debug step
            debugStep = {
                step: principleNumber,
                name: principle.name,
                status: "pending",
                started_at: new Date().toISOString(),
                completed_at: null,
                llm_analysis: null
            };
            session.debug_steps.push(debugStep);
        }
        // Update the debug step with analysis
        debugStep.status = "completed";
        debugStep.completed_at = new Date().toISOString();
        debugStep.llm_analysis = input.analysis;
        // Update the failure's current debug step (move to next principle)
        const nextPrincipleNumber = Math.min(principleNumber + 1, 9);
        failure.current_debug_step = nextPrincipleNumber;
        // Add the next principle step if not already there and if not at the end
        if (principleNumber < 9 && !session.debug_steps.some(step => step.step === nextPrincipleNumber)) {
            session.debug_steps.push({
                step: nextPrincipleNumber,
                name: DEBUG_PRINCIPLES[nextPrincipleNumber - 1].name,
                status: "pending",
                started_at: new Date().toISOString(),
                completed_at: null,
                llm_analysis: null
            });
        }
        // Save updated failures and sessions
        fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));
        fs.writeFileSync(DEBUG_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
        // Prepare next principle information
        const nextPrinciple = principleNumber < 9 ? DEBUG_PRINCIPLES[nextPrincipleNumber - 1] : null;
        return {
            message: `Successfully applied debug principle ${principleNumber}: ${principle.name}`,
            current_principle: {
                number: principleNumber,
                name: principle.name,
                analysis: input.analysis
            },
            next_principle: nextPrinciple ? {
                number: nextPrincipleNumber,
                name: nextPrinciple.name,
                description: nextPrinciple.description
            } : null,
            is_complete: principleNumber >= 9
        };
    }
}
export default DebugWithPrincipleTool;
