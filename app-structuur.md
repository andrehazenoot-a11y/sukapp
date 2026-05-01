# SukApp — App Structuur

## Pagina's & Navigatie

```mermaid
graph TD
    LOGIN[🔐 Login\n/] --> ADMIN[🖥️ Admin\n/projecten]
    LOGIN --> MW[📱 Medewerker Portaal\n/medewerker]

    ADMIN --> P_OVERZICHT[Projecten overzicht]
    ADMIN --> P_DETAIL[Project detail\n/projecten/id]
    P_DETAIL --> TAB_KAART[Kaart]
    P_DETAIL --> TAB_TAKEN[Taken]
    P_DETAIL --> TAB_NOTITIES[Notities]
    P_DETAIL --> TAB_DOCS[Documenten]
    P_DETAIL --> TAB_TEAMS[Teams]
    P_DETAIL --> TAB_PLANNER[Planner]
    P_DETAIL --> TAB_FINANCIEN[Financiën]

    MW --> NAV_VANDAAG[🏠 Vandaag\n/medewerker]
    MW --> NAV_PLANNING[📅 Planning\n/medewerker/planning]
    MW --> NAV_CHAT[💬 Chat\n/medewerker/chat]
    MW --> NAV_MATERIAAL[📦 Materiaal\n/medewerker/materiaal]
    MW --> NAV_MIJN[👤 Mijn Suk\n/medewerker/mijn-suk]
    MW --> NAV_MEER[☰ Meer]
    NAV_MEER --> NAV_WERKBON[Project Info\n/medewerker/werkbon]
    NAV_MEER --> NAV_FORMULIEREN[Formulieren\n/medewerker/formulieren]
```

## Data Flow

```mermaid
graph LR
    LS[(localStorage)] <--> MW_PAGES[Medewerker\nPagina's]
    DB[(MySQL\nDatabase)] <--> API[API Routes\n/api/*]
    API <--> MW_PAGES
    API <--> ADMIN_PAGES[Admin\nPagina's]
    NAS[(Synology NAS\nBestanden)] <--> UPLOAD[/api/upload]
    UPLOAD <--> MW_PAGES
    MS[(Microsoft\nGraph API)] <--> TEAMS_API[/api/teams/*]
    TEAMS_API <--> ADMIN_PAGES
```

## Herbruikbare Componenten

```mermaid
graph TD
    subgraph Componenten
        AUTH[AuthContext\nLogin + gebruiker]
        NAV[Bottom Nav\n6 tabs]
        HEADER[Header\nOranje gradient]
        CHAT_COMP[Chat Component\nNotities + Media + Replies]
        MEDIA_COMP[Media Grid\nFoto upload + viewer]
        NOTE_COMP[Notities\n5 types + bijlagen]
        PROJ_PICK[Project Picker\nDropdown switcher]
    end

    subgraph API
        NOTES[/api/notes\nCRUD notities]
        UPLOAD[/api/upload\nNAS bestanden]
        PROJECTEN[/api/projecten\nCRUD projecten]
        DOCS[/api/documenten\nPDF viewer]
    end

    CHAT_COMP --> NOTES
    CHAT_COMP --> UPLOAD
    MEDIA_COMP --> UPLOAD
    NOTE_COMP --> NOTES
    PROJ_PICK --> PROJECTEN
```

## Gebruikersrollen

```mermaid
graph TD
    BEHEERDER[👑 Beheerder\nVolledige toegang]
    VOORMAN[🔨 Voorman\nProjecten + team]
    SCHILDER[🖌️ Schilder\nEigen taken]
    ZZP[🧾 ZZP-er\nEigen taken + uren]

    BEHEERDER --> ADMIN_ACCESS[Admin portaal\nAlles verwijderen\nGebruikers beheren]
    VOORMAN --> MW_ACCESS[Medewerker portaal\nAlle projecten zien]
    SCHILDER --> MW_ACCESS
    ZZP --> MW_ACCESS
```

## Nieuwe App Bouwen — Stappenplan

```mermaid
graph LR
    S1[1. Login\n+ AuthContext] --> S2[2. Navigatie\n+ Layout]
    S2 --> S3[3. Project\nstructuur]
    S3 --> S4[4. Chat\n+ Notities]
    S4 --> S5[5. Media\n+ Upload]
    S5 --> S6[6. Koppelen\nAPI's]
```

## Welke bestanden hergebruiken?

| Component | Bestand | Afhankelijkheden |
|-----------|---------|-----------------|
| Login + Auth | `src/components/AuthContext.jsx` | localStorage |
| Bottom nav | `src/app/medewerker/layout.js` | AuthContext |
| Chat pagina | `src/app/medewerker/chat/page.js` | /api/notes, /api/upload |
| Project info | `src/app/medewerker/werkbon/page.js` | /api/projecten |
| Planning | `src/app/medewerker/planning/page.js` | localStorage |
| Vandaag | `src/app/medewerker/page.js` | /api/projecten |
| Notes API | `src/app/api/notes/route.js` | MySQL |
| Upload API | `src/app/api/upload/route.js` | Synology NAS |
| Projecten API | `src/app/api/projecten/route.js` | JSON bestand |
