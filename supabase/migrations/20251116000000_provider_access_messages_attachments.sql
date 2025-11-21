-- Allow providers to access issue messages and attachments
-- Providers should be able to view messages/attachments if they:
-- 1. Are assigned to the issue (assigned_provider_id)
-- 2. Have an open request for the issue with active service registration
-- 3. Have applied to a request for the issue (status 'pending' or 'selected')

-- Update issue_messages SELECT policy to include providers
DROP POLICY IF EXISTS "Members can read messages for issues they have access to" ON public.issue_messages;
CREATE POLICY "Members can read messages for issues they have access to"
  ON public.issue_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_messages.issue_id
      AND (
        -- Facility owner or member
        public.is_facility_owner(i.facility_id)
        OR EXISTS (
          SELECT 1 FROM public.facility_members m
          WHERE m.facility_id = i.facility_id
          AND m.user_id = auth.uid()
        )
        OR
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
    )
  );

-- Update issue_messages INSERT policy to include providers
DROP POLICY IF EXISTS "Members can create messages for issues they have access to" ON public.issue_messages;
CREATE POLICY "Members can create messages for issues they have access to"
  ON public.issue_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_id
      AND (
        -- Facility owner or member
        public.is_facility_owner(i.facility_id)
        OR EXISTS (
          SELECT 1 FROM public.facility_members m
          WHERE m.facility_id = i.facility_id
          AND m.user_id = auth.uid()
        )
        OR
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
    )
  );

-- Update issue_attachments SELECT policy to include providers
DROP POLICY IF EXISTS "Members can read issue attachments" ON public.issue_attachments;
CREATE POLICY "Members can read issue attachments"
  ON public.issue_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_attachments.issue_id
      AND (
        -- Facility owner or member
        public.is_facility_owner(i.facility_id)
        OR EXISTS (
          SELECT 1 FROM public.facility_members m
          WHERE m.facility_id = i.facility_id
          AND m.user_id = auth.uid()
        )
        OR
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
    )
  );

-- Update issue_attachments INSERT policy to include providers
DROP POLICY IF EXISTS "Members can create issue attachments" ON public.issue_attachments;
CREATE POLICY "Members can create issue attachments"
  ON public.issue_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_id
      AND (
        -- Facility owner or member
        public.is_facility_owner(i.facility_id)
        OR EXISTS (
          SELECT 1 FROM public.facility_members m
          WHERE m.facility_id = i.facility_id
          AND m.user_id = auth.uid()
        )
        OR
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
    )
  );

