import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { Stack } from "expo-router";
import UserManagement from "../components/admin/UserManagement";

export default function UsersScreen() {
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
          onAddUser={() => console.log("Add user clicked")}
          onEditUser={(user) => console.log("Edit user", user)}
          onDeleteUser={(userId) => console.log("Delete user", userId)}
          onToggleUserStatus={(userId, newStatus) =>
            console.log("Toggle status", userId, newStatus)
          }
        />
      </View>
    </SafeAreaView>
  );
}
