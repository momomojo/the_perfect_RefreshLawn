import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Search, User as UserIcon } from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { format } from "date-fns";
import { router } from "expo-router";

interface Customer {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  created: number;
  supabaseUserId?: string | null;
  supabaseUserName?: string | null;
  supabaseUserRole?: string | null;
}

const CustomerManagement = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: stripeResp, error: stripeErr } =
          await supabase.functions.invoke("stripe-admin-api", {
            body: { path: "list-customers", payload: { limit: 50 } },
          });
        if (stripeErr) throw stripeErr;
        const stripeList: any[] = stripeResp.data || [];
        if (!stripeList || stripeList.length === 0) {
          setCustomers([]);
          return;
        }

        let customerData: { [key: string]: Customer } = {};
        stripeList.forEach((c) => {
          customerData[c.id] = {
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            created: c.created,
          };
        });
        const stripeCustomerIds = Object.keys(customerData);

        const { data: supabaseCustomers, error: custErr } = await supabase
          .from("customers")
          .select("user_id, stripe_customer_id")
          .in("stripe_customer_id", stripeCustomerIds);

        if (custErr) {
          console.warn(
            "Could not fetch supabase customer links:",
            custErr.message
          );
        } else if (supabaseCustomers) {
          const supabaseUserIdMap: { [stripeId: string]: string } = {};
          const supabaseUserIds: string[] = [];
          supabaseCustomers.forEach((sc) => {
            if (sc.stripe_customer_id && sc.user_id) {
              supabaseUserIdMap[sc.stripe_customer_id] = sc.user_id;
              if (customerData[sc.stripe_customer_id]) {
                customerData[sc.stripe_customer_id].supabaseUserId = sc.user_id;
              }
              if (!supabaseUserIds.includes(sc.user_id)) {
                supabaseUserIds.push(sc.user_id);
              }
            }
          });

          if (supabaseUserIds.length > 0) {
            const { data: profiles, error: profileErr } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, role")
              .in("id", supabaseUserIds);

            if (profileErr) {
              console.warn(
                "Could not fetch supabase profiles:",
                profileErr.message
              );
            } else if (profiles) {
              profiles.forEach((p) => {
                const stripeId = Object.keys(supabaseUserIdMap).find(
                  (key) => supabaseUserIdMap[key] === p.id
                );
                if (stripeId && customerData[stripeId]) {
                  customerData[stripeId].supabaseUserName = `${
                    p.first_name || ""
                  } ${p.last_name || ""}`.trim();
                  customerData[stripeId].supabaseUserRole = p.role;
                }
              });
            }
          }
        }

        setCustomers(Object.values(customerData));
      } catch (e: any) {
        console.error("Error fetching customer data:", e);
        setError(e.message || "Failed to fetch customer data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewStripe = async (customerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-admin-api",
        {
          body: {
            path: "get-dashboard-link",
            payload: { resourceType: "customer", resourceId: customerId },
          },
        }
      );
      if (error) throw error;
      const url = data.link;
      Linking.openURL(url);
    } catch (e: any) {
      console.error("Error opening Stripe dashboard:", e);
      Alert.alert("Error", e.message || "Failed to open Stripe dashboard");
    }
  };

  const handleViewProfile = (userId?: string | null) => {
    if (!userId) {
      Alert.alert("No linked Supabase profile found.");
      return;
    }
    router.push("/(admin)/users");
  };

  const filtered = customers.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.supabaseUserName || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#15803d" />
        <Text className="mt-2 text-gray-600">Loading customers...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500 mb-2">Error: {error}</Text>
        <TouchableOpacity
          className="bg-green-600 px-4 py-2 rounded"
          onPress={() => setSearchQuery(searchQuery)}
        >
          <Text className="text-white">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-6 bg-green-700">
        <Text className="text-2xl font-bold text-white">
          Customer Management
        </Text>
        <Text className="text-white opacity-80 mt-1">
          List of Stripe customers
        </Text>
      </View>

      {/* Search */}
      <View className="p-4 bg-white">
        <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-md">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search by ID, email, or name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Customer List */}
      <ScrollView className="px-4">
        {filtered.map((c) => (
          <View
            key={c.id}
            className="bg-white border border-gray-200 rounded-lg mb-3 p-4 shadow-sm"
          >
            <Text className="font-semibold text-gray-800">
              {c.supabaseUserName || c.email || c.id}
            </Text>
            {c.supabaseUserName && c.email && (
              <Text className="text-gray-500 text-sm">{c.email}</Text>
            )}
            <Text className="text-gray-600 text-sm">Stripe ID: {c.id}</Text>
            {c.phone && (
              <Text className="text-gray-600 text-sm">Phone: {c.phone}</Text>
            )}
            {c.supabaseUserId && c.supabaseUserRole && (
              <Text className="text-gray-600 text-sm">
                Supabase Role: {c.supabaseUserRole}
              </Text>
            )}
            <Text className="text-gray-600 text-sm">
              Stripe Acc Created:{" "}
              {format(new Date(c.created * 1000), "yyyy-MM-dd")}
            </Text>
            <View className="flex-row space-x-2 mt-3">
              <TouchableOpacity
                className="flex-1 bg-blue-50 px-3 py-1 rounded-md items-center justify-center"
                onPress={() => handleViewStripe(c.id)}
              >
                <Text className="text-blue-700 font-medium text-center">
                  View in Stripe
                </Text>
              </TouchableOpacity>
              {c.supabaseUserId && (
                <TouchableOpacity
                  className="flex-1 bg-green-50 px-3 py-1 rounded-md items-center justify-center"
                  onPress={() => handleViewProfile(c.supabaseUserId)}
                >
                  <Text className="text-green-700 font-medium text-center">
                    View Profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {filtered.length === 0 && (
          <View className="items-center py-10">
            <Text className="text-gray-500">No customers found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerManagement;
