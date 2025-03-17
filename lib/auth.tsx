import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";

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

  // Use a React ref to track token refresh in React Native (window might not exist)
  const hasRefreshedTokenRef = React.useRef(false);

  useEffect(() => {
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
        // Navigate based on user role instead of always going to customer dashboard
        if (isAdmin) {
          router.replace("/(admin)/dashboard");
        } else if (isTechnician) {
          router.replace("/(technician)/dashboard");
        } else {
          // Default to customer dashboard
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
      // First check if the role is in the JWT claims (app_metadata)
      const userRole = user?.app_metadata?.user_role;
      console.log("User role from JWT claims:", userRole);

      if (userRole) {
        // If role is in JWT claims, use it directly
        setIsAdmin(userRole === "admin");
        setIsTechnician(userRole === "technician");
        setIsCustomer(userRole === "customer");
        return;
      }

      // Fallback to database query if not in JWT claims
      console.log("Role not found in JWT claims, querying database...");
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
        setIsCustomer(data.role === "customer");

        // Only refresh the token on first login or when auth state changes to SIGNED_IN
        // This prevents the refresh loop
        const isWeb = typeof window !== "undefined";
        if (
          data.role &&
          !hasRefreshedTokenRef.current &&
          (!isWeb || !window.__hasRefreshedToken)
        ) {
          console.log("Refreshing session to update JWT claims (one-time)...");
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

      // Before sending to Supabase
      const normalizedRole = role.toLowerCase().trim();

      // Include user role in metadata during signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            // Include role directly in the metadata for proper role assignment
            role: normalizedRole,
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
          role: normalizedRole,
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

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        Alert.alert("Error", error.message);
        return;
      }

      if (data.user) {
        checkUserRole(data.user);
      }
    } catch (error: any) {
      setError(error.message);
      Alert.alert("Error", error.message);
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
