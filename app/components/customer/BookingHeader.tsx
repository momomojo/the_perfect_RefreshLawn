import React from "react";
import { View, Text } from "react-native";
import BookingBackButton from "../common/BookingBackButton";

interface BookingHeaderProps {
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  title?: string;
}

const BookingHeader: React.FC<BookingHeaderProps> = ({ onBack, currentStep, totalSteps, title }) => {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <BookingBackButton onPress={onBack} />
      <View className="flex-1 items-center">
        {title ? (
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        ) : null}
        <View className="flex-row mt-1">
          {[...Array(totalSteps)].map((_, idx) => (
            <View
              key={idx}
              className={`h-2 w-2 rounded-full mx-0.5 ${idx + 1 === currentStep ? "bg-green-500" : idx + 1 < currentStep ? "bg-gray-400" : "bg-gray-200"}`}
            />
          ))}
        </View>
      </View>
      {/* For spacing/alignment, empty right side */}
      <View style={{ width: 32 }} />
    </View>
  );
};

export default BookingHeader;
