/**
 * Mock Supabase client for testing
 * Provides test doubles for Supabase functionality without hitting live database
 */

export const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(async ({ email, password }) => ({
      data: {
        user: {
          id: `user_test_${Date.now()}`,
          email,
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
        },
        session: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: `user_test_${Date.now()}`,
            email,
          },
        },
      },
      error: null,
    })),
    signInWithPassword: jest.fn(async ({ email, password }) => ({
      data: {
        user: {
          id: `user_test_${Date.now()}`,
          email,
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { role: 'customer' },
        },
        session: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: `user_test_${Date.now()}`,
            email,
          },
        },
      },
      error: null,
    })),
    signOut: jest.fn(async () => ({
      error: null,
    })),
    getSession: jest.fn(async () => ({
      data: {
        session: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user_test_123',
            email: 'test@example.com',
          },
        },
      },
      error: null,
    })),
    onAuthStateChange: jest.fn((callback) => {
      // Return a mock subscription
      return {
        data: {
          subscription: {
            id: 'mock_subscription_id',
            unsubscribe: jest.fn(),
          },
        },
      };
    }),
  },
  from: jest.fn((table) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(async () => ({
          data: { id: 1, name: 'Test Record' },
          error: null,
        })),
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: jest.fn(() => ({
      select: jest.fn(async () => ({
        data: [{ id: 1, name: 'Test Record' }],
        error: null,
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(async () => ({
          data: [{ id: 1, name: 'Updated Record' }],
          error: null,
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(async () => ({
        data: null,
        error: null,
      })),
      neq: jest.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
  functions: {
    invoke: jest.fn(async (functionName, options) => ({
      data: {
        success: true,
        message: `Mock response from ${functionName}`,
      },
      error: null,
    })),
  },
  storage: {
    from: jest.fn((bucket) => ({
      upload: jest.fn(async (path, file) => ({
        data: {
          path: `${bucket}/${path}`,
          id: `file_test_${Date.now()}`,
          fullPath: `${bucket}/${path}`,
        },
        error: null,
      })),
      getPublicUrl: jest.fn((path) => ({
        data: {
          publicUrl: `https://mock-storage-url.supabase.co/storage/v1/object/public/${bucket}/${path}`,
        },
      })),
      remove: jest.fn(async (paths) => ({
        data: paths.map((path) => ({ name: path })),
        error: null,
      })),
    })),
  },
};

// Mock the createClient function
export const createClient = jest.fn(() => mockSupabaseClient);

export default createClient;
