import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  Bell,
  Mail,
  MessageSquare,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  CreditCard,
  Star,
  Database,
} from "lucide-react-native";
import { useAuth } from "../../lib/auth";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { signOut } = useAuth();
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
  });

  // Function to handle notification toggle
  const handleToggle = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

    // In a real app, you would save this to user preferences in the database
    Alert.alert(
      "Preference Updated",
      `${key} have been ${!notificationPrefs[key] ? "enabled" : "disabled"}.`,
      [{ text: "OK" }]
    );
  };

  // Handle user logout - Enhanced with more robust techniques
  const handleLogout = async () => {
    console.log("handleLogout function called - starting logout process");
    setLoading(true);
    try {
      // Clear localStorage and sessionStorage for web platform
      if (Platform.OS === "web" && typeof window !== "undefined") {
        console.log("Clearing web storage for Supabase and auth items");
        try {
          // Clear all Supabase and auth related items from localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes("supabase") || key.includes("auth"))) {
              console.log(`Removing localStorage item: ${key}`);
              localStorage.removeItem(key);
            }
          }

          // Also clear session storage
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes("supabase") || key.includes("auth"))) {
              console.log(`Removing sessionStorage item: ${key}`);
              sessionStorage.removeItem(key);
            }
          }
          console.log("Web storage cleared successfully");
        } catch (e) {
          console.error("Error clearing web storage:", e);
        }
      }

      console.log("Calling signOut from auth context");
      // Use the auth context's signOut method which will handle navigation
      await signOut();
      console.log("signOut completed successfully");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert(
        "Error",
        "Failed to logout. Try using the Force Logout page."
      );

      console.log("Attempting direct Supabase logout as fallback");
      // If regular logout fails, try a direct Supabase logout with global scope
      try {
        console.log("Calling supabase.auth.signOut with global scope");
        await supabase.auth.signOut({ scope: "global" });
        console.log("Direct Supabase logout successful");

        // Force navigation even if there was an initial error
        if (Platform.OS === "web") {
          console.log("Redirecting to home page (web)");
          window.location.href = "/";
        } else {
          console.log("Redirecting to home page (native)");
          router.replace("/");
        }
      } catch (retryError) {
        console.error("Retry logout failed:", retryError);

        // As a last resort, forcibly redirect
        console.log("Force redirecting as last resort");
        if (Platform.OS === "web") {
          window.location.href = "/";
        } else {
          router.replace("/");
        }
      }
    } finally {
      console.log("Logout process completed");
      setLoading(false);
    }
  };

  // Show logout confirmation
  const confirmLogout = () => {
    console.log("Logout button pressed - showing confirmation dialog");
    if (Platform.OS === "web") {
      // For web, we'll directly log out without confirmation as Alert may not work well
      console.log("Web platform detected, proceeding with logout");
      handleLogout();
      return;
    }

    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: handleLogout, style: "destructive" },
    ]);
  };

  // Delete test data function
  const deleteTestData = async () => {
    setDeleteLoading(true);
    const results: { [key: string]: number } = {
      reviews: 0,
      payment_methods: 0,
      bookings: 0,
      user_roles: 0,
      profiles: 0,
    };

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No authenticated user found");
      }

      // Delete reviews
      const { error: reviewsError, count: reviewsCount } = await supabase
        .from("reviews")
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Dummy ID to delete all

      if (reviewsError) throw reviewsError;
      results.reviews = reviewsCount || 0;

      // Delete payment methods
      const { error: paymentMethodsError, count: paymentMethodsCount } =
        await supabase
          .from("payment_methods")
          .delete({ count: "exact" })
          .neq("id", "00000000-0000-0000-0000-000000000000");

      if (paymentMethodsError) throw paymentMethodsError;
      results.payment_methods = paymentMethodsCount || 0;

      // Delete bookings
      const { error: bookingsError, count: bookingsCount } = await supabase
        .from("bookings")
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (bookingsError) throw bookingsError;
      results.bookings = bookingsCount || 0;

      // Get all profiles (excluding the current admin user)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, role")
        .neq("id", user.id); // Exclude current user

      if (profilesError) throw profilesError;

      // Delete user_roles for non-admin users
      for (const profile of profiles || []) {
        if (profile.role !== "admin") {
          const { error: userRoleError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", profile.id);

          if (userRoleError) throw userRoleError;
          results.user_roles++;
        }
      }

      // Delete profiles (excluding admins)
      const nonAdminProfiles = (profiles || []).filter(
        (p) => p.role !== "admin"
      );
      for (const profile of nonAdminProfiles) {
        const { error: profileDeleteError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", profile.id);

        if (profileDeleteError) throw profileDeleteError;
        results.profiles++;
      }

      // Format results message
      const message = Object.entries(results)
        .map(([table, count]) => `${table}: ${count} records deleted`)
        .join("\n");

      Alert.alert(
        "Test Data Deleted",
        `The following records were deleted:\n\n${message}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert(
        "Error Deleting Data",
        error.message || "An error occurred while deleting test data"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Confirm test data deletion
  const confirmDeleteTestData = () => {
    Alert.alert(
      "Delete Test Data",
      "This will permanently delete all test data including bookings, reviews, and non-admin users. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: deleteTestData, style: "destructive" },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        {/* Header */}
        <View className="px-4 py-6 bg-green-700">
          <Text className="text-2xl font-bold text-white">Settings</Text>
          <Text className="text-white opacity-80 mt-1">
            Manage your account and application settings
          </Text>
        </View>

        {/* Notifications Section */}
        <View className="p-4">
          <Text className="text-lg font-semibold mb-3">Notifications</Text>

          <View className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Mail size={18} color="#3b82f6" />
                </View>
                <View>
                  <Text className="font-medium text-gray-800">
                    Email Notifications
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Receive booking updates via email
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#22c55e" }}
                thumbColor="#ffffff"
                ios_backgroundColor="#d1d5db"
                onValueChange={() => handleToggle("emailNotifications")}
                value={notificationPrefs.emailNotifications}
              />
            </View>

            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                  <Bell size={18} color="#22c55e" />
                </View>
                <View>
                  <Text className="font-medium text-gray-800">
                    Push Notifications
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Receive alerts on your device
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#22c55e" }}
                thumbColor="#ffffff"
                ios_backgroundColor="#d1d5db"
                onValueChange={() => handleToggle("pushNotifications")}
                value={notificationPrefs.pushNotifications}
              />
            </View>

            <View className="flex-row justify-between items-center p-4">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <MessageSquare size={18} color="#8b5cf6" />
                </View>
                <View>
                  <Text className="font-medium text-gray-800">
                    Marketing Emails
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Receive promotional offers
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#22c55e" }}
                thumbColor="#ffffff"
                ios_backgroundColor="#d1d5db"
                onValueChange={() => handleToggle("marketingEmails")}
                value={notificationPrefs.marketingEmails}
              />
            </View>
          </View>
        </View>

        {/* Data Management Section */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-semibold mb-3">Data Management</Text>

          <View className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-gray-100"
              onPress={confirmDeleteTestData}
              disabled={deleteLoading}
            >
              <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
                <AlertTriangle size={18} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800">
                  Delete Test Data
                </Text>
                <Text className="text-gray-500 text-sm">
                  Remove all test bookings, reviews, and non-admin users
                </Text>
              </View>
              {deleteLoading ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <XCircle size={20} color="#ef4444" />
              )}
            </TouchableOpacity>

            {/* Supabase Test Hub Link */}
            <TouchableOpacity
              className="flex-row items-center p-4 border-b border-gray-100"
              onPress={() => router.push("/supabase-test")}
            >
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Database size={18} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800">
                  Supabase Test Hub
                </Text>
                <Text className="text-gray-500 text-sm">
                  Test and debug Supabase integration features
                </Text>
              </View>
              <CheckCircle size={20} color="#22c55e" />
            </TouchableOpacity>

            {/* Data Stats - Could be implemented to show counts */}
            <View className="p-4">
              <Text className="font-medium text-gray-800 mb-2">
                Database Statistics
              </Text>

              <View className="flex-row items-center mb-2">
                <User size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-600">Users (profiles)</Text>
              </View>

              <View className="flex-row items-center mb-2">
                <Calendar size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-600">Bookings</Text>
              </View>

              <View className="flex-row items-center mb-2">
                <CreditCard size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-600">Payment Methods</Text>
              </View>

              <View className="flex-row items-center">
                <Star size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-600">Reviews</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View className="px-4 pb-8">
          <Text className="text-lg font-semibold mb-3">Account</Text>

          <TouchableOpacity
            className="bg-white rounded-lg border border-gray-200 p-4 flex-row items-center"
            onPress={confirmLogout}
            disabled={loading}
          >
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3">
              <LogOut size={18} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-gray-800">Logout</Text>
              <Text className="text-gray-500 text-sm">
                Sign out of your account
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#22c55e" />
            ) : (
              <Text className="text-red-500 font-medium">Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
