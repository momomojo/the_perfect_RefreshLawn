import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import UserManagement from "../components/admin/UserManagement";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { showNotification } from "../../lib/notification";
import { useConfirmation } from "../../lib/confirmation";

type UserRole = "customer" | "technician" | "admin";

interface FormattedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  dateJoined: string;
  avatar?: string;
}

export default function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<FormattedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showConfirmation } = useConfirmation();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: authUsers, error: authUsersError } = (await supabase.rpc(
        "get_users_with_email"
      )) as { data: any[]; error: any };

      if (authUsersError) throw authUsersError;

      const authUsersMap: { [key: string]: any } = {};
      authUsers.forEach((user) => {
        authUsersMap[user.id] = user;
      });

      const formattedUsers: FormattedUser[] = profiles.map((profile) => ({
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
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Unknown error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    console.log("Add user dialog acknowledged");
  };

  const handleEditUser = async (user: FormattedUser) => {
    console.log("Edit user dialog acknowledged");
  };

  const handleDeleteUser = (userId: string) => {
    showConfirmation({
      title: "Confirm Delete",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", userId);

          if (error) throw error;
          fetchUsers();
        } catch (err: any) {
          console.error("Error deleting user:", err);
          showNotification({
            title: "Error",
            message: err.message || "Failed to delete user",
            type: "error",
          });
        }
      },
    });
  };

  const handleToggleUserStatus = (userId: string, newStatus: string) => {
    showConfirmation({
      title: `Confirm ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `Are you sure you want to ${newStatus} this user?`,
      confirmText: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const updateData = {
            banned_until: newStatus === "inactive" ? new Date().toISOString() : null,
          };

          const { error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", userId);

          if (error) throw error;
          fetchUsers();
        } catch (err: any) {
          console.error("Error updating user status:", err);
          showNotification({
            title: "Error",
            message: err.message || "Failed to update user status",
            type: "error",
          });
        }
      },
    });
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
