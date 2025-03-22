import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";

/**
 * Force Logout Page
 *
 * This page provides a way to completely log out and clear all auth data
 * Use this when normal logout isn't working
 */
export default function ForceLogoutScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const clearWebStorage = async () => {
    try {
      if (Platform.OS === "web") {
        // Clear all localStorage items
        localStorage.clear();
        // Clear all sessionStorage items
        sessionStorage.clear();
        setResult((prev) => prev + "\n✅ Cleared web storage");
      } else {
        setResult(
          (prev) =>
            prev + "\n⚠️ Web storage clearing only applies to web platform"
        );
      }
    } catch (error) {
      console.error("Error clearing web storage:", error);
      setResult(
        (prev) => prev + `\n❌ Error clearing web storage: ${error.message}`
      );
    }
  };

  const clearAsyncStorage = async () => {
    try {
      if (Platform.OS !== "web") {
        // Clear AsyncStorage
        await AsyncStorage.clear();
        setResult((prev) => prev + "\n✅ Cleared AsyncStorage");
      } else {
        setResult(
          (prev) =>
            prev + "\n⚠️ AsyncStorage clearing only applies to native platforms"
        );
      }
    } catch (error) {
      console.error("Error clearing AsyncStorage:", error);
      setResult(
        (prev) => prev + `\n❌ Error clearing AsyncStorage: ${error.message}`
      );
    }
  };

  const forceSignOut = async () => {
    try {
      // Force sign out with global scope to clear all devices
      await supabase.auth.signOut({ scope: "global" });
      setResult(
        (prev) => prev + "\n✅ Forced Supabase signOut with global scope"
      );
    } catch (error) {
      console.error("Error during force sign out:", error);
      setResult(
        (prev) => prev + `\n❌ Error during force sign out: ${error.message}`
      );
    }
  };

  const handleForceLogout = async () => {
    setLoading(true);
    setResult("🔄 Starting force logout process...");

    try {
      // 1. Clear web storage (if on web)
      await clearWebStorage();

      // 2. Clear AsyncStorage (if on native)
      await clearAsyncStorage();

      // 3. Force sign out from Supabase
      await forceSignOut();

      // 4. Use the auth context's signOut (will handle navigation)
      await signOut();

      setResult((prev) => prev + "\n✅ Force logout complete");

      if (Platform.OS === "web") {
        // Force page reload on web for a completely fresh start
        window.location.href = "/";
      } else {
        // Navigate to login screen on native
        router.replace("/login");
      }
    } catch (error) {
      console.error("Force logout failed:", error);
      setResult((prev) => prev + `\n❌ Force logout failed: ${error.message}`);
      Alert.alert(
        "Force Logout Failed",
        "Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data?.session) {
        const userDetails = JSON.stringify(data.session.user, null, 2);
        setResult(`Current session:\n${userDetails}`);
      } else {
        setResult("No active session found");
      }
    } catch (error) {
      console.error("Error getting session:", error);
      setResult(`Error getting session: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Emergency Authentication Reset</Text>

        <Text style={styles.description}>
          Use this tool to forcefully reset your authentication state if you're
          experiencing login or logout issues. This will clear all storage and
          sign you out of all devices.
        </Text>

        <View style={styles.userInfo}>
          <Text style={styles.label}>Current User:</Text>
          <Text>{user ? user.email : "Not logged in"}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={getCurrentSession}
            style={styles.outlineButton}
          >
            <Text style={styles.outlineButtonText}>Check Current Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForceLogout}
            style={[styles.destructiveButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Working..." : "Force Logout (All Devices)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/")}
            style={styles.outlineButton}
          >
            <Text style={styles.outlineButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        {result ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Result:</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  content: {
    padding: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#e11d48", // Red color to indicate caution
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  userInfo: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#10b981",
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  outlineButtonText: {
    color: "#10b981",
    fontWeight: "600",
  },
  destructiveButton: {
    backgroundColor: "#e11d48",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  resultContainer: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  resultLabel: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultText: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    whiteSpace: "pre-wrap",
  },
});
