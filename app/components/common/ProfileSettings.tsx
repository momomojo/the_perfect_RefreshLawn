import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import {
  ChevronRight,
  CreditCard,
  Bell,
  MapPin,
  User,
  Mail,
  Phone,
  Save,
  Plus,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../../../lib/auth";

interface ProfileSettingsProps {
  userType?: "customer" | "technician" | "admin";
  userData?: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    notificationPreferences?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    paymentMethods?: Array<{
      id: string;
      type: string;
      last4: string;
      expiryDate: string;
      isDefault: boolean;
    }>;
  };
}

const ProfileSettings = ({
  userType = "customer",
  userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Anytown, USA",
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
    },
    paymentMethods: [
      {
        id: "1",
        type: "Visa",
        last4: "4242",
        expiryDate: "04/25",
        isDefault: true,
      },
      {
        id: "2",
        type: "Mastercard",
        last4: "5678",
        expiryDate: "08/26",
        isDefault: false,
      },
    ],
  },
}: ProfileSettingsProps) => {
  const [formData, setFormData] = useState(userData);
  const [isEditing, setIsEditing] = useState(false);
  const { signOut, loading } = useAuth();
  const [loadingState, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationToggle = (type: "email" | "push" | "sms") => {
    setFormData((prev) => {
      // Ensure notificationPreferences exists with default values
      const currentPreferences = prev.notificationPreferences || {
        email: false,
        push: false,
        sms: false,
      };

      return {
        ...prev,
        notificationPreferences: {
          ...currentPreferences,
          [type]: !currentPreferences[type],
        },
      };
    });
  };

  const handleSaveProfile = () => {
    // Here you would typically save the profile data to your backend
    console.log("Saving profile data:", formData);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    console.log("Logout button pressed");
    try {
      setLoading(true);

      // Try to sign out
      await signOut();
      console.log("Sign out API call completed");

      // No need for additional setTimeout or checks
      // The auth context will handle the navigation once signed out
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Profile Header */}
        <View className="items-center mb-6 pt-4">
          <View className="w-24 h-24 rounded-full bg-gray-200 mb-2 items-center justify-center">
            <User size={40} color="#6b7280" />
          </View>
          <Text className="text-xl font-bold">{formData.name}</Text>
          <Text className="text-gray-500">
            {userType.charAt(0).toUpperCase() + userType.slice(1)}
          </Text>
        </View>

        {/* Personal Information Section */}
        <View className="mb-6 bg-gray-50 rounded-xl p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold">Personal Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text className="text-blue-500">
                {isEditing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View className="space-y-1">
              <Text className="text-gray-500 text-sm">Full Name</Text>
              {isEditing ? (
                <TextInput
                  className="border border-gray-300 rounded-md p-2 bg-white"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange("name", value)}
                />
              ) : (
                <View className="flex-row items-center">
                  <User size={16} color="#6b7280" />
                  <Text className="ml-2">{formData.name}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-gray-500 text-sm">Email</Text>
              {isEditing ? (
                <TextInput
                  className="border border-gray-300 rounded-md p-2 bg-white"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  keyboardType="email-address"
                />
              ) : (
                <View className="flex-row items-center">
                  <Mail size={16} color="#6b7280" />
                  <Text className="ml-2">{formData.email}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-gray-500 text-sm">Phone</Text>
              {isEditing ? (
                <TextInput
                  className="border border-gray-300 rounded-md p-2 bg-white"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange("phone", value)}
                  keyboardType="phone-pad"
                />
              ) : (
                <View className="flex-row items-center">
                  <Phone size={16} color="#6b7280" />
                  <Text className="ml-2">{formData.phone}</Text>
                </View>
              )}
            </View>

            {userType === "customer" && (
              <View className="space-y-1">
                <Text className="text-gray-500 text-sm">Address</Text>
                {isEditing ? (
                  <TextInput
                    className="border border-gray-300 rounded-md p-2 bg-white"
                    value={formData.address}
                    onChangeText={(value) =>
                      handleInputChange("address", value)
                    }
                    multiline
                  />
                ) : (
                  <View className="flex-row items-center">
                    <MapPin size={16} color="#6b7280" />
                    <Text className="ml-2">{formData.address}</Text>
                  </View>
                )}
              </View>
            )}

            {isEditing && (
              <TouchableOpacity
                className="bg-green-500 p-3 rounded-md items-center mt-2"
                onPress={handleSaveProfile}
              >
                <View className="flex-row items-center">
                  <Save size={16} color="#ffffff" />
                  <Text className="text-white font-semibold ml-2">
                    Save Changes
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification Preferences */}
        <View className="mb-6 bg-gray-50 rounded-xl p-4">
          <Text className="text-lg font-semibold mb-4">
            Notification Preferences
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" />
                <Text className="ml-2">Email Notifications</Text>
              </View>
              <Switch
                value={formData.notificationPreferences?.email}
                onValueChange={() => handleNotificationToggle("email")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" />
                <Text className="ml-2">Push Notifications</Text>
              </View>
              <Switch
                value={formData.notificationPreferences?.push}
                onValueChange={() => handleNotificationToggle("push")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Bell size={16} color="#6b7280" />
                <Text className="ml-2">SMS Notifications</Text>
              </View>
              <Switch
                value={formData.notificationPreferences?.sms}
                onValueChange={() => handleNotificationToggle("sms")}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
              />
            </View>
          </View>
        </View>

        {/* Payment Methods (Customer only) */}
        {userType === "customer" &&
          formData.paymentMethods &&
          formData.paymentMethods.length > 0 && (
            <View className="mb-6 bg-gray-50 rounded-xl p-4">
              <Text className="text-lg font-semibold mb-4">
                Payment Methods
              </Text>

              {formData.paymentMethods?.map((method) => (
                <View
                  key={method.id}
                  className="flex-row justify-between items-center p-3 bg-white rounded-md mb-2 border border-gray-100"
                >
                  <View className="flex-row items-center">
                    <CreditCard size={20} color="#6b7280" />
                    <View className="ml-3">
                      <Text>
                        {method.type} •••• {method.last4}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Expires {method.expiryDate}
                      </Text>
                    </View>
                  </View>
                  {method.isDefault && (
                    <View className="bg-blue-100 px-2 py-1 rounded">
                      <Text className="text-xs text-blue-700">Default</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color="#9ca3af" />
                </View>
              ))}

              <TouchableOpacity className="flex-row items-center justify-center p-3 bg-gray-100 rounded-md mt-2">
                <Plus size={16} color="#6b7280" />
                <Text className="ml-2 text-gray-700">Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Account Settings */}
        <View className="mb-6 bg-gray-50 rounded-xl p-4">
          <Text className="text-lg font-semibold mb-4">Account Settings</Text>

          <TouchableOpacity className="flex-row justify-between items-center p-3 bg-white rounded-md mb-2">
            <Text>Change Password</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row justify-between items-center p-3 bg-white rounded-md mb-2">
            <Text>Privacy Settings</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row justify-between items-center p-3 bg-white rounded-md"
            onPress={handleLogout}
            disabled={loadingState}
          >
            <View className="flex-row items-center">
              <LogOut size={16} color="#ef4444" />
              <Text className="ml-2 text-red-500">
                {loadingState ? "Logging out..." : "Log Out"}
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

export default ProfileSettings;
