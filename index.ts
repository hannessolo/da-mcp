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

// Helper function to ensure path ends with .html
function normalizePath(path: string): string {
  return path.endsWith('.html') ? path : `${path}.html`;
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
        formattedOutput += `${index + 1}. ${source.name}${source.ext ? `.${source.ext}` : ''}\n`;
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

// Add a tool to get a single source
server.tool("get-source",
  { 
    org: z.string().describe("The organization"),
    repo: z.string().describe("Name of the repository"),
    path: z.string().describe("Path to the source file")
  },
  async ({ org, repo, path }) => {
    const normalizedPath = normalizePath(path);
    console.error(`Getting source for org=${org} repo=${repo} path=${normalizedPath}`);
    
    try {
      // Make a request to the DA Admin API
      const url = `${BASE_URL}/source/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${normalizedPath}`;
      console.error(`Making request to: ${url}`);
      
      const headers: Record<string, string> = {
        'Accept': 'text/html'
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

      const data = await response.text();
      console.error(`Successfully retrieved source`);
      
      // Format the source details in a user-friendly way
      let formattedOutput = `Source Content:\n\n`;
      formattedOutput += data;
      
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

// Add a tool to update a document
server.tool("update-document",
  { 
    org: z.string().describe("The organization"),
    repo: z.string().describe("Name of the repository"),
    path: z.string().describe("Path to the document to update"),
    content: z.string().describe("The HTML content to update the document with")
  },
  async ({ org, repo, path, content }) => {
    const normalizedPath = normalizePath(path);
    console.error(`Updating document for org=${org} repo=${repo} path=${normalizedPath}`);
    
    try {
      // Make a request to the DA Admin API
      const url = `${BASE_URL}/source/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${normalizedPath}`;
      console.error(`Making request to: ${url}`);
      
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (process.env.DA_ADMIN_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.DA_ADMIN_API_TOKEN}`;
      }

      // Create FormData and add the content
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/html' });
      formData.set('data', blob);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
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

      return {
        content: [{ 
          type: "text", 
          text: `Successfully updated document at ${path}` 
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

// Add a tool to create a new page
server.tool("create-page",
  { 
    org: z.string().describe("The organization"),
    repo: z.string().describe("Name of the repository"),
    path: z.string().describe("Path where to create the new page")
  },
  async ({ org, repo, path }) => {
    const normalizedPath = normalizePath(path);
    console.error(`Creating new page for org=${org} repo=${repo} path=${normalizedPath}`);
    
    try {
      // Make a request to the DA Admin API
      const url = `${BASE_URL}/source/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${normalizedPath}`;
      console.error(`Making request to: ${url}`);
      
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };

      if (process.env.DA_ADMIN_API_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.DA_ADMIN_API_TOKEN}`;
      }

      // Create FormData and add the default HTML content
      const defaultContent = `<body>
<header></header>
<main></main>
<footer></footer>
</body>`;
      const formData = new FormData();
      const blob = new Blob([defaultContent], { type: 'text/html' });
      formData.set('data', blob);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
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

      // For successful creation (201), we get additional information
      if (response.status === 201) {
        const data = await response.json();
        
        // Type check the response data
        if (typeof data !== 'object' || data === null) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: Unexpected API response format. Expected object, got: ${JSON.stringify(data)}` 
            }],
            isError: true
          };
        }

        const responseData = data as {
          source: {
            editUrl: string;
            contentUrl: string;
            status: number;
            props?: Record<string, unknown>;
          };
          aem: {
            previewUrl: string;
            liveUrl: string;
          };
        };

        const sourceInfo = responseData.source;
        const aemInfo = responseData.aem;
        
        let formattedOutput = `Successfully created new page at ${path}\n\n`;
        formattedOutput += `Edit URL: ${sourceInfo.editUrl}\n`;
        formattedOutput += `Content URL: ${sourceInfo.contentUrl}\n`;
        formattedOutput += `AEM Preview URL: ${aemInfo.previewUrl}\n`;
        formattedOutput += `AEM Live URL: ${aemInfo.liveUrl}\n`;
        
        if (sourceInfo.props) {
          formattedOutput += `\nProperties:\n`;
          Object.entries(sourceInfo.props).forEach(([key, value]) => {
            formattedOutput += `- ${key}: ${value}\n`;
          });
        }
        
        return {
          content: [{ 
            type: "text", 
            text: formattedOutput
          }]
        };
      }

      return {
        content: [{ 
          type: "text", 
          text: `Successfully created new page at ${path}` 
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