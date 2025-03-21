import { supabase } from "../lib/supabase";
import { getMyClaimFn, setClaimFn, refreshClaims } from "./claimsManager";

/**
 * User Role Management Utilities
 *
 * This module provides functions for managing user roles using the Supabase custom claims system.
 */

/**
 * Types of roles available in the system
 */
export type UserRole = "admin" | "technician" | "customer";

/**
 * Get the role from custom claims
 * @returns The role from claims or null if not found
 */
export const getRoleFromClaims = async (): Promise<UserRole | null> => {
  try {
    // Get the current session
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      console.log("No active session found");
      return null;
    }

    // Method 1: Check directly in the JWT (most reliable)
    if (session.access_token) {
      try {
        // Decode the JWT payload
        const parts = session.access_token.split(".");
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const decodedToken = JSON.parse(jsonPayload);

          // Check two possible locations for the role in JWT
          // 1. Top-level user_role claim (added by hook)
          if (decodedToken.user_role) {
            console.log(
              "Found role in user_role claim:",
              decodedToken.user_role
            );
            return decodedToken.user_role as UserRole;
          }

          // 2. Inside app_metadata (also added by hook)
          if (decodedToken.app_metadata?.role) {
            console.log(
              "Found role in app_metadata.role:",
              decodedToken.app_metadata.role
            );
            return decodedToken.app_metadata.role as UserRole;
          }

          console.log("Role not found in JWT claims:", decodedToken);
        }
      } catch (error) {
        console.error("Error decoding JWT:", error);
      }
    }

    // Method 2: Fall back to session user object (might not always have latest claims)
    const userRole = session.user?.app_metadata?.role;
    if (userRole) {
      console.log("Found role in session user app_metadata:", userRole);
      return userRole as UserRole;
    }

    // Method 3: Last resort - use RPC (original method)
    const { data, error } = await getMyClaimFn("role");
    if (error) {
      console.log("Error from RPC call:", error);
      return null;
    }

    if (data) {
      console.log("Found role via RPC call:", data);
      // Remove the quotes from the JSON string
      return data.toString().replace(/^"(.*)"$/, "$1") as UserRole;
    }

    console.log("Role not found in any location");
    return null;
  } catch (error) {
    console.error("Error getting role from claims:", error);
    return null;
  }
};

/**
 * Set or update a user's role using custom claims
 * @param userId The user's ID
 * @param role The role to assign
 * @returns Success status and any error
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Set the role using the custom claims system
    // Note that we need to pass the role as a JSON string with quotes
    const { error } = await setClaimFn(userId, "role", `"${role}"`);

    if (error) throw new Error(error);

    // Refresh the session to update claims
    await refreshClaims();

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: error as Error };
  }
};

/**
 * Set a user's role during signup
 * @param email User email
 * @param password User password
 * @param role Role to assign
 * @returns User data and any error
 */
export const signUpWithRole = async (
  email: string,
  password: string,
  role: UserRole = "customer"
): Promise<{ data: any; error: Error | null }> => {
  try {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    // Wait to ensure the user is created before we attempt to set their role
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get the user ID from the sign-up response
    const userId = data.user?.id;

    if (userId) {
      // Set the role as a custom claim
      try {
        const { error: claimError } = await setClaimFn(
          userId,
          "role",
          `"${role}"`
        );

        if (claimError) {
          console.warn("Failed to set role after signup:", claimError);
        }
      } catch (roleError) {
        console.warn("Error setting role after signup:", roleError);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error during signup with role:", error);
    return { data: null, error: error as Error };
  }
};

/**
 * Get a user's current role from claims
 * @returns The user's role or null if not found
 */
export const getUserRole = async (): Promise<UserRole | null> => {
  try {
    return await getRoleFromClaims();
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

/**
 * Check if the current user has a specific role
 * @param role The role to check
 * @returns True if the user has the role, false otherwise
 */
export const hasRole = async (role: UserRole): Promise<boolean> => {
  const userRole = await getUserRole();
  return userRole === role;
};

/**
 * Check if the current user is an admin
 * @returns True if the user is an admin, false otherwise
 */
export const isAdmin = async (): Promise<boolean> => {
  return await hasRole("admin");
};

/**
 * Check if the current user is a technician
 * @returns True if the user is a technician, false otherwise
 */
export const isTechnician = async (): Promise<boolean> => {
  return await hasRole("technician");
};

/**
 * Check if the current user is a customer
 * @returns True if the user is a customer, false otherwise
 */
export const isCustomer = async (): Promise<boolean> => {
  return await hasRole("customer");
};

/**
 * Verify if the JWT hook is working properly
 * @returns Status object with hook working status, missing claims, and message
 */
export const verifyJwtHookWorking = async () => {
  try {
    // Get the current session
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session) {
      return {
        isWorking: false,
        missingClaims: ["No active session"],
        message: "No active user session found. Please sign in first.",
      };
    }

    // Check if we have the role claim
    const roleClaim = await getRoleFromClaims();
    const missingClaims = [];

    if (!roleClaim) {
      missingClaims.push("role");
    }

    // Decode JWT to check its structure
    let jwt = null;
    if (session.access_token) {
      const parts = session.access_token.split(".");
      if (parts.length === 3) {
        try {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          jwt = JSON.parse(jsonPayload);
        } catch (e) {
          console.error("Error decoding JWT:", e);
        }
      }
    }

    // Final check if the hook is working
    const isWorking = roleClaim !== null;

    let message = isWorking
      ? `JWT hook is working correctly. Your role is: ${roleClaim}`
      : "JWT hook is not working. The 'role' claim is missing from your token.";

    if (missingClaims.length > 0) {
      message += ` Missing claims: ${missingClaims.join(
        ", "
      )}. Verify that the custom access token hook is enabled in your Supabase dashboard.`;
    }

    return {
      isWorking,
      missingClaims,
      message,
      jwt, // Include the decoded JWT for debugging
    };
  } catch (error) {
    console.error("Error verifying JWT hook:", error);
    return {
      isWorking: false,
      missingClaims: ["Error checking claims"],
      message: `Error verifying JWT hook: ${error}`,
    };
  }
};

/**
 * Refresh JWT claims by refreshing the session
 * @returns Success status and any error
 */
export const refreshJWTClaims = async (): Promise<{
  success: boolean;
  error: Error | null;
}> => {
  try {
    console.log("Refreshing JWT claims...");

    // Directly use Supabase's refreshSession for more reliable refresh
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }

    console.log("Session refreshed successfully");

    // Decode and log the new token for debugging
    const session = data?.session;
    if (session?.access_token) {
      try {
        const parts = session.access_token.split(".");
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const decodedToken = JSON.parse(jsonPayload);

          console.log("New JWT payload:", decodedToken);
          console.log("JWT user_role:", decodedToken.user_role);
          console.log("JWT app_metadata:", decodedToken.app_metadata);
        }
      } catch (e) {
        console.error("Error decoding refreshed JWT:", e);
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error refreshing JWT claims:", error);
    return { success: false, error: error as Error };
  }
};

/**
 * Utility function to decode the current JWT for debugging purposes
 * @returns The decoded JWT payload or null if not available
 */
export const decodeCurrentJWT = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session || !session.access_token) {
      console.log("No active session or access token found");
      return null;
    }

    // Decode the JWT
    const parts = session.access_token.split(".");
    if (parts.length !== 3) {
      console.log("Invalid JWT format");
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const decodedToken = JSON.parse(jsonPayload);

    // Log the relevant parts for debugging
    console.log("==== JWT DEBUGGING ====");
    console.log("Full JWT payload:", decodedToken);
    console.log("user_role claim:", decodedToken.user_role);
    console.log("app_metadata:", decodedToken.app_metadata);
    console.log("app_metadata.role:", decodedToken.app_metadata?.role);
    console.log("=======================");

    return decodedToken;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};
