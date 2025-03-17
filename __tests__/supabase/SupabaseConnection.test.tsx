import React from "react";
import { supabase } from "../../lib/supabase";
import {
  getServices,
  getRecurringPlans,
  getTechnicians,
  getCustomers,
  getProfile,
} from "../../lib/data";

// Mock the Supabase client
jest.mock("../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(),
            })),
          })),
        })),
      })),
    })),
  },
}));

describe("Supabase Connection Tests", () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Profile Functions", () => {
    test("getProfile fetches a profile by user ID", async () => {
      // Mock data
      const mockProfile = {
        id: "123",
        first_name: "John",
        last_name: "Doe",
        role: "customer",
        phone: "123-456-7890",
      };

      // Set up mock implementation for nested functions
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

      // Apply mocks
      supabase.from = fromMock;

      // Call the function
      const result = await getProfile("123");

      // Assertions
      expect(fromMock).toHaveBeenCalledWith("profiles");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith("id", "123");
      expect(singleMock).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    test("getProfile throws an error when Supabase returns an error", async () => {
      // Set up mock implementation with error
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Profile not found" },
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

      // Apply mocks
      supabase.from = fromMock;

      // Call the function and expect it to throw
      await expect(getProfile("123")).rejects.toEqual({
        message: "Profile not found",
      });
    });
  });

  // We'll create a manual test button component
  const SupabaseConnectionTestButton = ({
    testFunction,
    testName,
  }: {
    testFunction: () => Promise<any>;
    testName: string;
  }) => {
    const [result, setResult] = React.useState<any>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const runTest = async () => {
      setLoading(true);
      setResult(null);
      setError(null);

      try {
        const data = await testFunction();
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div>
        <button
          onClick={runTest}
          disabled={loading}
          data-testid={`test-${testName}`}
        >
          {loading ? "Running..." : `Test ${testName}`}
        </button>
        {result && (
          <div data-testid={`result-${testName}`}>
            <h4>Result:</h4>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        {error && (
          <div data-testid={`error-${testName}`}>
            <h4>Error:</h4>
            <pre>{error}</pre>
          </div>
        )}
      </div>
    );
  };

  // You'll integrate this with your test UI
});
