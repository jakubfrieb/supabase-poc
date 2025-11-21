# Dokumentace aplikace Správce Nemovitostí

Tato dokumentace popisuje architekturu, komponenty a strukturu aplikace pro správu nemovitostí a závad.

## Struktura dokumentace

- **[SOLUTION.md](./SOLUTION.md)** - 📱 **CO TO JE?** - Popis aplikace, funkcionalit a uživatelských rolí
- **[WORKFLOW.md](./WORKFLOW.md)** - ⭐ **ZAČNI ZDE** - Standardizovaný workflow pro AI agenty
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Celková architektura aplikace, technologie, struktura projektu
- **[UI_COMPONENTS.md](./UI_COMPONENTS.md)** - UI komponenty a design systém
- **[SCREENS.md](./SCREENS.md)** - Přehled všech obrazovek a jejich funkcionalit
- **[NAVIGATION.md](./NAVIGATION.md)** - Navigační struktura a routing
- **[DATABASE.md](./DATABASE.md)** - Databázové schéma a migrace
- **[HOOKS.md](./HOOKS.md)** - Custom React hooks a jejich použití
- **[NOTIFICATIONS.md](./NOTIFICATIONS.md)** - Systém notifikací a jejich nastavení
- **[DISTRIBUTION.md](./DISTRIBUTION.md)** - Build a distribuce aplikace (APK, AAB, EAS Build)

## Rychlý start pro AI agenty

**⚠️ DŮLEŽITÉ:**
1. **Nejdřív si přečti [SOLUTION.md](./SOLUTION.md)** - abys rozuměl, co aplikace dělá
2. **Pak si přečti [WORKFLOW.md](./WORKFLOW.md)** - abys věděl, jak pracovat konzistentně

Při úpravách aplikace dodržujte:

1. **Design systém**: Používejte komponenty z `components/` a styly z `theme/colors.ts`
2. **Typy**: Všechny typy jsou v `types/database.ts` - používejte je konzistentně
3. **Hooks**: Pro data použijte existující hooks z `hooks/` - nevytvářejte duplicitní logiku
4. **Navigace**: Přidávejte nové obrazovky do `navigation/types.ts` a `AppNavigator.tsx`
5. **Styly**: Používejte `StyleSheet.create()` a konstanty z `theme/colors.ts`

## Konvence pojmenování

- **Komponenty**: PascalCase (`Button.tsx`, `UserAvatar.tsx`)
- **Hooks**: camelCase s prefixem `use` (`useFacilities.ts`, `useIssues.ts`)
- **Obrazovky**: PascalCase s příponou `Screen` (`FacilitiesScreen.tsx`)
- **Typy**: PascalCase (`RootStackParamList`, `Facility`)
- **Styly**: camelCase v objektu `styles` (`card`, `buttonPrimary`)

## Důležité poznámky

- Aplikace používá **Supabase** jako backend (autentizace, databáze, realtime)
- **i18n**: Překlady jsou v `locales/cs.json` - vždy přidávejte klíče pro nové texty
- **RLS**: Všechny databázové dotazy respektují Row Level Security
- **Role**: Aplikace rozlišuje role v nemovitostech (owner, admin, member, viewer)
- **Service Providers**: Dodavatelé mají vlastní workflow (registrace služeb, poptávky, termíny)
- **Notifikace**: Používají Supabase Realtime + Local Notifications (bez Firebase) - viz [NOTIFICATIONS.md](./NOTIFICATIONS.md)

