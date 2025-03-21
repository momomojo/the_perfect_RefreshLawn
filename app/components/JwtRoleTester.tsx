import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { supabase } from "../../utils/supabase";
import {
  getRoleFromClaims,
  refreshJWTClaims,
  decodeCurrentJWT,
} from "../../utils/userRoleManager";

/**
 * JWT Role Tester Component
 *
 * A diagnostic tool for testing JWT token claims, specifically for
 * verifying the custom access token hook is working.
 */
const JwtRoleTester = () => {
  const [role, setRole] = useState<string | null>(null);
  const [jwtPayload, setJwtPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    setLoading(true);
    setMessage("Checking user role from claims...");

    try {
      // Get role from claims
      const userRole = await getRoleFromClaims();
      setRole(userRole);

      // Decode full JWT for examination
      const decoded = await decodeCurrentJWT();
      setJwtPayload(decoded);

      if (userRole) {
        setMessage(`Role found: ${userRole}`);
      } else {
        setMessage("No role found in JWT claims");
      }
    } catch (error) {
      console.error("Error checking role:", error);
      setMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    setMessage("Refreshing token...");

    try {
      const result = await refreshJWTClaims();

      if (result.success) {
        setMessage("Token refreshed successfully");
        // Check role again after refresh
        await checkRole();
      } else {
        setMessage(`Failed to refresh token: ${result.error?.message}`);
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      setMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setMessage("Signing out...");

    try {
      await supabase.auth.signOut();
      setRole(null);
      setJwtPayload(null);
      setMessage("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      setMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JWT Role Tester</Text>

      {/* Role Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Current Role:</Text>
        <Text
          style={[
            styles.statusText,
            role ? styles.successText : styles.errorText,
          ]}
        >
          {role || "No role found"}
        </Text>
      </View>

      {/* Message */}
      {message && <Text style={styles.message}>{message}</Text>}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={checkRole}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check Role</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleRefreshToken}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh Token</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.dangerButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* JWT Payload */}
      <ScrollView style={styles.scrollView}>
        <Text style={styles.sectionTitle}>JWT Payload:</Text>
        {jwtPayload ? (
          <View style={styles.jwtContainer}>
            {/* Display specific important fields */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>user_role:</Text>
              <Text style={styles.fieldValue}>
                {jwtPayload.user_role || "Not found"}
              </Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>app_metadata.role:</Text>
              <Text style={styles.fieldValue}>
                {jwtPayload.app_metadata?.role || "Not found"}
              </Text>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>user_metadata.role:</Text>
              <Text style={styles.fieldValue}>
                {jwtPayload.user_metadata?.role || "Not found"}
              </Text>
            </View>

            {/* Full JWT */}
            <Text style={styles.codeLabel}>Full JWT:</Text>
            <Text style={styles.codeBlock}>
              {JSON.stringify(jwtPayload, null, 2)}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No JWT data available</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
  },
  label: {
    fontWeight: "bold",
    marginRight: 8,
  },
  statusText: {
    fontWeight: "bold",
  },
  successText: {
    color: "#4CAF50",
  },
  errorText: {
    color: "#F44336",
  },
  message: {
    marginBottom: 16,
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 6,
    color: "#0d47a1",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  dangerButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  scrollView: {
    maxHeight: 300,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  jwtContainer: {
    marginBottom: 16,
  },
  fieldContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  fieldLabel: {
    fontWeight: "bold",
    marginRight: 8,
    minWidth: 150,
  },
  fieldValue: {
    flex: 1,
  },
  codeLabel: {
    fontWeight: "bold",
    marginVertical: 8,
  },
  codeBlock: {
    fontFamily: "monospace",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 6,
  },
  emptyText: {
    fontStyle: "italic",
    color: "#757575",
    textAlign: "center",
    marginVertical: 16,
  },
});

export default JwtRoleTester;
