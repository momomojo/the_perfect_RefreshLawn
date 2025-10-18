import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  DollarSign,
  User,
  FileText,
  Check,
  XCircle,
} from "lucide-react-native";
import {
  getAllRefundRequests,
  approveRefundRequest,
  rejectRefundRequest,
  RefundRequest,
} from "../../../lib/data";
import { format } from "date-fns";
import Toast from "react-native-toast-message";

type RefundStatusFilter = "all" | "pending" | "approved" | "rejected";

const RefundRequestManagement = () => {
  const [activeTab, setActiveTab] = useState<RefundStatusFilter>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Action modal state
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch refund requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const filter = activeTab === "all" ? undefined : activeTab;
      const data = await getAllRefundRequests(filter);
      setRequests(data);
    } catch (error: any) {
      console.error("Error fetching refund requests:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load refund requests",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
  };

  // Open approve modal
  const handleOpenApprove = (request: RefundRequest) => {
    setSelectedRequest(request);
    setActionType("approve");
    setApprovedAmount(request.requested_amount.toString());
    setAdminNotes("");
    setActionModalVisible(true);
  };

  // Open reject modal
  const handleOpenReject = (request: RefundRequest) => {
    setSelectedRequest(request);
    setActionType("reject");
    setAdminNotes("");
    setActionModalVisible(true);
  };

  // Close action modal
  const handleCloseModal = () => {
    if (!submitting) {
      setActionModalVisible(false);
      setSelectedRequest(null);
      setActionType(null);
      setApprovedAmount("");
      setAdminNotes("");
    }
  };

  // Submit approval
  const handleSubmitApproval = async () => {
    if (!selectedRequest) return;

    const amount = parseFloat(approvedAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedRequest.requested_amount) {
      Toast.show({
        type: "error",
        text1: "Invalid Amount",
        text2: `Amount must be between $0.01 and $${selectedRequest.requested_amount.toFixed(2)}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      await approveRefundRequest(
        selectedRequest.id,
        amount,
        adminNotes.trim() || undefined
      );

      Toast.show({
        type: "success",
        text1: "Refund Approved",
        text2: `Refund request for $${amount.toFixed(2)} has been approved`,
      });

      handleCloseModal();
      await fetchRequests();
    } catch (error: any) {
      console.error("Error approving refund:", error);
      Toast.show({
        type: "error",
        text1: "Approval Failed",
        text2: error.message || "Failed to approve refund request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit rejection
  const handleSubmitRejection = async () => {
    if (!selectedRequest) return;

    if (adminNotes.trim().length < 10) {
      Toast.show({
        type: "error",
        text1: "Notes Required",
        text2: "Please provide at least 10 characters explaining the rejection",
      });
      return;
    }

    setSubmitting(true);
    try {
      await rejectRefundRequest(selectedRequest.id, adminNotes.trim());

      Toast.show({
        type: "success",
        text1: "Refund Rejected",
        text2: "Customer has been notified of the rejection",
      });

      handleCloseModal();
      await fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting refund:", error);
      Toast.show({
        type: "error",
        text1: "Rejection Failed",
        text2: error.message || "Failed to reject refund request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter requests by search query
  const filteredRequests = requests.filter((request) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.booking?.service?.name?.toLowerCase().includes(searchLower) ||
      request.customer?.first_name?.toLowerCase().includes(searchLower) ||
      request.customer?.last_name?.toLowerCase().includes(searchLower) ||
      request.customer?.email?.toLowerCase().includes(searchLower) ||
      request.reason.toLowerCase().includes(searchLower) ||
      request.id.toLowerCase().includes(searchLower)
    );
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={16} color="#15803d" />;
      case "rejected":
        return <XCircle size={16} color="#b91c1c" />;
      case "pending":
        return <Clock size={16} color="#854d0e" />;
      default:
        return <AlertCircle size={16} color="#6b7280" />;
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-6 bg-green-700">
        <Text className="text-2xl font-bold text-white">
          Refund Requests
        </Text>
        <Text className="text-white opacity-80 mt-1">
          Review and manage customer refund requests
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        {(["pending", "approved", "rejected", "all"] as RefundStatusFilter[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`flex-1 py-3 ${
              activeTab === tab ? "border-b-2 border-green-600" : ""
            }`}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              className={`text-center font-medium capitalize ${
                activeTab === tab ? "text-green-600" : "text-gray-600"
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search and Refresh */}
      <View className="p-4">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-white rounded-md border border-gray-300 px-3 py-2">
            <Search size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search by customer, service, or reason"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            className="bg-green-600 rounded-md p-2"
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={20}
              color="#ffffff"
              className={refreshing ? "animate-spin" : ""}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Request List */}
      <ScrollView className="flex-1 px-4">
        <Text className="text-lg font-semibold mb-2">
          {activeTab === "all" ? "All Requests" : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests`}
          {` (${filteredRequests.length})`}
        </Text>

        {loading ? (
          <View className="bg-gray-50 rounded-lg p-5 items-center justify-center">
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="text-gray-500 mt-2">Loading requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View className="bg-gray-50 rounded-lg p-5 items-center justify-center">
            <AlertCircle size={48} color="#9ca3af" />
            <Text className="text-gray-500 mt-2">No refund requests found</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <View
              key={request.id}
              className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm"
            >
              {/* Header */}
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <User size={16} color="#6b7280" className="mr-1" />
                    <Text className="font-semibold text-gray-800">
                      {request.customer?.first_name} {request.customer?.last_name}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">
                    {request.customer?.email}
                  </Text>
                </View>
                <View
                  className={`flex-row items-center px-2 py-1 rounded-full ${getStatusColor(
                    request.status
                  )}`}
                >
                  {getStatusIcon(request.status)}
                  <Text className={`ml-1 text-xs font-medium capitalize`}>
                    {request.status}
                  </Text>
                </View>
              </View>

              {/* Service & Amount */}
              <View className="flex-row justify-between mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <FileText size={14} color="#6b7280" className="mr-1" />
                    <Text className="text-sm text-gray-700">
                      {request.booking?.service?.name || "Service"}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    Booking: #{request.booking_id.substring(0, 8)}
                  </Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <DollarSign size={16} color="#16a34a" />
                    <Text className="text-lg font-bold text-green-600">
                      {request.requested_amount.toFixed(2)}
                    </Text>
                  </View>
                  {request.approved_amount && (
                    <Text className="text-xs text-gray-500">
                      Approved: ${request.approved_amount.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Reason */}
              <View className="bg-gray-50 rounded p-2 mb-3">
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Reason:
                </Text>
                <Text className="text-sm text-gray-600">
                  {request.reason}
                </Text>
              </View>

              {/* Admin Notes (if exists) */}
              {request.admin_notes && (
                <View className="bg-blue-50 rounded p-2 mb-3">
                  <Text className="text-xs font-semibold text-blue-700 mb-1">
                    Admin Response:
                  </Text>
                  <Text className="text-sm text-blue-900">
                    {request.admin_notes}
                  </Text>
                </View>
              )}

              {/* Timestamps */}
              <View className="border-t border-gray-100 pt-2 mb-3">
                <Text className="text-xs text-gray-500">
                  Requested: {format(new Date(request.requested_at), "MMM d, yyyy 'at' h:mm a")}
                </Text>
                {request.reviewed_at && (
                  <Text className="text-xs text-gray-500 mt-1">
                    Reviewed: {format(new Date(request.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
                  </Text>
                )}
              </View>

              {/* Actions (only for pending requests) */}
              {request.status === "pending" && (
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-green-500 py-2 rounded-md"
                    onPress={() => handleOpenApprove(request)}
                  >
                    <Check size={16} color="white" />
                    <Text className="ml-1 text-white font-medium">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-red-500 py-2 rounded-md"
                    onPress={() => handleOpenReject(request)}
                  >
                    <X size={16} color="white" />
                    <Text className="ml-1 text-white font-medium">Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Action Modal (Approve/Reject) */}
      <Modal
        visible={actionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[80%]">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-xl font-bold text-gray-800">
                  {actionType === "approve" ? "Approve Refund" : "Reject Refund"}
                </Text>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  disabled={submitting}
                  className="p-2"
                >
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-4 py-4">
                {/* Request Details */}
                {selectedRequest && (
                  <View className="bg-gray-50 rounded-lg p-3 mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Request Details
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Customer: {selectedRequest.customer?.first_name} {selectedRequest.customer?.last_name}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Service: {selectedRequest.booking?.service?.name}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Requested Amount: ${selectedRequest.requested_amount.toFixed(2)}
                    </Text>
                    <Text className="text-sm text-gray-600 italic mt-2">
                      "{selectedRequest.reason}"
                    </Text>
                  </View>
                )}

                {/* Approve-specific fields */}
                {actionType === "approve" && (
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Approved Amount * (You can adjust if needed)
                    </Text>
                    <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <DollarSign size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 ml-2 text-gray-800"
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={approvedAmount}
                        onChangeText={setApprovedAmount}
                        editable={!submitting}
                      />
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">
                      Max: ${selectedRequest?.requested_amount.toFixed(2)}
                    </Text>
                  </View>
                )}

                {/* Admin Notes */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Admin Notes {actionType === "reject" ? "*" : "(Optional)"}
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg p-3 min-h-[100px] text-gray-800"
                    placeholder={
                      actionType === "approve"
                        ? "Optional message to customer..."
                        : "Explain why this request is being rejected (minimum 10 characters)"
                    }
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    editable={!submitting}
                    maxLength={500}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    {adminNotes.length}/500 characters
                    {actionType === "reject" && " (minimum 10 required)"}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="flex-row gap-3 p-4 border-t border-gray-200">
                <TouchableOpacity
                  onPress={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 py-3 rounded-lg"
                >
                  <Text className="text-gray-700 font-semibold text-center">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={
                    actionType === "approve"
                      ? handleSubmitApproval
                      : handleSubmitRejection
                  }
                  disabled={submitting}
                  className={`flex-1 py-3 rounded-lg ${
                    submitting
                      ? "bg-gray-300"
                      : actionType === "approve"
                      ? "bg-green-600"
                      : "bg-red-600"
                  }`}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-center">
                      {actionType === "approve" ? "Approve & Process Refund" : "Reject Request"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default RefundRequestManagement;
