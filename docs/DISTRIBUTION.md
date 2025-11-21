# Distribuce a build aplikace

## Přehled

Aplikace je postavená na Expo frameworku a může být distribuována několika způsoby:
- **Development build** - pro vývoj a testování
- **Preview build** - pro testování na reálných zařízeních
- **Production build** - pro finální distribuci
- **Lokální APK build** - pro rychlé testování bez EAS

## Metody buildu

### 1. EAS Build (Doporučeno pro produkci)

EAS Build je cloudová služba Expo pro buildování aplikací. Podporuje iOS i Android.

#### Konfigurace

Konfigurace je v `eas.json`:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

#### Build příkazy

**Preview build (APK):**
```bash
eas build --platform android --profile preview
```

**Production build (AAB pro Google Play):**
```bash
eas build --platform android --profile production
```

**Lokální build (bez cloudu):**
```bash
eas build --platform android --local --profile preview
```

#### Výhody EAS Build
- ✅ Cloudový build (nevyžaduje lokální Android SDK)
- ✅ Automatické podepisování
- ✅ Optimalizované buildy
- ✅ Podpora iOS i Android
- ✅ Build history a logs

### 2. Lokální APK Build

Pro rychlé lokální testování bez potřeby EAS nebo cloudových služeb.

#### Metoda A: Expo Prebuild + Gradle (Doporučeno pro rychlé testování)

Tato metoda je nejrychlejší pro lokální testování a umožňuje plnou kontrolu nad build procesem.

**Krok 1: Prebuild Android projektu**
```bash
npx expo prebuild --platform android --clean
```

Tento příkaz vytvoří `android/` složku s nativním Android projektem.

**Krok 2: Build APK**

**Release APK (podepsaný debug certifikátem):**
```bash
cd android
./gradlew assembleRelease
cd ..
```

**Debug APK (rychlejší, pro testování):**
```bash
cd android
./gradlew assembleDebug
cd ..
```

**Krok 3: Najít APK**

APK soubory budou v:
- **Release:** `android/app/build/outputs/apk/release/app-release.apk`
- **Debug:** `android/app/build/outputs/apk/debug/app-debug.apk`

**Krok 4: Instalace na telefon**
```bash
# Release APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Použití npm skriptů (jednodušší):**
```bash
# Build release APK
npm run build:android:apk

# Build debug APK
npm run build:android:debug

# Instalace release APK
npm run install:android

# Instalace debug APK
npm run install:android:debug
```

#### Metoda B: Standalone APK (Nepotřebuje Expo server)

**Toto je to, co potřebujete pro APK, které funguje bez Expo serveru!**

**Možnost 1: EAS Build Local**
```bash
# Standalone APK pomocí EAS
eas build --platform android --local --profile preview

# Nebo pro produkční standalone build
eas build --platform android --local --profile production

# Najít APK (bude pojmenován build-XXXXXXXXXXXX.apk)
ls -lh build-*.apk

# Instalace
adb install -r build-XXXXXXXXXXXX.apk
```

**Možnost 2: Expo Export + Prebuild (Rychlejší pro iterace)**
```bash
# Export bundle + build standalone APK
npm run build:android:standalone

# Nebo ručně:
npx expo export --platform android
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease && cd ..

# Instalace
npm run install:android
```

**Instalace standalone APK:**

Pro EAS build APK:
```bash
# Najít nejnovější EAS build APK
ls -lh build-*.apk

# Instalace (automaticky najde nejnovější)
npm run install:eas

# Nebo ručně
adb install -r build-XXXXXXXXXXXX.apk
```

**Pokud instalace selže kvůli nekompatibilnímu podpisu:**
```bash
# Nejdřív odinstalujte starou verzi
adb uninstall cz.digitalmind.altrano

# Pak nainstalujte novou
adb install -r build-XXXXXXXXXXXX.apk
```

**Alternativní způsoby instalace:**
1. **Přes USB:** Přesuňte APK na telefon a otevřete ho (povolte instalaci z neznámých zdrojů)
2. **Přes cloud:** Nahrajte APK na Google Drive/Dropbox a stáhněte na telefon
3. **Přes ADB push:** `adb push build-XXXXXXXXXXXX.apk /sdcard/Download/` a pak otevřete na telefonu

**Výhody standalone APK:**
- ✅ Funguje offline (bez Expo serveru)
- ✅ JavaScript bundle je zabalený v APK
- ✅ Menší velikost než development build
- ✅ Optimalizovaný pro produkci

### 3. Expo Run (Pro development - potřebuje Metro server)

Pro rychlý development build s hot reload:

```bash
npx expo run:android
```

Tento příkaz automaticky:
1. Vytvoří Android projekt (pokud neexistuje)
2. Zbuildí a nainstaluje aplikaci na připojené zařízení
3. Spustí Metro bundler

**Výhody:**
- ✅ Hot reload - změny se projeví okamžitě
- ✅ Rychlý iterace
- ✅ Debugging nástroje

**Nevýhody:**
- ⚠️ Vyžaduje Metro server (nefunguje offline)
- ⚠️ Vyžaduje připojené zařízení nebo emulátor

## Environment Variables

Environment proměnné se vkládají do buildu při build čase, ne runtime.

### Konfigurace

1. Vytvořte `.env` soubor v root adresáři:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. `app.config.js` načítá proměnné pomocí `dotenv`:
```javascript
require('dotenv').config();

module.exports = {
  expo: {
    // ...
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
```

### Důležité poznámky

- Po změně `.env` musíte znovu zbuildit
- Proměnné s prefixem `EXPO_PUBLIC_` jsou dostupné v kódu
- Pro EAS Build můžete použít secrets v EAS dashboardu

## Podepisování aplikace

### Android

**Debug keystore:**
- Automaticky generován při prvním buildu
- Umístěn v `android/app/debug.keystore`
- Používá se pro debug buildy

**Release keystore:**
- Pro produkční buildy je potřeba vlastní keystore
- EAS Build může automaticky spravovat keystore
- Nebo můžete použít vlastní keystore

**Vytvoření release keystore:**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Konfigurace v `app.config.js`:**
```javascript
android: {
  package: "cz.digitalmind.altrano",
  // ...
}
```

## Doporučený workflow

### Pro vývoj
1. Použijte `npx expo run:android` pro rychlé iterace s hot reload
2. Pro testování na reálném zařízení použijte `npx expo prebuild` + `./gradlew assembleDebug`

### Pro testování
1. Použijte `eas build --platform android --profile preview` pro preview build
2. Nebo lokálně: `npx expo prebuild` + `./gradlew assembleRelease`

### Pro produkci
1. Použijte `eas build --platform android --profile production` pro AAB
2. Nahrajte AAB do Google Play Console
3. Nebo distribuujte APK přímo (pro interní distribuci)

## Troubleshooting

### APK se nespustí / padá při startu

1. **Zkontrolujte logy:**
```bash
adb logcat | grep -i "reactnative\|error\|exception\|fatal"
```

2. **Zkontrolujte environment proměnné:**
   - Ujistěte se, že `.env` obsahuje `EXPO_PUBLIC_SUPABASE_URL` a `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Po změně `.env` musíte znovu zbuildit

3. **Vyčistěte build:**
```bash
cd android
./gradlew clean
cd ..
rm -rf android
npx expo prebuild --platform android --clean
```

### Environment proměnné nejsou dostupné v APK

Ujistěte se, že:
- `.env` soubor existuje v root adresáři
- `app.config.js` načítá proměnné pomocí `dotenv`
- Proměnné jsou v `extra` sekci `app.config.js`

### Gradle build selže

1. **Zkontrolujte Java verzi:**
```bash
java -version  # Mělo by být Java 17 nebo 20
```

2. **Zkontrolujte ANDROID_HOME:**
```bash
echo $ANDROID_HOME  # Mělo by ukazovat na Android SDK
```

3. **Zastavte Gradle daemony:**
```bash
cd android
./gradlew --stop
cd ..
```

### EAS Build selže

1. Zkontrolujte logs v EAS dashboardu
2. Ověřte, že máte správně nastavené secrets
3. Zkontrolujte `eas.json` konfiguraci

## Rozdíly mezi buildy

### Debug APK
- ✅ Rychlejší build
- ✅ Debug informace
- ⚠️ Větší velikost
- ⚠️ Neoptimalizovaný

### Release APK
- ✅ Optimalizovaný
- ✅ Menší velikost
- ⚠️ Build trvá déle
- ⚠️ Bez debug informací

### Standalone APK
- ✅ Funguje offline
- ✅ JavaScript bundle zabalený v APK
- ✅ Optimalizovaný pro produkci
- ✅ Menší než development build

### AAB (Android App Bundle)
- ✅ Optimální pro Google Play
- ✅ Google Play generuje APK pro každé zařízení
- ✅ Menší velikost stahování
- ⚠️ Nelze instalovat přímo (jen přes Google Play)

## Poznámky

- **Debug APK** je rychlejší na build, ale větší a obsahuje debug informace
- **Release APK** je optimalizovaný, menší, ale build trvá déle
- Po změně kódu musíte znovu zbuildit (kromě `expo run:android` který má hot reload)
- Environment proměnné se vkládají do buildu při build čase, ne runtime
- Pro produkční distribuci vždy používejte release build nebo AAB

