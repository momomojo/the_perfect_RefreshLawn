import { Stack } from "expo-router";

// This layout ensures all screens in the (admin_stack) group
// use the Stack navigator, providing headers and back buttons.
export default function AdminStackLayout() {
  // Disable the header for the layout's Stack navigator itself,
  // allowing individual screens to control their own headers.
  return <Stack screenOptions={{ headerShown: false }} />;
}
