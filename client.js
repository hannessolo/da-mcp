import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {createInterface} from "readline/promises";
import fs from "fs";
import http from "http";
import url from "url";

class MCPClient {
  constructor() {
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.tools = [];
  }
  
  async connectToServer(serverScriptPath) {
    try {
      const isJs = serverScriptPath.endsWith(".cjs");
      if (!isJs) {
        throw new Error("Server script must be a .js or .py file");
      }
      
      this.transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);
      
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });
      console.log(JSON.stringify(this.tools, null, 2));
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async fetchAIResponse(query) {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: query,
        model: 'hf.co/lmstudio-community/Qwen2.5-7B-Instruct-1M-GGUF:Q8_0',
        stream: false,
      }),
    });
    
    if (!res.ok) {
      throw new Error(`Error fetching AI response: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`Error from AI: ${data.error}`);
    }
    return data.response.trim();
  }

  async processQuery(query, basePrompt) {
    const response = await this.fetchAIResponse(`${basePrompt} \n\nuser: ${query}`);

    console.log("AI Response:", response);
  
    const finalText = [];
  
    if (response.indexOf('##TOOL_CALL##') > 0) {
      const toolCallStart = response.indexOf('##TOOL_CALL##') + '##TOOL_CALL##'.length;
      const toolCallEnd = response.indexOf('##END##');
      if (toolCallEnd === -1) {
        throw new Error("Malformed response: Missing ##END##");
      }

      const toolCallJson = response.slice(toolCallStart, toolCallEnd).trim();
      let toolCall;
      try {
        toolCall = JSON.parse(toolCallJson);
      } catch (e) {
        throw new Error(`Failed to parse tool call JSON: ${e}`);
      }

      if (!toolCall.mcp_tool || !toolCall.mcp_tool.name || !toolCall.mcp_tool.parameters) {
        throw new Error("Malformed tool call JSON: Missing required fields");
      }

      console.log("Running tool --------");
      const toolResult = await this.mcp.callTool({ name: toolCall.mcp_tool.name, arguments: toolCall.mcp_tool.parameters });
      console.log("Done running tool --------");

      const text = toolResult.content[0].text;

      const toolAIResponse = await this.fetchAIResponse(`tool-caller: ${text}`);
      
      finalText.push(toolAIResponse);

      console.log(JSON.stringify(toolResult, null, 2));
    }
  
    return finalText.join("\n");
  }

  async chatLoop(basePrompt) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");
  
      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message, basePrompt);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }
  
  async cleanup() {
    await this.mcp.close();
  }

  async startServer(port = 3000, basePrompt) {
    const server = http.createServer(async (req, res) => {
      if (req.method === 'GET') {
        const parsedUrl = url.parse(req.url, true);
        const query = parsedUrl.query.query;

        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Query parameter is required' }));
          return;
        }

        try {
          const response = await this.processQuery(query, basePrompt);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    });

    server.listen(port, () => {
      console.log(`HTTP server running on port ${port}`);
    });

    return server;
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node index.ts <path_to_server_script> [--http]");
    return;
  }
  console.log("Connecting to MCP server...");

  const prompt = fs.readFileSync('prompt.txt', 'utf-8');

  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    const promptWithTools = `${prompt}\n\nAVAILABLE TOOLS:\n${mcpClient.tools.map((tool) => `
      - ${tool.name}
        - name: ${tool.name}
        - description: ${tool.description}
        - parameters: ${JSON.stringify(tool.input_schema, null, 2)}  
    `).join("\n")}`;
    
    mcpClient.basePrompt = promptWithTools;

    if (process.argv.includes('--http')) {
      await mcpClient.startServer(3000, promptWithTools);
      return;
    } else {
      await mcpClient.chatLoop(promptWithTools);
    }
  } finally {
    if (!process.argv.includes('--http')) {
      await mcpClient.cleanup();
      process.exit(0);
    }
  }
}

main();