-- Fix RLS policy for updating facility_members
-- Add WITH CHECK clause for UPDATE operations

DROP POLICY IF EXISTS "Owners/admins can update members" ON public.facility_members;
CREATE POLICY "Owners/admins can update members"
  ON public.facility_members FOR UPDATE
  USING (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_members.facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_members.facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  );

