import { supabase } from "../lib/supabase";

/**
 * Custom Claims Manager
 *
 * This module provides functions for interacting with the Supabase custom claims system.
 * Based on the official implementation: https://github.com/supabase-community/supabase-custom-claims
 */

/**
 * Get all claims for the current user from the server
 * @returns The claims data and any error
 */
export const getMyClaimsFn = async () => {
  const { data, error } = await supabase.rpc("get_my_claims");
  return { data, error };
};

/**
 * Get a specific claim for the current user from the server
 * @param claim The name of the claim to retrieve
 * @returns The claim value and any error
 */
export const getMyClaimFn = async (claim: string) => {
  const { data, error } = await supabase.rpc("get_my_claim", { claim });
  return { data, error };
};

/**
 * Check if the current user is a claims admin
 * @returns Boolean indicating admin status and any error
 */
export const isClaimsAdminFn = async () => {
  const { data, error } = await supabase.rpc("is_claims_admin");
  return { data, error };
};

/**
 * Get all claims for a specific user (admin only)
 * @param uid The user's UUID
 * @returns The claims data and any error
 */
export const getClaimsFn = async (uid: string) => {
  const { data, error } = await supabase.rpc("get_claims", { uid });
  return { data, error };
};

/**
 * Get a specific claim for a user (admin only)
 * @param uid The user's UUID
 * @param claim The name of the claim to retrieve
 * @returns The claim value and any error
 */
export const getClaimFn = async (uid: string, claim: string) => {
  const { data, error } = await supabase.rpc("get_claim", { uid, claim });
  return { data, error };
};

/**
 * Set a claim for a user (admin only)
 * @param uid The user's UUID
 * @param claim The name of the claim to set
 * @param value The value to set for the claim (must be a valid JSON value)
 * @returns Status message and any error
 */
export const setClaimFn = async (uid: string, claim: string, value: any) => {
  const { data, error } = await supabase.rpc("set_claim", {
    uid,
    claim,
    value,
  });
  return { data, error };
};

/**
 * Delete a claim for a user (admin only)
 * @param uid The user's UUID
 * @param claim The name of the claim to delete
 * @returns Status message and any error
 */
export const deleteClaimFn = async (uid: string, claim: string) => {
  const { data, error } = await supabase.rpc("delete_claim", { uid, claim });
  return { data, error };
};

/**
 * Refresh the session to update claims in the token
 * @returns The updated user and any error
 */
export const refreshClaims = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.refreshSession();
  return { user, error };
};

/**
 * Get claims from the local session
 * @returns The claims object or null if not available
 */
export const getLocalClaims = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.app_metadata || null;
};

/**
 * Bootstrap the first admin user (to be run in SQL editor)
 * This is provided as a reference - you need to run this SQL directly:
 * select set_claim('YOUR_USER_ID_UUID', 'claims_admin', 'true');
 */
