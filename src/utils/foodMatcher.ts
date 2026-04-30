import type { Food } from '@/database';

// Heuristica di match nome remoto (Open Food Facts) -> food locale del seed.
// Serve a "ereditare" le porzioni del food locale (es. "Banana media 200g")
// quando l'utente seleziona un prodotto OFF il cui nome contiene quello base
// (es. "Banana Chiquita Bio 1kg"). OFF raramente popola `serving_quantity`,
// quindi questo fallback recupera porzioni utili nella maggior parte dei
// casi quotidiani senza richiedere intervento manuale.
//
// Algoritmo: tokenizziamo entrambi i nomi (lowercase, no accenti, senza
// stop-word italiane comuni e numeri/unità). Una corrispondenza è valida se
// il token "testa" del food locale è presente nei token remoti e almeno
// metà dei token locali appare nei remoti. Tra più candidati vince quello
// con più token in comune (più specifico); a parità, il rapporto più alto.

const STOP_WORDS = new Set([
  'a', 'al', 'alla', 'allo', 'agli', 'alle',
  'da', 'dal', 'dalla', 'dallo',
  'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle',
  'e', 'in', 'con', 'su', 'sul', 'per',
  'i', 'il', 'la', 'lo', 'gli', 'le',
  'un', 'una', 'uno',
  'bio', 'classico', 'classic', 'natural', 'naturale',
  'italia', 'italiano', 'italiana', 'italiani', 'italiane',
  'gr', 'kg', 'ml', 'cl', 'lt', 'pz', 'g',
]);

const UNIT_OR_NUMBER_RE = /^\d+([.,]\d+)?$|^\d+[a-z]+$/i;

export function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`´]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .filter((t) => !STOP_WORDS.has(t))
    .filter((t) => !UNIT_OR_NUMBER_RE.test(t));
}

export function findMatchingLocalFood(
  remoteName: string,
  locals: ReadonlyArray<Pick<Food, 'id' | 'name'>>,
): Pick<Food, 'id' | 'name'> | null {
  const remoteTokens = new Set(tokenize(remoteName));
  if (remoteTokens.size === 0) return null;
  let best: { food: Pick<Food, 'id' | 'name'>; matched: number; ratio: number } | null = null;
  for (const food of locals) {
    const localTokens = tokenize(food.name);
    if (localTokens.length === 0) continue;
    const head = localTokens[0];
    if (!remoteTokens.has(head)) continue;
    let matched = 0;
    for (const t of localTokens) {
      if (remoteTokens.has(t)) matched += 1;
    }
    const ratio = matched / localTokens.length;
    if (ratio < 0.5) continue;
    if (
      !best ||
      matched > best.matched ||
      (matched === best.matched && ratio > best.ratio)
    ) {
      best = { food, matched, ratio };
    }
  }
  return best?.food ?? null;
}
