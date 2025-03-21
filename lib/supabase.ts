import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Get Supabase URL and anon key from app config extra
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

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
const ENABLE_SESSION_PERSISTENCE = true;

// No-op storage adapter that doesn't actually store anything
const NoopStorageAdapter = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
