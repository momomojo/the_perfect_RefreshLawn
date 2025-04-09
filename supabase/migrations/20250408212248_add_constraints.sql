-- Migration: Add Data Constraints
-- Description: Adds constraints to ensure data integrity

-- 1. Add status value constraint as NOT VALID (initial addition without validation)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'valid_status_values'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT valid_status_values
            CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')) NOT VALID;
    END IF;
END $$;

-- 2. Add unique constraint for stripe_customer_id
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'unique_stripe_customer_id'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT unique_stripe_customer_id
            UNIQUE (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
    END IF;
END $$; 