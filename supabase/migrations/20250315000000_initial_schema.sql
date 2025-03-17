-- Migration: Initial Schema
-- Description: Creates the base tables and triggers for the RefreshLawn application
-- Version: 20250315000000

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table - Extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('customer', 'technician', 'admin')),
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  profile_image_url TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table - Lawn care service offerings
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recurring_plans table - Subscription plan options
CREATE TABLE IF NOT EXISTS recurring_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  discount_percentage DECIMAL(5, 2),
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table - Service appointments
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  technician_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES services(id) NOT NULL,
  recurring_plan_id UUID REFERENCES recurring_plans(id),
  status TEXT CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  price DECIMAL(10, 2) NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  address TEXT,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table - Customer reviews for completed services
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  technician_id UUID REFERENCES profiles(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_methods table - Stored payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for profile creation after user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  role_val text;
BEGIN
  -- Check if role is provided in user metadata
  role_val := NEW.raw_user_meta_data->>'role';
  
  -- If no role specified, default to 'customer'
  IF role_val IS NULL OR role_val = '' THEN
    role_val := 'customer';
  END IF;
  
  -- Create profile with specified or default role
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, role_val);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;
CREATE TRIGGER create_profile_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_user();

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_services_modtime ON services;
CREATE TRIGGER update_services_modtime
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_recurring_plans_modtime ON recurring_plans;
CREATE TRIGGER update_recurring_plans_modtime
BEFORE UPDATE ON recurring_plans
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_bookings_modtime ON bookings;
CREATE TRIGGER update_bookings_modtime
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Sample data for testing
INSERT INTO services (name, description, base_price, duration_minutes, is_active)
VALUES 
  ('Basic Lawn Mowing', 'Standard lawn mowing service for residential yards.', 45.00, 60, true),
  ('Premium Lawn Care', 'Complete lawn care including mowing, edging, and cleanup.', 75.00, 90, true),
  ('Garden Maintenance', 'Weeding, pruning, and general garden upkeep.', 60.00, 75, true);

INSERT INTO recurring_plans (name, description, frequency, discount_percentage)
VALUES 
  ('Weekly Service', 'Service performed every week.', 'weekly', 10.00),
  ('Biweekly Service', 'Service performed every two weeks.', 'biweekly', 5.00),
  ('Monthly Service', 'Service performed once a month.', 'monthly', 0.00); 