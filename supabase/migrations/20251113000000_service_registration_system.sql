-- Service Registration System Migration
-- Creates all tables for service provider registration, service requests, applications, and appointments

-- 1. Services catalog
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2) DEFAULT 20.00,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Service providers (dodavatelé)
CREATE TABLE IF NOT EXISTS public.service_providers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  ico TEXT,
  dic TEXT,
  address TEXT,
  phone TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Service registrations (registrace služeb dodavatelem)
CREATE TABLE IF NOT EXISTS public.service_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(user_id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  paid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, service_id)
);

-- 4. Service vouchers (vouchery pro služby - 3 měsíce zdarma)
CREATE TABLE IF NOT EXISTS public.service_vouchers (
  code TEXT PRIMARY KEY,
  months INTEGER DEFAULT 3,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Service voucher uses (použití voucherů)
CREATE TABLE IF NOT EXISTS public.service_voucher_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_code TEXT NOT NULL REFERENCES public.service_vouchers(code),
  provider_id UUID NOT NULL REFERENCES public.service_providers(user_id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voucher_code, provider_id)
);

-- 6. Issue service requests (poptávky na služby pro závady)
CREATE TABLE IF NOT EXISTS public.issue_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(issue_id, service_id)
);

-- 7. Service applications (přihlášky dodavatelů na poptávku)
CREATE TABLE IF NOT EXISTS public.service_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.issue_service_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, provider_id)
);

-- 8. Service appointments (termíny)
CREATE TABLE IF NOT EXISTS public.service_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(user_id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  proposed_time TIME NOT NULL,
  proposed_by UUID NOT NULL REFERENCES auth.users(id),
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'rejected', 'completed')),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Service payments (platby za služby - bankovní převod)
CREATE TABLE IF NOT EXISTS public.service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.service_registrations(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  payment_reference TEXT,
  payment_instructions TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend issues table
ALTER TABLE public.issues 
  ADD COLUMN IF NOT EXISTS requires_cooperation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cooperation_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_provider_id UUID REFERENCES public.service_providers(user_id),
  ADD COLUMN IF NOT EXISTS selected_appointment_id UUID REFERENCES public.service_appointments(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_registrations_provider_id ON public.service_registrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_registrations_service_id ON public.service_registrations(service_id);
CREATE INDEX IF NOT EXISTS idx_service_registrations_status ON public.service_registrations(status);
CREATE INDEX IF NOT EXISTS idx_service_registrations_paid_until ON public.service_registrations(paid_until);

CREATE INDEX IF NOT EXISTS idx_issue_service_requests_issue_id ON public.issue_service_requests(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_service_requests_service_id ON public.issue_service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_issue_service_requests_status ON public.issue_service_requests(status);

CREATE INDEX IF NOT EXISTS idx_service_applications_request_id ON public.service_applications(request_id);
CREATE INDEX IF NOT EXISTS idx_service_applications_provider_id ON public.service_applications(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_applications_status ON public.service_applications(status);

CREATE INDEX IF NOT EXISTS idx_service_appointments_issue_id ON public.service_appointments(issue_id);
CREATE INDEX IF NOT EXISTS idx_service_appointments_provider_id ON public.service_appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_appointments_status ON public.service_appointments(status);
CREATE INDEX IF NOT EXISTS idx_service_appointments_proposed_date ON public.service_appointments(proposed_date);

CREATE INDEX IF NOT EXISTS idx_service_payments_registration_id ON public.service_payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_status ON public.service_payments(status);

CREATE INDEX IF NOT EXISTS idx_issues_assigned_provider_id ON public.issues(assigned_provider_id);
CREATE INDEX IF NOT EXISTS idx_issues_selected_appointment_id ON public.issues(selected_appointment_id);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_service_providers_updated_at ON public.service_providers;
CREATE TRIGGER update_service_providers_updated_at
BEFORE UPDATE ON public.service_providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_registrations_updated_at ON public.service_registrations;
CREATE TRIGGER update_service_registrations_updated_at
BEFORE UPDATE ON public.service_registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_issue_service_requests_updated_at ON public.issue_service_requests;
CREATE TRIGGER update_issue_service_requests_updated_at
BEFORE UPDATE ON public.issue_service_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_applications_updated_at ON public.service_applications;
CREATE TRIGGER update_service_applications_updated_at
BEFORE UPDATE ON public.service_applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_appointments_updated_at ON public.service_appointments;
CREATE TRIGGER update_service_appointments_updated_at
BEFORE UPDATE ON public.service_appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_payments_updated_at ON public.service_payments;
CREATE TRIGGER update_service_payments_updated_at
BEFORE UPDATE ON public.service_payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_voucher_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- services: Everyone can read active services
DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
CREATE POLICY "Anyone can read active services"
  ON public.services FOR SELECT
  USING (active = TRUE);

-- service_providers: Providers can view own profile
DROP POLICY IF EXISTS "Providers can view own profile" ON public.service_providers;
CREATE POLICY "Providers can view own profile"
  ON public.service_providers FOR SELECT
  USING (user_id = auth.uid());

-- service_providers: Admins can view provider profiles for their issues
DROP POLICY IF EXISTS "Admins can view provider profiles" ON public.service_providers;
CREATE POLICY "Admins can view provider profiles"
  ON public.service_providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_applications sa
      JOIN public.issue_service_requests isr ON sa.request_id = isr.id
      JOIN public.issues i ON isr.issue_id = i.id
      WHERE sa.provider_id = service_providers.user_id
        AND (
          i.created_by = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = i.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- service_providers: Providers can manage own profile
DROP POLICY IF EXISTS "Providers can manage own profile" ON public.service_providers;
CREATE POLICY "Providers can manage own profile"
  ON public.service_providers FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- service_registrations: Providers can view own registrations
DROP POLICY IF EXISTS "Providers can view own registrations" ON public.service_registrations;
CREATE POLICY "Providers can view own registrations"
  ON public.service_registrations FOR SELECT
  USING (provider_id = auth.uid());

-- service_registrations: Providers can create registrations
DROP POLICY IF EXISTS "Providers can create registrations" ON public.service_registrations;
CREATE POLICY "Providers can create registrations"
  ON public.service_registrations FOR INSERT
  WITH CHECK (provider_id = auth.uid());

-- service_registrations: Providers can update own registrations
DROP POLICY IF EXISTS "Providers can update own registrations" ON public.service_registrations;
CREATE POLICY "Providers can update own registrations"
  ON public.service_registrations FOR UPDATE
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- service_vouchers: Authenticated can read vouchers
DROP POLICY IF EXISTS "Authenticated can read vouchers" ON public.service_vouchers;
CREATE POLICY "Authenticated can read vouchers"
  ON public.service_vouchers FOR SELECT
  USING (auth.role() = 'authenticated');

-- service_voucher_uses: Providers can view own uses
DROP POLICY IF EXISTS "Providers can view own voucher uses" ON public.service_voucher_uses;
CREATE POLICY "Providers can view own voucher uses"
  ON public.service_voucher_uses FOR SELECT
  USING (provider_id = auth.uid());

-- service_voucher_uses: Providers can create uses (via function)
DROP POLICY IF EXISTS "Providers can create voucher uses" ON public.service_voucher_uses;
CREATE POLICY "Providers can create voucher uses"
  ON public.service_voucher_uses FOR INSERT
  WITH CHECK (provider_id = auth.uid());

-- issue_service_requests: Admins can view requests for their issues
DROP POLICY IF EXISTS "Admins can view requests for their issues" ON public.issue_service_requests;
CREATE POLICY "Admins can view requests for their issues"
  ON public.issue_service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_service_requests.issue_id
        AND (
          issues.created_by = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = issues.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- issue_service_requests: Providers can view open requests for their services
DROP POLICY IF EXISTS "Providers can view open requests for their services" ON public.issue_service_requests;
CREATE POLICY "Providers can view open requests for their services"
  ON public.issue_service_requests FOR SELECT
  USING (
    status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.service_registrations
      WHERE service_registrations.provider_id = auth.uid()
        AND service_registrations.service_id = issue_service_requests.service_id
        AND service_registrations.status = 'active'
        AND (service_registrations.paid_until IS NULL OR service_registrations.paid_until > NOW())
    )
  );

-- issue_service_requests: Admins can create requests
DROP POLICY IF EXISTS "Admins can create requests" ON public.issue_service_requests;
CREATE POLICY "Admins can create requests"
  ON public.issue_service_requests FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_service_requests.issue_id
        AND (
          issues.created_by = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = issues.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- issue_service_requests: Admins can update requests
DROP POLICY IF EXISTS "Admins can update requests" ON public.issue_service_requests;
CREATE POLICY "Admins can update requests"
  ON public.issue_service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = issue_service_requests.issue_id
        AND (
          issues.created_by = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = issues.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- service_applications: Providers can view own applications
DROP POLICY IF EXISTS "Providers can view own applications" ON public.service_applications;
CREATE POLICY "Providers can view own applications"
  ON public.service_applications FOR SELECT
  USING (provider_id = auth.uid());

-- service_applications: Admins can view applications for their requests
DROP POLICY IF EXISTS "Admins can view applications for their requests" ON public.service_applications;
CREATE POLICY "Admins can view applications for their requests"
  ON public.service_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issue_service_requests isr
      JOIN public.issues i ON isr.issue_id = i.id
      WHERE isr.id = service_applications.request_id
        AND (
          i.created_by = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = i.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- service_applications: Providers can create applications
DROP POLICY IF EXISTS "Providers can create applications" ON public.service_applications;
CREATE POLICY "Providers can create applications"
  ON public.service_applications FOR INSERT
  WITH CHECK (provider_id = auth.uid());

-- service_applications: Admins can update application status
DROP POLICY IF EXISTS "Admins can update application status" ON public.service_applications;
CREATE POLICY "Admins can update application status"
  ON public.service_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.issue_service_requests isr
      JOIN public.issues i ON isr.issue_id = i.id
      WHERE isr.id = service_applications.request_id
        AND (
          i.created_by = auth.uid() 
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = i.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- service_appointments: Participants can view appointments
DROP POLICY IF EXISTS "Participants can view appointments" ON public.service_appointments;
CREATE POLICY "Participants can view appointments"
  ON public.service_appointments FOR SELECT
  USING (
    provider_id = auth.uid()  -- Dodavatel
    OR EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = service_appointments.issue_id
        AND (
          issues.created_by = auth.uid()  -- Zadavatel
          OR issues.cooperation_user_id = auth.uid()  -- Spolupracující uživatel
          OR EXISTS (
            SELECT 1 FROM public.facility_members fm
            WHERE fm.facility_id = issues.facility_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('owner', 'admin')
          )
        )
    )
  );

-- service_appointments: Participants can propose appointments
DROP POLICY IF EXISTS "Participants can propose appointments" ON public.service_appointments;
CREATE POLICY "Participants can propose appointments"
  ON public.service_appointments FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid()
    AND (
      provider_id = auth.uid()  -- Dodavatel
      OR EXISTS (
        SELECT 1 FROM public.issues
        WHERE issues.id = service_appointments.issue_id
          AND (
            issues.created_by = auth.uid() 
            OR EXISTS (
              SELECT 1 FROM public.facility_members fm
              WHERE fm.facility_id = issues.facility_id
                AND fm.user_id = auth.uid()
                AND fm.role IN ('owner', 'admin')
            )
          )
      )
    )
  );

-- service_appointments: Authorized users can confirm appointments
DROP POLICY IF EXISTS "Authorized users can confirm appointments" ON public.service_appointments;
CREATE POLICY "Authorized users can confirm appointments"
  ON public.service_appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = service_appointments.issue_id
        AND (
          (issues.requires_cooperation = FALSE 
            AND EXISTS (
              SELECT 1 FROM public.facility_members fm
              WHERE fm.facility_id = issues.facility_id
                AND fm.user_id = auth.uid()
                AND fm.role IN ('owner', 'admin')
            ))
          OR (issues.requires_cooperation = TRUE AND issues.cooperation_user_id = auth.uid())
        )
    )
  );

-- service_payments: Providers can view own payments
DROP POLICY IF EXISTS "Providers can view own payments" ON public.service_payments;
CREATE POLICY "Providers can view own payments"
  ON public.service_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_registrations
      WHERE service_registrations.id = service_payments.registration_id
        AND service_registrations.provider_id = auth.uid()
    )
  );

-- service_payments: Providers can create payments
DROP POLICY IF EXISTS "Providers can create payments" ON public.service_payments;
CREATE POLICY "Providers can create payments"
  ON public.service_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_registrations
      WHERE service_registrations.id = service_payments.registration_id
        AND service_registrations.provider_id = auth.uid()
    )
  );

-- service_payments: Admins can update payment status (for manual confirmation)
-- Note: This would typically be done via service_role, but we'll allow facility admins for now
DROP POLICY IF EXISTS "Admins can update payment status" ON public.service_payments;
CREATE POLICY "Admins can update payment status"
  ON public.service_payments FOR UPDATE
  USING (true)  -- Will be restricted by application logic or service_role
  WITH CHECK (true);

