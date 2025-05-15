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
// Initialize files if they don't exist
for (const file of [FAILURES_FILE, FAILURE_GROUPS_FILE]) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify({}));
    }
}
class FailureAnalyticsTool extends MCPTool {
    name = "analyze_failures";
    description = "Group and analyze similar test failures, generate insights, and automate triage";
    schema = {
        group_by: {
            type: z.string().optional(),
            description: "Method to group failures (error_type, file_path, pattern). Default is 'error_type'",
        },
        time_range: {
            type: z.string().optional(),
            description: "Time range for analysis (all, today, week, month). Default is 'all'",
        },
        include_resolved: {
            type: z.boolean().optional(),
            description: "Whether to include resolved failures in the analysis. Default is false",
        }
    };
    async execute(input) {
        const groupBy = input.group_by || 'error_type';
        const timeRange = input.time_range || 'all';
        const includeResolved = input.include_resolved || false;
        // Load failures
        let failures = {};
        try {
            const failuresData = fs.readFileSync(FAILURES_FILE, 'utf-8');
            failures = JSON.parse(failuresData);
        }
        catch (error) {
            return { error: "Failed to load failures data" };
        }
        // Filter failures by time range and status
        const filteredFailures = Object.values(failures).filter((failure) => {
            // Filter by status if needed
            if (!includeResolved && failure.status === 'resolved') {
                return false;
            }
            // Filter by time range
            if (timeRange !== 'all') {
                const failureDate = new Date(failure.timestamp);
                const now = new Date();
                if (timeRange === 'today') {
                    return failureDate.toDateString() === now.toDateString();
                }
                else if (timeRange === 'week') {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return failureDate >= weekAgo;
                }
                else if (timeRange === 'month') {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return failureDate >= monthAgo;
                }
            }
            return true;
        });
        // Group failures
        const groups = this.groupFailures(filteredFailures, groupBy);
        // Generate insights and triage information
        const insights = this.generateInsights(groups);
        // Save failure groups
        this.saveFailureGroups(groups);
        return {
            total_failures: filteredFailures.length,
            group_count: groups.length,
            groups: groups,
            insights: insights,
            group_by: groupBy,
            time_range: timeRange
        };
    }
    groupFailures(failures, groupBy) {
        const groups = {};
        failures.forEach(failure => {
            let groupKey = '';
            let pattern = '';
            // Determine the group key based on groupBy parameter
            if (groupBy === 'error_type') {
                // Extract error type from the error message
                const errorMatch = failure.error_message.match(/^([A-Za-z]+Error|AssertionError|Exception):/);
                groupKey = errorMatch ? errorMatch[1] : 'UnknownError';
                pattern = this.extractErrorPattern(failure.error_message);
            }
            else if (groupBy === 'file_path') {
                groupKey = failure.file_path;
                pattern = `Failures in ${path.basename(failure.file_path)}`;
            }
            else if (groupBy === 'pattern') {
                // Use a more complex pattern matching based on error message similarity
                pattern = this.extractErrorPattern(failure.error_message);
                groupKey = pattern;
            }
            // Create or update group
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    id: `group_${Date.now()}_${Object.keys(groups).length}`,
                    name: `${groupKey} Failures`,
                    pattern: pattern,
                    count: 0,
                    failures: [],
                    common_error_type: this.determineErrorType(failure),
                    root_cause_hypothesis: this.generateHypothesis(failure),
                    first_seen: failure.timestamp,
                    last_seen: failure.timestamp
                };
            }
            // Update group information
            groups[groupKey].count++;
            groups[groupKey].failures.push(failure.id);
            // Update timestamps
            const failureDate = new Date(failure.timestamp);
            const firstSeenDate = new Date(groups[groupKey].first_seen);
            const lastSeenDate = new Date(groups[groupKey].last_seen);
            if (failureDate < firstSeenDate) {
                groups[groupKey].first_seen = failure.timestamp;
            }
            if (failureDate > lastSeenDate) {
                groups[groupKey].last_seen = failure.timestamp;
            }
        });
        return Object.values(groups);
    }
    extractErrorPattern(errorMessage) {
        // Remove specific values but keep the structure
        return errorMessage
            .replace(/[0-9]+/g, 'N') // Replace numbers with N
            .replace(/'[^']*'/g, "'VALUE'") // Replace quoted strings
            .replace(/"[^"]*"/g, '"VALUE"') // Replace double-quoted strings
            .trim();
    }
    determineErrorType(failure) {
        // Extract the error type from the error message
        const errorMatch = failure.error_message.match(/^([A-Za-z]+Error|AssertionError|Exception):/);
        return errorMatch ? errorMatch[1] : 'Unknown Error';
    }
    generateHypothesis(failure) {
        const errorType = this.determineErrorType(failure);
        // Generate different hypotheses based on error type
        if (errorType === 'AssertionError') {
            return "Expected values don't match actual results. Possible regression in functionality.";
        }
        else if (errorType === 'TypeError') {
            return "Incorrect type handling. Possible data structure change or unexpected input format.";
        }
        else if (errorType === 'AttributeError' || errorType.includes('NameError')) {
            return "Missing attribute or variable. Possible refactoring issue or missing initialization.";
        }
        else if (errorType.includes('ImportError')) {
            return "Problem with imports. Possible missing dependency or incorrect import path.";
        }
        else if (errorType.includes('TimeoutError')) {
            return "Operation timed out. Possible performance regression or deadlock.";
        }
        else {
            return "Unknown error pattern. Requires individual investigation.";
        }
    }
    generateInsights(groups) {
        // Generate overall insights from the failure groups
        const totalFailures = groups.reduce((sum, group) => sum + group.count, 0);
        const mostCommonGroup = groups.sort((a, b) => b.count - a.count)[0];
        const errorTypeDistribution = {};
        groups.forEach(group => {
            if (!errorTypeDistribution[group.common_error_type]) {
                errorTypeDistribution[group.common_error_type] = 0;
            }
            errorTypeDistribution[group.common_error_type] += group.count;
        });
        // Generate triage recommendations
        const triageRecommendations = groups.map(group => {
            return {
                group_id: group.id,
                priority: this.calculatePriority(group),
                recommendation: this.generateTriageAction(group)
            };
        }).sort((a, b) => b.priority - a.priority);
        return {
            total_failure_count: totalFailures,
            group_count: groups.length,
            most_common_error: mostCommonGroup ? mostCommonGroup.common_error_type : 'None',
            error_distribution: errorTypeDistribution,
            triage_recommendations: triageRecommendations
        };
    }
    calculatePriority(group) {
        // Calculate priority based on count, recency, and error type
        let priority = group.count;
        // Increase priority for recent failures
        const lastSeen = new Date(group.last_seen);
        const now = new Date();
        const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSeen < 24) {
            priority += 5;
        }
        // Adjust priority based on error type
        const criticalErrors = ['SecurityError', 'DataCorruptionError'];
        if (criticalErrors.includes(group.common_error_type)) {
            priority += 10;
        }
        return priority;
    }
    generateTriageAction(group) {
        const priority = this.calculatePriority(group);
        if (priority > 15) {
            return `URGENT: Investigate immediately - ${group.common_error_type} affecting ${group.count} tests`;
        }
        else if (priority > 10) {
            return `HIGH: Assign to developer for investigation - likely a regression in ${group.pattern}`;
        }
        else if (priority > 5) {
            return `MEDIUM: Schedule investigation - ${group.common_error_type} needs attention`;
        }
        else {
            return `LOW: Monitor for increased frequency - ${group.count} occurrences of ${group.common_error_type}`;
        }
    }
    saveFailureGroups(groups) {
        try {
            // Load existing groups
            let existingGroups = {};
            if (fs.existsSync(FAILURE_GROUPS_FILE)) {
                const groupsData = fs.readFileSync(FAILURE_GROUPS_FILE, 'utf-8');
                existingGroups = JSON.parse(groupsData);
            }
            // Update with new groups
            groups.forEach(group => {
                existingGroups[group.id] = group;
            });
            // Save updated groups
            fs.writeFileSync(FAILURE_GROUPS_FILE, JSON.stringify(existingGroups, null, 2));
        }
        catch (error) {
            console.error('Error saving failure groups:', error);
        }
    }
}
export default FailureAnalyticsTool;
