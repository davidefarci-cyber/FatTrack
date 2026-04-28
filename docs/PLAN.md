# Piano modifiche FatTrack

> Branch: `claude/fix-back-button-navigation-5GmCa`
> Stato: in corso (fase 1 scritta, 2 e 3 da scrivere)

## Contesto

Il piano nasce da una sessione di lavoro che ha esposto:

1. **OTA non funzionante** — la voce 5 di `fattrack.bat` (`eas update --branch production`)
   pubblica correttamente il bundle JS sulla CDN di EAS, ma l'APK installato non
   lo scarica mai. Cause: il `channel` non viene scritto nel manifest Android
   perché la build è locale via `expo prebuild` + Gradle (non `eas build`); in
   più `runtimeVersion.policy: "appVersion"` lega ogni bundle a una specifica
   `app.json:version`, quindi anche se il channel fosse OK l'OTA non
   attraverserebbe i version bump.
2. **Bug visibili in `FavoritesScreen`** — il placeholder del campo "Nome"
   nell'editor preferiti mostra il letterale `ì` invece di `ì`; e la ricerca
   OpenFoodFacts che funziona in `AddFoodSheet` non è stata cablata
   nell'editor preferiti, quindi non torna nulla e non c'è il tasto "Riprova".
3. **Riorganizzazione UI richiesta dall'utente**:
   - spostare le impostazioni dalla 5ª voce della tab bar a un'icona ingranaggio
     in alto a destra di Home;
   - sostituire lo slot lasciato libero con una nuova schermata di **ricerca
     cibo read-only** (DB + OFF, senza pulsante "Aggiungi a pasto");
   - togliere dalla schermata Preferiti il pulsante "Aggiungi a pasto" e il
     selettore del pasto in alto, lasciandola come puro editor di preferiti;
   - aumentare del 15% l'altezza dei bottom-sheet "a salita".

L'obiettivo è un piano in 3 fasi indipendenti: ognuna è un set di modifiche
self-contained che lascia l'app funzionante e che si può fermare/rilasciare per
proprio conto.

## Riepilogo fasi

| Fase | Scope | Rischio | Commit attesi |
| --- | --- | --- | --- |
| **1** | Fix OTA + bug `ì` + bottom sheet +15% | Basso | 1 |
| **2** | Estrai `useFoodSearch`, fix OFF in Preferiti, nuova FoodSearchScreen | Medio | 2-3 |
| **3** | Header con gear, swap Settings↔FoodSearch nella tab bar, pulizia Preferiti | Medio | 1-2 |

Ogni fase è scrivibile/commitabile/pushabile autonomamente. Si consegna al
telefono con voce 4 di `fattrack.bat` (release completa con bump versione +
APK locale + GitHub Release): il custom updateChecker (`src/utils/updateChecker.ts`)
notifica l'utente al prossimo cold start.

---

## Fase 1 — Fix OTA + bug minori

Scopo: tre modifiche superficiali, nessun refactor. Rischio basso, ottima
candidata per essere committata e rilasciata da sola se servisse.

### 1A. Fix configurazione OTA (`app.json`)

**Diagnosi del problema attuale**

- L'APK è buildato in locale via `scripts/build-android-local.bat` (chiamato
  dalla voce 4 di `fattrack.bat`) → `expo prebuild` + `gradlew assembleRelease`.
  EAS non interviene mai nella build, quindi non aggiunge il meta-data
  `expo-channel-name` al `AndroidManifest.xml`. Senza quel meta-data
  `expo-updates` runtime non sa quale `branch` chiedere alla CDN
  `https://u.expo.dev/<projectId>` e non scarica nulla. Nessun errore visibile,
  semplicemente nessuna richiesta.
- `runtimeVersion.policy: "appVersion"` lega il runtime al campo `version` di
  `app.json`. Ogni release alza `version` (1.0.4 → 1.0.5), quindi anche se il
  channel fosse OK gli OTA pubblicati con `version=1.0.5` non raggiungerebbero
  mai un APK installato a `version=1.0.4`. Lo stesso problema si presenterebbe
  con `policy: "nativeVersion"` perché `bump-version.js` aumenta anche
  `android.versionCode` ad ogni release.

**Fix in `app.json`**

Sezione `expo.updates` — aggiungere `requestHeaders` con il channel
"production". Il valore viene scritto da `expo prebuild` come meta-data nel
`AndroidManifest.xml` e quindi sopravvive alla build Gradle locale.

```jsonc
"updates": {
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0,
  "url": "https://u.expo.dev/9040fa36-c682-47b2-923f-eb1143bcd233",
  "requestHeaders": {
    "expo-channel-name": "production"
  }
}
```

Sezione `expo.runtimeVersion` — passare a stringa fissa così gli OTA
attraversano i version bump finché non si introducono dipendenze native nuove:

```jsonc
"runtimeVersion": "1.0.0"
```

**Effetti e limiti**

- Cambio efficace **solo dal prossimo APK buildato** (servono nuovi
  `prebuild` + Gradle). L'APK 1.0.4 attualmente installato continuerà a
  ignorare gli OTA.
- Da quel momento in poi, voce 5 `fattrack.bat` (OTA) consegnerà fix JS-only
  senza richiedere reinstall.
- Il `runtimeVersion` fisso `"1.0.0"` va bumpato manualmente (a `"1.1.0"`,
  `"2.0.0"`, …) **solo** quando si aggiunge una dipendenza nativa nuova
  (es. nuova lib con codice Kotlin/Swift) — altrimenti gli OTA continuano a
  raggiungere tutti gli APK con runtime "1.0.0".

**File toccati**

- `app.json` (modifica delle sezioni `updates` e `runtimeVersion`).

**Note di compatibilità**

- Il custom updateChecker (`src/utils/updateChecker.ts`) resta invariato:
  continua a leggere `version.json` su GitHub e prompttare l'install dell'APK
  via Intent. I due meccanismi convivono: OTA per fix JS, full APK per
  modifiche native o version bump intenzionali.

### 1B. Fix letterale `ì` in FavoritesScreen

**Sorgente del bug**

- `src/screens/FavoritesScreen.tsx:536` — il placeholder dell'`Input` "Nome"
  contiene `placeholder="Es. Pranzo tipo lunedì"`. La stringa è racchiusa
  in apici doppi e `ì` non viene interpretato come escape Unicode da
  React/Babel: viene reso letterale "lunedì".

**Fix**

Sostituire la sequenza con il carattere accentato diretto:

```tsx
placeholder="Es. Pranzo tipo lunedì"
```

Il file è già UTF-8 (lo confermano gli altri caratteri accentati come "à",
"è" usati altrove). Una stringa template `\`...lunedì\`` funzionerebbe
identicamente; preferiamo il letterale per uniformità con i fratelli.

**File toccati**

- `src/screens/FavoritesScreen.tsx` (una riga).

### 1C. Bottom sheet "a salita" +15%

**Scope**

L'utente ha chiesto di aumentare del 15% le finestre "a salita tipo aggiungi
alimento in pasto". Sono i pannelli che slidano dal bordo inferiore con
overlay scuro:

- **Primitive condivisa**: `src/components/BottomSheet.tsx` — `maxHeightPercent`
  default `76` (linea 39). Tutti i child che la usano (oggi solo
  `AddFoodSheet`) ereditano l'aumento.
- **`src/components/FavoritesModal.tsx`** — `maxHeight: '80%'` (linea 165)
  applicato direttamente senza passare per la primitive.

**Modifiche numeriche**

| File | Linea | Da | A | Note |
| --- | --- | --- | --- | --- |
| `src/components/BottomSheet.tsx` | 39 | `maxHeightPercent = 76` | `maxHeightPercent = 87` | 76 × 1.15 = 87.4, arrotondato. Cascata su `AddFoodSheet`. |
| `src/components/FavoritesModal.tsx` | 165 | `maxHeight: '80%'` | `maxHeight: '90%'` | 80 × 1.15 = 92 → cap 90% per restare sotto safe-area su device con notch alto. |

**Esclusioni motivate**

- `GramsInputModal`, `EditMealModal`, `FoodServingsEditorModal` usano `Modal`
  RN nativo con `flex: 1` e contenuto che si auto-dimensiona: non hanno un
  `maxHeight` esplicito da bumpare. Non sono "finestre a salita" nel senso del
  pannello fisso al bordo: sono modali stack che crescono col contenuto.
  Lasciate intatte.

**File toccati**

- `src/components/BottomSheet.tsx` (una riga).
- `src/components/FavoritesModal.tsx` (una riga).

### Verifica Fase 1

**Test manuale (post-build APK)**

1. **OTA** — non testabile sull'APK attuale (deve nascere un APK nuovo). Sui
   nuovi APK, dopo `eas update --branch production`, cold-start dell'app:
   l'update deve essere scaricato in background e attivo al lancio successivo.
2. **`ì`** — apri Preferiti, tap su "+", il placeholder del Nome deve
   leggere "Es. Pranzo tipo lunedì" con la `ì` accentata.
3. **Bottom sheet 15%** — apri "Aggiungi alimento" da una sezione pasto: il
   pannello deve coprire ~87% dell'altezza schermo (prima ~76%). Apri il
   FavoritesModal (selettore preferiti, se ancora presente in questa fase): il
   contenuto può spingersi fino al 90% prima di scrollare.

**Checklist commit Fase 1**

- [ ] `app.json` con `requestHeaders` e `runtimeVersion: "1.0.0"`.
- [ ] `src/screens/FavoritesScreen.tsx:536` con `lunedì` letterale.
- [ ] `src/components/BottomSheet.tsx:39` a 87.
- [ ] `src/components/FavoritesModal.tsx:165` a `'90%'`.
- [ ] `npm run typecheck` pulito.
- [ ] Commit con messaggio del tipo:
      `fix(ota,ui): channel embedded + runtime fisso, lunedì accentato, bottom sheet +15%`.

---

## Fase 2 — Refactor ricerca cibo + fix OFF in Preferiti + nuova FoodSearchScreen

Scopo: riportare a un solo posto la logica di ricerca cibo (DB locale +
OpenFoodFacts), così che (a) il bug della ricerca OFF mancante in
`FavoriteEditorModal` si risolva riusando il codice già funzionante di
`AddFoodSheet`, e (b) la nuova schermata read-only di Fase 3 non duplichi
ennesime righe.

### 2A. Estrai `useFoodSearch` da `AddFoodSheet`

**Oggi (`src/components/AddFoodSheet.tsx`)**

Le righe 219–529 (`SearchTab` interna) implementano:

- input testuale con debounce 400 ms (linea 55, costante locale);
- query `foodsDB.searchFoods(query)` per i risultati locali;
- query `offSearch(query, signal)` con `AbortController` per i risultati OFF;
- stato di loading remoto, errore, `retryTick` per il pulsante "Riprova";
- merge dei risultati locali e remoti, dedup per nome/codice quando entrambi
  matchano lo stesso prodotto.

Tutta questa logica è autocontenuta: dipende solo da `query: string`, un
`enabled: boolean` (per disattivarla quando il tab non è attivo) e da
`foodsDB` + `offSearch`.

**Estrazione**

Nuovo file `src/hooks/useFoodSearch.ts` che esporta:

```ts
export type FoodSearchHit =
  | { source: 'local'; food: Food }
  | { source: 'off'; food: Food };

export type UseFoodSearchResult = {
  query: string;
  setQuery: (q: string) => void;
  localResults: Food[];
  remoteResults: Food[];
  loadingLocal: boolean;
  loadingRemote: boolean;
  remoteError: Error | null;
  retry: () => void;
};

export function useFoodSearch(opts?: { enabled?: boolean }): UseFoodSearchResult;
```

Implementazione: copia 1:1 della logica già nel `SearchTab`, parametrizzata
con `enabled` per consentire ai consumatori di sospendere le query quando il
proprio tab/sheet non è in primo piano.

**Refactor di `AddFoodSheet`**

`SearchTab` continua a esistere, ma il blocco di stato/effetti viene
sostituito da `const search = useFoodSearch({ enabled: activeTab === 'search' })`.
La UI (search bar, FlatList, header sezioni, error/retry box, empty state)
resta inline nel `SearchTab` perché ha bisogno di passare callback di
selezione specifici (`onFoodPicked`) che variano per consumer.

In alternativa (più pulita ma più invasiva): estrarre anche la UI in
`<FoodSearchList>` componente con prop `onPick(food)` e
`renderFooter?: () => ReactNode`. Decisione: **fare entrambe in 2 step**.

- Step 2A.1: estrarre solo il hook (`useFoodSearch`). PR/commit minimo.
- Step 2A.2: estrarre la UI in `<FoodSearchList>` quando serve a 2B/2C
  (commit successivo).

**File toccati Step 2A**

- Nuovo: `src/hooks/useFoodSearch.ts`.
- Modificato: `src/components/AddFoodSheet.tsx` (sostituisce blocco di stato
  con il hook; UI immutata).

### 2B. Wire OFF search in `FavoriteEditorModal`

**Bug attuale**

`src/screens/FavoritesScreen.tsx:342–365` (interno al `FavoriteEditorModal`)
fa SOLO `foodsDB.searchFoods(query)` con debounce. Non importa né
`offSearch` né `offByBarcode`, non ha stato `remoteResults`/`loadingRemote`/
`remoteError`, non mostra il box errore con "Riprova". Quando l'utente cerca
"nutella" e in DB locale non c'è, vede solo il bottone "Aggiungi manualmente"
e crede che l'app sia rotta.

**Fix**

1. Aggiungere `<FoodSearchList>` (o, se restiamo allo step 2A.1, replicare il
   blocco UI di `AddFoodSheet`) nel corpo di `FavoriteEditorModal`.
2. `FoodSearchList` consuma `useFoodSearch({ enabled: visible })` dove
   `visible` è la prop del modal.
3. `onPick(food)` aggiunge il food selezionato all'array `items` del preferito
   in costruzione, esattamente come oggi avviene con il risultato locale.

**Comportamento atteso post-fix**

- Stesso debounce, stessa lista risultati locali + sezione OFF, stesso box
  errore "Errore di rete · Riprova" già presente in `AddFoodSheet`.
- Il selettore di porzione/grammi resta gestito a parte (è una scelta del
  preferito, non parte del flusso di ricerca).

**File toccati**

- `src/screens/FavoritesScreen.tsx` (riscrivere il blocco ricerca interno al
  `FavoriteEditorModal` per consumare il hook/list).

### 2C. Nuova schermata `FoodSearchScreen` (read-only)

**Scopo**

Tab in basso a destra (slot oggi occupato da Settings — vedi Fase 3) per la
ricerca "informativa" di un alimento: l'utente curioso vuole sapere quante
calorie ha la Nutella o un grana, senza l'intento di registrarlo come pasto.

**File**

- Nuovo: `src/screens/FoodSearchScreen.tsx`.

**Layout**

- `<ScreenHeader title="Cerca alimento" subtitle="Database e OpenFoodFacts" />`
- Search bar a tutta larghezza (riusabile dallo stile di `AddFoodSheet`).
- `<FlatList>` (o `<FoodSearchList>` se estratto) con sezione "Locale" e
  sezione "OpenFoodFacts" — identica a quella del SearchTab.
- Ogni `ResultRow` mostra: nome, brand (se OFF), `kcal/100g` ben in vista. Le
  macro (P/C/G per 100 g) vanno nella seconda riga in carattere piccolo, se
  disponibili.
- **Niente pulsante "Aggiungi"**, **niente edit servings**, **nessun grams
  modal**. Tap sulla riga: opzionale espansione che mostra le macro complete
  (default in piano: nessuna azione, riga puramente informativa).

**Cosa NON include**

- Niente apertura di `GramsInputModal`.
- Niente integrazione con `mealsStore` o `quickAddonsDB`.
- Niente "salva nei preferiti" — quello resta nei flussi esistenti.

**File toccati**

- Nuovo: `src/screens/FoodSearchScreen.tsx`.
- (Eventuale) Nuovo: `src/components/FoodSearchList.tsx` se decidiamo di
  estrarre la UI condivisa (step 2A.2).

### Verifica Fase 2

**Test manuale**

1. **2A** — riapri "Aggiungi alimento" e ripeti i casi di test della
   ricerca: prodotto in DB locale, prodotto solo in OFF, query senza match,
   modalità airplane (errore di rete) + tap "Riprova". Tutto deve continuare
   a funzionare identico a prima del refactor.
2. **2B** — apri Preferiti → "+" → editor preferito → digita "nutella". Devi
   vedere la sezione OpenFoodFacts popolarsi dopo il debounce. Spegni il WiFi
   e ricarica: deve apparire il box "Errore di rete · Riprova". Tap su
   "Riprova" → richiede fetch.
3. **2C** — tap sull'icona ricerca in basso a destra (visibile solo dopo
   Fase 3). Cerca "olio extravergine" o "parmigiano": vedi nome + kcal/100g
   nelle righe. Nessun pulsante "Aggiungi" da nessuna parte.

**Checklist commit Fase 2**

- [ ] `src/hooks/useFoodSearch.ts` con copertura 1:1 della logica oggi nel
      `SearchTab`.
- [ ] `AddFoodSheet` migrato al hook (test di non regressione: ricerca DB,
      ricerca OFF, errore + retry, empty state).
- [ ] `FavoriteEditorModal` con OFF wired (regression: aggiungi un food
      "online" a un preferito).
- [ ] `FoodSearchScreen` registrata come componente, ma il wiring in
      `MainTabNavigator`/`BottomTabBar` arriva in Fase 3.
- [ ] `npm run typecheck` pulito.
- [ ] 2-3 commit suddivisi: `refactor(search): estrai useFoodSearch hook`,
      `fix(favorites): wire OFF search in editor`, `feat(search): nuova
      FoodSearchScreen read-only`.

---

## Fase 3 — Navigazione, header con gear icon, cleanup Preferiti

Scopo: portare la ricerca cibo (Fase 2C) come 5ª voce della tab bar al posto
di Settings, riportare Settings dietro un'icona ingranaggio in alto a destra
di Home, e semplificare la schermata Preferiti come puro editor.

### 3A. `ScreenHeader` con slot `right`

**Stato attuale**

`src/components/ScreenHeader.tsx` accetta solo `title`, `subtitle`, `style`.
Non ha alcun modo di renderizzare un'icona/azione in alto a destra accanto
al titolo.

**Modifica**

Aggiungere prop opzionale `right?: ReactNode` e modificare il layout in
`flexDirection: 'row'`, `justifyContent: 'space-between'`, con il blocco
testo a sinistra (la coppia title+subtitle) e `right` a destra
verticalmente centrato (o allineato al titolo se preferiamo).

```tsx
type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  right?: ReactNode;
};
```

Container nuovo:

```tsx
<View style={[styles.container, style]}>
  <View style={styles.textBlock}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
  {right ? <View style={styles.rightSlot}>{right}</View> : null}
</View>
```

Stili: `container.flexDirection = 'row'`, `container.alignItems = 'center'`,
`textBlock.flex = 1`. Tutti gli altri consumer di `ScreenHeader` (Barcode,
History, Settings, Favorites, FoodSearch) non passano `right` → comportamento
invariato.

**File toccati**

- `src/components/ScreenHeader.tsx` (estensione del type + layout).

### 3B. Gear icon su HomeScreen → naviga a Settings

**Modifica**

In `src/screens/HomeScreen.tsx` (linea 154) la chiamata attuale:

```tsx
<ScreenHeader
  title="Diario di oggi"
  subtitle="Pasti e calorie giornaliere"
  style={{ paddingTop: insets.top + spacing.xl }}
/>
```

diventa:

```tsx
<ScreenHeader
  title="Diario di oggi"
  subtitle="Pasti e calorie giornaliere"
  style={{ paddingTop: insets.top + spacing.xl }}
  right={
    <Pressable
      onPress={() => navigation.navigate('Settings')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Apri impostazioni"
    >
      <Icon name="cog" size={24} color={colors.textSec} />
    </Pressable>
  }
/>
```

`navigation` è già a disposizione perché `HomeScreen` è un Tab.Screen e
riceve i prop di navigazione da React Navigation. L'icona `cog` esiste già
in `src/components/Icon.tsx:74`.

**File toccati**

- `src/screens/HomeScreen.tsx`.

### 3C. Tab bar — Settings via gear, FoodSearch al suo posto

**Modifiche necessarie**

1. `src/types/index.ts` (TabParamList linea 4–10): aggiungere la rotta
   `FoodSearch: undefined;`. Settings rimane registrato.

2. `src/navigation/MainTabNavigator.tsx`: registrare il nuovo Tab.Screen
   `FoodSearch` (componente da Fase 2C). Settings rimane registrato come
   Tab.Screen — è solo nascosto dalla bar.

   ```tsx
   <Tab.Screen name="Barcode" component={BarcodeScreen} />
   <Tab.Screen name="Favorites" component={FavoritesScreen} />
   <Tab.Screen name="Home" component={HomeScreen} />
   <Tab.Screen name="History" component={HistoryScreen} />
   <Tab.Screen name="FoodSearch" component={FoodSearchScreen} />
   <Tab.Screen name="Settings" component={SettingsScreen} />
   ```

   `initialRouteName="Home"` invariato. Il back-handler hardware (Fase 0,
   commit `ca3d112`) continua a riportare a Home da qualunque tab.

3. `src/components/BottomTabBar.tsx` (linee 16–22): rimuovere `Settings` da
   `TAB_CONFIG` e aggiungere `FoodSearch`. Il bar già skippa le rotte non
   presenti in `TAB_CONFIG` con `if (!config) return null;` (linea 31).

   ```ts
   const TAB_CONFIG: Record<string, TabConfig> = {
     Barcode: { routeName: 'Barcode', label: 'Scansiona', icon: 'barcode' },
     Favorites: { routeName: 'Favorites', label: 'Preferiti', icon: 'star' },
     Home: { routeName: 'Home', label: 'Home', icon: 'home' },
     History: { routeName: 'History', label: 'Storico', icon: 'chart' },
     FoodSearch: { routeName: 'FoodSearch', label: 'Cerca', icon: 'search' },
   };
   ```

   L'icona `search` esiste già (`Icon.tsx:151`). Layout della bar invariato:
   5 chip a `flex: 1`, Home centrale con FAB rialzato.

**Effetti**

- Tab bar visibile: Barcode · Preferiti · Home (FAB) · Storico · Cerca.
- Settings raggiungibile **solo** dall'ingranaggio in alto a destra di Home
  (per ora — non aggiungiamo deep-link da altre schermate).
- Quando l'utente sta in Settings, nessuna chip della bar è evidenziata: il
  bar continua a essere visibile, e il back hardware riporta a Home.

**File toccati**

- `src/types/index.ts`.
- `src/navigation/MainTabNavigator.tsx`.
- `src/components/BottomTabBar.tsx`.

### 3D. Cleanup `FavoritesScreen` — rimuovi aggiunta diretta

**Stato attuale**

- `src/screens/FavoritesScreen.tsx:109–119` — Card "Aggiungi al pasto" con
  `<SegmentedControl options={MEAL_OPTIONS}>` e un caption che dice "Tocca un
  preferito per aggiungerlo a {targetInfo.label} di oggi".
- `:219–247` — `<Pressable onPress={onAdd}>` che è il corpo cliccabile della
  riga preferito (oltre al pulsante "Modifica" e allo swipe-to-delete).
- `:52` — `const [targetMeal, setTargetMeal] = useState<MealType>('pranzo')`
  (o simile) come stato del selettore.
- `:67–79, 92` — handler `onAdd`/`addFavoriteToDay` che usano `targetMeal` per
  scrivere su `mealsStore`.

**Modifica**

1. **Rimuovere** la Card "Aggiungi al pasto" (linee 109–119). Le righe del
   `SegmentedControl` e i suoi import locali (se non usati altrove) vanno
   ripuliti.
2. **Rimuovere** il `<Pressable onPress={onAdd}>` (linee 219–247) e
   sostituirlo con un `<View style={styles.favoriteBody}>` che renderizza
   solo le info (badge cuore, nome, righe items). Il preferito non è più
   tap-to-add.
3. **Mantenere** intatti il pulsante `<Pressable>` "Modifica" (linee 249–258)
   che apre l'editor, e lo swipe-to-delete del preferito.
4. **Rimuovere** lo stato `targetMeal`, gli handler `addFavoriteToDay`/`onAdd`
   e gli import correlati (`mealsStore.createMeals` se usato solo qui).
   Lasciare `addFavoriteToDay` se è esportato e consumato altrove (verifica
   con `grep`).
5. **Pulire** gli stili orfani in `StyleSheet.create` (es. `selectorCard`,
   `addChip`).

**Effetti**

- La schermata Preferiti diventa un editor puro: lista preferiti, modifica,
  eliminazione (swipe). Per registrare un preferito come pasto si passa dal
  flusso Home → MealSection → "Dai preferiti", che resta invariato.
- Niente regressioni nei dati: i preferiti continuano a esistere, solo
  l'azione di aggiunta dalla schermata stessa è rimossa.

**File toccati**

- `src/screens/FavoritesScreen.tsx`.

### Verifica Fase 3

**Test manuale**

1. **3A + 3B** — Apri Home: in alto a destra deve esserci un'icona
   ingranaggio. Tap → si apre la schermata Settings (con BottomTabBar visibile
   ma nessuna chip evidenziata). Tap del back hardware → torna a Home.
2. **3C** — La 5ª chip in basso a destra ora è "Cerca" con icona lente
   (`search`). Tap → si apre la `FoodSearchScreen` (Fase 2C). La chip
   "Impostazioni" non esiste più nella bar.
3. **3D** — Apri Preferiti: in alto **non** c'è più la card "Aggiungi al
   pasto". Tap su una card preferito non aggiunge nulla a oggi (solo il
   bottone "Modifica" apre l'editor). Lo swipe-to-delete continua a
   funzionare.

**Checklist commit Fase 3**

- [ ] `ScreenHeader` esteso con prop `right`.
- [ ] `HomeScreen` con icona ingranaggio top-right che naviga a Settings.
- [ ] `TabParamList` con `FoodSearch`.
- [ ] `MainTabNavigator` registra `FoodSearch` Tab.Screen, mantiene
      `Settings` registrato.
- [ ] `BottomTabBar` con `TAB_CONFIG` aggiornato (Settings rimosso,
      FoodSearch aggiunto).
- [ ] `FavoritesScreen` ripulito (no card selector, no tap-to-add, codice
      orfano rimosso).
- [ ] `npm run typecheck` pulito.
- [ ] 1–2 commit:
      `feat(nav): gear icon su Home, Settings via header, Cerca tab al posto`,
      `chore(favorites): rimuovi aggiunta diretta da pasto`.

---

## Note finali e consegna

- I tasti di test "Reset app" e "Reset DB" della card Test in
  `SettingsScreen` rimangono in piedi finché l'utente non chiede di toglierli.
- Per consegnare le modifiche al telefono dopo aver completato tutte le 3
  fasi:
  1. Merge del branch `claude/fix-back-button-navigation-5GmCa` su `main`
     (`git checkout main && git merge --no-ff …` + `git push`).
  2. `fattrack.bat` → voce 4 (release completa) → bump patch
     (1.0.4 → 1.0.5) → build LOCALE → tag + GitHub Release.
  3. Al cold-start successivo l'app prompta l'aggiornamento via
     `updateChecker` custom (`Constants.expoConfig.version` < remote
     `version.json`) e installa l'APK 1.0.5.
- Da v1.0.5 in poi gli OTA voce 5 funzioneranno per fix JS-only entro lo
  stesso `runtimeVersion: "1.0.0"` (Fase 1A). Per release con bump native
  (nuove dipendenze native) bumpare manualmente `runtimeVersion` in
  `app.json` prima di buildare il nuovo APK.
- Ogni fase è indipendente: si possono buildare e rilasciare in 3 release
  separate (1.0.5 = Fase 1, 1.0.6 = Fase 2, 1.0.7 = Fase 3) o tutte in una
  sola release.
