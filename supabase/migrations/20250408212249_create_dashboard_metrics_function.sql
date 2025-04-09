-- Migration: Create Dashboard Metrics Function
-- Description: Creates a PostgreSQL function to retrieve dashboard metrics in a single query

-- Create or replace the function
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS json AS $$
DECLARE
  total_bookings_count integer;
  completed_bookings_count integer;
  total_revenue numeric;
  customer_count integer;
  avg_rating numeric;
BEGIN
  -- Get total bookings count
  SELECT COUNT(*) INTO total_bookings_count FROM bookings;
  
  -- Get completed bookings count
  SELECT COUNT(*) INTO completed_bookings_count FROM bookings WHERE status = 'completed';
  
  -- Get total revenue
  SELECT COALESCE(SUM(price), 0) INTO total_revenue FROM bookings WHERE status = 'completed';
  
  -- Get customer count
  SELECT COUNT(*) INTO customer_count FROM profiles WHERE role = 'customer';
  
  -- Get average rating
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating FROM reviews;
  
  RETURN json_build_object(
    'totalBookings', total_bookings_count,
    'completedBookings', completed_bookings_count,
    'totalRevenue', total_revenue,
    'customerCount', customer_count,
    'averageRating', avg_rating
  );
END;
$$ LANGUAGE plpgsql; 