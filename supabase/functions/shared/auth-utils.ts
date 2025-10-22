/**
 * Authentication Utilities for Supabase Edge Functions
 *
 * Provides JWT verification and role-based authorization helpers.
 * This is the CANONICAL source - all Edge Functions should import from here.
 */

import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

/**
 * Get Supabase client with service role key (bypasses RLS)
 * Use for admin operations that need elevated permissions
 */
export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get Supabase client with anon key (respects RLS)
 * Use for user-scoped operations
 */
export function getSupabaseClientForAuth() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Verify JWT from request and get authenticated user
 * @param req - Incoming HTTP request
 * @returns User object if valid, null otherwise
 */
export async function verifyUser(req: Request): Promise<User | null> {
  const supabase = getSupabaseClientForAuth();

  // Get the JWT token from the request
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    console.error('[Auth] No auth token provided');
    return null;
  }

  // Verify the JWT token
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[Auth] Verification failed:', error?.message);
    return null;
  }

  return user;
}

/**
 * Check if a user has admin role
 * @param userId - User ID to check
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[Auth] Error checking admin status:', error.message);
    return false;
  }

  return data?.role === 'admin';
}

/**
 * Check if a user has technician role
 * @param userId - User ID to check
 * @returns true if user is technician, false otherwise
 */
export async function isTechnician(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[Auth] Error checking technician status:', error.message);
    return false;
  }

  return data?.role === 'technician';
}

/**
 * Get user role from database
 * @param userId - User ID to check
 * @returns User role or null if not found
 */
export async function getUserRole(
  userId: string
): Promise<'customer' | 'technician' | 'admin' | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[Auth] Error fetching user role:', error.message);
    return null;
  }

  return data?.role || null;
}

/**
 * Require admin role - throws error if user is not admin
 * @param req - Incoming HTTP request
 * @returns User object if admin, throws otherwise
 */
export async function requireAdmin(req: Request): Promise<User> {
  const user = await verifyUser(req);

  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const isAdminUser = await isAdmin(user.id);

  if (!isAdminUser) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}
