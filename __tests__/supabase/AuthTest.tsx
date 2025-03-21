import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

type AuthOperation = {
  name: string;
  description: string;
  requiredFields: string[];
  action: (params: Record<string, string>) => Promise<any>;
};

export default function AuthTest() {
  const { user, signIn, signUp, signOut, resetPassword } = useAuth();
  const [formValues, setFormValues] = useState<Record<string, string>>({
    email: "",
    password: "",
    role: "customer",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset all state
  const resetState = () => {
    setResult(null);
    setError(null);
  };

  // Update form values
  const updateField = (field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    resetState();
  };

  // Define all auth operations
  const authOperations: AuthOperation[] = [
    {
      name: "getCurrentUser",
      description: "Get current authenticated user",
      requiredFields: [],
      action: async () => {
        const { data } = await supabase.auth.getUser();
        return data.user;
      },
    },
    {
      name: "signUp",
      description: "Register a new user",
      requiredFields: ["email", "password", "confirmPassword", "role"],
      action: async (params) => {
        if (params.password !== params.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await signUp(params.email, params.password, params.role, {});
        return { message: "User signed up successfully" };
      },
    },
    {
      name: "signIn",
      description: "Sign in with email and password",
      requiredFields: ["email", "password"],
      action: async (params) => {
        await signIn(params.email, params.password);
        return { message: "User signed in successfully" };
      },
    },
    {
      name: "signOut",
      description: "Sign out the current user",
      requiredFields: [],
      action: async () => {
        await signOut();
        return { message: "User signed out successfully" };
      },
    },
    {
      name: "resetPassword",
      description: "Send password reset email",
      requiredFields: ["email"],
      action: async (params) => {
        await resetPassword(params.email);
        return { message: "Password reset email sent" };
      },
    },
    {
      name: "getSession",
      description: "Get current session",
      requiredFields: [],
      action: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
      },
    },
  ];

  // Run an auth operation
  const runOperation = async (operation: AuthOperation) => {
    // Check required fields
    const missingFields = operation.requiredFields.filter(
      (field) => !formValues[field]
    );

    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    resetState();
    setLoading(operation.name);

    try {
      const data = await operation.action(formValues);
      setResult(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Supabase Authentication Tests</Text>

      <View style={styles.userInfoCard}>
        <Text style={styles.subtitle}>Current User:</Text>
        <Text style={styles.userInfo}>
          {user ? `Logged in as: ${user.email}` : "Not logged in"}
        </Text>
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.formFields}>
          <Text style={styles.fieldLabel}>Email:</Text>
          <TextInput
            style={styles.input}
            value={formValues.email}
            onChangeText={(text) => updateField("email", text)}
            placeholder="user@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Password:</Text>
          <TextInput
            style={styles.input}
            value={formValues.password}
            onChangeText={(text) => updateField("password", text)}
            placeholder="••••••••"
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>Confirm Password:</Text>
          <TextInput
            style={styles.input}
            value={formValues.confirmPassword}
            onChangeText={(text) => updateField("confirmPassword", text)}
            placeholder="••••••••"
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>Role:</Text>
          <View style={styles.roleSelector}>
            {["customer", "technician", "admin"].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleButton,
                  formValues.role === role && styles.roleButtonSelected,
                ]}
                onPress={() => updateField("role", role)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formValues.role === role && styles.roleButtonTextSelected,
                  ]}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Result:</Text>
            <ScrollView style={styles.resultData}>
              <Text>{JSON.stringify(result, null, 2)}</Text>
            </ScrollView>
          </View>
        )}

        <Text style={styles.operationsTitle}>Authentication Operations</Text>

        <View style={styles.operationsList}>
          {authOperations.map((operation) => (
            <TouchableOpacity
              key={operation.name}
              style={[
                styles.operationButton,
                loading === operation.name && styles.operationButtonLoading,
              ]}
              onPress={() => runOperation(operation)}
              disabled={loading !== null}
            >
              {loading === operation.name ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.operationButtonText}>{operation.name}</Text>
              )}
              <Text style={styles.operationDescription}>
                {operation.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userInfoCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userInfo: {
    fontSize: 16,
  },
  formContainer: {
    flex: 1,
  },
  formFields: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  roleSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    alignItems: "center",
    marginHorizontal: 4,
  },
  roleButtonSelected: {
    backgroundColor: "#2196f3",
    borderColor: "#2196f3",
  },
  roleButtonText: {
    fontSize: 14,
    color: "#666",
  },
  roleButtonTextSelected: {
    color: "white",
    fontWeight: "bold",
  },
  operationsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 16,
  },
  operationsList: {
    marginBottom: 24,
  },
  operationButton: {
    backgroundColor: "#2196f3",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  operationButtonLoading: {
    backgroundColor: "#90caf9",
  },
  operationButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  operationDescription: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  resultContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#4caf50",
  },
  resultData: {
    maxHeight: 200,
    backgroundColor: "#f5f5f7",
    padding: 8,
    borderRadius: 4,
  },
  errorContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
