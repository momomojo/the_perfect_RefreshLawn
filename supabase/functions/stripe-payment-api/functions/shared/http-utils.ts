// HTTP Utils
// Standard CORS headers for all responses
export const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
// Helper for creating error responses
export function createErrorResponse(
  message,
  status = 400,
  headers = corsHeaders
) {
  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      headers,
      status,
    }
  );
}
// Helper for creating success responses
export function createSuccessResponse(data, headers = corsHeaders) {
  return new Response(JSON.stringify(data), {
    headers,
  });
}
// Handle CORS preflight requests
export function handleCorsPreflightRequest() {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}
// Standardized request parsing with error handling
export async function parseRequestBody(req) {
  try {
    return await req.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    throw new Error('Invalid request body format');
  }
}
