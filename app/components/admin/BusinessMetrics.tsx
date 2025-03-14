import React from "react";
import { View, Text, ScrollView } from "react-native";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  DollarSign,
  Calendar,
} from "lucide-react-native";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

const MetricCard = (
  { title, value, change, isPositive, icon }: MetricCardProps = {
    title: "Metric",
    value: "$0",
    change: "0%",
    isPositive: true,
    icon: <DollarSign size={24} color="#4CAF50" />,
  },
) => {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex-1 min-w-[150px]">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-500 font-medium text-sm">{title}</Text>
        <View className="p-2 bg-gray-50 rounded-full">{icon}</View>
      </View>
      <Text className="text-2xl font-bold mb-1">{value}</Text>
      <View className="flex-row items-center">
        {isPositive ? (
          <TrendingUp size={16} color="#4CAF50" />
        ) : (
          <TrendingDown size={16} color="#F44336" />
        )}
        <Text
          className={`ml-1 ${isPositive ? "text-green-600" : "text-red-500"}`}
        >
          {change}
        </Text>
      </View>
    </View>
  );
};

interface BusinessMetricsProps {
  revenue: string;
  revenueChange: string;
  revenueIsPositive: boolean;
  jobsCompleted: string;
  jobsChange: string;
  jobsIsPositive: boolean;
  customerSatisfaction: string;
  satisfactionChange: string;
  satisfactionIsPositive: boolean;
  activeCustomers: string;
  customersChange: string;
  customersIsPositive: boolean;
}

const BusinessMetrics = ({
  revenue = "$12,450",
  revenueChange = "+12.5%",
  revenueIsPositive = true,
  jobsCompleted = "156",
  jobsChange = "+8.2%",
  jobsIsPositive = true,
  customerSatisfaction = "4.8/5",
  satisfactionChange = "+0.3",
  satisfactionIsPositive = true,
  activeCustomers = "243",
  customersChange = "+5.7%",
  customersIsPositive = true,
}: BusinessMetricsProps) => {
  return (
    <View className="bg-gray-50 p-4 rounded-xl">
      <Text className="text-lg font-bold mb-4">Business Metrics</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-1"
      >
        <View className="flex-row space-x-3 px-1">
          <MetricCard
            title="Revenue"
            value={revenue}
            change={revenueChange}
            isPositive={revenueIsPositive}
            icon={<DollarSign size={24} color="#4CAF50" />}
          />
          <MetricCard
            title="Jobs Completed"
            value={jobsCompleted}
            change={jobsChange}
            isPositive={jobsIsPositive}
            icon={<CheckCircle size={24} color="#2196F3" />}
          />
          <MetricCard
            title="Customer Rating"
            value={customerSatisfaction}
            change={satisfactionChange}
            isPositive={satisfactionIsPositive}
            icon={<Users size={24} color="#FF9800" />}
          />
          <MetricCard
            title="Active Customers"
            value={activeCustomers}
            change={customersChange}
            isPositive={customersIsPositive}
            icon={<Calendar size={24} color="#9C27B0" />}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default BusinessMetrics;
