import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, MessageSquare } from 'lucide-react-native';

interface LowRatingFeedbackModalProps {
  visible: boolean;
  rating: number;
  onClose: () => void;
  onSubmitFeedback: (feedback: string) => void;
  onSkip: () => void;
}

const LowRatingFeedbackModal: React.FC<LowRatingFeedbackModalProps> = ({
  visible,
  rating,
  onClose,
  onSubmitFeedback,
  onSkip,
}) => {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // Validate minimum length
    if (feedback.trim().length < 20) {
      setError('Please provide at least 20 characters of feedback');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmitFeedback(feedback.trim());

      // Reset state after submission
      setFeedback('');
      setError('');
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setFeedback('');
    setError('');
    onSkip();
  };

  const handleClose = () => {
    setFeedback('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleClose}
        >
          <Pressable
            className="max-h-[80%] rounded-t-3xl bg-white p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Close button */}
              <TouchableOpacity
                className="absolute right-4 top-4 z-10"
                onPress={handleClose}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>

              {/* Header */}
              <View className="mb-6 items-center">
                <View className="mb-4 rounded-full bg-orange-100 p-4">
                  <MessageSquare size={32} color="#f97316" />
                </View>
                <Text className="mb-2 text-2xl font-bold text-gray-900">
                  Help Us Improve
                </Text>
                <Text className="px-4 text-center text-gray-600">
                  We're sorry your experience wasn't perfect. Your feedback
                  helps us serve you better.
                </Text>
              </View>

              {/* Feedback Input */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  What could we have done better?
                </Text>
                <TextInput
                  className="min-h-[120px] rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-900"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  placeholder="Please share specific details about your experience (minimum 20 characters)..."
                  placeholderTextColor="#9ca3af"
                  value={feedback}
                  onChangeText={(text) => {
                    setFeedback(text);
                    setError('');
                  }}
                  maxLength={500}
                />
                <View className="mt-2 flex-row justify-between">
                  {error ? (
                    <Text className="text-sm text-red-500">{error}</Text>
                  ) : (
                    <Text className="text-sm text-gray-500">
                      {feedback.trim().length}/500 characters
                    </Text>
                  )}
                  <Text
                    className={`text-sm ${
                      feedback.trim().length >= 20
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {feedback.trim().length >= 20
                      ? '✓ Ready'
                      : `${20 - feedback.trim().length} more`}
                  </Text>
                </View>
              </View>

              {/* Privacy Notice */}
              <View className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <Text className="text-xs text-blue-800">
                  📌 This feedback will be sent to our admin team for review and
                  won't be made public. We may contact you for additional
                  details.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  className={`rounded-lg py-4 ${
                    feedback.trim().length < 20 || submitting
                      ? 'bg-gray-300'
                      : 'bg-orange-600'
                  }`}
                  onPress={handleSubmit}
                  disabled={feedback.trim().length < 20 || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-center font-semibold text-white">
                      Submit Feedback
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="rounded-lg bg-gray-100 py-4"
                  onPress={handleSkip}
                  disabled={submitting}
                >
                  <Text className="text-center font-medium text-gray-700">
                    Skip for Now
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default LowRatingFeedbackModal;
