# Contract Document Stijlgids — Vastgelegd 10-03-2026

## Lettertype
- Overal: `'Carlito', 'Calibri', 'Segoe UI', Arial, sans-serif`
- Geen mixtures van lettertypen

## Kleuren
| Element               | Kleur      | Omschrijving              |
|-----------------------|------------|---------------------------|
| Hoofdtekst            | `#2c3b4e`  | Donkerblauwgrijs          |
| Sectieletter (A, B…)  | `#5a7a96`  | Gedempte staalblauwtint   |
| Veldwaarden (vetgedrukt) | `#2c3b4e` | Zelfde als tekst, alleen vet |
| Label tekst           | `#4a5568`  | Iets lichter grijs        |
| Subtitel/datum tekst  | `#6b7a8d`  | Gedempte subtekst         |
| Tabelkop achtergrond  | `#e8ecf0`  | Lichtgrijs                |
| Tabelkop border       | `#9aaab8`  | Gedempte grijsblauw       |
| Tabelcel border       | `#c8d2da`  | Licht grijs               |
| Tabelcel rechts border| `#dde3e8`  | Iets lichter              |
| Sectietitel border    | `#b8c4ce`  | Grijsblauw                |
| Geselecteerde dropdown | `#eef2f7` | Licht blauwgrijs          |

## Verboden kleuren in het document
- ❌ Oranje `#C8700A` (was: veldwaarden, sectieletter-accent)
- ❌ Blauw `#3b82f6` (was: onderaannemer handtekeningblok)
- ❌ Groen `#22c55e`, `#f0fdf4`, `#86efac`, `#166534`, `#bbf7d0`
- ❌ Zebra-achtergronden op tabelrijen

## Handtekening blokken
- **Beide blokken identiek**: border `1px solid #d4dbe3`, borderRadius `4px`
- Label: `#5a7a96`, uppercase, letterSpacing `0.06em`, 0.56rem
- Handtekeninglijn: `1px solid #2c3b4e`
- Veldnaam: `0.58rem`, fontWeight 600, kleur `#2c3b4e`
- Datum: `0.54rem`, kleur `#6b7a8d`

## Termijnoverzicht
- **Geen "Na uren" kolom** (DBA-compliance)
- Geen groene achtergrond
- Totaalrij: `background: #e8ecf0`, border-top `2px solid #9aaab8`
- Header: `background: #e8ecf0`, border `#b8c4ce`, UPPERCASE, 0.67rem

## Snapshot bestanden
- `contract_page.js` — `/contract/[id]/page.js`
- `whatsapp_page.js` — `/whatsapp/page.js`
