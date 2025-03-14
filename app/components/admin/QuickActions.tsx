import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Plus, Users, Leaf, BarChart3, CreditCard } from "lucide-react-native";

interface QuickActionsProps {
  onAddUser?: () => void;
  onAddService?: () => void;
  onGenerateReport?: () => void;
  onManagePayments?: () => void;
}

const QuickActions = ({
  onAddUser = () => {},
  onAddService = () => {},
  onGenerateReport = () => {},
  onManagePayments = () => {},
}: QuickActionsProps) => {
  const actions = [
    {
      icon: <Users size={24} color="#ffffff" />,
      label: "Add User",
      onPress: onAddUser,
      bgColor: "bg-blue-500",
    },
    {
      icon: <Leaf size={24} color="#ffffff" />,
      label: "Add Service",
      onPress: onAddService,
      bgColor: "bg-green-500",
    },
    {
      icon: <BarChart3 size={24} color="#ffffff" />,
      label: "Reports",
      onPress: onGenerateReport,
      bgColor: "bg-purple-500",
    },
    {
      icon: <CreditCard size={24} color="#ffffff" />,
      label: "Payments",
      onPress: onManagePayments,
      bgColor: "bg-orange-500",
    },
  ];

  return (
    <View className="bg-white p-4 rounded-lg shadow-sm">
      <View className="flex-row items-center mb-3">
        <Text className="text-lg font-bold text-gray-800">Quick Actions</Text>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            className={`${action.bgColor} p-3 rounded-lg mb-2 items-center justify-center w-[48%]`}
            onPress={action.onPress}
          >
            <View className="items-center">
              {action.icon}
              <Text className="text-white font-medium mt-1">
                {action.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default QuickActions;
