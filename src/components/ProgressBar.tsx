import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

type ProgressBarProps = {
  // Valore corrente (può superare target, per indicare sforamento).
  value: number;
  target: number;
  // Altezza barra, di default 8 per lasciarla discreta nel design system.
  height?: number;
  // Colore pieno quando il valore NON supera il target.
  // Di default verde FatTrack; sopra il target diventa rosso.
  color?: string;
  overColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({
  value,
  target,
  height = 8,
  color = colors.green,
  overColor = colors.red,
  style,
}: ProgressBarProps) {
  const ratio = target > 0 ? value / target : 0;
  const clamped = Math.max(0, Math.min(ratio, 1));
  const isOver = value > target && target > 0;
  const fillColor = isOver ? overColor : color;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: radii.round,
    overflow: 'hidden',
  },
});
