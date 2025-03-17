import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Scissors, Leaf, Droplets, Calendar, Trash } from "lucide-react-native";

interface QuickBookingProps {
  onServiceSelect?: (serviceType: string) => void;
  services?: Array<{
    id: string;
    name: string;
    icon: "mowing" | "fertilizing" | "cleanup" | "irrigation" | "schedule";
  }>;
}

const QuickBooking = ({
  onServiceSelect = () => {},
  services = [
    { id: "1", name: "Lawn Mowing", icon: "mowing" },
    { id: "2", name: "Fertilizing", icon: "fertilizing" },
    { id: "3", name: "Yard Cleanup", icon: "cleanup" },
    { id: "4", name: "Irrigation", icon: "irrigation" },
    { id: "5", name: "Schedule Service", icon: "schedule" },
  ],
}: QuickBookingProps) => {
  const renderIcon = (
    iconType: string,
    size: number = 24,
    color: string = "#ffffff"
  ) => {
    switch (iconType) {
      case "mowing":
        return <Scissors size={size} color={color} />;
      case "fertilizing":
        return <Leaf size={size} color={color} />;
      case "cleanup":
        return <Trash size={size} color={color} />;
      case "irrigation":
        return <Droplets size={size} color={color} />;
      case "schedule":
        return <Calendar size={size} color={color} />;
      default:
        return <Scissors size={size} color={color} />;
    }
  };

  return (
    <View
      style={{
        backgroundColor: "white",
        padding: 16,
        borderRadius: 8,
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 12,
          color: "#1f2937",
        }}
      >
        Quick Booking
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row" }}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#16a34a",
                marginRight: 12,
              }}
              onPress={() => onServiceSelect(service.name)}
              activeOpacity={0.7}
            >
              <View style={{ alignItems: "center" }}>
                {renderIcon(service.icon)}
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {service.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default QuickBooking;
