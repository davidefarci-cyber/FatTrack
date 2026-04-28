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

## Fase 2 — (in scrittura nei prossimi commit)

## Fase 3 — (in scrittura nei prossimi commit)
