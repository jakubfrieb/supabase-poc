# Custom React Hooks

## Přehled

Aplikace používá custom hooks pro data fetching a business logiku. Všechny hooks používají Supabase pro komunikaci s databází.

## Konvence

1. **Všechny hooks** vracejí `loading`, `error` a data
2. **Refetch funkce** pro manuální obnovení dat
3. **Automatické načítání** při mountu (pokud je potřeba user)
4. **Type safety** pomocí TypeScript typů z `types/database.ts`

## Autentizace a uživatelé

### useAuth
**Soubor:** `contexts/AuthContext.tsx`  
**Popis:** Context hook pro autentizaci.

**Vrací:**
- `session`: Session | null - Aktuální session
- `user`: User | null - Aktuální uživatel
- `loading`: boolean - Načítání
- `signInWithGoogle()`: Promise<void> - Přihlášení přes Google
- `signInWithEmail(email, password)`: Promise<void> - Přihlášení emailem
- `signUpWithEmail(email, password)`: Promise<void> - Registrace
- `resetPassword(email)`: Promise<void> - Reset hesla
- `signOut()`: Promise<void> - Odhlášení

**Použití:**
```typescript
const { user, loading, signOut } = useAuth();
```

### useUser
**Soubor:** `hooks/useUser.ts`  
**Popis:** Načte informace o uživateli.

**Parametry:**
- `userId`: string | null - ID uživatele

**Vrací:**
- `userInfo`: UserProfile | null - Informace o uživateli
- `loading`: boolean
- `error`: Error | null

**Použití:**
```typescript
const { userInfo, loading } = useUser(userId);
```

### useUserProfile
**Soubor:** `hooks/useUserProfile.ts`  
**Popis:** Správa profilu aktuálního uživatele.

**Vrací:**
- `profile`: UserProfile | null
- `loading`: boolean
- `error`: Error | null
- `updateProfile(data)`: Promise<void> - Aktualizace profilu

## Nemovitosti

### useFacilities
**Soubor:** `hooks/useFacilities.ts`  
**Popis:** Správa nemovitostí.

**Vrací:**
- `facilities`: Facility[] - Seznam nemovitostí
- `loading`: boolean
- `error`: Error | null
- `fetchFacilities()`: Promise<void> - Načtení nemovitostí
- `createFacility(data)`: Promise<Facility> - Vytvoření nemovitosti
- `updateFacility(id, updates)`: Promise<Facility> - Aktualizace
- `deleteFacility(id)`: Promise<void> - Smazání
- `leaveFacility(facilityId)`: Promise<void> - Opuštění nemovitosti

**Použití:**
```typescript
const { facilities, loading, createFacility } = useFacilities();
```

### useFacilityRole
**Soubor:** `hooks/useFacilityRole.ts`  
**Popis:** Zjistí roli uživatele v nemovitosti.

**Parametry:**
- `facilityId`: string | null

**Vrací:**
- `role`: 'owner' | 'admin' | 'member' | 'viewer' | null
- `loading`: boolean
- `isAdminOrOwner`: boolean - Zkratka pro kontrolu oprávnění

**Použití:**
```typescript
const { role, isAdminOrOwner } = useFacilityRole(facilityId);
```

### useFacilityMembers
**Soubor:** `hooks/useFacilityMembers.ts`  
**Popis:** Správa členů nemovitosti.

**Parametry:**
- `facilityId`: string | null

**Vrací:**
- `members`: FacilityMember[] - Seznam členů
- `loading`: boolean
- `error`: Error | null
- `addMember(userId, role)`: Promise<void>
- `updateMemberRole(userId, role)`: Promise<void>
- `removeMember(userId)`: Promise<void>
- `refetch()`: Promise<void>

## Závady

### useIssues
**Soubor:** `hooks/useIssues.ts`  
**Popis:** Správa závad.

**Parametry:**
- `facilityId?`: string - Filtrování podle nemovitosti

**Vrací:**
- `issues`: Issue[] - Seznam závad
- `loading`: boolean
- `error`: Error | null
- `fetchIssues()`: Promise<void>
- `createIssue(data)`: Promise<Issue>
- `updateIssue(id, updates)`: Promise<Issue>
- `deleteIssue(id)`: Promise<void>

**Použití:**
```typescript
const { issues, loading, createIssue } = useIssues(facilityId);
```

### useIssueMessages
**Soubor:** `hooks/useIssueMessages.ts`  
**Popis:** Zprávy k závadě.

**Parametry:**
- `issueId`: string

**Vrací:**
- `messages`: IssueMessage[]
- `loading`: boolean
- `error`: Error | null
- `sendMessage(content, attachmentUrl?)`: Promise<IssueMessage>
- `refetch()`: Promise<void>

### useIssueAttachments
**Soubor:** `hooks/useIssueAttachments.ts`  
**Popis:** Přílohy k závadě.

**Parametry:**
- `issueId`: string

**Vrací:**
- `attachments`: Attachment[]
- `loading`: boolean
- `error`: Error | null
- `uploadAttachment(file)`: Promise<Attachment>
- `deleteAttachment(id)`: Promise<void>
- `refetch()`: Promise<void>

## Služby a dodavatelé

### useServiceProvider
**Soubor:** `hooks/useServiceProvider.ts`  
**Popis:** Informace o dodavateli.

**Vrací:**
- `provider`: ServiceProvider | null
- `loading`: boolean
- `error`: Error | null
- `createProvider(data)`: Promise<ServiceProvider>
- `updateProvider(data)`: Promise<ServiceProvider>
- `refetch()`: Promise<void>

### useServices
**Soubor:** `hooks/useServices.ts`  
**Popis:** Katalog služeb.

**Vrací:**
- `services`: Service[]
- `loading`: boolean
- `error`: Error | null
- `refetch()`: Promise<void>

### useServiceRegistrations
**Soubor:** `hooks/useServiceRegistrations.ts`  
**Popis:** Registrace služeb dodavatele.

**Vrací:**
- `registrations`: ServiceRegistration[]
- `loading`: boolean
- `error`: Error | null
- `registerService(serviceId, voucherCode?)`: Promise<ServiceRegistration>
- `refetch()`: Promise<void>

### useServiceRequests
**Soubor:** `hooks/useServiceRequests.ts`  
**Popis:** Poptávky na služby.

**Parametry:**
- `issueId?`: string - Filtrování podle závady

**Vrací:**
- `requests`: IssueServiceRequest[]
- `loading`: boolean
- `error`: Error | null
- `createRequest(data)`: Promise<IssueServiceRequest>
- `closeRequest(requestId)`: Promise<IssueServiceRequest>
- `refetch()`: Promise<void>

**Použití:**
```typescript
// Všechny poptávky
const { requests } = useServiceRequests();

// Poptávky pro konkrétní závadu
const { requests } = useServiceRequests(issueId);
```

### useOpenServiceRequests
**Soubor:** `hooks/useOpenServiceRequests.ts`  
**Popis:** Otevřené poptávky pro správce/vlastníky/zadavatele.

**Vrací:**
- `requests`: OpenServiceRequest[] - Poptávky na nemovitostech uživatele nebo kde je cooperation_user_id
- `loading`: boolean
- `error`: Error | null
- `refetch()`: Promise<void>

**Použití:**
```typescript
const { requests, loading } = useOpenServiceRequests();
```

### useProviderServiceRequests
**Soubor:** `hooks/useProviderServiceRequests.ts`  
**Popis:** Poptávky pro dodavatele (na jejich služby a do kterých jsou přihlášeni).

**Vrací:**
- `requests`: ProviderServiceRequest[]
- `loading`: boolean
- `error`: Error | null
- `refetch()`: Promise<void>

**Použití:**
```typescript
const { requests, loading } = useProviderServiceRequests();
```

### useServiceApplications
**Soubor:** `hooks/useServiceApplications.ts`  
**Popis:** Přihlášky dodavatelů na poptávku.

**Parametry:**
- `requestId`: string

**Vrací:**
- `applications`: ServiceApplication[]
- `loading`: boolean
- `error`: Error | null
- `createApplication(data)`: Promise<ServiceApplication>
- `selectApplication(applicationId)`: Promise<ServiceApplication>
- `rejectApplication(applicationId)`: Promise<ServiceApplication>
- `refetch()`: Promise<void>

### useAppointments
**Soubor:** `hooks/useAppointments.ts`  
**Popis:** Termíny pro závadu.

**Parametry:**
- `issueId`: string

**Vrací:**
- `appointments`: ServiceAppointment[]
- `loading`: boolean
- `error`: Error | null
- `proposeAppointment(data)`: Promise<ServiceAppointment>
- `confirmAppointment(appointmentId)`: Promise<ServiceAppointment>
- `rejectAppointment(appointmentId)`: Promise<ServiceAppointment>
- `refetch()`: Promise<void>

### useProviderIssues
**Soubor:** `hooks/useProviderIssues.ts`  
**Popis:** Závady, kde je dodavatel přiřazen (vysoutěžené).

**Vrací:**
- `issues`: Issue[]
- `loading`: boolean
- `error`: Error | null
- `refetch()`: Promise<void>

## Notifikace

### useNotifications
**Soubor:** `hooks/useNotifications.ts`  
**Popis:** Notifikace uživatele.

**Vrací:**
- `notifications`: Notification[]
- `loading`: boolean
- `error`: Error | null
- `markAsRead(id)`: Promise<void>
- `markAllAsRead()`: Promise<void>
- `refetch()`: Promise<void>

### useUnreadNotificationsCount
**Soubor:** `hooks/useNotifications.ts`  
**Popis:** Počet nepřečtených notifikací.

**Vrací:**
- `count`: number
- `loading`: boolean
- `refetch()`: Promise<void>

## Best Practices

1. **Vždy používej existující hooks** - nevytvářej duplicitní logiku
2. **Používej refetch()** - pro manuální obnovení dat
3. **Respektuj loading states** - zobrazuj loading indikátory
4. **Error handling** - zobrazuj chyby uživateli
5. **useFocusEffect** - pro refresh při návratu na obrazovku
6. **Type safety** - používej typy z hooks, ne vlastní

## Příklad použití

```typescript
function MyScreen() {
  const { user } = useAuth();
  const { facilities, loading, createFacility } = useFacilities();
  const { role, isAdminOrOwner } = useFacilityRole(facilityId);
  
  // Refresh při návratu
  useFocusEffect(
    useCallback(() => {
      // hooks automaticky načítají data
    }, [])
  );
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <View>
      {facilities.map(facility => (
        <FacilityCard key={facility.id} facility={facility} />
      ))}
    </View>
  );
}
```

