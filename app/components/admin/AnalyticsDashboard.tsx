import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import {
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
} from "lucide-react-native";

interface AnalyticsDashboardProps {
  timeRange?: "day" | "week" | "month" | "year";
  metrics?: {
    revenue: number;
    jobsCompleted: number;
    customerSatisfaction: number;
    newCustomers: number;
    avgJobValue: number;
  };
  revenueData?: number[];
  jobsData?: number[];
  serviceDistribution?: Array<{ name: string; value: number; color: string }>;
  customerGrowthData?: number[];
}

const AnalyticsDashboard = ({
  timeRange = "month",
  metrics = {
    revenue: 12580,
    jobsCompleted: 78,
    customerSatisfaction: 4.8,
    newCustomers: 24,
    avgJobValue: 161,
  },
  revenueData = [
    4200, 5100, 5800, 6100, 7200, 8100, 7900, 8500, 9200, 10100, 11500, 12580,
  ],
  jobsData = [28, 32, 36, 42, 38, 46, 52, 48, 56, 62, 68, 78],
  serviceDistribution = [
    { name: "Lawn Mowing", value: 45, color: "#4CAF50" },
    { name: "Fertilization", value: 20, color: "#8BC34A" },
    { name: "Weed Control", value: 15, color: "#CDDC39" },
    { name: "Landscaping", value: 12, color: "#FFC107" },
    { name: "Other", value: 8, color: "#FF9800" },
  ],
  customerGrowthData = [
    120, 132, 145, 162, 178, 195, 210, 228, 242, 260, 278, 302,
  ],
}: AnalyticsDashboardProps) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "day" | "week" | "month" | "year"
  >(timeRange);
  const [showFilters, setShowFilters] = useState(false);

  // Placeholder for chart components
  const RevenueChart = () => (
    <View className="h-40 w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <LineChart className="text-blue-500" />
      <Text className="text-gray-500 mt-2">Revenue Chart Visualization</Text>
    </View>
  );

  const JobsChart = () => (
    <View className="h-40 w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <BarChart className="text-green-500" />
      <Text className="text-gray-500 mt-2">Jobs Completed Chart</Text>
    </View>
  );

  const ServiceDistributionChart = () => (
    <View className="h-40 w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <PieChart className="text-purple-500" />
      <Text className="text-gray-500 mt-2">Service Distribution</Text>
    </View>
  );

  const CustomerGrowthChart = () => (
    <View className="h-40 w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <LineChart className="text-orange-500" />
      <Text className="text-gray-500 mt-2">Customer Growth</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Analytics Dashboard</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2 mr-2 bg-gray-100 rounded-full"
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color="#4b5563" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 bg-gray-100 rounded-full">
            <Download size={20} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && (
        <View className="mb-4 p-3 bg-gray-50 rounded-lg">
          <Text className="font-semibold mb-2">Time Range</Text>
          <View className="flex-row">
            {["day", "week", "month", "year"].map((range) => (
              <TouchableOpacity
                key={range}
                className={`mr-2 px-3 py-1 rounded-full ${selectedTimeRange === range ? "bg-blue-500" : "bg-gray-200"}`}
                onPress={() =>
                  setSelectedTimeRange(
                    range as "day" | "week" | "month" | "year",
                  )
                }
              >
                <Text
                  className={
                    selectedTimeRange === range ? "text-white" : "text-gray-700"
                  }
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Key Metrics */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Key Metrics</Text>
          <View className="flex-row flex-wrap justify-between">
            <MetricCard
              title="Revenue"
              value={`$${metrics.revenue.toLocaleString()}`}
              trend={8.5}
              icon={<LineChart size={18} color="#4CAF50" />}
            />
            <MetricCard
              title="Jobs Completed"
              value={metrics.jobsCompleted.toString()}
              trend={12.3}
              icon={<BarChart size={18} color="#2196F3" />}
            />
            <MetricCard
              title="Customer Rating"
              value={metrics.customerSatisfaction.toString()}
              trend={0.2}
              icon={<PieChart size={18} color="#FFC107" />}
            />
            <MetricCard
              title="New Customers"
              value={metrics.newCustomers.toString()}
              trend={-3.1}
              icon={<LineChart size={18} color="#9C27B0" />}
            />
          </View>
        </View>

        {/* Revenue Analysis */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Revenue Analysis</Text>
          <RevenueChart />
          <View className="mt-2 flex-row justify-between">
            <Text className="text-gray-500">
              Total: ${metrics.revenue.toLocaleString()}
            </Text>
            <Text className="text-gray-500">
              Avg Job: ${metrics.avgJobValue}
            </Text>
          </View>
        </View>

        {/* Jobs Completed */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Jobs Completed</Text>
          <JobsChart />
          <View className="mt-2">
            <Text className="text-gray-500">
              Total: {metrics.jobsCompleted} jobs
            </Text>
          </View>
        </View>

        {/* Service Distribution */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">
            Service Distribution
          </Text>
          <ServiceDistributionChart />
          <View className="mt-3 flex-row flex-wrap">
            {serviceDistribution.map((service, index) => (
              <View key={index} className="flex-row items-center mr-4 mb-2">
                <View
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: service.color,
                    borderRadius: 2,
                  }}
                />
                <Text className="text-xs text-gray-700 ml-1">
                  {service.name} ({service.value}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Customer Growth */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Customer Growth</Text>
          <CustomerGrowthChart />
          <View className="mt-2">
            <Text className="text-gray-500">
              Current Customers:{" "}
              {customerGrowthData[customerGrowthData.length - 1]}
            </Text>
          </View>
        </View>

        {/* Report Generation */}
        <View className="mb-6">
          <Text className="text-lg font-semibold mb-3">Generate Reports</Text>
          <View className="flex-row flex-wrap">
            <ReportButton
              title="Revenue Report"
              icon={<LineChart size={16} color="#fff" />}
            />
            <ReportButton
              title="Service Report"
              icon={<PieChart size={16} color="#fff" />}
            />
            <ReportButton
              title="Customer Report"
              icon={<BarChart size={16} color="#fff" />}
            />
            <ReportButton
              title="Custom Report"
              icon={<Calendar size={16} color="#fff" />}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, trend, icon }: MetricCardProps) => (
  <View className="bg-gray-50 p-3 rounded-lg mb-3 w-[48%]">
    <View className="flex-row justify-between items-center mb-1">
      <Text className="text-gray-500 text-xs">{title}</Text>
      {icon}
    </View>
    <Text className="text-xl font-bold">{value}</Text>
    <View className="flex-row items-center mt-1">
      {trend >= 0 ? (
        <TrendingUp size={14} color="#4CAF50" />
      ) : (
        <TrendingDown size={14} color="#F44336" />
      )}
      <Text
        className={`text-xs ml-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}
      >
        {Math.abs(trend)}% {trend >= 0 ? "increase" : "decrease"}
      </Text>
    </View>
  </View>
);

interface ReportButtonProps {
  title: string;
  icon: React.ReactNode;
}

const ReportButton = ({ title, icon }: ReportButtonProps) => (
  <TouchableOpacity className="bg-blue-500 p-3 rounded-lg mr-2 mb-2 flex-row items-center">
    {icon}
    <Text className="text-white ml-2">{title}</Text>
  </TouchableOpacity>
);

export default AnalyticsDashboard;
