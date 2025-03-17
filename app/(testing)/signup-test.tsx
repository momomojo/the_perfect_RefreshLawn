import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import SimpleSignupTest from "../components/testing/SimpleSignupTest";
import { Stack } from "expo-router";

export default function SignupTestPage() {
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Signup Testing" }} />

      <View style={styles.header}>
        <Text style={styles.title}>Signup Functionality Test</Text>
        <Text style={styles.subtitle}>
          Testing simplified signup to isolate the issue
        </Text>
      </View>

      <SimpleSignupTest />

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Troubleshooting Notes</Text>
        <Text style={styles.infoText}>
          1. This test bypasses the complex role management system
        </Text>
        <Text style={styles.infoText}>
          2. If this works but the regular signup doesn't, the issue is likely
          with the role management functions or triggers
        </Text>
        <Text style={styles.infoText}>
          3. If this also fails, the issue might be with the Supabase
          authentication service itself
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
  infoContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: "#f0f9ff",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 10,
    color: "#333",
  },
});
