import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import SavedPropertiesManager from "../components/customer/SavedPropertiesManager";

export default function SavedPropertiesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Saved Properties",
          headerShown: true,
        }}
      />
      <SavedPropertiesManager />
    </SafeAreaView>
  );
}
