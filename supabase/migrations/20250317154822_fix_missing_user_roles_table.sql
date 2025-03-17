-- Migration to add the missing app_role enum type and user_roles table
-- These are required by other migrations but were missing in the initial schema

-- Create the app_role enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('customer', 'technician', 'admin');
    END IF;
END$$;

-- Create the user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Apply updated_at trigger to user_roles table
DROP TRIGGER IF EXISTS update_user_roles_modtime ON user_roles;
CREATE TRIGGER update_user_roles_modtime
BEFORE UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Add RLS to user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Simplified RLS policies for user_roles to avoid circular dependency
-- These will be replaced by more specific policies in later migrations
CREATE POLICY "Admin can manage all user roles" ON public.user_roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can read their own roles" ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
