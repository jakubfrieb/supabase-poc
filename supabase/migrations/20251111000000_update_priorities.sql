-- Update priority values in issues table
-- Map old values to new values:
-- 'low' -> 'idea'
-- 'medium' -> 'normal'
-- 'high' -> 'high' (stays the same)
-- 'urgent' -> 'urgent' (stays the same, but we add 'critical' as new option)

-- First, drop the old constraint to allow new values during update
ALTER TABLE public.issues 
DROP CONSTRAINT IF EXISTS issues_priority_check;

-- Update existing data
UPDATE public.issues 
SET priority = CASE 
  WHEN priority = 'low' THEN 'idea'
  WHEN priority = 'medium' THEN 'normal'
  ELSE priority
END;

-- Add new constraint with updated priority values
ALTER TABLE public.issues 
ADD CONSTRAINT issues_priority_check 
CHECK (priority IN ('idea', 'normal', 'high', 'critical', 'urgent'));

-- Update default value
ALTER TABLE public.issues 
ALTER COLUMN priority SET DEFAULT 'normal';

