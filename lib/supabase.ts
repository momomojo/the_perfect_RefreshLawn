import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// IMPORTANT: This is the only Supabase client initialization file that should be used.
// Do not create or use multiple Supabase clients to avoid auth issues.

// Get Supabase URL and anon key - try both methods for compatibility
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey;

// DEBUG: Log Supabase config (ensure keys are not fully logged in production)
console.log("[Supabase] URL:", supabaseUrl);
console.log(
  "[Supabase] Anon Key:",
  supabaseAnonKey ? "[PRESENT]" : "[MISSING]"
);

// SecureStore adapter for more secure storage in production
const SecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Flag to enable/disable session persistence
// Setting this to true for consistent behavior
const ENABLE_SESSION_PERSISTENCE = true;

// No-op storage adapter that doesn't actually store anything
const NoopStorageAdapter = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

// Create Supabase client
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    // Use appropriate storage adapter based on persistence flag
    storage: ENABLE_SESSION_PERSISTENCE
      ? __DEV__
        ? AsyncStorage
        : SecureStoreAdapter
      : NoopStorageAdapter,
    autoRefreshToken: true,
    persistSession: ENABLE_SESSION_PERSISTENCE,
    detectSessionInUrl: false,
  },
});

// DEBUG: Test basic connection AFTER client creation
console.log("[Supabase] Attempting basic fetch test...");
fetch(`${supabaseUrl}/rest/v1/`, {
  // Use a known endpoint path like /rest/v1/
  method: "HEAD", // Use HEAD to minimize data transfer
  headers: {
    apikey: supabaseAnonKey || "", // Include anon key
  },
})
  .then((response) => {
    console.log(
      `[Supabase] Basic fetch test response status: ${response.status}`
    );
    if (!response.ok) {
      console.error(
        `[Supabase] Basic fetch test failed: ${response.statusText}`
      );
    }
  })
  .catch((err) => {
    console.error("[Supabase] Basic fetch test EXCEPTION:", err);
  });

// Export a function to get Supabase client
export const getSupabase = () => supabase;

// Helper function to manually clear any existing session data
export const clearStoredSession = async () => {
  if (__DEV__) {
    await AsyncStorage.removeItem("supabase.auth.token");
  } else {
    await SecureStore.deleteItemAsync("supabase.auth.token");
  }
};
