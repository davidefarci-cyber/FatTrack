// Helper SVG condivisi: pie chart e archi parziali per i countdown sport
// (RestTimer, RestTimerStandaloneModal, HoldToStartButton). Convenzione
// SVG-friendly: 0° è a destra, gli angoli crescono in senso orario nel
// sistema di coordinate SVG (Y verso il basso). Per il pattern "ring che
// si svuota in alto" il chiamante passa `startAngle = -90` e
// `endAngle = -90 + sweep`.

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Arco da `startAngle` a `endAngle` (gradi) disegnato in senso orario.
// Per evitare che il flag M+A degeneri quando l'arco è quasi 360° (caso
// "ring pieno") tagliamo il sweep a 359.999° prima di calcolare i punti.
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const safeEnd = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, safeEnd);
  const largeArcFlag = safeEnd - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}
