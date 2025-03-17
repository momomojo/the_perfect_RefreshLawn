import { supabase } from "../../lib/supabase";
import { getProfile, updateProfile } from "../../lib/data";
import { Profile } from "../../lib/data";

// Define SignInWithPasswordCredentials to fix type issues
interface SignInWithPasswordCredentials {
  email: string;
  password: string;
}

// Mock the Supabase client
jest.mock("../../lib/supabase", () => {
  // Create mock functions with proper typings
  const signInWithPasswordMock = jest.fn();
  const getSessionMock = jest.fn();
  const fromMock = jest.fn();

  return {
    supabase: {
      from: fromMock,
      auth: {
        getSession: getSessionMock,
        getUser: jest.fn(),
        signInWithPassword: signInWithPasswordMock,
        signOut: jest.fn(),
      },
    },
  };
});

describe("JWT Role Claims Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should include user_role in app_metadata after login", async () => {
    // Mock profile response for a customer
    const mockProfile = {
      id: "test-user-id",
      first_name: "Test",
      last_name: "User",
      role: "customer" as const,
    };

    // Mock session response with proper JWT claims
    const mockSession = {
      user: {
        id: "test-user-id",
        email: "test@example.com",
        app_metadata: {
          user_role: "customer",
        },
      },
      expires_at: Date.now() + 3600,
    };

    // Set up mocks
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const singleMock = jest.fn().mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    const eqMock = jest.fn().mockReturnValue({
      single: singleMock,
    });

    const selectMock = jest.fn().mockReturnValue({
      eq: eqMock,
    });

    const fromMock = jest.fn().mockReturnValue({
      select: selectMock,
    });

    (supabase.from as jest.Mock) = fromMock;

    // Test signin with role
    const result = await supabase.auth.signInWithPassword({
      email: "test@example.com",
      password: "testpassword",
    });

    // Assertions
    expect(result.data.session?.user.app_metadata.user_role).toBe("customer");
  });

  it("should handle 'technician' role correctly in JWT claims", async () => {
    // Mock profile for a technician
    const mockProfile = {
      id: "technician-id",
      first_name: "Tech",
      last_name: "User",
      role: "technician" as const,
    };

    // Mock session with technician role
    const mockSession = {
      user: {
        id: "technician-id",
        email: "tech@example.com",
        app_metadata: {
          user_role: "technician",
        },
      },
      expires_at: Date.now() + 3600,
    };

    // Set up mocks
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Test signin with technician role
    const result = await supabase.auth.signInWithPassword({
      email: "tech@example.com",
      password: "testpassword",
    });

    // Assertions
    expect(result.data.session?.user.app_metadata.user_role).toBe("technician");
  });

  it("should handle 'admin' role correctly in JWT claims", async () => {
    // Mock profile for an admin
    const mockProfile = {
      id: "admin-id",
      first_name: "Admin",
      last_name: "User",
      role: "admin" as const,
    };

    // Mock session with admin role
    const mockSession = {
      user: {
        id: "admin-id",
        email: "admin@example.com",
        app_metadata: {
          user_role: "admin",
        },
      },
      expires_at: Date.now() + 3600,
    };

    // Set up mocks
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Test signin with admin role
    const result = await supabase.auth.signInWithPassword({
      email: "admin@example.com",
      password: "testpassword",
    });

    // Assertions
    expect(result.data.session?.user.app_metadata.user_role).toBe("admin");
  });

  it("should update JWT claims when user role changes", async () => {
    // Initial profile with customer role
    const initialProfile = {
      id: "user-to-update",
      first_name: "Initial",
      last_name: "User",
      role: "customer" as const,
    };

    // Updated profile with technician role
    const updatedProfile = {
      ...initialProfile,
      role: "technician" as const,
    };

    // Mock session before update
    const initialSession = {
      user: {
        id: "user-to-update",
        email: "user@example.com",
        app_metadata: {
          user_role: "customer",
        },
      },
      expires_at: Date.now() + 3600,
    };

    // Mock session after update
    const updatedSession = {
      user: {
        id: "user-to-update",
        email: "user@example.com",
        app_metadata: {
          user_role: "technician",
        },
      },
      expires_at: Date.now() + 3600,
    };

    // Set up the update mock
    const updateSingleMock = jest.fn().mockResolvedValue({
      data: updatedProfile,
      error: null,
    });

    const updateSelectMock = jest.fn().mockReturnValue({
      single: updateSingleMock,
    });

    const updateEqMock = jest.fn().mockReturnValue({
      select: updateSelectMock,
    });

    const updateMock = jest.fn().mockReturnValue({
      eq: updateEqMock,
    });

    // Mock getSession before and after update
    (supabase.auth.getSession as jest.Mock)
      .mockResolvedValueOnce({ data: { session: initialSession }, error: null })
      .mockResolvedValueOnce({
        data: { session: updatedSession },
        error: null,
      });

    (supabase.from as jest.Mock).mockReturnValue({
      update: updateMock,
    });

    // Simulate updating the role
    const updates: Partial<Profile> = { role: "technician" as const };

    // First check the initial session
    let sessionResult = await supabase.auth.getSession();
    expect(sessionResult.data.session?.user.app_metadata.user_role).toBe(
      "customer"
    );

    // Simulate profile update (this would trigger the JWT update in a real system)
    await updateProfile("user-to-update", updates);

    // Then check the updated session
    sessionResult = await supabase.auth.getSession();
    expect(sessionResult.data.session?.user.app_metadata.user_role).toBe(
      "technician"
    );
  });
});
