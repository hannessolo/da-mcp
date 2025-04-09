import { z } from "zod";
import { BASE_URL, createErrorResponse, createSuccessResponse, getHeaders, makeApiCall, normalizePath } from "../utils.js";

export const createPageSchema = z.object({
  org: z.string().describe("The organization"),
  repo: z.string().describe("Name of the repository"),
  path: z.string().describe("Path where to create the new page")
});

export type CreatePageParams = z.infer<typeof createPageSchema>;

type CreatePageResponse = {
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

export async function createPage({ org, repo, path }: CreatePageParams) {
  const normalizedPath = normalizePath(path);
  console.error(`Creating new page for org=${org} repo=${repo} path=${normalizedPath}`);
  
  try {
    const url = `${BASE_URL}/source/${encodeURIComponent(org)}/${encodeURIComponent(repo)}${normalizedPath}`;
    
    // Create FormData with default HTML content
    const defaultContent = `<body>
<header></header>
<main></main>
<footer></footer>
</body>`;
    const formData = new FormData();
    const blob = new Blob([defaultContent], { type: 'text/html' });
    formData.set('data', blob);

    const options = {
      method: 'POST',
      headers: getHeaders('application/json'),
      body: formData
    };

    const response = await makeApiCall(url, options);
    
    // For successful creation (201), we get additional information
    if (response.status === 201) {
      const data = await response.json();
      
      // Type check the response data
      if (typeof data !== 'object' || data === null) {
        return createErrorResponse(`Unexpected API response format. Expected object, got: ${JSON.stringify(data)}`);
      }

      const responseData = data as CreatePageResponse;
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
      
      return createSuccessResponse(formattedOutput);
    }

    return createSuccessResponse(`Successfully created new page at ${path}`);
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error.message : String(error));
  }
} 