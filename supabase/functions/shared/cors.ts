/**
 * CORS and Security Headers for Supabase Edge Functions
 *
 * Provides comprehensive security headers to protect against common web vulnerabilities.
 * All Edge Functions should use these headers in their responses.
 */

/**
 * Basic CORS headers for cross-origin requests
 * Note: CORS headers ALONE are not sufficient - security headers are also required
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict to specific origins in production
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Comprehensive security headers to protect against common web vulnerabilities
 *
 * - CSP: Prevents XSS by restricting resource loading
 * - HSTS: Enforces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Controls browser features
 */
export const securityHeaders = {
  // Content Security Policy - Prevents XSS attacks
  'Content-Security-Policy':
    "default-src 'none'; " + // Deny all by default
    "script-src 'self' 'unsafe-inline'; " + // Only allow same-origin scripts
    "connect-src 'self' https://*.supabase.co https://*.stripe.com; " + // API endpoints
    "img-src 'self' data: https:; " + // Allow images from HTTPS
    "style-src 'self' 'unsafe-inline'; " + // Allow inline styles (needed for some frameworks)
    "font-src 'self'; " + // Only same-origin fonts
    "frame-ancestors 'none'; " + // Equivalent to X-Frame-Options DENY
    "base-uri 'self'; " + // Restrict <base> tag
    "form-action 'self'; " + // Restrict form submissions
    'upgrade-insecure-requests', // Automatically upgrade HTTP to HTTPS

  // HTTP Strict Transport Security - Enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Control referrer information leakage
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Control browser features
  'Permissions-Policy':
    'camera=(), ' +
    'microphone=(), ' +
    'geolocation=(), ' +
    'payment=(self), ' + // Allow payment for Stripe
    'usb=(), ' +
    'magnetometer=(), ' +
    'gyroscope=(), ' +
    'accelerometer=()',
};

/**
 * Combined CORS + Security headers
 * Use this for most Edge Function responses
 */
export const secureHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
};

/**
 * Headers for successful JSON responses
 */
export const jsonHeaders = {
  ...secureHeaders,
  'Content-Type': 'application/json',
};

/**
 * Headers for error responses
 */
export const errorHeaders = {
  ...secureHeaders,
  'Content-Type': 'application/json',
};

/**
 * Headers for OPTIONS preflight requests
 * Note: Security headers not needed for preflight (CORS only)
 */
export const preflightHeaders = {
  ...corsHeaders,
};

/**
 * Create a Response with secure headers
 * @param body - Response body (will be JSON stringified)
 * @param status - HTTP status code
 * @param additionalHeaders - Additional headers to merge
 */
export function createSecureResponse(
  body: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
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
 * @param status - HTTP status code (default 500)
 */
export function createErrorResponse(message: string, status = 500): Response {
  return createSecureResponse({ error: message }, status);
}

/**
 * Create a success response with secure headers
 * @param data - Success data
 */
export function createSuccessResponse(data: unknown = {}): Response {
  return createSecureResponse(data, 200);
}

/**
 * Handle OPTIONS preflight requests
 */
export function handlePreflightRequest(): Response {
  return new Response(null, {
    status: 204,
    headers: preflightHeaders,
  });
}
