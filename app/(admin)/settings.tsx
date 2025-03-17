import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  ChevronRight,
  LogOut,
  Lock,
  Sliders,
  Trash2,
  AlertTriangle,
} from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const AdminSettings = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteTestDataLoading, setDeleteTestDataLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<null | {
    status: string;
    customers_deleted: number;
    technicians_deleted: number;
    bookings_deleted: number;
    payment_methods_deleted: number;
    reviews_deleted: number;
  }>(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailAlerts: true,
    systemUpdates: true,
    newUserSignups: true,
    paymentAlerts: true,
  });

  const handleToggleNotification = (
    key: keyof typeof notificationPreferences
  ) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = async () => {
    console.log("Admin logout button pressed");
    try {
      setLoading(true);

      // Call signOut method from auth context
      await signOut();
      console.log("Sign out API call completed");

      // The auth context will handle the navigation once signed out
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllTestData = async () => {
    // Show confirmation alert first
    Alert.alert(
      "Delete Test Data",
      "This will permanently delete ALL customers and providers (technicians) along with their related data. This action cannot be undone. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All Test Data",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleteTestDataLoading(true);
              setDeleteResult(null);

              // Get admin user IDs to exclude from deletion
              const { data: adminData, error: adminError } = await supabase
                .from("user_roles")
                .select("user_id")
                .eq("role", "admin");

              if (adminError) throw adminError;

              const adminIds = adminData.map((admin) => admin.user_id);

              // Keep track of deletion counts
              let reviewsDeleted = 0;
              let paymentMethodsDeleted = 0;
              let bookingsDeleted = 0;
              let customersDeleted = 0;
              let techniciansDeleted = 0;

              // Start with related data - reviews
              const { data: reviewData, error: reviewError } = await supabase
                .from("reviews")
                .delete()
                .or(
                  `customer_id.not.in.(${adminIds.join(
                    ","
                  )}),technician_id.not.in.(${adminIds.join(",")})`
                )
                .select("id");

              if (reviewError) throw reviewError;
              reviewsDeleted = reviewData?.length || 0;

              // Delete payment methods
              const { data: paymentData, error: paymentError } = await supabase
                .from("payment_methods")
                .delete()
                .not("customer_id", "in", `(${adminIds.join(",")})`)
                .select("id");

              if (paymentError) throw paymentError;
              paymentMethodsDeleted = paymentData?.length || 0;

              // Delete bookings
              const { data: bookingData, error: bookingError } = await supabase
                .from("bookings")
                .delete()
                .or(
                  `customer_id.not.in.(${adminIds.join(
                    ","
                  )}),technician_id.not.in.(${adminIds.join(",")})`
                )
                .select("id");

              if (bookingError) throw bookingError;
              bookingsDeleted = bookingData?.length || 0;

              // Delete customer user_roles
              await supabase
                .from("user_roles")
                .delete()
                .eq("role", "customer")
                .not("user_id", "in", `(${adminIds.join(",")})`);

              // Delete technician user_roles
              await supabase
                .from("user_roles")
                .delete()
                .eq("role", "technician")
                .not("user_id", "in", `(${adminIds.join(",")})`);

              // Delete customer profiles and count
              const { data: customerData, error: customerError } =
                await supabase
                  .from("profiles")
                  .delete()
                  .eq("role", "customer")
                  .not("id", "in", `(${adminIds.join(",")})`)
                  .select("id");

              if (customerError) throw customerError;
              customersDeleted = customerData?.length || 0;

              // Delete technician profiles and count
              const { data: technicianData, error: technicianError } =
                await supabase
                  .from("profiles")
                  .delete()
                  .eq("role", "technician")
                  .not("id", "in", `(${adminIds.join(",")})`)
                  .select("id");

              if (technicianError) throw technicianError;
              techniciansDeleted = technicianData?.length || 0;

              // Format results similar to what the database function would return
              const result = {
                status: "SUCCESS: All customers and providers deleted",
                customers_deleted: customersDeleted,
                technicians_deleted: techniciansDeleted,
                bookings_deleted: bookingsDeleted,
                payment_methods_deleted: paymentMethodsDeleted,
                reviews_deleted: reviewsDeleted,
              };

              setDeleteResult(result);

              Alert.alert(
                "Success",
                `Deleted ${result.customers_deleted} customers, ${result.technicians_deleted} technicians, ${result.bookings_deleted} bookings, ${result.payment_methods_deleted} payment methods, and ${result.reviews_deleted} reviews.`
              );
            } catch (error: any) {
              console.error("Error deleting test data:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to delete test data. Try again later."
              );
            } finally {
              setDeleteTestDataLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Admin Profile Header */}
        <View className="items-center mb-6 pt-4">
          <View className="w-24 h-24 rounded-full bg-purple-100 mb-2 items-center justify-center">
            <User size={40} color="#8B5CF6" />
          </View>
          <Text className="text-xl font-bold">Admin User</Text>
          <Text className="text-gray-500">{user?.email}</Text>
          <View className="bg-purple-100 px-3 py-1 rounded-full mt-2">
            <Text className="text-purple-700 font-semibold">Administrator</Text>
          </View>
        </View>

        {/* System Settings */}
        <View className="mb-6 bg-gray-50 rounded-xl p-4">
          <Text className="text-lg font-semibold mb-4">System Settings</Text>

          <TouchableOpacity className="flex-row justify-between items-center p-3 bg-white rounded-md mb-2">
            <View className="flex-row items-center">
              <Sliders size={18} color="#6b7280" className="mr-3" />
              <Text>System Configuration</Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row justify-between items-center p-3 bg-white rounded-md mb-2">
            <View className="flex-row items-center">
              <Shield size={18} color="#6b7280" className="mr-3" />
              <Text>Security Settings</Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Test Data Management */}
        <View className="mb-6 bg-red-50 rounded-xl p-4">
          <Text className="text-lg font-semibold mb-4 text-red-700">
            Test Data Management
          </Text>

          <TouchableOpacity
            className={`flex-row justify-between items-center p-3 ${
              deleteTestDataLoading ? "bg-red-100" : "bg-white"
            } rounded-md mb-2`}
            onPress={handleDeleteAllTestData}
            disabled={deleteTestDataLoading}
          >
            <View className="flex-row items-center">
              <Trash2 size={18} color="#ef4444" className="mr-3" />
              <View>
                <Text className="text-red-600 font-medium">
                  Delete All Customers & Providers
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Deletes all non-admin users and their related data
                </Text>
              </View>
            </View>
            {deleteTestDataLoading ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <AlertTriangle size={16} color="#ef4444" />
            )}
          </TouchableOpacity>

          {deleteResult && (
            <View className="bg-white p-3 rounded-md mt-2">
              <Text className="font-medium mb-1">
                {deleteResult.status.startsWith("ERROR")
                  ? "Error:"
                  : "Results:"}
              </Text>
              {!deleteResult.status.startsWith("ERROR") && (
                <View className="space-y-1">
                  <Text className="text-sm">
                    • Customers deleted:{" "}
                    <Text className="font-medium">
                      {deleteResult.customers_deleted}
                    </Text>
                  </Text>
                  <Text className="text-sm">
                    • Technicians deleted:{" "}
                    <Text className="font-medium">
                      {deleteResult.technicians_deleted}
                    </Text>
                  </Text>
                  <Text className="text-sm">
                    • Bookings deleted:{" "}
                    <Text className="font-medium">
                      {deleteResult.bookings_deleted}
                    </Text>
                  </Text>
                  <Text className="text-sm">
                    • Payment methods deleted:{" "}
                    <Text className="font-medium">
                      {deleteResult.payment_methods_deleted}
                    </Text>
                  </Text>
                  <Text className="text-sm">
                    • Reviews deleted:{" "}
                    <Text className="font-medium">
                      {deleteResult.reviews_deleted}
                    </Text>
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Notification Preferences */}
        <View className="mb-6 bg-gray-50 rounded-xl p-4">
          <Text className="text-lg font-semibold mb-4">
            Notification Preferences
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-2">
              <View className="flex-row items-center">
                <Bell size={18} color="#6b7280" className="mr-3" />
                <Text>Email Alerts</Text>
              </View>
              <Switch
                value={notificationPreferences.emailAlerts}
                onValueChange={() => handleToggleNotification("emailAlerts")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-between items-center py-2">
              <View className="flex-row items-center">
                <Bell size={18} color="#6b7280" className="mr-3" />
                <Text>System Updates</Text>
              </View>
              <Switch
                value={notificationPreferences.systemUpdates}
                onValueChange={() => handleToggleNotification("systemUpdates")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-between items-center py-2">
              <View className="flex-row items-center">
                <Bell size={18} color="#6b7280" className="mr-3" />
                <Text>New User Signups</Text>
              </View>
              <Switch
                value={notificationPreferences.newUserSignups}
                onValueChange={() => handleToggleNotification("newUserSignups")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-between items-center py-2">
              <View className="flex-row items-center">
                <Bell size={18} color="#6b7280" className="mr-3" />
                <Text>Payment Alerts</Text>
              </View>
              <Switch
                value={notificationPreferences.paymentAlerts}
                onValueChange={() => handleToggleNotification("paymentAlerts")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View className="mb-6 bg-gray-50 rounded-xl p-4">
          <Text className="text-lg font-semibold mb-4">Account Settings</Text>

          <TouchableOpacity className="flex-row justify-between items-center p-3 bg-white rounded-md mb-2">
            <View className="flex-row items-center">
              <Lock size={18} color="#6b7280" className="mr-3" />
              <Text>Change Password</Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row justify-between items-center p-3 bg-white rounded-md"
            onPress={handleLogout}
            disabled={loading}
          >
            <View className="flex-row items-center">
              <LogOut size={18} color="#ef4444" className="mr-3" />
              <Text className="text-red-500">
                {loading ? "Logging out..." : "Log Out"}
              </Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Add some bottom padding */}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
};

export default AdminSettings;
