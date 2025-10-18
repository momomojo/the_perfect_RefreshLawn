import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { X, AlertCircle, DollarSign, FileText } from "lucide-react-native";
import { createRefundRequest } from "../../../lib/data";
import Toast from "react-native-toast-message";

interface RefundRequestModalProps {
  visible: boolean;
  onClose: () => void;
  booking: {
    id: string;
    service?: { name: string };
    price: number;
  };
  onSuccess?: () => void;
}

const REFUND_POLICY = `RefreshLawn Refund Policy

Refunds are granted for covered reasons, including:
• Property damage caused by our service
• Significant tardiness (more than 30 minutes late)
• Service not performed as scheduled
• Poor quality of service (must be reported within 48 hours)
• Incorrect service delivered

Refunds must be requested within 14 days of service completion. All refund requests are subject to review and approval by our team. We reserve the right to request photos or additional documentation before processing.

Refunds are not granted for:
• Change of mind after service completion
• Weather-related delays beyond our control
• Access issues caused by customer
• Minor aesthetic preferences

Approved refunds are processed within 5-7 business days.`;

export default function RefundRequestModal({
  visible,
  onClose,
  booking,
  onSuccess,
}: RefundRequestModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate reason length (minimum 20 characters)
    if (reason.trim().length < 20) {
      Toast.show({
        type: "error",
        text1: "Reason Too Short",
        text2: "Please provide at least 20 characters explaining your refund request.",
      });
      return;
    }

    setLoading(true);

    try {
      await createRefundRequest(booking.id, reason.trim());

      Toast.show({
        type: "success",
        text1: "Refund Request Submitted",
        text2: "We'll review your request and respond within 2-3 business days.",
      });

      setReason(""); // Clear form
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error submitting refund request:", error);
      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: error.message || "Failed to submit refund request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      onClose();
    }
  };

  // Platform-aware rendering: Web uses div overlay, Native uses Modal
  if (!visible) return null;

  const modalContent = (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={Platform.OS === "web" ? { position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } : undefined}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        style={Platform.OS === "web" ? { backgroundColor: "rgba(0, 0, 0, 0.5)" } : undefined}
        onPress={handleClose}
      >
        <Pressable
          className="bg-white rounded-t-3xl max-h-[90%]"
          style={Platform.OS === "web" ? { maxHeight: "90vh" } : undefined}
          onPress={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">
                Request Refund
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="px-4 py-2"
              showsVerticalScrollIndicator={false}
            >
              {/* Booking Details */}
              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Service Details
                </Text>
                <View className="flex-row items-center mb-1">
                  <FileText size={16} color="#6b7280" className="mr-2" />
                  <Text className="text-gray-600">
                    {booking.service?.name || "Service"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <DollarSign size={16} color="#6b7280" className="mr-2" />
                  <Text className="text-gray-600">
                    ${booking.price.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Refund Policy */}
              <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <View className="flex-row items-center mb-2">
                  <AlertCircle size={18} color="#3b82f6" className="mr-2" />
                  <Text className="text-sm font-semibold text-blue-800">
                    Important: Refund Policy
                  </Text>
                </View>
                <Text className="text-xs text-blue-700 leading-5 whitespace-pre-line">
                  {REFUND_POLICY}
                </Text>
              </View>

              {/* Reason Input */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Reason for Refund Request *
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg p-3 min-h-[120px] text-gray-800"
                  placeholder="Please explain why you're requesting a refund (minimum 20 characters)"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={reason}
                  onChangeText={setReason}
                  editable={!loading}
                  maxLength={500}
                />
                <Text className="text-xs text-gray-500 mt-1">
                  {reason.length}/500 characters (minimum 20 required)
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row gap-3 p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading || reason.trim().length < 20}
                className={`flex-1 py-3 rounded-lg ${
                  loading || reason.trim().length < 20
                    ? "bg-gray-300"
                    : "bg-green-600"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-center">
                    Submit Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
  );

  // Platform-specific wrapper
  if (Platform.OS === "web") {
    // Web: Return modal content directly with fixed positioning (no Modal wrapper)
    return modalContent;
  } else {
    // Native (iOS/Android): Use React Native Modal component
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        {modalContent}
      </Modal>
    );
  }
}
