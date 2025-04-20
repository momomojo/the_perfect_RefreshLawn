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
import { Search } from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { format } from "date-fns";

interface Invoice {
  id: string;
  amount_due: number;
  status: string;
  created: number;
  due_date?: number;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
}

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: resp, error: err } = await supabase.functions.invoke(
          "stripe-admin-api",
          { body: { path: "list-invoices", payload: { limit: 50 } } }
        );
        if (err) throw err;
        const list: any[] = resp.data || [];
        const mapped = list.map((inv) => ({
          id: inv.id,
          amount_due: inv.amount_due,
          status: inv.status,
          created: inv.created,
          due_date: inv.due_date,
          invoice_pdf: inv.invoice_pdf,
          hosted_invoice_url: inv.hosted_invoice_url,
        }));
        setInvoices(mapped);
      } catch (e: any) {
        console.error("Error fetching invoices:", e);
        setError(e.message || "Failed to fetch invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewStripe = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "stripe-admin-api",
        {
          body: {
            path: "get-dashboard-link",
            payload: { resourceType: "invoice", resourceId: invoiceId },
          },
        }
      );
      if (error) throw error;
      Linking.openURL(data.link);
    } catch (e: any) {
      console.error("Error opening Stripe dashboard:", e);
      Alert.alert("Error", e.message || "Failed to open Stripe dashboard");
    }
  };

  const handleDownloadPDF = (url?: string) => {
    if (!url) {
      Alert.alert("No PDF available for this invoice");
      return;
    }
    Linking.openURL(url);
  };

  const filtered = invoices.filter((inv) =>
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#15803d" />
        <Text className="mt-2 text-gray-600">Loading invoices...</Text>
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
          Invoice Management
        </Text>
        <Text className="text-white opacity-80 mt-1">
          List of Stripe invoices
        </Text>
      </View>

      {/* Search */}
      <View className="p-4 bg-white">
        <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-md">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search by Invoice ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Invoice List */}
      <ScrollView className="px-4">
        {filtered.map((inv) => (
          <View
            key={inv.id}
            className="bg-white border border-gray-200 rounded-lg mb-3 p-4 shadow-sm"
          >
            <Text className="font-semibold text-gray-800">{inv.id}</Text>
            <Text className="text-gray-600 text-sm">
              Amount Due: ${(inv.amount_due / 100).toFixed(2)}
            </Text>
            <Text className="text-gray-600 text-sm">Status: {inv.status}</Text>
            <Text className="text-gray-600 text-sm">
              Created: {format(new Date(inv.created * 1000), "yyyy-MM-dd")}
            </Text>
            {inv.due_date && (
              <Text className="text-gray-600 text-sm">
                Due: {format(new Date(inv.due_date * 1000), "yyyy-MM-dd")}
              </Text>
            )}
            <View className="flex-row space-x-2 mt-3">
              <TouchableOpacity
                className="bg-blue-50 px-3 py-1 rounded-md"
                onPress={() => handleViewStripe(inv.id)}
              >
                <Text className="text-blue-700 font-medium">
                  View in Stripe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-50 px-3 py-1 rounded-md"
                onPress={() => handleDownloadPDF(inv.invoice_pdf)}
              >
                <Text className="text-gray-700 font-medium">Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {filtered.length === 0 && (
          <View className="items-center py-10">
            <Text className="text-gray-500">No invoices found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InvoiceManagement;
