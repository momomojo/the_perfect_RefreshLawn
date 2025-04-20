// CORS specific headers (extracted from http-utils)
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow requests from any origin (restrict in production!)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type", // Allow specific headers
  "Access-Control-Allow-Methods": "POST, OPTIONS", // Ensure OPTIONS is allowed for preflight
};
