import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, typography } from '@/theme';

type WeightRingProps = {
  weightKg: number;
  // Peso obiettivo: quando null il ring è disattivato (CTA "imposta target").
  targetKg: number | null;
  // Peso al momento dell'impostazione del target. Serve a calcolare il
  // progresso: (start → current) / (start → target). Quando null o uguale
  // a `targetKg`, il ring mostra 0% di progresso.
  startKg: number | null;
  size?: number;
};

const GAP = 0.28;

export function WeightRing({ weightKg, targetKg, startKg, size = 168 }: WeightRingProps) {
  const r = 64;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * (1 - GAP);

  const hasTarget = targetKg !== null && Number.isFinite(targetKg);
  const reached = hasTarget && Math.abs(weightKg - (targetKg as number)) < 0.05;
  const progress = computeProgress(weightKg, targetKg, startKg);
  const filled = arcLen * progress;
  const color = reached ? colors.green : colors.blue;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={colors.border}
          strokeWidth={11}
          strokeDasharray={`${arcLen} ${circ}`}
          strokeLinecap="round"
        />
        {hasTarget && progress > 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={11}
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.weight}>{formatKg(weightKg)}</Text>
        <Text style={styles.unit}>kg</Text>
        {hasTarget ? (
          <Text style={styles.target}>obiettivo {formatKg(targetKg as number)} kg</Text>
        ) : (
          <Text style={styles.target}>obiettivo non impostato</Text>
        )}
      </View>
    </View>
  );
}

function computeProgress(
  current: number,
  target: number | null,
  start: number | null,
): number {
  if (target === null || start === null) return 0;
  const totalDelta = target - start;
  if (Math.abs(totalDelta) < 0.05) return 1; // start = target ⇒ già a obiettivo
  const doneDelta = current - start;
  // Se obiettivo opposto alla direzione (es. start < target ma current < start),
  // progresso negativo ⇒ clamp a 0.
  const ratio = doneDelta / totalDelta;
  return Math.max(0, Math.min(1, ratio));
}

function formatKg(value: number): string {
  // Una sola decimale (passi 200g ⇒ basta), separatore italiano.
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  // Stesso pattern di CalorieRing: arco apre in basso (gap a 126°).
  svg: {
    transform: [{ rotate: '126deg' }],
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  weight: {
    ...typography.display,
  },
  unit: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSec,
    marginTop: 2,
  },
  target: {
    ...typography.micro,
    fontSize: 9,
    marginTop: 6,
    textAlign: 'center',
  },
});
