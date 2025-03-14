import React from "react";
import { View, Text, ScrollView, SafeAreaView } from "react-native";
import { Bell } from "lucide-react-native";
import BusinessMetrics from "../components/admin/BusinessMetrics";
import TodayOverview from "../components/admin/TodayOverview";
import QuickActions from "../components/admin/QuickActions";

const AdminDashboard = () => {
  // Mock data for business metrics
  const metricsData = {
    revenue: "$12,450",
    revenueChange: "+12.5%",
    revenueIsPositive: true,
    jobsCompleted: "156",
    jobsChange: "+8.2%",
    jobsIsPositive: true,
    customerSatisfaction: "4.8/5",
    satisfactionChange: "+0.3",
    satisfactionIsPositive: true,
    activeCustomers: "243",
    customersChange: "+5.7%",
    customersIsPositive: true,
  };

  // Mock data for today's jobs
  const todayJobs = [
    {
      id: "1",
      time: "9:00 AM",
      address: "123 Main St, Anytown",
      service: "Lawn Mowing",
      technician: "John Doe",
      status: "scheduled",
    },
    {
      id: "2",
      time: "10:30 AM",
      address: "456 Oak Ave, Anytown",
      service: "Hedge Trimming",
      technician: "Jane Smith",
      status: "in-progress",
    },
    {
      id: "3",
      time: "1:00 PM",
      address: "789 Pine Rd, Anytown",
      service: "Fertilization",
      technician: "Mike Johnson",
      status: "completed",
    },
    {
      id: "4",
      time: "3:30 PM",
      address: "101 Elm Blvd, Anytown",
      service: "Weed Control",
      technician: "Sarah Williams",
      status: "issue",
    },
  ];

  // Handler functions for quick actions
  const handleAddUser = () => {
    // Navigation or modal logic would go here
    console.log("Add user action triggered");
  };

  const handleAddService = () => {
    console.log("Add service action triggered");
  };

  const handleGenerateReport = () => {
    console.log("Generate report action triggered");
  };

  const handleManagePayments = () => {
    console.log("Manage payments action triggered");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-bold text-gray-800">
                Admin Dashboard
              </Text>
              <Text className="text-gray-500">Welcome back, Admin</Text>
            </View>
            <View className="bg-white p-2 rounded-full">
              <Bell size={24} color="#4b5563" />
            </View>
          </View>

          {/* Business Metrics */}
          <View className="mb-6">
            <BusinessMetrics {...metricsData} />
          </View>

          {/* Today's Overview */}
          <View className="mb-6">
            <TodayOverview
              scheduledJobs={todayJobs}
              issuesCount={1}
              completedCount={1}
              inProgressCount={1}
            />
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <QuickActions
              onAddUser={handleAddUser}
              onAddService={handleAddService}
              onGenerateReport={handleGenerateReport}
              onManagePayments={handleManagePayments}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;
