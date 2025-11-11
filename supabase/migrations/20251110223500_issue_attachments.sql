-- Create issue_attachments table and RLS
CREATE TABLE IF NOT EXISTS public.issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON public.issue_attachments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_attachments_uploaded_by ON public.issue_attachments(uploaded_by);

ALTER TABLE public.issue_attachments ENABLE ROW LEVEL SECURITY;

-- Members/owners of the facility that owns the issue can read
DROP POLICY IF EXISTS "Members can read issue attachments" ON public.issue_attachments;
CREATE POLICY "Members can read issue attachments"
  ON public.issue_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_id
      AND (
        public.is_facility_owner(i.facility_id)
        OR EXISTS (
          SELECT 1 FROM public.facility_members m
          WHERE m.facility_id = i.facility_id
          AND m.user_id = auth.uid()
        )
      )
    )
  );

-- Members/owners can insert if they have access to the issue
DROP POLICY IF EXISTS "Members can create issue attachments" ON public.issue_attachments;
CREATE POLICY "Members can create issue attachments"
  ON public.issue_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_id
      AND (
        public.is_facility_owner(i.facility_id)
        OR EXISTS (
          SELECT 1 FROM public.facility_members m
          WHERE m.facility_id = i.facility_id
          AND m.user_id = auth.uid()
        )
      )
    )
  );

-- Owner or uploader can delete
DROP POLICY IF EXISTS "Owner or uploader can delete attachments" ON public.issue_attachments;
CREATE POLICY "Owner or uploader can delete attachments"
  ON public.issue_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_id
      AND public.is_facility_owner(i.facility_id)
    )
  );

