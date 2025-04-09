import { z } from "zod";
import { BASE_URL, createErrorResponse, createSuccessResponse, getHeaders, makeApiCall, normalizePath } from "../utils.js";

export const updateDocumentSchema = z.object({
  org: z.string().describe("The organization"),
  repo: z.string().describe("Name of the repository"),
  path: z.string().describe("Path to the document to update"),
  content: z.string().describe("The HTML content to update the document with")
});

export type UpdateDocumentParams = z.infer<typeof updateDocumentSchema>;

export async function updateDocument({ org, repo, path, content }: UpdateDocumentParams) {
  const normalizedPath = normalizePath(path);
  console.error(`Updating document for org=${org} repo=${repo} path=${normalizedPath}`);
  
  try {
    const url = `${BASE_URL}/source/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${normalizedPath}`;
    
    // Create FormData and add the content
    const formData = new FormData();
    const blob = new Blob([content], { type: 'text/html' });
    formData.set('data', blob);

    const options = {
      method: 'POST',
      headers: getHeaders('application/json'),
      body: formData
    };

    await makeApiCall(url, options);
    return createSuccessResponse(`Successfully updated document at ${path}`);
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
} 