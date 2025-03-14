import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { Bell, User } from "lucide-react-native";
import { useRouter } from "expo-router";

import UpcomingAppointments from "../components/customer/UpcomingAppointments";
import RecentServices from "../components/customer/RecentServices";
import QuickBooking from "../components/customer/QuickBooking";

const CustomerDashboard = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const handleViewAppointment = (id: string) => {
    console.log(`Navigate to appointment details for ID: ${id}`);
  };

  const handleServiceSelect = (serviceType: string) => {
    router.push({
      pathname: "/booking",
      params: { serviceType },
    });
  };

  const handleRateService = (id: string, rating: number) => {
    console.log(`Rate service ${id} with ${rating} stars`);
  };

  const handleViewServiceDetails = (id: string) => {
    console.log(`View service details for ID: ${id}`);
  };

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
                Hello, Alex
              </Text>
              <Text style={{ color: "white", fontSize: 14, opacity: 0.8 }}>
                Welcome back to GreenCare
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
          <View style={{ marginBottom: 24 }}>
            <UpcomingAppointments onViewAppointment={handleViewAppointment} />
          </View>

          <View style={{ marginBottom: 24 }}>
            <QuickBooking
              onServiceSelect={handleServiceSelect}
              services={[
                { id: "1", name: "Lawn Mowing", icon: "mowing" },
                { id: "2", name: "Fertilizing", icon: "fertilizing" },
                { id: "3", name: "Yard Cleanup", icon: "cleanup" },
                { id: "4", name: "Irrigation", icon: "irrigation" },
                { id: "5", name: "Schedule", icon: "schedule" },
              ]}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <RecentServices
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
