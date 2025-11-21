# Notifikace

## Přehled

Aplikace používá **Supabase Edge Functions + Supabase Realtime + Local Notifications** pro notifikace **bez potřeby Firebase**.

**Hlavní přístup:** Supabase Realtime detekuje nové notifikace v databázi a zobrazí local notification (funguje bez FCM).

**Volitelný přístup:** Expo Push API pro push notifikace i když je aplikace zavřená (vyžaduje FCM pro Android).

## Architektura

### Aktuálně používaný přístup (bez Firebase)

```
Vytvoření závady (client)
    ↓
Client volá Edge Function
    ↓
send-notification Edge Function
    ↓
Vytvoří notifikaci v DB (notifications table)
    ↓
Supabase Realtime detekuje změnu
    ↓
Local Notification se zobrazí (funguje bez FCM!)
    ↓
In-app notifikace se aktualizují
```

### Volitelný přístup (s Firebase) - pro push notifikace

```
Vytvoření závady (client)
    ↓
Client volá Edge Function
    ↓
send-notification Edge Function
    ↓
Načte push tokeny z DB
    ↓
Expo Push API (vyžaduje FCM pro Android)
    ↓
Push notifikace na zařízení (i když je app zavřená)
```

## Databázové schéma

### notifications
Tabulka pro notifikace.

**Sloupce:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users) - Příjemce notifikace
- `type` (TEXT) - Typ notifikace
- `title` (TEXT) - Nadpis
- `body` (TEXT) - Text notifikace
- `data` (JSONB, nullable) - Data pro deep linking
- `read` (BOOLEAN) - Přečteno
- `created_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_notifications_user_id` na `user_id`
- `idx_notifications_read` na `read`

### user_push_tokens
Push tokeny pro zařízení.

**Sloupce:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `token` (TEXT) - Push token
- `device_type` (TEXT) - 'ios', 'android', 'web'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexy:**
- `idx_user_push_tokens_user_id` na `user_id`
- `idx_user_push_tokens_token` na `token`
- UNIQUE na `(user_id, token)`

## Edge Function

### send-notification

**Umístění:** `supabase/functions/send-notification/`

**Funkce:**
1. Přijme data o závadě (issueId, issueTitle, facilityId, facilityName, ownerId)
2. Vytvoří notifikaci v databázi (`notifications` tabulka)
3. (Volitelně) Načte push tokeny a odešle push notifikace přes Expo Push API

**Deploy:**
```bash
npx supabase functions deploy send-notification
```

**Environment Variables:**
- `SUPABASE_URL` - URL Supabase projektu (automaticky)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (automaticky)

## Klientská implementace

### Realtime listener

Aplikace naslouchá změnám v `notifications` tabulce pomocí Supabase Realtime:

```typescript
// lib/notifications.ts
setupNotificationListener(userId) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Zobrazí local notification
        scheduleLocalNotification(payload.new);
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}
```

### Hooks

#### useNotifications
**Soubor:** `hooks/useNotifications.ts`

**Funkce:**
- Načte seznam notifikací uživatele
- Označí notifikaci jako přečtenou
- Označí všechny jako přečtené

**Použití:**
```typescript
const { notifications, loading, markAsRead } = useNotifications();
```

#### useUnreadNotificationsCount
**Soubor:** `hooks/useNotifications.ts`

**Funkce:**
- Vrací počet nepřečtených notifikací
- Používá se pro badge v navigaci

**Použití:**
```typescript
const { count } = useUnreadNotificationsCount();
```

### Vytvoření notifikace

Při vytvoření závady se automaticky volá Edge Function:

```typescript
// hooks/useIssues.ts
const createIssue = async (issue) => {
  // Vytvoří závadu
  const { data } = await supabase
    .from('issues')
    .insert([issue])
    .select()
    .single();
    
  // Zavolá Edge Function pro notifikaci
  await supabase.functions.invoke('send-notification', {
    body: {
      issueId: data.id,
      issueTitle: issue.title,
      facilityId: issue.facility_id,
      facilityName: facility.name,
      ownerId: facility.user_id,
    },
  });
  
  return data;
};
```

## Typy notifikací

### service_request_created
**Kdy:** Při vytvoření poptávky na službu

**Data:**
```typescript
{
  issueId: string;
  requestId: string;
  serviceId: string;
  facilityId: string;
  facilityName: string;
  issueTitle: string;
  serviceName: string;
}
```

**Příjemci:** Všichni dodavatelé s aktivní službou daného typu

## Výhody aktuálního přístupu

- ✅ **Žádný Firebase** - vše přes Supabase
- ✅ **Funguje na Androidu i iOS** bez FCM
- ✅ **Real-time** - notifikace se zobrazí okamžitě
- ✅ **In-app notifikace** - fungují i když je app zavřená (uložené v DB)
- ⚠️ **Local notifikace** fungují jen když je aplikace otevřená (nebo na pozadí)

## Kdy fungují notifikace?

- ✅ **Když je aplikace otevřená** - Local notification se zobrazí okamžitě
- ✅ **Když je aplikace na pozadí** - Local notification se zobrazí
- ⚠️ **Když je aplikace zavřená** - Local notification se nezobrazí (ale notifikace je v DB a zobrazí se po otevření)

## Push notifikace (volitelné)

Pro push notifikace když je aplikace zavřená, stále potřebujete Firebase Cloud Messaging (FCM) pro Android.

### Nastavení FCM

1. Vytvoř Firebase projekt: https://console.firebase.google.com/
2. Přidej Android aplikaci s package name: `cz.digitalmind.altrano`
3. Stáhni `google-services.json`
4. Umísti do root adresáře projektu
5. Aktualizuj `app.config.js`:

```javascript
module.exports = {
  expo: {
    android: {
      googleServicesFile: "./google-services.json"
    }
  }
};
```

6. Znovu zbuildi aplikaci

**Dokumentace:** https://docs.expo.dev/push-notifications/push-notifications-setup/

### Registrace push tokenů

Aktuálně je registrace tokenů připravená, ale **není implementována**.

Pro implementaci:

```typescript
import { registerPushToken, savePushToken } from './lib/notifications';

// Po přihlášení
const token = await registerPushToken();
if (token && user) {
  await savePushToken(token, user.id, Platform.OS);
}
```

## Testování

### Lokální testování Edge Function

```bash
# Spusť Supabase lokálně
npx supabase start

# Spusť funkci lokálně
npx supabase functions serve send-notification

# Testuj curl požadavkem
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "issueId":"123",
    "issueTitle":"Test",
    "facilityId":"456",
    "facilityName":"Test Facility",
    "ownerId":"789"
  }'
```

### Testování v produkci

1. Vytvoř závadu v aplikaci
2. Zkontroluj logs v Supabase Dashboard → Edge Functions → send-notification → Logs
3. Ověř, že notifikace dorazila na zařízení

## Troubleshooting

### "FirebaseApp is not initialized" / "E_REGISTRATION_FAILED"

**Řešení:** Toto je očekávané chování pro Android standalone buildy bez FCM.

**Dobrá zpráva:** Aplikace nyní používá Supabase Realtime + Local Notifications, takže tato chyba nebrání fungování notifikací!

- ✅ Local notifikace fungují **bez FCM** (když je app otevřená/na pozadí)
- ⚠️ Push notifikace (když je app zavřená) vyžadují FCM

### Edge Function vrací chybu

- Zkontroluj logs v Supabase Dashboard
- Ověř, že máš správně nastavené environment variables
- Zkontroluj, že Edge Function je deploynutá

### Notifikace nedorazí

- Ověř, že push token je uložený v DB (`user_push_tokens`)
- Zkontroluj, že token je validní Expo push token
- Zkontroluj Expo Push API response v Edge Function logs
- **Pro Android:** Ověř, že je FCM nakonfigurováno

### "No push tokens found"

- Uživatel nemá registrovaný push token
- Pro Android: FCM může být nenakonfigurováno (token se neregistruje)
- Implementuj registraci tokenů v klientské aplikaci

## Best Practices

1. **Vždy vytvářej notifikace přes Edge Function** - zajišťuje konzistenci
2. **Používej Realtime listener** - pro okamžité zobrazení notifikací
3. **Ukládej notifikace do DB** - pro in-app zobrazení i když je app zavřená
4. **Označuj jako přečtené** - pro lepší UX
5. **Používej data field** - pro deep linking do aplikace

## Migrace

Notifikace používají tyto migrace:
- `20251110224500_notifications.sql` - Základní schéma notifikací
- `20251112000000_notifications_backfill_and_insert_policy.sql` - RLS policies

