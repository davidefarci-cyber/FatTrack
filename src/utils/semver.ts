// Confronto semver leggero: stringhe dot-separated numeriche.
// Ritorna 1 se a > b, -1 se a < b, 0 se uguali. Segmenti non numerici
// sono trattati come 0 (es. "1.0.0-beta" ≈ "1.0.0"). Sufficiente per
// confrontare tag GitHub Releases con `expoConfig.version`.
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(toInt);
  const pb = b.split('.').map(toInt);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function toInt(segment: string): number {
  const n = parseInt(segment, 10);
  return Number.isFinite(n) ? n : 0;
}
