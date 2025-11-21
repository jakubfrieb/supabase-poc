# Deep Linking Setup - Google OAuth s Supabase

Tento dokument popisuje správnou konfiguraci deep linkingu pro Google OAuth v Expo aplikaci s Supabase Auth podle oficiálních instrukcí.

## ✅ Co je již implementováno

1. **app.config.js** - Custom scheme `myapp` je nastaven
2. **Závislosti** - `expo-auth-session` a `@supabase/supabase-js` jsou nainstalovány
3. **Kód** - Implementace automaticky detekuje Expo Go vs standalone build

## 📋 Co musíš nakonfigurovat

### 1. Zjisti Expo username a app slug

Z `app.config.js`:
- **slug**: `altrano`
- **Expo username**: Potřebuješ zjistit z `expo whoami` nebo z Expo dashboardu

Spusť:
```bash
expo whoami
```

### 2. Konfigurace Supabase Dashboard

1. Jdi do **Supabase Dashboard** → **Authentication** → **URL Configuration**

2. **Site URL** (povinné pole):
   - Toto je defaultní redirect URL, která se použije jako fallback
   - **Musí být HTTPS URL** (nelze použít custom scheme jako `myapp://`)
   - **Doporučená hodnota:**
     ```
     https://auth.expo.io/@YOUR_EXPO_USERNAME/altrano
     ```
     (Nahraď `YOUR_EXPO_USERNAME` svým Expo username)
   - Pokud máš webovou verzi aplikace, můžeš použít tu URL místo toho

3. **Redirect URLs** (allow list):
   Přidej oba redirecty:

   **Pro Expo Go (dev):**
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/altrano
   ```
   (Nahraď `YOUR_EXPO_USERNAME` svým Expo username)

   **Pro standalone build (prod):**
   ```
   myapp://redirect
   ```

4. Ulož nastavení

**Poznámka:** Site URL a první redirect URL mohou být stejné (Expo proxy URL). To je v pořádku.

### 3. Konfigurace Google Cloud Console

1. Jdi do **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Najdi nebo vytvoř **OAuth 2.0 Client ID** (Web application)
3. V **Authorized redirect URIs** přidej stejné redirecty jako v Supabase:

   **Pro Expo Go (dev):**
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/altrano
   ```

   **Pro standalone build (prod):**
   ```
   myapp://redirect
   ```

4. Ulož nastavení

### 4. Ověření konfigurace

Aplikace automaticky:
- ✅ Detekuje, jestli běží v Expo Go (`storeClient`) nebo standalone build
- ✅ Použije správný redirect URI:
  - **Expo Go**: `https://auth.expo.io/@username/altrano` (proxy)
  - **Standalone**: `myapp://redirect` (custom scheme)
  - **Web**: automaticky detekuje

## 🔍 Jak to funguje

### Expo Go (Development)
- `Constants.executionEnvironment === 'storeClient'`
- Použije se Expo proxy: `https://auth.expo.io/@username/altrano`
- **Výhoda**: Funguje bez native konfigurace, rychlé testování

### Standalone Build (Production)
- `Constants.executionEnvironment === 'standalone'`
- Použije se custom scheme: `myapp://redirect`
- **Výhoda**: Plně native deep linking

## 🧪 Testování

1. **V Expo Go:**
   ```bash
   npm start
   # Otevři v Expo Go aplikaci
   ```

2. **V standalone build:**
   ```bash
   npx expo run:android
   # nebo
   npx expo run:ios
   ```

3. **Na webu:**
   ```bash
   npm run web
   ```

## 📝 Poznámky

- **Expo username** je potřeba pro Expo Go redirect URI
- Oba redirecty (dev i prod) musí být v Supabase i Google Cloud Console
- Po změně konfigurace může trvat několik minut, než se změny projeví

## 🐛 Troubleshooting

**Problém**: OAuth vrací `dismiss` a čeká
- **Řešení**: Zkontroluj, že redirect URI v Supabase a Google Console přesně odpovídají
- V Expo Go použij proxy URI, v standalone custom scheme

**Problém**: Deep link se nezpracuje
- **Řešení**: Zkontroluj logy - mělo by se zobrazit `OAuth redirectTo: ...`
- Ověř, že `app.config.js` má správný `scheme`

