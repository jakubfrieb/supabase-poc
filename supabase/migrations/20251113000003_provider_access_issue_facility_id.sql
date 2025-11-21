-- Allow providers to get facility_id for issues they have open requests for
-- We use a security definer function to avoid RLS recursion issues
-- This function returns facility_id if provider has an open request for the issue

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

