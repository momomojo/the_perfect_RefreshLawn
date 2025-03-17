import { supabase } from "./supabase";
import { jwtDecode } from "jwt-decode";

/**
 * Utility functions for handling user roles in the RefreshLawn application
 * Based on the User Role Signup Guide and Supabase RBAC best practices
 */

/**
 * Get the current user's role from their session
 * @returns The user's role or null if not authenticated
 */
export const getUserRole = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  try {
    // Check for role in all possible locations according to Supabase docs
    // 1. user_role from JWT decode (standard claim location)
    // 2. app_metadata.role (common location)
    // 3. user_metadata.role (fallback for backward compatibility)
    let userRoleFromJwt: string | null = null;

    if (session.access_token) {
      const jwt = jwtDecode(session.access_token);
      console.log(
        "User role from JWT claims:",
        JSON.stringify({ type: typeof (jwt as any).user_role })
      );
      userRoleFromJwt = (jwt as any).user_role || null;

      // If user_role is not found, also check app_metadata within JWT
      if (!userRoleFromJwt && (jwt as any).app_metadata?.role) {
        userRoleFromJwt = (jwt as any).app_metadata.role;
      }
    }

    if (userRoleFromJwt) {
      return userRoleFromJwt;
    } else {
      console.log("Role not found in JWT claims, querying database...");
      // If role isn't in the JWT, query the database directly as fallback
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching role from database:", error);
        return "customer"; // Default role
      }

      console.log("Role from database:", profileData?.role);
      return profileData?.role || "customer";
    }
  } catch (error) {
    console.error("Error decoding JWT or getting user role:", error);
    // Fallback to checking only metadata
    const role =
      session.user.app_metadata?.role ||
      session.user.user_metadata?.role ||
      "customer";

    return role;
  }
};

/**
 * Check if the current user is an admin
 * @returns Boolean indicating if the user is an admin
 */
export const isAdmin = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "admin";
};

/**
 * Check if the current user is a technician
 * @returns Boolean indicating if the user is a technician
 */
export const isTechnician = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "technician";
};

/**
 * Check if the current user is a customer
 * @returns Boolean indicating if the user is a customer
 */
export const isCustomer = async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === "customer" || role === null; // Treat null as customer
};

/**
 * Force a refresh of the user's JWT token to get updated role claims
 * Useful after a role change
 */
export const refreshUserSession = async (): Promise<void> => {
  try {
    // Force a session refresh to get updated claims
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }

    if (!data.session) {
      console.error("No session returned after refresh");
      throw new Error("Session refresh failed");
    }

    // Log JWT claims for debugging
    if (data.session.access_token) {
      const jwt = jwtDecode(data.session.access_token);
      console.log("Updated JWT claims:", {
        user_role: (jwt as any).user_role,
        app_metadata: (jwt as any).app_metadata,
      });
    }
  } catch (error) {
    console.error("Error in refreshUserSession:", error);
    throw error;
  }
};
