import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Home,
  X,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth'; // Correct import for user authentication
import BookingHeader from './BookingHeader';
import {
  getRecurringPlans,
  getServices,
  RecurringPlan,
  Service,
  Profile,
  getSavedProperties,
  SavedProperty,
  getAvailableDates,
  getAvailableTimeSlots,
  AvailableTimeSlot,
} from '../../../lib/data';
import { format, addDays } from 'date-fns';
import { showNotification } from '@/lib/notification'; // Import the utility
import { TextInput } from 'react-native';
import AddPaymentMethodModal from '../common/AddPaymentMethodModal';

interface StripePaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
  };
  billing_details: {
    name?: string | null;
  };
  is_default?: boolean;
}

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
  paymentMethodDetails?: StripePaymentMethod | { id: 'cash'; name: 'Cash' };
  notes?: string;
  propertySize?: string; // e.g., "small", "medium", "large" or sq ft
  areaType?: string; // e.g., "front yard", "back yard", "full property"
}

const BookingForm = ({
  service,
  userProfile,
  onComplete = () => {},
  isSubmitting = false,
}: BookingFormProps) => {
  const { user } = useAuth(); // Get user from auth context
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [availableDates, setAvailableDates] = useState<
    { available_date: string; technician_count: number }[]
  >([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    AvailableTimeSlot[]
  >([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<StripePaymentMethod[]>(
    []
  );
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [isAddCardModalVisible, setIsAddCardModalVisible] = useState(false);

  const [bookingData, setBookingData] = useState<BookingFormData>({
    serviceId: service?.id || '',
    serviceName: service?.name || '',
    date: '',
    time: '',
    address: userProfile?.address || '',
    isRecurring: false,
    recurringPlan: undefined,
    paymentMethod: '',
    price: service?.base_price || 0,
    paymentMethodDetails: undefined,
    notes: '',
    propertySize: '',
    areaType: '',
  });

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
        console.error('Error fetching data:', error);
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

  // Load available dates when reaching date selection step
  useEffect(() => {
    if (currentStep === 2 && bookingData.serviceId) {
      loadAvailableDates();
    }
  }, [currentStep, bookingData.serviceId]);

  // Load available time slots when date is selected (happens in handleDateSelect)
  const loadAvailableDates = async () => {
    if (!bookingData.serviceId) return;

    setLoadingDates(true);
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      // Fetch this month and next month to ensure we have at least 30 days
      const [thisMonthDates, nextMonthDates] = await Promise.all([
        getAvailableDates(bookingData.serviceId, currentYear, currentMonth),
        getAvailableDates(
          bookingData.serviceId,
          currentMonth === 12 ? currentYear + 1 : currentYear,
          currentMonth === 12 ? 1 : currentMonth + 1
        ),
      ]);

      const allDates = [...thisMonthDates, ...nextMonthDates];
      setAvailableDates(allDates);
    } catch (error) {
      console.error('Error loading available dates:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to load available dates. Please try again.',
        type: 'error',
      });
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  const loadAvailableTimeSlots = async (selectedDate: string) => {
    if (!bookingData.serviceId) return;

    setLoadingTimeSlots(true);
    try {
      const slots = await getAvailableTimeSlots(
        bookingData.serviceId,
        selectedDate
      );
      setAvailableTimeSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to load available time slots. Please try again.',
        type: 'error',
      });
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Load payment methods when reaching payment step
  useEffect(() => {
    if (currentStep === 6 && user) {
      loadPaymentMethods();
    }
  }, [currentStep, user]);

  // Load saved properties when reaching address step
  useEffect(() => {
    if (currentStep === 4 && user) {
      loadSavedProperties();
    }
  }, [currentStep, user]);

  const loadPaymentMethods = async () => {
    setPaymentMethodsLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.functions.invoke(
        'stripe-customer-api',
        {
          body: { path: 'list-payment-methods' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error('Error loading payment methods:', error);
        setPaymentMethods([]);
        return;
      }

      setPaymentMethods(data?.paymentMethods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setPaymentMethodsLoading(false);
    }
  };

  const loadSavedProperties = async () => {
    if (!user) return;
    try {
      const properties = await getSavedProperties(user.id);
      setSavedProperties(properties);
    } catch (error) {
      console.error('Error loading saved properties:', error);
      setSavedProperties([]);
    }
  };

  const handlePropertySelect = (property: SavedProperty) => {
    setBookingData({
      ...bookingData,
      address: property.address,
      propertySize: property.property_size || '',
      areaType: property.area_type || '',
    });
    setShowPropertySelector(false);
    showNotification({
      title: 'Property Selected',
      message: `Using "${property.nickname}" address`,
      type: 'success',
    });
  };

  const handlePaymentMethodSelect = (
    paymentMethodId: string,
    details?: StripePaymentMethod | { id: 'cash'; name: 'Cash' }
  ) => {
    console.log('Payment method selected:', paymentMethodId);

    // Set the payment method in booking data
    setBookingData({
      ...bookingData,
      paymentMethod: paymentMethodId,
      paymentMethodDetails: details,
    });

    // Proceed to next step (confirmation)
    nextStep();
  };

  const handleAddCard = async (cardDetails: any) => {
    console.log('New card added:', cardDetails);
    setIsAddCardModalVisible(false);

    try {
      // Fetch fresh payment methods directly to get the newly added card
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.functions.invoke(
        'stripe-customer-api',
        {
          body: { path: 'list-payment-methods' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error('Error loading payment methods:', error);
        showNotification({
          title: 'Success',
          message: 'Card added successfully. Please select it from the list.',
          type: 'success',
        });
        await loadPaymentMethods(); // Still refresh the UI list
        return;
      }

      const freshPaymentMethods = data?.paymentMethods || [];
      setPaymentMethods(freshPaymentMethods);

      // Find the newly added card by matching brand and last4
      const newCard = freshPaymentMethods.find(
        (pm: StripePaymentMethod) =>
          pm.card.last4 === cardDetails.card_last4 &&
          pm.card.brand === cardDetails.card_brand
      );

      if (newCard) {
        // Auto-select the newly added card
        handlePaymentMethodSelect(newCard.id, newCard);
        showNotification({
          title: 'Success',
          message: 'Card added and selected for payment',
          type: 'success',
        });
      } else {
        // If we couldn't find it immediately, just show success message
        showNotification({
          title: 'Success',
          message: 'Card added successfully. Please select it from the list.',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Error in handleAddCard:', error);
      showNotification({
        title: 'Success',
        message: 'Card added successfully. Please select it from the list.',
        type: 'success',
      });
      await loadPaymentMethods(); // Refresh the UI list as fallback
    }
  };

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      handleBookingComplete(bookingData);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // --- Step Navigation and Utility Handlers ---
  const handleServiceSelect = (id: string, name: string, price: number) => {
    setBookingData({
      ...bookingData,
      serviceId: id,
      serviceName: name,
      price: price,
    });
    nextStep();
  };

  const handleDateSelect = async (date: string) => {
    console.log('[BookingForm] Date selected - RAW VALUE:', date);
    console.log('[BookingForm] Date type:', typeof date);
    setBookingData({ ...bookingData, date });

    // Load available time slots for this date
    await loadAvailableTimeSlots(date);
    nextStep();
  };

  const handleTimeSelect = (timeSlot: string) => {
    // timeSlot comes as HH:MM:SS from database
    // Store it directly (no conversion needed)
    setBookingData({ ...bookingData, time: timeSlot });
    nextStep();
  };

  const handleAddressSubmit = (address: string) => {
    setBookingData({ ...bookingData, address });
    nextStep();
  };

  const handleRecurringToggle = (isRecurring: boolean) => {
    setBookingData((prev) => ({
      ...prev,
      isRecurring,
      // Reset recurringPlan if switching to one-time
      recurringPlan: isRecurring ? prev.recurringPlan : undefined,
    }));
  };

  const handleRecurringPlanSelect = (planId: string) => {
    setBookingData({ ...bookingData, recurringPlan: planId });
  };

  const renderServiceTypeStep = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
          <Text className="mt-4 text-gray-600">Loading services...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1">
        <Text className="mb-4 px-4 text-xl font-bold">Select Service Type</Text>
        <ScrollView className="flex-1">
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              className="mx-4 mb-3 flex-row items-center rounded-lg bg-white p-4 shadow-sm"
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
                    'https://images.unsplash.com/photo-1589428473816-b2b7632082df?w=400&q=80',
                }}
                className="mr-4 h-16 w-16 rounded-md"
              />
              <View className="flex-1">
                <Text className="text-lg font-semibold">{service.name}</Text>
                <Text className="text-gray-600">${service.base_price}</Text>
                {service.description && (
                  <Text
                    className="mt-1 text-sm text-gray-500"
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
    if (loadingDates) {
      return (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#16a34a" />
          <Text className="mt-4 text-gray-600">Loading available dates...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 px-4">
        <Text className="mb-4 text-xl font-bold">Select Date</Text>
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-2 text-lg font-semibold">
            Service: {bookingData.serviceName}
          </Text>
        </View>

        {availableDates.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Calendar size={48} color="#9CA3AF" />
            <Text className="mt-4 text-center text-lg text-gray-500">
              No available dates
            </Text>
            <Text className="mt-2 px-8 text-center text-gray-400">
              No technicians have set their availability yet. Please check back
              later.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            {availableDates.map(({ available_date, technician_count }) => {
              // Parse date string as local date to avoid timezone shifts
              const [year, month, day] = available_date.split('-').map(Number);
              const localDate = new Date(year, month - 1, day);

              return (
                <TouchableOpacity
                  key={available_date}
                  className="mb-3 flex-row items-center justify-between rounded-lg bg-white p-4 shadow-sm"
                  onPress={() => handleDateSelect(available_date)}
                >
                  <View className="flex-1 flex-row items-center">
                    <Calendar size={20} color="#10B981" className="mr-3" />
                    <View className="flex-1">
                      <Text className="text-lg">
                        {localDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500">
                        {technician_count}{' '}
                        {technician_count === 1 ? 'technician' : 'technicians'}{' '}
                        available
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderTimeSelectionStep = () => {
    // Helper to format time from HH:MM:SS to 12-hour format
    const formatTimeSlot = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    if (loadingTimeSlots) {
      return (
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#16a34a" />
          <Text className="mt-4 text-gray-600">Loading available times...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 px-4">
        <Text className="mb-4 text-xl font-bold">Select Time</Text>
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-2 text-lg font-semibold">
            Service: {bookingData.serviceName}
          </Text>
          <Text className="text-gray-600">
            Date:{' '}
            {(() => {
              const [year, month, day] = bookingData.date
                .split('-')
                .map(Number);
              const localDate = new Date(year, month - 1, day);
              return localDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              });
            })()}
          </Text>
        </View>

        {availableTimeSlots.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Clock size={48} color="#9CA3AF" />
            <Text className="mt-4 text-center text-lg text-gray-500">
              No available time slots
            </Text>
            <Text className="mt-2 px-8 text-center text-gray-400">
              All technicians are fully booked on this date. Please choose
              another date.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            <View className="flex-row flex-wrap justify-between">
              {availableTimeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.time_slot}
                  className="mb-3 w-[48%] rounded-lg bg-white p-4 shadow-sm"
                  onPress={() => handleTimeSelect(slot.time_slot)}
                >
                  <View className="mb-2 flex-row items-center justify-center">
                    <Clock size={18} color="#10B981" className="mr-2" />
                    <Text className="text-lg font-semibold">
                      {formatTimeSlot(slot.time_slot)}
                    </Text>
                  </View>
                  <Text className="text-center text-xs text-gray-500">
                    {slot.available_technician_count} available
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderAddressStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="mb-4 text-xl font-bold">Confirm Service Address</Text>

        {/* Saved Properties Button */}
        {savedProperties.length > 0 && (
          <TouchableOpacity
            className="mb-4 flex-row items-center justify-center rounded-lg border border-green-300 bg-green-100 p-3"
            onPress={() => setShowPropertySelector(true)}
          >
            <Home size={20} color="#10b981" />
            <Text className="ml-2 font-semibold text-green-700">
              Select from Saved Properties
            </Text>
          </TouchableOpacity>
        )}

        <Text className="mb-2 text-gray-600">Or enter address manually:</Text>
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 bg-white p-3 text-gray-800"
          placeholder="Enter service address"
          value={bookingData.address}
          onChangeText={(text) =>
            setBookingData({ ...bookingData, address: text })
          }
          placeholderTextColor="#9ca3af"
        />

        {/* --- Add Property Size, Area Type, and Notes Inputs --- */}
        <Text className="mb-1 mt-2 text-gray-600">Property Size</Text>
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 bg-white p-3 text-gray-800"
          placeholder="e.g., 1/4 acre, 5000 sq ft"
          value={bookingData.propertySize}
          onChangeText={(text) =>
            setBookingData({ ...bookingData, propertySize: text })
          }
          placeholderTextColor="#9ca3af"
        />

        <Text className="mb-1 mt-2 text-gray-600">Area to Service</Text>
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 bg-white p-3 text-gray-800"
          placeholder="e.g., Front Yard, Full Property"
          value={bookingData.areaType}
          onChangeText={(text) =>
            setBookingData({ ...bookingData, areaType: text })
          }
          placeholderTextColor="#9ca3af"
        />

        <Text className="mb-1 mt-2 text-gray-600">
          Additional Notes (Optional)
        </Text>
        <TextInput
          className="mb-4 h-24 rounded-lg border border-gray-300 bg-white p-3 text-gray-800"
          placeholder="Any specific instructions? Gate code?"
          value={bookingData.notes}
          onChangeText={(text) =>
            setBookingData({ ...bookingData, notes: text })
          }
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
        {/* --- End Added Inputs --- */}

        <TouchableOpacity
          className="mb-3 mt-auto rounded-lg bg-green-500 px-4 py-3"
          onPress={nextStep}
        >
          <Text className="text-lg font-bold text-white">Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecurringStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="mb-4 text-xl font-bold">Service Frequency</Text>
        <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <Text className="mb-2 text-lg font-semibold">
            How often would you like this service?
          </Text>
          <View className="mt-2 flex-col gap-3">
            {/* One-time option */}
            <TouchableOpacity
              className={`mb-2 flex-row items-center rounded-lg p-4 ${!bookingData.isRecurring ? 'border-2 border-green-500 bg-green-100' : 'border-2 border-gray-200 bg-gray-100'}`}
              onPress={() => handleRecurringToggle(false)}
              accessibilityRole="radio"
              accessibilityState={{ selected: !bookingData.isRecurring }}
            >
              <View
                className={`mr-3 h-6 w-6 rounded-full border-2 ${!bookingData.isRecurring ? 'border-green-600 bg-green-500' : 'border-gray-400 bg-white'} items-center justify-center`}
              >
                {!bookingData.isRecurring && (
                  <View className="h-3 w-3 rounded-full bg-white" />
                )}
              </View>
              <Text
                className={`text-lg font-semibold ${!bookingData.isRecurring ? 'text-green-700' : 'text-gray-700'}`}
              >
                One-time Service
              </Text>
            </TouchableOpacity>
            {/* Recurring option */}
            <TouchableOpacity
              className={`flex-row items-center rounded-lg p-4 ${bookingData.isRecurring ? 'border-2 border-green-500 bg-green-100' : 'border-2 border-gray-200 bg-gray-100'}`}
              onPress={() => handleRecurringToggle(true)}
              accessibilityRole="radio"
              accessibilityState={{ selected: bookingData.isRecurring }}
            >
              <View
                className={`mr-3 h-6 w-6 rounded-full border-2 ${bookingData.isRecurring ? 'border-green-600 bg-green-500' : 'border-gray-400 bg-white'} items-center justify-center`}
              >
                {bookingData.isRecurring && (
                  <View className="h-3 w-3 rounded-full bg-white" />
                )}
              </View>
              <Text
                className={`text-lg font-semibold ${bookingData.isRecurring ? 'text-green-700' : 'text-gray-700'}`}
              >
                Recurring Subscription
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* If recurring, show plan selection */}
        {bookingData.isRecurring && (
          <View className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <Text className="mb-3 text-lg font-semibold">
              Select a Recurring Plan
            </Text>
            <ScrollView style={{ maxHeight: 180 }}>
              {recurringPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  className={`mb-3 flex-row items-center justify-between rounded-lg border-2 bg-white p-4 shadow-sm ${bookingData.recurringPlan === plan.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  onPress={() => handleRecurringPlanSelect(plan.id)}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: bookingData.recurringPlan === plan.id,
                  }}
                >
                  <View>
                    <Text className="text-lg font-medium">{plan.name}</Text>
                    <Text className="text-gray-600">{plan.description}</Text>
                    {Number(plan.discount_percentage) > 0 && (
                      <Text className="mt-1 text-green-600">
                        Save {plan.discount_percentage}%
                      </Text>
                    )}
                  </View>
                  <View
                    className={`ml-3 h-5 w-5 rounded-full border-2 ${bookingData.recurringPlan === plan.id ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'} items-center justify-center`}
                  >
                    {bookingData.recurringPlan === plan.id && (
                      <View className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {/* Continue button */}
        <TouchableOpacity
          className={`mt-2 items-center rounded-lg bg-green-500 py-4 ${bookingData.isRecurring && !bookingData.recurringPlan ? 'opacity-50' : ''}`}
          onPress={nextStep}
          disabled={bookingData.isRecurring && !bookingData.recurringPlan}
          accessibilityRole="button"
          accessibilityState={{
            disabled: bookingData.isRecurring && !bookingData.recurringPlan,
          }}
        >
          <Text className="text-lg font-bold text-white">Continue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPaymentStep = () => {
    return (
      <View className="flex-1 px-4">
        <Text className="mb-4 text-xl font-bold">Payment Method</Text>
        <Text className="mb-4 text-gray-600">Select how you'd like to pay</Text>

        {paymentMethodsLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="mt-4 text-gray-600">
              Loading payment methods...
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            {/* Cash on Delivery Option */}
            <TouchableOpacity
              className="mb-3 flex-row items-center justify-between rounded-lg border-2 border-gray-200 bg-white p-4 shadow-sm"
              onPress={() =>
                handlePaymentMethodSelect('cash', { id: 'cash', name: 'Cash' })
              }
            >
              <View className="flex-row items-center">
                <View className="mr-3 rounded-full bg-green-100 p-2">
                  <CreditCard size={24} color="#16a34a" />
                </View>
                <View>
                  <Text className="text-lg font-semibold">
                    Cash on Delivery
                  </Text>
                  <Text className="text-sm text-gray-500">
                    Pay when service is completed
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Saved Payment Methods */}
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                className="mb-3 flex-row items-center justify-between rounded-lg border-2 border-gray-200 bg-white p-4 shadow-sm"
                onPress={() => handlePaymentMethodSelect(method.id, method)}
              >
                <View className="flex-row items-center">
                  <View className="mr-3 rounded-full bg-blue-100 p-2">
                    <CreditCard size={24} color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="text-lg font-semibold">
                      {method.card?.brand
                        ? method.card.brand.charAt(0).toUpperCase() +
                          method.card.brand.slice(1)
                        : 'Card'}{' '}
                      •••• {method.card?.last4}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Expires {method.card?.exp_month}/{method.card?.exp_year}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}

            {/* Add New Card Button */}
            <TouchableOpacity
              className="mb-3 flex-row items-center justify-center rounded-lg bg-green-500 p-4 shadow-sm"
              onPress={() => setIsAddCardModalVisible(true)}
            >
              <Plus size={20} color="#ffffff" />
              <Text className="ml-2 text-lg font-semibold text-white">
                Add New Card
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderConfirmationStep = () => {
    const selectedPlan = recurringPlans.find(
      (plan) => plan.id === bookingData.recurringPlan
    );
    const paymentDisplay =
      bookingData.paymentMethodDetails?.id === 'cash'
        ? 'Cash on Delivery'
        : bookingData.paymentMethodDetails &&
            'card' in bookingData.paymentMethodDetails
          ? `${bookingData.paymentMethodDetails.card?.brand || 'Card'} ending in ${
              bookingData.paymentMethodDetails.card?.last4 || '????'
            }`
          : 'N/A'; // Fallback

    return (
      <View className="flex-1 px-4">
        <Text className="mb-4 text-xl font-bold">Booking Confirmation</Text>
        <View className="mb-4 rounded-lg bg-white p-5 shadow-sm">
          <View className="mb-4 items-center">
            <View className="mb-2 rounded-full bg-green-100 p-3">
              <Check size={32} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-green-500">
              Ready to Book!
            </Text>
          </View>

          <View className="mt-2 border-t border-gray-200 pt-4">
            <Text className="mb-3 text-lg font-semibold">Service Details:</Text>
            <View className="mb-2 flex-row">
              <Text className="w-1/3 text-gray-600">Service:</Text>
              <Text className="flex-1 font-medium">
                {bookingData.serviceName}
              </Text>
            </View>
            <View className="mb-2 flex-row">
              <Text className="w-1/3 text-gray-600">Date:</Text>
              <Text className="flex-1 font-medium">
                {(() => {
                  const [year, month, day] = bookingData.date
                    .split('-')
                    .map(Number);
                  const localDate = new Date(year, month - 1, day);
                  return localDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  });
                })()}
              </Text>
            </View>
            <View className="mb-2 flex-row">
              <Text className="w-1/3 text-gray-600">Time:</Text>
              <Text className="flex-1 font-medium">{bookingData.time}</Text>
            </View>
            <View className="mb-2 flex-row">
              <Text className="w-1/3 text-gray-600">Address:</Text>
              <Text className="flex-1 font-medium">{bookingData.address}</Text>
            </View>
            {bookingData.isRecurring && (
              <View className="mb-2 flex-row">
                <Text className="w-1/3 text-gray-600">Plan:</Text>
                <Text className="flex-1 font-medium">
                  {selectedPlan?.name || 'Custom plan'}
                </Text>
              </View>
            )}
            <View className="mb-2 flex-row">
              <Text className="w-1/3 text-gray-600">Payment:</Text>
              <Text className="flex-1 font-medium">{paymentDisplay}</Text>
            </View>
            <View className="mb-2 flex-row">
              <Text className="w-1/3 text-gray-600">Total:</Text>
              <Text className="flex-1 font-medium text-green-600">
                ${bookingData.price.toFixed(2)}
                {bookingData.isRecurring &&
                  selectedPlan?.discount_percentage &&
                  ` (Save ${selectedPlan.discount_percentage}% with recurring plan)`}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="items-center rounded-lg bg-green-500 py-4"
          onPress={() => handleBookingComplete(bookingData)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-lg font-bold text-white">
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
        return renderServiceTypeStep();
    }
  };

  const parseStripeError = (error: any): string => {
    if (!error) return 'An unexpected error occurred. Please try again.';

    // If error is a string
    if (typeof error === 'string') return error;

    // If error has a message
    if (error.message) {
      // Check for Stripe-specific fields
      const code = error.stripe_error_code || error.code;
      const type = error.stripe_error_type || error.type;
      const decline = error.stripe_decline_code || error.decline_code;
      if (code || type || decline) {
        let msg = error.message;
        if (code) msg += `\n(Code: ${code})`;
        if (type) msg += `\n(Type: ${type})`;
        if (decline) msg += `\n(Decline: ${decline})`;
        return msg;
      }
      return error.message;
    }
    // If error is an object with useful fields
    if (
      error.stripe_error_code ||
      error.stripe_error_type ||
      error.stripe_decline_code
    ) {
      let msg = 'Payment failed.';
      if (error.stripe_error_code)
        msg += `\n(Code: ${error.stripe_error_code})`;
      if (error.stripe_error_type)
        msg += `\n(Type: ${error.stripe_error_type})`;
      if (error.stripe_decline_code)
        msg += `\n(Decline: ${error.stripe_decline_code})`;
      return msg;
    }
    return JSON.stringify(error);
  };

  const handleBookingComplete = async (bookingData: BookingFormData) => {
    try {
      setLoading(true);
      await onComplete(bookingData);
    } catch (error) {
      showNotification({
        title: 'Booking Failed',
        message: parseStripeError(error),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <BookingHeader
        onBack={prevStep}
        currentStep={currentStep}
        totalSteps={7}
        title={(() => {
          switch (currentStep) {
            case 1:
              return 'Select Service Type';
            case 2:
              return 'Select Date';
            case 3:
              return 'Select Time';
            case 4:
              return 'Confirm Address';
            case 5:
              return 'Service Frequency';
            case 6:
              return 'Payment Method';
            case 7:
              return 'Confirmation';
            default:
              return undefined;
          }
        })()}
      />
      {renderCurrentStep()}

      {/* Property Selector Modal */}
      <Modal
        visible={showPropertySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPropertySelector(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-3/4 rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-800">
                Select Property
              </Text>
              <TouchableOpacity onPress={() => setShowPropertySelector(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {savedProperties.length === 0 ? (
                <View className="items-center py-8">
                  <Home size={48} color="#9CA3AF" />
                  <Text className="mt-4 text-center text-gray-500">
                    No saved properties yet
                  </Text>
                </View>
              ) : (
                savedProperties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    className={`mb-3 rounded-lg border bg-white p-4 shadow-sm ${
                      property.is_default
                        ? 'border-2 border-green-500'
                        : 'border-gray-200'
                    }`}
                    onPress={() => handlePropertySelect(property)}
                  >
                    <View className="mb-2 flex-row items-start justify-between">
                      <View className="flex-1 flex-row items-center">
                        <Home
                          size={20}
                          color={property.is_default ? '#10b981' : '#6b7280'}
                        />
                        <Text className="ml-2 text-lg font-semibold text-gray-800">
                          {property.nickname}
                        </Text>
                        {property.is_default && (
                          <View className="ml-2 rounded-full bg-green-100 px-2 py-1">
                            <Text className="text-xs font-medium text-green-800">
                              Default
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className="mt-2 flex-row items-start">
                      <MapPin size={16} color="#6b7280" className="mt-1" />
                      <View className="ml-2 flex-1">
                        <Text className="text-gray-600">
                          {property.address}
                        </Text>
                        {(property.city ||
                          property.state ||
                          property.zip_code) && (
                          <Text className="text-sm text-gray-500">
                            {[property.city, property.state, property.zip_code]
                              .filter(Boolean)
                              .join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>

                    {(property.property_size || property.area_type) && (
                      <View className="mt-2 flex-row space-x-2">
                        {property.property_size && (
                          <View className="rounded bg-gray-100 px-2 py-1">
                            <Text className="text-xs capitalize text-gray-600">
                              {property.property_size.replace('_', ' ')}
                            </Text>
                          </View>
                        )}
                        {property.area_type && (
                          <View className="ml-2 rounded bg-gray-100 px-2 py-1">
                            <Text className="text-xs capitalize text-gray-600">
                              {property.area_type.replace('_', ' ')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        visible={isAddCardModalVisible}
        onClose={() => setIsAddCardModalVisible(false)}
        onSaveSuccess={handleAddCard}
        stripePublishableKey={
          process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
        }
      />
    </View>
  );
};

export default BookingForm;
