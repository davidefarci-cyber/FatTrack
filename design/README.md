# Design handoff FatTrack

Questa cartella contiene il design originale ricevuto come pacchetto
(`FatTrack-handoff.zip`). È la **fonte di verità visiva** dell'app e ha
priorità su qualsiasi prompt futuro che introduca nuove UI.

> Se stai leggendo questo file da una nuova sessione: apri sempre prima
> `../CLAUDE.md` — questo documento completa quelle istruzioni sul lato
> puramente visivo.

---

## Contenuto

```
design/
├── FatTrack-handoff.zip                  # pacchetto originale immutato
└── fattrack/project/
    ├── FatTrack.html                     # mockup navigabile (apri nel browser)
    ├── fattrack-ui.jsx                   # oggetto FT con token di design
    └── fattrack-screens.jsx              # mockup per-screen
```

`FatTrack.html` è il riferimento interattivo. Se un prompt futuro descrive
una schermata in modo ambiguo, aprire quel file è il modo più veloce per
capire cosa intende il design.

---

## Mappatura design → codice

Ogni token dell'oggetto `FT` (in `fattrack-ui.jsx`) è già mappato nel theme
del progetto:

| Design (FT) | Codice (`src/theme/index.ts`) |
| --- | --- |
| `FT.color.*` | `colors` |
| `FT.meal.*` | `mealPalette` |
| `FT.shadow.*` | `shadows.sm` / `shadows.md` |
| `FT.radius.*` | `radii` |
| `FT.space.*` | `spacing` |
| `FT.font.*` (Plus Jakarta Sans) | `fontFamily` + `typography` |

Le scale numeriche rispettano le proporzioni del design (es. `spacing.screen`
= 20 per i padding di schermata, `radii.xxl` = 16 per le card).

---

## Componenti già pronti

Mappano i blocchi ricorrenti del mockup. Non ricrearne versioni alternative:

| Blocco nel mockup | Componente |
| --- | --- |
| Card bianca con shadow soft | `Card` |
| Testo di intestazione pagina | `ScreenHeader` |
| Input di form con label + unit | `Input` |
| Anello calorico centrale | `CalorieRing` |
| Icone di sistema (home, star, barcode, chart, cog, ecc.) | `Icon` |
| Tab bar con FAB centrale | `BottomTabBar` |

Se il design mostra un blocco nuovo (es. una riga "meal item", uno stepper,
una progress bar settimanale), **crea un nuovo componente in
`src/components/`** usando i token — non stilare inline nello schermo.

---

## Navigazione (dal design)

Ordine fisso dei tab, dal design:

```
Scansiona · Preferiti · Home (FAB centrale) · Storico · Impostazioni
```

- `Home` è il tab iniziale.
- `Home` ha un FAB grande centrato con offset verticale (`marginTop: -14`)
  che "esce" dalla tab bar — NON modificare questa scelta senza aggiornare
  anche il design.
- Tint attivo: `colors.green`. Tint inattivo: `colors.textSec`.

---

## Tipografia

Font unico: **Plus Jakarta Sans** (`@expo-google-fonts/plus-jakarta-sans`).
Caricato in `src/hooks/useFonts.ts` con splash gating — nessuna UI viene
renderizzata prima del caricamento per evitare flash con il font di sistema.

Gerarchia (da `typography`):

- `h1` — titolo schermata (ScreenHeader)
- `display` — numero grande del CalorieRing, valori onboarding
- `value` — numeri evidenziati nelle card
- `body` / `bodyRegular` / `bodyBold` — testo corrente
- `caption` — metadata/secondario
- `label` — piccole label UPPERCASE (sezioni, "RIMANENTI")
- `micro` — testo tab bar, metadata minuscola

---

## Per prompt futuri — checklist rapida

Prima di scrivere codice UI:

- [ ] Ho letto `../CLAUDE.md` e questo file
- [ ] Ho identificato quale schermata del mockup sto implementando
- [ ] Uso solo token da `@/theme` (no hex colors, no pixel magici)
- [ ] Uso i primitives esistenti (`Card`, `Input`, `ScreenHeader`, ecc.) prima di reinventare
- [ ] Il nuovo codice rimane coerente con l'ordine e il comportamento dei tab
- [ ] I testi UI sono in italiano
