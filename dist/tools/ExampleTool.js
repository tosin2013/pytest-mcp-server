import { MCPTool } from "mcp-framework";
import { z } from "zod";
class ExampleTool extends MCPTool {
    name = "example_tool";
    description = "An example tool that processes messages";
    schema = {
        message: {
            type: z.string(),
            description: "Message to process",
        },
    };
    async execute(input) {
        return `Processed: ${input.message}`;
    }
}
export default ExampleTool;
