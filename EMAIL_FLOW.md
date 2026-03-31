# Email Flow — De Schilders App

Overzicht van hoe emails binnenkomen, worden opgeslagen, gesynchroniseerd en weergegeven in het project-dossier.

---

## Architectuur

```
Outlook (Microsoft 365)
    ↕ Microsoft Graph API (OAuth2, token in cookie ms_access_token)
Next.js API Routes (/api/outlook/*)
    ↕
React frontend (projecten/[id]/page.js)
    ↕
localStorage (schildersapp_projecten)
```

**Opslag:** Alles staat in `localStorage` onder de sleutel `schildersapp_projecten`. Elke project heeft een `emails[]` array. Er is geen database-backend voor emails.

---

## Email object structuur

```js
{
  id: "lokaal-uniek-id",           // Date.now() + Math.random() — gegenereerd bij opslaan
  outlookId: "AAMkAD...",          // Microsoft Graph message ID — unieke sleutel voor deduplicatie
  direction: "in" | "out",         // Richting: ontvangen of verzonden
  status: "open" | "verzonden" | "afgehandeld",
  subject: "Re: Offerte ...",
  from: "Klant Naam <klant@email.nl>",   // "Naam <adres>" formaat
  to: "Andre <andre@deschilders.nl>",    // Ontvanger(s)
  body: "Platte tekst (fallback)",
  bodyHtml: "<html>...</html>",    // Null als plain text email
  bodyPreview: "Korte tekst...",   // Max ~255 tekens, altijd aanwezig vanuit Graph API
  date: "2026-03-23",              // ISO datum string (alleen datum, geen tijd)
  categories: ["Groen categorie"], // Outlook categorieën
  conversationId: "AAQkAD...",     // Graph conversation ID — koppelt emails aan gesprek
  _convSearched: 0-99,             // Teller: hoe vaak gezocht naar conversationId (99 = gevonden)
}
```

---

## Hoe een email in het dossier komt

### Route A — Upload via .msg/.eml bestand
1. Gebruiker sleept of klikt .msg/.eml in de upload-zone
2. Browser leest bestand → `/api/upload` (of lokale parser)
3. Email wordt opgeslagen **zonder** `outlookId` en **zonder** `conversationId`
4. 30s sync probeert later de `conversationId` te vinden via onderwerp-zoekopdracht

### Route B — Automatische sync (elke 30 seconden)
Zie sectie "30-seconden sync loop" hieronder.

### Route C — Selecteer een email (auto-fetch)
Wanneer de gebruiker een email in de linker lijst aanklikt:
1. App zoekt de `conversationId` op als die ontbreekt (via `/api/outlook/search`)
2. App haalt alle berichten in dat gesprek op (via `/api/outlook/conversation`)
3. Nieuwe berichten worden toegevoegd via `mergeEmailsIntoProject`

---

## 30-seconden sync loop (`syncCats`)

Actief zolang het dossier-tabblad open is. Drie stappen per cyclus:

### Stap 1 — Categorieën synchroniseren
- Haalt voor alle emails met `outlookId` de huidige Outlook-vlag en categorieën op
- Endpoint: `GET /api/outlook/sync?ids=id1,id2,...`
- **Haalt GEEN bodies op** — alleen metadata

### Stap 2 — `conversationId` zoeken
- Voor emails zonder `conversationId` en `_convSearched < 5`
- Max 3 emails per cyclus
- Endpoint: `POST /api/outlook/search` met onderwerp + afzender
- Zoekmethode 1: zoeken op ASCII-woorden uit het onderwerp (`$search`)
- Zoekmethode 2: filteren op afzender-email + onderwerp-score
- Bij succes: `conversationId` en `outlookId` worden opgeslagen, `_convSearched: 99`
- Bij mislukking: `_convSearched` telt op; stopt na 5 pogingen

### Stap 3 — Gesprekken synchroniseren
- Voor alle emails met `conversationId`
- Endpoint: `GET /api/outlook/conversation?id=<conversationId>`
- Haalt berichten op uit **persoonlijke mailbox** (`/me/messages`)
- Optioneel ook uit **gedeelde mailbox** als `sharedMailbox` geconfigureerd is
- Nieuwe berichten worden toegevoegd via `mergeEmailsIntoProject`

---

## Direction-detectie (`bepaalDirection`)

Bepaalt of een email 'in' (ontvangen) of 'out' (verzonden) is.

```
Prioriteit:
1. Als fromEmail === myOutlookEmail (jouw inlog-email) → 'out'
2. Als fromEmail === sharedMailbox → 'out'
3. Als fromEmail ≠ origEmail EN origEmail staat in toEmails → 'out' (fallback)
4. Alles overige → 'in'
```

`myOutlookEmail` wordt opgehaald via `GET /api/outlook/status` en gecached in localStorage (`schildersapp_mijn_outlook_email`).

---

## Deduplicatie (`mergeEmailsIntoProject`)

Gebruikt `outlookId` als unieke sleutel:
- Email met zelfde `outlookId` al aanwezig → **overgeslagen** (tenzij body ontbreekt)
- Body update: als bestaande email geen `bodyHtml` heeft maar nieuwe versie wel → body wordt bijgewerkt
- Emails **zonder** `outlookId` (lokaal geüpload) worden **altijd** overgeslagen door merge

---

## Gesprekken-weergave (linker lijst)

Emails worden gegroepeerd tot "gesprekken":

```
Groepeer-logica:
1. Zelfde conversationId → zelfde gesprek
2. ANDERS: zelfde onderwerp (na stripping van Re:/Antw:/Fwd: etc.) → zelfde gesprek
```

Per gesprek wordt getoond:
- Onderwerp van het laatste bericht
- Afzender van het laatste bericht
- Datum van het laatste bericht
- Badge met aantal berichten
- ↩ symbool als er een verzonden email in het gesprek zit

---

## Leesvenster (rechter paneel)

Bij selecteren van een gesprek: alle emails chronologisch weergegeven als kaarten.

**Ontvangen email** → witte kaart, blauw enveloppe-icoon
**Verzonden email** → groene kaart, vliegtuig-icoon

### Body-rendering prioriteit:
1. `e.bodyHtml` → iframe (CSS-geïsoleerd)
2. `emailBodyCache[e.outlookId].bodyHtml` → iframe (lazy-geladen)
3. `e.body` of `e.bodyPreview` → `<pre>` tekst
4. `emailBodyCache[e.outlookId].bodyText` → `<pre>` tekst
5. Anders → "Laden…"

### Lazy-fetch (body on demand):
Wanneer een email `outlookId` heeft maar geen body → automatisch ophalen via:
`GET /api/outlook/body?id=<outlookId>`

**Let op:** De lazy-fetched body wordt bewaard in `emailBodyCache` (in-memory React state). Na een page refresh is de cache weg en wordt de body opnieuw geladen.

---

## API Routes overzicht

| Route | Methode | Doel |
|-------|---------|------|
| `/api/outlook/auth` | GET | OAuth login + token opslaan in cookie |
| `/api/outlook/status` | GET | Check verbinding + eigen emailadres ophalen |
| `/api/outlook/categories` | GET | Alle Outlook-categorieën + kleuren |
| `/api/outlook/conversation` | GET | Alle berichten in een gesprek (inbox + sent) |
| `/api/outlook/search` | POST | Zoek email op onderwerp/afzender → conversationId |
| `/api/outlook/body` | GET | Volledige HTML body van één email |
| `/api/outlook/sync` | GET/POST | Categorieën/vlaggen lezen of bijwerken |
| `/api/outlook/open-msg` | POST | Open .msg bestand in Outlook |
| `/api/outlook/extract-taken` | POST | AI taakherkenning uit email-inhoud |

---

## Bekende beperkingen en bugs

### 🔴 Verzonden emails verschijnen niet altijd

**Probleem:** De manual sync-knop (↻) gebruikt een kapotte direction-detectie (regex i.p.v. `bepaalDirection`). Hierdoor worden verzonden emails als ontvangen gemarkeerd.

**Workaround:** De 30s automatische sync gebruikt wel `bepaalDirection` en werkt correct.

### 🔴 "(geen inhoud)" na page refresh

**Probleem:** De `emailBodyCache` overleeft geen page refresh. Bodies opgehaald via lazy-fetch gaan verloren.

**Workaround:** Klik opnieuw op het gesprek — de body wordt opnieuw opgehaald.

### 🔴 Lege body wordt nooit bijgewerkt als `body: ""`

**Probleem:** Als een email is opgeslagen met `body: ""` (lege string), wordt de update-conditie in `mergeEmailsIntoProject` niet getriggerd omdat `""` als "heeft inhoud" wordt gezien.

### 🟡 `conversationId` zoeken kan mislukken

Als een email als .msg is geüpload en het onderwerp heeft speciale tekens of Nederlandstalige woorden, kan de ASCII-gebaseerde zoekopdracht geen match vinden. Na 5 pogingen stopt de app met zoeken.

### 🟡 Gedeelde mailbox requires re-authenticatie

Als emails worden verstuurd vanuit een gedeelde mailbox (niet het primaire account), is `Mail.ReadWrite.Shared` OAuth permissie nodig. Dit vereist eenmalig opnieuw inloggen.

---

## Inloggegevens / configuratie

- **Tenant ID:** `cd3d3914-6711-4801-9d09-f83f5a0645d3` (vast geconfigureerd)
- **OAuth scope:** `Mail.ReadWrite Mail.ReadWrite.Shared offline_access MailboxSettings.Read Calendars.ReadWrite Contacts.Read`
- **Token opslag:** HTTP-only cookie `ms_access_token` (1 uur geldig)
- **Eigen email cache:** localStorage `schildersapp_mijn_outlook_email`
