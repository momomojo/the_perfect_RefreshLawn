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
        supabase.auth.getSession().then(({ data, error }) => {
          if (error) {
            console.error("Error refreshing session after reconnect:", error);
          } else if (data.session) {
            setSession(data.session);
          }
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

    // Check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user);
      }
      setLoading(false);
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
    try {
      // First try to get the role from custom claims
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("No active session found");
        setIsAdmin(false);
        setIsTechnician(false);
        setIsCustomer(true); // Default to customer role
        return;
      }

      // Decode the JWT to check for the user_role claim at the root level
      let userRoleClaim = null;
      if (session.access_token) {
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

            // Check for user_role claim at root level (set by custom hook)
            if (decodedToken.user_role) {
              console.log(
                "Found user_role claim in JWT:",
                decodedToken.user_role
              );
              userRoleClaim = decodedToken.user_role;
            }
          }
        } catch (error) {
          console.error("Error decoding JWT:", error);
        }
      }

      // Check for role in priority order:
      // 1. user_role claim (from JWT root level)
      // 2. app_metadata.role
      // 3. user_metadata.role
      const roleClaim =
        userRoleClaim ||
        session.user.app_metadata?.role ||
        session.user.user_metadata?.role;

      if (roleClaim) {
        console.log("Role from claims:", roleClaim);
        setIsAdmin(roleClaim === "admin");
        setIsTechnician(roleClaim === "technician");
        setIsCustomer(roleClaim === "customer" || !roleClaim);
        return;
      }

      // Fallback to database query if not in claims
      console.log("Role not found in claims, querying database...");
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error.message);
        return;
      }

      if (data) {
        console.log("Role from database:", data.role);
        setIsAdmin(data.role === "admin");
        setIsTechnician(data.role === "technician");
        setIsCustomer(data.role === "customer" || !data.role);

        // Only refresh the token on first login or when auth state changes to SIGNED_IN
        // This prevents the refresh loop
        const isWeb = typeof window !== "undefined";
        if (
          data.role &&
          !hasRefreshedTokenRef.current &&
          (!isWeb || !window.__hasRefreshedToken)
        ) {
          console.log("Refreshing session to update claims (one-time)...");
          // Set the flag to prevent future refreshes
          hasRefreshedTokenRef.current = true;
          if (isWeb) {
            window.__hasRefreshedToken = true;
          }
          await supabase.auth.refreshSession();
        }
      }
    } catch (error) {
      console.error("Error in checkUserRole:", error);
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
    try {
      setLoading(true);
      setError(null);

      // Include user role in metadata during signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            // Include role directly in the metadata for proper role assignment
            role: role,
            first_name: userData.firstName,
            last_name: userData.lastName,
            address: userData.address,
            city: userData.city,
            state: userData.state,
            zip_code: userData.zipCode,
            phone: userData.phone,
          },
        },
      });

      if (error) {
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      // If the user is created, update the profile with the role and additional data
      if (data.user) {
        const updateData = {
          role,
          ...(userData.firstName && { first_name: userData.firstName }),
          ...(userData.lastName && { last_name: userData.lastName }),
          ...(userData.address && { address: userData.address }),
          ...(userData.city && { city: userData.city }),
          ...(userData.state && { state: userData.state }),
          ...(userData.zipCode && { zip_code: userData.zipCode }),
          ...(userData.phone && { phone: userData.phone }),
        };

        const { error: profileError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError.message);
        }

        // Force a session refresh to update JWT claims
        await supabase.auth.refreshSession();
      }

      Alert.alert(
        "Verification email sent",
        "Please check your email to verify your account"
      );
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Improved error handling for user authentication
  const handleAuthError = (error: any, action: string) => {
    console.error(`Auth error during ${action}:`, error);

    // Network related errors
    if (!networkStatus) {
      setError(
        "Network connection unavailable. Please check your internet connection and try again."
      );
      return "Network connection unavailable. Please check your internet connection and try again.";
    }

    // Handle specific error codes/messages
    if (error.message?.includes("network")) {
      setError(
        "Network error. Please check your internet connection and try again."
      );
      return "Network error. Please check your internet connection and try again.";
    }

    if (error.message?.includes("timeout")) {
      setError("Request timed out. Please try again.");
      return "Request timed out. Please try again.";
    }

    if (error.status === 401 || error.message?.includes("expired")) {
      // Token expired
      setError("Your session has expired. Please sign in again.");
      signOut().catch(console.error);
      return "Your session has expired. Please sign in again.";
    }

    // Default error message
    setError(error.message || `An error occurred during ${action}`);
    return error.message || `An error occurred during ${action}`;
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check network connectivity first
      if (networkStatus === false) {
        throw new Error(
          "Network connection unavailable. Please check your internet connection and try again."
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSession(data.session);
      setUser(data.user);
      checkUserRole(data.user);
    } catch (error: any) {
      handleAuthError(error, "sign in");
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("Auth context: Starting signOut process");
      setLoading(true);
      setError(null);

      // Call the signOut method
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error in signOut:", error.message);
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      console.log("Auth context: SignOut API call successful");

      // Force clear session and user state
      setSession(null);
      setUser(null);

      // Reset user role states
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(false);

      // Force navigation to login page
      console.log("Auth context: Redirecting to login page");
      router.replace("/");
    } catch (error: any) {
      console.error("Caught error in signOut:", error.message);
      setError(error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset password (send password reset email)
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const redirectTo = Linking.createURL("/(auth)/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert(
        "Password Reset Email Sent",
        "Check your email for a password reset link"
      );
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update user's password
  const updatePassword = async (password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert("Success", "Your password has been updated");
      router.replace("/");
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", error.message);
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
