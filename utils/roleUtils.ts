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
      userRoleFromJwt = (jwt as any).user_role;
    }

    const role =
      userRoleFromJwt ||
      session.user.app_metadata?.role ||
      session.user.user_metadata?.role ||
      "customer"; // Default to customer if no role found

    return role;
  } catch (error) {
    console.error("Error decoding JWT or getting user role:", error);
    // Fallback to checking only metadata
    return (
      session.user.app_metadata?.role ||
      session.user.user_metadata?.role ||
      "customer"
    );
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
  await supabase.auth.refreshSession();
};
