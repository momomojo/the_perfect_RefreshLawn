import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react-native';
import {
  getAdminFeedbackReviews,
  markAdminFeedbackReviewed,
  getPendingAdminFeedbackCount,
} from '../../lib/data';
import type { Review } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import Toast from 'react-native-toast-message';
import { useConfirmation } from '../../lib/confirmation';

export default function AdminFeedback() {
  const { user } = useAuth();
  const { showConfirmation } = useConfirmation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewed, setShowReviewed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFeedback();
  }, [showReviewed]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const [feedbackData, pendingData] = await Promise.all([
        getAdminFeedbackReviews(showReviewed),
        getPendingAdminFeedbackCount(),
      ]);
      setReviews(feedbackData);
      setPendingCount(pendingData);
    } catch (error) {
      console.error('Error loading feedback:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load feedback reviews',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedback();
    setRefreshing(false);
  };

  const handleMarkReviewed = async (reviewId: string) => {
    if (!user?.id) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'User not authenticated',
      });
      return;
    }

    const notes = adminNotes[reviewId]?.trim() || '';

    showConfirmation({
      title: 'Mark as Reviewed',
      message: 'Are you sure you want to mark this feedback as reviewed?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmButtonStyle: 'default',
      onConfirm: async () => {
        try {
          await markAdminFeedbackReviewed(reviewId, user.id, notes);

          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Feedback marked as reviewed',
          });

          // Remove from list or reload
          setReviews(reviews.filter((r) => r.id !== reviewId));
          setPendingCount((prev) => Math.max(0, prev - 1));
          setAdminNotes((prev) => {
            const updated = { ...prev };
            delete updated[reviewId];
            return updated;
          });
          setExpandedReviewId(null);
        } catch (error) {
          console.error('Error marking feedback as reviewed:', error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to mark feedback as reviewed',
          });
        }
      },
    });
  };

  const toggleExpand = (reviewId: string) => {
    if (expandedReviewId === reviewId) {
      setExpandedReviewId(null);
    } else {
      setExpandedReviewId(reviewId);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row">
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <Star
              key={index}
              size={16}
              color={index < rating ? '#f59e0b' : '#d1d5db'}
              fill={index < rating ? '#f59e0b' : 'none'}
            />
          ))}
      </View>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReviewCard = (review: Review) => {
    const isExpanded = expandedReviewId === review.id;
    const isReviewed = review.admin_reviewed;

    return (
      <TouchableOpacity
        key={review.id}
        className={`mb-3 rounded-lg border bg-white p-4 shadow-sm ${
          isReviewed ? 'border-green-200' : 'border-orange-200'
        }`}
        onPress={() => toggleExpand(review.id)}
      >
        {/* Header */}
        <View className="mb-3 flex-row items-start justify-between">
          <View className="flex-1">
            <View className="mb-1 flex-row items-center">
              <User size={16} color="#6b7280" />
              <Text className="ml-2 text-sm font-medium text-gray-700">
                Customer: {review.customer_id.substring(0, 8)}...
              </Text>
            </View>
            <View className="flex-row items-center">
              {renderStars(review.rating)}
              <Text className="ml-2 text-xs text-gray-500">
                {review.rating} star{review.rating !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View
            className={`rounded-full px-3 py-1 ${
              isReviewed ? 'bg-green-100' : 'bg-orange-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                isReviewed ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              {isReviewed ? 'Reviewed' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Feedback Preview */}
        <View className="mb-2 rounded-lg bg-gray-50 p-3">
          <View className="mb-1 flex-row items-start">
            <MessageSquare size={14} color="#6b7280" />
            <Text className="ml-1 text-xs font-semibold text-gray-600">
              Customer Feedback:
            </Text>
          </View>
          <Text
            className="text-sm text-gray-800"
            numberOfLines={isExpanded ? undefined : 2}
          >
            {review.comment || 'No feedback provided'}
          </Text>
        </View>

        {/* Metadata */}
        <View className="flex-row items-center">
          <Clock size={12} color="#9ca3af" />
          <Text className="ml-1 text-xs text-gray-500">
            Submitted {formatDate(review.created_at)}
          </Text>
        </View>

        {/* Expanded Section */}
        {isExpanded && (
          <View className="mt-4 border-t border-gray-200 pt-4">
            {/* Booking Details */}
            <View className="mb-4">
              <Text className="mb-1 text-xs font-semibold text-gray-600">
                Booking Details:
              </Text>
              <Text className="text-xs text-gray-500">
                Booking ID: {review.booking_id.substring(0, 16)}...
              </Text>
              <Text className="text-xs text-gray-500">
                Technician ID: {review.technician_id.substring(0, 16)}...
              </Text>
            </View>

            {/* Admin Review Section */}
            {isReviewed ? (
              <View className="rounded-lg border border-green-200 bg-green-50 p-3">
                <View className="mb-2 flex-row items-center">
                  <CheckCircle size={16} color="#16a34a" />
                  <Text className="ml-2 text-sm font-semibold text-green-700">
                    Reviewed by Admin
                  </Text>
                </View>
                <Text className="mb-2 text-xs text-gray-500">
                  Reviewed on {formatDate(review.admin_reviewed_at)}
                </Text>
                {review.admin_notes && (
                  <View>
                    <Text className="mb-1 text-xs font-semibold text-gray-600">
                      Admin Notes:
                    </Text>
                    <Text className="text-sm text-gray-700">
                      {review.admin_notes}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text className="mb-2 text-sm font-semibold text-gray-700">
                  Admin Notes (Optional):
                </Text>
                <TextInput
                  className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900"
                  placeholder="Enter notes about actions taken or follow-up needed..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={adminNotes[review.id] || ''}
                  onChangeText={(text) =>
                    setAdminNotes((prev) => ({ ...prev, [review.id]: text }))
                  }
                  maxLength={500}
                />
                <TouchableOpacity
                  className="flex-row items-center justify-center rounded-lg bg-green-600 py-3"
                  onPress={() => handleMarkReviewed(review.id)}
                >
                  <CheckCircle size={18} color="white" />
                  <Text className="ml-2 font-semibold text-white">
                    Mark as Reviewed
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!isExpanded && (
          <Text className="mt-2 text-center text-xs text-blue-600">
            Tap to expand
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4">
        <Text className="mb-1 text-2xl font-bold text-gray-900">
          Customer Feedback
        </Text>
        <Text className="text-sm text-gray-600">
          Reviews requiring admin attention
        </Text>
      </View>

      {/* Statistics Bar */}
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="rounded-full bg-orange-100 p-2">
              <MessageSquare size={20} color="#f97316" />
            </View>
            <View className="ml-3">
              <Text className="text-2xl font-bold text-gray-900">
                {pendingCount}
              </Text>
              <Text className="text-xs text-gray-600">Pending Reviews</Text>
            </View>
          </View>

          {/* Filter Toggle */}
          <TouchableOpacity
            className={`flex-row items-center rounded-lg px-4 py-2 ${
              showReviewed ? 'bg-green-100' : 'bg-gray-100'
            }`}
            onPress={() => setShowReviewed(!showReviewed)}
          >
            {showReviewed ? (
              <CheckCircle size={16} color="#16a34a" />
            ) : (
              <Clock size={16} color="#6b7280" />
            )}
            <Text
              className={`ml-2 text-sm font-medium ${
                showReviewed ? 'text-green-700' : 'text-gray-700'
              }`}
            >
              {showReviewed ? 'Reviewed' : 'Pending'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Loading feedback...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {reviews.length === 0 ? (
            <View className="items-center rounded-lg bg-white p-8 shadow-sm">
              <View className="mb-4 rounded-full bg-gray-100 p-4">
                <MessageSquare size={32} color="#9ca3af" />
              </View>
              <Text className="mb-2 text-lg font-semibold text-gray-900">
                No Feedback Found
              </Text>
              <Text className="text-center text-sm text-gray-600">
                {showReviewed
                  ? 'No reviewed feedback to display'
                  : 'No pending feedback reviews at this time'}
              </Text>
            </View>
          ) : (
            <>{reviews.map((review) => renderReviewCard(review))}</>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
