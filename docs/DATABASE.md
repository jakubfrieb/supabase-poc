# Databázové schéma

## Přehled

Aplikace používá **PostgreSQL** databázi na Supabase s **Row Level Security (RLS)** pro bezpečnost.

## Hlavní tabulky

### facilities
Nemovitosti (domy, byty, atd.)

**Sloupce:**
- `id` (UUID, PK) - Unikátní identifikátor
- `name` (TEXT) - Název nemovitosti
- `description` (TEXT, nullable) - Popis
- `address` (TEXT, nullable) - Adresa
- `user_id` (UUID, FK → auth.users) - Vlastník
- `subscription_status` (TEXT) - Status předplatného: 'pending', 'paused', 'active'
- `paid_until` (TIMESTAMPTZ, nullable) - Platné do
- `notes` (TEXT, nullable) - Poznámky
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_facilities_user_id` na `user_id`

### facility_members
Členové nemovitosti

**Sloupce:**
- `facility_id` (UUID, FK → facilities, PK)
- `user_id` (UUID, FK → auth.users, PK)
- `role` (TEXT) - Role: 'owner', 'admin', 'member', 'viewer'
- `invited_by` (UUID, FK → auth.users, nullable)
- `created_at` (TIMESTAMPTZ)

**Indexy:**
- Primary key na `(facility_id, user_id)`

### facility_invites
Pozvánky do nemovitosti

**Sloupce:**
- `id` (UUID, PK)
- `facility_id` (UUID, FK → facilities)
- `code` (TEXT, UNIQUE) - Kód pozvánky
- `role` (TEXT) - Role: 'admin', 'member', 'viewer'
- `max_uses` (INT) - Maximální počet použití
- `uses` (INT) - Aktuální počet použití
- `expires_at` (TIMESTAMPTZ, nullable)
- `created_by` (UUID, FK → auth.users, nullable)
- `created_at` (TIMESTAMPTZ)

### issues
Závady v nemovitostech

**Sloupce:**
- `id` (UUID, PK)
- `title` (TEXT) - Název závady
- `description` (TEXT, nullable) - Popis
- `status` (TEXT) - Status: 'open', 'in_progress', 'resolved', 'closed'
- `priority` (TEXT) - Priorita: 'idea', 'normal', 'high', 'critical', 'urgent'
- `facility_id` (UUID, FK → facilities)
- `created_by` (UUID, FK → auth.users)
- `requires_cooperation` (BOOLEAN, nullable) - Vyžaduje součinnost
- `cooperation_user_id` (UUID, FK → auth.users, nullable) - Uživatel pro součinnost
- `assigned_provider_id` (UUID, FK → service_providers, nullable) - Přiřazený dodavatel
- `selected_appointment_id` (UUID, FK → service_appointments, nullable) - Vybraný termín
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_issues_facility_id` na `facility_id`
- `idx_issues_created_by` na `created_by`
- `idx_issues_status` na `status`

### issue_messages
Zprávy k závadám

**Sloupce:**
- `id` (UUID, PK)
- `issue_id` (UUID, FK → issues)
- `user_id` (UUID, FK → auth.users)
- `content` (TEXT, nullable) - Text zprávy
- `attachment_url` (TEXT, nullable) - URL přílohy
- `created_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_issue_messages_issue_id` na `issue_id`
- `idx_issue_messages_user_id` na `user_id`

### issue_attachments
Přílohy k závadám

**Sloupce:**
- `id` (UUID, PK)
- `issue_id` (UUID, FK → issues)
- `file_url` (TEXT) - URL souboru
- `file_name` (TEXT) - Název souboru
- `file_size` (INT) - Velikost v bytech
- `mime_type` (TEXT) - MIME typ
- `uploaded_by` (UUID, FK → auth.users)
- `created_at` (TIMESTAMPTZ)

## Služby a dodavatelé

### services
Katalog služeb

**Sloupce:**
- `id` (UUID, PK)
- `name` (TEXT) - Název služby
- `description` (TEXT, nullable) - Popis
- `default_price` (DECIMAL(10,2)) - Výchozí cena (20 CZK)
- `active` (BOOLEAN) - Aktivní služba
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### service_providers
Profil dodavatele

**Sloupce:**
- `user_id` (UUID, FK → auth.users, PK)
- `company_name` (TEXT) - Název firmy
- `ico` (TEXT, nullable) - IČO
- `dic` (TEXT, nullable) - DIČ
- `address` (TEXT, nullable) - Adresa
- `phone` (TEXT) - Telefon
- `billing_email` (TEXT) - Fakturační email
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### service_registrations
Registrace služeb dodavatelem

**Sloupce:**
- `id` (UUID, PK)
- `provider_id` (UUID, FK → service_providers)
- `service_id` (UUID, FK → services)
- `status` (TEXT) - Status: 'pending', 'active', 'expired'
- `paid_until` (TIMESTAMPTZ, nullable) - Platné do
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_service_registrations_provider_id` na `provider_id`
- `idx_service_registrations_service_id` na `service_id`
- `idx_service_registrations_status` na `status`
- UNIQUE na `(provider_id, service_id)`

### service_vouchers
Vouchery pro služby (3 měsíce zdarma)

**Sloupce:**
- `code` (TEXT, PK) - Kód voucheru
- `months` (INT) - Počet měsíců (default 3)
- `active` (BOOLEAN) - Aktivní voucher
- `expires_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

### service_voucher_uses
Použití voucherů

**Sloupce:**
- `id` (UUID, PK)
- `voucher_code` (TEXT, FK → service_vouchers)
- `provider_id` (UUID, FK → service_providers)
- `used_at` (TIMESTAMPTZ)

**Indexy:**
- UNIQUE na `(voucher_code, provider_id)`

### issue_service_requests
Poptávky na služby pro závady

**Sloupce:**
- `id` (UUID, PK)
- `issue_id` (UUID, FK → issues)
- `service_id` (UUID, FK → services)
- `status` (TEXT) - Status: 'open', 'closed'
- `created_by` (UUID, FK → auth.users)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- UNIQUE na `(issue_id, service_id)`

### service_applications
Přihlášky dodavatelů na poptávku

**Sloupce:**
- `id` (UUID, PK)
- `request_id` (UUID, FK → issue_service_requests)
- `provider_id` (UUID, FK → service_providers)
- `status` (TEXT) - Status: 'pending', 'selected', 'rejected'
- `message` (TEXT, nullable) - Zpráva od dodavatele
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- UNIQUE na `(request_id, provider_id)`

### service_appointments
Termíny pro opravy

**Sloupce:**
- `id` (UUID, PK)
- `issue_id` (UUID, FK → issues)
- `provider_id` (UUID, FK → service_providers)
- `proposed_date` (DATE) - Navržené datum
- `proposed_time` (TIME) - Navržený čas
- `proposed_by` (UUID, FK → auth.users) - Kdo navrhl
- `proposed_at` (TIMESTAMPTZ) - Kdy bylo navrženo
- `status` (TEXT) - Status: 'proposed', 'confirmed', 'rejected', 'completed'
- `confirmed_by` (UUID, FK → auth.users, nullable) - Kdo potvrdil
- `confirmed_at` (TIMESTAMPTZ, nullable) - Kdy bylo potvrzeno
- `notes` (TEXT, nullable) - Poznámky
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### service_payments
Platby za služby (bankovní převod)

**Sloupce:**
- `id` (UUID, PK)
- `registration_id` (UUID, FK → service_registrations)
- `amount` (DECIMAL(10,2)) - Částka
- `status` (TEXT) - Status: 'pending', 'confirmed', 'rejected'
- `payment_reference` (TEXT, nullable) - Variabilní symbol
- `payment_instructions` (TEXT, nullable) - Platební instrukce
- `confirmed_by` (UUID, FK → auth.users, nullable)
- `confirmed_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Systémové tabulky

### vouchers
Vouchery pro nemovitosti

**Sloupce:**
- `code` (TEXT, PK) - Kód voucheru
- `months` (INT) - Počet měsíců (default 12)
- `active` (BOOLEAN) - Aktivní voucher
- `expires_at` (TIMESTAMPTZ, nullable)

### user_push_tokens
Push tokeny pro notifikace

**Sloupce:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `token` (TEXT) - Push token
- `device_type` (TEXT) - Typ zařízení: 'ios', 'android', 'web'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_user_push_tokens_user_id` na `user_id`
- `idx_user_push_tokens_token` na `token`
- UNIQUE na `(user_id, token)`

### notifications
Notifikace

**Sloupce:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `type` (TEXT) - Typ notifikace
- `title` (TEXT) - Nadpis
- `body` (TEXT) - Text
- `data` (JSONB, nullable) - Data pro deep linking
- `read` (BOOLEAN) - Přečteno
- `created_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_notifications_user_id` na `user_id`
- `idx_notifications_read` na `read`

### user_profiles
Profil uživatele

**Sloupce:**
- `user_id` (UUID, FK → auth.users, PK)
- `name` (TEXT, nullable) - Jméno
- `avatar_url` (TEXT, nullable) - URL avataru
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Row Level Security (RLS)

Všechny tabulky mají aktivní RLS s politikami:

1. **facilities**: Uživatel vidí pouze své nemovitosti nebo nemovitosti, kde je člen
2. **issues**: Uživatel vidí závady v nemovitostech, kde má přístup, nebo závady, kde je cooperation_user_id
3. **service_providers**: Uživatel vidí pouze svůj profil
4. **service_registrations**: Uživatel vidí pouze své registrace
5. **service_applications**: Uživatel vidí přihlášky na své poptávky nebo své přihlášky

## Migrace

Migrace jsou v `supabase/migrations/` s názvem:
`YYYYMMDDHHMMSS_description.sql`

**Důležité migrace:**
- `20251110212000_init.sql` - Základní schéma
- `20251113000000_service_registration_system.sql` - Systém služeb
- `20251113000001_service_catalog_seed.sql` - Seed dat služeb

## Typy

TypeScript typy jsou generovány v `types/database.ts` z Supabase schématu.

