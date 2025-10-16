// jest.setup.js
// Global test setup configuration

// Set up setImmediate for React Native compatibility
global.setImmediate =
  global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Set environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";

// Mock AsyncStorage for tests
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock expo-secure-store for tests
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Platform for tests
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: "web",
  select: jest.fn((obj) => obj.web || obj.default),
}));

// Mock expo-constants for tests
jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: "http://localhost:54321",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
      },
    },
  },
}));
