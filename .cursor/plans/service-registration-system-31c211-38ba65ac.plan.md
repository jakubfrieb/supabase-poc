<!-- 38ba65ac-11c5-4eb4-a406-af79c19aa997 dff9f8c2-9934-4cba-a9cd-d57d7e4868a3 -->
# Implementace systému registrace služeb

## Přehled

Systém umožní dodavatelům/řemeslníkům registrovat služby, správcům poptávat dodavatele na závady, vybírat dodavatele, plánovat termíny a spravovat celý workflow opravy.

## Databázové schéma

### Nové tabulky (migrace)

1. **services** - Katalog služeb

- id, name, description, default_price (20 CZK), active, created_at
- Předpřipravený katalog (instalatérství, elektro, atd.)

2. **service_providers** - Profil dodavatele

- user_id (PK), company_name, ico, dic, address, phone, billing_email, created_at, updated_at
- Fakturační údaje pro dodavatele

3. **service_registrations** - Registrace služeb dodavatelem

- id, provider_id (FK service_providers), service_id (FK services), status ('pending', 'active', 'expired'), paid_until, created_at, updated_at
- Každá služba má vlastní registraci s platností

4. **service_vouchers** - Vouchery pro služby (3 měsíce)

- code (PK), months (default 3), active, expires_at
- Podobně jako facility vouchers

5. **issue_service_requests** - Poptávky na služby pro závady

- id, issue_id (FK issues), service_id (FK services), status ('open', 'closed'), created_by, created_at
- Poptávka vytvořená správcem

6. **service_applications** - Přihlášky dodavatelů na poptávku

- id, request_id (FK issue_service_requests), provider_id (FK service_providers), status ('pending', 'selected', 'rejected'), created_at
- Dodavatel se přihlásí na poptávku

7. **service_appointments** - Termíny

- id, issue_id (FK issues), provider_id (FK service_providers), proposed_by (user_id), proposed_at (TIMESTAMPTZ), status ('proposed', 'confirmed', 'rejected'), confirmed_by, confirmed_at, created_at
- Termíny navržené dodavatelem nebo správcem/zadavatelem

8. **service_payments** - Platby za služby (bankovní převod)

- id, registration_id (FK service_registrations), amount, status ('pending', 'confirmed', 'rejected'), payment_reference, confirmed_by, confirmed_at, created_at
- Manuální potvrzení platby správcem

### Rozšíření existujících tabulek

**issues** - Přidat sloupce:

- requires_cooperation BOOLEAN DEFAULT FALSE
- assigned_provider_id UUID REFERENCES service_providers(user_id)
- selected_appointment_id UUID REFERENCES service_appointments(id)

## Frontend komponenty

### Nové obrazovky

1. **ServiceRegistrationScreen** (`screens/ServiceRegistrationScreen.tsx`)

- Formulář fakturačních údajů (company_name, ICO, DIC, adresa, telefon, billing_email)
- Výběr služeb z katalogu (checkboxy)
- Zobrazení celkové ceny (počet služeb × 20 CZK)
- Možnost uplatnit voucher nebo zaplatit
- Po registraci zobrazení stavu služeb

2. **ServiceCatalogScreen** (`screens/ServiceCatalogScreen.tsx`)

- Seznam všech aktivních služeb
- Zobrazení ceny u každé služby
- Možnost filtrování/vyhledávání

3. **ServiceRequestScreen** (`screens/ServiceRequestScreen.tsx`)

- Vytvoření poptávky na službu pro závadu
- Výběr typu služby z katalogu
- Zobrazení přihlášených dodavatelů
- Možnost vybrat dodavatele

4. **ServiceApplicationsScreen** (`screens/ServiceApplicationsScreen.tsx`)

- Seznam přihlášek dodavatelů na poptávku
- Zobrazení profilu dodavatele
- Možnost vybrat/zamítnout dodavatele

5. **AppointmentSelectionScreen** (`screens/AppointmentSelectionScreen.tsx`)

- Zobrazení navržených termínů (od dodavatele i správce/zadavatele)
- Možnost navrhnout nový termín
- Potvrzení termínu (správce/vlastník nebo zadavatel pokud requires_cooperation)

### Rozšíření existujících obrazovek

1. **CreateIssueScreen** - Přidat checkbox "Nutná součinnost"
2. **IssueDetailScreen** - Přidat sekce:

- Tlačítko "Poptat dodavatele" (pokud není přiřazen)
- Zobrazení přiřazeného dodavatele
- Sekce termínů (výběr/potvrzení)
- Workflow: poptávka → výběr dodavatele → termín → dokončení

### Nové komponenty

1. **ServiceProviderCard** - K

### To-dos

- [ ] Vytvořit databázové schéma - migrace pro všechny nové tabulky (services, service_providers, service_registrations, service_vouchers, issue_service_requests, service_applications, service_appointments, service_payments) a rozšíření issues tabulky
- [ ] Vytvořit migraci s předpřipraveným katalogem služeb (základní služby jako instalatérství, elektro, atd.)
- [ ] Implementovat RLS policies pro všechny nové tabulky podle existujících patternů
- [ ] Aktualizovat types/database.ts s novými typy pro všechny nové tabulky
- [ ] Vytvořit hooks: useServices, useServiceProviders, useServiceRegistrations, useServiceRequests, useServiceApplications, useAppointments
- [ ] Vytvořit ServiceRegistrationScreen - formulář fakturačních údajů, výběr služeb, platba/voucher
- [ ] Vytvořit ServiceCatalogScreen - zobrazení katalogu služeb
- [ ] Vytvořit komponenty: ServiceProviderCard, AppointmentCard, ServiceSelector
- [ ] Rozšířit CreateIssueScreen - přidat checkbox 'Nutná součinnost'
- [ ] Rozšířit IssueDetailScreen - přidat sekce pro poptávku, výběr dodavatele, termíny, workflow
- [ ] Vytvořit ServiceRequestScreen - vytvoření poptávky na službu
- [ ] Vytvořit ServiceApplicationsScreen - zobrazení přihlášek dodavatelů
- [ ] Vytvořit AppointmentSelectionScreen - správa termínů s možností navrhnout/potvrdit
- [ ] Aktualizovat navigaci - přidat nové obrazovky do types.ts a AppNavigator.tsx
- [ ] Přidat české překlady do locales/cs.json pro všechny nové obrazovky a komponenty
- [ ] Rozšířit notifikační systém - přidat notifikace pro poptávky, přihlášky, termíny