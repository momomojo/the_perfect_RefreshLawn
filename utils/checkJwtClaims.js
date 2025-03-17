// Check JWT Claims
import { jwtDecode } from "jwt-decode";
import { supabase } from "./supabase";

async function checkJwtClaims() {
  try {
    console.log("Checking JWT claims...");

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError.message);
      return;
    }

    if (!session || !session.access_token) {
      console.log(
        "No active session or access token found. Please sign in first."
      );
      return;
    }

    // Decode the JWT
    const decoded = jwtDecode(session.access_token);

    console.log("JWT Claims:", decoded);
    console.log(
      "User Role (from user_role claim):",
      decoded.user_role || "Not set"
    );
    console.log(
      "User Role (from app_metadata):",
      decoded.app_metadata?.role || "Not set"
    );

    return decoded;
  } catch (error) {
    console.error("Error checking JWT claims:", error);
  }
}

// Export the function
export { checkJwtClaims };
