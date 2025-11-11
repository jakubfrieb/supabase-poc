# Lokální build APK pro testování

## Metoda 1: Expo Prebuild + Gradle (Doporučeno pro rychlé testování)

Tato metoda je nejrychlejší pro lokální testování a umožňuje plnou kontrolu nad build procesem.

### Krok 1: Prebuild Android projektu

```bash
npx expo prebuild --platform android --clean
```

Tento příkaz vytvoří `android/` složku s nativním Android projektem.

### Krok 2: Build APK

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

### Krok 3: Najít APK

APK soubory budou v:
- **Release:** `android/app/build/outputs/apk/release/app-release.apk`
- **Debug:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Krok 4: Instalace na telefon

```bash
# Release APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Použití npm skriptů (jednodušší)

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

## Metoda 2: Standalone APK (Nepotřebuje Expo server) ⭐

**Toto je to, co potřebujete pro APK, které funguje bez Expo serveru!**

### Možnost A: EAS Build (Doporučeno)

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

### Možnost B: Expo Export + Prebuild (Rychlejší pro iterace)

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

### Instalace standalone APK

**Pro EAS build APK:**
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

## Metoda 3: EAS Build Local (Pro produkční buildy)

Pro produkční buildy s plnou konfigurací EAS:

```bash
# Build APK
eas build --platform android --local --profile preview

# Najít APK (bude pojmenován build-XXXXXXXXXXXX.apk)
ls -lh build-*.apk

# Instalace
adb install -r build-XXXXXXXXXXXX.apk
```

## Metoda 4: Expo Run (Pro development - potřebuje Metro server)

Pro rychlý development build s hot reload:

```bash
npx expo run:android
```

Tento příkaz automaticky:
1. Vytvoří Android projekt (pokud neexistuje)
2. Zbuildí a nainstaluje aplikaci na připojené zařízení
3. Spustí Metro bundler

## Řešení problémů

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

## Doporučený workflow pro testování

1. **První build:** Použijte `npx expo prebuild` + `./gradlew assembleDebug`
2. **Iterace:** Použijte `npx expo run:android` pro rychlé změny
3. **Finální test:** Použijte `./gradlew assembleRelease` pro release APK
4. **Produkce:** Použijte `eas build --local --profile preview` pro finální build

## Poznámky

- **Debug APK** je rychlejší na build, ale větší a obsahuje debug informace
- **Release APK** je optimalizovaný, menší, ale build trvá déle
- Po změně kódu musíte znovu zbuildit (kromě `expo run:android` který má hot reload)
- Environment proměnné se vkládají do buildu při build čase, ne runtime

