import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
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
import {
  getRecurringPlans,
  getServices,
  RecurringPlan,
  Service,
  Profile,
} from "../../../lib/data";
import { format, addDays } from "date-fns";

interface BookingFormProps {
  service?: Service | null;
  userProfile?: Profile | null;
  onComplete?: (bookingData: BookingFormData) => void;
  isSubmitting?: boolean;
}

export interface BookingFormData {
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
  const [bookingData, setBookingData] = useState<BookingFormData>({
    serviceId: service?.id || "",
    serviceName: service?.name || "",
    date: "",
    time: "",
    address: userProfile?.address || "",
    isRecurring: false,
    recurringPlan: "",
    paymentMethod: "",
    price: service?.base_price || 0,
  });

  const [services, setServices] = useState<Service[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate dates for next 14 days
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);
      dates.push(format(date, "yyyy-MM-dd"));
    }
    return dates;
  };

  const availableDates = generateAvailableDates();

  // Generate time slots from 8 AM to 5 PM
  const timeSlots = [
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
  ];

  // Get real data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!service) {
          // Only fetch services if not provided by parent
          const servicesData = await getServices();
          setServices(servicesData);
        }

        // Always fetch recurring plans
        const plansData = await getRecurringPlans();
        setRecurringPlans(plansData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [service]);

  // Set service information if provided by parent
  useEffect(() => {
    if (service) {
      setBookingData((prev) => ({
        ...prev,
        serviceId: service.id,
        serviceName: service.name,
        price: service.base_price,
      }));

      // Skip the service selection step if a service is already provided
      if (currentStep === 1) {
        setCurrentStep(2); // Move to date selection
      }
    }
  }, [service, currentStep]);

  // Payment methods as a constant
  const paymentMethods = [
    { id: "cash", name: "Cash on Delivery" },
    { id: "card", name: "Credit Card", last4: "Add a new card" },
  ];

  const handleServiceSelect = (id: string, name: string, price: number) => {
    setBookingData({
      ...bookingData,
      serviceId: id,
      serviceName: name,
      price: price,
    });
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

  const handleRecurringPlanSelect = (planId: string) => {
    setBookingData({ ...bookingData, recurringPlan: planId });
    nextStep();
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setBookingData({ ...bookingData, paymentMethod: methodId });
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
    if (loading) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#16a34a" />
          <Text className="mt-4 text-gray-600">Loading services...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1">
        <Text className="text-xl font-bold mb-4 px-4">Select Service Type</Text>
        <ScrollView className="flex-1">
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              className="flex-row items-center bg-white rounded-lg p-4 mb-3 mx-4 shadow-sm"
              onPress={() =>
                handleServiceSelect(
                  service.id,
                  service.name,
                  service.base_price
                )
              }
            >
              <Image
                source={{
                  uri:
                    service.image_url ||
                    "https://images.unsplash.com/photo-1589428473816-b2b7632082df?w=400&q=80",
                }}
                className="w-16 h-16 rounded-md mr-4"
              />
              <View className="flex-1">
                <Text className="text-lg font-semibold">{service.name}</Text>
                <Text className="text-gray-600">${service.base_price}</Text>
                {service.description && (
                  <Text
                    className="text-gray-500 text-sm mt-1"
                    numberOfLines={2}
                  >
                    {service.description}
                  </Text>
                )}
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
    // Use profile address or fallback to default
    const demoAddress = userProfile?.address || "123 Main Street, Anytown, USA";

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
        <Text className="text-xl font-bold mb-4">Recurring Service</Text>
        <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <Text className="text-lg font-semibold">
            Would you like to schedule this as a recurring service?
          </Text>
          <Text className="text-gray-600 mt-2">
            Save by setting up regular maintenance
          </Text>

          <View className="flex-row mt-6 gap-3">
            <TouchableOpacity
              className={`flex-1 p-4 rounded-lg ${
                bookingData.isRecurring
                  ? "bg-green-100 border-2 border-green-500"
                  : "bg-gray-100 border-2 border-gray-200"
              }`}
              onPress={() => handleRecurringToggle(true)}
            >
              <Text
                className={`text-center font-semibold ${
                  bookingData.isRecurring ? "text-green-600" : "text-gray-600"
                }`}
              >
                Yes, make it recurring
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-4 rounded-lg ${
                !bookingData.isRecurring
                  ? "bg-green-100 border-2 border-green-500"
                  : "bg-gray-100 border-2 border-gray-200"
              }`}
              onPress={() => handleRecurringToggle(false)}
            >
              <Text
                className={`text-center font-semibold ${
                  !bookingData.isRecurring ? "text-green-600" : "text-gray-600"
                }`}
              >
                No, one-time only
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {bookingData.isRecurring && (
          <View className="mb-4">
            <Text className="text-lg font-semibold mb-3">Select Plan</Text>
            <ScrollView>
              {recurringPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  className="flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-3"
                  onPress={() => handleRecurringPlanSelect(plan.id)}
                >
                  <View>
                    <Text className="text-lg font-medium">{plan.name}</Text>
                    <Text className="text-gray-600">{plan.description}</Text>
                    {Number(plan.discount_percentage) > 0 && (
                      <Text className="text-green-600 mt-1">
                        Save {plan.discount_percentage}%
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="mt-auto">
          <TouchableOpacity
            className="bg-gray-100 rounded-lg py-3 px-4 mb-3"
            onPress={prevStep}
          >
            <Text className="text-center text-gray-600 font-semibold">
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPaymentStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Payment Method</Text>
        <ScrollView className="flex-1">
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              className="flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-3"
              onPress={() => handlePaymentMethodSelect(method.id)}
            >
              <View className="flex-row items-center">
                <View className="bg-gray-100 p-2 rounded-full mr-3">
                  <CreditCard size={24} color="#4B5563" />
                </View>
                <View>
                  <Text className="text-lg font-medium">{method.name}</Text>
                  {method.last4 && (
                    <Text className="text-gray-600">
                      {method.card_brand ? `${method.card_brand} •••• ` : ""}
                      {method.last4}
                    </Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="mt-auto">
          <TouchableOpacity
            className="bg-gray-100 rounded-lg py-3 px-4 mb-3"
            onPress={prevStep}
          >
            <Text className="text-center text-gray-600 font-semibold">
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConfirmationStep = () => {
    const selectedPlan = recurringPlans.find(
      (plan) => plan.id === bookingData.recurringPlan
    );
    const selectedPaymentMethod = paymentMethods.find(
      (method) => method.id === bookingData.paymentMethod
    );

    return (
      <View className="flex-1 px-4">
        <Text className="text-xl font-bold mb-4">Booking Confirmation</Text>
        <View className="bg-white rounded-lg p-5 shadow-sm mb-4">
          <View className="items-center mb-4">
            <View className="bg-green-100 rounded-full p-3 mb-2">
              <Check size={32} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-green-500">
              Ready to Book!
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
                  {selectedPlan?.name || "Custom plan"}
                </Text>
              </View>
            )}
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Payment:</Text>
              <Text className="font-medium flex-1">
                {selectedPaymentMethod?.name || bookingData.paymentMethod}
              </Text>
            </View>
            <View className="flex-row mb-2">
              <Text className="text-gray-600 w-1/3">Total:</Text>
              <Text className="font-medium flex-1 text-green-600">
                ${bookingData.price.toFixed(2)}
                {bookingData.isRecurring &&
                  selectedPlan?.discount_percentage &&
                  ` (Save ${selectedPlan.discount_percentage}% with recurring plan)`}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="bg-green-500 rounded-lg py-4 items-center"
          onPress={() => onComplete(bookingData)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Confirm Booking
            </Text>
          )}
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
