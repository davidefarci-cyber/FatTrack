// Format duration in seconds in human-readable form, adatto a label e
// prescrizioni. Sotto la soglia (default 120s) restiamo in "Ns" così
// vedere 45s o 90s ha senso; sopra, passiamo a una forma in minuti.
// Per countdown display (MM:SS) usa `formatMMSS` invece — questa funzione
// è per i label statici (badge prescrizione, bottone avvia, summary).

const DEFAULT_MINUTE_THRESHOLD_SEC = 120;

export function formatDuration(
  sec: number,
  options: { thresholdSec?: number } = {},
): string {
  const threshold = options.thresholdSec ?? DEFAULT_MINUTE_THRESHOLD_SEC;
  const total = Math.max(0, Math.round(sec));
  if (total < threshold) {
    return `${total}s`;
  }
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (seconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes}min ${seconds}s`;
}

// Format MM:SS, usato dal display centrale dei countdown / cronometri
// (RestTimer, ExerciseTimer). Sopra 60 min usa H:MM:SS, ma in pratica
// nei nostri use case non ci arriviamo.
export function formatMMSS(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
