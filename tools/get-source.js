import { z } from "zod";
import { BASE_URL, createErrorResponse, createSuccessResponse, getHeaders, makeApiCall, normalizePath } from "../utils.js";

export const getSourceSchema = z.object({
  org: z.string().describe("The organization"),
  repo: z.string().describe("Name of the repository"),
  path: z.string().describe("Path to the source file")
});

export async function getSource({ org, repo, path }) {
  const normalizedPath = normalizePath(path);
  console.error(`Getting source for org=${org} repo=${repo} path=${normalizedPath}`);
  
  try {
    const url = `${BASE_URL}/source/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${normalizedPath}`;
    const options = {
      headers: getHeaders('text/html')
    };

    const response = await makeApiCall(url, options);
    const data = await response.text();
    console.error(`Successfully retrieved source`);
    return createSuccessResponse(`Source Content:\n\n${data}`);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
} 