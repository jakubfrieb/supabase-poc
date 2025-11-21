# UI Komponenty a Design Systém

## Design Systém

### Barvy (`theme/colors.ts`)

Aplikace používá modrou paletu s turkysovými akcenty.

#### Primární barvy
- `primary`: `#1E88E5` - Hlavní modrá
- `primaryDark`: `#0D47A1` - Tmavě modrá
- `primaryLight`: `#64B5F6` - Světle modrá
- `turquoise`: `#00838F` - Turkysová/Petrol
- `teal`: `#00695C` - Tmavě tyrkysová

#### Pozadí
- `background`: `#F5F7FA` - Světle modrošedé pozadí
- `backgroundDark`: `#E3F2FD` - Mírně tmavší modře tónované pozadí
- `surface`: `#FFFFFF` - Bílé karty/povrchy
- `surfaceElevated`: `#FAFBFC` - Zvýšené povrchy

#### Text
- `text`: `#1A1A2E` - Tmavě modročerná pro primární text
- `textSecondary`: `#546E7A` - Modrošedá pro sekundární text
- `textLight`: `#90A4AE` - Světle šedý text
- `textOnPrimary`: `#FFFFFF` - Bílý text na primární modré

#### Status barvy
- `success`: `#00C853` - Zelená pro úspěch
- `warning`: `#FFB300` - Jantarová pro varování
- `error`: `#E53935` - Červená pro chyby
- `info`: `#0288D1` - Světle modrá pro info

#### Priority barvy (závady)
- `priorityIdea`: `#FFD700` - Zlatá/žlutá
- `priorityNormal`: `#81C784` - Zelená
- `priorityHigh`: `#FFB74D` - Oranžová
- `priorityCritical`: `#EF5350` - Červená
- `priorityUrgent`: `#C62828` - Tmavě červená

#### Status barvy (závady)
- `statusOpen`: `#42A5F5` - Modrá
- `statusInProgress`: `#FFA726` - Oranžová
- `statusResolved`: `#66BB6A` - Zelená
- `statusClosed`: `#78909C` - Šedá

### Spacing (`spacing`)

```typescript
{
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}
```

### Border Radius (`borderRadius`)

```typescript
{
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
}
```

### Font Sizes (`fontSize`)

```typescript
{
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}
```

### Font Weights (`fontWeight`)

```typescript
{
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}
```

### Shadows (`shadows`)

- `sm`: Malý stín (elevation 2)
- `md`: Střední stín (elevation 4)
- `lg`: Velký stín (elevation 8)

## Komponenty

### Card

Základní karta pro obsah.

**Props:**
- `children`: React.ReactNode - Obsah karty
- `style?`: ViewStyle - Vlastní styly
- `pressed?`: boolean - Zvýrazní border při stisku

**Použití:**
```tsx
<Card>
  <Text>Obsah karty</Text>
</Card>
```

**Styly:**
- Bílé pozadí
- Border radius: `borderRadius.lg` (16px)
- Padding: `spacing.lg` (16px)
- Stín: `shadows.md`

### Button

Tlačítko s různými variantami.

**Props:**
- `title`: string - Text tlačítka
- `onPress`: () => void - Handler pro stisk
- `variant?`: 'primary' | 'secondary' | 'outline' | 'danger' - Varianta
- `loading?`: boolean - Zobrazí loading indikátor
- `disabled?`: boolean - Zakáže tlačítko
- `style?`: ViewStyle - Vlastní styly
- `icon?`: React.ReactNode - Ikona před textem

**Varianty:**
- `primary`: Modré pozadí, bílý text
- `secondary`: Turkysové pozadí, bílý text
- `outline`: Průhledné pozadí, modrý border a text
- `danger`: Červené pozadí, bílý text

**Použití:**
```tsx
<Button title="Uložit" onPress={handleSave} variant="primary" />
<Button title="Zrušit" onPress={handleCancel} variant="outline" />
<Button title="Smazat" onPress={handleDelete} variant="danger" />
```

### Input

Textové vstupní pole.

**Props:**
- `value`: string - Hodnota
- `onChangeText`: (text: string) => void - Handler pro změnu
- `placeholder?`: string - Placeholder text
- `secureTextEntry?`: boolean - Skryje text (pro hesla)
- `multiline?`: boolean - Víceřádkové
- `style?`: ViewStyle - Vlastní styly
- `autoFocus?`: boolean - Automatické zaostření

**Použití:**
```tsx
<Input
  value={email}
  onChangeText={setEmail}
  placeholder="Email"
  autoFocus
/>
```

### MetroFAB

Floating Action Button s více akcemi (Metro design).

**Props:**
- `onAddPress`: () => void - Handler pro přidání (hlavní akce)
- `onLinkPress?`: () => void - Handler pro propojení
- `onAddServicePress?`: () => void - Handler pro přidání služby

**Použití:**
```tsx
<MetroFAB
  onAddPress={() => navigation.navigate('CreateFacility')}
  onLinkPress={() => navigation.navigate('JoinFacility')}
  onAddServicePress={() => navigation.navigate('ServiceRegistration')}
/>
```

### UserAvatar

Avatar uživatele s možností zobrazení jména.

**Props:**
- `userId`: string | null - ID uživatele
- `size?`: 'small' | 'medium' | 'large' - Velikost
- `showName?`: boolean - Zobrazit jméno vedle avataru

**Použití:**
```tsx
<UserAvatar userId={user?.id || null} size="medium" showName={false} />
```

### PriorityBadge

Badge pro zobrazení priority závady.

**Props:**
- `priority`: 'idea' | 'normal' | 'high' | 'critical' | 'urgent'
- `style?`: ViewStyle - Vlastní styly

**Použití:**
```tsx
<PriorityBadge priority="high" />
```

### PriorityPickerModal

Modal pro výběr priority.

**Props:**
- `visible`: boolean - Viditelnost modalu
- `selectedPriority`: Priority - Aktuálně vybraná priorita
- `onSelect`: (priority: Priority) => void - Handler pro výběr
- `onClose`: () => void - Handler pro zavření

### ServiceSelector

Výběr služby z katalogu.

**Props:**
- `selectedServiceId?`: string - ID vybrané služby
- `onSelect`: (serviceId: string) => void - Handler pro výběr
- `excludeServiceIds?`: string[] - Služby k vyloučení

### ServiceProviderCard

Karta dodavatele služeb.

**Props:**
- `provider`: ServiceProvider - Data dodavatele
- `onPress?`: () => void - Handler pro stisk
- `showActions?`: boolean - Zobrazit akční tlačítka

### AppointmentCard

Karta termínu.

**Props:**
- `appointment`: ServiceAppointment - Data termínu
- `onConfirm?`: () => void - Handler pro potvrzení
- `onReject?`: () => void - Handler pro zamítnutí
- `canConfirm?`: boolean - Může uživatel potvrdit

### WorkflowStepper

Krokový indikátor workflow závady.

**Props:**
- `currentStep`: number - Aktuální krok (0-4)
- `steps`: string[] - Názvy kroků

**Kroky:**
1. Poptávka
2. Výběr dodavatele
3. Termín
4. Oprava
5. Hotovo

### AttachmentsGrid

Mřížka příloh závady.

**Props:**
- `attachments`: Attachment[] - Seznam příloh
- `onPress?`: (attachment: Attachment) => void - Handler pro stisk
- `onDelete?`: (attachmentId: string) => void - Handler pro smazání
- `canDelete?`: boolean - Může uživatel mazat

### FacilityMembersModal

Modal pro správu členů nemovitosti.

**Props:**
- `visible`: boolean - Viditelnost
- `facilityId`: string - ID nemovitosti
- `onClose`: () => void - Handler pro zavření

### ConfirmDeleteDialog

Dialog pro potvrzení smazání.

**Props:**
- `visible`: boolean - Viditelnost
- `title`: string - Nadpis
- `message`: string - Zpráva
- `confirmText?`: string - Text potvrzovacího tlačítka
- `onConfirm`: () => void - Handler pro potvrzení
- `onCancel`: () => void - Handler pro zrušení

### DeleteButton

Tlačítko pro smazání s potvrzovacím dialogem.

**Props:**
- `onDelete`: () => void - Handler pro smazání
- `title?`: string - Nadpis dialogu
- `message?`: string - Zpráva dialogu
- `style?`: ViewStyle - Vlastní styly

## Konvence stylování

1. **Vždy používej konstanty z `theme/colors.ts`** - ne hardcoduj barvy
2. **Používej `StyleSheet.create()`** - pro lepší výkon
3. **Respektuj spacing** - používej `spacing.xs`, `spacing.sm`, atd.
4. **Konzistentní border radius** - `borderRadius.sm` pro malé prvky, `borderRadius.lg` pro karty
5. **Používej shadows** - `shadows.md` pro karty, `shadows.sm` pro malé prvky
6. **Respektuj typografii** - používej `fontSize` a `fontWeight` konstanty

## Ikony

Aplikace používá **Ionicons** z `@expo/vector-icons`.

**Běžné ikony:**
- `document-text-outline` - Dokumenty, závady
- `construct` - Služby, dodavatelé
- `people-outline` - Uživatelé, členové
- `notifications-outline` - Notifikace
- `checkmark-circle-outline` - Úspěch, potvrzení
- `trophy-outline` - Vysoutěžené závady
- `clipboard-outline` - Poptávky
- `business-outline` - Firma, dodavatel

## Pozadí obrazovek

Většina obrazovek používá `ImageBackground` s obrázkem z `assets/background/theme_1.png` s opacity 0.3.

