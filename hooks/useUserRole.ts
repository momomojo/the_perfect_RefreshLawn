import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import {
  getUserRole,
  isAdmin,
  isTechnician,
  isCustomer,
} from "../utils/roleUtils";

/**
 * React hook for checking and using the current user's role in components
 * Based on the User Role Signup Guide recommendations
 */
export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserTechnician, setIsUserTechnician] = useState(false);
  const [isUserCustomer, setIsUserCustomer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the user's role when the component mounts
    const fetchRole = async () => {
      try {
        setLoading(true);

        // Get the user's current role
        const currentRole = await getUserRole();
        setRole(currentRole);

        // Set role-specific flags
        setIsUserAdmin(currentRole === "admin");
        setIsUserTechnician(currentRole === "technician");
        setIsUserCustomer(currentRole === "customer" || currentRole === null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        // Default to customer role on error
        setRole("customer");
        setIsUserCustomer(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    // Listen for auth state changes to update the role
    const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
      fetchRole();
    });

    return () => {
      // Clean up the listener when the component unmounts
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Manually refresh the role (useful after a role change)
  const refreshRole = async () => {
    try {
      setLoading(true);

      // Force a session refresh to get updated claims
      await supabase.auth.refreshSession();

      // Get updated role
      const currentRole = await getUserRole();
      setRole(currentRole);

      // Update role-specific flags
      setIsUserAdmin(currentRole === "admin");
      setIsUserTechnician(currentRole === "technician");
      setIsUserCustomer(currentRole === "customer" || currentRole === null);
    } catch (error) {
      console.error("Error refreshing user role:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    role,
    isAdmin: isUserAdmin,
    isTechnician: isUserTechnician,
    isCustomer: isUserCustomer,
    loading,
    refreshRole,
  };
};
