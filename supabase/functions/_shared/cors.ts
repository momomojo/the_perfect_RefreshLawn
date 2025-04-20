// File: supabase/functions/_shared/cors.ts
// Recommended CORS headers based on Supabase documentation

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow requests from any origin (restrict in production!)
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type", // Allow specific headers
};
