// Client minimo per Open Food Facts:
// - `offSearch` → endpoint testuale
// - `offByBarcode` → lookup singolo per codice a barre
// Normalizziamo sia i nomi che i nutrimenti perché OFF restituisce shape
// eterogenei (nome italiano/inglese, energia in kcal o solo kJ, prodotti senza
// calorie). Scartiamo tutto ciò che non ha un kcal per 100 g valido: non
// serve mostrare in UI risultati senza il dato di cui abbiamo bisogno.

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v0/product';

export type OffProduct = {
  code: string | null;
  name: string;
  brand: string | null;
  caloriesPer100g: number;
  // Macros per 100 g (null quando non esposti dall'API OFF).
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

type OffRaw = {
  code?: string | number;
  product_name?: string;
  product_name_it?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number | string;
    'energy-kcal'?: number | string;
    'energy_100g'?: number | string;
    energy_unit?: string;
    proteins_100g?: number | string;
    carbohydrates_100g?: number | string;
    fat_100g?: number | string;
  };
};

export async function offSearch(
  query: string,
  signal?: AbortSignal,
  limit = 20,
): Promise<OffProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `${SEARCH_URL}?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=${limit}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF search HTTP ${res.status}`);
  const data = (await res.json()) as { products?: OffRaw[] };
  const products = Array.isArray(data.products) ? data.products : [];
  const out: OffProduct[] = [];
  for (const raw of products) {
    const product = normalizeProduct(raw);
    if (product) out.push(product);
  }
  return out;
}

export async function offByBarcode(
  code: string,
  signal?: AbortSignal,
): Promise<OffProduct | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const url = `${PRODUCT_URL}/${encodeURIComponent(trimmed)}.json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF barcode HTTP ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: OffRaw };
  if (data.status !== 1 || !data.product) return null;
  return normalizeProduct(data.product);
}

function normalizeProduct(raw: OffRaw | undefined): OffProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = firstNonEmpty(
    raw.product_name_it,
    raw.product_name,
    raw.product_name_en,
    raw.generic_name,
  );
  if (!name) return null;

  const kcal = extractKcalPer100g(raw.nutriments);
  if (kcal === null) return null;

  return {
    code: raw.code ? String(raw.code) : null,
    name,
    brand: firstNonEmpty(raw.brands) ?? null,
    caloriesPer100g: Math.round(kcal),
    proteinPer100g: roundMacro(raw.nutriments?.proteins_100g),
    carbsPer100g: roundMacro(raw.nutriments?.carbohydrates_100g),
    fatPer100g: roundMacro(raw.nutriments?.fat_100g),
  };
}

function roundMacro(v: unknown): number | null {
  const n = toNumber(v);
  if (n === null || n < 0) return null;
  return Math.round(n * 10) / 10;
}

function extractKcalPer100g(n: OffRaw['nutriments']): number | null {
  if (!n) return null;
  const kcal100 = toNumber(n['energy-kcal_100g']);
  if (kcal100 !== null && kcal100 >= 0) return kcal100;
  const kcal = toNumber(n['energy-kcal']);
  if (kcal !== null && kcal >= 0) return kcal;
  // `energy_100g` può essere in kJ o kcal a seconda dell'unità; accettiamo solo kcal.
  const energy = toNumber(n['energy_100g']);
  const unit = typeof n.energy_unit === 'string' ? n.energy_unit.toLowerCase() : '';
  if (energy !== null && energy >= 0 && unit === 'kcal') return energy;
  return null;
}

function firstNonEmpty(...vals: Array<string | undefined | null>): string | null {
  for (const v of vals) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
