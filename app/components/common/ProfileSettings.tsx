import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  ChevronRight,
  CreditCard,
  Bell,
  MapPin,
  User,
  Mail,
  Phone,
  Save,
  Plus,
  LogOut,
  Check,
  Trash,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import { showNotification } from '../../../lib/notification';
import { useConfirmation } from '../../../lib/confirmation'; // Import useConfirmation

// Access Stripe publishable key from environment variables
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.stripePublishableKey;

interface ProfileSettingsProps {
  userType?: 'customer' | 'technician' | 'admin';
  userData?: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    billing_address_line1?: string;
    billing_address_line2?: string;
    billing_city?: string;
    billing_state?: string;
    billing_postal_code?: string;
    billing_country?: string;
    use_service_address_for_billing?: boolean;
    notificationPreferences?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  onUpdateProfile?: (updatedData: any) => Promise<void>;
}

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
}

interface ValidationErrors {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  billing_address_line1?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
}

const ProfileSettings = ({
  userType = 'customer',
  userData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zip_code: '12345',
    billing_address_line1: '',
    billing_city: '',
    billing_state: '',
    billing_postal_code: '',
    billing_country: 'US',
    use_service_address_for_billing: true,
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
    },
  },
  onUpdateProfile,
}: ProfileSettingsProps) => {
  const { signOut } = useAuth();
  const { showConfirmation } = useConfirmation(); // Get the hook
  const router = useRouter();
  const [formData, setFormData] = useState(userData);
  const [isEditing, setIsEditing] = useState(false);
  const [isBillingEditing, setIsBillingEditing] = useState(false);
  const [loadingState, setLoading] = useState(false);
  const [stripeUpdateError, setStripeUpdateError] = useState<string | null>(
    null
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [isAddCardModalVisible, setIsAddCardModalVisible] = useState(false);

  useEffect(() => {
    if (userType === 'customer') {
      fetchPaymentMethods();
    }
  }, [userType]);

  useEffect(() => {
    if (!isEditing && !isBillingEditing) {
      setValidationErrors({});
      setStripeUpdateError(null);
    }
  }, [isEditing, isBillingEditing]);

  const fetchPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const { data, error } = await supabase.functions.invoke(
        'stripe-customer-api',
        {
          body: {
            path: 'list-payment-methods',
            payload: {},
          },
        }
      );

      if (error) throw error;

      if (data && data.paymentMethods) {
        setPaymentMethods(data.paymentMethods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to load payment methods',
        type: 'error',
      });
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleUseSameAddressToggle = (value: boolean) => {
    if (value) {
      setFormData((prev) => ({
        ...prev,
        use_service_address_for_billing: true,
      }));

      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.billing_address_line1;
        delete newErrors.billing_city;
        delete newErrors.billing_state;
        delete newErrors.billing_postal_code;
        return newErrors;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        use_service_address_for_billing: false,
      }));
    }
  };

  const handleCopyServiceAddressToBilling = () => {
    setFormData((prev) => ({
      ...prev,
      billing_address_line1: prev.address || '',
      billing_city: prev.city || '',
      billing_state: prev.state || '',
      billing_postal_code: prev.zip_code || '',
      billing_country: 'US',
    }));

    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.billing_address_line1;
      delete newErrors.billing_city;
      delete newErrors.billing_state;
      delete newErrors.billing_postal_code;
      return newErrors;
    });
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('stripe-customer-api', {
        body: {
          path: 'set-default-payment',
          payload: { paymentMethodId },
        },
      });

      if (error) throw error;

      setPaymentMethods((prev) =>
        prev.map((pm) => ({
          ...pm,
          isDefault: pm.id === paymentMethodId,
        }))
      );

      showNotification({
        title: 'Success',
        message: 'Default payment method updated',
        type: 'success',
      });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to update default payment method',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    setLoading(true);
    showConfirmation({
      title: 'Remove Payment Method',
      message: 'Are you sure you want to remove this payment method?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      confirmButtonStyle: 'destructive', // Hint for red button
      onConfirm: async () => {
        try {
          const { error } = await supabase.functions.invoke(
            'stripe-customer-api',
            {
              body: {
                path: 'detach-payment-method',
                payload: { paymentMethodId },
              },
            }
          );
          if (error) throw error;
          setPaymentMethods((prev) =>
            prev.filter((pm) => pm.id !== paymentMethodId)
          );
          showNotification({
            title: 'Success',
            message: 'Payment method removed',
            type: 'success',
          });
        } catch (error) {
          console.error('Error removing payment method:', error);
          showNotification({
            title: 'Error',
            message: 'Failed to remove payment method',
            type: 'error',
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const validateForm = () => {
    const errors: ValidationErrors = {};

    if (isEditing) {
      if (!formData.name || formData.name.trim().length < 3) {
        errors.name = 'Full name is required (min 3 characters)';
      }

      if (!formData.phone || !/^[\d\s()+.-]{7,15}$/.test(formData.phone)) {
        errors.phone = 'Valid phone number is required';
      }

      if (userType === 'customer') {
        if (!formData.address || formData.address.trim().length < 5) {
          errors.address = 'Street address is required';
        }

        if (!formData.city || formData.city.trim().length < 2) {
          errors.city = 'City is required';
        }

        if (!formData.state || !/^[A-Za-z]{2}$/.test(formData.state)) {
          errors.state = '2-letter state code is required';
        }

        if (!formData.zip_code || !/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
          errors.zip_code =
            'Valid ZIP code is required (e.g., 12345 or 12345-6789)';
        }
      }
    }

    if (isBillingEditing && !formData.use_service_address_for_billing) {
      if (
        !formData.billing_address_line1 ||
        formData.billing_address_line1.trim().length < 5
      ) {
        errors.billing_address_line1 = 'Street address is required';
      }

      if (!formData.billing_city || formData.billing_city.trim().length < 2) {
        errors.billing_city = 'City is required';
      }

      if (
        !formData.billing_state ||
        !/^[A-Za-z]{2}$/.test(formData.billing_state)
      ) {
        errors.billing_state = '2-letter state code is required';
      }

      if (
        !formData.billing_postal_code ||
        !/^\d{5}(-\d{4})?$/.test(formData.billing_postal_code)
      ) {
        errors.billing_postal_code =
          'Valid ZIP code is required (e.g., 12345 or 12345-6789)';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    try {
      setStripeUpdateError(null);

      if (!validateForm()) {
        return;
      }

      setLoading(true);

      let stripeUpdateSuccessful = true;

      if (isBillingEditing && !formData.use_service_address_for_billing) {
        try {
          const { error: billingError } = await supabase.functions.invoke(
            'stripe-customer-api',
            {
              body: {
                path: 'update-billing-address',
                payload: {
                  address: {
                    line1: formData.billing_address_line1,
                    line2: formData.billing_address_line2,
                    city: formData.billing_city,
                    state: formData.billing_state,
                    postal_code: formData.billing_postal_code,
                    country: formData.billing_country || 'US',
                  },
                  use_service_address_for_billing:
                    formData.use_service_address_for_billing,
                },
              },
            }
          );

          if (billingError) {
            console.error(
              'Error updating billing address in Stripe:',
              billingError
            );
            setStripeUpdateError(
              'Failed to update billing information in Stripe. Your profile changes will not be saved.'
            );
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error updating billing address in Stripe:', error);
          setStripeUpdateError(
            'Failed to update billing information in Stripe. Your profile changes will not be saved.'
          );
          stripeUpdateSuccessful = false;

          const confirmContinue = await new Promise((resolve) => {
            showConfirmation({
              title: 'Stripe Update Failed',
              message:
                "We couldn't update your billing information in our payment system, but we can still save your other profile changes. Would you like to continue?",
              confirmText: 'Continue',
              cancelText: 'Cancel',
              onConfirm: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });

          if (!confirmContinue) {
            setLoading(false);
            return;
          }
        }
      }

      if (onUpdateProfile) {
        await onUpdateProfile(formData);

        if (!stripeUpdateSuccessful) {
          showNotification({
            title: 'Partial Update',
            message:
              'Your profile information was saved, but there was a problem with your billing address update in our payment system. You may need to update your billing information again later.',
            type: 'warning',
          });
        } else {
          showNotification({
            title: 'Success',
            message: 'Profile updated successfully',
            type: 'success',
          });
        }
      } else {
        console.log('Saving profile data:', formData);
      }

      setIsEditing(false);
      setIsBillingEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to save profile. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('ProfileSettings: Logout button pressed');
    try {
      setLoading(true);

      await signOut();
      console.log('ProfileSettings: signOut completed successfully');

      setLoading(false);
    } catch (error) {
      console.error('ProfileSettings: Logout error:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to log out. Please try again.',
        type: 'error',
      });
      setLoading(false);
    }
  };

  const isDuplicatePaymentMethod = (newMethod: any) => {
    return paymentMethods.some(
      (pm) =>
        pm.card.brand === newMethod.card_brand &&
        pm.card.last4 === newMethod.card_last4 &&
        pm.card.expiryMonth === newMethod.card_exp_month &&
        pm.card.expiryYear === newMethod.card_exp_year
    );
  };

  const handleAddPaymentMethod = async (newMethod: any) => {
    if (isDuplicatePaymentMethod(newMethod)) {
      showNotification({
        title: 'Error',
        message: 'This card is already saved. Please use a different card.',
        type: 'error',
      });
      return;
    }
    setPaymentMethods((prev) => [...prev, newMethod]);
    fetchPaymentMethods(); // Refresh from backend in case of changes
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Profile Header */}
        <View className="mb-6 items-center pt-4">
          <View className="mb-2 h-24 w-24 items-center justify-center rounded-full bg-gray-200">
            <User size={40} color="#6b7280" />
          </View>
          <Text className="text-xl font-bold">{formData.name}</Text>
          <Text className="text-gray-500">
            {userType.charAt(0).toUpperCase() + userType.slice(1)}
          </Text>
        </View>

        {/* Personal Information Section */}
        <View className="mb-6 rounded-xl bg-gray-50 p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold">Personal Information</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text className="text-blue-500">
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View className="space-y-1">
              <Text className="text-sm text-gray-500">Full Name</Text>
              {isEditing ? (
                <>
                  <TextInput
                    className={`border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                  />
                  {validationErrors.name && (
                    <Text className="mt-1 text-xs text-red-500">
                      {validationErrors.name}
                    </Text>
                  )}
                </>
              ) : (
                <View className="flex-row items-center">
                  <User size={16} color="#6b7280" />
                  <Text className="ml-2">{formData.name}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-sm text-gray-500">Email</Text>
              {isEditing ? (
                <TextInput
                  className="rounded-md border border-gray-300 bg-white p-2"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  editable={false}
                />
              ) : (
                <View className="flex-row items-center">
                  <Mail size={16} color="#6b7280" />
                  <Text className="ml-2">{formData.email}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-sm text-gray-500">Phone</Text>
              {isEditing ? (
                <>
                  <TextInput
                    className={`border ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    keyboardType="phone-pad"
                  />
                  {validationErrors.phone && (
                    <Text className="mt-1 text-xs text-red-500">
                      {validationErrors.phone}
                    </Text>
                  )}
                </>
              ) : (
                <View className="flex-row items-center">
                  <Phone size={16} color="#6b7280" />
                  <Text className="ml-2">{formData.phone}</Text>
                </View>
              )}
            </View>

            {userType === 'customer' && (
              <View className="space-y-1">
                <Text className="text-sm text-gray-500">Service Address</Text>
                {isEditing ? (
                  <View className="space-y-2">
                    <TextInput
                      className={`border ${validationErrors.address ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                      value={formData.address}
                      onChangeText={(value) =>
                        handleInputChange('address', value)
                      }
                      placeholder="Street Address"
                    />
                    {validationErrors.address && (
                      <Text className="mt-1 text-xs text-red-500">
                        {validationErrors.address}
                      </Text>
                    )}

                    <View className="flex-row space-x-2">
                      <View className="flex-1">
                        <TextInput
                          className={`border ${validationErrors.city ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                          value={formData.city}
                          onChangeText={(value) =>
                            handleInputChange('city', value)
                          }
                          placeholder="City"
                        />
                        {validationErrors.city && (
                          <Text className="mt-1 text-xs text-red-500">
                            {validationErrors.city}
                          </Text>
                        )}
                      </View>

                      <View>
                        <TextInput
                          className={`border ${validationErrors.state ? 'border-red-500' : 'border-gray-300'} w-16 rounded-md bg-white p-2`}
                          value={formData.state}
                          onChangeText={(value) =>
                            handleInputChange('state', value)
                          }
                          placeholder="State"
                          maxLength={2}
                          autoCapitalize="characters"
                        />
                        {validationErrors.state && (
                          <Text className="mt-1 text-xs text-red-500">
                            {validationErrors.state}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View>
                      <TextInput
                        className={`border ${validationErrors.zip_code ? 'border-red-500' : 'border-gray-300'} w-32 rounded-md bg-white p-2`}
                        value={formData.zip_code}
                        onChangeText={(value) =>
                          handleInputChange('zip_code', value)
                        }
                        placeholder="ZIP Code"
                        keyboardType="numeric"
                      />
                      {validationErrors.zip_code && (
                        <Text className="mt-1 text-xs text-red-500">
                          {validationErrors.zip_code}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <MapPin size={16} color="#6b7280" />
                    <Text className="ml-2">
                      {formData.address} {formData.city && `, ${formData.city}`}{' '}
                      {formData.state && `, ${formData.state}`}{' '}
                      {formData.zip_code && formData.zip_code}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isEditing && (
              <TouchableOpacity
                className="mt-2 items-center rounded-md bg-green-500 p-3"
                onPress={handleSaveProfile}
                disabled={loadingState}
              >
                <View className="flex-row items-center">
                  <Save size={16} color="#ffffff" />
                  <Text className="ml-2 font-semibold text-white">
                    {loadingState ? 'Saving...' : 'Save Changes'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Billing Address Section - for customers only */}
        {userType === 'customer' && (
          <View className="mb-6 rounded-xl bg-gray-50 p-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold">Billing Address</Text>
              <TouchableOpacity
                onPress={() => setIsBillingEditing(!isBillingEditing)}
              >
                <Text className="text-blue-500">
                  {isBillingEditing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Toggle for using service address */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text>Use service address for billing</Text>
              <Switch
                value={formData.use_service_address_for_billing}
                onValueChange={handleUseSameAddressToggle}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
              />
            </View>

            {/* Billing address fields (shown if not using service address) */}
            {!formData.use_service_address_for_billing && (
              <View className="space-y-3">
                {isBillingEditing && (
                  <TouchableOpacity
                    className="mb-2 rounded-md bg-gray-200 p-2"
                    onPress={handleCopyServiceAddressToBilling}
                  >
                    <Text className="text-center text-gray-700">
                      Copy service address
                    </Text>
                  </TouchableOpacity>
                )}

                <View className="space-y-1">
                  <Text className="text-sm text-gray-500">Street Address</Text>
                  {isBillingEditing ? (
                    <>
                      <TextInput
                        className={`border ${validationErrors.billing_address_line1 ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                        value={formData.billing_address_line1}
                        onChangeText={(value) =>
                          handleInputChange('billing_address_line1', value)
                        }
                        placeholder="Street Address"
                      />
                      {validationErrors.billing_address_line1 && (
                        <Text className="mt-1 text-xs text-red-500">
                          {validationErrors.billing_address_line1}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text>{formData.billing_address_line1 || 'Not set'}</Text>
                  )}
                </View>

                <View className="space-y-1">
                  <Text className="text-sm text-gray-500">
                    Apartment/Suite (Optional)
                  </Text>
                  {isBillingEditing ? (
                    <TextInput
                      className="rounded-md border border-gray-300 bg-white p-2"
                      value={formData.billing_address_line2}
                      onChangeText={(value) =>
                        handleInputChange('billing_address_line2', value)
                      }
                      placeholder="Apt, Suite, etc. (optional)"
                    />
                  ) : (
                    <Text>{formData.billing_address_line2 || 'Not set'}</Text>
                  )}
                </View>

                <View className="space-y-1">
                  <Text className="text-sm text-gray-500">City</Text>
                  {isBillingEditing ? (
                    <>
                      <TextInput
                        className={`border ${validationErrors.billing_city ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                        value={formData.billing_city}
                        onChangeText={(value) =>
                          handleInputChange('billing_city', value)
                        }
                        placeholder="City"
                      />
                      {validationErrors.billing_city && (
                        <Text className="mt-1 text-xs text-red-500">
                          {validationErrors.billing_city}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text>{formData.billing_city || 'Not set'}</Text>
                  )}
                </View>

                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-500">State</Text>
                    {isBillingEditing ? (
                      <>
                        <TextInput
                          className={`border ${validationErrors.billing_state ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                          value={formData.billing_state}
                          onChangeText={(value) =>
                            handleInputChange('billing_state', value)
                          }
                          placeholder="State"
                          maxLength={2}
                          autoCapitalize="characters"
                        />
                        {validationErrors.billing_state && (
                          <Text className="mt-1 text-xs text-red-500">
                            {validationErrors.billing_state}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text>{formData.billing_state || 'Not set'}</Text>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm text-gray-500">ZIP Code</Text>
                    {isBillingEditing ? (
                      <>
                        <TextInput
                          className={`border ${validationErrors.billing_postal_code ? 'border-red-500' : 'border-gray-300'} rounded-md bg-white p-2`}
                          value={formData.billing_postal_code}
                          onChangeText={(value) =>
                            handleInputChange('billing_postal_code', value)
                          }
                          placeholder="ZIP Code"
                          keyboardType="numeric"
                        />
                        {validationErrors.billing_postal_code && (
                          <Text className="mt-1 text-xs text-red-500">
                            {validationErrors.billing_postal_code}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text>{formData.billing_postal_code || 'Not set'}</Text>
                    )}
                  </View>
                </View>

                {stripeUpdateError && (
                  <View className="mt-3 flex-row items-center rounded-md bg-red-50 p-3">
                    <AlertCircle size={16} color="#ef4444" />
                    <Text className="ml-2 text-red-600">
                      {stripeUpdateError}
                    </Text>
                  </View>
                )}

                {isBillingEditing && (
                  <TouchableOpacity
                    className="mt-4 items-center rounded-md bg-green-500 p-3"
                    onPress={handleSaveProfile}
                    disabled={loadingState}
                  >
                    <View className="flex-row items-center">
                      <Save size={16} color="#ffffff" />
                      <Text className="ml-2 font-semibold text-white">
                        {loadingState ? 'Saving...' : 'Save Billing Address'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Notification Preferences */}
        <View className="mb-6 rounded-xl bg-gray-50 p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold">
              Notification Preferences
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/notification-preferences' as any)}
            className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <View className="flex-row items-center">
              <Bell size={20} color="#10b981" />
              <View className="ml-3">
                <Text className="font-medium text-gray-900">
                  Manage Notifications
                </Text>
                <Text className="mt-0.5 text-sm text-gray-500">
                  Configure push, sound, and notification types
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Payment Methods (Customer only) */}
        {userType === 'customer' && (
          <View className="mb-6 rounded-xl bg-gray-50 p-4">
            <Text className="mb-4 text-lg font-semibold">Payment Methods</Text>

            {loadingPaymentMethods ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : paymentMethods.length > 0 ? (
              <View>
                {paymentMethods.map((method) => (
                  <View
                    key={method.id}
                    className={`mb-3 flex-row items-center justify-between rounded-lg border p-4 ${
                      method.isDefault
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <View className="mr-2 flex-1 flex-row items-center">
                      <CreditCard size={20} color="#6b7280" />
                      <View className="ml-3 flex-1">
                        <Text className="font-medium capitalize">
                          {method.card.brand} **** {method.card.last4}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          Expires: {method.card.expiryMonth}/
                          {String(method.card.expiryYear).slice(-2)}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      {method.isDefault ? (
                        <View className="mr-2 rounded bg-blue-100 px-2 py-1">
                          <Text className="text-xs text-blue-700">Default</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          className="mr-2 p-2"
                          onPress={() =>
                            handleSetDefaultPaymentMethod(method.id)
                          }
                        >
                          <Check size={16} color="#10b981" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => handleRemovePaymentMethod(method.id)}
                      >
                        <Trash size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="py-2 italic text-gray-500">
                No payment methods saved
              </Text>
            )}

            <TouchableOpacity
              className="mt-2 flex-row items-center justify-center rounded-md bg-gray-100 p-3"
              onPress={() => setIsAddCardModalVisible(true)}
            >
              <Plus size={16} color="#6b7280" />
              <Text className="ml-2 text-gray-700">Add Payment Method</Text>
            </TouchableOpacity>

            {/* Add Payment Method Modal */}
            <AddPaymentMethodModal
              visible={isAddCardModalVisible}
              onClose={() => setIsAddCardModalVisible(false)}
              onSaveSuccess={handleAddPaymentMethod}
              stripePublishableKey={STRIPE_PUBLISHABLE_KEY}
            />
          </View>
        )}

        {/* Account Settings */}
        <View className="mb-6 rounded-xl bg-gray-50 p-4">
          <Text className="mb-4 text-lg font-semibold">Account Settings</Text>

          <TouchableOpacity className="mb-2 flex-row items-center justify-between rounded-md bg-white p-3">
            <Text>Change Password</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-2 flex-row items-center justify-between rounded-md bg-white p-3">
            <Text>Privacy Settings</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between rounded-md bg-white p-3"
            onPress={handleLogout}
            disabled={loadingState}
          >
            <View className="flex-row items-center">
              <LogOut size={16} color="#ef4444" />
              <Text className="ml-2 text-red-500">
                {loadingState ? 'Logging out...' : 'Log Out'}
              </Text>
            </View>
            <ChevronRight size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileSettings;
