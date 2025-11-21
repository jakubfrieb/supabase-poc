-- Fix ambiguous column reference "id" in confirm_appointment function
CREATE OR REPLACE FUNCTION public.confirm_appointment(
  appointment_uuid UUID,
  issue_uuid UUID
)
RETURNS TABLE (
  id UUID,
  issue_id UUID,
  provider_id UUID,
  proposed_date DATE,
  proposed_time TIME,
  proposed_by UUID,
  proposed_at TIMESTAMPTZ,
  status TEXT,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_confirm BOOLEAN;
BEGIN
  -- Check if user has permission to confirm
  SELECT EXISTS (
    SELECT 1 FROM public.issues
    WHERE issues.id = issue_uuid
      AND (
        (issues.requires_cooperation = FALSE 
          AND EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = issues.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          ))
        OR (issues.requires_cooperation = TRUE AND issues.cooperation_user_id = auth.uid())
        OR issues.created_by = auth.uid()
      )
  ) INTO can_confirm;

  IF NOT can_confirm THEN
    RAISE EXCEPTION 'User does not have permission to confirm this appointment';
  END IF;

  -- Update appointment status
  UPDATE public.service_appointments
  SET 
    status = 'confirmed',
    confirmed_by = auth.uid(),
    confirmed_at = NOW(),
    updated_at = NOW()
  WHERE service_appointments.id = appointment_uuid;

  -- Update issue with selected appointment
  UPDATE public.issues
  SET selected_appointment_id = appointment_uuid
  WHERE issues.id = issue_uuid;

  -- Reject other appointments
  UPDATE public.service_appointments
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE service_appointments.issue_id = issue_uuid
    AND service_appointments.id != appointment_uuid
    AND service_appointments.status = 'proposed';

  -- Return the updated appointment
  RETURN QUERY
  SELECT 
    sa.id,
    sa.issue_id,
    sa.provider_id,
    sa.proposed_date,
    sa.proposed_time,
    sa.proposed_by,
    sa.proposed_at,
    sa.status,
    sa.confirmed_by,
    sa.confirmed_at,
    sa.notes,
    sa.created_at,
    sa.updated_at
  FROM public.service_appointments sa
  WHERE sa.id = appointment_uuid;
END;
$$;

