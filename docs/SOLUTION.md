# Řešení - Správce Nemovitostí

## Co je to za aplikaci?

**Správce Nemovitostí** je mobilní aplikace pro správu nemovitostí, hlášení závad a komunikaci s dodavateli služeb. Aplikace umožňuje vlastníkům, správcům a obyvatelům nemovitostí efektivně spravovat závady, komunikovat s dodavateli a sledovat průběh oprav.

## Hlavní účel

Aplikace řeší problém **složité komunikace a koordinace při správě závad v nemovitostech**:
- Centralizované hlášení závad
- Transparentní workflow oprav
- Propojení s dodavateli služeb
- Sledování průběhu oprav
- Komunikace mezi všemi zúčastněnými stranami

## Uživatelské role

### 1. Vlastník nemovitosti (Owner)
**Kdo to je:** Vlastník nemovitosti (dům, byt, atd.)

**Co může:**
- Vytvářet a spravovat nemovitosti
- Pozývat členy do nemovitosti
- Spravovat role členů (admin, member, viewer)
- Vytvářet a spravovat závady
- Vytvářet poptávky na služby
- Vybírat dodavatele
- Potvrzovat termíny oprav
- Spravovat předplatné nemovitosti

**Typický use case:**
Vlastník domu vytvoří nemovitost, pozve správce a obyvatele. Když někdo nahlásí závadu (např. netěsnící kohoutek), vlastník vytvoří poptávku na instalatérství. Dodavatelé se přihlásí, vlastník vybere jednoho, domluví se termín a sleduje průběh opravy.

### 2. Správce nemovitosti (Admin)
**Kdo to je:** Správce, který spravuje nemovitost za vlastníka

**Co může:**
- Vše co vlastník (kromě smazání nemovitosti)
- Spravovat závady
- Vytvářet poptávky na služby
- Vybírat dodavatele
- Potvrzovat termíny

**Typický use case:**
Správce bytového domu dostane hlášení o závadě od obyvatele. Vytvoří poptávku na opravu, vybere dodavatele z přihlášených, domluví termín a sleduje dokončení opravy.

### 3. Člen nemovitosti (Member)
**Kdo to je:** Obyvatel, nájemce nebo jiný člen nemovitosti

**Co může:**
- Zobrazovat nemovitost a závady
- Vytvářet závady
- Komentovat závady
- Nahlásit závadu vyžadující součinnost (cooperation)

**Typický use case:**
Obyvatel bytu zjistí, že mu netěsní kohoutek. Vytvoří závadu v aplikaci, přidá fotografie a popis. Správce vidí závadu, vytvoří poptávku a zařídí opravu.

### 4. Návštěvník nemovitosti (Viewer)
**Kdo to je:** Osoba s pouze čtecím přístupem

**Co může:**
- Zobrazovat nemovitost a závady
- Nelze vytvářet ani upravovat

**Typický use case:**
Auditor nebo externí konzultant potřebuje vidět stav závad v nemovitosti, ale nemá oprávnění cokoliv měnit.

### 5. Zadavatel (Requester)
**Kdo to je:** Osoba, která nahlásila závadu vyžadující součinnost

**Co může:**
- Vše co člen (Member)
- Potvrzovat termíny oprav pro závady, které vyžadují součinnost
- Být notifikován o změnách v závadách, které vyžadují součinnost

**Typický use case:**
Obyvatel nahlásí závadu, která vyžaduje jeho přítomnost (např. oprava v jeho bytě). Když dodavatel navrhne termín, musí ho potvrdit právě tento obyvatel, ne správce.

### 6. Dodavatel služeb (Service Provider)
**Kdo to je:** Řemeslník, firma nebo dodavatel služeb (instalatér, elektrikář, atd.)

**Co může:**
- Registrovat se jako dodavatel
- Registrovat služby, které nabízí (instalatérství, elektro, atd.)
- Vidět dostupné poptávky na své služby
- Přihlásit se na poptávky
- Navrhovat termíny oprav
- Sledovat své vysoutěžené závady

**Typický use case:**
Instalatér se zaregistruje v aplikaci, aktivuje službu "Instalatérství". Když správce vytvoří poptávku na instalatérství, instalatér dostane notifikaci, přihlásí se na poptávku. Pokud je vybrán, navrhne termín a provede opravu.

## Hlavní funkcionality

### 1. Správa nemovitostí
- **Vytváření nemovitostí** - vlastník může vytvořit novou nemovitost
- **Pozvání členů** - vlastník/správce může pozvat členy pomocí pozvánkového kódu
- **Správa rolí** - přiřazování rolí (admin, member, viewer)
- **Poznámky k nemovitosti** - uložení důležitých informací
- **Předplatné** - správa předplatného pomocí voucherů

### 2. Hlášení a správa závad
- **Vytváření závad** - členové mohou nahlásit závadu s popisem a fotografiemi
- **Statusy závad** - open, in_progress, resolved, closed
- **Priority** - idea, normal, high, critical, urgent
- **Součinnost** - možnost označit závadu jako vyžadující součinnost konkrétního uživatele
- **Komentáře** - komunikace k závadě
- **Přílohy** - fotografie a dokumenty

### 3. Poptávky na služby
- **Vytváření poptávek** - správce/vlastník vytvoří poptávku na konkrétní službu
- **Automatické notifikace** - všichni dodavatelé s aktivní službou jsou notifikováni
- **Přihlášky dodavatelů** - dodavatelé se mohou přihlásit na poptávku
- **Výběr dodavatele** - správce vybere dodavatele z přihlášených
- **Sledování poptávek** - přehled otevřených poptávek a jejich stavu

### 4. Workflow oprav
Aplikace podporuje kompletní workflow od hlášení závady po dokončení opravy:

1. **Hlášení závady** - člen nahlásí závadu
2. **Poptávka** - správce vytvoří poptávku na službu
3. **Výběr dodavatele** - dodavatelé se přihlásí, správce vybere
4. **Termín** - dodavatel nebo správce navrhne termín
5. **Potvrzení termínu** - potvrzení od správce nebo zadavatele (pokud vyžaduje součinnost)
6. **Oprava** - dodavatel provede opravu
7. **Dokončení** - závada je označena jako resolved/closed

### 5. Správa termínů
- **Navrhování termínů** - dodavatel nebo správce může navrhnout termín
- **Potvrzení termínu** - potvrzení od správce nebo zadavatele
- **Zamítnutí termínu** - možnost zamítnout a navrhnout jiný
- **Poznámky k termínu** - důležité informace (např. "Potřebuji přístup do sklepa")

### 6. Registrace dodavatelů
- **Profil dodavatele** - fakturační údaje (firma, IČO, DIČ, adresa, telefon, email)
- **Registrace služeb** - výběr služeb z katalogu
- **Aktivace služeb** - pomocí voucheru (3 měsíce zdarma) nebo platby
- **Správa služeb** - přehled aktivních služeb a jejich platnosti

### 7. Katalog služeb
Předpřipravený katalog služeb:
- Instalatérství
- Elektrikář
- Zedník
- Malíř
- Truhlář
- Sklenář
- Zámečník
- Obkladač
- Podlahář
- Topenář
- Klimatizace
- Revize elektro
- Revize plyn
- Tesař
- Klempíř
- Zahradník
- Úklid
- Skládka

### 8. Notifikace
- **Real-time notifikace** - pomocí Supabase Realtime
- **Push notifikace** - (volitelné, vyžaduje FCM)
- **In-app notifikace** - přehled všech notifikací
- **Typy notifikací:**
  - Nová závada
  - Nová poptávka na službu
  - Přihláška dodavatele
  - Navržený termín
  - Potvrzený termín

### 9. Komunikace
- **Zprávy k závadám** - komentáře a komunikace
- **Přílohy** - fotografie a dokumenty
- **Kontaktování dodavatele** - možnost kontaktovat dodavatele přímo

## Typické scénáře použití

### Scénář 1: Oprava netěsnícího kohoutku

1. **Obyvatel** (Member) nahlásí závadu "Netěsnící kohoutek v koupelně" s fotografiemi
2. **Správce** (Admin) vidí závadu, vytvoří poptávku na službu "Instalatérství"
3. **Instalatér** (Provider) dostane notifikaci, přihlásí se na poptávku
4. **Správce** vybere instalatéra z přihlášených
5. **Instalatér** navrhne termín (např. "Zítra v 10:00")
6. **Obyvatel** (zadavatel) potvrdí termín
7. **Instalatér** provede opravu
8. **Správce** označí závadu jako resolved

### Scénář 2: Revize elektro

1. **Správce** vytvoří závadu "Roční revize elektro"
2. **Správce** vytvoří poptávku na službu "Revize elektro"
3. **Elektrikář** (Provider) se přihlásí
4. **Správce** vybere elektrikáře
5. **Elektrikář** navrhne termín
6. **Správce** potvrdí termín (nevyžaduje součinnost obyvatele)
7. **Elektrikář** provede revizi
8. **Správce** označí závadu jako resolved

### Scénář 3: Nový dodavatel se registruje

1. **Instalatér** se zaregistruje jako dodavatel
2. Vyplní fakturační údaje (firma, IČO, DIČ, atd.)
3. Vybere službu "Instalatérství" z katalogu
4. Aktivuje službu pomocí voucheru (3 měsíce zdarma)
5. Od této chvíle dostává notifikace o všech poptávkách na instalatérství
6. Může se přihlásit na poptávky a získat zakázky

## Technické řešení

### Frontend
- **React Native** s **Expo** - cross-platform mobilní aplikace
- **TypeScript** - type safety
- **React Navigation** - navigace
- **Supabase Client** - komunikace s backendem

### Backend
- **Supabase** - BaaS (Backend as a Service)
  - PostgreSQL databáze
  - Row Level Security (RLS)
  - Realtime subscriptions
  - Edge Functions
  - Storage (pro přílohy)

### Autentizace
- **Supabase Auth** - email/password a Google OAuth

### Notifikace
- **Supabase Realtime** - real-time aktualizace
- **Expo Notifications** - push notifikace (volitelné)

## Hlavní výhody řešení

### Pro vlastníky/správce
- ✅ Centralizovaná správa závad
- ✅ Transparentní workflow
- ✅ Snadné propojení s dodavateli
- ✅ Sledování průběhu oprav
- ✅ Historie závad a oprav

### Pro obyvatele
- ✅ Snadné hlášení závad
- ✅ Sledování stavu oprav
- ✅ Komunikace se správcem
- ✅ Možnost potvrdit termíny (když je potřeba)

### Pro dodavatele
- ✅ Přístup k poptávkám na své služby
- ✅ Snadné přihlášení na zakázky
- ✅ Komunikace se správci
- ✅ Správa termínů
- ✅ Přehled vysoutěžených zakázek

## Budoucí rozšíření (možné)

- Platební systém pro platby dodavatelům
- Hodnocení dodavatelů
- Statistiky a reporty
- Export dat
- Integrace s externími systémy
- Multi-jazyčnost (aktuálně jen čeština)
- Webová verze
- API pro externí integrace

## Závěr

Aplikace **Správce Nemovitostí** je komplexní řešení pro správu nemovitostí a závad, které propojuje vlastníky, správce, obyvatele a dodavatele služeb v jednom transparentním systému. Umožňuje efektivní komunikaci, koordinaci a sledování celého procesu od hlášení závady po dokončení opravy.


