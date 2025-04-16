import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../../lib/auth";
import ProfileSettings from "../components/common/ProfileSettings";
import { supabase } from "../../lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  use_service_address_for_billing: boolean;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

const CustomerProfileScreen = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.error("No authenticated user found");
        return;
      }
      
      // Fetch the user profile data from Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, 
          first_name, 
          last_name, 
          phone, 
          address, 
          city, 
          state, 
          zip_code,
          billing_address_line1,
          billing_address_line2,
          billing_city,
          billing_state,
          billing_postal_code,
          billing_country,
          use_service_address_for_billing,
          notification_preferences
        `)
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        Alert.alert("Error", "Failed to load profile data");
        return;
      }

      // Format the data for the ProfileSettings component
      const formattedData: ProfileData = {
        name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : "Not set",
        email: user.email || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip_code: data.zip_code || "",
        billing_address_line1: data.billing_address_line1 || "",
        billing_address_line2: data.billing_address_line2 || "",
        billing_city: data.billing_city || "",
        billing_state: data.billing_state || "",
        billing_postal_code: data.billing_postal_code || "",
        billing_country: data.billing_country || "US",
        use_service_address_for_billing: data.use_service_address_for_billing !== false, // Default to true if null
        notificationPreferences: data.notification_preferences || {
          email: true,
          push: true,
          sms: false,
        },
      };

      setProfileData(formattedData);
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedData: ProfileData) => {
    try {
      setLoading(true);

      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      // Parse name into first and last name
      let firstName = "";
      let lastName = "";
      if (updatedData.name) {
        const nameParts = updatedData.name.trim().split(" ");
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }

      // Prepare data for the profile update
      const profileUpdateData = {
        first_name: firstName,
        last_name: lastName,
        phone: updatedData.phone || null,
        address: updatedData.address || null,
        city: updatedData.city || null,
        state: updatedData.state || null,
        zip_code: updatedData.zip_code || null,
        billing_address_line1: updatedData.billing_address_line1 || null,
        billing_address_line2: updatedData.billing_address_line2 || null,
        billing_city: updatedData.billing_city || null,
        billing_state: updatedData.billing_state || null,
        billing_postal_code: updatedData.billing_postal_code || null,
        billing_country: updatedData.billing_country || "US",
        use_service_address_for_billing: updatedData.use_service_address_for_billing,
        notification_preferences: updatedData.notificationPreferences,
        updated_at: new Date().toISOString(),
      };

      // Update the profile in Supabase
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdateData)
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        Alert.alert("Error", "Failed to update profile. Please try again.");
        return;
      }

      // Refresh profile data
      fetchUserProfile();
      
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Unexpected error updating profile:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profileData) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-gray-600">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Removed duplicate header */}
      {profileData && (
        <ProfileSettings
          userType="customer"
          userData={profileData}
          onUpdateProfile={handleUpdateProfile}
        />
      )}
    </SafeAreaView>
  );
};

export default CustomerProfileScreen;
