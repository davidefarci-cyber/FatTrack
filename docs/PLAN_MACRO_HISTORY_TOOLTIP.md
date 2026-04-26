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

---

## 2. History insights

### 2.1 Definizioni

Tre insight aggregati, calcolati sui dati già fetchati da `useHistory`
(default 30 giorni). Per "essere in target" usiamo una **tolleranza ±10 %**
sul `targetCalories` corrente del profilo (configurabile come costante).

| Insight | Definizione |
|---------|-------------|
| **Streak attuale** | Numero di giorni consecutivi che terminano con OGGI in cui le calorie totali sono dentro `target ± 10 %`. Si interrompe al primo giorno fuori target. Se oggi è già fuori target → 0. |
| **Trend settimanale** | `mediaUltimi7gg − mediaSettimanaPrecedente7gg` in kcal. Positivo = in aumento, negativo = in calo. Mostrato come "−180 kcal vs settimana scorsa" oppure "+50 kcal". |
| **Giorno migliore** | Il giorno (negli ultimi 30) con la **minor distanza assoluta** dal target. Mostra "Giorno migliore: lun 14 — 10 kcal dal target". Esclude i giorni senza pasti registrati. |

### 2.2 Hook

Estendere **`src/hooks/useHistory.ts`** con un blocco `insights` calcolato
con `useMemo` sui meal già caricati. Niente nuove query DB: tutto in
memoria.

```ts
export type HistoryInsights = {
  streakDays: number;
  trendKcalDelta: number | null;       // null se non ho 14 gg di dati
  trendDirection: 'up' | 'down' | 'flat';
  bestDay: { date: string; deltaKcal: number } | null;
};

// Tolleranza per considerare un giorno "in target".
export const TARGET_TOLERANCE_RATIO = 0.10;
```

L'hook deve avere accesso al `targetCalories` corrente: leggerlo da
`useProfile()` (già usato in HomeScreen) oppure passarlo come parametro.
Preferito il primo per coerenza.

### 2.3 Algoritmi

**Aggregazione per giorno**:
```ts
function totalsByDate(meals: Meal[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of meals) {
    map.set(m.date, (map.get(m.date) ?? 0) + m.caloriesTotal);
  }
  return map;
}
```

**Streak**:
```ts
function computeStreak(totals: Map<string, number>, target: number): number {
  if (target <= 0) return 0;
  const tolerance = target * TARGET_TOLERANCE_RATIO;
  let count = 0;
  // Iterazione all'indietro da oggi.
  for (let i = 0; i < 365; i++) {
    const d = isoNDaysAgo(i);     // helper sotto
    const kcal = totals.get(d);
    if (kcal === undefined) break; // niente pasti = streak interrotta
    if (Math.abs(kcal - target) > tolerance) break;
    count += 1;
  }
  return count;
}
```

**Trend**:
```ts
function computeTrend(totals: Map<string, number>): {
  delta: number | null;
  direction: 'up' | 'down' | 'flat';
} {
  const last7  = sumRange(totals, 0, 7);
  const prev7  = sumRange(totals, 7, 14);
  if (last7.days === 0 || prev7.days === 0) {
    return { delta: null, direction: 'flat' };
  }
  const avgLast = last7.sum / last7.days;
  const avgPrev = prev7.sum / prev7.days;
  const delta = Math.round(avgLast - avgPrev);
  const direction = Math.abs(delta) < 30 ? 'flat' : delta > 0 ? 'up' : 'down';
  return { delta, direction };
}
```

`sumRange(totals, fromDayAgo, toDayAgo)` itera da N giorni fa fino a M
escluso, somma i kcal trovati e conta i giorni con valore `> 0`.

**Best day**:
```ts
function computeBestDay(totals: Map<string, number>, target: number) {
  if (target <= 0) return null;
  let best: { date: string; deltaKcal: number } | null = null;
  for (const [date, kcal] of totals) {
    if (kcal === 0) continue;
    const delta = Math.abs(kcal - target);
    if (best === null || delta < best.deltaKcal) {
      best = { date, deltaKcal: delta };
    }
  }
  return best;
}
```

Helper `isoNDaysAgo(n)` riusabile (esiste già `todayISO()` in
`src/hooks/useDailyLog.ts`, basta affiancarlo). Format date in label
italiana via `formatDateShort(date)` (es. "lun 14 apr") — usare
`Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })`.

### 2.4 UI HistoryScreen

Tre `Card` orizzontali sotto il chart e sopra le statistiche esistenti.
Layout: `ScrollView` orizzontale `horizontal` con `pagingEnabled={false}`
e `contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.screen }}`.
Ogni card è un mini-tile largo ~40% screen:

```
┌──────────────────────┐
│  STREAK              │
│  3 giorni            │
│  in target           │
└──────────────────────┘
```

Stati edge per ogni card:

| Card | Caso edge | Cosa mostrare |
|------|-----------|---------------|
| Streak | streak === 0 | "Inizia oggi: registra le calorie giornaliere" + numero "0" tenue |
| Streak | target === 0 | "Imposta un target per vedere lo streak" + link a Settings |
| Trend | delta === null | "Servono 14 giorni di dati per calcolare il trend" |
| Trend | direction === 'flat' | Icona "−" e copy "stabile" (niente segno + né −) |
| Trend | direction !== 'flat' | Icona freccia (`chevron-up`/`chevron-down`) + delta in kcal |
| Best day | bestDay === null | "Registra qualche pasto per vedere il tuo giorno migliore" |

Colori coerenti con il design system:
- Streak attivo: `colors.green` per il numero
- Trend in calo (verso il basso = bene per chi è in surplus, male per chi è
  in deficit): usare `colors.text` neutro. NON colorare moralmente (l'utente
  potrebbe stare cuttando o bulkando).
- Best day: `colors.purple` o `colors.blue` per il delta.

### 2.5 Componente

Nuovo `src/components/HistoryInsightsRow.tsx` che riceve `insights:
HistoryInsights` e li renderizza. Riutilizza `Card`, `Icon`, `typography`,
`colors`. Tre `InsightTile` interni privati (sotto-componente) — non vale
estrarre come primitive globale finché non servono altrove.

### 2.6 Integrazione

`src/screens/HistoryScreen.tsx`: import del nuovo componente, render
sotto al chart. Niente cambi di struttura ScrollView esistente.

### 2.7 Edge case

- **Profilo non configurato** (`targetCalories === undefined`): le 3 card
  mostrano stato edge con CTA "Imposta un target in Impostazioni".
- **Meno di 7 giorni di storico**: streak può essere comunque > 0; trend
  resta `null`; best day fra i giorni disponibili.
- **Pasti su giorni futuri**: `useHistory` filtra già `<= today`. Niente da
  fare.

---

## 3. Tooltip BMR / TDEE / Target

### 3.1 Componente `InfoTooltip`

Nuovo file `src/components/InfoTooltip.tsx`. Pattern: trigger `Pressable`
con icona "info", al tap apre un piccolo `Modal` semitrasparente con il
testo esplicativo e `Pressable` di backdrop per chiudere.

API:

```ts
type InfoTooltipProps = {
  title: string;            // es. "BMR"
  body: string;             // 1-3 frasi di spiegazione
  iconColor?: string;       // default colors.textSec
  accessibilityLabel?: string; // default `Informazioni su ${title}`
};

export function InfoTooltip({ title, body, iconColor, accessibilityLabel }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Informazioni su ${title}`}
        style={styles.trigger}
      >
        <Icon name="info" size={14} color={iconColor ?? colors.textSec} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.card, shadows.md]}>
          <Text style={typography.label}>{title}</Text>
          <Text style={typography.body}>{body}</Text>
          <Button label="OK" variant="secondary" onPress={() => setVisible(false)} />
        </View>
      </Modal>
    </>
  );
}
```

Styles:
- `trigger`: cerchio piccolo (24×24), `borderRadius: radii.round`, sfondo
  `colors.bg`.
- `backdrop`: `StyleSheet.absoluteFillObject`, `backgroundColor: colors.overlay`.
- `card`: centrata via `position: absolute` + transform OPPURE wrappata in
  `View` con `flex: 1, alignItems: center, justifyContent: center` (più
  semplice, evita math sulle dimensioni). `padding: spacing.screen`,
  `borderRadius: radii.xxl`, `gap: spacing.lg`, max width 320.

### 3.2 Icona `info`

`src/components/Icon.tsx` ha già una palette di icone SVG. **Verificare**
se `info` esiste — se no, aggiungerla. Pattern già consolidato (i `Path`
sono inline SVG). Forma standard: cerchio con "i" minuscola al centro.

### 3.3 Testi statici

In italiano, breve. Centralizzati in una costante esportata dal componente
o in un piccolo file `src/utils/profileExplainers.ts` per riusarli sia in
Settings sia in Onboarding:

```ts
export const PROFILE_EXPLAINERS = {
  bmr: {
    title: 'BMR — Metabolismo basale',
    body: 'Le calorie che il tuo corpo brucia a riposo per mantenere le funzioni vitali (respirazione, circolazione). Calcolato dalla formula di Mifflin-St Jeor sulla base di peso, altezza, età e sesso.',
  },
  tdee: {
    title: 'TDEE — Fabbisogno totale',
    body: 'Le calorie totali che bruci in una giornata, includendo il livello di attività fisica indicato. È il valore di mantenimento: mangiando questa quantità il peso resta stabile.',
  },
  target: {
    title: 'Target calorie',
    body: 'L\'obiettivo giornaliero che vedi nel diario. Calcolato dal TDEE applicando il deficit (per dimagrire) o il surplus (per aumentare di peso) corrispondente al tuo obiettivo settimanale.',
  },
} as const;
```

### 3.4 Integrazione `SettingsScreen`

In `src/screens/SettingsScreen.tsx` la `ResultsCard` ha 3 righe (BMR,
TDEE, Calorie target). Modificare la label di ognuna per affiancare il
componente:

```tsx
<View style={styles.labelRow}>
  <Text style={typography.caption}>BMR</Text>
  <InfoTooltip {...PROFILE_EXPLAINERS.bmr} />
</View>
```

`labelRow` è un `flexDirection: 'row', alignItems: 'center', gap: spacing.xs`.

Stessa cosa per TDEE e Target.

### 3.5 Integrazione Onboarding

L'ultimo step dell'onboarding (`src/screens/OnboardingScreen.tsx`,
verificare il file esatto: probabilmente `OnboardingResultStep` o un
componente interno) mostra gli stessi 3 numeri. Stesso pattern: label +
InfoTooltip.

### 3.6 Edge case

- **Modal dentro a Modal**: Settings non è dentro a un modal. Onboarding
  potrebbe esserlo (verificare). Se lo è, RN supporta nested `Modal`
  correttamente; backdrop ha `pointerEvents: auto` per intercettare il tap
  outside.
- **Accessibilità**: focus management automatico via `Modal` di RN.
  `accessibilityRole="button"` sul trigger, `accessibilityLabel` esplicito.
- **Long body**: testo `numberOfLines` non impostato → wrap libero. Card
  cresce in altezza.
