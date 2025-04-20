import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

interface BookingBackButtonProps {
  onPress: () => void;
  label?: string;
  style?: any;
}

const BookingBackButton: React.FC<BookingBackButtonProps> = ({ onPress, label = "Back", style }) => (
  <TouchableOpacity
    accessible
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    className="flex-row items-center p-2 bg-white rounded-full shadow"
    style={[{ elevation: 3, alignSelf: "flex-start", marginTop: 18, marginLeft: 12, marginBottom: 8 }, style]}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <ArrowLeft size={20} color="#4B5563" />
    <Text className="ml-2 text-gray-700 font-semibold" style={{ fontSize: 16 }}>{label}</Text>
  </TouchableOpacity>
);

export default BookingBackButton;
