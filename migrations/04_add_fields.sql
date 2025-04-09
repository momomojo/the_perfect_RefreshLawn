-- Add Stripe-related fields to services table

-- Check if columns already exist (to make migration idempotent)
DO $$ 
BEGIN 
    -- Add stripe_product_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'stripe_product_id'
    ) THEN
        ALTER TABLE services ADD COLUMN stripe_product_id text;
    END IF;

    -- Add stripe_price_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'stripe_price_id'
    ) THEN
        ALTER TABLE services ADD COLUMN stripe_price_id text;
    END IF;
END $$; 