-- Fix for missing user_roles entries for existing users
-- This ensures all users have correct entries in the user_roles table

-- 1. Fix user_roles for users that have profiles but no user_roles entry
DO $$
DECLARE
  user_record RECORD;
  insert_count INT := 0;
  error_count INT := 0;
BEGIN
  -- Find users with profiles but no user_roles entry
  FOR user_record IN 
    SELECT u.id, p.role 
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE ur.id IS NULL
  LOOP
    BEGIN
      -- Insert into user_roles using the profile role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_record.id, user_record.role::app_role);
      
      insert_count := insert_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE WARNING 'Error inserting user_role for user %. Role: %. Error: %',
        user_record.id, user_record.role, SQLERRM;
      error_count := error_count + 1;
    END;
  END LOOP;
  
  -- Log summary
  RAISE NOTICE 'User roles fix summary: % roles inserted, % errors', 
    insert_count, error_count;
END $$;

-- 2. Fix inconsistencies between profiles and user_roles
DO $$
DECLARE
  user_record RECORD;
  update_count INT := 0;
  error_count INT := 0;
BEGIN
  -- Find users with mismatched roles
  FOR user_record IN 
    SELECT u.id, p.role as profile_role, ur.role as user_role
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE p.role::text != ur.role::text
  LOOP
    BEGIN
      -- Update user_roles to match profiles
      DELETE FROM public.user_roles WHERE user_id = user_record.id;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_record.id, user_record.profile_role::app_role);
      
      update_count := update_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE WARNING 'Error updating user_role for user %. Profile role: %. User role: %. Error: %',
        user_record.id, user_record.profile_role, user_record.user_role, SQLERRM;
      error_count := error_count + 1;
    END;
  END LOOP;
  
  -- Log summary
  RAISE NOTICE 'Role consistency fix summary: % roles updated, % errors', 
    update_count, error_count;
END $$;

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
    INSERT INTO public.migration_logs (migration_name, description)
    VALUES ('20250510000007_fix_missing_user_roles', 'Fixed missing user_roles entries for existing users')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END $$; 