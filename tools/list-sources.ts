import { z } from "zod";
import { BASE_URL, createErrorResponse, createSuccessResponse, getHeaders, makeApiCall } from "../utils.js";

export const listSourcesSchema = z.object({
  org: z.string().describe("The organization"),
  repo: z.string().describe("Name of the repository"),
  path: z.string().describe("Path to list sources from")
});

export type ListSourcesParams = z.infer<typeof listSourcesSchema>;

export async function listSources({ org, repo, path }: ListSourcesParams) {
  console.error(`Listing sources for org=${org} repo=${repo} path=${path}`);
  
  try {
    const url = `${BASE_URL}/list/${encodeURIComponent(org)}/${encodeURIComponent(repo)}/${path}`;
    const options = {
      headers: getHeaders('application/json')
    };

    const response = await makeApiCall(url, options);
    const data = await response.json();
    console.error(`Successfully retrieved sources`);
    
    // Check if the response has the expected structure - it should be an array
    if (!Array.isArray(data)) {
      return createErrorResponse(`Unexpected API response format. Expected array, got: ${JSON.stringify(data)}`);
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
    
    return createSuccessResponse(formattedOutput);
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
} 