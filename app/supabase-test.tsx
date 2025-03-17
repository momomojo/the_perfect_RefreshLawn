import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../lib/auth";
import { router } from "expo-router";
import SupabaseTestHub from "./components/testing/SupabaseTestHub";

export default function SupabaseTestScreen() {
  const { user } = useAuth();

  const navigateToTestHub = () => {
    router.push("/supabase-test-hub");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Status</Text>

      <View style={styles.userCard}>
        <Text style={styles.subtitle}>Current User:</Text>
        <Text style={styles.userInfo}>
          {user ? `Logged in as: ${user.email}` : "Not logged in"}
        </Text>
        {user && user.app_metadata?.user_role && (
          <Text style={styles.userRole}>
            Role: {user.app_metadata.user_role}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.testHubButton}
        onPress={navigateToTestHub}
      >
        <Text style={styles.buttonText}>Open Full Test Hub</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f7",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 24,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  userCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
  userRole: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196f3",
  },
  testHubButton: {
    backgroundColor: "#2196f3",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
