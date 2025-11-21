-- Add max_uses field to service_vouchers table
-- Allows vouchers to be used multiple times (default: 1)

ALTER TABLE public.service_vouchers
  ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1 NOT NULL;

-- Update existing vouchers to have max_uses = 1 if NULL
UPDATE public.service_vouchers
  SET max_uses = 1
  WHERE max_uses IS NULL;

