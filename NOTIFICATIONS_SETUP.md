# Notifications Setup Guide

Tato aplikace používá **Supabase Edge Functions + Supabase Realtime + Local Notifications** pro notifikace **bez potřeby Firebase**!

**Hlavní přístup:** Supabase Realtime detekuje nové notifikace v databázi a zobrazí local notification (funguje bez FCM).

**Volitelný přístup:** Expo Push API pro push notifikace i když je aplikace zavřená (vyžaduje FCM pro Android).

## Architektura

### Nový přístup (bez Firebase) - Aktuálně používaný:

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

### Starý přístup (s Firebase) - Volitelný pro push notifikace:

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

## Kroky nasazení

### 1. Spuštění migrací v Supabase

```bash
# Přihlas se do Supabase CLI
npx supabase login

# Připoj projekt
npx supabase link --project-ref <your-project-ref>

# Spusť migrace
npx supabase db push
```

Nebo ručně v Supabase Dashboard → SQL Editor:
1. Spusť `supabase/migrations/20251110-192125_push_tokens.sql`
2. Spusť `supabase/migrations/20251110-200000_notification_trigger.sql` (volitelné - trigger)

### 2. Deploy Edge Function

```bash
# Deploy funkce do Supabase
npx supabase functions deploy send-notification
```

Nebo v Supabase Dashboard:
1. Jdi do **Edge Functions**
2. Vytvoř novou funkci `send-notification`
3. Zkopíruj obsah `supabase/functions/send-notification/index.ts`

### 3. Nastavení environment variables (už nastavené automaticky)

Edge Function automaticky používá:
- `SUPABASE_URL` - URL tvého Supabase projektu
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (má plný přístup)

### 4. Registrace push tokenů (klientská aplikace)

**Důležité**: Aktuálně je registrace tokenů připravená, ale **není implementována**.

Pro implementaci registrace:
1. Přidej `expo-notifications` nebo jinou knihovnu
2. Zavolej registraci při přihlášení:

```typescript
import { registerPushToken, savePushToken } from './lib/notifications';

// Po přihlášení
const token = await registerPushToken();
if (token && user) {
  await savePushToken(token, user.id, Platform.OS);
}
```

## Jak to funguje

### Klient vytvoří závadu:
```typescript
const issue = await createIssue({
  title: 'Nová závada',
  facility_id: facilityId
});
// Automaticky se zavolá Edge Function
```

### Edge Function odešle notifikaci:
1. Přijme data o závadě
2. Načte push tokeny vlastníka zařízení z `user_push_tokens`
3. Odešle notifikace přes Expo Push API
4. Notifikace dorazí na všechna zařízení vlastníka

## Testování

### 1. Testování Edge Function lokálně

```bash
# Spusť Supabase lokálně
npx supabase start

# Spusť funkci lokálně
npx supabase functions serve send-notification

# Testuj curl požadavkem
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"issueId":"123","issueTitle":"Test","facilityId":"456","facilityName":"Test Facility","ownerId":"789"}'
```

### 2. Testování v produkci

1. Vytvoř závadu v aplikaci
2. Zkontroluj logs v Supabase Dashboard → Edge Functions → send-notification → Logs
3. Ověř, že notifikace dorazila na zařízení

## Poznámky

### Database Trigger (volitelné)
- Trigger v `20251110-200000_notification_trigger.sql` vyžaduje `pg_net` extension
- Pokud `pg_net` není dostupný, použij **pouze client-side volání** (aktuální implementace)
- Client-side přístup je jednodušší a doporučený

### Push tokeny
- Aktuálně **nejsou** automaticky registrované
- Pro plnou funkčnost je potřeba implementovat registraci tokenů
- Tabulka `user_push_tokens` je připravená

### Expo Push API
- Zdarma pro unlimited notifikace
- Vyžaduje Expo push token (získáš přes `expo-notifications`)
- Dokumentace: https://docs.expo.dev/push-notifications/

## Řešení bez Firebase! 🎉

**Dobrá zpráva:** Aplikace nyní používá **Supabase Realtime + Local Notifications**, což **NEPOTŘEBUJE Firebase**!

### Jak to funguje:

1. **Supabase Edge Function** vytvoří notifikaci v databázi (`notifications` tabulka)
2. **Supabase Realtime** detekuje novou notifikaci (když je aplikace otevřená)
3. **Local Notification** se zobrazí pomocí `expo-notifications` (funguje bez FCM!)
4. **In-app notifikace** se aktualizují přes Realtime subscription

### Výhody tohoto přístupu:

- ✅ **Žádný Firebase** - vše přes Supabase
- ✅ **Funguje na Androidu i iOS** bez FCM
- ✅ **Real-time** - notifikace se zobrazí okamžitě
- ✅ **In-app notifikace** - fungují i když je app zavřená (uložené v DB)
- ⚠️ **Local notifikace** fungují jen když je aplikace otevřená (nebo na pozadí)

### Kdy fungují notifikace?

- ✅ **Když je aplikace otevřená** - Local notification se zobrazí okamžitě
- ✅ **Když je aplikace na pozadí** - Local notification se zobrazí
- ⚠️ **Když je aplikace zavřená** - Local notification se nezobrazí (ale notifikace je v DB a zobrazí se po otevření)

### Pokud chcete push notifikace i když je app zavřená (volitelné):

Pro push notifikace když je aplikace zavřená, stále potřebujete Firebase Cloud Messaging (FCM) pro Android.

### Jak nakonfigurovat FCM (volitelné, jen pokud chcete push notifikace když je app zavřená)

1. Vytvoř Firebase projekt: https://console.firebase.google.com/
2. Přidej Android aplikaci s package name: `cz.digitalmind.altrano`
3. Stáhni `google-services.json`
4. Umísti do root adresáře projektu
5. Aktualizuj `app.config.js`:

```javascript
module.exports = {
  expo: {
    // ... existing config
    android: {
      // ... existing config
      googleServicesFile: "./google-services.json"
    }
  }
};
```

6. Znovu zbuildi aplikaci

**Dokumentace:** https://docs.expo.dev/push-notifications/push-notifications-setup/

### Alternativa: Použij pouze in-app notifikace

Pokud nechcete konfigurovat FCM, můžete použít pouze Supabase in-app notifikace (které už fungují). Push notifikace budou volitelné.

## Troubleshooting

### "FirebaseApp is not initialized" / "E_REGISTRATION_FAILED"

**Řešení:** Toto je očekávané chování pro Android standalone buildy bez FCM. 

**Dobrá zpráva:** Aplikace nyní používá Supabase Realtime + Local Notifications, takže tato chyba nebrání fungování notifikací!

- ✅ Local notifikace fungují **bez FCM** (když je app otevřená/na pozadí)
- ⚠️ Push notifikace (když je app zavřená) vyžadují FCM

Pokud chcete push notifikace i když je app zavřená:
1. Nakonfiguruj FCM podle výše uvedených kroků
2. Znovu zbuildi aplikaci

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

