import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  Bell,
  User,
  ArrowUpDown,
  CalendarDays,
  Clock,
} from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import {
  getCustomerBookings,
  getServices,
  createReview,
  Service,
  Booking,
  getUpcomingBookings,
  getProfile,
  Profile,
  subscribeToBookings,
  subscribeToProfiles,
  unsubscribeFromChannel,
} from "../../lib/data";
import { format } from "date-fns";
import { Card } from "react-native-paper";
import { RealtimeChannel } from "@supabase/supabase-js";

import UpcomingAppointments from "../components/customer/UpcomingAppointments";
import RecentServices from "../components/customer/RecentServices";
import QuickBooking from "../components/customer/QuickBooking";

// Define interfaces for the components
interface FormattedAppointment {
  id: string;
  date: string;
  time: string;
  service: string;
  status: "scheduled" | "in-progress" | "completed" | "pending" | "cancelled";
  price: string;
}

interface FormattedCompletedService {
  id: string;
  date: string;
  service: string;
  beforeImage: string;
  afterImage: string;
  rating?: number;
}

interface QuickBookingService {
  id: string;
  name: string;
  icon: "mowing" | "fertilizing" | "cleanup" | "irrigation" | "schedule";
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    FormattedAppointment[]
  >([]);
  const [completedServices, setCompletedServices] = useState<
    FormattedCompletedService[]
  >([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);

  // References to active subscriptions
  const bookingsChannelRef = React.useRef<RealtimeChannel | null>(null);
  const profileChannelRef = React.useRef<RealtimeChannel | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      // Fetch user profile
      const profileData = await getProfile(user.id);
      setProfile(profileData);

      // Fetch upcoming bookings
      const bookingsData = await getUpcomingBookings(user.id);
      setUpcomingBookings(bookingsData);

      // Fetch available services
      const servicesData = await getServices();
      setServicesList(servicesData);

      // Format date function
      const formatDate = (dateStr: string) => {
        try {
          return format(new Date(dateStr), "EEE, MMM d");
        } catch (e) {
          console.error("Date formatting error:", e);
          return dateStr;
        }
      };

      // Process upcoming appointments (scheduled or pending)
      const upcoming = bookingsData
        .filter(
          (booking: Booking) =>
            booking.status === "scheduled" || booking.status === "pending"
        )
        .map((booking: Booking) => ({
          id: booking.id,
          date: formatDate(booking.scheduled_date),
          time: booking.scheduled_time,
          service: booking.service?.name || "Unknown Service",
          status: booking.status as "scheduled" | "pending",
          price: `$${booking.price}`,
        }));
      console.log(
        "Dashboard: Processed upcoming appointments:",
        upcoming.length
      );

      // Process completed services with before/after placeholder images
      const completed = bookingsData
        .filter((booking: Booking) => booking.status === "completed")
        .map((booking: Booking) => ({
          id: booking.id,
          date: formatDate(booking.scheduled_date),
          service: booking.service?.name || "Unknown Service",
          beforeImage: "https://via.placeholder.com/150?text=Before",
          afterImage: "https://via.placeholder.com/150?text=After",
          rating: booking.review?.rating || 0,
        }));
      console.log("Dashboard: Processed completed services:", completed.length);

      setUpcomingAppointments(upcoming);
      setCompletedServices(completed);
      console.log("Dashboard: Data loading completed successfully");
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
      Alert.alert("Error", err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    console.log("Setting up real-time subscriptions for customer dashboard");

    // Subscribe to bookings changes
    bookingsChannelRef.current = subscribeToBookings(
      (payload) => {
        console.log("Booking update received:", payload);

        // Check if this update is relevant to the current user's bookings
        if (payload.new && payload.new.customer_id === user.id) {
          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            setUpcomingBookings((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setUpcomingBookings((prev) =>
              prev.map((booking) =>
                booking.id === payload.new.id ? payload.new : booking
              )
            );
          } else if (payload.eventType === "DELETE") {
            setUpcomingBookings((prev) =>
              prev.filter((booking) => booking.id !== payload.old.id)
            );
          }

          // Refresh the formatted data
          fetchData();
        }
      },
      { customerId: user.id }
    );

    // Subscribe to profile changes
    profileChannelRef.current = subscribeToProfiles((payload) => {
      console.log("Profile update received:", payload);

      if (payload.new && payload.new.id === user.id) {
        setProfile(payload.new);
      }
    }, user.id);

    // Initial data fetch
    fetchData();

    // Cleanup subscriptions on unmount
    return () => {
      console.log("Cleaning up subscriptions");
      if (bookingsChannelRef.current) {
        unsubscribeFromChannel(bookingsChannelRef.current);
      }
      if (profileChannelRef.current) {
        unsubscribeFromChannel(profileChannelRef.current);
      }
    };
  }, [user, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleViewAppointment = (id: string) => {
    router.push(`/customer/booking?id=${id}`);
  };

  const handleBookService = (serviceId: string) => {
    // Find the actual service ID from the service's name
    const service = servicesList.find(
      (s) => s.name === serviceId || s.id === serviceId
    );
    if (service) {
      router.push(`/(customer)/booking?serviceId=${service.id}`);
    } else {
      // If service not found by name, redirect to services page
      router.push("/(customer)/services");
    }
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
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    }
  };

  const handleViewServiceDetails = (id: string) => {
    console.log(`View service details for ID: ${id}`);
    router.push(`/customer/booking?id=${id}`);
  };

  // Extract services data for quick booking
  const quickBookingServices: QuickBookingService[] = servicesList
    .slice(0, 5)
    .map((service) => ({
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
  const firstName =
    user?.user_metadata?.first_name || profile?.first_name || "Customer";

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
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: "#f3f4f6",
                  borderRadius: 8,
                }}
                onPress={fetchData}
              >
                <Text style={{ color: "#16a34a", fontWeight: "600" }}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginBottom: 24 }}>
            <UpcomingAppointments
              appointments={upcomingBookings.filter(
                (booking) =>
                  booking.status === "scheduled" ||
                  booking.status === "pending" ||
                  booking.status === "in_progress"
              )}
              onViewAppointment={handleViewAppointment}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <QuickBooking
              onServiceSelect={handleBookService}
              services={servicesList.slice(0, 5).map((service) => ({
                id: service.id,
                name: service.name,
                // Map the service type to an icon
                icon: service.name.toLowerCase().includes("mow")
                  ? "mowing"
                  : service.name.toLowerCase().includes("fertil")
                  ? "fertilizing"
                  : service.name.toLowerCase().includes("clean")
                  ? "cleanup"
                  : service.name.toLowerCase().includes("water") ||
                    service.name.toLowerCase().includes("irrigat")
                  ? "irrigation"
                  : "schedule",
              }))}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <RecentServices
              services={upcomingBookings.filter(
                (booking) => booking.status === "completed"
              )}
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
