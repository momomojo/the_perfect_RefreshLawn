// Check if migrations were successfully applied
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMigrations() {
  console.log("Checking migration status...");

  try {
    // Check if migration_logs table exists
    console.log("Checking migration_logs table...");
    const { data: migrationLogs, error: migrationError } = await supabase
      .from("migration_logs")
      .select("migration_name, description, applied_at")
      .limit(10);

    if (migrationError) {
      console.error("Migration logs table error:", migrationError.message);
    } else {
      console.log("Migration logs table exists!");
      console.log("Recent migrations:", migrationLogs);
    }

    // Check if the handle_new_user function is working with error handling
    console.log("\nChecking handle_new_user function...");
    const { data: functionData, error: functionError } = await supabase.rpc(
      "pg_get_functiondef",
      { oid: "public.handle_new_user"::regproc }
    );

    if (functionError) {
      console.error("Function check error:", functionError.message);
    } else {
      console.log("Function exists and is defined as:", functionData);
    }

    // Check custom access token hook
    console.log("\nChecking custom_access_token_hook function...");
    const { data: hookResult, error: hookError } = await supabase.rpc(
      "check_hook_exists"
    );

    if (hookError) {
      console.error("Hook check error:", hookError.message);
    } else {
      console.log("Hook check result:", hookResult);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Run the check
checkMigrations();
