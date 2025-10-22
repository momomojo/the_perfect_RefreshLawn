// Auth Utils
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// Assuming getSupabaseClient is defined elsewhere (e.g., in stripe-utils.ts or locally)
// If not, you'll need to include its definition here as well.
// Helper to get a Supabase client (Make sure this is consistent with stripe-utils.ts)
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}
// Verify JWT from request and get user
export async function verifyUser(req) {
  const supabase = getSupabaseClient();
  // Get the JWT token from the request
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    console.error('No auth token provided');
    return null;
  }
  // Verify the JWT token
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error('Auth verification failed:', error);
    return null;
  }
  return user;
}
// Check if a user has admin role
export async function isAdmin(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  return data?.role === 'admin';
}
