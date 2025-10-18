import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Star,
  ClipboardList,
  MessageSquare,
  Info,
  RotateCcw,
} from "lucide-react-native";
import {
  getBooking,
  checkRefundEligibility,
  getBookingRefundRequest,
  RefundRequest
} from "../../../lib/data";
import { format } from "date-fns";
import { useRealtimeBookings } from "../../../lib/hooks";
import RefundRequestModal from "../../components/customer/RefundRequestModal";

// Helper function to get status color and icon
const getStatusStyle = (status: string) => {
  switch (status) {
    case "scheduled":
    case "payment_confirmed":
      return {
        color: "text-green-600",
        bgColor: "bg-green-100",
        Icon: CheckCircle,
      };
    case "in_progress":
      return { color: "text-blue-600", bgColor: "bg-blue-100", Icon: Clock };
    case "pending":
    case "pending_payment":
    case "payment_processing":
      return {
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        Icon: AlertCircle,
      };
    case "completed":
      return {
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        Icon: CheckCircle,
      };
    case "cancelled":
    case "payment_failed":
    case "payment_refunded":
    case "refunded":
      return {
        color: "text-red-600",
        bgColor: "bg-red-100",
        Icon: AlertCircle,
      };
    default:
      return { color: "text-gray-600", bgColor: "bg-gray-100", Icon: Info };
  }
};

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null); // Use a proper type/interface later

  // Refund-related state
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundEligible, setRefundEligible] = useState(false);
  const [refundEligibilityReason, setRefundEligibilityReason] = useState<string | null>(null);
  const [existingRefundRequest, setExistingRefundRequest] = useState<RefundRequest | null>(null);

  // Real-time subscription for this specific booking
  const { bookings: realtimeBookings } = useRealtimeBookings({
    bookingId: id as string,
    enabled: !!id,
  });

  // Initial load
  useEffect(() => {
    if (!id) {
      setError("Booking ID not provided.");
      setLoading(false);
      return;
    }
    const loadBooking = async () => {
      try {
        if (!loading) setRefreshing(true);
        if (loading) setLoading(true);

        const data = await getBooking(id as string);
        if (!data) {
          throw new Error("Booking not found.");
        }
        setBooking(data);
        console.log("Booking data loaded:", data);
      } catch (err: any) {
        console.error("Error loading booking details:", err);
        setError(err.message || "Failed to load booking details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadBooking();
  }, [id]);

  // Update booking when real-time changes occur
  useEffect(() => {
    if (realtimeBookings.length > 0 && realtimeBookings[0].id === id) {
      console.log("Real-time update received for booking:", realtimeBookings[0]);
      setBooking(realtimeBookings[0]);
    }
  }, [realtimeBookings, id]);

  // Check refund eligibility and existing refund request
  useEffect(() => {
    if (!booking?.id) return;

    const checkRefundStatus = async () => {
      try {
        // Check eligibility
        const eligibility = await checkRefundEligibility(booking.id);
        setRefundEligible(eligibility.eligible);
        setRefundEligibilityReason(eligibility.reason || null);

        // Check for existing refund request
        const existingRequest = await getBookingRefundRequest(booking.id);
        setExistingRefundRequest(existingRequest);
      } catch (err) {
        console.error("Error checking refund status:", err);
      }
    };

    checkRefundStatus();
  }, [booking?.id]);

  const handleRefundRequestSuccess = async () => {
    // Refresh booking data and refund status
    try {
      const data = await getBooking(id as string);
      if (data) setBooking(data);

      const existingRequest = await getBookingRefundRequest(id as string);
      setExistingRefundRequest(existingRequest);
      setRefundEligible(false); // No longer eligible after request submitted
    } catch (err) {
      console.error("Error refreshing after refund request:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-gray-600 mt-2">Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
        <AlertCircle size={48} color="#ef4444" />
        <Text className="text-red-600 text-lg text-center mt-4 mb-4">
          {error || "Booking not found"}
        </Text>
        <TouchableOpacity
          className="bg-green-600 px-6 py-2 rounded-lg shadow"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.push("/(customer)/history")
          }
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Format data for display
  const displayDate = format(new Date(booking.scheduled_date), "MMMM d, yyyy");
  const displayTime = format(
    new Date(`2000-01-01T${booking.scheduled_time}`),
    "h:mm a"
  );
  const {
    color: statusColor,
    bgColor: statusBgColor,
    Icon: StatusIcon,
  } = getStatusStyle(booking.status);
  const statusText = booking.status.replace(/_/g, " ");

  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          size={18}
          color={i < rating ? "#facc15" : "#d1d5db"} // Tailwind yellow-400 and gray-300
          fill={i < rating ? "#facc15" : "none"}
          className="mr-1"
        />
      ));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: `Booking #${id.substring(0, 8)}...`,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.push("/(customer)/history")
              }
              className="ml-4 p-1" // Added padding for easier touch
            >
              <ArrowLeft size={24} color="#1f2937" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              try {
                setRefreshing(true);
                const data = await getBooking(id as string);
                if (data) setBooking(data);
              } catch (err) {
                console.error("Error refreshing:", err);
              } finally {
                setRefreshing(false);
              }
            }}
            colors={["#16a34a"]}
            tintColor="#16a34a"
          />
        }
      >
        {/* Service Details Card */}
        <View className="bg-white rounded-lg shadow-md m-4 p-4">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            {booking.service?.name || "Service"}
          </Text>
          {booking.service?.description && (
            <Text className="text-gray-600 mb-4">
              {booking.service.description}
            </Text>
          )}
          <View
            className={`flex-row items-center p-2 rounded-md ${statusBgColor} self-start`}
          >
            <StatusIcon size={16} className={statusColor} />
            <Text
              className={`ml-2 text-sm font-medium capitalize ${statusColor}`}
            >
              {statusText}
            </Text>
          </View>
        </View>

        {/* Schedule & Price Card */}
        <View className="bg-white rounded-lg shadow-md m-4 p-4">
          <View className="flex-row items-center mb-3">
            <Calendar size={18} color="#4b5563" className="mr-3" />
            <Text className="text-gray-700">{displayDate}</Text>
          </View>
          <View className="flex-row items-center mb-3">
            <Clock size={18} color="#4b5563" className="mr-3" />
            <Text className="text-gray-700">{displayTime}</Text>
          </View>
          <View className="flex-row items-center">
            <DollarSign size={18} color="#4b5563" className="mr-3" />
            <Text className="text-gray-700">
              ${booking.price?.toFixed(2) || "N/A"}
            </Text>
          </View>
          {booking.stripe_payment_intent_id && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-xs text-gray-500">
                Payment Ref: {booking.stripe_payment_intent_id}
              </Text>
            </View>
          )}
        </View>

        {/* Address Card */}
        {booking.address && (
          <View className="bg-white rounded-lg shadow-md m-4 p-4">
            <View className="flex-row items-center">
              <MapPin size={18} color="#4b5563" className="mr-3" />
              <Text className="text-gray-700 flex-1">{booking.address}</Text>
            </View>
          </View>
        )}

        {/* Technician Card (Conditional) */}
        {booking.technician &&
          (booking.status === "scheduled" ||
            booking.status === "in_progress" ||
            booking.status === "completed") && (
            <View className="bg-white rounded-lg shadow-md m-4 p-4">
              <Text className="text-base font-semibold text-gray-800 mb-3">
                Assigned Technician
              </Text>
              <View className="flex-row items-center">
                {booking.technician.avatar_url ? (
                  <Image
                    source={{ uri: booking.technician.avatar_url }}
                    className="w-10 h-10 rounded-full mr-3 bg-gray-200"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full mr-3 bg-gray-200 items-center justify-center">
                    <User size={20} color="#6b7280" />
                  </View>
                )}
                <Text className="text-gray-700">
                  {booking.technician.first_name} {booking.technician.last_name}
                </Text>
              </View>
            </View>
          )}

        {/* Special Instructions Card (Conditional) */}
        {booking.notes && (
          <View className="bg-white rounded-lg shadow-md m-4 p-4">
            <View className="flex-row items-center mb-2">
              <MessageSquare size={18} color="#4b5563" className="mr-3" />
              <Text className="text-base font-semibold text-gray-800">
                Special Instructions
              </Text>
            </View>
            <Text className="text-gray-600">
              {booking.notes
                .replace(
                  /Payment Intent pi_\w+ created with status: \w+. Requires client confirmation./g,
                  ""
                )
                .trim()}
            </Text>
          </View>
        )}

        {/* Review Card (Conditional) */}
        {booking.status === "completed" && booking.review && (
          <View className="bg-white rounded-lg shadow-md m-4 p-4">
            <Text className="text-base font-semibold text-gray-800 mb-2">
              Your Review
            </Text>
            <View className="flex-row">
              {renderStars(booking.review.rating)}
            </View>
            {booking.review.comment && (
              <Text className="text-gray-600 mt-2">
                {booking.review.comment}
              </Text>
            )}
          </View>
        )}

        {/* Refund Status Tracker Card (Conditional) */}
        {existingRefundRequest && (
          <View className="bg-white rounded-lg shadow-md m-4 p-4">
            <View className="flex-row items-center mb-3">
              <RotateCcw size={18} color="#4b5563" className="mr-2" />
              <Text className="text-base font-semibold text-gray-800">
                Refund Request
              </Text>
            </View>

            {/* Status Badge */}
            <View
              className={`flex-row items-center p-2 rounded-md mb-3 ${
                existingRefundRequest.status === "approved"
                  ? "bg-green-100"
                  : existingRefundRequest.status === "rejected"
                  ? "bg-red-100"
                  : "bg-yellow-100"
              } self-start`}
            >
              {existingRefundRequest.status === "approved" ? (
                <CheckCircle size={16} color="#16a34a" />
              ) : existingRefundRequest.status === "rejected" ? (
                <AlertCircle size={16} color="#dc2626" />
              ) : (
                <Clock size={16} color="#ca8a04" />
              )}
              <Text
                className={`ml-2 text-sm font-medium capitalize ${
                  existingRefundRequest.status === "approved"
                    ? "text-green-600"
                    : existingRefundRequest.status === "rejected"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {existingRefundRequest.status === "pending"
                  ? "Under Review"
                  : existingRefundRequest.status}
              </Text>
            </View>

            {/* Request Details */}
            <View className="mb-2">
              <Text className="text-xs text-gray-500 mb-1">Requested Amount:</Text>
              <Text className="text-gray-700 font-medium">
                ${existingRefundRequest.requested_amount.toFixed(2)}
              </Text>
            </View>

            {existingRefundRequest.approved_amount && (
              <View className="mb-2">
                <Text className="text-xs text-gray-500 mb-1">Approved Amount:</Text>
                <Text className="text-green-700 font-medium">
                  ${existingRefundRequest.approved_amount.toFixed(2)}
                </Text>
              </View>
            )}

            <View className="mb-2">
              <Text className="text-xs text-gray-500 mb-1">Reason:</Text>
              <Text className="text-gray-700">{existingRefundRequest.reason}</Text>
            </View>

            {existingRefundRequest.admin_notes && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-xs text-gray-500 mb-1">Admin Response:</Text>
                <Text className="text-gray-700">{existingRefundRequest.admin_notes}</Text>
              </View>
            )}

            <View className="mt-3">
              <Text className="text-xs text-gray-500">
                Submitted on {format(new Date(existingRefundRequest.requested_at), "MMM d, yyyy 'at' h:mm a")}
              </Text>
              {existingRefundRequest.reviewed_at && (
                <Text className="text-xs text-gray-500 mt-1">
                  Reviewed on {format(new Date(existingRefundRequest.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Request Refund Button (Conditional) */}
        {refundEligible && !existingRefundRequest && (
          <View className="m-4">
            <TouchableOpacity
              onPress={() => setRefundModalVisible(true)}
              className="bg-red-500 py-3 rounded-lg flex-row items-center justify-center"
            >
              <RotateCcw size={18} color="white" className="mr-2" />
              <Text className="text-white font-semibold">Request Refund</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Refund Request Modal */}
      <RefundRequestModal
        visible={refundModalVisible}
        onClose={() => setRefundModalVisible(false)}
        booking={booking}
        onSuccess={handleRefundRequestSuccess}
      />
    </SafeAreaView>
  );
}
