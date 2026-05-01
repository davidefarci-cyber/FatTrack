import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

type CalorieRingProps = {
  consumed: number;
  target: number;
  size?: number;
  // Override del colore "in target": quando assente usa l'accent della
  // modalità corrente (verde in diet, arancio in sport). Pensato per il
  // futuro WorkoutRing che riutilizzerà questa primitive con un colore
  // diverso senza forkare il componente.
  accent?: string;
};

const GAP = 0.28;

export function CalorieRing({ consumed, target, size = 148, accent }: CalorieRingProps) {
  const theme = useAppTheme();
  const r = 56;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * (1 - GAP);
  const isOver = consumed > target;
  const okColor = accent ?? theme.accent;
  const color = isOver ? colors.red : okColor;
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const filled = arcLen * progress;

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
        {consumed > 0 ? (
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
        <Text style={styles.consumed}>{consumed.toLocaleString('it-IT')}</Text>
        <Text style={styles.target}>/ {target.toLocaleString('it-IT')}</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  // L'arco inizia a ~126° per lasciare il gap in basso, come nel design.
  svg: {
    transform: [{ rotate: '126deg' }],
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumed: {
    ...typography.display,
  },
  target: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSec,
    marginTop: 3,
  },
  unit: {
    ...typography.micro,
    fontSize: 9,
  },
});
