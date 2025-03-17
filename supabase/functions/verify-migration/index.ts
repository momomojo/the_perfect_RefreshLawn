// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_node_server

import { createClient } from "https://deno.land/x/supabase@1.11.7/mod.ts";

console.log("Verification function ready!");

// Simple endpoint that returns instructions to verify the migrations
serve(async (req) => {
  const projectUrl = "https://brvgbflmcolgvswuzjho.supabase.co";

  // Create a response with verification instructions
  const response = {
    status: "success",
    message: "Migration push completed successfully",
    verification_instructions: [
      "To verify the migrations, follow these steps:",
      "1. Go to the Supabase Dashboard at https://supabase.com/dashboard",
      "2. Open your project: " + projectUrl,
      "3. Navigate to the SQL Editor",
      "4. Run the verification script in supabase/backup-test.sql",
      "5. Verify that all tables, functions, and RLS policies are created",
      "6. Don't forget to manually enable the JWT hook in Authentication > Hooks",
    ],
    important_note:
      "After verifying, make sure to manually enable the JWT hook for custom_access_token_hook in the Supabase Dashboard",
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/verify-migration' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
