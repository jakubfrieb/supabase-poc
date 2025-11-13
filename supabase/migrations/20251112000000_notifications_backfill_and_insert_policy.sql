-- Allow users to insert their own notifications (for testing and backfill)
-- This is useful for creating test notifications or backfilling from existing issues
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Backfill notifications from existing issues
-- This creates notifications for all existing issues that don't have notifications yet
INSERT INTO public.notifications (user_id, type, title, body, data)
SELECT DISTINCT
  f.user_id,
  'issue_created'::text,
  'Nová závada'::text,
  (f.name || ': ' || i.title)::text,
  jsonb_build_object(
    'issueId', i.id,
    'facilityId', i.facility_id,
    'facilityName', f.name
  )
FROM public.issues i
INNER JOIN public.facilities f ON i.facility_id = f.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.notifications n 
  WHERE n.data->>'issueId' = i.id::text
    AND n.user_id = f.user_id
)
ON CONFLICT DO NOTHING;

