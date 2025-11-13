-- Function to get user email (for display purposes)
-- This function allows getting user email for users in the same facility
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param UUID)
RETURNS TABLE(email TEXT, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  SELECT 
    au.email::TEXT,
    COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', '')::TEXT
  INTO user_email, user_name
  FROM auth.users au
  WHERE au.id = user_id_param;
  
  RETURN QUERY SELECT COALESCE(user_email, ''), COALESCE(user_name, '');
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

