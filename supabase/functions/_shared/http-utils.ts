// Standard CORS headers for all responses
export const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Type definition for response headers
export type ResponseHeaders = typeof corsHeaders;

// Helper for creating error responses
export function createErrorResponse(
  message: string,
  status: number = 400,
  headers: ResponseHeaders = corsHeaders
): Response {
  return new Response(JSON.stringify({ error: message }), { headers, status });
}

// Helper for creating success responses
export function createSuccessResponse(
  data: any,
  headers: ResponseHeaders = corsHeaders
): Response {
  return new Response(JSON.stringify(data), { headers });
}

// Handle CORS preflight requests
export function handleCorsPreflightRequest(): Response {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}

// Standardized request parsing with error handling
export async function parseRequestBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    throw new Error("Invalid request body format");
  }
}
