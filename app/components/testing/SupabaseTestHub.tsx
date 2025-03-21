import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import SupabaseTestUI from "./SupabaseTestUI";
import AuthTest from "./AuthTest";
import JwtRoleTester from "../JwtRoleTester";

// This component will serve as a hub for all Supabase-related tests
export default function SupabaseTestHub() {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  // List of available tests
  const tests = [
    {
      id: "connection",
      name: "Data Service Tests",
      description: "Test Supabase connection and data service functions",
      component: SupabaseTestUI,
    },
    {
      id: "auth",
      name: "Authentication Tests",
      description: "Test Supabase authentication methods and JWT role claims",
      component: AuthTest,
    },
    {
      id: "jwt-role",
      name: "JWT Role Tester",
      description: "Detailed testing of JWT token role claims and debugging",
      component: JwtRoleTester,
    },
  ];

  // Render a specific test component
  const renderTest = () => {
    const test = tests.find((t) => t.id === selectedTest);
    if (!test) return null;

    const TestComponent = test.component;
    return (
      <View style={styles.testContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedTest(null)}
        >
          <Text style={styles.backButtonText}>← Back to Tests</Text>
        </TouchableOpacity>

        <TestComponent />
      </View>
    );
  };

  // Render the test selection screen
  const renderTestList = () => (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Supabase Test Hub</Text>
      <Text style={styles.subtitle}>
        Select a test module to verify Supabase functionality
      </Text>

      <ScrollView style={styles.testList}>
        {tests.map((test) => (
          <TouchableOpacity
            key={test.id}
            style={styles.testCard}
            onPress={() => setSelectedTest(test.id)}
          >
            <Text style={styles.testName}>{test.name}</Text>
            <Text style={styles.testDescription}>{test.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>Close Test Hub</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <View style={styles.mainContainer}>
      {selectedTest ? renderTest() : renderTestList()}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    color: "#666",
  },
  testList: {
    flex: 1,
  },
  testCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  testDescription: {
    fontSize: 14,
    color: "#666",
  },
  testContainer: {
    flex: 1,
  },
  backButton: {
    backgroundColor: "#f5f5f7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196f3",
  },
  closeButton: {
    backgroundColor: "#e0e0e0",
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#616161",
  },
});
