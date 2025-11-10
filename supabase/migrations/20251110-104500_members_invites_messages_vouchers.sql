-- Migration: members, invites, messages, vouchers, and subscription columns
-- Safe, idempotent migration (can be run multiple times)

-- Add subscription columns to facilities if missing
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'pending' CHECK (subscription_status IN ('pending','paused','active'));
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;

-- Create facility_members
CREATE TABLE IF NOT EXISTS public.facility_members (
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (facility_id, user_id)
);
ALTER TABLE public.facility_members ENABLE ROW LEVEL SECURITY;

-- Create facility_invites
CREATE TABLE IF NOT EXISTS public.facility_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member','viewer')),
  max_uses INT DEFAULT 1,
  uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.facility_invites ENABLE ROW LEVEL SECURITY;

-- Create issue_messages
CREATE TABLE IF NOT EXISTS public.issue_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issue_messages_issue_id ON public.issue_messages(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_messages_user_id ON public.issue_messages(user_id);
ALTER TABLE public.issue_messages ENABLE ROW LEVEL SECURITY;

-- Create vouchers (managed by admin app)
CREATE TABLE IF NOT EXISTS public.vouchers (
  code TEXT PRIMARY KEY,
  months INT NOT NULL DEFAULT 12,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

-- Policies (drop-if-exists then create)
DROP POLICY IF EXISTS "Members can view their membership" ON public.facility_members;
CREATE POLICY "Members can view their membership"
  ON public.facility_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.facilities f WHERE f.id = facility_id AND f.user_id = auth.uid()));

DROP POLICY IF EXISTS "Owners/admins can add members" ON public.facility_members;
CREATE POLICY "Owners/admins can add members"
  ON public.facility_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_id
      AND (f.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.facility_members m
        WHERE m.facility_id = facility_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
      ))
    )
  );

DROP POLICY IF EXISTS "Owners/admins can update members" ON public.facility_members;
CREATE POLICY "Owners/admins can update members"
  ON public.facility_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_id
      AND (f.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.facility_members m
        WHERE m.facility_id = facility_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
      ))
    )
  );

DROP POLICY IF EXISTS "Owners/admins can delete members" ON public.facility_members;
CREATE POLICY "Owners/admins can delete members"
  ON public.facility_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_id
      AND (f.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.facility_members m
        WHERE m.facility_id = facility_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
      ))
    )
  );

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
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_id
      AND (f.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.facility_members m
        WHERE m.facility_id = facility_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
      ))
    )
  );

DROP POLICY IF EXISTS "Owners/admins can update invites" ON public.facility_invites;
CREATE POLICY "Owners/admins can update invites"
  ON public.facility_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = facility_id
      AND (f.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.facility_members m
        WHERE m.facility_id = facility_id AND m.user_id = auth.uid() AND m.role IN ('owner','admin')
      ))
    )
  );

DROP POLICY IF EXISTS "Members can read messages for issues they have access to" ON public.issue_messages;
CREATE POLICY "Members can read messages for issues they have access to"
  ON public.issue_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.issues i
      LEFT JOIN public.facilities f ON f.id = i.facility_id
      LEFT JOIN public.facility_members m ON m.facility_id = i.facility_id AND m.user_id = auth.uid()
      WHERE i.id = issue_messages.issue_id
      AND (f.user_id = auth.uid() OR m.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can create messages for issues they have access to" ON public.issue_messages;
CREATE POLICY "Members can create messages for issues they have access to"
  ON public.issue_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.issues i
      LEFT JOIN public.facilities f ON f.id = i.facility_id
      LEFT JOIN public.facility_members m ON m.facility_id = i.facility_id AND m.user_id = auth.uid()
      WHERE i.id = issue_id
      AND (f.user_id = auth.uid() OR m.user_id = auth.uid())
    )
    AND user_id = auth.uid()
  );

-- Vouchers read policy
DROP POLICY IF EXISTS "Authenticated can read vouchers" ON public.vouchers;
CREATE POLICY "Authenticated can read vouchers"
  ON public.vouchers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Storage bucket for attachments (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-attachments', 'issue-attachments', true)
ON CONFLICT (id) DO NOTHING;


