// jest.setup.js
// Global test setup configuration
/* eslint-env jest */

// Set up setImmediate for React Native compatibility
global.setImmediate =
  global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Set environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store for tests
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Platform for tests
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web || obj.default),
}));

// Mock expo-constants for tests
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'http://localhost:54321',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      },
    },
  },
}));

// Mock Linking API for tests
jest.mock('expo-linking', () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(undefined),
}));

// Mock Toast for tests
jest.mock('react-native-toast-message', () => ({
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
  show: jest.fn(),
  hide: jest.fn(),
}));

// Mock Supabase client
jest.mock('./lib/supabase', () => ({
  supabase: {
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
    }),
    removeChannel: jest.fn(),
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    }),
  },
}));

// Mock notification utility
jest.mock('./lib/notification', () => ({
  showNotification: jest.fn(),
}));

// Mock data utilities
jest.mock('./lib/data', () => ({
  getBooking: jest.fn().mockResolvedValue({
    id: 'booking-123',
    status: 'completed',
    technician_id: 'tech-456',
    customer_id: 'customer-789',
    scheduled_date: '2025-01-15',
    service: { name: 'Lawn Mowing' },
    technician: { first_name: 'John', last_name: 'Doe' },
  }),
  getReviewsByRating: jest.fn().mockResolvedValue([]),
  markAdminFeedbackReviewed: jest.fn().mockResolvedValue(undefined),
  updateProfile: jest.fn().mockResolvedValue({ data: null, error: null }),
}));
