import React from "react";
import { View, Text, SafeAreaView } from "react-native";
import { Stack } from "expo-router";
import BookingForm from "../components/customer/BookingForm";

interface BookingData {
  serviceType: string;
  date: string;
  time: string;
  address: string;
  isRecurring: boolean;
  recurringPlan?: string;
  paymentMethod: string;
}

export default function BookingScreen() {
  const handleBookingComplete = (bookingData: BookingData) => {
    // In a real app, this would submit the booking to the backend
    console.log("Booking completed:", bookingData);
    // Navigate to history or dashboard
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: "Book a Service",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#F9FAFB" },
        }}
      />

      <View className="flex-1">
        <BookingForm onComplete={handleBookingComplete} />
      </View>
    </SafeAreaView>
  );
}
