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
import { router, useSegments, usePathname } from "expo-router";
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
  rolesLoading: boolean; // NEW: Track role determination
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
  const [rolesLoading, setRolesLoading] = useState(true); // NEW: Track role determination
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTechnician, setIsTechnician] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const hasRefreshedTokenRef = React.useRef(false);
  const roleCheckInProgressRef = React.useRef(false); // Prevent concurrent role checks
  const segments = useSegments();
  const pathname = usePathname();

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

  // Effect for Initial Session Check & Auth State Changes
  useEffect(() => {
    // Reset flag on initial mount
    hasRefreshedTokenRef.current = false;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.__hasRefreshedToken = false;
    }

    // NOTE: We do NOT clear stored sessions on mount - this allows persistent login.
    // Sessions are only cleared during explicit sign-out (see signOut function).

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
            checkUserRole(data.session.user, data.session);
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
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          // Await role check on initial load
          await checkUserRole(initialSession.user);
        }
      })
      .catch((err) => {
        console.error("Error getting initial session:", err);
      })
      .finally(() => {
        // Mark initial load as complete AFTER session check and role check (if applicable)
        setInitialLoadComplete(true);
        setLoading(false);
        setRolesLoading(false); // Reset rolesLoading even if no user session exists
      });

    // Subscribe to auth state changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`Supabase auth event: ${event}`, {
        hasUser: !!currentSession?.user,
        userId: currentSession?.user?.id,
        timestamp: new Date().toISOString()
      });

      // Skip INITIAL_SESSION - it was already handled by getSession()
      if (event === "INITIAL_SESSION") {
        console.log('[Auth] INITIAL_SESSION - Skipping role check (already handled)');
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed event received");

        // Log JWT details for debugging
        if (currentSession?.access_token) {
          try {
            const parts = currentSession.access_token.split(".");
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

        setSession(currentSession);
        // Potentially re-check role if claims might change after refresh
        if (currentSession?.user) {
          await checkUserRole(currentSession.user, currentSession);
        }
        return;
      }

      // Update session and user state
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Check role AFTER setting user/session state - PASS THE SESSION!
      if (currentSession?.user) {
        console.log('[Auth] Calling checkUserRole with session from event');
        await checkUserRole(currentSession.user, currentSession);
      } else {
        // Reset roles when user is null (SIGNED_OUT)
        console.log('[Auth] No user, resetting roles');
        setIsAdmin(false);
        setIsTechnician(false);
        setIsCustomer(false);
        setRolesLoading(false); // Reset rolesLoading when user logs out
      }

      // Remove loading indicator (initial load handled separately)
      // setLoading(false); // Already handled by initialLoadComplete

      // --- REMOVED NAVIGATION LOGIC FROM HERE ---
    });

    // Cleanup on unmount
    return () => {
      // subscription.remove(); // Linking listener cleanup (if applicable)
      authSubscription.unsubscribe();
    };
  }, []); // Empty dependency array - runs once on mount

  // Extract tokens from URL for deep linking
  const extractTokensFromUrl = (url: string) => {
    const params = new URLSearchParams(url.split("#")[1]);
    return {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
    };
  };

  // Check user role and update state (ensure it sets state reliably)
  const checkUserRole = async (targetUser: User | null, providedSession?: Session | null) => {
    // Prevent concurrent role checks
    if (roleCheckInProgressRef.current) {
      console.log('[checkUserRole] SKIP - Role check already in progress');
      return;
    }

    console.log('[checkUserRole] ENTRY - Starting role determination', {
      userId: targetUser?.id,
      hasProvidedSession: !!providedSession,
      timestamp: new Date().toISOString()
    });

    roleCheckInProgressRef.current = true;
    setRolesLoading(true); // START: Role determination begins

    if (!targetUser) {
      console.log('[checkUserRole] EXIT - No user provided');
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(false);
      roleCheckInProgressRef.current = false;
      setRolesLoading(false); // COMPLETE: No user = no roles
      return;
    }
    try {
      // Use provided session if available, otherwise fetch it
      let session = providedSession;

      if (!session) {
        console.log('[checkUserRole] Step 1 - Getting session (no session provided)...');
        const { data: { session: fetchedSession } } = await supabase.auth.getSession();
        session = fetchedSession;
      } else {
        console.log('[checkUserRole] Step 1 - Using provided session');
      }

      console.log('[checkUserRole] Step 2 - Session retrieved', {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (!session) {
        console.log('[checkUserRole] EXIT - No active session');
        setIsAdmin(false);
        setIsTechnician(false);
        setIsCustomer(true); // Default to customer role
        roleCheckInProgressRef.current = false;
        setRolesLoading(false);
        return;
      }

      console.log('[checkUserRole] Step 3 - Decoding JWT...');
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

            console.log('[checkUserRole] Step 4 - JWT decoded', {
              hasRoleClaim: !!decodedToken.user_role,
              roleClaim: decodedToken.user_role
            });

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
          console.error('[checkUserRole] Error decoding JWT:', error);
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

      let finalIsAdmin = false;
      let finalIsTechnician = false;
      let finalIsCustomer = false;

      if (roleClaim) {
        console.log("Role from claims:", roleClaim);
        finalIsAdmin = roleClaim === "admin";
        finalIsTechnician = roleClaim === "technician";
        finalIsCustomer = roleClaim === "customer" || !roleClaim; // Default to customer if claim exists but doesn't match known roles
      } else {
        // Fallback to database query
        console.log("Role not found in claims, querying database...");
        const { data, error: dbError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", targetUser.id)
          .single();

        if (dbError) {
          console.error("Error fetching user role:", dbError.message);
          // Decide on default behavior on error - maybe default to customer?
          finalIsCustomer = true;
        } else if (data) {
          console.log("Role from database:", data.role);
          finalIsAdmin = data.role === "admin";
          finalIsTechnician = data.role === "technician";
          finalIsCustomer = data.role === "customer" || !data.role; // Default to customer

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
        } else {
          console.log(
            "No profile found in DB for role, defaulting to customer."
          );
          finalIsCustomer = true; // Default if no profile found
        }
      }

      // Set state *once* after determining roles
      console.log('[checkUserRole] Step 5 - Setting role states...', {
        admin: finalIsAdmin,
        technician: finalIsTechnician,
        customer: finalIsCustomer
      });
      setIsAdmin(finalIsAdmin);
      setIsTechnician(finalIsTechnician);
      setIsCustomer(finalIsCustomer);
    } catch (error) {
      console.error('[checkUserRole] EXCEPTION:', error);
      // Set default roles on error
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(true);
    } finally {
      console.log('[checkUserRole] FINALLY - Cleanup and setting rolesLoading to false');
      roleCheckInProgressRef.current = false;
      setRolesLoading(false); // COMPLETE: Role determination finished
      console.log('[checkUserRole] Role determination complete');
    }
  };

  // Effect for Handling Navigation based on Auth State & Role (REVISED LOGIC)
  useEffect(() => {
    // Only run navigation logic after BOTH session check AND role determination are complete
    if (!initialLoadComplete || loading || rolesLoading) {
      console.log(`[Navigation Effect] Waiting: initialLoadComplete=${initialLoadComplete}, loading=${loading}, rolesLoading=${rolesLoading}`);
      return;
    }

    const currentTopLevelSegment = segments[0]; // e.g., '(auth)', '(customer)', '(admin)' or undefined if at '/'
    const isInAuthRoute = currentTopLevelSegment === "(auth)";
    // Check if any segment exists and it's not the auth group
    const isInAppRoute = segments.length > 0 && !isInAuthRoute;

    console.log(
      `[Navigation Effect V2] Path: ${pathname}, Segments: ${segments.join(
        "/"
      )}, User: ${!!user}, isAdmin: ${isAdmin}, isTech: ${isTechnician}, isCust: ${isCustomer}`
    );

    if (user && session) {
      // User is logged IN
      let expectedSegment: string | null = null;
      if (isAdmin) expectedSegment = "(admin)";
      else if (isTechnician) expectedSegment = "(technician)";
      else if (isCustomer) expectedSegment = "(customer)";

      // Determine the target dashboard route based on the segment
      const targetDashboardRoute = expectedSegment
        ? `/${expectedSegment}/dashboard`
        : null;

      // Redirect TO dashboard IF:
      // 1. User has a role/expectedSegment
      // 2. User is NOT currently in their correct segment group (or is at root '/')
      if (
        expectedSegment &&
        targetDashboardRoute &&
        (currentTopLevelSegment !== expectedSegment || pathname === "/")
      ) {
        console.log(
          `[Navigation Effect V2] User logged in. Redirecting from ${pathname} to ${targetDashboardRoute}`
        );
        router.replace(targetDashboardRoute as `/${string}`);
      } else if (
        !expectedSegment &&
        !isInAuthRoute &&
        pathname !== "/account"
      ) {
        // Logged in, but no role/segment determined. Not in auth routes and not on account page.
        console.log(
          `[Navigation Effect V2] User logged in but no expected segment (role issue?). Consider redirecting to /account or staying put.`
        );
        // Optional: Redirect to account page if appropriate
        // router.replace('/account');
      } else {
        // User is logged in AND already in their correct segment (or has no role and we decided not to redirect).
        // No redirect needed.
        console.log(
          `[Navigation Effect V2] User logged in. Correct segment (${currentTopLevelSegment}) or no action needed. Path: ${pathname}`
        );
      }
    } else {
      // User is logged OUT
      // Redirect TO login ('/') IF:
      // 1. User is currently inside any app route segment (not auth or root)
      if (isInAppRoute) {
        console.log(
          `[Navigation Effect V2] User logged out. Redirecting from ${pathname} to /`
        );
        router.replace("/");
      } else {
        // User is logged out and already on '/' or '/(auth)/...'. Do nothing.
        console.log(
          `[Navigation Effect V2] User logged out and already in public area. No redirect needed.`
        );
      }
    }
    // Ensure all state variables that influence logic are dependencies
  }, [
    user,
    session,
    isAdmin,
    isTechnician,
    isCustomer,
    loading,
    rolesLoading, // NEW: Wait for role determination
    initialLoadComplete,
    segments,
    pathname,
  ]);

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
      checkUserRole(data.user, data.session);
    } catch (error: any) {
      handleAuthError(error, "sign in");
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear any stored session first
      await clearStoredSession();

      // For web platform, clear localStorage
      if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
          // Clear all Supabase and auth related items from localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes("supabase") || key.includes("auth"))) {
              localStorage.removeItem(key);
            }
          }

          // Also clear session storage
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes("supabase") || key.includes("auth"))) {
              sessionStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.error("Error clearing storage:", e);
        }
      }

      // Force clear session state first to update UI immediately
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setIsTechnician(false);
      setIsCustomer(false);

      // Call signOut with global scope to sign out of all devices
      const { error } = await supabase.auth.signOut({
        scope: "global",
      });

      if (error) {
        throw error;
      }

      // Force navigation and cleanup
      if (Platform.OS === "web") {
        // For web, use a hard redirect to prevent any state issues
        window.location.href = "/";
      } else {
        // For mobile, use router
        router.replace("/");
      }
    } catch (error: any) {
      console.error("Error in signOut:", error);
      setError(error.message);
      Alert.alert("Error", "Failed to logout: " + error.message);

      // Try one more time with a different approach if first attempt failed
      try {
        await supabase.auth.signOut();

        // Force navigation even if there was an initial error
        if (Platform.OS === "web") {
          window.location.href = "/";
        } else {
          router.replace("/");
        }
      } catch (retryError) {
        // Just log the retry error, we've already shown an alert for the main error
        console.error("Retry logout failed:", retryError);
      }
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
    rolesLoading, // NEW: Expose role loading state
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
