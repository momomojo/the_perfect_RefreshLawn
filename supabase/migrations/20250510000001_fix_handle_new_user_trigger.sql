-- Migration: Fix Handle New User Trigger Function
-- Description: Improves error handling and diagnostics in the handle_new_user function
-- Version: 20250510000001

-- Drop the old trigger first to ensure a clean implementation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an improved function with better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Check if role exists in raw_user_meta_data, otherwise default to 'customer'
    INSERT INTO public.profiles (id, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error details
    RAISE WARNING 'Error in handle_new_user function: %. User ID: %. Raw metadata: %',
      SQLERRM, NEW.id, NEW.raw_user_meta_data;
      
    -- Fall back to just creating a basic profile with customer role
    -- We want to ensure a profile is created even if there's an issue with the metadata
    BEGIN
      INSERT INTO public.profiles (id, role)
      VALUES (NEW.id, 'customer');
    EXCEPTION WHEN OTHERS THEN
      -- If even the fallback fails, log but don't fail the entire transaction
      RAISE WARNING 'Critical error in handle_new_user fallback: %. User ID: %',
        SQLERRM, NEW.id;
    END;
  END;
  
  -- Continue with the transaction regardless of profile creation success
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the new function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the purpose
COMMENT ON FUNCTION public.handle_new_user IS 
'Trigger function to create a profile when a new user signs up, with improved error handling.
If the function encounters an error while processing user metadata, it will fall back to creating
a basic profile with the customer role rather than failing the entire transaction.'; 