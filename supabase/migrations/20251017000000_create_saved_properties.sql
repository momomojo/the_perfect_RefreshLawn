-- Migration: Create Saved Properties
-- Description: Allows customers to save property addresses for quick checkout
-- Version: 20251017000000

-- Create saved_properties table
CREATE TABLE IF NOT EXISTS saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL, -- e.g., "Home", "Vacation House", "Mom's House"
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  property_size TEXT, -- small, medium, large, extra_large
  area_type TEXT, -- front_yard, back_yard, both
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_customer_nickname UNIQUE (customer_id, nickname)
);

-- Create index on customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_properties_customer_id ON saved_properties(customer_id);

-- Create index on is_default for default property queries
CREATE INDEX IF NOT EXISTS idx_saved_properties_default ON saved_properties(customer_id, is_default);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_saved_properties_modtime ON saved_properties;
CREATE TRIGGER update_saved_properties_modtime
BEFORE UPDATE ON saved_properties
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own saved properties
CREATE POLICY "Customers can view own saved properties"
  ON saved_properties
  FOR SELECT
  USING (
    customer_id = auth.uid()
    OR
    -- Allow admins to view all properties
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Customers can insert their own saved properties
CREATE POLICY "Customers can create own saved properties"
  ON saved_properties
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Policy: Customers can update their own saved properties
CREATE POLICY "Customers can update own saved properties"
  ON saved_properties
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Policy: Customers can delete their own saved properties
CREATE POLICY "Customers can delete own saved properties"
  ON saved_properties
  FOR DELETE
  USING (customer_id = auth.uid());

-- Function to set a property as default (ensures only one default per customer)
CREATE OR REPLACE FUNCTION set_default_property(property_id UUID, user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Validate that the property belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM saved_properties
    WHERE id = property_id AND customer_id = user_id
  ) THEN
    RAISE EXCEPTION 'Property not found or access denied';
  END IF;

  -- Remove default flag from all user's properties
  UPDATE saved_properties
  SET is_default = FALSE
  WHERE customer_id = user_id;

  -- Set the specified property as default
  UPDATE saved_properties
  SET is_default = TRUE
  WHERE id = property_id AND customer_id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_default_property(UUID, UUID) TO authenticated;

COMMENT ON TABLE saved_properties IS 'Stores customer property addresses for quick checkout during booking';
COMMENT ON FUNCTION set_default_property(UUID, UUID) IS 'Sets a saved property as the default for a customer, ensuring only one default property exists';
