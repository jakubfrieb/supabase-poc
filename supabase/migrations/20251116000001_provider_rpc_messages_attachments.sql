-- Create RPC functions for providers to access messages and attachments
-- These functions use SECURITY DEFINER to bypass RLS and check access manually

-- Function to get messages for an issue (for providers)
CREATE OR REPLACE FUNCTION public.get_issue_messages_for_provider(issue_uuid UUID)
RETURNS TABLE (
  id UUID,
  issue_id UUID,
  user_id UUID,
  content TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.issue_id,
    im.user_id,
    im.content,
    im.attachment_url,
    im.created_at
  FROM public.issue_messages im
  INNER JOIN public.issues i ON i.id = im.issue_id
  WHERE im.issue_id = issue_uuid
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
  ORDER BY im.created_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_issue_messages_for_provider(UUID) TO authenticated;

-- Function to get attachments for an issue (for providers)
CREATE OR REPLACE FUNCTION public.get_issue_attachments_for_provider(issue_uuid UUID)
RETURNS TABLE (
  id UUID,
  issue_id UUID,
  uploaded_by UUID,
  file_name TEXT,
  content_type TEXT,
  file_size BIGINT,
  url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ia.id,
    ia.issue_id,
    ia.uploaded_by,
    ia.file_name,
    ia.content_type,
    ia.file_size,
    ia.url,
    ia.created_at
  FROM public.issue_attachments ia
  INNER JOIN public.issues i ON i.id = ia.issue_id
  WHERE ia.issue_id = issue_uuid
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
  ORDER BY ia.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_issue_attachments_for_provider(UUID) TO authenticated;

