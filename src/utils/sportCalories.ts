// Stima calorie bruciate per le sessioni di allenamento.
// Formula: kcal = MET × peso_kg × ore.
// Source: Compendium of Physical Activities (i MET sono già seedati
// in `exercises.met` per ciascun esercizio).
//
// Per una sessione mixed iteriamo SET per SET e sommiamo i contributi:
//   contrib_set = met × peso_kg × (durata_set_sec / 3600)
// - Esercizi con prescrizione `duration_sec` (cardio/mobilità): usiamo
//   la durata effettiva del set.
// - Esercizi con prescrizione `sets×reps` (forza a corpo libero):
//   stimiamo 30s per set se non c'è una durata salvata. Ragionevole per
//   il bodyweight; sottostima per il sollevamento pesante (che tende a
//   essere 45-60s) ma evita over-fitting.
// - Tempo di RIPOSO non conta come energia spesa.
// - Esercizi con MET NULL: contributo 0 (skip), niente fallback con
//   "MET medio" che falserebbe sessioni atipiche.

const FALLBACK_SET_DURATION_SEC = 30;

export function estimateSetCalories(input: {
  met: number | null;
  weightKg: number;
  durationSec: number;
}): number {
  const { met, weightKg, durationSec } = input;
  if (met === null || met <= 0 || weightKg <= 0 || durationSec <= 0) {
    return 0;
  }
  const hours = durationSec / 3600;
  return met * weightKg * hours;
}

export function estimateSessionCalories(input: {
  weightKg: number;
  sets: Array<{ met: number | null; durationSec: number | null }>;
}): number {
  const { weightKg, sets } = input;
  if (weightKg <= 0 || sets.length === 0) return 0;
  let total = 0;
  for (const set of sets) {
    const duration =
      set.durationSec !== null && set.durationSec > 0
        ? set.durationSec
        : FALLBACK_SET_DURATION_SEC;
    total += estimateSetCalories({
      met: set.met,
      weightKg,
      durationSec: duration,
    });
  }
  return Math.max(0, Math.round(total));
}
