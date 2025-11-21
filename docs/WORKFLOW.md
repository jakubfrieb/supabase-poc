# AI Agent Workflow

## Účel

Tento dokument definuje standardizovaný workflow pro AI agenty pracující s aplikací. Zajišťuje konzistentní přístup, kvalitu a dodržování architektonických principů bez ohledu na zdroj požadavku (Cursor, CLI, pipeline, atd.).

## Před zahájením práce

### 1. Přečti si dokumentaci

**Povinné dokumenty (v tomto pořadí):**
1. **[SOLUTION.md](./SOLUTION.md)** - ⭐ **ZAČNI ZDE** - Co aplikace dělá, kdo ji používá, hlavní funkcionality
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Architektura a principy
3. [UI_COMPONENTS.md](./UI_COMPONENTS.md) - Design systém a komponenty
4. [NAVIGATION.md](./NAVIGATION.md) - Navigační struktura

**Podle potřeby:**
- [SCREENS.md](./SCREENS.md) - Pokud pracuješ s obrazovkami
- [HOOKS.md](./HOOKS.md) - Pokud pracuješ s daty
- [DATABASE.md](./DATABASE.md) - Pokud pracuješ se schématem
- [NOTIFICATIONS.md](./NOTIFICATIONS.md) - Pokud pracuješ s notifikacemi
- [DISTRIBUTION.md](./DISTRIBUTION.md) - Pokud pracuješ s buildem

### 2. Analyzuj existující kód

Před vytvořením nového kódu:
1. **Vyhledej podobnou funkcionalitu** - možná už existuje
2. **Zkontroluj existující hooky** - použij je místo vytváření nových
3. **Zkontroluj existující komponenty** - použij je místo vytváření nových
4. **Zkontroluj konvence** - pojmenování, struktura, styly

### 3. Rozuměj požadavku

Před implementací:
- ✅ Rozumím požadavku v kontextu aplikace? (viz [SOLUTION.md](./SOLUTION.md))
- ✅ Které role jsou ovlivněny? (owner, admin, member, viewer, provider)
- ✅ Je požadavek jasný a jednoznačný?
- ✅ Existuje podobná funkcionalita?
- ✅ Jaký je nejlepší způsob implementace v rámci architektury?

## Workflow kroků

### Krok 1: Analýza a plánování

**Úkoly:**
1. **Přečti si požadavek** a ujisti se, že rozumíš cíli
2. **Identifikuj ovlivněné části:**
   - Které obrazovky?
   - Které komponenty?
   - Které hooky?
   - Které databázové tabulky?
   - Které navigační routy?
3. **Zkontroluj existující řešení:**
   - Existuje podobná funkcionalita?
   - Můžu použít existující hook/komponentu?
   - Musím vytvářet nové?
4. **Vytvoř plán:**
   - Jaké soubory budu upravovat/vytvářet?
   - Jaké změny v databázi jsou potřeba?
   - Jaké překlady jsou potřeba?
   - Jaké testy jsou potřeba?

**Výstup:** Mentální model nebo poznámky o plánu

### Krok 2: Implementace

**Zásady implementace:**

#### 2.1 Používej existující komponenty

```typescript
// ✅ DOBRÉ - používá existující komponentu
import { Card } from '../components/Card';
import { Button } from '../components/Button';

// ❌ ŠPATNÉ - vytváří novou komponentu pro stejný účel
const MyCard = () => <View style={styles.card}>...</View>;
```

#### 2.2 Používej existující hooky

```typescript
// ✅ DOBRÉ - používá existující hook
import { useFacilities } from '../hooks/useFacilities';
const { facilities, createFacility } = useFacilities();

// ❌ ŠPATNÉ - vytváří duplicitní logiku
const [facilities, setFacilities] = useState([]);
useEffect(() => {
  // duplicitní fetch logika
}, []);
```

#### 2.3 Respektuj design systém

```typescript
// ✅ DOBRÉ - používá konstanty z theme
import { colors, spacing, fontSize } from '../theme/colors';
<View style={{ padding: spacing.lg, backgroundColor: colors.surface }}>

// ❌ ŠPATNÉ - hardcodované hodnoty
<View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
```

#### 2.4 Používej TypeScript typy

```typescript
// ✅ DOBRÉ - používá typy z database.ts
import { Facility } from '../types/database';
const facility: Facility = ...;

// ❌ ŠPATNÉ - any nebo vlastní typy
const facility: any = ...;
```

#### 2.5 Přidávej překlady

```typescript
// ✅ DOBRÉ - používá i18n
const { t } = useTranslation();
<Text>{t('facilities.yourFacilities')}</Text>

// ❌ ŠPATNÉ - hardcodované texty
<Text>Vaše nemovitosti</Text>
```

**Vždy přidej překlady do `locales/cs.json`!**

#### 2.6 Respektuj navigační strukturu

```typescript
// ✅ DOBRÉ - používá typy z navigation/types.ts
import { RootStackParamList } from '../navigation/types';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
navigation.navigate('FacilityDetail', { facilityId });

// ❌ ŠPATNÉ - string literals bez typů
navigation.navigate('FacilityDetail' as any, { facilityId });
```

#### 2.7 Používej konzistentní styly

```typescript
// ✅ DOBRÉ - StyleSheet.create s konstantami
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
});

// ❌ ŠPATNÉ - inline styly nebo hardcodované hodnoty
<View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
```

### Krok 3: Kontrola kvality

**Kontrolní seznam před dokončením:**

#### 3.1 Kód
- [ ] Používá existující komponenty/hooky (ne duplicitní logika)
- [ ] Respektuje design systém (barvy, spacing, typography)
- [ ] Používá TypeScript typy (ne `any`)
- [ ] Dodržuje konvence pojmenování
- [ ] Kód je čitelný a komentovaný (kde je potřeba)

#### 3.2 Funkcionalita
- [ ] Implementace odpovídá požadavku
- [ ] Zpracovává error stavy
- [ ] Zobrazuje loading stavy
- [ ] Respektuje RLS (Row Level Security)
- [ ] Funguje pro všechny relevantní role (owner, admin, member, viewer, provider)

#### 3.3 UI/UX
- [ ] Překlady jsou přidány do `locales/cs.json`
- [ ] Loading stavy jsou zobrazeny
- [ ] Error stavy jsou zobrazeny
- [ ] Empty stavy jsou zobrazeny
- [ ] Navigace funguje správně
- [ ] Refresh při návratu na obrazovku (useFocusEffect)

#### 3.4 Databáze
- [ ] Migrace jsou idempotentní (IF NOT EXISTS, DROP IF EXISTS)
- [ ] RLS policies jsou správně nastavené
- [ ] Indexy jsou přidány pro performance
- [ ] Foreign keys jsou správně nastavené

#### 3.5 Dokumentace
- [ ] Nové komponenty jsou dokumentované (pokud jsou veřejné)
- [ ] Nové hooky jsou dokumentované
- [ ] Nové obrazovky jsou dokumentované
- [ ] Změny v databázi jsou dokumentované

### Krok 4: Testování

**Typy testů:**

#### 4.1 Funkční testy
- [ ] Nová funkcionalita funguje podle očekávání
- [ ] Edge cases jsou ošetřené
- [ ] Error handling funguje
- [ ] Loading stavy fungují

#### 4.2 Integrační testy
- [ ] Integrace s existujícími komponentami funguje
- [ ] Navigace funguje správně
- [ ] Data se načítají správně
- [ ] Aktualizace dat fungují

#### 4.3 Role-based testy
- [ ] Funguje pro owner
- [ ] Funguje pro admin
- [ ] Funguje pro member
- [ ] Funguje pro viewer
- [ ] Funguje pro provider (pokud relevantní)

#### 4.4 UI testy
- [ ] Obrazovka vypadá správně
- [ ] Responsive design funguje
- [ ] Loading stavy jsou zobrazeny
- [ ] Error stavy jsou zobrazeny
- [ ] Empty stavy jsou zobrazeny

### Krok 5: Dokumentace změn

**Co dokumentovat:**

#### 5.1 Nové soubory
- Vytvořené komponenty
- Vytvořené hooky
- Vytvořené obrazovky
- Vytvořené migrace

#### 5.2 Změny v existujících souborech
- Významné změny v logice
- Změny v API
- Změny v databázovém schématu

#### 5.3 Aktualizace dokumentace
- Aktualizuj relevantní dokumenty v `/docs`
- Přidej příklady použití
- Aktualizuj seznamy (komponenty, hooky, obrazovky)

### Krok 6: Review a finalizace

**Kontrolní body:**

1. **Kód review:**
   - [ ] Kód je čistý a konzistentní
   - [ ] Nejsou duplicity
   - [ ] Všechny TODO komentáře jsou vyřešené
   - [ ] Console.log jsou odstraněny (nebo jsou informativní)

2. **Funkční review:**
   - [ ] Všechny funkce fungují
   - [ ] Error handling je kompletní
   - [ ] Loading stavy jsou správné

3. **Dokumentační review:**
   - [ ] Dokumentace je aktualizovaná
   - [ ] Překlady jsou přidány
   - [ ] Komentáře jsou jasné

## Speciální případy

### Pracuji s databází

**Workflow:**
1. Zkontroluj [DATABASE.md](./DATABASE.md)
2. Vytvoř migraci v `supabase/migrations/`
3. Název migrace: `YYYYMMDDHHMMSS_description.sql`
4. Migrace musí být idempotentní
5. Přidej RLS policies
6. Přidej indexy pro performance
7. Aktualizuj `types/database.ts` (nebo použij Supabase CLI pro generování)

### Pracuji s novou obrazovkou

**Workflow:**
1. Zkontroluj [SCREENS.md](./SCREENS.md) a [NAVIGATION.md](./NAVIGATION.md)
2. Přidej route do `navigation/types.ts`
3. Přidej screen do `navigation/AppNavigator.tsx`
4. Vytvoř screen v `screens/`
5. Používej existující komponenty a hooky
6. Přidej překlady
7. Aktualizuj dokumentaci

### Pracuji s novou komponentou

**Workflow:**
1. Zkontroluj [UI_COMPONENTS.md](./UI_COMPONENTS.md)
2. Zkontroluj, zda podobná komponenta neexistuje
3. Vytvoř komponentu v `components/`
4. Používej design systém z `theme/colors.ts`
5. Přidej TypeScript typy
6. Přidej dokumentaci (pokud je veřejná)
7. Aktualizuj [UI_COMPONENTS.md](./UI_COMPONENTS.md)

### Pracuji s novým hookem

**Workflow:**
1. Zkontroluj [HOOKS.md](./HOOKS.md)
2. Zkontroluj, zda podobný hook neexistuje
3. Vytvoř hook v `hooks/`
4. Používej Supabase client z `lib/supabase.ts`
5. Implementuj error handling
6. Implementuj loading states
7. Přidej refetch funkci
8. Aktualizuj [HOOKS.md](./HOOKS.md)

### Pracuji s notifikacemi

**Workflow:**
1. Zkontroluj [NOTIFICATIONS.md](./NOTIFICATIONS.md)
2. Vytvoř notifikaci přes Edge Function (ne přímo v DB)
3. Používej existující typy notifikací
4. Přidej data pro deep linking
5. Testuj na reálném zařízení

## Formát výstupu

### Struktura změn

Při dokončení úkolu vždy uveď:

```
## Shrnutí změn

### Vytvořené soubory
- `screens/NewScreen.tsx` - Nová obrazovka pro...
- `hooks/useNewHook.ts` - Hook pro...

### Upravené soubory
- `screens/ExistingScreen.tsx` - Přidána funkcionalita...
- `navigation/types.ts` - Přidána route...

### Databázové změny
- `supabase/migrations/20250101000000_new_feature.sql` - Nová tabulka...

### Překlady
- Přidány klíče do `locales/cs.json`: `newFeature.title`, `newFeature.description`

### Dokumentace
- Aktualizován `docs/SCREENS.md` - přidána nová obrazovka
```

### Code review checklist

Před označením úkolu jako hotový:

- [ ] Kód je čistý a konzistentní
- [ ] Používá existující komponenty/hooky
- [ ] Respektuje design systém
- [ ] Používá TypeScript typy
- [ ] Překlady jsou přidány
- [ ] Error handling je implementován
- [ ] Loading stavy jsou implementovány
- [ ] Dokumentace je aktualizovaná
- [ ] Testováno na všech relevantních rolích

## Best Practices

### 1. DRY (Don't Repeat Yourself)
- Používej existující komponenty místo vytváření nových
- Používej existující hooky místo duplicitní logiky
- Extrahuj opakující se logiku do funkcí/hooks

### 2. KISS (Keep It Simple, Stupid)
- Jednoduché řešení je lepší než složité
- Pokud existuje jednoduché řešení, použij ho
- Neover-engineeruj

### 3. YAGNI (You Aren't Gonna Need It)
- Neimplementuj funkcionalitu, která není požadována
- Neplánuj dopředu, co možná nebude potřeba
- Soustřeď se na aktuální požadavek

### 4. Konzistence
- Dodržuj existující konvence
- Používej stejné vzory jako v existujícím kódu
- Respektuj architekturu

### 5. Type Safety
- Vždy používej TypeScript typy
- Vyhni se `any` pokud možno
- Používej typy z `types/database.ts`

### 6. Error Handling
- Vždy zpracovávej chyby
- Zobrazuj uživatelsky přívětivé chybové zprávy
- Loguj chyby pro debugging

### 7. Loading States
- Vždy zobrazuj loading stavy
- Používej loading z hooks
- Nezapomeň na skeleton screens pro lepší UX

### 8. Internationalization
- Všechny texty musí být v `locales/cs.json`
- Používej `useTranslation()` hook
- Nehardcoduj texty

## Troubleshooting

### Nejsem si jistý, jak implementovat

1. **Zkontroluj dokumentaci** - možná už existuje podobné řešení
2. **Zkontroluj existující kód** - podívej se, jak je to řešeno jinde
3. **Zeptej se** - pokud je požadavek nejasný, požádej o upřesnění

### Existuje více způsobů implementace

1. **Zvol nejjednodušší** - pokud není důvod pro složitější
2. **Respektuj architekturu** - použij způsob, který je konzistentní s existujícím kódem
3. **Zvaž budoucí rozšiřitelnost** - ale neover-engineeruj

### Potřebuji vytvořit novou komponentu/hook

1. **Zkontroluj, zda neexistuje** - možná už existuje podobná
2. **Zkontroluj, zda nemůžeš použít existující** - možná stačí upravit
3. **Pokud musíš vytvořit novou** - dodržuj konvence a dokumentuj

## Kontrolní otázky před dokončením

- [ ] Rozumím požadavku a implementoval jsem ho správně?
- [ ] Používám existující komponenty/hooky místo vytváření nových?
- [ ] Respektuji design systém a konvence?
- [ ] Přidal jsem všechny potřebné překlady?
- [ ] Implementoval jsem error handling a loading stavy?
- [ ] Testoval jsem na všech relevantních rolích?
- [ ] Aktualizoval jsem dokumentaci?
- [ ] Kód je čistý a konzistentní?

## Závěr

Tento workflow zajišťuje, že všechny AI agenty dodávají konzistentní, kvalitní a udržovatelný kód, který respektuje architekturu aplikace. Dodržování tohoto workflow je klíčové pro dlouhodobou udržovatelnost projektu.

**Pamatuj:** Kvalita je důležitější než rychlost. Raději udělej méně, ale dobře, než hodně, ale špatně.

