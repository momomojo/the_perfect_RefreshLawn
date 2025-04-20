-- Migration: Update subscription_status and invoice_status enums for Stripe compatibility
-- Adds missing Stripe status values to the enums if not already present

-- Add missing values to subscription_status
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';

-- Add missing values to invoice_status
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'deleted';
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'marked_uncollectible';
