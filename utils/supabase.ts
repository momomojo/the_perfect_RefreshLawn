/**
 * @deprecated This file is deprecated and will be removed in a future update.
 * Please import from 'lib/supabase.ts' instead to avoid multiple Supabase client instances.
 */

// Re-export the Supabase client and utilities from the main file
import { supabase, getSupabase, clearStoredSession } from "../lib/supabase";

// Log a warning when this file is imported
console.warn(
  "DEPRECATED: Importing from 'utils/supabase.ts' is deprecated. " +
    "Please update your imports to use 'lib/supabase.ts' instead to avoid multiple Supabase client instances."
);

export { supabase, getSupabase, clearStoredSession };
