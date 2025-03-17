-- Migration: Fix Role Consistency
-- Description: Ensure consistency between profiles.role and user_roles table
-- Version: 20250520000002

-- 1. Create a function to check and fix role inconsistencies
CREATE OR REPLACE FUNCTION public.check_and_fix_role_consistency()
RETURNS TABLE(result_user_id uuid, profile_role text, user_role_value text, action text) AS $$
DECLARE
    user_record RECORD;
    profile_role_val text;
    user_role_val text;
BEGIN
    -- Loop through all users and check for inconsistencies
    FOR user_record IN 
        SELECT p.id FROM profiles p
    LOOP
        -- Get the role from profiles
        SELECT role INTO profile_role_val 
        FROM profiles 
        WHERE id = user_record.id;
        
        -- Get the role from user_roles - use explicit column references
        SELECT ur.role::text INTO user_role_val 
        FROM user_roles ur
        WHERE ur.user_id = user_record.id
        LIMIT 1;
        
        -- Check for inconsistencies and fix them
        IF profile_role_val IS NULL AND user_role_val IS NOT NULL THEN
            -- Update profiles if role exists in user_roles but not in profiles
            UPDATE profiles 
            SET role = user_role_val
            WHERE id = user_record.id;
            
            result_user_id := user_record.id;
            profile_role := profile_role_val;
            user_role_value := user_role_val;
            action := 'Updated profile role from NULL to ' || user_role_val;
            RETURN NEXT;
            
        ELSIF profile_role_val IS NOT NULL AND user_role_val IS NULL THEN
            -- Insert into user_roles if role exists in profiles but not in user_roles
            BEGIN
                INSERT INTO user_roles(user_id, role)
                VALUES (user_record.id, profile_role_val::app_role);
                
                result_user_id := user_record.id;
                profile_role := profile_role_val;
                user_role_value := NULL;
                action := 'Added user_role from profile value: ' || profile_role_val;
                RETURN NEXT;
            EXCEPTION WHEN OTHERS THEN
                result_user_id := user_record.id;
                profile_role := profile_role_val;
                user_role_value := user_role_val;
                action := 'ERROR: Could not add user_role: ' || SQLERRM;
                RETURN NEXT;
            END;
            
        ELSIF profile_role_val IS NOT NULL AND user_role_val IS NOT NULL AND profile_role_val <> user_role_val THEN
            -- If both exist but are different, sync to user_roles value (the authoritative source)
            UPDATE profiles 
            SET role = user_role_val
            WHERE id = user_record.id;
            
            result_user_id := user_record.id;
            profile_role := profile_role_val;
            user_role_value := user_role_val;
            action := 'Updated profile role from ' || profile_role_val || ' to ' || user_role_val;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to run daily role consistency checks
CREATE OR REPLACE FUNCTION public.daily_role_consistency_check()
RETURNS void AS $$
BEGIN
    -- This function can be scheduled to run via cron job
    PERFORM check_and_fix_role_consistency();
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Improve the sync trigger from profiles to user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if role has changed and is not null
    IF OLD.role IS DISTINCT FROM NEW.role AND NEW.role IS NOT NULL THEN
        -- Log that we're syncing roles
        RAISE NOTICE 'Syncing role from profiles to user_roles for user %: % -> %', 
                     NEW.id, OLD.role, NEW.role;
        
        BEGIN
            -- Insert or update the role in user_roles
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, NEW.role::app_role)
            ON CONFLICT (user_id, role) 
            DO NOTHING;
            
            -- Delete any different roles for this user
            DELETE FROM public.user_roles
            WHERE user_id = NEW.id AND role::text != NEW.role;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to sync role from profiles to user_roles: %', SQLERRM;
        END;
    END IF;
  
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Improve the sync trigger from user_roles to profiles
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Log that we're syncing roles
    RAISE NOTICE 'Syncing role from user_roles to profiles for user %: %', 
                 NEW.user_id, NEW.role;
    
    BEGIN
        -- Update the role in profiles
        UPDATE public.profiles
        SET role = NEW.role::text
        WHERE id = NEW.user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to sync role from user_roles to profiles: %', SQLERRM;
    END;
  
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Run the consistency check to fix any existing inconsistencies
DO $$
BEGIN
    PERFORM check_and_fix_role_consistency();
END
$$;

-- 6. Ensure the role check is exposed as a secure RPC function for admin use
GRANT EXECUTE ON FUNCTION public.check_and_fix_role_consistency() TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_and_fix_role_consistency() FROM anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.check_and_fix_role_consistency IS 
'Checks for and fixes any inconsistencies between profiles.role and user_roles table.';

COMMENT ON FUNCTION public.daily_role_consistency_check IS 
'Function that can be scheduled to run daily to maintain role consistency.';

-- Insert a record into migration_logs if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_logs') THEN
        INSERT INTO public.migration_logs (migration_name, description)
        VALUES ('20250520000002_fix_role_consistency', 'Added functions to maintain consistency between profiles.role and user_roles')
        ON CONFLICT (migration_name) DO NOTHING;
    END IF;
END $$; 