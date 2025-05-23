import fetch from "node-fetch";

// Base URL for the DA Admin API (configurable via environment variable)
export const BASE_URL = process.env.DA_ADMIN_API_URL || "https://admin.da.live";

// Utility function to create an error response
export function createErrorResponse(message) {
  console.error(`Error: ${message}`);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true
  };
}

// Utility function to create a success response
export function createSuccessResponse(text) {
  return {
    content: [{ type: "text", text }]
  };
}

// Utility function to get common headers
export function getHeaders(acceptType) {
  const headers = {
    'Accept': acceptType
  };

  if (process.env.DA_ADMIN_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.DA_ADMIN_API_TOKEN}`;
  }

  return headers;
}

// Utility function to handle API errors
export async function getErrorDetail(response) {
  try {
    const errorData = await response.text();
    return errorData ? ` - ${errorData}` : '';
  } catch (e) {
    return '';
  }
}

// Wrapper for API calls
export async function makeApiCall(
  url, 
  options
) {
  try {
    console.error(`Making request to: ${url}`);
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      const errorDetail = await getErrorDetail(response);
      throw new Error(`${response.status} ${response.statusText}${errorDetail}`);
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

// Helper function to ensure path ends with .html
export function normalizePath(path) {
  let normalizedPath = path;

  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }

  if (!normalizedPath.endsWith('.html')) {
    normalizedPath += '.html';
  }

  return normalizedPath;
} 