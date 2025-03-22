import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Filter,
  RefreshCcw,
} from "lucide-react-native";

interface Transaction {
  id: string;
  date: string;
  customer: string;
  amount: number;
  status: "completed" | "pending" | "refunded" | "failed";
  type: "one-time" | "subscription";
  service: string;
}

interface PaymentManagementProps {
  transactions?: Transaction[];
  onRefund?: (paymentId: string, amount: number) => void;
}

const PaymentManagement = ({
  transactions = [],
  onRefund = () => {},
}: PaymentManagementProps) => {
  const [activeTab, setActiveTab] = useState<
    "transactions" | "subscriptions" | "refunds"
  >("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "pending" | "refunded" | "failed"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "one-time" | "subscription"
  >("all");

  // Filter transactions based on search query and filters
  const filteredTransactions = transactions.filter((transaction) => {
    // Search filter
    const matchesSearch =
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.service.toLowerCase().includes(searchQuery.toLowerCase());

    // Date filter
    const transactionDate = new Date(transaction.date);
    const today = new Date();
    const isToday = transactionDate.toDateString() === today.toDateString();
    const isThisWeek =
      transactionDate >= new Date(today.setDate(today.getDate() - 7));
    const isThisMonth =
      transactionDate.getMonth() === today.getMonth() &&
      transactionDate.getFullYear() === today.getFullYear();

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && isToday) ||
      (dateFilter === "week" && isThisWeek) ||
      (dateFilter === "month" && isThisMonth);

    // Status filter
    const matchesStatus =
      statusFilter === "all" || transaction.status === statusFilter;

    // Type filter
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesType;
  });

  // Get tab-specific transactions
  const getTabTransactions = () => {
    switch (activeTab) {
      case "subscriptions":
        return filteredTransactions.filter((t) => t.type === "subscription");
      case "refunds":
        return filteredTransactions.filter((t) => t.status === "refunded");
      default:
        return filteredTransactions;
    }
  };

  // Handle refund action
  const handleRefund = (transaction: Transaction) => {
    if (
      transaction.status === "completed" ||
      transaction.status === "pending"
    ) {
      onRefund(transaction.id, transaction.amount);
    } else {
      Alert.alert(
        "Cannot Refund",
        `This payment already has status: ${transaction.status}`
      );
    }
  };

  // Get status color based on transaction status
  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon based on transaction status
  const getStatusIcon = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} color="#15803d" />;
      case "pending":
        return <RefreshCw size={16} color="#854d0e" />;
      case "refunded":
        return <RefreshCw size={16} color="#1e40af" />;
      case "failed":
        return <AlertCircle size={16} color="#b91c1c" />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-6 bg-green-700">
        <Text className="text-2xl font-bold text-white">
          Payment Management
        </Text>
        <Text className="text-white opacity-80 mt-1">
          View and manage all payment transactions
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-3 ${
            activeTab === "transactions" ? "border-b-2 border-green-600" : ""
          }`}
          onPress={() => setActiveTab("transactions")}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === "transactions" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${
            activeTab === "subscriptions" ? "border-b-2 border-green-600" : ""
          }`}
          onPress={() => setActiveTab("subscriptions")}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === "subscriptions" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Subscriptions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${
            activeTab === "refunds" ? "border-b-2 border-green-600" : ""
          }`}
          onPress={() => setActiveTab("refunds")}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === "refunds" ? "text-green-600" : "text-gray-600"
            }`}
          >
            Refunds
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View className="p-4">
        <View className="flex-row items-center bg-white rounded-md border border-gray-300 px-3 py-2 mb-3">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search by ID, customer, or service"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            className="flex-row items-center bg-white rounded-md border border-gray-300 px-3 py-2"
            onPress={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={18} color="#6b7280" />
            <Text className="ml-2 text-gray-700">Filters</Text>
            {filterOpen ? (
              <ChevronUp size={18} color="#6b7280" />
            ) : (
              <ChevronDown size={18} color="#6b7280" />
            )}
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center bg-green-600 rounded-md px-3 py-2">
            <Download size={18} color="#ffffff" />
            <Text className="ml-2 text-white font-medium">Export</Text>
          </TouchableOpacity>
        </View>

        {/* Filter options */}
        {filterOpen && (
          <View className="mt-3 bg-white rounded-md border border-gray-300 p-3">
            <Text className="font-medium text-gray-700 mb-2">Date Range</Text>
            <View className="flex-row flex-wrap mb-3">
              {(["all", "today", "week", "month"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                    dateFilter === option
                      ? "bg-green-100 border border-green-600"
                      : "bg-gray-100 border border-gray-300"
                  }`}
                  onPress={() => setDateFilter(option)}
                >
                  <Text
                    className={`${
                      dateFilter === option ? "text-green-800" : "text-gray-700"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="font-medium text-gray-700 mb-2">Status</Text>
            <View className="flex-row flex-wrap mb-3">
              {(
                ["all", "completed", "pending", "refunded", "failed"] as const
              ).map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                    statusFilter === option
                      ? "bg-green-100 border border-green-600"
                      : "bg-gray-100 border border-gray-300"
                  }`}
                  onPress={() => setStatusFilter(option)}
                >
                  <Text
                    className={`${
                      statusFilter === option
                        ? "text-green-800"
                        : "text-gray-700"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="font-medium text-gray-700 mb-2">Payment Type</Text>
            <View className="flex-row flex-wrap">
              {(["all", "one-time", "subscription"] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                    typeFilter === option
                      ? "bg-green-100 border border-green-600"
                      : "bg-gray-100 border border-gray-300"
                  }`}
                  onPress={() => setTypeFilter(option)}
                >
                  <Text
                    className={`${
                      typeFilter === option ? "text-green-800" : "text-gray-700"
                    }`}
                  >
                    {option === "all"
                      ? "All"
                      : option === "one-time"
                      ? "One-time"
                      : "Subscription"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Transaction List */}
      <ScrollView className="flex-1 px-4">
        <Text className="text-lg font-semibold mb-2">
          {activeTab === "transactions" && "All Transactions"}
          {activeTab === "subscriptions" && "Recurring Subscriptions"}
          {activeTab === "refunds" && "Refunded Payments"}
          {` (${getTabTransactions().length})`}
        </Text>

        {getTabTransactions().length === 0 ? (
          <View className="bg-gray-50 rounded-lg p-5 items-center justify-center">
            <Text className="text-gray-500">No transactions found</Text>
          </View>
        ) : (
          getTabTransactions().map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="font-semibold">{transaction.customer}</Text>
                  <Text className="text-gray-700 text-sm">
                    ID: {transaction.id}
                  </Text>
                </View>
                <View>
                  <Text className="text-lg font-bold text-green-600">
                    ${transaction.amount.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center mt-2">
                <View>
                  <Text className="text-gray-600 text-sm">
                    {transaction.service}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {transaction.date}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <View
                    className={`flex-row items-center px-2 py-1 rounded-full ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {getStatusIcon(transaction.status)}
                    <Text
                      className={`ml-1 text-xs font-medium ${getStatusColor(
                        transaction.status
                      )}`}
                    >
                      {transaction.status.charAt(0).toUpperCase() +
                        transaction.status.slice(1)}
                    </Text>
                  </View>
                  <View className="ml-2 bg-gray-100 px-2 py-1 rounded-full">
                    <Text className="text-xs text-gray-700">
                      {transaction.type === "one-time"
                        ? "One-time"
                        : "Subscription"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              {transaction.status !== "refunded" && (
                <View className="flex-row justify-end mt-3 pt-2 border-t border-gray-100">
                  <TouchableOpacity
                    className="flex-row items-center bg-blue-50 px-3 py-1 rounded-md"
                    onPress={() => handleRefund(transaction)}
                  >
                    <RefreshCcw size={16} color="#2563eb" />
                    <Text className="ml-1 text-blue-700 text-sm font-medium">
                      Refund
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default PaymentManagement;
