-- Migration to remove remnants of the Stripe FDW setup attempt.
-- Uses IF EXISTS to ensure idempotency and prevent errors if objects were not created or already removed.

-- Drop the foreign tables (if they were somehow created despite import failure)
-- Note: Dropping the schema with CASCADE should handle this, but being explicit doesn't hurt.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_table ft JOIN pg_catalog.pg_class c ON c.oid = ft.ftrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'stripe' AND c.relname = 'customers') THEN
        DROP FOREIGN TABLE stripe.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_table ft JOIN pg_catalog.pg_class c ON c.oid = ft.ftrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'stripe' AND c.relname = 'subscriptions') THEN
        DROP FOREIGN TABLE stripe.subscriptions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_table ft JOIN pg_catalog.pg_class c ON c.oid = ft.ftrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'stripe' AND c.relname = 'invoices') THEN
        DROP FOREIGN TABLE stripe.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_table ft JOIN pg_catalog.pg_class c ON c.oid = ft.ftrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'stripe' AND c.relname = 'payment_methods') THEN
        DROP FOREIGN TABLE stripe.payment_methods;
    END IF;
END $$;

-- Drop user mappings for the server
DO $$
DECLARE
    server_exists boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'stripe_server') INTO server_exists;
    IF server_exists THEN
        IF EXISTS (SELECT 1 FROM pg_user_mappings WHERE srvname = 'stripe_server' AND umuser = 'authenticator'::regrole) THEN
            DROP USER MAPPING FOR authenticator SERVER stripe_server;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_user_mappings WHERE srvname = 'stripe_server' AND umuser = 'service_role'::regrole) THEN
            DROP USER MAPPING FOR service_role SERVER stripe_server;
        END IF;
    END IF;
END $$;


-- Drop the foreign server
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'stripe_server') THEN
        DROP SERVER stripe_server CASCADE;
    END IF;
END $$;

-- Drop the FDW extension if it exists and is no longer needed
-- Check if the stripe_wrapper exists first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'stripe_wrapper') THEN
      -- Optional: Check if any other servers use this wrapper before dropping.
      -- If not, or if we are sure it's safe to remove:
      -- DROP EXTENSION IF EXISTS stripe_wrapper CASCADE;
      -- For now, let's comment out the drop extension, as it might be used elsewhere or required by other parts not tracked.
      -- If the intention is a full cleanup of this specific FDW setup, uncomment the line above.
      -- RAISE NOTICE 'Stripe FDW extension exists but is not being dropped by this migration.';
    END IF;
END $$;


-- Drop the schema created for FDW
DROP SCHEMA IF EXISTS stripe CASCADE;
