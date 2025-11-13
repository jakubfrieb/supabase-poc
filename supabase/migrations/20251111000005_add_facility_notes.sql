-- Add notes field to facilities table
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS notes TEXT;

