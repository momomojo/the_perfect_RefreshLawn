-- Migration: Create core Stripe tables (customers, subscriptions, payments, invoices)

-- Create customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    CREATE TABLE public.customers (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      stripe_customer_id text NOT NULL UNIQUE,
      email text,
      name text,
      phone text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz
    );
  END IF;
END $$;

-- Create subscriptions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    CREATE TABLE public.subscriptions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      stripe_subscription_id text NOT NULL UNIQUE,
      stripe_customer_id text NOT NULL REFERENCES public.customers(stripe_customer_id) ON DELETE CASCADE,
      status text NOT NULL,
      price_id text NOT NULL,
      current_period_start timestamptz,
      current_period_end timestamptz,
      canceled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz
    );
  END IF;
END $$;

-- Create payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    CREATE TABLE public.payments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
      stripe_payment_id text NOT NULL UNIQUE,
      stripe_customer_id text NOT NULL REFERENCES public.customers(stripe_customer_id) ON DELETE CASCADE,
      amount integer NOT NULL,
      currency text NOT NULL,
      status text NOT NULL,
      payment_method text,
      error_message text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Create invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoices'
  ) THEN
    CREATE TABLE public.invoices (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      stripe_invoice_id text NOT NULL UNIQUE,
      stripe_customer_id text NOT NULL REFERENCES public.customers(stripe_customer_id) ON DELETE CASCADE,
      stripe_subscription_id text REFERENCES public.subscriptions(stripe_subscription_id),
      amount_paid integer NOT NULL,
      currency text NOT NULL,
      status text NOT NULL,
      invoice_pdf text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$; 