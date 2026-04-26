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

---

## 1. Macro nutrients (P/C/G)

### 1.1 Schema DB

```sql
ALTER TABLE foods ADD COLUMN protein_per_100g REAL;
ALTER TABLE foods ADD COLUMN carbs_per_100g   REAL;
ALTER TABLE foods ADD COLUMN fat_per_100g     REAL;

ALTER TABLE meals ADD COLUMN protein_total REAL;
ALTER TABLE meals ADD COLUMN carbs_total   REAL;
ALTER TABLE meals ADD COLUMN fat_total     REAL;
```

Tutti nullable. Inseriti in `migrate()` di `src/database/db.ts` come secondo
blocco try/catch dopo le ALTER `serving_label`/`serving_qty` esistenti
(linee ~95-102 del file dopo l'ultima feature). Pattern già consolidato:

```ts
for (const sql of [
  `ALTER TABLE foods ADD COLUMN protein_per_100g REAL`,
  `ALTER TABLE foods ADD COLUMN carbs_per_100g REAL`,
  `ALTER TABLE foods ADD COLUMN fat_per_100g REAL`,
  `ALTER TABLE meals ADD COLUMN protein_total REAL`,
  `ALTER TABLE meals ADD COLUMN carbs_total REAL`,
  `ALTER TABLE meals ADD COLUMN fat_total REAL`,
]) {
  try { await db.execAsync(sql); } catch { /* colonna già presente */ }
}
```

I CREATE TABLE iniziali su nuovo install vanno aggiornati per includere
le nuove colonne (così i DB nuovi non passano per ALTER).

`resetDatabase()` non richiede modifiche (già DROP TABLE sulle tabelle).

### 1.2 DB layer TypeScript

**`src/database/foodsDB.ts`** (`Food`, `NewFood`, `COLUMNS`, `createFood`,
`updateFood`):

```ts
export type Food = {
  id: number;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  source: FoodSource;
  createdAt: string;
};

export type NewFood = {
  name: string;
  caloriesPer100g: number;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  source: FoodSource;
};

const COLUMNS = `
  id,
  name,
  calories_per_100g AS caloriesPer100g,
  protein_per_100g AS proteinPer100g,
  carbs_per_100g AS carbsPer100g,
  fat_per_100g AS fatPer100g,
  source,
  created_at AS createdAt
`;
```

`createFood` deve persistere i 3 nuovi campi (con `?? null`).
`updateFood` deve gestire i 3 nuovi campi nel patch.

**`src/database/mealsDB.ts`** (`Meal`, `NewMeal`, `COLUMNS`, `createMeal`,
`updateMeal`):

Stesso pattern: `proteinTotal`, `carbsTotal`, `fatTotal` opzionali sulle
input, propagati su INSERT/UPDATE. Aggiungi anche aggregati:

```ts
export async function sumMacrosByDate(date: string): Promise<{
  protein: number;
  carbs: number;
  fat: number;
}> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }>(
    `SELECT
       COALESCE(SUM(protein_total), 0) AS protein,
       COALESCE(SUM(carbs_total), 0)   AS carbs,
       COALESCE(SUM(fat_total), 0)     AS fat
     FROM meals WHERE date = ?`,
    date,
  );
  return {
    protein: row?.protein ?? 0,
    carbs: row?.carbs ?? 0,
    fat: row?.fat ?? 0,
  };
}
```

**`src/database/favoritesDB.ts`**: estendere `FavoriteItem` (JSON, no DDL):

```ts
export type FavoriteItem = {
  foodId: number | null;
  foodName: string;
  grams: number;
  calories: number;
  servingLabel?: string | null;
  servingQty?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};
```

### 1.3 Capture macro lungo i flussi

**Open Food Facts** (`src/utils/openFoodFacts.ts:88-96`):
i campi `proteinPer100g`, `carbsPer100g`, `fatPer100g` sono **già
normalizzati** in `OffProduct`. Manca solo passarli ai caller. Nessun cambio
in questo file.

**`src/components/AddFoodSheet.tsx` `commitMeal`** (~`linea 66`):

Estendere `args` con `proteinPer100g`/`carbsPer100g`/`fatPer100g` (per `foodsDB.createFood`)
e calcolare lo snapshot per il meal: `proteinTotal = protein_per_100g * grams / 100`
(idem carbs, fat). Persistere via `mealsStore.createMeal({ …, proteinTotal, carbsTotal, fatTotal })`.

Helper consigliato in `src/utils/calorieCalculator.ts`:

```ts
export function scaleMacro(per100g: number | null, grams: number): number | null {
  if (per100g === null) return null;
  return Math.round((per100g * grams) / 10) / 10; // 1 decimale
}
```

**`SearchTab` / `BarcodeTab`**: passare `selected.product.proteinPer100g`
ecc. a `onCommit`. Per i food locali (già in DB), leggere dal `Food` (i
campi nuovi sono nullable).

**`ManualTab`**: aggiungere 3 input opzionali (P/C/G per 100 g) sotto al
campo calorie. Non required. Se vuoti → `null`. Etichette: "Proteine
(opzionale)", "Carboidrati (opzionale)", "Grassi (opzionale)" con suffix
`g`. Validazione `parsePositive` come per le altre quantità.

**`FavoritesScreen.handleAddFood`**: arricchire l'item con macro snapshot
calcolate dai grammi e dal `pendingFood` (che è un `Food` con campi macro
opzionali ora disponibili).

**`HomeScreen.handleAddFavorite`** + **`handleAddAddon`**: propagare le
macro dell'item ai `NewMealInput`. Per `handleAddAddon` le macro sono
`null` (gli add-on sono costo fisso solo calorie).

### 1.4 Helper target macro

Nuovo file `src/utils/macroTargets.ts`:

```ts
// Split di default ispirato a piani bilanciati di mantenimento/cut.
// Non è un hard constraint: serve come riferimento visivo nelle barre.
export const MACRO_SPLIT = {
  protein: 0.30,
  carbs:   0.45,
  fat:     0.25,
} as const;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export type MacroTargets = {
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function computeMacroTargets(targetKcal: number): MacroTargets {
  return {
    proteinG: Math.round((targetKcal * MACRO_SPLIT.protein) / KCAL_PER_G.protein),
    carbsG:   Math.round((targetKcal * MACRO_SPLIT.carbs)   / KCAL_PER_G.carbs),
    fatG:     Math.round((targetKcal * MACRO_SPLIT.fat)     / KCAL_PER_G.fat),
  };
}
```

### 1.5 UI HomeSummaryCard

Sotto il `CalorieRing`, una sezione "Macro" con 3 mini-row, ciascuna:

```
Proteine    45 / 130 g    [█████░░░░░░░░░░░░]
Carboidrati 180 / 245 g   [█████████████░░░░]
Grassi      35 / 65 g     [████████░░░░░░░░░]
```

- Layout a colonna; ciascuna row è `flexDirection: row` con label, valori,
  bar.
- Bar = `View` con sfondo `colors.bg` + child `View` colorato (proteine
  `colors.purple`, carb `colors.blue`, grassi `colors.green` — già nel
  theme).
- Width della child = `(consumed / target) * 100%` cap a 100.
- Se `consumed === 0` per tutti i tre macro **e nessun pasto ha macro
  registrate**: mostra solo testo discreto "I macro compaiono qui quando
  registri alimenti con dati nutrizionali" — niente barre vuote.

`HomeScreen` deve passare alla card sia `consumedMacros` (somma da
`useDailyLog`) sia `targetMacros` (calcolato con `computeMacroTargets(target)`).

### 1.6 useDailyLog

Estendere il return value con `macros: { protein, carbs, fat }` aggregato.
Aggiornare quando si aggiungono/eliminano pasti (lo store già notifica i
cambiamenti). Implementazione: stesso pattern di `totalCalories`, somma
sui meal `proteinTotal`/`carbsTotal`/`fatTotal` con fallback 0 sui null.

### 1.7 EditMealModal

Mostrare riga macro **read-only** sotto il campo quantità quando
`meal.proteinTotal !== null` (o uno dei tre):

```
Macro: 12 g P · 28 g C · 6 g G
```

Quando l'utente modifica i grammi/porzione e i `proteinTotal` ecc. erano
presenti, ricalcolarli proporzionalmente:

```ts
const ratio = newGrams / meal.grams;
const newProtein = meal.proteinTotal !== null
  ? Math.round(meal.proteinTotal * ratio * 10) / 10
  : null;
```

E passarli a `onSave` (estendere il prop signature). `HomeScreen.handleSaveEdit`
li propaga a `mealsStore.updateMeal`.

### 1.8 Edge case e gotcha

- **Food legacy senza macro**: tutti i pasti già nel DB hanno macro `null`.
  La barra macro mostra solo i contributi dei pasti che li hanno → progresso
  parziale. È OK, è un onboarding "soft" verso il tracking macro.
- **OFF prodotti senza macro**: scartiamo solo se `caloriesPer100g === null`
  (regola già esistente). Macro `null` invece sono OK e si propagano.
- **Manual input con macro parziali** (es. solo proteine): consentito, gli
  altri restano null. La somma giornaliera include solo i contributi non-null.
- **Target macro = 0** se `targetCalories === 0` (utente senza profilo):
  fallback a `DEFAULT_TARGET_KCAL` come già fa `HomeScreen` per le calorie.
