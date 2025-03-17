import { supabase } from "./supabase";

/**
 * Simplified signup function with error handling
 * This bypasses the complex role management to isolate the issue
 */
export const simplifiedSignUp = async (
  email: string,
  password: string
): Promise<{ data: any; error: Error | null }> => {
  try {
    // Simple signup without complex role management
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Don't set any metadata for now
    });

    if (error) {
      console.error(`Simplified signup error: ${error.message}`);
      return { data: null, error };
    }

    console.log("Simplified signup successful:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Simplified signup exception:", error);
    return { data: null, error: error as Error };
  }
};
