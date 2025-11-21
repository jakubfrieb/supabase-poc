# Navigační struktura

## Přehled

Aplikace používá **React Navigation** s **Native Stack Navigator**. Navigace je rozdělena na autentizované a neautentizované části.

## RootStackParamList

Všechny route typy jsou definovány v `navigation/types.ts`:

```typescript
export type RootStackParamList = {
  // Autentizace
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Hlavní
  Facilities: undefined;
  Notifications: undefined;
  Profile: undefined;
  
  // Nemovitosti
  JoinFacility: undefined;
  CreateFacility: undefined;
  EditFacility: { facilityId: string };
  FacilityDetail: { facilityId: string };
  
  // Závady
  CreateIssue: { facilityId: string };
  IssueDetail: { issueId: string; facilityId: string };
  EditIssue: { issueId: string; facilityId: string };
  
  // Služby
  ServiceRegistration: undefined;
  MyServices: undefined;
  ServiceCatalog: undefined;
  ServiceRequest: { issueId: string };
  ServiceApplications: { requestId: string; issueId: string };
  AppointmentSelection: { issueId: string; providerId?: string };
};
```

## Navigační struktura

### Neautentizovaný uživatel

```
Login
├── Register
└── ForgotPassword (modal)
```

### Autentizovaný uživatel

```
Facilities (root)
├── Profile
├── Notifications
├── JoinFacility (modal)
├── CreateFacility (modal)
├── FacilityDetail
│   └── CreateIssue (modal)
│       └── IssueDetail
│           ├── ServiceRequest (modal)
│           │   └── ServiceApplications
│           │       └── AppointmentSelection (modal)
│           └── AppointmentSelection (modal)
└── ServiceRegistration (modal)
    └── ServiceCatalog
        └── MyServices
            └── IssueDetail
                └── AppointmentSelection (modal)
```

## Navigace v kódu

### Základní navigace

```typescript
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function MyScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  // Navigace bez parametrů
  navigation.navigate('Profile');
  
  // Navigace s parametry
  navigation.navigate('IssueDetail', {
    issueId: '123',
    facilityId: '456',
  });
  
  // Navigace zpět
  navigation.goBack();
}
```

### Navigace z route parametrů

```typescript
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type RouteProps = RouteProp<RootStackParamList, 'IssueDetail'>;

function IssueDetailScreen() {
  const route = useRoute<RouteProps>();
  const { issueId, facilityId } = route.params;
}
```

## Screen Options

### Globální options

Všechny screens mají tyto globální options:
```typescript
{
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '600' },
  headerShadowVisible: false,
}
```

### Specifické options

#### Modal screens
```typescript
{
  presentation: 'modal',
  title: 'Název modalu',
}
```

#### Screens bez headeru
```typescript
{
  headerShown: false,
}
```

## Deep Linking

Aplikace podporuje deep linking s scheme `myapp://`.

### OAuth callback
- `myapp://auth/callback` - OAuth redirect URL

### Reset hesla
- `myapp://auth/reset-password` - Reset hesla redirect

## Navigační konvence

1. **Vždy používej typy** - `NativeStackNavigationProp<RootStackParamList>`
2. **Parametry jsou required** - pokud screen vyžaduje parametry, musí být vždy předány
3. **Modal screens** - používají se pro vytváření/editaci, mají `presentation: 'modal'`
4. **Detail screens** - vždy vyžadují ID entity (facilityId, issueId)
5. **Go back po akci** - po vytvoření/editaci se vrací zpět pomocí `navigation.goBack()`

## Refresh při návratu

Všechny screens používají `useFocusEffect` pro refresh dat při návratu:

```typescript
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    fetchData();
  }, [fetchData])
);
```

## Navigační flow příklady

### Vytvoření závady
1. `FacilitiesScreen` → klik na nemovitost
2. `FacilityDetailScreen` → klik na "Vytvořit závadu"
3. `CreateIssueScreen` (modal) → vyplnění a uložení
4. Automatický návrat na `FacilityDetailScreen` (refresh seznamu)

### Workflow závady
1. `IssueDetailScreen` → klik na "Poptat dodavatele"
2. `ServiceRequestScreen` (modal) → výběr služby
3. Automatický návrat na `IssueDetailScreen`
4. Klik na "Zobrazit přihlášky"
5. `ServiceApplicationsScreen` → výběr dodavatele
6. Automatický návrat na `IssueDetailScreen`
7. Klik na "Termíny"
8. `AppointmentSelectionScreen` (modal) → potvrzení termínu

### Registrace dodavatele
1. `FacilitiesScreen` → klik na MetroFAB → "Nová služba"
2. `ServiceRegistrationScreen` (modal) → vyplnění údajů
3. Automatický návrat na `FacilitiesScreen`
4. Navigace na `ServiceCatalogScreen` → výběr služeb
5. Navigace na `MyServicesScreen` → přehled služeb

