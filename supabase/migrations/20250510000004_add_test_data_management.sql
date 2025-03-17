-- Migration: Add Test Data Management Functions
-- Description: Create functions for test data management
-- Version: 20250510000004

-- Function to safely delete all customers and providers (technicians) along with their related data
CREATE OR REPLACE FUNCTION public.delete_all_customers_and_providers()
RETURNS TABLE(status TEXT, customers_deleted INT, technicians_deleted INT, bookings_deleted INT, payment_methods_deleted INT, reviews_deleted INT) AS $$
DECLARE
    v_customers_deleted INT := 0;
    v_technicians_deleted INT := 0;
    v_bookings_deleted INT := 0;
    v_payment_methods_deleted INT := 0;
    v_reviews_deleted INT := 0;
BEGIN
    -- Safety check: Only allow admin users to run this function
    IF NOT auth.is_admin() THEN
        RETURN QUERY SELECT 'ERROR: Only admin users can perform this operation'::TEXT, 0, 0, 0, 0, 0;
        RETURN;
    END IF;

    -- Getting the admin user IDs to exclude them from deletion
    CREATE TEMP TABLE admin_ids AS
    SELECT user_id FROM public.user_roles WHERE role = 'admin';

    -- Delete reviews first (foreign key dependencies)
    WITH deleted_reviews AS (
        DELETE FROM public.reviews
        WHERE customer_id NOT IN (SELECT * FROM admin_ids)
        OR technician_id NOT IN (SELECT * FROM admin_ids)
        RETURNING *
    )
    SELECT COUNT(*) INTO v_reviews_deleted FROM deleted_reviews;

    -- Delete payment methods
    WITH deleted_payment_methods AS (
        DELETE FROM public.payment_methods
        WHERE customer_id NOT IN (SELECT * FROM admin_ids)
        RETURNING *
    )
    SELECT COUNT(*) INTO v_payment_methods_deleted FROM deleted_payment_methods;

    -- Delete bookings
    WITH deleted_bookings AS (
        DELETE FROM public.bookings
        WHERE customer_id NOT IN (SELECT * FROM admin_ids)
        OR technician_id NOT IN (SELECT * FROM admin_ids)
        RETURNING *
    )
    SELECT COUNT(*) INTO v_bookings_deleted FROM deleted_bookings;

    -- Delete user_roles for customers and technicians
    DELETE FROM public.user_roles
    WHERE role IN ('customer', 'technician')
    AND user_id NOT IN (SELECT * FROM admin_ids);

    -- Delete customer profiles and capture count
    WITH deleted_customers AS (
        DELETE FROM public.profiles
        WHERE role = 'customer'
        AND id NOT IN (SELECT * FROM admin_ids)
        RETURNING *
    )
    SELECT COUNT(*) INTO v_customers_deleted FROM deleted_customers;

    -- Delete technician profiles and capture count
    WITH deleted_technicians AS (
        DELETE FROM public.profiles
        WHERE role = 'technician'
        AND id NOT IN (SELECT * FROM admin_ids)
        RETURNING *
    )
    SELECT COUNT(*) INTO v_technicians_deleted FROM deleted_technicians;

    -- Delete the temp table
    DROP TABLE admin_ids;

    -- Return the results
    RETURN QUERY SELECT 
        'SUCCESS: All customers and providers deleted'::TEXT,
        v_customers_deleted,
        v_technicians_deleted,
        v_bookings_deleted,
        v_payment_methods_deleted,
        v_reviews_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins will be checked inside the function)
GRANT EXECUTE ON FUNCTION public.delete_all_customers_and_providers() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.delete_all_customers_and_providers IS 
'Deletes all customers and providers (technicians) along with their related data like bookings, payment methods, and reviews. Only admins can execute this function. Preserves admin users.'; 