import { MCPTool } from "mcp-framework";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const FAILURES_FILE = path.join(DATA_DIR, 'failures.json');
const FAILURE_GROUPS_FILE = path.join(DATA_DIR, 'failure_groups.json');
class FailurePromptGeneratorTool extends MCPTool {
    name = "generate_debug_prompt";
    description = "Generate targeted debugging prompts for failure groups to assist with LLM-based debugging";
    schema = {
        group_id: {
            type: z.string().optional(),
            description: "ID of the failure group to generate a prompt for. If not provided, a single failure_id must be specified.",
        },
        failure_id: {
            type: z.string().optional(),
            description: "ID of a specific failure to generate a prompt for. If not provided, a group_id must be specified.",
        },
        prompt_style: {
            type: z.string().optional(),
            description: "Style of prompt to generate (detailed, concise, step_by_step, root_cause). Default is 'detailed'",
        }
    };
    async execute(input) {
        const promptStyle = input.prompt_style || 'detailed';
        // Validate input
        if (!input.group_id && !input.failure_id) {
            return {
                error: "Either group_id or failure_id must be provided"
            };
        }
        try {
            if (input.group_id) {
                return await this.generateGroupPrompt(input.group_id, promptStyle);
            }
            else if (input.failure_id) {
                return await this.generateSingleFailurePrompt(input.failure_id, promptStyle);
            }
        }
        catch (error) {
            return {
                error: `Failed to generate debug prompt: ${error}`
            };
        }
    }
    async generateGroupPrompt(groupId, style) {
        // Load the failure group
        const group = await this.loadFailureGroup(groupId);
        if (!group) {
            return { error: `Failure group ${groupId} not found` };
        }
        // Load all failures in the group
        const failures = await this.loadFailuresInGroup(group);
        if (!failures || failures.length === 0) {
            return { error: `No failures found in group ${groupId}` };
        }
        // Generate a prompt based on the style
        let prompt = '';
        let title = '';
        let instructions = '';
        // Create a common title for all prompt styles
        title = `Debug Task: ${group.name} (${failures.length} failures)`;
        // Generate style-specific prompt content
        if (style === 'detailed') {
            prompt = this.generateDetailedPrompt(group, failures);
            instructions = `Please analyze these ${failures.length} test failures and provide:
1. Root cause analysis
2. Suggested fix approach
3. Steps to verify the fix works`;
        }
        else if (style === 'concise') {
            prompt = this.generateConcisePrompt(group, failures);
            instructions = `Briefly analyze these ${failures.length} test failures and identify the most likely root cause and solution.`;
        }
        else if (style === 'step_by_step') {
            prompt = this.generateStepByStepPrompt(group, failures);
            instructions = `Follow these debugging steps:
1. Analyze the patterns in these ${failures.length} failures
2. Identify the root cause
3. Propose a fix
4. Suggest verification steps`;
        }
        else if (style === 'root_cause') {
            prompt = this.generateRootCausePrompt(group, failures);
            instructions = `Focus exclusively on determining the root cause of these ${failures.length} related test failures. No need to provide a fix yet.`;
        }
        return {
            title,
            instructions,
            prompt,
            group: {
                id: group.id,
                name: group.name,
                count: group.count,
                common_error_type: group.common_error_type,
                hypothesis: group.root_cause_hypothesis
            },
            failure_count: failures.length,
            prompt_style: style
        };
    }
    async generateSingleFailurePrompt(failureId, style) {
        // Load the failure
        const failure = await this.loadFailure(failureId);
        if (!failure) {
            return { error: `Failure ${failureId} not found` };
        }
        // Generate a prompt based on the style
        let prompt = '';
        let title = '';
        let instructions = '';
        // Create a common title
        title = `Debug Task: ${failure.test_name} Failure (${failureId})`;
        // Generate style-specific content
        if (style === 'detailed' || style === 'step_by_step') {
            prompt = this.generateDetailedSinglePrompt(failure);
            instructions = `Please analyze this test failure and provide:
1. Root cause analysis
2. Suggested fix approach
3. Steps to verify the fix works`;
        }
        else if (style === 'concise') {
            prompt = this.generateConciseSinglePrompt(failure);
            instructions = `Briefly analyze this test failure and identify the most likely root cause and solution.`;
        }
        else if (style === 'root_cause') {
            prompt = this.generateRootCauseSinglePrompt(failure);
            instructions = `Focus exclusively on determining the root cause of this test failure. No need to provide a fix yet.`;
        }
        return {
            title,
            instructions,
            prompt,
            failure: {
                id: failure.id,
                test_name: failure.test_name,
                file_path: failure.file_path,
                error_message: failure.error_message
            },
            prompt_style: style
        };
    }
    // Helper methods for loading data
    async loadFailureGroup(groupId) {
        try {
            if (fs.existsSync(FAILURE_GROUPS_FILE)) {
                const groupsData = fs.readFileSync(FAILURE_GROUPS_FILE, 'utf-8');
                const groups = JSON.parse(groupsData);
                return groups[groupId] || null;
            }
        }
        catch (error) {
            console.error(`Error loading failure group ${groupId}:`, error);
        }
        return null;
    }
    async loadFailure(failureId) {
        try {
            if (fs.existsSync(FAILURES_FILE)) {
                const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
                const failures = JSON.parse(failuresData);
                return failures[failureId] || null;
            }
        }
        catch (error) {
            console.error(`Error loading failure ${failureId}:`, error);
        }
        return null;
    }
    async loadFailuresInGroup(group) {
        try {
            if (fs.existsSync(FAILURES_FILE)) {
                const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
                const allFailures = JSON.parse(failuresData);
                // Filter failures that belong to this group
                return group.failures
                    .map(id => allFailures[id])
                    .filter(failure => failure !== undefined);
            }
        }
        catch (error) {
            console.error(`Error loading failures for group ${group.id}:`, error);
        }
        return [];
    }
    // Prompt generation methods for groups
    generateDetailedPrompt(group, failures) {
        // Sample a few representative failures (up to 3)
        const sampleFailures = failures.slice(0, 3);
        // Generate a detailed prompt
        return `## Failure Group: ${group.name}

### Overview
- Total Failures: ${failures.length}
- Common Error Type: ${group.common_error_type}
- Error Pattern: ${group.pattern}
- First Seen: ${new Date(group.first_seen).toLocaleString()}
- Last Seen: ${new Date(group.last_seen).toLocaleString()}

### Initial Hypothesis
${group.root_cause_hypothesis}

### Sample Failures (${sampleFailures.length} of ${failures.length})

${sampleFailures.map((failure, index) => `
#### Sample Failure ${index + 1}: ${failure.test_name}
- File: ${failure.file_path}
- Line: ${failure.line_number}
- Error Message: ${failure.error_message}
- Traceback:
\`\`\`
${failure.traceback.substring(0, 500)}${failure.traceback.length > 500 ? '...' : ''}
\`\`\`
${failure.locals ? `- Local Variables:\n\`\`\`json\n${JSON.stringify(failure.locals, null, 2).substring(0, 300)}${JSON.stringify(failure.locals, null, 2).length > 300 ? '...' : ''}\n\`\`\`\n` : ''}
`).join('\n')}

### Debugging Task
Please analyze these failures and identify the common root cause. Then suggest the most effective way to fix the issue that addresses all failures in this group.`;
    }
    generateConcisePrompt(group, failures) {
        // Sample a representative failure
        const sampleFailure = failures[0];
        // Generate a concise prompt
        return `## Failure Group: ${group.name}

- ${failures.length} failures with error type: ${group.common_error_type}
- Error pattern: ${group.pattern}
- Example failure: ${sampleFailure.test_name} - ${sampleFailure.error_message}

Identify the common root cause and suggest a fix.`;
    }
    generateStepByStepPrompt(group, failures) {
        // Sample a few representative failures (up to 2)
        const sampleFailures = failures.slice(0, 2);
        // Generate a step-by-step prompt
        return `## Failure Group: ${group.name}

### Group Information
- ${failures.length} failures with error type: ${group.common_error_type}
- Error pattern: ${group.pattern}

### Sample Failures
${sampleFailures.map((failure, index) => `
Sample ${index + 1}: ${failure.test_name}
- Error: ${failure.error_message}
- File: ${failure.file_path}, Line: ${failure.line_number}
`).join('\n')}

### Debugging Steps
1. Examine the error type and pattern across all failures
2. Analyze the sample failures for commonalities
3. Identify potential root causes
4. Determine the most likely root cause
5. Suggest a fix that would address all failures
6. Propose verification steps`;
    }
    generateRootCausePrompt(group, failures) {
        // Sample failures, focusing on different patterns if possible
        const sampleFailures = failures.slice(0, Math.min(5, failures.length));
        // Generate a root cause focused prompt
        return `## Root Cause Analysis: ${group.name}

### Failure Information
- ${failures.length} failures with error type: ${group.common_error_type}
- Pattern: ${group.pattern}
- Initial hypothesis: ${group.root_cause_hypothesis}

### Error Messages from Sample Failures
${sampleFailures.map((failure, index) => `
${index + 1}. "${failure.error_message}"
`).join('\n')}

### Analysis Task
Focus exclusively on determining the root cause of these failures. Consider:
- What conditions would trigger this specific error type?
- Are there common code paths all these tests exercise?
- Is there a recent code change that could explain this pattern?
- Could there be environmental factors (dependencies, configuration)?`;
    }
    // Prompt generation methods for individual failures
    generateDetailedSinglePrompt(failure) {
        return `## Test Failure: ${failure.test_name}

### Failure Details
- Test: ${failure.test_name}
- File: ${failure.file_path}
- Line: ${failure.line_number}
- Error Message: ${failure.error_message}
- Timestamp: ${new Date(failure.timestamp).toLocaleString()}

### Traceback
\`\`\`
${failure.traceback}
\`\`\`

${failure.locals ? `### Local Variables
\`\`\`json
${JSON.stringify(failure.locals, null, 2)}
\`\`\`
` : ''}

### Debugging Task
Please analyze this test failure in detail:
1. Determine the root cause of the failure
2. Suggest a fix for the issue
3. Recommend how to verify the fix works correctly`;
    }
    generateConciseSinglePrompt(failure) {
        return `## Test Failure: ${failure.test_name}

- Error: ${failure.error_message}
- File: ${failure.file_path}, Line: ${failure.line_number}
- Key lines from traceback:
\`\`\`
${this.extractKeyTracebackLines(failure.traceback)}
\`\`\`

Briefly analyze the root cause and suggest a fix.`;
    }
    generateRootCauseSinglePrompt(failure) {
        return `## Root Cause Analysis: ${failure.test_name}

- Test: ${failure.test_name}
- Error: ${failure.error_message}
- File: ${failure.file_path}, Line: ${failure.line_number}
- Traceback:
\`\`\`
${failure.traceback}
\`\`\`
${failure.locals ? `- Key local variables:
\`\`\`json
${JSON.stringify(Object.fromEntries(Object.entries(failure.locals).slice(0, 5)), null, 2)}
\`\`\`
` : ''}

Focus exclusively on determining the root cause of this failure.`;
    }
    extractKeyTracebackLines(traceback) {
        // Extract the most relevant lines from the traceback
        const lines = traceback.split('\n');
        // If traceback is short, return it all
        if (lines.length <= 10) {
            return traceback;
        }
        // Find error lines (typically containing "Error:" or ending with exceptions)
        const errorLines = lines.filter(line => line.includes('Error:') ||
            line.includes('Exception:') ||
            /^\w+Error:/.test(line) ||
            /^\w+Exception:/.test(line));
        // Get a few lines before the error and the error itself
        const errorIndex = lines.findIndex(line => errorLines.some(errorLine => line.includes(errorLine)));
        if (errorIndex !== -1) {
            const startIndex = Math.max(0, errorIndex - 3);
            const endIndex = Math.min(lines.length, errorIndex + 2);
            return lines.slice(startIndex, endIndex).join('\n');
        }
        // Fallback: return first 3 and last 3 lines
        return [...lines.slice(0, 3), '...', ...lines.slice(-3)].join('\n');
    }
}
export default FailurePromptGeneratorTool;
