import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  verifyJwtHookWorking,
  refreshJWTClaims,
} from "../../utils/userRoleManager";
import { supabase } from "../../lib/supabase";

/**
 * JWT Debugger Component
 *
 * A diagnostic tool to help debug JWT token issues, specifically for
 * role-based access control with custom access token hooks.
 */
const JwtDebugger = () => {
  const [jwtStatus, setJwtStatus] = useState<{
    isWorking: boolean;
    missingClaims: string[];
    message: string;
    jwt?: Record<string, any>;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Check JWT status on component mount
  useEffect(() => {
    checkJwtStatus();
  }, []);

  // Function to check JWT status
  const checkJwtStatus = async () => {
    setLoading(true);
    const status = await verifyJwtHookWorking();
    setJwtStatus(status);
    setLoading(false);
  };

  // Function to refresh JWT claims
  const handleRefreshToken = async () => {
    setLoading(true);
    await refreshJWTClaims();
    await checkJwtStatus();
    setLoading(false);
  };

  // Function to sign out
  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut({ scope: "global" });
    setJwtStatus(null);
    setLoading(false);
  };

  if (!jwtStatus) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>JWT Debugger</Text>
        <Text style={styles.message}>Loading JWT information...</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={checkJwtStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Check JWT Status"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JWT Debugger</Text>

      {/* Status Indicator */}
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: jwtStatus.isWorking ? "#4CAF50" : "#F44336" },
        ]}
      >
        <Text style={styles.statusText}>
          {jwtStatus.isWorking
            ? "Claims Hook Working"
            : "Claims Hook Not Working"}
        </Text>
      </View>

      {/* Message */}
      <Text style={styles.message}>{jwtStatus.message}</Text>

      {/* Missing Claims */}
      {jwtStatus.missingClaims.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Missing Claims:</Text>
          {jwtStatus.missingClaims.map((claim, index) => (
            <Text key={index} style={styles.claimText}>
              • {claim}
            </Text>
          ))}
        </View>
      )}

      {/* JWT Details Toggle */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.toggleButtonText}>
          {expanded ? "Hide JWT Details" : "Show JWT Details"}
        </Text>
      </TouchableOpacity>

      {/* JWT Details */}
      {expanded && jwtStatus.jwt && (
        <ScrollView style={styles.jwtDetails}>
          <Text style={styles.sectionTitle}>JWT Claims:</Text>
          {Object.entries(jwtStatus.jwt).map(([key, value]) => (
            <Text key={key} style={styles.jwtText}>
              <Text style={styles.jwtKey}>{key}: </Text>
              <Text style={styles.jwtValue}>
                {typeof value === "object"
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </Text>
            </Text>
          ))}
        </ScrollView>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={handleRefreshToken}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Refresh Claims"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Sign Out"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.checkButton]}
        onPress={checkJwtStatus}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Loading..." : "Check Claims Status Again"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  statusIndicator: {
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 16,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
  },
  message: {
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  claimText: {
    marginLeft: 8,
    marginBottom: 4,
    color: "#F44336",
  },
  jwtDetails: {
    maxHeight: 300,
    marginBottom: 16,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  jwtText: {
    marginBottom: 4,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  jwtKey: {
    fontWeight: "bold",
  },
  jwtValue: {
    color: "#607D8B",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    backgroundColor: "#2196F3",
  },
  refreshButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#4CAF50",
  },
  signOutButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#F44336",
  },
  checkButton: {
    backgroundColor: "#2196F3",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  toggleButton: {
    padding: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  toggleButtonText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
});

export default JwtDebugger;
