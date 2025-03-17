import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Bell, User } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import {
  getCustomerBookings,
  getServices,
  createReview,
  Service,
  Booking,
} from "../../lib/data";

import UpcomingAppointments from "../components/customer/UpcomingAppointments";
import RecentServices from "../components/customer/RecentServices";
import QuickBooking from "../components/customer/QuickBooking";

const CustomerDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [completedServices, setCompletedServices] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!user) {
        console.log("Dashboard: No user found, cannot fetch data");
        throw new Error("User not authenticated");
      }

      console.log("Dashboard: Fetching bookings for user:", user.id);
      // Fetch customer bookings
      const bookings = await getCustomerBookings(user.id);
      console.log("Dashboard: Retrieved bookings count:", bookings.length);

      // Format date function
      const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = {
          year: "numeric",
          month: "short",
          day: "numeric",
        };
        return new Date(dateString).toLocaleDateString("en-US", options);
      };

      // Format time function
      const formatTime = (timeString: string) => {
        // If time comes as HH:MM:SS format
        if (timeString && timeString.includes(":")) {
          const [hours, minutes] = timeString.split(":");
          const hour = parseInt(hours);
          const minute = parseInt(minutes);
          const ampm = hour >= 12 ? "PM" : "AM";
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
        }
        return timeString;
      };

      // Process upcoming appointments (scheduled or pending)
      const upcoming = bookings
        .filter(
          (booking) =>
            (booking.status === "scheduled" || booking.status === "pending") &&
            new Date(booking.scheduled_date) >= new Date()
        )
        .map((booking) => ({
          id: booking.id,
          date: formatDate(booking.scheduled_date),
          time: formatTime(booking.scheduled_time),
          serviceType: booking.service?.name || "Unknown Service",
          address: booking.address || "No address provided",
          status: booking.status,
        }));
      console.log(
        "Dashboard: Processed upcoming appointments:",
        upcoming.length
      );

      // Process completed services with before/after placeholder images
      const completed = bookings
        .filter((booking) => booking.status === "completed")
        .map((booking) => ({
          id: booking.id,
          date: booking.scheduled_date,
          serviceType: booking.service?.name || "Unknown Service",
          technician: booking.technician
            ? `${booking.technician.first_name} ${booking.technician.last_name}`
            : "Unknown Technician",
          beforeImage:
            "https://images.unsplash.com/photo-1589848563524-2c3c17c9a9fa?w=300&q=80", // Placeholder
          afterImage:
            "https://images.unsplash.com/photo-1592150621744-aca64f48388a?w=300&q=80", // Placeholder
          isRated: booking.review ? true : false,
          rating: booking.review?.rating,
        }));
      console.log("Dashboard: Processed completed services:", completed.length);

      // Fetch available services for quick booking
      console.log("Dashboard: Fetching available services");
      const services = await getServices();
      console.log("Dashboard: Retrieved services count:", services.length);

      setUpcomingAppointments(upcoming);
      setCompletedServices(completed);
      setServicesList(services);
      setError(null);
      console.log("Dashboard: Data loading completed successfully");
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log(
      "Dashboard: useEffect triggered, fetching data for user:",
      user?.id
    );
    fetchData();
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [user]);

  const handleViewAppointment = (id: string) => {
    console.log(`Navigate to appointment details for ID: ${id}`);
    // You would navigate to a detailed view here
  };

  const handleServiceSelect = (serviceType: string) => {
    router.push({
      pathname: "/booking",
      params: { serviceType },
    });
  };

  const handleRateService = async (id: string, rating: number) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get the original booking data using the ID
      const bookings = await getCustomerBookings(user.id);
      const originalBooking = bookings.find((b) => b.id === id);

      if (!originalBooking || !originalBooking.technician_id) {
        console.error("Cannot find booking or technician info");
        return;
      }

      // Create review
      await createReview({
        booking_id: id,
        customer_id: user.id,
        technician_id: originalBooking.technician_id,
        rating: rating,
      });

      // Refresh data to show the updated rating
      fetchData();
    } catch (err: any) {
      console.error("Error submitting review:", err.message);
    }
  };

  const handleViewServiceDetails = (id: string) => {
    console.log(`View service details for ID: ${id}`);
    // You would navigate to service details here
  };

  // Extract services data for quick booking
  const quickBookingServices = servicesList.slice(0, 5).map((service) => ({
    id: service.id,
    name: service.name,
    icon: service.name.toLowerCase().includes("mow")
      ? ("mowing" as const)
      : service.name.toLowerCase().includes("fertil")
      ? ("fertilizing" as const)
      : service.name.toLowerCase().includes("clean")
      ? ("cleanup" as const)
      : service.name.toLowerCase().includes("water") ||
        service.name.toLowerCase().includes("irrig")
      ? ("irrigation" as const)
      : ("schedule" as const),
  }));

  // Get user's first name for greeting
  const firstName = user?.user_metadata?.first_name || "Customer";

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={{ marginTop: 16, color: "#666" }}>
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            padding: 16,
            paddingTop: 8,
            paddingBottom: 16,
            backgroundColor: "#16a34a",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ color: "white", fontSize: 24, fontWeight: "bold" }}
              >
                Hello, {firstName}
              </Text>
              <Text style={{ color: "white", fontSize: 14, opacity: 0.8 }}>
                Welcome back to Lawn Refresh
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                style={{
                  marginRight: 16,
                  backgroundColor: "#15803d",
                  padding: 8,
                  borderRadius: 9999,
                }}
                onPress={() => console.log("Notifications")}
              >
                <Bell size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#15803d",
                  padding: 8,
                  borderRadius: 9999,
                }}
                onPress={() => router.push("/profile")}
              >
                <User size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && (
            <View
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: "#fee2e2",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#b91c1c" }}>Error: {error}</Text>
            </View>
          )}

          <View style={{ marginBottom: 24 }}>
            <UpcomingAppointments
              appointments={upcomingAppointments}
              onViewAppointment={handleViewAppointment}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <QuickBooking
              onServiceSelect={handleServiceSelect}
              services={
                quickBookingServices.length > 0
                  ? quickBookingServices
                  : [
                      { id: "1", name: "Lawn Mowing", icon: "mowing" },
                      { id: "2", name: "Fertilizing", icon: "fertilizing" },
                      { id: "3", name: "Yard Cleanup", icon: "cleanup" },
                      { id: "4", name: "Irrigation", icon: "irrigation" },
                      { id: "5", name: "Schedule", icon: "schedule" },
                    ]
              }
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <RecentServices
              services={completedServices}
              onRateService={handleRateService}
              onViewDetails={handleViewServiceDetails}
            />
          </View>

          <View
            style={{
              marginBottom: 24,
              backgroundColor: "white",
              padding: 16,
              borderRadius: 8,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
              Lawn Care Tips
            </Text>
            <Text style={{ color: "#4b5563" }}>
              Based on recent weather patterns, it is a good time to water your
              lawn in the early morning to prevent evaporation and fungal
              growth.
            </Text>
            <TouchableOpacity style={{ marginTop: 12 }}>
              <Text style={{ color: "#16a34a", fontWeight: "600" }}>
                View more tips
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default CustomerDashboard;
