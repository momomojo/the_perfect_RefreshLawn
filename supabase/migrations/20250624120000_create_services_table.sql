-- Migration: Create services table
-- Description: Adds the services table for booking services metadata

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL,
  duration_minutes integer,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.services IS 'Services that can be booked, including name, price, and metadata';

COMMENT ON COLUMN public.services.name IS 'Name of the service (e.g., Lawn Mowing)';
COMMENT ON COLUMN public.services.description IS 'Detailed description of the service';
COMMENT ON COLUMN public.services.base_price IS 'Base price in decimal (e.g., dollars)';
COMMENT ON COLUMN public.services.duration_minutes IS 'Estimated duration of the service in minutes';
COMMENT ON COLUMN public.services.image_url IS 'URL for an image representing the service';
COMMENT ON COLUMN public.services.is_active IS 'Whether the service is currently available for booking';
COMMENT ON COLUMN public.services.stripe_product_id IS 'Stripe Product ID for integration';
COMMENT ON COLUMN public.services.stripe_price_id IS 'Stripe Price ID for integration';
COMMENT ON COLUMN public.services.created_at IS 'Timestamp when the service was created';
COMMENT ON COLUMN public.services.updated_at IS 'Timestamp when the service was last updated'; 