import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import {
  LogOut,
  BugPlay,
  RefreshCcw,
  Trash,
  AlertTriangle,
} from "lucide-react-native";

export default function DebugTools() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleClearStorage = async () => {
    try {
      setLoading(true);
      setResult(null);

      if (typeof window !== "undefined" && window.localStorage) {
        // List all items before clearing
        const items = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items.push(key);
          }
        }

        // Clear all Supabase related items
        let cleared = 0;
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.includes("supabase") || key.includes("auth"))) {
            window.localStorage.removeItem(key);
            cleared++;
          }
        }

        setResult(
          `Cleared ${cleared} items from local storage.\nItems before clearing: ${items.join(
            ", "
          )}`
        );
      } else {
        setResult("LocalStorage not available");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSession = async () => {
    try {
      setLoading(true);
      setResult(null);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setResult(`Error checking session: ${error.message}`);
        return;
      }

      const session = data.session;

      if (!session) {
        setResult("No active session found");
        return;
      }

      // Filter the session data to avoid overwhelming output
      const filteredSession = {
        user: {
          id: session.user.id,
          email: session.user.email,
          role:
            session.user.app_metadata?.role || session.user.user_metadata?.role,
        },
        expires_at: session.expires_at,
        token_type: session.token_type,
      };

      setResult(`Active session:\n${JSON.stringify(filteredSession, null, 2)}`);
    } catch (error: any) {
      console.error("Error:", error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async () => {
    try {
      setLoading(true);
      setResult(null);

      // Call signOut with global scope
      const { error } = await supabase.auth.signOut({
        scope: "global",
      });

      if (error) {
        setResult(`Error logging out: ${error.message}`);
        return;
      }

      // Clear local storage
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.includes("supabase") || key.includes("auth"))) {
              window.localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.error("Error clearing localStorage:", e);
        }
      }

      setResult("Successfully logged out");

      setTimeout(() => {
        router.replace("/");
      }, 2000);
    } catch (error: any) {
      console.error("Error:", error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <BugPlay size={40} color="#16a34a" style={styles.icon} />
        <Text style={styles.title}>Authentication Debug Tools</Text>
        <Text style={styles.description}>
          Use these tools to troubleshoot authentication issues in your
          application.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleCheckSession}
            disabled={loading}
          >
            <RefreshCcw size={18} color="white" />
            <Text style={styles.buttonText}>Check Current Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleClearStorage}
            disabled={loading}
          >
            <Trash size={18} color="white" />
            <Text style={styles.buttonText}>Clear Local Storage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleForceLogout}
            disabled={loading}
          >
            <LogOut size={18} color="white" />
            <Text style={styles.buttonText}>Force Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Navigation</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.navButton]}
            onPress={() => handleNavigate("/")}
          >
            <Text style={styles.navButtonText}>Login Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton]}
            onPress={() => handleNavigate("/(admin)/dashboard")}
          >
            <Text style={styles.navButtonText}>Admin Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton]}
            onPress={() => handleNavigate("/(customer)/dashboard")}
          >
            <Text style={styles.navButtonText}>Customer Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton]}
            onPress={() => handleNavigate("/force-logout")}
          >
            <Text style={styles.navButtonText}>Force Logout Page</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Result:</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{result}</Text>
            </View>
          </View>
        )}

        <View style={styles.warningContainer}>
          <AlertTriangle size={18} color="#f59e0b" />
          <Text style={styles.warningText}>
            These tools are for debugging purposes only and should not be
            included in production.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#111827",
  },
  description: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  warningButton: {
    backgroundColor: "#f59e0b",
  },
  dangerButton: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827",
  },
  navButton: {
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  navButtonText: {
    color: "#4b5563",
    fontSize: 16,
    fontWeight: "500",
  },
  resultContainer: {
    marginTop: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },
  resultBox: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  resultText: {
    fontFamily: "monospace",
    fontSize: 14,
    color: "#111827",
  },
  warningContainer: {
    marginTop: 24,
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcd34d",
    alignItems: "flex-start",
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#92400e",
  },
});
