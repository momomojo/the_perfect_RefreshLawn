import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import {
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react-native";

interface BookingFormProps {
  service?: any;
  userProfile?: any;
  onComplete?: (bookingData: BookingData) => void;
  isSubmitting?: boolean;
}

interface BookingData {
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  address: string;
  isRecurring: boolean;
  recurringPlan?: string;
  paymentMethod: string;
  price: number;
}

const BookingForm = ({
  service,
  userProfile,
  onComplete = () => {},
  isSubmitting = false,
}: BookingFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: service?.id || "",
    serviceName: service?.name || "",
    date: "",
    time: "",
    address: userProfile?.address || "",
    isRecurring: false,
    recurringPlan: "",
    paymentMethod: "",
    price: service?.price || 0,
  });

  // Sample service types
  const serviceTypes = [
    {
      id: 1,
      name: "Lawn Mowing",
      price: 45,
      image:
        "https://images.unsplash.com/photo-1589428473816-b2b7632082df?w=400&q=80",
    },
    {
      id: 2,
      name: "Hedge Trimming",
      price: 60,
      image:
        "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=400&q=80",
    },
    {
      id: 3,
      name: "Leaf Removal",
      price: 50,
      image:
        "https://images.unsplash.com/photo-1508470169927-48aff8d2968d?w=400&q=80",
    },
    {
      id: 4,
      name: "Garden Maintenance",
      price: 75,
      image:
        "https://images.unsplash.com/photo-1599685315640-4a9ba2613f46?w=400&q=80",
    },
  ];

  // Sample dates
  const availableDates = [
    "2023-10-15",
    "2023-10-16",
    "2023-10-17",
    "2023-10-18",
    "2023-10-19",
  ];

  // Sample time slots
  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
  ];

  // Sample recurring plans
  const recurringPlans = [
    { id: 1, name: "Weekly", discount: "10%" },
    { id: 2, name: "Bi-weekly", discount: "5%" },
    { id: 3, name: "Monthly", discount: "3%" },
  ];

  // Sample payment methods
  const paymentMethods = [
    { id: 1, name: "Credit Card", last4: "4242" },
    { id: 2, name: "PayPal", email: "user@example.com" },
  ];

  const handleServiceSelect = (serviceName: string) => {
    setBookingData({ ...bookingData, serviceName: serviceName });
    nextStep();
  };

  const handleDateSelect = (date: string) => {
    setBookingData({ ...bookingData, date });
    nextStep();
  };

  const handleTimeSelect = (time: string) => {
    setBookingData({ ...bookingData, time });
    nextStep();
  };

  const handleAddressSubmit = (address: string) => {
    setBookingData({ ...bookingData, address });
    nextStep();
  };

  const handleRecurringToggle = (isRecurring: boolean) => {
    setBookingData({ ...bookingData, isRecurring });
    if (!isRecurring) nextStep();
  };

  const handleRecurringPlanSelect = (plan: string) => {
    setBookingData({ ...bookingData, recurringPlan: plan });
    nextStep();
  };

  const handlePaymentMethodSelect = (method: string) => {
    setBookingData({ ...bookingData, paymentMethod: method });
    nextStep();
  };

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(bookingData);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View className="flex-row justify-between items-center mb-6 px-4">
        {[1, 2, 3, 4, 5, 6, 7].map((step) => (
          <View
            key={step}
            className={`h-2 w-2 rounded-full ${
              step === currentStep
                ? "bg-green-500"
                : step < currentStep
                ? "bg-gray-400"
                : "bg-gray-200"
            }`}
          />
        ))}
      </View>
    );
  };

  const renderServiceTypeStep = () => {
    return (
      <View className="flex-1">
        <Text className="text-xl font-bold mb-4 px-4">Select Service Type</Text>
        <ScrollView className="flex-1">
          {serviceTypes.map((service) => (
            <TouchableOpacity
              key={service.id}
              className="flex-row items-center bg-white rounded-lg p-4 mb-3 mx-4 shadow-sm"
              onPress={() => handleServiceSelect(service.name)}
            >
              <Image
                source={{ uri: service.image }}
                className="w-16 h-16 rounded-md mr-4"
              />
              <View className="flex-1">
                <Text className="text-lg font-semibold">{service.name}</Text>
                <Text className="text-gray-600">${service.price}</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDateSelectionStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Select Date</Text>
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-lg font-semibold mb-2">
            Service: {bookingData.serviceName}
          </Text>
        </View>
        <ScrollView className="flex-1">
          {availableDates.map((date) => (
            <TouchableOpacity
              key={date}
              className="flex-row items-center justify-between bg-white rounded-lg p-4 mb-3 shadow-sm"
              onPress={() => handleDateSelect(date)}
            >
              <View className="flex-row items-center">
                <Calendar size={20} color="#10B981" className="mr-3" />
                <Text className="text-lg">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTimeSelectionStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Select Time</Text>
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-lg font-semibold mb-2">
            Service: {bookingData.serviceName}
          </Text>
          <Text className="text-gray-600">
            Date:{" "}
            {new Date(bookingData.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
        <ScrollView className="flex-1">
          <View className="flex-row flex-wrap justify-between">
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                className="bg-white rounded-lg p-4 mb-3 shadow-sm w-[48%] flex-row items-center justify-center"
                onPress={() => handleTimeSelect(time)}
              >
                <Clock size={18} color="#10B981" className="mr-2" />
                <Text className="text-lg">{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderAddressStep = () => {
    // For demo purposes, we'll use a pre-filled address
    const demoAddress = "123 Main Street, Anytown, USA";

    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Confirm Property Address</Text>
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-lg font-semibold mb-2">Service Details:</Text>
          <Text className="text-gray-600 mb-1">{bookingData.serviceName}</Text>
          <Text className="text-gray-600 mb-1">
            {new Date(bookingData.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text className="text-gray-600">{bookingData.time}</Text>
        </View>

        <TouchableOpacity
          className="bg-white rounded-lg p-4 mb-3 shadow-sm flex-row items-center"
          onPress={() => handleAddressSubmit(demoAddress)}
        >
          <MapPin size={20} color="#10B981" className="mr-3" />
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1">Current Address</Text>
            <Text className="text-gray-600">{demoAddress}</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-lg p-4 mb-3 shadow-sm flex-row items-center"
          onPress={() => {}}
        >
          <MapPin size={20} color="#9CA3AF" className="mr-3" />
          <Text className="text-lg text-gray-600">Add New Address</Text>
          <ChevronRight size={20} color="#9CA3AF" className="ml-auto" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecurringStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Recurring Service?</Text>
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-lg font-semibold mb-2">Service Details:</Text>
          <Text className="text-gray-600 mb-1">{bookingData.serviceName}</Text>
          <Text className="text-gray-600 mb-1">
            {new Date(bookingData.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text className="text-gray-600 mb-1">{bookingData.time}</Text>
          <Text className="text-gray-600">{bookingData.address}</Text>
        </View>

        <View className="flex-row justify-between mb-6">
          <TouchableOpacity
            className={`bg-white rounded-lg p-4 shadow-sm w-[48%] items-center ${
              bookingData.isRecurring ? "border-2 border-green-500" : ""
            }`}
            onPress={() => handleRecurringToggle(true)}
          >
            <Text className="text-lg font-semibold mb-2">Yes</Text>
            <Text className="text-gray-600 text-center">
              Save with recurring service plans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`bg-white rounded-lg p-4 shadow-sm w-[48%] items-center ${
              !bookingData.isRecurring ? "border-2 border-green-500" : ""
            }`}
            onPress={() => handleRecurringToggle(false)}
          >
            <Text className="text-lg font-semibold mb-2">No</Text>
            <Text className="text-gray-600 text-center">
              One-time service only
            </Text>
          </TouchableOpacity>
        </View>

        {bookingData.isRecurring && (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <Text className="text-lg font-semibold mb-3">Select Plan:</Text>
            {recurringPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                className="flex-row items-center justify-between mb-3 pb-3 border-b border-gray-100"
                onPress={() => handleRecurringPlanSelect(plan.name)}
              >
                <View>
                  <Text className="text-lg">{plan.name}</Text>
                  <Text className="text-green-500">
                    {plan.discount} discount
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPaymentStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Payment Method</Text>
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-lg font-semibold mb-2">Service Summary:</Text>
          <Text className="text-gray-600 mb-1">{bookingData.serviceName}</Text>
          <Text className="text-gray-600 mb-1">
            {new Date(bookingData.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text className="text-gray-600 mb-1">{bookingData.time}</Text>
          <Text className="text-gray-600 mb-1">{bookingData.address}</Text>
          {bookingData.isRecurring && (
            <Text className="text-gray-600">
              {bookingData.recurringPlan} Plan
            </Text>
          )}
        </View>

        <ScrollView className="flex-1">
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              className="flex-row items-center bg-white rounded-lg p-4 mb-3 shadow-sm"
              onPress={() => handlePaymentMethodSelect(method.name)}
            >
              <CreditCard size={24} color="#10B981" className="mr-3" />
              <View className="flex-1">
                <Text className="text-lg font-semibold">{method.name}</Text>
                {method.last4 && (
                  <Text className="text-gray-600">
                    **** **** **** {method.last4}
                  </Text>
                )}
                {method.email && (
                  <Text className="text-gray-600">{method.email}</Text>
                )}
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            className="flex-row items-center bg-white rounded-lg p-4 mb-3 shadow-sm"
            onPress={() => {}}
          >
            <CreditCard size={24} color="#9CA3AF" className="mr-3" />
            <Text className="text-lg text-gray-600">
              Add New Payment Method
            </Text>
            <ChevronRight size={20} color="#9CA3AF" className="ml-auto" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderConfirmationStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Booking Confirmation</Text>
        <View className="bg-white rounded-lg p-5 shadow-sm mb-4">
          <View className="items-center mb-4">
            <View className="bg-green-100 rounded-full p-3 mb-2">
              <Check size={32} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-green-500">
              Booking Confirmed!
            </Text>
          </View>

          <View className="border-t border-gray-200 pt-4 mt-2">
            <Text className="text-lg font-semibold mb-3">Service Details:</Text>
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Service:</Text>
              <Text className="font-medium flex-1">
                {bookingData.serviceName}
              </Text>
            </View>
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Date:</Text>
              <Text className="font-medium flex-1">
                {new Date(bookingData.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Time:</Text>
              <Text className="font-medium flex-1">{bookingData.time}</Text>
            </View>
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Address:</Text>
              <Text className="font-medium flex-1">{bookingData.address}</Text>
            </View>
            {bookingData.isRecurring && (
              <View className="flex-row mb-2">
                <Text className="text-gray-600 w-1/3">Plan:</Text>
                <Text className="font-medium flex-1">
                  {bookingData.recurringPlan}
                </Text>
              </View>
            )}
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Payment:</Text>
              <Text className="font-medium flex-1">
                {bookingData.paymentMethod}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="bg-green-500 rounded-lg py-4 items-center"
          onPress={() => onComplete(bookingData)}
        >
          <Text className="text-white font-bold text-lg">View My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderServiceTypeStep();
      case 2:
        return renderDateSelectionStep();
      case 3:
        return renderTimeSelectionStep();
      case 4:
        return renderAddressStep();
      case 5:
        return renderRecurringStep();
      case 6:
        return renderPaymentStep();
      case 7:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {renderStepIndicator()}
      {renderCurrentStep()}

      {currentStep < 7 && currentStep > 1 && (
        <View className="flex-row justify-between px-4 py-4">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={prevStep}
          >
            <ArrowLeft size={20} color="#4B5563" />
            <Text className="text-gray-600 ml-2">Back</Text>
          </TouchableOpacity>

          {/* Skip button for recurring step if needed */}
          {currentStep === 5 && !bookingData.isRecurring && (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={nextStep}
            >
              <Text className="text-gray-600 mr-2">Next</Text>
              <ArrowRight size={20} color="#4B5563" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default BookingForm;
