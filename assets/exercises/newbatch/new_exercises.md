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

- `push-up-ginocchia` — Push-up sui ginocchi (gruppo: Petto, equipment: Corpo libero)
- `push-up-inclinati` — Push-up inclinati (gruppo: Petto, equipment: Sedia o panca)
- `dead-hang` — Dead hang (gruppo: Schiena, equipment: Sbarra)
- `scapular-pull` — Scapular pull (gruppo: Schiena, equipment: Sbarra)
- `glute-bridge-una-gamba` — Glute bridge a una gamba (gruppo: Glutei, equipment: Corpo libero)
