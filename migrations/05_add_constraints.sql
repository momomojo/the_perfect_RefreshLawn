-- Add constraints with NOT VALID approach for minimal disruption

-- 1. Add status value constraint as NOT VALID (initial addition without validation)
ALTER TABLE bookings ADD CONSTRAINT valid_status_values
    CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')) NOT VALID;

-- 2. Add unique constraint for stripe_customer_id
-- First check if any duplicates exist (run validation query from 02_data_validation.sql)
ALTER TABLE profiles ADD CONSTRAINT unique_stripe_customer_id
    UNIQUE (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
    
-- 3. Validate the status constraint after fixing any invalid values
-- Only run this after verifying all data conforms to the constraint
-- ALTER TABLE bookings VALIDATE CONSTRAINT valid_status_values;

-- Note: The VALIDATE step is commented out because it should only be run
-- after confirming that all data meets the constraint requirements.
-- Run the validation queries first, fix any issues, then run the VALIDATE. 