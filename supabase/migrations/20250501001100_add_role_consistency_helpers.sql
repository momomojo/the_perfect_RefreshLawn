-- Migration: Add Role Consistency Helpers
-- Description: Create functions to check and fix inconsistent role assignments
-- Version: 20250501001100

-- 1. Create a function to check for inconsistent role assignments
CREATE OR REPLACE FUNCTION public.check_role_consistency()
RETURNS TABLE (
    user_id uuid,
    email text,
    profiles_role text,
    user_roles_role text,
    user_metadata_role text,
    app_metadata_role text,
    consistency_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id, 
        u.email,
        p.role as profiles_role,
        ur.role::text as user_roles_role,
        u.raw_user_meta_data->>'role' as user_metadata_role,
        u.raw_app_meta_data->>'role' as app_metadata_role,
        CASE 
            WHEN ur.role IS NULL THEN 'MISSING USER_ROLES'
            WHEN p.role::text != ur.role::text THEN 'MISMATCH PROFILES/USER_ROLES'
            WHEN p.role IS NULL THEN 'MISSING PROFILE'
            WHEN (u.raw_user_meta_data->>'role') IS NULL THEN 'MISSING USER_METADATA'
            WHEN (u.raw_app_meta_data->>'role') IS NULL THEN 'MISSING APP_METADATA'
            WHEN p.role::text != (u.raw_user_meta_data->>'role') THEN 'MISMATCH PROFILE/USER_METADATA'
            WHEN p.role::text != (u.raw_app_meta_data->>'role') THEN 'MISMATCH PROFILE/APP_METADATA'
            ELSE 'OK'
        END as consistency_status
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to fix inconsistent role assignments
CREATE OR REPLACE FUNCTION public.fix_user_role_consistency(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
    user_id uuid,
    email text,
    previous_status text,
    action_taken text,
    new_status text
) AS $$
DECLARE
    user_record RECORD;
    source_role text;
    previous_status text;
    action_taken text;
BEGIN
    -- Loop through users with inconsistent roles
    FOR user_record IN 
        SELECT u.id, u.email, p.id as profile_id, p.role as profile_role, 
               ur.id as user_role_id, ur.role as user_role, 
               u.raw_user_meta_data->>'role' as user_meta_role,
               u.raw_app_meta_data->>'role' as app_meta_role,
               CASE 
                WHEN ur.role IS NULL THEN 'MISSING USER_ROLES'
                WHEN p.role::text != ur.role::text THEN 'MISMATCH PROFILES/USER_ROLES'
                WHEN p.role IS NULL THEN 'MISSING PROFILE'
                WHEN (u.raw_user_meta_data->>'role') IS NULL THEN 'MISSING USER_METADATA'
                WHEN (u.raw_app_meta_data->>'role') IS NULL THEN 'MISSING APP_METADATA'
                WHEN p.role::text != (u.raw_user_meta_data->>'role') THEN 'MISMATCH PROFILE/USER_METADATA'
                WHEN p.role::text != (u.raw_app_meta_data->>'role') THEN 'MISMATCH PROFILE/APP_METADATA'
                ELSE 'OK'
               END as status
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        WHERE (target_user_id IS NULL OR u.id = target_user_id)
        AND (
            ur.role IS NULL OR
            p.role IS NULL OR
            p.role::text != ur.role::text OR
            (u.raw_user_meta_data->>'role') IS NULL OR
            (u.raw_app_meta_data->>'role') IS NULL OR
            p.role::text != (u.raw_user_meta_data->>'role') OR
            p.role::text != (u.raw_app_meta_data->>'role')
        )
    LOOP
        user_id := user_record.id;
        email := user_record.email;
        previous_status := user_record.status;
        action_taken := '';
        
        -- Determine the source of truth for the role
        -- Priority: profile_role > user_role > user_meta_role > app_meta_role > 'customer'
        source_role := COALESCE(
            user_record.profile_role,
            user_record.user_role::text,
            user_record.user_meta_role,
            user_record.app_meta_role,
            'customer'
        );
        
        -- 1. Fix missing profile if needed
        IF user_record.profile_id IS NULL THEN
            INSERT INTO public.profiles (id, role)
            VALUES (user_record.id, source_role);
            
            action_taken := action_taken || 'Created profile. ';
        -- 2. Fix mismatched profile role
        ELSIF user_record.profile_role != source_role THEN
            UPDATE public.profiles 
            SET role = source_role
            WHERE id = user_record.id;
            
            action_taken := action_taken || 'Updated profile role. ';
        END IF;
        
        -- 3. Fix missing or mismatched user_roles entry
        IF user_record.user_role_id IS NULL THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (user_record.id, source_role::app_role)
            ON CONFLICT (user_id, role) DO NOTHING;
            
            action_taken := action_taken || 'Created user_role. ';
        ELSIF user_record.user_role::text != source_role THEN
            -- Delete existing role
            DELETE FROM public.user_roles 
            WHERE user_id = user_record.id;
            
            -- Insert new role
            INSERT INTO public.user_roles (user_id, role)
            VALUES (user_record.id, source_role::app_role);
            
            action_taken := action_taken || 'Updated user_role. ';
        END IF;
        
        -- 4. Fix user metadata
        IF user_record.user_meta_role IS NULL OR user_record.user_meta_role != source_role THEN
            UPDATE auth.users
            SET raw_user_meta_data = 
                jsonb_set(
                    COALESCE(raw_user_meta_data, '{}'::jsonb),
                    '{role}',
                    to_jsonb(source_role)
                )
            WHERE id = user_record.id;
            
            action_taken := action_taken || 'Updated user_metadata. ';
        END IF;
        
        -- 5. Fix app metadata
        IF user_record.app_meta_role IS NULL OR user_record.app_meta_role != source_role THEN
            UPDATE auth.users
            SET raw_app_meta_data = 
                jsonb_set(
                    COALESCE(raw_app_meta_data, '{}'::jsonb),
                    '{role}',
                    to_jsonb(source_role)
                )
            WHERE id = user_record.id;
            
            action_taken := action_taken || 'Updated app_metadata. ';
        END IF;
        
        -- Get the new status
        SELECT 
            CASE 
                WHEN ur.role IS NULL THEN 'MISSING USER_ROLES'
                WHEN p.role::text != ur.role::text THEN 'MISMATCH PROFILES/USER_ROLES'
                WHEN p.role IS NULL THEN 'MISSING PROFILE'
                WHEN (u.raw_user_meta_data->>'role') IS NULL THEN 'MISSING USER_METADATA'
                WHEN (u.raw_app_meta_data->>'role') IS NULL THEN 'MISSING APP_METADATA'
                WHEN p.role::text != (u.raw_user_meta_data->>'role') THEN 'MISMATCH PROFILE/USER_METADATA'
                WHEN p.role::text != (u.raw_app_meta_data->>'role') THEN 'MISMATCH PROFILE/APP_METADATA'
                ELSE 'OK'
            END INTO new_status
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        WHERE u.id = user_record.id;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add RPC function to fix a specific user's role consistency (for use from client)
CREATE OR REPLACE FUNCTION public.fix_my_role_consistency()
RETURNS JSONB AS $$
DECLARE
    result RECORD;
BEGIN
    -- Call the fix function for the current user only
    SELECT * INTO result FROM public.fix_user_role_consistency(auth.uid()) LIMIT 1;
    
    -- Return a JSON result
    RETURN jsonb_build_object(
        'success', true,
        'user_id', result.user_id,
        'previous_status', result.previous_status,
        'action_taken', result.action_taken,
        'new_status', result.new_status
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_role_consistency TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_user_role_consistency TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_my_role_consistency TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.check_role_consistency IS 
'Checks for inconsistencies in role assignments across profiles, user_roles, and metadata.';

COMMENT ON FUNCTION public.fix_user_role_consistency IS 
'Fixes inconsistencies in role assignments. If no user_id is provided, fixes all users.';

COMMENT ON FUNCTION public.fix_my_role_consistency IS 
'Allows authenticated users to fix their own role consistency issues.'; 