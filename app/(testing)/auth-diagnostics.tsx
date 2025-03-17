import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { supabase } from "../../utils/supabase";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../../lib/auth";

export default function AuthDiagnosticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jwtData, setJwtData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [userRoleData, setUserRoleData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnosticData = async () => {
    try {
      setLoading(true);
      setError(null);
      setJwtData(null);
      setProfileData(null);
      setUserRoleData(null);

      // Get JWT token
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        // Decode JWT
        const decodedToken = jwtDecode(sessionData.session.access_token);
        setJwtData(decodedToken);
      } else {
        setError("No active session found");
        return;
      }

      // Get user profile data
      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setError(`Profile error: ${profileError.message}`);
        } else {
          setProfileData(profile);
        }

        // Get user role data
        const { data: userRole, error: userRoleError } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", user.id);

        if (userRoleError) {
          console.error("Error fetching user role:", userRoleError);
          setError(
            (prev) =>
              `${prev ? prev + "; " : ""}User role error: ${
                userRoleError.message
              }`
          );
        } else {
          setUserRoleData(userRole);
        }
      }
    } catch (error: any) {
      console.error("Diagnostic error:", error);
      setError(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        setError(`Session refresh error: ${error.message}`);
        return;
      }

      console.log("Session refreshed successfully");
      // Fetch updated data
      await fetchDiagnosticData();
    } catch (error: any) {
      setError(`Refresh error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchDiagnosticData();
    }
  }, [user]);

  // If no user is logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Auth Diagnostics" }} />
        <View style={styles.centeredContent}>
          <Text style={styles.noUserText}>
            Please log in to view diagnostics
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Auth Diagnostics" }} />

      <View style={styles.header}>
        <Text style={styles.title}>Authentication Diagnostics</Text>
        <Text style={styles.subtitle}>
          View your JWT token and role information
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={fetchDiagnosticData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={refreshSession}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh Session</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading diagnostic data...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* User ID Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User ID:</Text>
        <Text style={styles.code}>{user?.id}</Text>
      </View>

      {/* JWT Data Section */}
      {jwtData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JWT Token Data:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>user_role:</Text>
            <Text style={styles.code}>{jwtData.user_role || "Not set"}</Text>

            <Text style={styles.codeLabel}>app_metadata.role:</Text>
            <Text style={styles.code}>
              {jwtData.app_metadata?.role || "Not set"}
            </Text>

            <Text style={styles.codeLabel}>role:</Text>
            <Text style={styles.code}>{jwtData.role || "Not set"}</Text>

            <Text style={styles.codeLabel}>Complete JWT Data:</Text>
            <ScrollView horizontal>
              <Text style={styles.code}>
                {JSON.stringify(jwtData, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Profile Data Section */}
      {profileData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Data:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>Role from profiles table:</Text>
            <Text style={styles.code}>{profileData.role || "Not set"}</Text>

            <Text style={styles.codeLabel}>Complete Profile Data:</Text>
            <ScrollView horizontal>
              <Text style={styles.code}>
                {JSON.stringify(profileData, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}

      {/* User Role Data Section */}
      {userRoleData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Roles Data:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLabel}>Roles from user_roles table:</Text>
            {userRoleData.length > 0 ? (
              userRoleData.map((role: any, index: number) => (
                <Text key={index} style={styles.code}>
                  {role.role}
                </Text>
              ))
            ) : (
              <Text style={styles.code}>No roles found</Text>
            )}

            <Text style={styles.codeLabel}>Complete User Roles Data:</Text>
            <ScrollView horizontal>
              <Text style={styles.code}>
                {JSON.stringify(userRoleData, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footnote}>
          This page helps diagnose authentication role issues by showing all
          locations where role information is stored.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noUserText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 0,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#0d9488",
    marginRight: 0,
    marginLeft: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  errorTitle: {
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 5,
  },
  errorText: {
    color: "#b91c1c",
  },
  section: {
    margin: 20,
    marginTop: 0,
    marginBottom: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    backgroundColor: "#e2e8f0",
    padding: 10,
    fontWeight: "bold",
  },
  codeBlock: {
    padding: 15,
  },
  codeLabel: {
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
    marginBottom: 20,
  },
  footnote: {
    color: "#64748b",
    fontSize: 12,
    fontStyle: "italic",
  },
});
