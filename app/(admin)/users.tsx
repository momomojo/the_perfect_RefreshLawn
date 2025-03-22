import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import UserManagement from "../components/admin/UserManagement";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

export default function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get auth users data using the function instead of direct join
      const { data: authUsers, error: authUsersError } = await supabase.rpc(
        "get_users_with_email"
      );

      if (authUsersError) throw authUsersError;

      // Map auth data to profiles
      const authUsersMap = {};
      authUsers.forEach((user) => {
        authUsersMap[user.id] = user;
      });

      // Format profiles for UserManagement component
      const formattedUsers = profiles.map((profile) => ({
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`,
        email: authUsersMap[profile.id]?.email || "No email",
        role: profile.role,
        status: authUsersMap[profile.id]?.banned_until ? "inactive" : "active",
        dateJoined: profile.created_at
          ? format(new Date(profile.created_at), "yyyy-MM-dd")
          : "Unknown",
        avatar:
          profile.profile_image_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`,
      }));

      setUsers(formattedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    Alert.alert(
      "Add New User",
      "This would open a form to add a new user. In production, this would invite a user via email.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => console.log("Add user dialog acknowledged"),
        },
      ]
    );
  };

  const handleEditUser = async (user) => {
    Alert.alert(
      "Edit User",
      `This would open a form to edit ${user.name}. In production, you would be able to modify their profile details.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => console.log("Edit user dialog acknowledged"),
        },
      ]
    );
  };

  const handleDeleteUser = async (userId) => {
    Alert.alert(
      "Delete User",
      "Are you sure you want to delete this user? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // In a real implementation, you would handle auth deletion as well
              const { error } = await supabase
                .from("profiles")
                .delete()
                .eq("id", userId);

              if (error) throw error;

              Alert.alert("Success", "User deleted successfully");
              // Refresh user list
              fetchUsers();
            } catch (err) {
              console.error("Error deleting user:", err);
              Alert.alert("Error", err.message || "Failed to delete user");
            }
          },
        },
      ]
    );
  };

  const handleToggleUserStatus = async (userId, newStatus) => {
    try {
      // In production, we would also set the banned status in auth users
      const { error } = await supabase
        .from("profiles")
        .update({ active: newStatus === "active" })
        .eq("id", userId);

      if (error) throw error;

      Alert.alert("Success", `User status updated to ${newStatus}`);
      // Refresh user list
      fetchUsers();
    } catch (err) {
      console.error("Error updating user status:", err);
      Alert.alert("Error", err.message || "Failed to update user status");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-3">Loading users...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500 text-center mb-4">
          Error loading users: {error}
        </Text>
        <Text className="text-blue-500" onPress={fetchUsers}>
          Retry
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "User Management",
          headerShown: true,
        }}
      />
      <View className="flex-1">
        <UserManagement
          users={users}
          onAddUser={handleAddUser}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          onToggleUserStatus={handleToggleUserStatus}
        />
      </View>
    </SafeAreaView>
  );
}
