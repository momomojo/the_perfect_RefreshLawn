import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { X, Star, ExternalLink } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

interface GoogleReviewRedirectProps {
  visible: boolean;
  rating: number;
  onClose: () => void;
  onReviewCompleted: () => void;
}

const GoogleReviewRedirect: React.FC<GoogleReviewRedirectProps> = ({
  visible,
  rating,
  onClose,
  onReviewCompleted,
}) => {
  const [opening, setOpening] = useState(false);

  // TODO: Move this to environment variable
  // Get your Google Place ID from: https://developers.google.com/maps/documentation/places/web-service/place-id
  const GOOGLE_PLACE_ID = process.env.EXPO_PUBLIC_GOOGLE_PLACE_ID || '';

  const openGoogleReviews = async () => {
    setOpening(true);

    try {
      let url = '';

      if (GOOGLE_PLACE_ID) {
        // If Place ID is configured, use the direct link
        if (Platform.OS === 'ios') {
          // iOS Google Maps app URL
          url = `comgooglemaps://?q=place_id:${GOOGLE_PLACE_ID}&reviews=true`;

          // Fallback to web if app not installed
          const canOpen = await Linking.canOpenURL(url);
          if (!canOpen) {
            url = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;
          }
        } else if (Platform.OS === 'android') {
          // Android Google Maps app URL
          url = `geo:0,0?q=place_id:${GOOGLE_PLACE_ID}`;

          // Fallback to web if app not installed
          const canOpen = await Linking.canOpenURL(url);
          if (!canOpen) {
            url = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;
          }
        } else {
          // Web fallback
          url = `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`;
        }
      } else {
        // If no Place ID configured, use generic search URL
        // This will open Google search for the business
        const businessName = 'RefreshLawn'; // TODO: Make this configurable
        url = `https://www.google.com/search?q=${encodeURIComponent(businessName + ' reviews')}`;
      }

      console.log('Opening Google Reviews URL:', url);

      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);

        // Mark as completed after a delay (user had time to navigate)
        setTimeout(() => {
          onReviewCompleted();
        }, 1500);
      } else {
        console.error('Cannot open URL:', url);
        Toast.show({
          type: 'error',
          text1: 'Unable to Open',
          text2: 'Unable to open Google Reviews. Please try again later.',
        });
      }
    } catch (error) {
      console.error('Error opening Google Reviews:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to open Google Reviews. Please try again later.',
      });
    } finally {
      setOpening(false);
    }
  };

  const handleSkip = () => {
    onReviewCompleted();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 p-4"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-md rounded-2xl bg-white p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <TouchableOpacity
            className="absolute right-4 top-4 z-10"
            onPress={onClose}
          >
            <X size={24} color="#6b7280" />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-6 items-center">
            <View className="mb-4 rounded-full bg-green-100 p-4">
              <Star size={32} color="#16a34a" fill="#16a34a" />
            </View>
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              Love Your Service?
            </Text>
            <Text className="px-4 text-center text-gray-600">
              Share your experience on Google to help others discover
              RefreshLawn!
            </Text>
          </View>

          {/* Rating Display */}
          <View className="mb-6 flex-row items-center justify-center">
            <Text className="mr-2 text-gray-500">Your rating:</Text>
            {Array(rating)
              .fill(0)
              .map((_, i) => (
                <Star key={i} size={20} color="#facc15" fill="#facc15" />
              ))}
          </View>

          {/* Benefits */}
          <View className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Text className="mb-2 text-sm font-semibold text-blue-900">
              Why review on Google?
            </Text>
            <Text className="text-sm text-blue-800">
              • Help other homeowners find quality lawn care{'\n'}• Support
              small businesses in your community{'\n'}• Takes less than 2
              minutes
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              className={`flex-row items-center justify-center rounded-lg py-4 ${
                opening ? 'bg-green-400' : 'bg-green-600'
              }`}
              onPress={openGoogleReviews}
              disabled={opening}
            >
              {opening ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <ExternalLink size={20} color="white" className="mr-2" />
                  <Text className="ml-2 text-center font-semibold text-white">
                    Leave a Google Review
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="rounded-lg bg-gray-100 py-4"
              onPress={handleSkip}
              disabled={opening}
            >
              <Text className="text-center font-medium text-gray-700">
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>

          {!GOOGLE_PLACE_ID && (
            <View className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <Text className="text-center text-xs text-yellow-800">
                ⚠️ Google Place ID not configured. Using generic search.
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default GoogleReviewRedirect;
