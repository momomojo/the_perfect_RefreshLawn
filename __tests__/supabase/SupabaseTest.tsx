import React from "react";
import { View, StyleSheet } from "react-native";
import SupabaseTestUI from "./SupabaseTestUI";

export default function SupabaseTest() {
  return (
    <View style={styles.container}>
      <SupabaseTestUI />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
});
