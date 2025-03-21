import { supabase } from "./supabase";

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
    // Check for role in app_metadata (set by custom access token hook)
    const role = session.user.app_metadata?.role;

    if (role) {
      return role;
    }

    // Fallback to database query if not in claims
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching user role from database:", error);
      return "customer"; // Default to customer on error
    }

    return data?.role || "customer"; // Default to customer if no role found
  } catch (error) {
    console.error("Error getting user role:", error);
    return "customer"; // Default to customer on error
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

/**
 * Updates the user's JWT claims by refreshing the session
 * This should be called after the user's role is changed in the database
 */
export const refreshJWTClaims = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Error refreshing JWT claims:", error);
    }
  } catch (error) {
    console.error("Exception refreshing JWT claims:", error);
  }
};
