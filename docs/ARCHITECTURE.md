# Architektura aplikace

## Přehled

Aplikace **Správce Nemovitostí** je React Native aplikace postavená na Expo frameworku, která umožňuje správu nemovitostí, závad a komunikaci s dodavateli služeb.

## Technologie

### Frontend
- **React Native** s **Expo** frameworkem
- **TypeScript** pro type safety
- **React Navigation** (Native Stack Navigator) pro navigaci
- **React Context API** pro state management (AuthContext)
- **i18next** pro internacionalizaci (český jazyk)

### Backend & Databáze
- **Supabase** jako BaaS (Backend as a Service)
  - PostgreSQL databáze
  - Row Level Security (RLS) pro bezpečnost
  - Realtime subscriptions
  - Edge Functions (pro notifikace)
  - Storage (pro přílohy)

### Autentizace
- **Supabase Auth** s podporou:
  - Email/Password
  - Google OAuth
  - Session management

### Notifikace
- **Expo Notifications** pro push notifikace
- **Supabase Realtime** pro real-time aktualizace

## Struktura projektu

```
├── App.tsx                    # Entry point aplikace
├── components/                # Znovupoužitelné UI komponenty
├── contexts/                  # React Context providers
│   └── AuthContext.tsx       # Autentizace a session management
├── hooks/                     # Custom React hooks
├── lib/                       # Utility funkce a konfigurace
│   ├── supabase.ts           # Supabase client
│   ├── i18n.ts               # i18n konfigurace
│   └── notifications.ts      # Notifikační logika
├── navigation/                # Navigační konfigurace
│   ├── AppNavigator.tsx      # Hlavní navigátor
│   └── types.ts              # TypeScript typy pro navigaci
├── screens/                   # Obrazovky aplikace
├── supabase/                  # Supabase konfigurace
│   ├── migrations/           # Databázové migrace
│   └── functions/            # Edge Functions
├── theme/                     # Design systém
│   └── colors.ts             # Barvy, spacing, typography
├── types/                     # TypeScript typy
│   └── database.ts           # Typy generované z Supabase
└── locales/                   # Překlady
    └── cs.json               # České překlady
```

## Architektonické principy

### 1. Separation of Concerns
- **Komponenty**: Pouze UI logika
- **Hooks**: Business logika a data fetching
- **Contexts**: Globální state (autentizace)
- **Screens**: Orchestrace komponent a hooks

### 2. Data Flow
```
Supabase Database
    ↓
Custom Hooks (useFacilities, useIssues, ...)
    ↓
Screens (FacilitiesScreen, IssueDetailScreen, ...)
    ↓
UI Components (Card, Button, ...)
```

### 3. State Management
- **Local State**: `useState` pro komponentní state
- **Server State**: Custom hooks s Supabase dotazy
- **Global State**: `AuthContext` pro uživatelskou session
- **Realtime Updates**: Supabase Realtime subscriptions v hooks

### 4. Bezpečnost
- **Row Level Security (RLS)**: Všechny databázové dotazy jsou filtrovány na úrovni databáze
- **Auth Guards**: Navigace kontroluje autentizaci přes `AuthContext`
- **Type Safety**: TypeScript zajišťuje type safety napříč aplikací

## Hlavní entity

### 1. Facilities (Nemovitosti)
- Vlastník může vytvořit nemovitost
- Vlastník může pozvat členy (admin, member, viewer)
- Členové mají různé oprávnění podle role

### 2. Issues (Závady)
- Vázány na nemovitost
- Mají status (open, in_progress, resolved, closed)
- Mají prioritu (idea, normal, high, critical, urgent)
- Můžou vyžadovat součinnost (cooperation_user_id)

### 3. Service Providers (Dodavatelé)
- Uživatel se může registrovat jako dodavatel
- Dodavatel registruje služby (instalatérství, elektro, ...)
- Každá služba má vlastní registraci s platností

### 4. Service Requests (Poptávky)
- Správce vytvoří poptávku na službu pro závadu
- Dodavatelé s aktivní službou jsou notifikováni
- Dodavatelé se mohou přihlásit na poptávku

### 5. Service Applications (Přihlášky)
- Dodavatel se přihlásí na poptávku
- Správce vybere dodavatele
- Status: pending, selected, rejected

### 6. Appointments (Termíny)
- Navržené dodavatelem nebo správcem
- Status: proposed, confirmed, rejected, completed
- Vázány na závadu a dodavatele

## Workflow

### Workflow závady
1. Uživatel vytvoří závadu
2. Správce může vytvořit poptávku na službu
3. Dodavatelé se přihlásí
4. Správce vybere dodavatele
5. Dodavatel nebo správce navrhne termín
6. Termín je potvrzen
7. Závada je označena jako resolved/closed

### Workflow dodavatele
1. Uživatel se registruje jako dodavatel
2. Vyplní fakturační údaje
3. Zaregistruje služby (s voucher nebo platbou)
4. Vidí dostupné poptávky na své služby
5. Přihlásí se na poptávky
6. Po výběru navrhne termín
7. Dokončí opravu

## Migrace a verzování

- Migrace jsou v `supabase/migrations/`
- Názvy migrací obsahují timestamp: `YYYYMMDDHHMMSS_description.sql`
- Migrace jsou idempotentní (bezpečné k opakovanému spuštění)
- Používají `IF NOT EXISTS` a `DROP POLICY IF EXISTS`

## Edge Functions

- **send-notification**: Odesílá push notifikace při vytvoření závady
- Umístěno v `supabase/functions/send-notification/`

## Konfigurace

### Environment Variables
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Expo Config
- `app.config.js` obsahuje konfiguraci Expo
- Deep linking: `myapp://` scheme
- OAuth redirect: `myapp://auth/callback`

## Best Practices

1. **Vždy používej existující hooks** - nevytvářej duplicitní logiku
2. **Respektuj RLS** - všechny dotazy jsou automaticky filtrovány
3. **Používej typy z database.ts** - zajišťuje konzistenci
4. **Přidávej překlady** - všechny texty do `locales/cs.json`
5. **Testuj na různých rolích** - owner, admin, member, viewer, provider
6. **Používej Card komponentu** - konzistentní vzhled
7. **Respektuj spacing z theme** - konzistentní mezery

