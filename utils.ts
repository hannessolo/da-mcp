import fetch, { Response, RequestInit } from "node-fetch";

// Base URL for the DA Admin API (configurable via environment variable)
export const BASE_URL = process.env.DA_ADMIN_API_URL || "https://admin.da.live";

// Types for API responses
export type McpTextContent = {
  type: "text";
  text: string;
  [key: string]: unknown;
};

export type McpResponse = {
  content: McpTextContent[];
  isError?: boolean;
  [key: string]: unknown;
};

export type ApiErrorResponse = {
  content: McpTextContent[];
  isError: true;
  [key: string]: unknown;
};

// Utility function to create an error response
export function createErrorResponse(message: string): ApiErrorResponse {
  console.error(`Error: ${message}`);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true
  };
}

// Utility function to create a success response
export function createSuccessResponse(text: string): McpResponse {
  return {
    content: [{ type: "text", text }]
  };
}

// Utility function to get common headers
export function getHeaders(acceptType: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': acceptType
  };

  if (process.env.DA_ADMIN_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.DA_ADMIN_API_TOKEN}`;
  }

  return headers;
}

// Utility function to handle API errors
export async function getErrorDetail(response: Response): Promise<string> {
  try {
    const errorData = await response.text();
    return errorData ? ` - ${errorData}` : '';
  } catch (e) {
    return '';
  }
}

// Wrapper for API calls
export async function makeApiCall(
  url: string, 
  options: RequestInit
): Promise<Response> {
  try {
    console.error(`Making request to: ${url}`);
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      const errorDetail = await getErrorDetail(response);
      throw new Error(`${response.status} ${response.statusText}${errorDetail}`);
    }

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

// Helper function to ensure path ends with .html
export function normalizePath(path: string): string {
  return path.endsWith('.html') ? path : `${path}.html`;
} 