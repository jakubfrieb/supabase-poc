-- Fix RPC function to properly allow providers to access issues
-- Providers should be able to view issues if they have active registration for the service
-- OR if they have applied to the request OR if they are assigned to the issue

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
  WHERE i.id = issue_uuid
    AND (
      -- Provider is assigned to this issue
      i.assigned_provider_id = auth.uid()
      OR
      -- Provider has an open request for this issue with active service registration
      EXISTS (
        SELECT 1 
        FROM public.issue_service_requests isr
        INNER JOIN public.service_registrations sr ON sr.service_id = isr.service_id
        WHERE isr.issue_id = i.id
          AND isr.status = 'open'
          AND sr.provider_id = auth.uid()
          AND sr.status = 'active'
          AND (sr.paid_until IS NULL OR sr.paid_until > NOW())
      )
      OR
      -- Provider has applied to a request for this issue
      EXISTS (
        SELECT 1 
        FROM public.issue_service_requests isr
        INNER JOIN public.service_applications sa ON sa.request_id = isr.id
        WHERE isr.issue_id = i.id
          AND sa.provider_id = auth.uid()
          AND sa.status IN ('pending', 'selected')
      )
    )
  LIMIT 1;
END;
$$;

-- Also update the facility_id function to match
CREATE OR REPLACE FUNCTION public.get_issue_facility_id_for_provider(issue_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_facility_id UUID;
BEGIN
  SELECT i.facility_id INTO result_facility_id
  FROM public.issues i
  WHERE i.id = issue_uuid
    AND (
      -- Provider is assigned to this issue
      i.assigned_provider_id = auth.uid()
      OR
      -- Provider has an open request for this issue with active service registration
      EXISTS (
        SELECT 1 
        FROM public.issue_service_requests isr
        INNER JOIN public.service_registrations sr ON sr.service_id = isr.service_id
        WHERE isr.issue_id = i.id
          AND isr.status = 'open'
          AND sr.provider_id = auth.uid()
          AND sr.status = 'active'
          AND (sr.paid_until IS NULL OR sr.paid_until > NOW())
      )
      OR
      -- Provider has applied to a request for this issue
      EXISTS (
        SELECT 1 
        FROM public.issue_service_requests isr
        INNER JOIN public.service_applications sa ON sa.request_id = isr.id
        WHERE isr.issue_id = i.id
          AND sa.provider_id = auth.uid()
          AND sa.status IN ('pending', 'selected')
      )
    )
  LIMIT 1;
  
  RETURN result_facility_id;
END;
$$;

