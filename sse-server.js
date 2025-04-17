import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { BASE_URL } from "./utils.js";
import { listSources, listSourcesSchema } from "./tools/list-sources.js";
import { getSource, getSourceSchema } from "./tools/get-source.js";
import { updateDocument, updateDocumentSchema } from "./tools/update-document.js";
import { createPage, createPageSchema } from "./tools/create-page.js";
import express from 'express';
import cors from 'cors';

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
let transport = null;

const app = express();
app.use(cors());

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});


app.listen(3001);