import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react-native";
import {
  getBooking,
  assignTechnician,
  updateBookingStatus,
  getTechnicians,
  Booking,
  Profile,
  BookingStatus, // <-- Import BookingStatus
  Service,
} from "../../../lib/data";
import { Image } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

// Augment Booking type to include report_notes for TS
// (If Booking already has it, this is a no-op)
type BookingWithReport = Booking & {
  report_notes?: string | null;
  beforePhotos?: any[];
  afterPhotos?: any[];
};
import { supabase } from "../../../lib/supabase";
import { format, parseISO } from "date-fns";
import { showNotification } from "../../../lib/notification"; // Import showNotification
import { useAuth } from "../../../lib/auth";

export default function BookingDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  const { user } = useAuth(); // Make sure useAuth() is called here
  const [booking, setBooking] = useState<BookingWithReport | null>(null);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [techniciansLoading, setTechniciansLoading] = useState(false);
  const [showTechnicianList, setShowTechnicianList] = useState(false);
  const [statusOptions] = useState<BookingStatus[]>([
    "pending",
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
  ]);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for TabView
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: "details", title: "Booking Details" },
    { key: "report", title: "Job Report" },
  ]);

  useEffect(() => {
    if (!id || id === "undefined") {
      setError("No booking ID provided");
      setLoading(false);
      return;
    }
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      if (!id || id === "undefined") {
        throw new Error("Invalid booking ID");
      }

      setLoading(true);
      console.log(`[Admin BookingDetails] Fetching booking with ID: ${id}`);
      const bookingData = await getBooking(id as string);
      console.log(`[Admin BookingDetails] Booking data received:`, bookingData);

      // Fetch before/after photos from booking_images table
      console.log(
        `[Admin BookingDetails] Fetching images for booking ID: ${id}`
      );
      const { data: images, error: imagesError } = await supabase
        .from("booking_images")
        .select("id, storage_path, type, uploaded_at")
        .eq("booking_id", id)
        .order("uploaded_at", { ascending: true });

      if (imagesError) {
        console.error(
          "[Admin BookingDetails] Error fetching images:",
          imagesError
        );
      }

      console.log(`[Admin BookingDetails] Images found:`, images?.length || 0);

      let beforePhotos: any[] = [];
      let afterPhotos: any[] = [];
      if (!imagesError && images && images.length > 0) {
        console.log(
          `[Admin BookingDetails] Processing ${images.length} images`
        );
        for (const img of images) {
          console.log(
            `[Admin BookingDetails] Creating signed URL for: ${img.storage_path}`
          );
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from("booking-images")
              .createSignedUrl(img.storage_path, 3600);

          if (signedUrlError) {
            console.error(
              `[Admin BookingDetails] Error creating signed URL:`,
              signedUrlError
            );
            continue;
          }

          if (!signedUrlData?.signedUrl) {
            console.error(
              `[Admin BookingDetails] No signed URL generated for: ${img.storage_path}`
            );
            continue;
          }

          const photoData = {
            id: img.id,
            uri: signedUrlData.signedUrl,
            storage_path: img.storage_path,
            type: img.type,
          };

          console.log(`[Admin BookingDetails] Photo processed: ${img.type}`);
          if (img.type === "before") beforePhotos.push(photoData);
          else if (img.type === "after") afterPhotos.push(photoData);
        }
      }

      console.log(
        `[Admin BookingDetails] Before photos: ${beforePhotos.length}, After photos: ${afterPhotos.length}`
      );
      console.log(
        `[Admin BookingDetails] Report notes present: ${
          bookingData.report_notes ? "Yes" : "No"
        }`
      );

      setBooking({ ...bookingData, beforePhotos, afterPhotos });
    } catch (err) {
      console.error(
        "[Admin BookingDetails] Error fetching booking details:",
        err
      );
      setError("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      setTechniciansLoading(true);
      const technicianProfiles = await getTechnicians();
      setTechnicians(technicianProfiles);
    } catch (err) {
      console.error("Error fetching technicians:", err);
      showNotification({
        title: "Error",
        message: "Failed to load technicians",
        type: "error",
      });
    } finally {
      setTechniciansLoading(false);
    }
  };

  const handleToggleTechniciansList = () => {
    if (!showTechnicianList && technicians.length === 0) {
      fetchTechnicians();
    }
    setShowTechnicianList(!showTechnicianList);
  };

  const handleToggleStatusOptions = () => {
    setShowStatusOptions(!showStatusOptions);
  };

  const handleAssignTechnician = async (technicianId: string) => {
    try {
      const updatedBooking = await assignTechnician(id as string, technicianId);
      setBooking(updatedBooking);
      setSuccess("Technician assigned successfully");
      setShowTechnicianList(false);
    } catch (err) {
      console.error("Error assigning technician:", err);
      showNotification({
        title: "Error",
        message: "Failed to assign technician",
        type: "error",
      });
    }
  };

  const handleUpdateStatus = async (status: BookingStatus) => {
    if (!user?.id) {
      console.error("Admin user ID not found, cannot update status.");
      showNotification({
        title: "Error",
        message: "Authentication error",
        type: "error",
      });
      return;
    }
    try {
      setSuccess(null); // Clear previous success messages
      const updatedBooking = await updateBookingStatus(
        id as string,
        status,
        user.id // <-- Pass the admin user's ID here
      );
      setBooking(updatedBooking);
      setSuccess(`Booking status updated to ${status}`);
      setShowStatusOptions(false);
    } catch (err) {
      console.error("Error updating booking status:", err);
      showNotification({
        title: "Error",
        message: "Failed to update booking status",
        type: "error",
      });
    }
  };

  // --- Tab Components ---

  // Define the BookingDetailsTab component
  const BookingDetailsTab = ({
    booking,
    technicians,
    techniciansLoading,
    showTechnicianList,
    showStatusOptions,
    statusOptions,
    handleToggleTechniciansList,
    handleAssignTechnician,
    handleToggleStatusOptions,
    handleUpdateStatus,
  }: {
    booking: Booking;
    technicians: Profile[];
    techniciansLoading: boolean;
    showTechnicianList: boolean;
    showStatusOptions: boolean;
    statusOptions: BookingStatus[];
    handleToggleTechniciansList: () => void;
    handleAssignTechnician: (technicianId: string) => void;
    handleToggleStatusOptions: () => void;
    handleUpdateStatus: (status: BookingStatus) => void;
  }) => (
    <ScrollView className="flex-1 p-4">
      {success && (
        <View className="mb-4 bg-green-100 p-3 rounded-md">
          <Text className="text-green-800">{success}</Text>
        </View>
      )}

      {/* Booking ID */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900">
          Booking #{booking.id.slice(0, 8)}
        </Text>
        <View className="flex-row items-center mt-2">
          <View
            className={`px-3 py-1 rounded-full ${getStatusColor(
              booking.status
            )}`}
          >
            <Text className="text-sm font-medium capitalize">
              {booking.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Service Details */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-3">Service Details</Text>
        <View className="flex-row items-center mb-2">
          <View className="w-8">
            <Calendar size={18} color="#4b5563" />
          </View>
          <Text className="text-gray-700">
            {format(new Date(booking.scheduled_date), "EEEE, MMMM d, yyyy")}
          </Text>
        </View>
        <View className="flex-row items-center mb-2">
          <View className="w-8">
            <Clock size={18} color="#4b5563" />
          </View>
          <Text className="text-gray-700">{booking.scheduled_time}</Text>
        </View>
        <View className="flex-row items-center mb-2">
          <View className="w-8">
            <MapPin size={18} color="#4b5563" />
          </View>
          <Text className="text-gray-700">{booking.address}</Text>
        </View>
        <View className="pt-2 mt-2 border-t border-gray-200">
          <Text className="font-medium text-gray-800">
            {booking.service?.name}
          </Text>
          <Text className="text-gray-600 mt-1">
            ${Number(booking.price).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Customer Information */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-3">Customer</Text>
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
            <User size={20} color="#4b5563" />
          </View>
          <View>
            <Text className="font-medium text-gray-800">
              {booking.customer?.first_name} {booking.customer?.last_name}
            </Text>
            <Text className="text-gray-600 text-sm">
              {booking.customer?.phone}
            </Text>
          </View>
        </View>
      </View>

      {/* Technician Assignment */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-3">Technician</Text>
        {booking.technician ? (
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
              <User size={20} color="#4b5563" />
            </View>
            <View>
              <Text className="font-medium text-gray-800">
                {booking.technician.first_name} {booking.technician.last_name}
              </Text>
              <Text className="text-gray-600 text-sm">
                {booking.technician.phone}
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-gray-600">No technician assigned</Text>
        )}

        <TouchableOpacity
          onPress={handleToggleTechniciansList}
          className="mt-3 flex-row items-center"
        >
          <Text className="text-blue-600 font-medium">
            {booking.technician ? "Change Technician" : "Assign Technician"}
          </Text>
          {showTechnicianList ? (
            <ChevronUp size={16} color="#2563eb" className="ml-1" />
          ) : (
            <ChevronDown size={16} color="#2563eb" className="ml-1" />
          )}
        </TouchableOpacity>

        {showTechnicianList && (
          <View className="mt-3 border border-gray-200 rounded-md">
            {techniciansLoading ? (
              <View className="p-4 items-center">
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="mt-2 text-gray-600">
                  Loading technicians...
                </Text>
              </View>
            ) : technicians.length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-gray-600">No technicians found</Text>
              </View>
            ) : (
              technicians.map((technician) => (
                <TouchableOpacity
                  key={technician.id}
                  onPress={() => handleAssignTechnician(technician.id)}
                  className="p-3 border-b border-gray-200 flex-row items-center"
                >
                  <View className="w-8 h-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                    <User size={16} color="#4b5563" />
                  </View>
                  <View>
                    <Text>
                      {technician.first_name} {technician.last_name}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {technician.phone}
                    </Text>
                  </View>
                  {booking.technician_id === technician.id && (
                    <CheckCircle
                      size={16}
                      color="#10b981"
                      className="ml-auto"
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {/* Status Management */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-3">Update Status</Text>
        <TouchableOpacity
          onPress={handleToggleStatusOptions}
          className="flex-row items-center justify-between"
        >
          <View
            className={`px-3 py-1 rounded-md ${getStatusColor(booking.status)}`}
          >
            <Text className="text-sm font-medium capitalize">
              {booking.status}
            </Text>
          </View>
          {showStatusOptions ? (
            <ChevronUp size={16} color="#4b5563" />
          ) : (
            <ChevronDown size={16} color="#4b5563" />
          )}
        </TouchableOpacity>

        {showStatusOptions && (
          <View className="mt-3 border border-gray-200 rounded-md">
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleUpdateStatus(status)}
                className="p-3 border-b border-gray-200 flex-row items-center justify-between"
              >
                <View
                  className={`px-3 py-1 rounded-md ${getStatusColor(status)}`}
                >
                  <Text className="text-sm font-medium capitalize">
                    {status}
                  </Text>
                </View>
                {booking.status === status && (
                  <CheckCircle size={16} color="#10b981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Additional Notes */}
      {booking.notes && (
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-2">Notes</Text>
          <Text className="text-gray-700">{booking.notes}</Text>
        </View>
      )}
    </ScrollView>
  );

  // Define the JobReportTab component
  const JobReportTab = ({ booking }: { booking: Booking }) => (
    <ScrollView className="flex-1 p-4">
      {/* Report Header with Technician Details */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900">Job Report</Text>
        {booking.technician ? (
          <View className="mt-2 bg-gray-50 p-4 rounded-lg">
            <Text className="text-lg font-semibold mb-2">
              Technician Details
            </Text>
            <View className="flex-row items-center">
              <User size={18} color="#4b5563" />
              <Text className="ml-2 text-gray-700">
                {booking.technician.first_name} {booking.technician.last_name}
              </Text>
            </View>
            {booking.technician.phone && (
              <Text className="text-gray-700 mt-1">
                Phone: {booking.technician.phone}
              </Text>
            )}
          </View>
        ) : (
          <View className="mt-2 bg-yellow-50 p-4 rounded-lg">
            <Text className="text-yellow-700">
              No technician assigned to this job
            </Text>
          </View>
        )}
      </View>

      {/* Job Status */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-2">Job Status</Text>
        <View className="flex-row items-center">
          <View
            className={`px-3 py-1 rounded-full ${getStatusColor(
              booking.status
            )}`}
          >
            <Text className="text-sm font-medium capitalize">
              {booking.status}
            </Text>
          </View>
          {booking.status === "completed" && !booking.report_notes && (
            <Text className="ml-3 text-gray-500 italic">
              Completed without report notes
            </Text>
          )}
        </View>
      </View>

      {/* Technician Job Report Notes */}
      {booking.report_notes ? (
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-2">
            Technician Report Notes
          </Text>
          <Text className="text-gray-700">{booking.report_notes}</Text>
        </View>
      ) : (
        <View className="mb-6 bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold mb-2">
            Technician Report Notes
          </Text>
          <Text className="text-gray-500 italic">
            No report notes available
          </Text>
        </View>
      )}

      {/* Before Photos */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-2">Before Photos</Text>
        {booking.beforePhotos && booking.beforePhotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {booking.beforePhotos.map(
              (photo: { id?: string; uri: string }, idx: number) => (
                <Image
                  key={photo.id || idx}
                  source={{ uri: photo.uri }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                  resizeMode="cover"
                />
              )
            )}
          </ScrollView>
        ) : (
          <Text className="text-gray-500 italic">
            No before photos available
          </Text>
        )}
      </View>

      {/* After Photos */}
      <View className="mb-6 bg-gray-50 p-4 rounded-lg">
        <Text className="text-lg font-semibold mb-2">After Photos</Text>
        {booking.afterPhotos && booking.afterPhotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {booking.afterPhotos.map(
              (photo: { id?: string; uri: string }, idx: number) => (
                <Image
                  key={photo.id || idx}
                  source={{ uri: photo.uri }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                  resizeMode="cover"
                />
              )
            )}
          </ScrollView>
        ) : (
          <Text className="text-gray-500 italic">
            No after photos available
          </Text>
        )}
      </View>
    </ScrollView>
  );

  // Define scene map AFTER defining the tab components
  const renderScene = SceneMap({
    details: () => (
      <BookingDetailsTab
        booking={booking!}
        technicians={technicians}
        techniciansLoading={techniciansLoading}
        showTechnicianList={showTechnicianList}
        showStatusOptions={showStatusOptions}
        statusOptions={statusOptions}
        handleToggleTechniciansList={handleToggleTechniciansList}
        handleAssignTechnician={handleAssignTechnician}
        handleToggleStatusOptions={handleToggleStatusOptions}
        handleUpdateStatus={handleUpdateStatus}
      />
    ),
    report: () => <JobReportTab booking={booking!} />,
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Booking Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-gray-600">Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Booking Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} color="#ef4444" />
          <Text className="mt-4 text-red-500 text-lg">{error}</Text>
          <TouchableOpacity
            onPress={fetchBooking}
            className="mt-4 bg-gray-200 px-4 py-2 rounded-md"
          >
            <Text>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: "Booking Details",
            headerBackTitle: "Back",
          }}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // If booking is loaded, render the tab view
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: `Booking #${id?.slice(0, 8)}`,
          headerBackTitle: "Back",
        }}
      />
      {/* Render TabView if booking is loaded */}
      <TabView
        navigationState={{ index: tabIndex, routes }}
        renderScene={renderScene}
        onIndexChange={setTabIndex}
        initialLayout={{ width: Dimensions.get("window").width }}
        renderTabBar={(props) => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: "#10b981" }}
            style={{
              backgroundColor: "white",
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e7eb",
            }}
            labelStyle={{
              color: "#374151",
              fontWeight: "600",
              textTransform: "none",
            }}
            activeColor="#10b981"
            inactiveColor="#6b7280"
            pressColor="rgba(16, 185, 129, 0.1)"
          />
        )}
      />
    </SafeAreaView>
  );
}
