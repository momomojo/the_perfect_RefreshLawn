-- Migration: Truncate bookings table and reset identity
-- Timestamp: 20250419222343

TRUNCATE TABLE public.bookings RESTART IDENTITY CASCADE;
