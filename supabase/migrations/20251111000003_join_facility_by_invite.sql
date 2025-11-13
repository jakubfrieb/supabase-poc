-- Allow users to join facilities using invite codes
-- This function bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.join_facility_by_invite(invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate invite code
  SELECT facility_id, role, uses, max_uses, expires_at
  INTO v_invite
  FROM public.facility_invites
  WHERE code = invite_code
  FOR UPDATE; -- Lock row to prevent race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Neplatný kód pozvánky';
  END IF;

  -- Check expiration
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'Kód vypršel';
  END IF;

  -- Check max uses
  IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Kód již byl použit';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.facility_members
    WHERE facility_id = v_invite.facility_id
    AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Již jste členem této nemovitosti';
  END IF;

  -- Insert membership
  INSERT INTO public.facility_members (facility_id, user_id, role)
  VALUES (v_invite.facility_id, v_user_id, v_invite.role)
  ON CONFLICT (facility_id, user_id) DO NOTHING;

  -- Increment usage count
  UPDATE public.facility_invites
  SET uses = uses + 1
  WHERE code = invite_code;

  RETURN jsonb_build_object(
    'success', true,
    'facility_id', v_invite.facility_id,
    'role', v_invite.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_facility_by_invite(TEXT) TO authenticated;

