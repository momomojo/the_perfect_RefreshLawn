-- This file is a simple test to verify our migrations
-- It will check if the tables and functions we expect exist

-- Check if tables exist
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') AS profiles_exists;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') AS services_exists;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_plans') AS recurring_plans_exists;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') AS bookings_exists;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') AS reviews_exists;
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') AS payment_methods_exists;

-- Check if JWT functions exist
SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook') AS custom_access_token_hook_exists;
SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_role_to_jwt') AS add_user_role_to_jwt_exists;
SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_role_in_jwt_metadata') AS update_user_role_in_jwt_metadata_exists;

-- Check if RLS is enabled on tables
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'services', 'recurring_plans', 'bookings', 'reviews', 'payment_methods');

-- Check if triggers exist
SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE tgname IN ('create_profile_after_signup', 'add_role_on_user_creation', 'add_role_on_user_login');

-- This file can be run using the Supabase dashboard SQL editor to verify that our migrations have been applied correctly 