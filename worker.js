import {McpAgent} from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listSources, listSourcesSchema } from "./tools/list-sources.js";
import { getSource, getSourceSchema } from "./tools/get-source.js";
import { updateDocument, updateDocumentSchema } from "./tools/update-document.js";
import { createPage, createPageSchema } from "./tools/create-page.js";

export class DaMcp extends McpAgent {
  server = new McpServer({
    name: 'DaMcp',
    version: '1.0.0'
  });

  async init() {
    // Register tools
    this.server.tool("list-sources", listSourcesSchema.shape, listSources);
    this.server.tool("get-source", getSourceSchema.shape, getSource);
    this.server.tool("update-document", updateDocumentSchema.shape, updateDocument);
    this.server.tool("create-page", createPageSchema.shape, createPage);
  }
}

export default {
  async fetch(request, env, ctx) {
    return DaMcp.mount('/sse', { binding: 'DA_MCP', corsOptions: { origin: '*' } }).fetch(request, env, ctx);
  }
}
