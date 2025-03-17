import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
} from "react-native";
import {
  getServices,
  getRecurringPlans,
  getTechnicians,
  getCustomers,
  getProfile,
  getCustomerBookings,
  getTechnicianBookings,
  getBooking,
  getDashboardMetrics,
  Service,
  RecurringPlan,
  Profile,
  Booking,
} from "../../lib/data";

type TestResult = {
  success: boolean;
  data: any | null;
  error: string | null;
  duration: number;
};

type TestDefinition = {
  name: string;
  description: string;
  execute: () => Promise<any>;
};

export default function SupabaseTestUI() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState<string | null>(null);

  // Define all tests
  const tests: TestDefinition[] = [
    {
      name: "getServices",
      description: "Fetch all services from the database",
      execute: getServices,
    },
    {
      name: "getRecurringPlans",
      description: "Fetch all recurring plans from the database",
      execute: getRecurringPlans,
    },
    {
      name: "getTechnicians",
      description: "Fetch all technicians from the database",
      execute: getTechnicians,
    },
    {
      name: "getCustomers",
      description: "Fetch all customers from the database",
      execute: getCustomers,
    },
    {
      name: "getDashboardMetrics",
      description: "Fetch dashboard metrics for performance monitoring",
      execute: getDashboardMetrics,
    },
    {
      name: "getProfile",
      description: "Fetch a profile by ID (using first technician ID)",
      execute: async () => {
        // First fetch technicians to get a sample ID
        const technicians = await getTechnicians();
        if (technicians.length === 0) {
          throw new Error("No technicians found to test getProfile");
        }
        return getProfile(technicians[0].id);
      },
    },
    {
      name: "getCustomerBookings",
      description: "Fetch bookings for a customer (using first customer ID)",
      execute: async () => {
        // First fetch customers to get a sample ID
        const customers = await getCustomers();
        if (customers.length === 0) {
          throw new Error("No customers found to test getCustomerBookings");
        }
        return getCustomerBookings(customers[0].id);
      },
    },
    {
      name: "getTechnicianBookings",
      description:
        "Fetch bookings for a technician (using first technician ID)",
      execute: async () => {
        // First fetch technicians to get a sample ID
        const technicians = await getTechnicians();
        if (technicians.length === 0) {
          throw new Error("No technicians found to test getTechnicianBookings");
        }
        return getTechnicianBookings(technicians[0].id);
      },
    },
  ];

  // Run a single test
  const runTest = async (test: TestDefinition) => {
    setRunning(test.name);
    const startTime = Date.now();

    try {
      const data = await test.execute();
      setResults((prev) => ({
        ...prev,
        [test.name]: {
          success: true,
          data,
          error: null,
          duration: Date.now() - startTime,
        },
      }));
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [test.name]: {
          success: false,
          data: null,
          error: err.message || String(err),
          duration: Date.now() - startTime,
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  // Run all tests sequentially
  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test);
    }
  };

  // Render a test button
  const renderTestButton = (test: TestDefinition) => {
    const result = results[test.name];
    const isRunning = running === test.name;

    return (
      <View style={styles.testCard} key={test.name}>
        <View style={styles.testHeader}>
          <Text style={styles.testName}>{test.name}</Text>
          {result && (
            <View
              style={[
                styles.resultBadge,
                { backgroundColor: result.success ? "#4caf50" : "#f44336" },
              ]}
            >
              <Text style={styles.resultBadgeText}>
                {result.success ? "SUCCESS" : "FAILED"}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.testDescription}>{test.description}</Text>

        {result && result.duration && (
          <Text style={styles.duration}>Duration: {result.duration}ms</Text>
        )}

        <TouchableOpacity
          style={[styles.testButton, isRunning && styles.testButtonRunning]}
          onPress={() => runTest(test)}
          disabled={isRunning || running !== null}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.testButtonText}>
              {result ? "Run Again" : "Run Test"}
            </Text>
          )}
        </TouchableOpacity>

        {result && result.success && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Result:</Text>
            <ScrollView style={styles.resultData}>
              <Text>{JSON.stringify(result.data, null, 2)}</Text>
            </ScrollView>
          </View>
        )}

        {result && !result.success && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorMessage}>{result.error}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Supabase Function Tests</Text>
      <Text style={styles.subtitle}>
        Run individual tests to verify Supabase functionality
      </Text>

      <TouchableOpacity
        style={[
          styles.runAllButton,
          running !== null && styles.runAllButtonDisabled,
        ]}
        onPress={runAllTests}
        disabled={running !== null}
      >
        <Text style={styles.runAllButtonText}>
          {running !== null ? "Tests Running..." : "Run All Tests"}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.testList}>
        {tests.map(renderTestButton)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f7",
  },
  title: {
    fontSize: 24,
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
  runAllButton: {
    backgroundColor: "#2196f3",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  runAllButtonDisabled: {
    backgroundColor: "#b0bec5",
  },
  runAllButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  testList: {
    flex: 1,
  },
  testCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  testHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  testName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  testDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  duration: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: "#2196f3",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  testButtonRunning: {
    backgroundColor: "#90caf9",
  },
  testButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resultBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  resultContainer: {
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultData: {
    maxHeight: 200,
    backgroundColor: "#f5f5f7",
    padding: 8,
    borderRadius: 4,
  },
  errorContainer: {
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 8,
  },
  errorMessage: {
    color: "#f44336",
  },
});
