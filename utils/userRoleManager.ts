import { supabase } from "./supabase";
import { jwtDecode } from "jwt-decode";

/**
 * User Role Management Utilities
 *
 * This module provides functions for managing user roles in both:
 * 1. Supabase auth.users metadata (via Auth API)
 * 2. User_roles table (via Database API) - following official Supabase approach
 * 3. Profiles table (for backward compatibility)
 *
 * The custom access token hook will read roles from the user_roles table
 * and add them to JWT tokens automatically.
 */

/**
 * Types of roles available in the system
 */
export type UserRole = "admin" | "technician" | "customer";

/**
 * Get the role from JWT claim
 * @returns The role from JWT or null if not found
 */
export const getRoleFromJWT = async (): Promise<UserRole | null> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const jwt = jwtDecode<any>(session.access_token);

    // Try different possible locations for the role
    const userRole =
      jwt.user_role || (jwt.app_metadata && jwt.app_metadata.role) || null;

    return userRole as UserRole;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

/**
 * Set or update a user's role using the official approach
 * @param userId The user's ID
 * @param role The role to assign
 * @returns Success status and any error
 */
export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    // Update the role in the user_roles table (primary approach)
    // This will automatically sync to profiles via triggers
    const { error: roleError } = await supabase.rpc("update_user_role_safe", {
      p_user_id: userId,
      p_role: role,
    });

    if (roleError) {
      // Fallback: direct insert/update to user_roles
      const { error: directError } = await supabase.from("user_roles").upsert(
        {
          user_id: userId,
          role: role,
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: false,
        }
      );

      if (directError) {
        throw new Error(`Failed to update user_roles: ${directError.message}`);
      }
    }

    // Update the user's metadata (for client-side access)
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { role },
    });

    if (metadataError) {
      console.warn(
        `Warning: Failed to update user metadata: ${metadataError.message}`
      );
      // Continue anyway, as the role is set in user_roles table
    }

    // 3. Refresh the session to update JWT claims
    await supabase.auth.refreshSession();

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
    console.log(`Starting signup process for ${email} with role ${role}`);

    // Sign up with role in user_metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // This will be captured by triggers
        },
      },
    });

    if (error) {
      console.error(`Signup error from Supabase: ${error.message}`);
      throw error;
    }

    console.log(`User created successfully: ${data.user?.id}`);

    // Wait to ensure the user is created before we attempt to set their role
    // This helps mitigate race conditions with database triggers
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the user ID from the sign-up response
    const userId = data.user?.id;

    if (userId) {
      console.log(`Setting up role for user ${userId}`);

      try {
        // Try RPC function first - this is the recommended approach
        console.log(`Calling update_user_role_safe RPC for user ${userId}`);
        const { error: rpcError } = await supabase.rpc(
          "update_user_role_safe",
          {
            p_user_id: userId,
            p_role: role,
          }
        );

        // If RPC fails, try direct insert
        if (rpcError) {
          console.warn(
            `RPC error: ${rpcError.message}. Attempting direct upsert.`
          );

          // First check if the profile exists
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .single();

          if (!profileData) {
            console.log(
              `Profile not found for ${userId}, creating it directly`
            );

            // Create profile if it doesn't exist
            const { error: profileError } = await supabase
              .from("profiles")
              .insert({
                id: userId,
                role: role,
              });

            if (profileError) {
              console.warn(`Failed to create profile: ${profileError.message}`);
            }
          }

          // Insert into user_roles regardless
          const { error: insertError } = await supabase
            .from("user_roles")
            .upsert(
              {
                user_id: userId,
                role: role,
              },
              { onConflict: "user_id", ignoreDuplicates: false }
            );

          if (insertError) {
            console.warn(
              `Failed to set user role in user_roles table: ${insertError.message}`
            );
          }
        } else {
          console.log(`Role successfully set via RPC for user ${userId}`);
        }

        // Force a session refresh to update JWT claims
        await supabase.auth.refreshSession();
        console.log("Session refreshed to update JWT claims");
      } catch (roleError) {
        console.warn(`Error setting role after signup: ${roleError}`);
        // Continue anyway, as the initial role in user_metadata might have been set
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Error during signup with role: ${error}`);
    return { data: null, error: error as Error };
  }
};

/**
 * Get a user's current role from the database
 * @param userId The user's ID (defaults to current user)
 * @returns The user's role or null if not found
 */
export const getUserRole = async (
  userId?: string
): Promise<UserRole | null> => {
  try {
    // Get current user if userId not provided
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      userId = user.id;
    }

    // First try JWT for fastest access
    const jwtRole = await getRoleFromJWT();
    if (jwtRole) return jwtRole;

    // Then try user_roles table (official approach)
    const { data: userRoleData, error: userRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!userRoleError && userRoleData?.role) {
      return userRoleData.role as UserRole;
    }

    // Finally, fallback to profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    return (profileData?.role as UserRole) || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

/**
 * Force a refresh of JWT token to get updated role claims
 * @returns Success status
 */
export const refreshJWTClaims = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch (error) {
    console.error("Error refreshing JWT claims:", error);
    return false;
  }
};

/**
 * Verify if JWT claims contain role information to diagnose hook issues
 * @returns Object with JWT verification details
 */
export const verifyJwtHookWorking = async (): Promise<{
  isWorking: boolean;
  missingClaims: string[];
  message: string;
  jwt?: Record<string, any>;
}> => {
  try {
    // Refresh the session to get the latest token
    await supabase.auth.refreshSession();

    // Get the session and access token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        isWorking: false,
        missingClaims: ["No session"],
        message: "No active session found. Please sign in first.",
      };
    }

    // Decode the JWT
    const jwt = jwtDecode<any>(session.access_token);

    // Check for role in various places
    const hasUserRole = !!jwt.user_role;
    const hasAppMetadataRole = !!(jwt.app_metadata && jwt.app_metadata.role);

    // Missing claims check
    const missingClaims = [];
    if (!hasUserRole) missingClaims.push("user_role");
    if (!hasAppMetadataRole) missingClaims.push("app_metadata.role");

    // Determine if working
    const isWorking = hasUserRole || hasAppMetadataRole;

    // Generate appropriate message
    let message = "";
    if (isWorking) {
      message = "JWT hook is working correctly. Role claims found.";
    } else {
      message =
        "JWT hook is not adding role claims. Check Supabase Dashboard Authentication > Hooks.";
    }

    return {
      isWorking,
      missingClaims,
      message,
      jwt,
    };
  } catch (error) {
    console.error("Error verifying JWT hook:", error);
    return {
      isWorking: false,
      missingClaims: ["Error decoding JWT"],
      message: `Error verifying JWT: ${(error as Error).message}`,
    };
  }
};
