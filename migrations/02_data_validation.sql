-- Data validation queries to identify potential constraint violations

-- Check for invalid status values in bookings table
SELECT id, status 
FROM bookings 
WHERE status NOT IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');

-- Check for duplicate stripe_customer_id values in profiles table
SELECT stripe_customer_id, COUNT(*) 
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
GROUP BY stripe_customer_id 
HAVING COUNT(*) > 1;

-- Check for orphaned foreign keys in bookings table
-- Customer references
SELECT b.id, b.customer_id 
FROM bookings b 
LEFT JOIN profiles p ON b.customer_id = p.id 
WHERE p.id IS NULL;

-- Technician references
SELECT b.id, b.technician_id 
FROM bookings b 
LEFT JOIN profiles p ON b.technician_id = p.id 
WHERE b.technician_id IS NOT NULL AND p.id IS NULL;

-- Service references
SELECT b.id, b.service_id 
FROM bookings b 
LEFT JOIN services s ON b.service_id = s.id 
WHERE s.id IS NULL;

-- Recurring plan references
SELECT b.id, b.recurring_plan_id 
FROM bookings b 
LEFT JOIN recurring_plans r ON b.recurring_plan_id = r.id 
WHERE b.recurring_plan_id IS NOT NULL AND r.id IS NULL;

-- Results from these queries will help identify data that needs cleaning
-- before adding constraints to avoid migration failures 