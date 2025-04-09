import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, clearStoredSession } from "./supabase";
import { Alert, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as Network from "expo-network";
import NetInfo from "@react-native-community/netinfo";
import { queryWithRetry } from "./queryWithRetry";
import { handleApiError } from "./errors";

// Add TypeScript declaration for window.__hasRefreshedToken
declare global {
  interface Window {
    __hasRefreshedToken?: boolean;
  }
}

// Define the AuthContext type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    role: string,
    userData: {
      firstName?: string;
      lastName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
    }
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  error: string | null;
  isAdmin: boolean;
  isTechnician: boolean;
  isCustomer: boolean;
  networkStatus: boolean | null;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps the app and makes auth available
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTechnician, setIsTechnician] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);

  // Use a React ref to track token refresh in React Native (window might not exist)
  const hasRefreshedTokenRef = React.useRef(false);

  // Network connectivity monitoring
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        setNetworkStatus(
          networkState.isConnected && networkState.isInternetReachable
            ? true
            : false
        );
      } catch (err) {
        console.error("Failed to check network status:", err);
        setNetworkStatus(null);
      }
    };

    // Initial check
    checkNetworkStatus();

    // Setup listener for network status changes
    const unsubscribe = NetInfo?.addEventListener((state: any) => {
      setNetworkStatus(state.isConnected && state.isInternetReachable);

      // If network reconnected and we have credentials, try to refresh session
      if (state.isConnected && user && !session) {
        console.log("Network reconnected, refreshing auth session");
        // Apply retry logic to getSession on reconnect
        queryWithRetry(() => supabase.auth.getSession())
          .then(({ data, error }) => {
            if (error) {
              console.error("Error refreshing session after reconnect:", error);
            } else if (data.session) {
              setSession(data.session);
              // Potentially re-check role if needed
              if (data.session.user) {
                checkUserRole(data.session.user);
              }
            }
          })
          .catch((err) => {
            console.error(
              "Failed to refresh session after reconnect (with retry):",
              err
            );
          });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, session]);

  useEffect(() => {
    // Clear any existing stored sessions to prevent auto-login
    // This is only needed initially since we've disabled persistence
    clearStoredSession().catch((err) =>
      console.log("Failed to clear stored session:", err)
    );

    // Set up the deep linking handler
    const handleDeepLink = async (url: string) => {
      if (url.includes("access_token") && url.includes("refresh_token")) {
        // Extract tokens and set session
        const { access_token, refresh_token } = extractTokensFromUrl(url);
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error(
              "Error setting session from deep link:",
              error.message
            );
          } else if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            checkUserRole(data.session.user);
          }
        }
      }
    };

    // Subscribe to URL events for deep linking
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Check for an existing session (apply retry)
    queryWithRetry(() => supabase.auth.getSession())
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkUserRole(session.user);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Initial getSession failed:", err);
        setLoading(false); // Ensure loading state is updated even on error
        setError("Failed to initialize session. Check network connection.");
      });

    // Subscribe to auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase auth event: ${event}`);

      // Special handling for token refresh events to prevent loops
      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed event received");

        // Log JWT details for debugging
        if (session?.access_token) {
          try {
            const parts = session.access_token.split(".");
            if (parts.length === 3) {
              const base64Url = parts[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map(
                    (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                  )
                  .join("")
              );
              const decodedToken = JSON.parse(jsonPayload);

              console.log("Refreshed JWT user_role:", decodedToken.user_role);
              console.log(
                "Refreshed JWT app_metadata:",
                decodedToken.app_metadata
              );
            }
          } catch (error) {
            console.error("Error decoding refreshed JWT:", error);
          }
        }

        setSession(session);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkUserRole(session.user);
      } else {
        // Reset roles when user is null
        setIsAdmin(false);
        setIsTechnician(false);
        setIsCustomer(false);
      }

      setLoading(false);

      // Handle navigation based on auth state
      if (event === "SIGNED_IN") {
        // Log role assignments for debugging
        console.log("Auth navigation - Current roles:", {
          isAdmin,
          isTechnician,
          isCustomer,
        });

        // Navigate based on user role instead of always going to customer dashboard
        if (isAdmin) {
          console.log("Navigating to admin dashboard");
          router.replace("/(admin)/dashboard");
        } else if (isTechnician) {
          console.log("Navigating to technician dashboard");
          router.replace("/(technician)/dashboard");
        } else {
          // Default to customer dashboard
          console.log("Navigating to customer dashboard (default)");
          router.replace("/(customer)/dashboard");
        }
      } else if (event === "SIGNED_OUT") {
        router.replace("/");
      }
    });

    // Cleanup on unmount
    return () => {
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  // Extract tokens from URL for deep linking
  const extractTokensFromUrl = (url: string) => {
    const params = new URLSearchParams(url.split("#")[1]);
    return {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
    };
  };

  // Check user role and update state
  const checkUserRole = async (user: User) => {
    if (!user) {
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(false);
      return;
    }

    console.log(`Checking role for user ${user.id}...`);
    try {
      // Use queryWithRetry for the RPC call
      const { data, error } = await queryWithRetry(() =>
        supabase.rpc("get_user_role", { p_user_id: user.id })
      );

      if (error) {
        // Check if the error indicates the function doesn't exist yet (common during setup)
        if (error.message.includes('relation "get_user_role" does not exist')) {
          console.warn(
            "get_user_role function not found. Assuming default role 'customer'."
          );
          setError(
            "User role check unavailable. Proceeding with default permissions."
          );
          setIsAdmin(false);
          setIsTechnician(false);
          setIsCustomer(true); // Default to customer if function missing
          return; // Exit early
        }
        // Handle other errors
        console.error("Error fetching user role:", error);
        setError(`Failed to verify user role: ${error.message}`);
        // Potentially default to customer or leave roles unset based on security policy
        setIsAdmin(false);
        setIsTechnician(false);
        setIsCustomer(false); // Or true if defaulting
        return;
      }

      const role = data as string; // Supabase returns role directly
      console.log(`User ${user.id} has role: ${role}`);

      // Set state based on the fetched role
      setIsAdmin(role === "admin");
      setIsTechnician(role === "technician");
      setIsCustomer(role === "customer");
    } catch (err: any) {
      console.error("Unexpected error in checkUserRole:", err);
      setError(`Error checking role: ${err.message || "Unknown error"}`);
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(false);
    }
  };

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    role: string = "customer",
    userData: {
      firstName?: string;
      lastName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
    } = {}
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Use queryWithRetry for signUp
      const { data: authData, error: authError } = await queryWithRetry(() =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            // We handle profile creation via RPC, so no user_metadata here
          },
        })
      );

      if (authError) throw authError;
      if (!authData.user)
        throw new Error("Sign up successful but no user data returned.");

      console.log(`User ${authData.user.id} signed up, creating profile...`);

      // Now create the profile and assign role using RPC
      // Wrap RPC call with retry
      const { error: profileError } = await queryWithRetry(() =>
        supabase.rpc("create_profile_and_assign_role", {
          p_user_id: authData.user.id,
          p_email: email, // Pass email for potential use in profile
          p_role: role,
          p_first_name: userData.firstName,
          p_last_name: userData.lastName,
          p_phone: userData.phone,
          p_address: userData.address,
          p_city: userData.city,
          p_state: userData.state,
          p_zip_code: userData.zipCode,
        })
      );

      if (profileError) {
        console.error("Error creating profile/assigning role:", profileError);
        // Attempt to clean up the auth user if profile creation failed?
        // Or alert user to contact support.
        throw new Error(
          `Account created, but failed to set up profile/role: ${profileError.message}`
        );
      }

      console.log(
        `Profile created and role '${role}' assigned for user ${authData.user.id}`
      );

      Alert.alert(
        "Sign Up Successful",
        "Please check your email to confirm your account."
      );
    } catch (error: any) {
      handleAuthError(error, "Sign Up");
    } finally {
      setLoading(false);
    }
  };

  // Centralized error handling for authentication operations within the provider
  const handleAuthError = (error: any, action: string) => {
    console.error(`Auth error during ${action}:`, error);

    // Network connectivity check (already part of AuthProvider state)
    if (!networkStatus) {
      const networkError = {
        error:
          "Network connection unavailable. Please check your internet connection and try again.",
        code: "network_unavailable",
      };
      setError(networkError.error);
      return networkError.error; // Return the message for potential direct use
    }

    // Use the centralized handleApiError for consistent formatting
    const standardizedError = handleApiError(error);

    // Handle specific auth scenarios like expired tokens
    if (error.status === 401 || standardizedError.code === "session_expired") {
      // Token expired or session invalid
      setError("Your session has expired. Please sign in again.");
      // Attempt sign out but don't block on it or let its errors overwrite the primary one
      signOut().catch((signOutError) =>
        console.error(
          "Error during sign out after session expiry:",
          signOutError
        )
      );
      return "Your session has expired. Please sign in again.";
    }

    // Set the standardized error message for the UI
    setError(standardizedError.error);
    return standardizedError.error; // Return the message
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use queryWithRetry for signInWithPassword
      const { error } = await queryWithRetry(() =>
        supabase.auth.signInWithPassword({ email, password })
      );
      if (error) throw error;

      // Role check and navigation will be handled by onAuthStateChange
      Alert.alert("Sign In Successful");
    } catch (error: any) {
      handleAuthError(error, "Sign In");
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use queryWithRetry for signOut
      const { error } = await queryWithRetry(() => supabase.auth.signOut());
      if (error) throw error;

      // Clear local state immediately
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(false);

      // Clear any potentially persisted session info (important if persistence was ever enabled)
      await clearStoredSession();

      Alert.alert("Signed Out");
      router.replace("/"); // Ensure redirection after state clear
    } catch (error: any) {
      handleAuthError(error, "Sign Out");
    } finally {
      setLoading(false);
    }
  };

  // Reset password (send password reset email)
  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      // Prepare redirect URL for password reset confirmation
      const redirectUrl = Linking.createURL("/"); // Or a specific password reset confirmation page

      // Use queryWithRetry for resetPasswordForEmail
      const { error } = await queryWithRetry(() =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        })
      );

      if (error) throw error;
      Alert.alert("Password Reset Email Sent", "Please check your email.");
    } catch (error: any) {
      handleAuthError(error, "Password Reset");
    } finally {
      setLoading(false);
    }
  };

  // Update user's password
  const updatePassword = async (password: string) => {
    if (!user) {
      setError("You must be logged in to update your password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Use queryWithRetry for updateUser
      const { error } = await queryWithRetry(() =>
        supabase.auth.updateUser({ password })
      );
      if (error) throw error;
      Alert.alert("Password Updated Successfully");
    } catch (error: any) {
      handleAuthError(error, "Update Password");
    } finally {
      setLoading(false);
    }
  };

  // Create the value object with all auth functions and state
  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    error,
    isAdmin,
    isTechnician,
    isCustomer,
    networkStatus,
  };

  // Return the provider with the value
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
