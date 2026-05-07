# Esercizi nuovi senza immagine — TODO

Lista degli esercizi appena aggiunti al seed (`src/database/seedExercises.ts`)
che **non hanno ancora un'illustrazione** in `assets/exercises/<slug>.webp`.

## Come funziona

Questo file è un TODO operativo aggiornato da due agenti:

- **`sport-content-author`** *aggiunge* righe quando crea esercizi nuovi nel
  seed. Ogni riga = un esercizio che ha bisogno della sua illustrazione.
- **`exercise-illustrations`** *rimuove* righe quando un'illustrazione
  viene generata, verificata e promossa in `assets/exercises/<slug>.webp`.

Quando la sezione "In sospeso" è vuota, tutti gli esercizi del seed hanno
la loro illustrazione.

I batch markdown da incollare nel **Custom GPT FatTrack Exercise Illustrator**
vivono nella stessa cartella (`assets/exercises/newbatch/batch-NN.md` o
`rifare-NN.md`) e vengono cancellati dopo l'uso.

## Formato delle righe

```
- `<slug>` — <Nome esatto come nel seed> (gruppo: <muscleGroup>, equipment: <equipment>)
```

Esempio:
```
- `pistol-squat` — Pistol squat (gruppo: Gambe, equipment: Corpo libero)
- `muscle-up-regression` — Muscle-up regression (gruppo: Schiena, equipment: Sbarra)
```

## In sospeso

### Cardio

- `camminata-veloce` — Camminata veloce (gruppo: Cardio, equipment: Corpo libero o tapis roulant)
- `cyclette` — Cyclette (gruppo: Cardio, equipment: Cyclette)

### Gambe / Glutei (manubri)

- `squat-manubri` — Squat con manubri (gruppo: Gambe, equipment: Manubri)
- `goblet-squat-manubri` — Goblet squat con manubri (gruppo: Gambe, equipment: Manubri)
- `sumo-squat-manubri` — Sumo squat con manubri (gruppo: Gambe, equipment: Manubri)
- `affondi-manubri` — Affondi con manubri (gruppo: Gambe, equipment: Manubri)
- `stacco-rumeno-manubri` — Stacco rumeno con manubri (gruppo: Glutei, equipment: Manubri)
- `step-up-manubri` — Step-up con manubri (gruppo: Gambe, equipment: Manubri + sedia o panca)
- `bulgarian-split-squat-manubri` — Bulgarian split squat con manubri (gruppo: Gambe, equipment: Manubri + sedia o panca)

### Petto / Spalle (manubri + panca)

- `panca-piana-manubri` — Panca piana con manubri (gruppo: Petto, equipment: Manubri + panca)
- `panca-inclinata-manubri` — Panca inclinata con manubri (gruppo: Petto, equipment: Manubri + panca inclinata)
- `pullover-manubrio` — Pullover con manubrio (gruppo: Petto, equipment: Manubrio + panca)
- `shoulder-press-manubri` — Shoulder press con manubri (gruppo: Spalle, equipment: Manubri)
- `arnold-press` — Arnold press (gruppo: Spalle, equipment: Manubri)
- `alzate-laterali-manubri` — Alzate laterali con manubri (gruppo: Spalle, equipment: Manubri)

### Schiena (manubri)

- `rematore-manubrio` — Rematore con manubrio (gruppo: Schiena, equipment: Manubrio + panca)

### Braccia (manubri)

- `curl-bicipiti-manubri` — Curl bicipiti con manubri (gruppo: Braccia, equipment: Manubri)
- `curl-martello-manubri` — Curl martello con manubri (gruppo: Braccia, equipment: Manubri)
- `estensioni-tricipiti-manubrio` — Estensioni tricipiti con manubrio (gruppo: Braccia, equipment: Manubrio)
- `kickback-tricipiti-manubri` — Kickback tricipiti con manubri (gruppo: Braccia, equipment: Manubri)

### Core

- `bicycle-crunch` — Bicycle crunch (gruppo: Core, equipment: Corpo libero)

### Calistenico — tirate / schiena

- `trazioni-sbarra` — Trazioni alla sbarra (gruppo: Schiena, equipment: Sbarra)
- `chin-up` — Chin-up (gruppo: Schiena, equipment: Sbarra)
- `australian-pull-up` — Australian pull-up (gruppo: Schiena, equipment: Sbarra)
- `negativa-trazione` — Negativa di trazione (gruppo: Schiena, equipment: Sbarra)
- `trazione-esplosiva` — Trazione esplosiva al petto (gruppo: Schiena, equipment: Sbarra)
- `dead-hang` — Dead hang (gruppo: Schiena, equipment: Sbarra)
- `scapular-pull` — Scapular pull (gruppo: Schiena, equipment: Sbarra)

### Calistenico — spinte / petto / spalle

- `dip-parallele` — Dip alle parallele (gruppo: Petto, equipment: Parallele)
- `archer-push-up` — Archer push-up (gruppo: Petto, equipment: Corpo libero)
- `push-up-ginocchia` — Push-up sui ginocchi (gruppo: Petto, equipment: Corpo libero)
- `push-up-inclinati` — Push-up inclinati (gruppo: Petto, equipment: Sedia o panca)
- `pseudo-planche-push-up` — Pseudo-planche push-up (gruppo: Spalle, equipment: Corpo libero)

### Calistenico — gambe / glutei / core

- `pistol-squat` — Pistol squat (gruppo: Gambe, equipment: Corpo libero)
- `pistol-squat-assistito` — Pistol squat assistito (gruppo: Gambe, equipment: Corpo libero)
- `box-pistol-squat` — Box pistol squat (gruppo: Gambe, equipment: Sedia o panca)
- `glute-bridge-singolo` — Glute bridge a una gamba (gruppo: Glutei, equipment: Corpo libero)
- `knee-raise-appeso` — Knee raise appeso (gruppo: Core basso, equipment: Sbarra)
- `leg-raise-appeso` — Leg raise appeso (gruppo: Core basso, equipment: Sbarra)
