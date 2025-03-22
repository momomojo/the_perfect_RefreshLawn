import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Dimensions } from "react-native";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Star,
} from "lucide-react-native";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { supabase } from "../../lib/supabase";
import { getAllBookings, Booking } from "../../lib/data";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeFrame, setTimeFrame] = useState<"week" | "month" | "year">("week");

  // Chart dimensions
  const screenWidth = Dimensions.get("window").width - 32;

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFrame]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await getAllBookings();

      if (error) {
        throw new Error(error.message);
      }

      setBookings(data);
    } catch (err: any) {
      console.error("Error fetching analytics data:", err);
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate date range based on timeFrame
  const getDateRange = () => {
    const today = new Date();

    switch (timeFrame) {
      case "week":
        return {
          start: startOfWeek(today),
          end: endOfWeek(today),
          label: "This Week",
        };
      case "month":
        return {
          start: new Date(today.getFullYear(), today.getMonth(), 1),
          end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
          label: format(today, "MMMM yyyy"),
        };
      case "year":
        return {
          start: new Date(today.getFullYear(), 0, 1),
          end: new Date(today.getFullYear(), 11, 31),
          label: today.getFullYear().toString(),
        };
    }
  };

  // Process booking data for charts
  const getRevenueData = () => {
    const { start, end } = getDateRange();
    const filteredBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.created_at);
      return bookingDate >= start && bookingDate <= end;
    });

    // For week view, get revenue by day
    if (timeFrame === "week") {
      const days = eachDayOfInterval({ start, end });
      const labels = days.map((day) => format(day, "EEE"));

      const values = days.map((day) => {
        const dayBookings = filteredBookings.filter((booking) => {
          const bookingDate = new Date(booking.created_at);
          return (
            bookingDate.getDate() === day.getDate() &&
            bookingDate.getMonth() === day.getMonth()
          );
        });

        return dayBookings.reduce(
          (sum, booking) => sum + (booking.price || 0),
          0
        );
      });

      return { labels, values };
    }

    // For month view, get weekly revenue
    if (timeFrame === "month") {
      // Divide the month into 4 weeks
      const weeksLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const weeksInMonth = 4;
      const daysPerSegment = Math.ceil(
        (end.getTime() - start.getTime()) / (weeksInMonth * 24 * 60 * 60 * 1000)
      );

      const values = Array(weeksInMonth).fill(0);

      filteredBookings.forEach((booking) => {
        const bookingDate = new Date(booking.created_at);
        const day = bookingDate.getDate();
        const weekIndex = Math.min(
          Math.floor(day / daysPerSegment),
          weeksInMonth - 1
        );
        values[weekIndex] += booking.price || 0;
      });

      return { labels: weeksLabels, values };
    }

    // For year view, get monthly revenue
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthValues = Array(12).fill(0);

    filteredBookings.forEach((booking) => {
      const bookingDate = new Date(booking.created_at);
      const month = bookingDate.getMonth();
      monthValues[month] += booking.price || 0;
    });

    return { labels: monthLabels, values: monthValues };
  };

  // Get service distribution data for pie chart
  const getServiceDistribution = () => {
    const serviceCount: Record<string, { count: number; color: string }> = {};
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#8AC926",
      "#1982C4",
    ];

    const { start, end } = getDateRange();
    const filteredBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.created_at);
      return bookingDate >= start && bookingDate <= end;
    });

    // Count bookings by service
    filteredBookings.forEach((booking) => {
      const serviceId = booking.service_id;
      if (!serviceCount[serviceId]) {
        serviceCount[serviceId] = {
          count: 0,
          color: colors[Object.keys(serviceCount).length % colors.length],
        };
      }
      serviceCount[serviceId].count += 1;
    });

    // Format for pie chart
    return Object.entries(serviceCount).map(([name, { count, color }]) => ({
      name: name,
      count,
      color,
    }));
  };

  // Calculate analytics metrics
  const calculateMetrics = () => {
    const { start, end } = getDateRange();
    const filteredBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.created_at);
      return bookingDate >= start && bookingDate <= end;
    });

    const totalRevenue = filteredBookings.reduce(
      (sum, booking) => sum + (booking.price || 0),
      0
    );
    const totalBookings = filteredBookings.length;

    // Count unique customers
    const uniqueCustomers = new Set(
      filteredBookings.map((booking) => booking.customer_id)
    ).size;

    // Average booking value
    const avgBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    return {
      totalRevenue,
      totalBookings,
      uniqueCustomers,
      avgBookingValue,
    };
  };

  // Chart configurations
  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    style: {
      borderRadius: 16,
    },
  };

  const { labels, values } = getRevenueData();
  const serviceData = getServiceDistribution();
  const metrics = calculateMetrics();

  // Format data for charts
  const revenueData = {
    labels,
    datasets: [
      {
        data: values,
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const pieChartData = serviceData.map((item) => ({
    name: item.name,
    population: item.count,
    color: item.color,
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  }));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22c55e" />
          <Text className="mt-4 text-gray-600">Loading analytics data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-lg mb-4">Error loading data</Text>
          <Text className="text-gray-600 text-center mb-6">{error}</Text>
          <TouchableOpacity
            className="bg-green-600 px-4 py-2 rounded-md"
            onPress={fetchAnalyticsData}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        {/* Header */}
        <View className="px-4 py-6 bg-green-700">
          <Text className="text-2xl font-bold text-white">Analytics</Text>
          <Text className="text-white opacity-80 mt-1">
            View business performance metrics
          </Text>
        </View>

        {/* Time frame selector */}
        <View className="flex-row justify-between items-center p-4 bg-white">
          <View className="flex-row items-center">
            <Calendar size={20} color="#4b5563" />
            <Text className="ml-2 text-gray-700 font-medium">
              {getDateRange().label}
            </Text>
          </View>
          <View className="flex-row bg-gray-100 rounded-lg overflow-hidden">
            <TouchableOpacity
              className={`px-3 py-1 ${
                timeFrame === "week" ? "bg-green-600" : "bg-gray-100"
              }`}
              onPress={() => setTimeFrame("week")}
            >
              <Text
                className={`${
                  timeFrame === "week" ? "text-white" : "text-gray-700"
                }`}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-1 ${
                timeFrame === "month" ? "bg-green-600" : "bg-gray-100"
              }`}
              onPress={() => setTimeFrame("month")}
            >
              <Text
                className={`${
                  timeFrame === "month" ? "text-white" : "text-gray-700"
                }`}
              >
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-1 ${
                timeFrame === "year" ? "bg-green-600" : "bg-gray-100"
              }`}
              onPress={() => setTimeFrame("year")}
            >
              <Text
                className={`${
                  timeFrame === "year" ? "text-white" : "text-gray-700"
                }`}
              >
                Year
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Key metrics */}
        <View className="p-4">
          <Text className="text-lg font-semibold mb-3">Key Metrics</Text>
          <View className="flex-row flex-wrap justify-between">
            <View className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 w-[48%]">
              <View className="bg-green-100 p-2 rounded-full w-10 h-10 items-center justify-center mb-2">
                <DollarSign size={18} color="#22c55e" />
              </View>
              <Text className="text-gray-600 text-sm">Total Revenue</Text>
              <Text className="text-lg font-bold">
                ${metrics.totalRevenue.toFixed(2)}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 w-[48%]">
              <View className="bg-blue-100 p-2 rounded-full w-10 h-10 items-center justify-center mb-2">
                <Calendar size={18} color="#3b82f6" />
              </View>
              <Text className="text-gray-600 text-sm">Total Bookings</Text>
              <Text className="text-lg font-bold">{metrics.totalBookings}</Text>
            </View>

            <View className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 w-[48%]">
              <View className="bg-purple-100 p-2 rounded-full w-10 h-10 items-center justify-center mb-2">
                <Users size={18} color="#8b5cf6" />
              </View>
              <Text className="text-gray-600 text-sm">Unique Customers</Text>
              <Text className="text-lg font-bold">
                {metrics.uniqueCustomers}
              </Text>
            </View>

            <View className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 w-[48%]">
              <View className="bg-amber-100 p-2 rounded-full w-10 h-10 items-center justify-center mb-2">
                <TrendingUp size={18} color="#f59e0b" />
              </View>
              <Text className="text-gray-600 text-sm">Avg. Booking Value</Text>
              <Text className="text-lg font-bold">
                ${metrics.avgBookingValue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Revenue Chart */}
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold">Revenue Overview</Text>
            <TouchableOpacity className="flex-row items-center">
              <Download size={16} color="#4b5563" />
              <Text className="ml-1 text-gray-600 text-sm">Export</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <LineChart
              data={revenueData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>
        </View>

        {/* Service Distribution */}
        <View className="p-4">
          <Text className="text-lg font-semibold mb-3">
            Service Distribution
          </Text>
          <View className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            {pieChartData.length > 0 ? (
              <PieChart
                data={pieChartData}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
              />
            ) : (
              <View className="h-[220px] items-center justify-center">
                <Text className="text-gray-500">No service data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional Analytics Content */}
        <View className="p-4 mb-6">
          <Text className="text-lg font-semibold mb-3">Booking Status</Text>
          <View className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <BarChart
              data={{
                labels: ["Pending", "Confirmed", "Completed", "Cancelled"],
                datasets: [
                  {
                    data: [
                      bookings.filter((b) => b.status === "pending").length,
                      bookings.filter((b) => b.status === "confirmed").length,
                      bookings.filter((b) => b.status === "completed").length,
                      bookings.filter((b) => b.status === "cancelled").length,
                    ],
                  },
                ],
              }}
              width={screenWidth}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`,
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Analytics;
