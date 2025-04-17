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
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          }
        };
      });
      console.log(JSON.stringify(this.tools, null, 2));
      console.log(
        "Connected to server with tools:",
        this.tools.map((tool) => tool.function.name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async fetchAIResponse(messages) {
    console.log(JSON.stringify(messages));

    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: 'hf.co/lmstudio-community/Qwen2.5-7B-Instruct-1M-GGUF:Q8_0',
        stream: false,
        tools: this.tools,
      }),
    });
    
    if (!res.ok) {
      throw new Error(`Error fetching AI response: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`Error from AI: ${data.error}`);
    }
    return data;
  }

  async processQuery(messages) {
    const response = await this.fetchAIResponse(messages);
  
    const finalText = [];

    messages.push(response.message);

    if (response.message.content) {
      finalText.push(response.message.content);
    }

    let toolCalls = response.message.tool_calls;

    console.log("Tool calls: ", toolCalls);

    while (toolCalls?.length > 0) {
      const promises = response.message.tool_calls?.map(async (toolCall) => {
        if (!toolCall.function) { return; }
  
        const toolResult = await this.mcp.callTool({ name: toolCall.function.name, arguments: toolCall.function.arguments });
        return toolResult.content[0].text;
      });
  
      const toolResults = await Promise.all(promises);
  
      toolResults.forEach((toolResult) => {
        messages.push({ role: "tool", content: toolResult });
      });
  
      const toolResponse = await this.fetchAIResponse(messages);
      messages.push(toolResponse.message);
      finalText.push(toolResponse.message.content);
      toolCalls = toolResponse.message.tool_calls;
    }
  
    return finalText.join("\n");
  }

  async chatLoop() {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // const basePrompt = fs.readFileSync('prompt.txt', 'utf-8');
    const basePrompt = "You are a helpful assistant. Answer the user's questions and provide information as needed.";
    const messages = [{ role: "system", content: basePrompt }];
  
    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");
  
      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }

        messages.push({ role: "user", content: message });

        const response = await this.processQuery(messages);
        console.log("\n" + response);
      }
    } catch(e) {
      console.error(e);
    } finally {
      rl.close();
    }
  }
  
  async cleanup() {
    await this.mcp.close();
  }

  async startServer(port = 3000) {
    const server = http.createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Only handle POST requests
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      try {
        // Parse request body
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { messages } = JSON.parse(body);
            
            if (!Array.isArray(messages)) {
              throw new Error('Messages must be an array');
            }

            const response = await this.processQuery(messages);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
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

  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);

    if (process.argv.includes('--http')) {
      await mcpClient.startServer(3001);
      return;
    } else {
      await mcpClient.chatLoop();
    }
  } finally {
    if (!process.argv.includes('--http')) {
      await mcpClient.cleanup();
      process.exit(0);
    }
  }
}

main();