-- Fix issue delete policy: only owners and admins can delete issues
-- Previously, all members could delete issues, which was incorrect

DROP POLICY IF EXISTS "Members can delete issues in facilities they belong to" ON public.issues;
CREATE POLICY "Admins can delete issues in facilities they belong to"
  ON public.issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = issues.facility_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
    )
  );

