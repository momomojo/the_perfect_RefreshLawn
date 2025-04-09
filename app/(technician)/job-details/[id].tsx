import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { ArrowLeft, MapPin, AlertCircle } from "lucide-react-native";
import JobDetail from "../../components/technician/JobDetail";
import JobStatusUpdater from "../../components/technician/JobStatusUpdater";
import { getBooking, updateBookingStatus } from "../../../lib/data";
import { format } from "date-fns";
import { handleApiError } from "../../../lib/errors";

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<
    "pending" | "scheduled" | "in_progress" | "completed" | "cancelled"
  >("scheduled");

  useEffect(() => {
    if (!id) return;

    const fetchBookingDetails = async () => {
      setError(null); // Clear previous errors
      try {
        setLoading(true);
        const booking = await getBooking(id as string);

        setCurrentStatus(booking.status as any);

        // Format the data for the JobDetail component
        setJobData({
          jobId: booking.id,
          customerName: `${booking.customer?.first_name} ${booking.customer?.last_name}`,
          customerPhone: booking.customer?.phone || "",
          customerEmail: booking.customer?.email || "",
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
          propertySize: "Not specified", // This might need to come from another source
          specialInstructions: booking.notes || "",
          propertyImage:
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80", // Default image
          status: booking.status,
        });
      } catch (err: any) {
        // Use central handler
        const errorResult = handleApiError(err);
        setError(errorResult.error);
        console.error(
          "Error fetching booking details:",
          err,
          `(Code: ${errorResult.code})`
        ); // Keep detailed log
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id]);

  const handleStatusUpdate = async (status: string, data?: any) => {
    setError(null); // Clear previous errors
    try {
      // Update the status in the database
      await updateBookingStatus(id as string, status as any);

      // Update local state
      setCurrentStatus(status as any);

      // Update job data
      if (jobData) {
        setJobData({
          ...jobData,
          status,
        });
      }

      console.log("Status updated to:", status, data);

      // If job is completed, navigate back to the jobs list after a delay
      if (status === "completed") {
        setTimeout(() => {
          router.push("/(technician)/jobs");
        }, 1500);
      }
    } catch (err: any) {
      // Use central handler
      const errorResult = handleApiError(err);
      setError(errorResult.error); // Set error state to display it
      console.error(
        "Error updating booking status:",
        err,
        `(Code: ${errorResult.code})`
      ); // Keep detailed log
      // Optionally show an Alert or rely on the error state being displayed
      // Alert.alert("Update Failed", errorResult.error);
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
          {error || "Job not found or failed to load"}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
          onPress={error ? fetchBookingDetails : () => router.back()}
        >
          <Text className="text-white font-medium">
            {error ? "Retry" : "Go Back"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerTitle: `Job #${id.substring(0, 8)}...`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Display error from status update if any */}
          {error && (
            <View className="p-3 mb-4 bg-red-100 border border-red-200 rounded-md">
              <Text className="text-red-700">Error: {error}</Text>
            </View>
          )}
          {/* Navigation indicator */}
          <View className="flex-row items-center mb-4">
            <MapPin size={16} color="#6b7280" />
            <Text className="text-gray-500 ml-1">Job Details</Text>
          </View>

          {/* Job Details Component */}
          <JobDetail {...jobData} />

          {/* Job Status Updater Component */}
          <View className="my-6">
            <JobStatusUpdater
              jobId={id as string}
              currentStatus={currentStatus}
              onStatusUpdate={handleStatusUpdate}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
