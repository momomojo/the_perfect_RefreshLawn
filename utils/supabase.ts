import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Get Supabase URL and anon key - try both methods for compatibility
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey;

// Log for debugging
console.log("Supabase URL:", supabaseUrl);
console.log(
  "Environment vars available:",
  !!process.env.EXPO_PUBLIC_SUPABASE_URL
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

// Flag to enable/disable session persistence - set to false to disable
// IMPORTANT: Set this to true when you want to re-enable session persistence
const ENABLE_SESSION_PERSISTENCE = false;

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
