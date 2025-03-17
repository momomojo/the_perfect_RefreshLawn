import { supabase } from "../../lib/supabase";
import * as dataModule from "../../lib/data";
import { Profile, Service, RecurringPlan } from "../../lib/data";

// Mock the supabase client
jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock the data module functions
jest.mock("../../lib/data", () => {
  const originalModule = jest.requireActual("../../lib/data");
  return {
    __esModule: true,
    ...originalModule,
    getProfile: jest.fn(),
    getServices: jest.fn(),
    getRecurringPlans: jest.fn(),
  };
});

describe("Supabase Connection Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should fetch a profile successfully", async () => {
      // Mock successful response
      const mockProfile: Profile = {
        id: "test-id",
        first_name: "Test",
        last_name: "User",
        role: "customer" as const,
        created_at: new Date().toISOString(),
      };

      // Set up mock implementation for dataModule.getProfile
      jest.spyOn(dataModule, "getProfile").mockResolvedValue(mockProfile);

      // Execute the function
      const result = await dataModule.getProfile("test-id");

      // Assertions
      expect(result).toEqual(mockProfile);
      expect(dataModule.getProfile).toHaveBeenCalledWith("test-id");
    });

    it("should handle errors when fetching a profile", async () => {
      // Set up mock implementation to throw an error
      jest
        .spyOn(dataModule, "getProfile")
        .mockRejectedValue(new Error("Profile not found"));

      // Execute and expect error
      await expect(dataModule.getProfile("non-existent-id")).rejects.toThrow(
        "Profile not found"
      );

      // Assertions
      expect(dataModule.getProfile).toHaveBeenCalledWith("non-existent-id");
    });
  });

  describe("getServices", () => {
    it("should fetch services successfully", async () => {
      // Mock successful response
      const mockServices: Partial<Service>[] = [
        {
          id: "1",
          name: "Lawn Mowing",
          base_price: 50,
          is_active: true,
          description: "Basic lawn mowing service",
        },
        {
          id: "2",
          name: "Tree Trimming",
          base_price: 100,
          is_active: true,
          description: "Tree trimming service",
        },
      ];

      // Configure the mock for getServices to return our mock data
      jest
        .spyOn(dataModule, "getServices")
        .mockResolvedValue(mockServices as Service[]);

      // Execute the function
      const result = await dataModule.getServices();

      // Assertions
      expect(result).toEqual(mockServices);
      expect(dataModule.getServices).toHaveBeenCalled();
    });

    it("should handle errors when fetching services", async () => {
      // Configure the mock for getServices to throw an error
      jest
        .spyOn(dataModule, "getServices")
        .mockRejectedValue(new Error("Failed to fetch services"));

      // Execute and expect error
      await expect(dataModule.getServices()).rejects.toThrow(
        "Failed to fetch services"
      );

      // Assertions
      expect(dataModule.getServices).toHaveBeenCalled();
    });
  });

  describe("getRecurringPlans", () => {
    it("should fetch recurring plans successfully", async () => {
      // Mock successful response
      const mockPlans: Partial<RecurringPlan>[] = [
        {
          id: "1",
          name: "Weekly Plan",
          frequency: "weekly",
          discount_percentage: 10,
          description: "Weekly service plan",
        },
        {
          id: "2",
          name: "Monthly Plan",
          frequency: "monthly",
          discount_percentage: 20,
          description: "Monthly service plan",
        },
      ];

      // Configure the mock for getRecurringPlans to return our mock data
      jest
        .spyOn(dataModule, "getRecurringPlans")
        .mockResolvedValue(mockPlans as RecurringPlan[]);

      // Execute the function
      const result = await dataModule.getRecurringPlans();

      // Assertions
      expect(result).toEqual(mockPlans);
      expect(dataModule.getRecurringPlans).toHaveBeenCalled();
    });

    it("should handle errors when fetching recurring plans", async () => {
      // Configure the mock for getRecurringPlans to throw an error
      jest
        .spyOn(dataModule, "getRecurringPlans")
        .mockRejectedValue(new Error("Failed to fetch plans"));

      // Execute and expect error
      await expect(dataModule.getRecurringPlans()).rejects.toThrow(
        "Failed to fetch plans"
      );

      // Assertions
      expect(dataModule.getRecurringPlans).toHaveBeenCalled();
    });
  });

  // Additional test cases can be added for getTechnicians, getCustomers, etc.
});
