import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import Constants from "expo-constants";

export default function SupabaseTestHub() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Supabase Integration Test Hub</Text>
        <Text style={styles.subtitle}>Test all Supabase features</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=auth-session")}
        >
          <Text style={styles.buttonText}>Test Session Management</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=auth-signup")}
        >
          <Text style={styles.buttonText}>Test User Registration</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=auth-login")}
        >
          <Text style={styles.buttonText}>Test User Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=db-profiles")}
        >
          <Text style={styles.buttonText}>Test Profiles Table</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=db-bookings")}
        >
          <Text style={styles.buttonText}>Test Bookings Table</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=db-services")}
        >
          <Text style={styles.buttonText}>Test Services Table</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real-time Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=realtime-bookings")}
        >
          <Text style={styles.buttonText}>Test Booking Subscriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=realtime-profiles")}
        >
          <Text style={styles.buttonText}>Test Profile Subscriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() =>
            router.push("/supabase-test?test=realtime-notifications")
          }
        >
          <Text style={styles.buttonText}>Test Notification System</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role-Based Access Tests</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=rbac-admin")}
        >
          <Text style={styles.buttonText}>Test Admin Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=rbac-technician")}
        >
          <Text style={styles.buttonText}>Test Technician Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => router.push("/supabase-test?test=rbac-customer")}
        >
          <Text style={styles.buttonText}>Test Customer Permissions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Connected to: {Constants.expoConfig?.extra?.supabaseUrl || "Supabase"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  testButton: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  footer: {
    marginVertical: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#666",
  },
});
