-- Benchmark queries to measure performance before and after optimization
-- Run these queries and note execution times before implementing changes

-- Benchmark 1: Bookings by customer (frequently used query)
EXPLAIN ANALYZE 
SELECT * FROM bookings 
WHERE customer_id = '00000000-0000-0000-0000-000000000000' 
ORDER BY scheduled_date DESC;

-- Benchmark 2: Upcoming bookings by technician
EXPLAIN ANALYZE 
SELECT * FROM bookings 
WHERE technician_id = '00000000-0000-0000-0000-000000000000'
AND scheduled_date >= CURRENT_DATE
ORDER BY scheduled_date ASC;

-- Benchmark 3: Bookings by status
EXPLAIN ANALYZE 
SELECT * FROM bookings 
WHERE status = 'pending' 
ORDER BY scheduled_date ASC;

-- Benchmark 4: Customers by role
EXPLAIN ANALYZE 
SELECT * FROM profiles 
WHERE role = 'customer';

-- Benchmark 5: Composite query (technician bookings on a specific date)
EXPLAIN ANALYZE 
SELECT * FROM bookings 
WHERE technician_id = '00000000-0000-0000-0000-000000000000'
AND scheduled_date = '2023-01-01';

-- Benchmark 6: Dashboard query (total completed bookings revenue)
EXPLAIN ANALYZE 
SELECT SUM(price) FROM bookings 
WHERE status = 'completed';

-- Note: Replace the UUID placeholders with actual UUIDs from your database
-- Run these queries again after implementing indexes to measure improvement 