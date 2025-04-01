"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var zod_1 = require("zod");
var node_fetch_1 = require("node-fetch");
// Create an MCP server
var server = new mcp_js_1.McpServer({
    name: "DA Admin API",
    version: "1.0.0",
    description: "MCP server for interacting with the Document Authoring Admin API"
});
// Base URL for the DA Admin API (configurable via environment variable)
var BASE_URL = process.env.DA_ADMIN_API_URL || "https://admin.da.live";
// Log startup information
console.error("Starting DA Admin API MCP server using ".concat(BASE_URL));
// Check for API token at startup
if (!process.env.DA_ADMIN_API_TOKEN) {
    console.error("Warning: DA_ADMIN_API_TOKEN environment variable not set. Authentication will fail.");
}
// Add a tool to list sources
server.tool("list-sources", {
    org: zod_1.z.string().describe("The organization"),
    repo: zod_1.z.string().describe("Name of the repository"),
    path: zod_1.z.string().describe("Path to list sources from")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var url, response, errorDetail, errorData, e_1, data_1, sourcesCount, formattedOutput_1, error_1;
    var org = _b.org, repo = _b.repo, path = _b.path;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.error("Listing sources for org=".concat(org, " repo=").concat(repo, " path=").concat(path));
                _c.label = 1;
            case 1:
                _c.trys.push([1, 9, , 10]);
                url = "".concat(BASE_URL, "/list/").concat(encodeURIComponent(org), "/").concat(encodeURIComponent(repo), "/").concat(encodeURIComponent(path));
                console.error("Making request to: ".concat(url));
                return [4 /*yield*/, (0, node_fetch_1.default)(url, {
                        headers: {
                            'Authorization': "Bearer ".concat(process.env.DA_ADMIN_API_TOKEN),
                            'Accept': 'application/json'
                        }
                    })];
            case 2:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 7];
                console.error("API request failed: ".concat(response.status, " ").concat(response.statusText));
                errorDetail = "";
                _c.label = 3;
            case 3:
                _c.trys.push([3, 5, , 6]);
                return [4 /*yield*/, response.text()];
            case 4:
                errorData = _c.sent();
                errorDetail = " - ".concat(errorData);
                return [3 /*break*/, 6];
            case 5:
                e_1 = _c.sent();
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/, {
                    content: [{
                            type: "text",
                            text: "Error: ".concat(response.status, " ").concat(response.statusText).concat(errorDetail)
                        }],
                    isError: true
                }];
            case 7: return [4 /*yield*/, response.json()];
            case 8:
                data_1 = _c.sent();
                console.error("Successfully retrieved sources");
                // Check if the response has the expected structure
                if (!data_1.sources || !Array.isArray(data_1.sources)) {
                    return [2 /*return*/, {
                            content: [{
                                    type: "text",
                                    text: "Error: Unexpected API response format. Response: ".concat(JSON.stringify(data_1))
                                }],
                            isError: true
                        }];
                }
                sourcesCount = data_1.sources.length;
                formattedOutput_1 = "Found ".concat(sourcesCount, " source").concat(sourcesCount !== 1 ? 's' : '', " at ").concat(path, ":\n\n");
                data_1.sources.forEach(function (source, index) {
                    formattedOutput_1 += "".concat(index + 1, ". Edit URL: ").concat(source.editUrl, "\n");
                    formattedOutput_1 += "   Content URL: ".concat(source.contentUrl, "\n");
                    if (source.props) {
                        formattedOutput_1 += "   Properties:\n";
                        Object.entries(source.props).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            formattedOutput_1 += "     - ".concat(key, ": ").concat(value, "\n");
                        });
                    }
                    if (index < data_1.sources.length - 1) {
                        formattedOutput_1 += '\n';
                    }
                });
                return [2 /*return*/, {
                        content: [{
                                type: "text",
                                text: formattedOutput_1
                            }]
                    }];
            case 9:
                error_1 = _c.sent();
                console.error("Error: ".concat(error_1.message));
                return [2 /*return*/, {
                        content: [{
                                type: "text",
                                text: "Error: ".concat(error_1.message)
                            }],
                        isError: true
                    }];
            case 10: return [2 /*return*/];
        }
    });
}); });
;
// Start the server
var transport = new stdio_js_1.StdioServerTransport();
server.connect(transport).catch(function (error) {
    console.error("Failed to start server: ".concat(error.message));
    process.exit(1);
});
