import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BASE_URL } from "./utils.js";
import { listSources, listSourcesSchema } from "./tools/list-sources.js";
import { getSource, getSourceSchema } from "./tools/get-source.js";
import { updateDocument, updateDocumentSchema } from "./tools/update-document.js";
import { createPage, createPageSchema } from "./tools/create-page.js";

// Create an MCP server
const server = new McpServer({
  name: "DA Admin API",
  version: "1.0.0",
  description: "MCP server for interacting with the Document Authoring Admin API"
});

// Log startup information
console.error(`Starting DA Admin API MCP server using ${BASE_URL}`);

// Check for API token at startup
if (!process.env.DA_ADMIN_API_TOKEN) {
  console.error("Warning: DA_ADMIN_API_TOKEN environment variable not set. Authentication will fail.");
}

// Register tools
server.tool("list-sources", listSourcesSchema.shape, listSources);
server.tool("get-source", getSourceSchema.shape, getSource);
server.tool("update-document", updateDocumentSchema.shape, updateDocument);
server.tool("create-page", createPageSchema.shape, createPage);

// Start the server
const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});