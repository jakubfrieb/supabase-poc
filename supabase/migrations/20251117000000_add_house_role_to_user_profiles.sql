-- Add house_role column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS house_role TEXT;

