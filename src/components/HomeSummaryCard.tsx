import { StyleSheet, Text, View } from 'react-native';

import { CalorieRing } from '@/components/CalorieRing';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { colors, radii, spacing, typography } from '@/theme';

type HomeSummaryCardProps = {
  consumed: number;
  target: number;
};

export function HomeSummaryCard({ consumed, target }: HomeSummaryCardProps) {
  const consumedRounded = Math.round(consumed);
  const remaining = Math.round(target - consumed);
  const isOver = consumed > target && target > 0;
  const absRemaining = Math.abs(remaining).toLocaleString('it-IT');
  const accentColor = isOver ? colors.red : colors.green;
  const accentBg = isOver ? colors.redLight : colors.greenLight;
  const accentLabel = isOver ? 'Superate' : 'Rimanenti';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <CalorieRing consumed={consumedRounded} target={target} size={128} />
        <View style={styles.rightCol}>
          <Text style={typography.label}>Consumate</Text>
          <Text style={[typography.display, styles.consumed]}>
            {consumedRounded.toLocaleString('it-IT')}
          </Text>
          <View
            style={[
              styles.statusBox,
              { borderLeftColor: accentColor, backgroundColor: accentBg },
            ]}
          >
            <Text style={[typography.label, { color: accentColor }]}>
              {accentLabel}
            </Text>
            <Text style={[typography.value, { color: accentColor }]}>
              {absRemaining} kcal
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <ProgressBar
          value={consumed}
          target={target}
          height={7}
        />
        <View style={styles.progressLabels}>
          <Text style={typography.micro}>0</Text>
          <Text style={typography.caption}>
            Obiettivo: {target.toLocaleString('it-IT')} kcal
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  rightCol: {
    flex: 1,
    gap: spacing.md,
  },
  consumed: {
    color: colors.text,
  },
  statusBox: {
    borderLeftWidth: 3,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.xxs,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
