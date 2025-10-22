/**
 * HTTP Response Utilities with Security Headers
 *
 * All response helpers automatically include security headers.
 * Use these instead of creating raw Response objects.
 *
 * This is the CANONICAL source - all Edge Functions should import from here.
 */

import { secureHeaders, handlePreflightRequest } from './cors.ts';

/**
 * Standard CORS headers (for backward compatibility)
 * @deprecated Use secureHeaders from cors.ts instead
 */
export const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
};

/** Type definition for response headers */
export type ResponseHeaders = typeof corsHeaders;

/**
 * Create a JSON response with secure headers
 * @param data - Response data (will be JSON stringified)
 * @param status - HTTP status code
 * @param additionalHeaders - Additional headers to merge
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...secureHeaders,
      ...additionalHeaders,
    },
  });
}

/**
 * Create an error response with secure headers
 * @param message - Error message
 * @param status - HTTP status code (default 400)
 */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Create a success response with secure headers
 * @param data - Success data (default: { success: true })
 */
export function successResponse(data: unknown = { success: true }): Response {
  return jsonResponse(data, 200);
}

/**
 * Helper for creating error responses (backward compatible)
 * @deprecated Use errorResponse() instead
 */
export function createErrorResponse(
  message: string,
  status = 400,
  headers: ResponseHeaders = corsHeaders
): Response {
  return errorResponse(message, status);
}

/**
 * Helper for creating success responses (backward compatible)
 * @deprecated Use successResponse() instead
 */
export function createSuccessResponse(
  data: unknown,
  headers: ResponseHeaders = corsHeaders
): Response {
  return successResponse(data);
}

/**
 * Handle CORS preflight OPTIONS request
 * Use this at the start of your Edge Function
 */
export function handleOptionsRequest(): Response {
  return handlePreflightRequest();
}

/**
 * Handle CORS preflight requests (backward compatible)
 * @deprecated Use handleOptionsRequest() instead
 */
export function handleCorsPreflightRequest(): Response {
  return handleOptionsRequest();
}

/**
 * Standardized request parsing with error handling
 * @param req - Incoming HTTP request
 * @returns Parsed JSON body
 * @throws Error if body is invalid JSON
 */
export async function parseRequestBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch (error) {
    console.error('[HTTP] Error parsing request body:', error);
    throw new Error('Invalid request body format');
  }
}

/**
 * Common Edge Function request handler wrapper
 * Automatically handles OPTIONS requests and catches errors
 *
 * @example
 * import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
 * import { handleRequest, successResponse } from "../shared/http-utils.ts";
 *
 * serve(handleRequest(async (req) => {
 *   const data = await processRequest(req);
 *   return successResponse(data);
 * }));
 */
export function handleRequest(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest();
    }

    try {
      return await handler(req);
    } catch (error) {
      console.error('[HTTP] Unhandled error:', error);
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      return errorResponse(message, 500);
    }
  };
}

/**
 * Validate that request method is allowed
 * @param req - Incoming HTTP request
 * @param allowedMethods - Array of allowed HTTP methods
 * @throws Error if method not allowed
 */
export function validateMethod(req: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(req.method)) {
    throw new Error(
      `Method ${req.method} not allowed. Use: ${allowedMethods.join(', ')}`
    );
  }
}

/**
 * Extract and validate authorization header
 * @param req - Incoming HTTP request
 * @returns JWT token from Authorization header
 * @throws Error if header missing or invalid
 */
export function extractAuthToken(req: Request): string {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header must use Bearer scheme');
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('Authorization token is empty');
  }

  return token;
}
