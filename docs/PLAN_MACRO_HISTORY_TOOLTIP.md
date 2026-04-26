# Piano — Macro nutrients · History insights · Tooltip BMR/TDEE/Target

## Contesto

Tre miglioramenti UX approvati al termine dell'audit del branch
`claude/improve-portion-sizes-HbjdY` (porzioni alternative + add-on rapidi):

1. **Macro (proteine/carboidrati/grassi)** — oggi tracciamo solo le calorie.
   Open Food Facts già espone i macro per 100 g (`proteins_100g`,
   `carbohydrates_100g`, `fat_100g`) e li normalizziamo già in
   `src/utils/openFoodFacts.ts`, ma il valore viene **scartato** prima del
   salvataggio. Aggiungere il tracking delle macro e mostrarle in Home dà
   feedback nutrizionale completo, non solo calorico.
2. **History insights** — `HistoryScreen` mostra media + giorni in target,
   ma non c'è motivazione: niente streak, niente trend settimana su settimana,
   niente "giorno migliore". I dati ci sono già, manca solo l'aggregazione.
3. **Tooltip BMR/TDEE/Target** — i tre numeri in `SettingsScreen` (e nello
   step finale dell'onboarding) sono presentati senza spiegazione: l'utente
   vede "BMR 1600 · TDEE 2000 · Target 1800" ma non sa cosa significano e
   quale "raggiungere" nel diario.

L'obiettivo è chiudere tutti e tre in modo coerente sullo stesso branch.

## Vincoli (da rispettare sempre)

- **Design system non negoziabile** — usare solo `colors`, `spacing`, `radii`,
  `shadows`, `typography`, `mealPalette` da `@/theme`. Niente hex inline,
  niente librerie UI esterne. Vedi `CLAUDE.md` §1.
- **Italiano** in tutti i testi UI.
- **Alias `@/`** per gli import (`@/components`, `@/database`, `@/hooks`, …).
- **DB**: tabelle `snake_case`, TS `camelCase`, mappatura via `AS` nei SELECT.
- **Migrazioni idempotenti** — `ALTER TABLE … ADD COLUMN` dentro try/catch
  (pattern `src/database/db.ts:83-87` e `db.ts` blocco macro/serving già
  esistente). I `CREATE TABLE IF NOT EXISTS` sono OK direttamente.
- **`expo-sqlite`** API async (`openDatabaseAsync`, `execAsync`, `runAsync`,
  `getFirstAsync`, `getAllAsync`).
- **Workflow** — sviluppo a fasi commit-per-commit, `npm run typecheck`
  pulito dopo ogni fase, push finale + PR (vedi sezione Sequenza commit).

## Decisioni globali

### A. Schema macro

**Decisione**: campi `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`
nullable su `foods`; snapshot `protein_total`, `carbs_total`, `fat_total`
nullable su `meals`; campi opzionali corrispondenti in `FavoriteItem` JSON
(zero migrazione DB lato preferiti).

**Motivazione**:
- Nullable perché molti food (manuale veloce, OFF senza dati nutrizionali)
  non hanno macro disponibili. Mostrare "—" è meglio che inventare zeri.
- Snapshot su `meals` per coerenza con `calories_total` (già denormalizzato):
  i totali storici non devono dipendere dal valore corrente del food, che
  l'utente potrebbe modificare.
- `FavoriteItem` esteso in JSON (no migrazione DB) come abbiamo fatto per
  `servingLabel`/`servingQty`.

### B. Target macro

**Decisione**: split fisso suggerito 30 % proteine / 45 % carb / 25 % grassi
sulle calorie target (`user_profile.target_calories`). Niente UI di
configurazione in MVP (nessuna scelta di ratio personalizzato).

**Motivazione**:
- Il profilo utente non ha macro target espliciti e non vogliamo aggiungere
  un altro step di onboarding.
- Lo split è una "guida indicativa" coerente con app analoghe (cuts
  bilanciati). L'utente vede la barra macro e la usa come riferimento, non
  come constraint hard.
- Se in futuro vorrà personalizzare, basta aggiungere 3 campi in
  `user_profile` e parametrizzare la formula.
- Conversione kcal → g: proteine ×4 kcal/g, carb ×4 kcal/g, grassi ×9 kcal/g
  (standard Atwater).

### C. History insights

**Decisione**: aggregazione client-side dentro `useHistory` (o nuovo
`useHistoryInsights`), niente nuove tabelle DB. Calcoli su `mealsDB.listMealsByDateRange`.

**Motivazione**:
- I dati sono già tutti in `meals`. Non serve persistere derivati.
- Range tipico: ultimi 30 giorni (già fetchati da History).
- Performance: 30 giorni × ~10 meal = 300 record max, calcoli aritmetici
  banali in memoria.

### D. Tooltip

**Decisione**: nuovo primitive `<InfoTooltip text="…" />` riutilizzabile,
basato su un `Modal` semitrasparente con click-outside-to-close (non un
popover ancorato — RN non ha popover nativi e non vogliamo dipendenze).

**Motivazione**:
- Pattern semplice, accessibile (focus + dismiss), coerente con
  `GramsInputModal` e altri sheet già usati.
- Riutilizzabile su Settings (ResultsCard) e Onboarding (ResultStep).
- Niente librerie esterne (vincolo CLAUDE.md).

## File principali coinvolti

| Area | File | Modifica |
|------|------|----------|
| Schema | `src/database/db.ts` | ALTER TABLE foods + meals con campi macro |
| Type | `src/database/foodsDB.ts` | `Food`/`NewFood` + `proteinPer100g` ecc. + COLUMNS, createFood, updateFood |
| Type | `src/database/mealsDB.ts` | `Meal`/`NewMeal` + `proteinTotal` ecc. + COLUMNS, createMeal, updateMeal |
| Type | `src/database/favoritesDB.ts` | `FavoriteItem` esteso (campi opzionali JSON) |
| OFF | `src/utils/openFoodFacts.ts` | Già normalizza P/C/G, basta esporli (sono già nel type `OffProduct`, ma non usati) |
| Aggiunta cibo | `src/components/AddFoodSheet.tsx` | `commitMeal` propaga macro; ManualTab 3 input opzionali; SearchTab/BarcodeTab passano macro da OFF |
| Aggiunta cibo | `src/screens/FavoritesScreen.tsx` | `handleAddFood` salva macro nello item |
| Display Home | `src/components/HomeSummaryCard.tsx` | 3 mini-bar macro sotto al CalorieRing |
| Display Home | `src/screens/HomeScreen.tsx` | Pass macro consumati al HomeSummaryCard |
| Hook | `src/hooks/useDailyLog.ts` | Aggrega `proteinTotal`/`carbsTotal`/`fatTotal` accanto a `totalCalories` |
| Edit | `src/components/EditMealModal.tsx` | Mostra macro snapshot (read-only) per i pasti che li hanno; ricalcolo proporzionale ai grammi quando l'utente cambia quantità |
| Insight | `src/screens/HistoryScreen.tsx` | 3 card insight sotto al chart |
| Insight | `src/hooks/useHistory.ts` | Calcoli streak/trend/best |
| Tooltip | `src/components/InfoTooltip.tsx` (NUOVO) | Componente riutilizzabile |
| Tooltip | `src/screens/SettingsScreen.tsx` | Icon info accanto alle 3 label di ResultsCard |
| Tooltip | `src/screens/OnboardingScreen.tsx` (o ResultStep specifico) | Stesso pattern |
| Util | `src/utils/macroTargets.ts` (NUOVO) | Helper `computeMacroTargets(targetKcal)` con split 30/45/25 |
