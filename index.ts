import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

// Create an MCP server
const server = new McpServer({
  name: "DA Admin API",
  version: "1.0.0",
  description: "MCP server for interacting with the Document Authoring Admin API"
});

// Base URL for the DA Admin API (configurable via environment variable)
const BASE_URL = process.env.DA_ADMIN_API_URL || "https://admin.da.live";

// Log startup information
console.error(`Starting DA Admin API MCP server using ${BASE_URL}`);

// Check for API token at startup
if (!process.env.DA_ADMIN_API_TOKEN) {
  console.error("Warning: DA_ADMIN_API_TOKEN environment variable not set. Authentication will fail.");
}

// Add a tool to list sources
server.tool("list-sources",
  { 
    org: z.string().describe("The organization"),
    repo: z.string().describe("Name of the repository"),
    path: z.string().describe("Path to list sources from")
  },
  async ({ org, repo, path }) => {
    console.error(`Listing sources for org=${org} repo=${repo} path=${path}`);
    
    try {
      // Make a request to the DA Admin API
      const url = `${BASE_URL}/list/${encodeURIComponent(org)}/${encodeURIComponent(repo)}/${path}`;
      console.error(`Making request to: ${url}`);
      
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (process.env.DA_ADMIN_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.DA_ADMIN_API_TOKEN}`;
      }

      const response = await fetch(url, {
        headers
      });

      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`);
        
        // Try to get more detailed error information
        let errorDetail = "";
        try {
          const errorData = await response.text();
          errorDetail = ` - ${errorData}`;
        } catch (e) {
          // Ignore error parsing errors
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `Error: ${response.status} ${response.statusText}${errorDetail}` 
          }],
          isError: true
        };
      }

      const data = await response.json();
      console.error(`Successfully retrieved sources`);
      
      // Check if the response has the expected structure - it should be an array
      if (!Array.isArray(data)) {
        return {
          content: [{ 
            type: "text", 
            text: `Error: Unexpected API response format. Expected array, got: ${JSON.stringify(data)}` 
          }],
          isError: true
        };
      }
      
      // Format the sources in a user-friendly way
      const sourcesCount = data.length;
      let formattedOutput = `Found ${sourcesCount} source${sourcesCount !== 1 ? 's' : ''} at ${path}:\n\n`;
      
      data.forEach((source, index) => {
        formattedOutput += `${index + 1}. ${source.name}${source.ext ? source.ext : ''}\n`;
        formattedOutput += `   Path: ${source.path}\n`;
        if (source.lastModified) {
          formattedOutput += `   Last Modified: ${source.lastModified}\n`;
        }
        
        // Add any other properties that might be present
        const knownProps = ['path', 'name', 'ext', 'lastModified'];
        const otherProps = Object.entries(source).filter(([key]) => !knownProps.includes(key));
        
        if (otherProps.length > 0) {
          formattedOutput += `   Additional Properties:\n`;
          otherProps.forEach(([key, value]) => {
            formattedOutput += `     - ${key}: ${JSON.stringify(value)}\n`;
          });
        }
        
        if (index < data.length - 1) {
          formattedOutput += '\n';
        }
      });
      
      return {
        content: [{ 
          type: "text", 
          text: formattedOutput
        }]
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${errorMessage}`);
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${errorMessage}` 
        }],
        isError: true
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});