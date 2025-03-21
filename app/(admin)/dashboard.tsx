import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Bell } from "lucide-react-native";
import BusinessMetrics from "../components/admin/BusinessMetrics";
import TodayOverview from "../components/admin/TodayOverview";
import QuickActions from "../components/admin/QuickActions";
import { useUserRole } from "../../hooks/useUserRole";

const AdminDashboard = () => {
  const { refreshRole } = useUserRole();

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

  // Mock data for upcoming jobs
  type JobStatus = "scheduled" | "in-progress" | "completed" | "issue";

  interface JobSummary {
    id: string;
    time: string;
    address: string;
    service: string;
    technician: string;
    status: JobStatus;
  }

  const upcomingJobs: JobSummary[] = [
    {
      id: "JB-1234",
      time: "9:00 AM",
      address: "123 Oak St, Springfield",
      service: "Premium Lawn Mowing",
      technician: "John Smith",
      status: "scheduled",
    },
    {
      id: "JB-1235",
      time: "10:30 AM",
      address: "456 Maple Ave, Springfield",
      service: "Garden Maintenance",
      technician: "Sarah Johnson",
      status: "scheduled",
    },
    {
      id: "JB-1236",
      time: "1:00 PM",
      address: "789 Pine Rd, Springfield",
      service: "Basic Lawn Mowing",
      technician: "Robert Brown",
      status: "scheduled",
    },
    {
      id: "JB-1237",
      time: "3:30 PM",
      address: "321 Cedar Ln, Springfield",
      service: "Premium Lawn Mowing",
      technician: "James Wilson",
      status: "scheduled",
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
              scheduledJobs={upcomingJobs}
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

          <View className="bg-purple-100 p-4 rounded-lg mb-6 border border-purple-300">
            <Text className="text-purple-800 font-semibold mb-2">
              This page is only accessible to administrators
            </Text>
            <Text className="text-purple-700">
              The admin layout's ProtectedRoute component is protecting this
              route by checking the user's role in the JWT token claims. If a
              non-admin user tries to access this page, they will be redirected.
            </Text>

            <TouchableOpacity
              className="bg-purple-600 py-2 px-4 rounded-lg mt-4 self-start"
              onPress={refreshRole}
            >
              <Text className="text-white font-semibold">
                Refresh Role Claims
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sample Admin Content */}
          <View className="mb-6">
            <Text className="text-xl font-bold mb-4">User Management</Text>
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="text-gray-700">
                User management tools would appear here, allowing administrators
                to view and manage technicians and customers.
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xl font-bold mb-4">
              Service Configuration
            </Text>
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="text-gray-700">
                Service configuration tools would appear here, allowing
                administrators to define service types, pricing, and
                availability.
              </Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xl font-bold mb-4">Analytics</Text>
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="text-gray-700">
                Analytics and reporting tools would appear here, providing
                insights into business performance.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminDashboard;
