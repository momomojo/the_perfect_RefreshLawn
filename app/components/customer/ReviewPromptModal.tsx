import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { Booking } from '../../../lib/data';

interface ReviewPromptModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onRatingSubmit: (rating: number) => void;
  onRateLater: () => void;
}

const ReviewPromptModal: React.FC<ReviewPromptModalProps> = ({
  visible,
  booking,
  onClose,
  onRatingSubmit,
  onRateLater,
}) => {
  // MUST call hooks before any conditional logic (Rules of Hooks)
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Safety check: Prevent showing modal for already-reviewed or invalid bookings
  if (!booking || booking.review) {
    console.log(
      '[ReviewPromptModal] Booking already reviewed or invalid, preventing display'
    );
    if (visible) {
      onClose(); // Auto-close if visible
    }
    return null;
  }

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) return;

    setSubmitting(true);
    await onRatingSubmit(selectedRating);
    setSubmitting(false);

    // Reset state after submission
    setSelectedRating(0);
    setHoveredRating(0);
  };

  const handleClose = () => {
    setSelectedRating(0);
    setHoveredRating(0);
    onClose();
  };

  if (!booking) return null;

  const displayRating = hoveredRating || selectedRating;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 p-4"
        onPress={handleClose}
      >
        <Pressable
          className="w-full max-w-md rounded-2xl bg-white p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <TouchableOpacity
            className="absolute right-4 top-4 z-10"
            onPress={handleClose}
          >
            <X size={24} color="#6b7280" />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-6 items-center">
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              Rate Your Service
            </Text>
            <Text className="text-center text-gray-600">
              How was your {booking.service?.name || 'service'} experience?
            </Text>
          </View>

          {/* Star Rating */}
          <View className="mb-6 flex-row items-center justify-center">
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => handleStarPress(rating)}
                onPressIn={() => setHoveredRating(rating)}
                onPressOut={() => setHoveredRating(0)}
                className="mx-1 p-2"
              >
                <Star
                  size={40}
                  color={rating <= displayRating ? '#facc15' : '#d1d5db'}
                  fill={rating <= displayRating ? '#facc15' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Text */}
          {selectedRating > 0 && (
            <Text className="mb-6 text-center text-gray-700">
              {selectedRating === 5 && 'Excellent! 🌟'}
              {selectedRating === 4 && 'Great! 👍'}
              {selectedRating === 3 && 'Good 👌'}
              {selectedRating === 2 && 'Could be better 😐'}
              {selectedRating === 1 && 'Needs improvement 😞'}
            </Text>
          )}

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              className={`rounded-lg py-3 ${
                selectedRating === 0 || submitting
                  ? 'bg-gray-300'
                  : 'bg-green-600'
              }`}
              onPress={handleSubmit}
              disabled={selectedRating === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center font-semibold text-white">
                  Submit Rating
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-lg bg-gray-100 py-3"
              onPress={() => {
                onRateLater();
                handleClose();
              }}
              disabled={submitting}
            >
              <Text className="text-center font-medium text-gray-700">
                Rate Later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Service Info */}
          <View className="mt-4 border-t border-gray-200 pt-4">
            <Text className="text-center text-sm text-gray-500">
              Booking completed on{' '}
              {new Date(booking.scheduled_date).toLocaleDateString()}
            </Text>
            {booking.technician && (
              <Text className="mt-1 text-center text-sm text-gray-500">
                Service by {booking.technician.first_name}{' '}
                {booking.technician.last_name}
              </Text>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ReviewPromptModal;
