// Formattazione "umana" per la quantità di un pasto.
// - Se è registrato in porzioni alternative ("1.5 cucchiaini") → mostriamo
//   quelle, con il peso in grammi come dettaglio secondario.
// - Altrimenti ricadiamo sul valore in grammi puro.
// - I costi fissi (grams === 0) sono pasti senza quantità, l'etichetta è
//   gestita separatamente.

export type ServingDisplayInput = {
  grams: number;
  servingLabel?: string | null;
  servingQty?: number | null;
};

export function formatServing(input: ServingDisplayInput): string {
  const { grams, servingLabel, servingQty } = input;
  if (grams === 0) return 'Costo fisso';
  if (
    servingLabel &&
    servingLabel.trim().length > 0 &&
    typeof servingQty === 'number' &&
    servingQty > 0
  ) {
    const label = servingQty === 1 ? servingLabel : pluralize(servingLabel);
    return `${formatNumber(servingQty)} ${label}`;
  }
  return `${formatGrams(grams)} g`;
}

export function formatGrams(grams: number): string {
  return Number.isInteger(grams) ? String(grams) : grams.toFixed(1);
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

// Pluralizzazione minimale italiana (cucchiaino → cucchiaini, fetta → fette,
// porzione → porzioni). Per casi edge ricade sul singolare.
function pluralize(label: string): string {
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith('o')) return trimmed.slice(0, -1) + 'i';
  if (lower.endsWith('a')) return trimmed.slice(0, -1) + 'e';
  if (lower.endsWith('e')) return trimmed.slice(0, -1) + 'i';
  return trimmed;
}
