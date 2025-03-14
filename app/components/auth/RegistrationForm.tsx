import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Mail,
  Lock,
  Home,
} from "lucide-react-native";

interface RegistrationFormProps {
  onComplete?: () => void;
}

const RegistrationForm = ({ onComplete = () => {} }: RegistrationFormProps) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const updateFormData = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Submit form
      onComplete();
      router.push("/");
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const selectRole = (role: string) => {
    updateFormData("role", role);
    nextStep();
  };

  const renderStepIndicator = () => {
    return (
      <View className="flex-row justify-center items-center mb-6 mt-2">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="flex-row items-center">
            <View
              className={`h-8 w-8 rounded-full flex items-center justify-center ${i === step ? "bg-green-600" : i < step ? "bg-green-400" : "bg-gray-300"}`}
            >
              {i < step ? (
                <Check size={16} color="white" />
              ) : (
                <Text className="text-white font-bold">{i}</Text>
              )}
            </View>
            {i < 4 && (
              <View
                className={`h-1 w-6 ${i < step ? "bg-green-400" : "bg-gray-300"}`}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPersonalInfoStep = () => {
    return (
      <View className="px-4">
        <Text className="text-xl font-bold mb-6 text-center">
          Personal Information
        </Text>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">First Name</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChangeText={(text) => updateFormData("firstName", text)}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Last Name</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChangeText={(text) => updateFormData("lastName", text)}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(text) => updateFormData("email", text)}
          />
        </View>

        <TouchableOpacity
          className="bg-green-600 py-3 px-6 rounded-lg mt-4 flex-row justify-center items-center"
          onPress={nextStep}
        >
          <Text className="text-white font-semibold mr-2">Continue</Text>
          <ChevronRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPasswordStep = () => {
    return (
      <View className="px-4">
        <Text className="text-xl font-bold mb-6 text-center">
          Create Password
        </Text>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Password</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Create a password"
            secureTextEntry
            value={formData.password}
            onChangeText={(text) => updateFormData("password", text)}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Confirm Password</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Confirm your password"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(text) => updateFormData("confirmPassword", text)}
          />
        </View>

        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            className="border border-gray-300 py-3 px-6 rounded-lg flex-row justify-center items-center"
            onPress={prevStep}
          >
            <ChevronLeft size={20} color="#4B5563" />
            <Text className="text-gray-600 font-semibold ml-2">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-600 py-3 px-6 rounded-lg flex-row justify-center items-center"
            onPress={nextStep}
          >
            <Text className="text-white font-semibold mr-2">Continue</Text>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRoleSelectionStep = () => {
    return (
      <View className="px-4">
        <Text className="text-xl font-bold mb-6 text-center">
          Select Your Role
        </Text>

        <TouchableOpacity
          className={`border ${formData.role === "customer" ? "border-green-600 bg-green-50" : "border-gray-300"} rounded-lg p-4 mb-4 flex-row items-center`}
          onPress={() => selectRole("customer")}
        >
          <View className="bg-green-100 p-3 rounded-full mr-4">
            <User size={24} color="#059669" />
          </View>
          <View>
            <Text className="font-bold text-lg">Customer</Text>
            <Text className="text-gray-600">
              Book lawn care services for your property
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className={`border ${formData.role === "technician" ? "border-green-600 bg-green-50" : "border-gray-300"} rounded-lg p-4 mb-4 flex-row items-center`}
          onPress={() => selectRole("technician")}
        >
          <View className="bg-blue-100 p-3 rounded-full mr-4">
            <User size={24} color="#3B82F6" />
          </View>
          <View>
            <Text className="font-bold text-lg">Technician</Text>
            <Text className="text-gray-600">
              Provide lawn care services to customers
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className={`border ${formData.role === "admin" ? "border-green-600 bg-green-50" : "border-gray-300"} rounded-lg p-4 mb-4 flex-row items-center`}
          onPress={() => selectRole("admin")}
        >
          <View className="bg-purple-100 p-3 rounded-full mr-4">
            <User size={24} color="#8B5CF6" />
          </View>
          <View>
            <Text className="font-bold text-lg">Administrator</Text>
            <Text className="text-gray-600">
              Manage the lawn care service platform
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-gray-300 py-3 px-6 rounded-lg mt-4 flex-row justify-center items-center"
          onPress={prevStep}
        >
          <ChevronLeft size={20} color="#4B5563" />
          <Text className="text-gray-600 font-semibold ml-2">Back</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAddressStep = () => {
    return (
      <View className="px-4">
        <Text className="text-xl font-bold mb-6 text-center">Your Address</Text>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Street Address</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Enter your street address"
            value={formData.address}
            onChangeText={(text) => updateFormData("address", text)}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1">City</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            placeholder="Enter your city"
            value={formData.city}
            onChangeText={(text) => updateFormData("city", text)}
          />
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-gray-700 mb-1">State</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="State"
              value={formData.state}
              onChangeText={(text) => updateFormData("state", text)}
            />
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-gray-700 mb-1">Zip Code</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Zip Code"
              keyboardType="numeric"
              value={formData.zipCode}
              onChangeText={(text) => updateFormData("zipCode", text)}
            />
          </View>
        </View>

        <View className="flex-row justify-between mt-4">
          <TouchableOpacity
            className="border border-gray-300 py-3 px-6 rounded-lg flex-row justify-center items-center"
            onPress={prevStep}
          >
            <ChevronLeft size={20} color="#4B5563" />
            <Text className="text-gray-600 font-semibold ml-2">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-600 py-3 px-6 rounded-lg flex-row justify-center items-center"
            onPress={nextStep}
          >
            <Text className="text-white font-semibold mr-2">Complete</Text>
            <Check size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="bg-white flex-1">
      <View className="py-6 bg-white rounded-lg">
        {renderStepIndicator()}

        {step === 1 && renderPersonalInfoStep()}
        {step === 2 && renderPasswordStep()}
        {step === 3 && renderRoleSelectionStep()}
        {step === 4 && renderAddressStep()}
      </View>
    </ScrollView>
  );
};

export default RegistrationForm;
