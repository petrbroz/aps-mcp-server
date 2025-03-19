import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as tools from "./tools/index.js";

const server = new McpServer({ name: "autodesk-platform-services", version: "0.0.1" });

for (const tool of Object.values(tools)) {
    server.tool(tool.title, tool.description, tool.schema, tool.callback);
}

try {
    await server.connect(new StdioServerTransport());
} catch (err) {
    console.error("Server error:", err);
}