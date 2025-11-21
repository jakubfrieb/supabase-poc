# Obrazovky aplikace

## Autentizační obrazovky

### LoginScreen
**Route:** `Login`  
**Parametry:** `undefined`  
**Popis:** Přihlašovací obrazovka s možností přihlášení emailem/heslem nebo Google OAuth.

**Funkce:**
- Email/password přihlášení
- Google OAuth přihlášení
- Navigace na registraci
- Navigace na reset hesla

### RegisterScreen
**Route:** `Register`  
**Parametry:** `undefined`  
**Popis:** Registrační obrazovka pro vytvoření nového účtu.

**Funkce:**
- Registrace emailem/heslem
- Navigace zpět na přihlášení

### ForgotPasswordScreen
**Route:** `ForgotPassword`  
**Parametry:** `undefined`  
**Presentation:** `modal`  
**Popis:** Obrazovka pro reset hesla.

**Funkce:**
- Odeslání emailu pro reset hesla

## Hlavní obrazovky

### FacilitiesScreen
**Route:** `Facilities`  
**Parametry:** `undefined`  
**Header:** `false`  
**Popis:** Hlavní obrazovka s přehledem nemovitostí. Zobrazuje seznam nemovitostí, otevřené poptávky a pro dodavatele jejich služby a poptávky.

**Funkce:**
- Zobrazení seznamu nemovitostí
- Počet otevřených závad u každé nemovitosti
- Pro správce/vlastníky: seznam otevřených poptávek
- Pro dodavatele:
  - Aktivní služby
  - Přihlášené poptávky
  - Dostupné poptávky (na jejich služby)
  - Vysoutěžené závady
- Navigace na detail nemovitosti
- Navigace na vytvoření nemovitosti (MetroFAB)
- Navigace na propojení nemovitosti (MetroFAB)
- Navigace na registraci služeb (MetroFAB)

**Hooks:**
- `useFacilities()` - seznam nemovitostí
- `useOpenServiceRequests()` - otevřené poptávky pro správce
- `useProviderServiceRequests()` - poptávky pro dodavatele
- `useServiceProvider()` - informace o dodavateli
- `useServiceRegistrations()` - registrované služby
- `useProviderIssues()` - vysoutěžené závady

### FacilityDetailScreen
**Route:** `FacilityDetail`  
**Parametry:** `{ facilityId: string }`  
**Popis:** Detail nemovitosti se seznamem závad a možnostmi správy.

**Funkce:**
- Zobrazení detailů nemovitosti
- Seznam závad v nemovitosti
- Vytvoření nové závady
- Správa členů (pro vlastníky/admins)
- Poznámky k nemovitosti
- Voucher pro prodloužení předplatného
- Pozvání nových členů

**Hooks:**
- `useIssues(facilityId)` - závady v nemovitosti
- `useFacilityRole(facilityId)` - role uživatele
- `useFacilities()` - aktualizace nemovitosti

### CreateFacilityScreen
**Route:** `CreateFacility`  
**Parametry:** `undefined`  
**Presentation:** `modal`  
**Popis:** Vytvoření nové nemovitosti.

**Funkce:**
- Vytvoření nemovitosti (název, popis, adresa)
- Navigace zpět po vytvoření

### JoinFacilityScreen
**Route:** `JoinFacility`  
**Parametry:** `undefined`  
**Presentation:** `modal`  
**Popis:** Připojení k existující nemovitosti pomocí pozvánky.

**Funkce:**
- Zadání kódu pozvánky
- Připojení k nemovitosti

## Závady

### CreateIssueScreen
**Route:** `CreateIssue`  
**Parametry:** `{ facilityId: string }`  
**Presentation:** `modal`  
**Popis:** Vytvoření nové závady.

**Funkce:**
- Vytvoření závady (název, popis, priorita)
- Možnost vyžadovat součinnost
- Nahrání příloh (fotografie)
- Navigace zpět po vytvoření

**Hooks:**
- `useIssues()` - vytvoření závady

### IssueDetailScreen
**Route:** `IssueDetail`  
**Parametry:** `{ issueId: string; facilityId: string }`  
**Popis:** Detail závady s kompletním workflow.

**Funkce:**
- Zobrazení detailů závady
- Změna statusu a priority
- Zprávy k závadě
- Přílohy
- Workflow stepper (poptávka → výběr → termín → oprava → hotovo)
- Vytvoření poptávky na službu
- Zobrazení přihlášek dodavatelů
- Výběr dodavatele
- Správa termínů
- Pro dodavatele: přihlášení na poptávku, navržení termínu

**Hooks:**
- `useIssues()` - detail závady
- `useIssueMessages(issueId)` - zprávy
- `useIssueAttachments(issueId)` - přílohy
- `useServiceRequests(issueId)` - poptávky
- `useServiceApplications(requestId)` - přihlášky
- `useAppointments(issueId)` - termíny
- `useFacilityRole(facilityId)` - role uživatele
- `useServiceProvider()` - informace o dodavateli

## Profil a nastavení

### ProfileScreen
**Route:** `Profile`  
**Parametry:** `undefined`  
**Popis:** Profil uživatele s přehledem nemovitostí a předplatného.

**Funkce:**
- Zobrazení profilu uživatele
- Seznam nemovitostí s rolemi
- Správa nemovitostí (editace, smazání, opuštění)
- Správa členů nemovitosti
- Informace o předplatném
- Odhlášení

**Hooks:**
- `useFacilities()` - seznam nemovitostí
- `useFacilityRole(facilityId)` - role v každé nemovitosti

### NotificationsScreen
**Route:** `Notifications`  
**Parametry:** `undefined`  
**Popis:** Seznam notifikací.

**Funkce:**
- Zobrazení všech notifikací
- Označení jako přečtené
- Navigace na související obsah

**Hooks:**
- `useNotifications()` - seznam notifikací

## Služby a dodavatelé

### ServiceRegistrationScreen
**Route:** `ServiceRegistration`  
**Parametry:** `undefined`  
**Presentation:** `modal`  
**Popis:** Registrace jako dodavatel služeb.

**Funkce:**
- Vyplnění fakturačních údajů (firma, IČO, DIČ, adresa, telefon, email)
- Registrace jako dodavatel
- Navigace na katalog služeb

**Hooks:**
- `useServiceProvider()` - informace o dodavateli
- `useServiceProvider().createProvider()` - vytvoření profilu

### ServiceCatalogScreen
**Route:** `ServiceCatalog`  
**Parametry:** `undefined`  
**Popis:** Katalog dostupných služeb.

**Funkce:**
- Zobrazení všech služeb
- Registrace služeb
- Aktivace pomocí voucheru nebo platby

**Hooks:**
- `useServices()` - seznam služeb
- `useServiceRegistrations()` - registrované služby

### MyServicesScreen
**Route:** `MyServices`  
**Parametry:** `undefined`  
**Popis:** Přehled registrovaných služeb dodavatele.

**Funkce:**
- Seznam registrovaných služeb
- Status každé služby (pending, active, expired)
- Platnost služeb
- Vysoutěžené závady
- Přihlášené poptávky
- Dostupné poptávky

**Hooks:**
- `useServiceRegistrations()` - registrované služby
- `useProviderIssues()` - vysoutěžené závady
- `useProviderServiceRequests()` - poptávky

### ServiceRequestScreen
**Route:** `ServiceRequest`  
**Parametry:** `{ issueId: string }`  
**Presentation:** `modal`  
**Popis:** Vytvoření poptávky na službu pro závadu.

**Funkce:**
- Výběr typu služby
- Vytvoření poptávky
- Notifikace dodavatelů s aktivní službou

**Hooks:**
- `useServices()` - seznam služeb
- `useServiceRequests(issueId)` - vytvoření poptávky

### ServiceApplicationsScreen
**Route:** `ServiceApplications`  
**Parametry:** `{ requestId: string; issueId: string }`  
**Popis:** Přihlášky dodavatelů na poptávku.

**Funkce:**
- Seznam přihlášek dodavatelů
- Výběr dodavatele
- Zamítnutí přihlášky
- Kontaktování dodavatele

**Hooks:**
- `useServiceApplications(requestId)` - přihlášky
- `useServiceProvider()` - informace o dodavatelích

### AppointmentSelectionScreen
**Route:** `AppointmentSelection`  
**Parametry:** `{ issueId: string; providerId?: string }`  
**Presentation:** `modal`  
**Popis:** Správa termínů pro závadu.

**Funkce:**
- Seznam navržených termínů
- Navržení nového termínu (datum, čas, poznámka)
- Potvrzení termínu
- Zamítnutí termínu
- Označení jako dokončeno

**Hooks:**
- `useAppointments(issueId)` - termíny
- `useFacilityRole(facilityId)` - oprávnění

## Navigační flow

### Pro správce/vlastníka
1. `FacilitiesScreen` → seznam nemovitostí
2. `FacilityDetailScreen` → detail nemovitosti
3. `CreateIssueScreen` → vytvoření závady
4. `IssueDetailScreen` → detail závady
5. `ServiceRequestScreen` → vytvoření poptávky
6. `ServiceApplicationsScreen` → výběr dodavatele
7. `AppointmentSelectionScreen` → potvrzení termínu

### Pro dodavatele
1. `ServiceRegistrationScreen` → registrace jako dodavatel
2. `ServiceCatalogScreen` → výběr služeb
3. `MyServicesScreen` → přehled služeb a poptávek
4. `IssueDetailScreen` → přihlášení na poptávku
5. `AppointmentSelectionScreen` → navržení termínu

## Konvence

1. **Modal screens** mají `presentation: 'modal'` - zobrazují se jako modaly
2. **Detail screens** mají vždy `facilityId` nebo `issueId` v parametrech
3. **Všechny screens** používají `useFocusEffect` pro refresh při návratu
4. **Loading states** jsou zobrazeny pomocí `loading` z hooks
5. **Error handling** pomocí `Alert.alert()` nebo error states v UI

