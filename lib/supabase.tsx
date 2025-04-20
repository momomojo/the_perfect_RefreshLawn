// Get Supabase URL and anon key - try both methods for compatibility
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey;

// DEBUG: Verify env values
console.log("[Supabase] URL:", supabaseUrl || "<none>");
console.log("[Supabase] Anon Key Present:", !!supabaseAnonKey);

// SecureStore adapter for more secure storage in production
