import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Button,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  AlertCircle,
  Camera,
  Upload,
} from "lucide-react-native";
import JobDetail from "../../components/technician/JobDetail";
import JobStatusUpdater from "../../components/technician/JobStatusUpdater";
import { getBooking, updateBookingStatus } from "../../../lib/data";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../lib/auth";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../../../lib/supabase";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { showNotification } from "../../../lib/notification";

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<
    "pending" | "scheduled" | "in_progress" | "completed" | "cancelled"
  >("scheduled");

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Sorry, we need camera roll permissions to make this work!"
          );
        }
      }
    })();

    if (!id) return;

    const fetchBookingDetails = async () => {
      try {
        console.log(
          `[JobDetailsScreen] fetchBookingDetails started for id: ${id}`
        );
        setLoading(true);
        console.log("[JobDetailsScreen] Calling getBooking...");
        const booking = await getBooking(id as string);
        console.log("[JobDetailsScreen] getBooking returned:", booking);

        if (!booking) {
          console.log("[JobDetailsScreen] Booking not found, setting error.");
          setError("Booking not found.");
          setLoading(false);
          return;
        }
        console.log("[JobDetailsScreen] Booking found, setting status...");
        setCurrentStatus(booking.status as any);
        console.log("[JobDetailsScreen] Setting job data...");
        setJobData({
          jobId: booking.id,
          customerName: `${booking.customer?.first_name} ${booking.customer?.last_name}`,
          customerPhone: booking.customer?.phone || "",
          address:
            booking.address ||
            (booking.customer?.address
              ? `${booking.customer.address}, ${booking.customer.city}, ${booking.customer.state} ${booking.customer.zip_code}`
              : ""),
          serviceType: booking.service?.name || "",
          scheduledDate: format(
            new Date(booking.scheduled_date),
            "MMMM d, yyyy"
          ),
          scheduledTime: format(
            new Date(`2000-01-01T${booking.scheduled_time}`),
            "h:mm a"
          ),
          estimatedDuration: booking.service?.duration_minutes
            ? `${booking.service.duration_minutes} minutes`
            : "Not specified",
          propertySize: "Not specified",
          specialInstructions: booking.notes || "",
          propertyImage:
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80",
          status: booking.status,
        });
        console.log("[JobDetailsScreen] Job data set.");
      } catch (err) {
        console.error("Error fetching booking details:", err);
        console.log(
          "[JobDetailsScreen] Error caught in fetchBookingDetails:",
          err
        );
        setError("Failed to load booking details");
      } finally {
        console.log(
          "[JobDetailsScreen] Entering finally block, setting loading to false."
        );
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [id]);

  const handleStatusUpdate = async (status: string, data?: any) => {
    try {
      if (!user || !user.id) {
        throw new Error("No authenticated user found.");
      }

      // Extract notes if status is completed
      const reportNotes = status === "completed" ? data?.notes : undefined;

      // Pass notes to the update function
      await updateBookingStatus(
        id as string,
        status as any,
        user.id,
        reportNotes
      );

      setCurrentStatus(status as any);
      if (jobData) {
        setJobData({
          ...jobData,
          status,
        });
      }

      if (status === "completed") {
        // Show success notification
        showNotification({
          title: "Job Completed Successfully",
          message: "Your job report has been submitted.",
          type: "success",
        });
        // Immediately redirect to the jobs list
        router.replace("/(technician)/jobs");
      } else {
        // Optional: Show notification for other status updates if needed
        showNotification({
          title: "Status Updated",
          message: `Job status changed to ${status}.`,
          type: "info",
        });
      }
    } catch (err) {
      console.error("Error updating booking status:", err);
      let errorMessage = "Failed to update job status. Please try again.";
      if (err instanceof Error) {
        errorMessage = `Failed to update job status: ${err.message}`;
      }
      Alert.alert("Error", errorMessage);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-gray-500 mt-2">Loading job details...</Text>
      </View>
    );
  }

  if (error || !jobData) {
    return (
      <View className="flex-1 bg-white justify-center items-center p-4">
        <AlertCircle size={40} color="#ef4444" />
        <Text className="text-red-500 text-center mt-2">
          {error || "Job not found"}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => router.push("/(technician)/jobs")}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerTitle: `Job #${id?.substring(0, 8)}...`,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push("/(technician)/jobs")}
              className="mr-4"
            >
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Navigation indicator */}
          <View className="flex-row items-center mb-4">
            <MapPin size={16} color="#6b7280" />
            <Text className="text-gray-500 ml-1">Job Details</Text>
          </View>
          {/* Job Details Component - Pass auth email */}
          <JobDetail {...jobData} customerAuthEmail={user?.email} />

          {/* Job Status Updater */}
          <JobStatusUpdater
            jobId={jobData.jobId}
            currentStatus={currentStatus}
            onStatusUpdate={handleStatusUpdate}
          />
        </View>
      </ScrollView>
    </View>
  );
}
