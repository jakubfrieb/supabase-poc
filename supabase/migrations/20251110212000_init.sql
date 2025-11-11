-- INIT MIGRATION (clean schema without circular RLS)
-- Safe to apply on empty/reset DB
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tables
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status TEXT NOT NULL DEFAULT 'pending' CHECK (subscription_status IN ('pending','paused','active')),
  paid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.facility_members (
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (facility_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.facility_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  max_uses INT DEFAULT 1,
  uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.issue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issue_messages_issue_id ON public.issue_messages(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_messages_user_id ON public.issue_messages(user_id);

-- Simple vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
  code TEXT PRIMARY KEY,
  months INT NOT NULL DEFAULT 12,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);
INSERT INTO public.vouchers (code, months, active, expires_at)
VALUES ('spinacspojitosti', 12, true, NULL)
ON CONFLICT (code) DO NOTHING;

-- Push tokens
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('ios','android','web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token ON public.user_push_tokens(token);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facilities_user_id ON public.facilities(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_facility_id ON public.issues(facility_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON public.issues(created_by);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);

-- Helper functions (SECURITY DEFINER, no circular deps)
-- Runs with definer privileges and uses only public/auth schemas
CREATE OR REPLACE FUNCTION public.is_facility_owner(facility_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = facility_uuid AND user_id = auth.uid()
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_facility_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facility_owner(UUID) TO service_role;

-- RLS enable
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- vouchers
DROP POLICY IF EXISTS "Authenticated can read vouchers" ON public.vouchers;
CREATE POLICY "Authenticated can read vouchers"
  ON public.vouchers FOR SELECT
  USING (auth.role() = 'authenticated');

-- facilities (NO is_facility_owner here to avoid self-reference)
DROP POLICY IF EXISTS "Users can view their own facilities" ON public.facilities;
CREATE POLICY "Users can view their own facilities"
  ON public.facilities FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can view facilities they belong to" ON public.facilities;
CREATE POLICY "Members can view facilities they belong to"
  ON public.facilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facilities.id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own facilities" ON public.facilities;
CREATE POLICY "Users can create their own facilities"
  ON public.facilities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own facilities" ON public.facilities;
CREATE POLICY "Users can update their own facilities"
  ON public.facilities FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own facilities" ON public.facilities;
CREATE POLICY "Users can delete their own facilities"
  ON public.facilities FOR DELETE
  USING (auth.uid() = user_id);

-- facility_members
DROP POLICY IF EXISTS "Members can view their membership" ON public.facility_members;
CREATE POLICY "Members can view their membership"
  ON public.facility_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_facility_owner(facility_id));

DROP POLICY IF EXISTS "Owners/admins can add members" ON public.facility_members;
CREATE POLICY "Owners/admins can add members"
  ON public.facility_members FOR INSERT
  WITH CHECK (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "Owners/admins can update members" ON public.facility_members;
CREATE POLICY "Owners/admins can update members"
  ON public.facility_members FOR UPDATE
  USING (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "Owners/admins can delete members" ON public.facility_members;
CREATE POLICY "Owners/admins can delete members"
  ON public.facility_members FOR DELETE
  USING (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  );

-- facility_invites
DROP POLICY IF EXISTS "Authenticated can read valid invites" ON public.facility_invites;
CREATE POLICY "Authenticated can read valid invites"
  ON public.facility_invites FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    (max_uses IS NULL OR uses < max_uses)
  );

DROP POLICY IF EXISTS "Owners/admins can create invites" ON public.facility_invites;
CREATE POLICY "Owners/admins can create invites"
  ON public.facility_invites FOR INSERT
  WITH CHECK (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "Owners/admins can update invites" ON public.facility_invites;
CREATE POLICY "Owners/admins can update invites"
  ON public.facility_invites FOR UPDATE
  USING (
    public.is_facility_owner(facility_id)
    OR EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
    )
  );

-- issues
DROP POLICY IF EXISTS "Users can view issues from their facilities" ON public.issues;
CREATE POLICY "Users can view issues from their facilities"
  ON public.issues FOR SELECT
  USING (public.is_facility_owner(issues.facility_id));

DROP POLICY IF EXISTS "Members can view issues from facilities they belong to" ON public.issues;
CREATE POLICY "Members can view issues from facilities they belong to"
  ON public.issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = issues.facility_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create issues in their facilities" ON public.issues;
CREATE POLICY "Users can create issues in their facilities"
  ON public.issues FOR INSERT
  WITH CHECK (public.is_facility_owner(facility_id));

DROP POLICY IF EXISTS "Members can create issues in facilities they belong to" ON public.issues;
CREATE POLICY "Members can create issues in facilities they belong to"
  ON public.issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = facility_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update issues in their facilities" ON public.issues;
CREATE POLICY "Users can update issues in their facilities"
  ON public.issues FOR UPDATE
  USING (public.is_facility_owner(issues.facility_id));

DROP POLICY IF EXISTS "Members can update issues in facilities they belong to" ON public.issues;
CREATE POLICY "Members can update issues in facilities they belong to"
  ON public.issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = issues.facility_id
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete issues in their facilities" ON public.issues;
CREATE POLICY "Users can delete issues in their facilities"
  ON public.issues FOR DELETE
  USING (public.is_facility_owner(issues.facility_id));

DROP POLICY IF EXISTS "Members can delete issues in facilities they belong to" ON public.issues;
CREATE POLICY "Members can delete issues in facilities they belong to"
  ON public.issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_members m
      WHERE m.facility_id = issues.facility_id
      AND m.user_id = auth.uid()
    )
  );

-- issue_messages
DROP POLICY IF EXISTS "Members can read messages for issues they have access to" ON public.issue_messages;
CREATE POLICY "Members can read messages for issues they have access to"
  ON public.issue_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_messages.issue_id
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

DROP POLICY IF EXISTS "Members can create messages for issues they have access to" ON public.issue_messages;
CREATE POLICY "Members can create messages for issues they have access to"
  ON public.issue_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
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

-- user_push_tokens RLS
DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can view their own push tokens"
  ON public.user_push_tokens FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can insert their own push tokens"
  ON public.user_push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can update their own push tokens"
  ON public.user_push_tokens FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can delete their own push tokens"
  ON public.user_push_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Storage bucket and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-attachments', 'issue-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload issue attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload issue attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'issue-attachments');

DROP POLICY IF EXISTS "Anyone can read issue attachments" ON storage.objects;
CREATE POLICY "Anyone can read issue attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'issue-attachments');

DROP POLICY IF EXISTS "Users can delete their own issue attachments" ON storage.objects;
CREATE POLICY "Users can delete their own issue attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'issue-attachments' AND auth.uid() = owner);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SET search_path = public;

DROP TRIGGER IF EXISTS update_facilities_updated_at ON public.facilities;
CREATE TRIGGER update_facilities_updated_at
BEFORE UPDATE ON public.facilities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_issues_updated_at ON public.issues;
CREATE TRIGGER update_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


