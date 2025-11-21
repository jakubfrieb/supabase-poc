-- Fix: Remove problematic RLS policy that causes infinite recursion
-- Replace with RPC function approach

-- First, drop the problematic policy if it exists
DROP POLICY IF EXISTS "Providers can read facility_id for issues with open requests" ON public.issues;

-- Create RPC function to get facility_id for providers
-- This avoids RLS recursion issues by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_issue_facility_id_for_provider(issue_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_facility_id UUID;
BEGIN
  -- Check if provider has an open request for this issue
  SELECT i.facility_id INTO result_facility_id
  FROM public.issues i
  INNER JOIN public.issue_service_requests isr ON isr.issue_id = i.id
  WHERE i.id = issue_uuid
    AND isr.status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.service_registrations sr
      WHERE sr.provider_id = auth.uid()
        AND sr.service_id = isr.service_id
        AND sr.status = 'active'
        AND (sr.paid_until IS NULL OR sr.paid_until > NOW())
    )
  LIMIT 1;
  
  RETURN result_facility_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_issue_facility_id_for_provider(UUID) TO authenticated;

-- Create RPC function to get full issue for providers
-- This allows providers to view issue details if they have an open request OR have applied to it
CREATE OR REPLACE FUNCTION public.get_issue_for_provider(issue_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  facility_id UUID,
  created_by UUID,
  requires_cooperation BOOLEAN,
  cooperation_user_id UUID,
  assigned_provider_id UUID,
  selected_appointment_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.status,
    i.priority,
    i.facility_id,
    i.created_by,
    i.requires_cooperation,
    i.cooperation_user_id,
    i.assigned_provider_id,
    i.selected_appointment_id,
    i.created_at,
    i.updated_at
  FROM public.issues i
  INNER JOIN public.issue_service_requests isr ON isr.issue_id = i.id
  WHERE i.id = issue_uuid
    AND (
      -- Provider has active registration for the service
      EXISTS (
        SELECT 1 FROM public.service_registrations sr
        WHERE sr.provider_id = auth.uid()
          AND sr.service_id = isr.service_id
          AND sr.status = 'active'
          AND (sr.paid_until IS NULL OR sr.paid_until > NOW())
      )
      OR
      -- Provider has applied to this request
      EXISTS (
        SELECT 1 FROM public.service_applications sa
        WHERE sa.request_id = isr.id
          AND sa.provider_id = auth.uid()
          AND sa.status IN ('pending', 'selected')
      )
      OR
      -- Provider is assigned to this issue
      i.assigned_provider_id = auth.uid()
    )
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_issue_for_provider(UUID) TO authenticated;

