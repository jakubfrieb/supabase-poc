# Supabase Edge Functions

Edge Functions pro aplikaci Facility Manager.

## Dostupné funkce

### send-notification

Odesílá push notifikace uživatelům přes Expo Push API.

**Endpoint:** `https://<your-project>.supabase.co/functions/v1/send-notification`

**Request body:**
```json
{
  "issueId": "uuid",
  "issueTitle": "Název závady",
  "facilityId": "uuid",
  "facilityName": "Název nemovitosti",
  "ownerId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2
}
```

## Deployment

### Lokální vývoj

```bash
# Spusť Supabase lokálně
npx supabase start

# Spusť funkci lokálně
npx supabase functions serve send-notification

# Testuj
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-notification' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"issueId":"123","issueTitle":"Test","facilityId":"456","facilityName":"Test Facility","ownerId":"789"}'
```

### Produkce

```bash
# Deploy funkce
npx supabase functions deploy send-notification

# Nebo deploy všech funkcí
npx supabase functions deploy
```

## Environment Variables

Edge Functions automaticky mají přístup k:
- `SUPABASE_URL` - URL projektu
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (plný přístup k databázi)
- `SUPABASE_ANON_KEY` - Anonymní key (omezený přístup)

## Logs

Zobrazit logs funkce:

```bash
npx supabase functions logs send-notification
```

Nebo v Supabase Dashboard → Edge Functions → send-notification → Logs

