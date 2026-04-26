import { StyleSheet, Text, View } from 'react-native';

import { CalorieRing } from '@/components/CalorieRing';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { colors, radii, spacing, typography } from '@/theme';
import type { MacroTargets } from '@/utils/macroTargets';

type MacroConsumed = {
  protein: number;
  carbs: number;
  fat: number;
};

type HomeSummaryCardProps = {
  consumed: number;
  target: number;
  macrosConsumed: MacroConsumed;
  macroTargets: MacroTargets;
};

export function HomeSummaryCard({
  consumed,
  target,
  macrosConsumed,
  macroTargets,
}: HomeSummaryCardProps) {
  const consumedRounded = Math.round(consumed);
  const remaining = Math.round(target - consumed);
  const isOver = consumed > target && target > 0;
  const absRemaining = Math.abs(remaining).toLocaleString('it-IT');
  const accentColor = isOver ? colors.red : colors.green;
  const accentBg = isOver ? colors.redLight : colors.greenLight;
  const accentLabel = isOver ? 'Superate' : 'Rimanenti';

  const hasMacros =
    macrosConsumed.protein > 0 ||
    macrosConsumed.carbs > 0 ||
    macrosConsumed.fat > 0;

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

      <View style={styles.macroBlock}>
        <Text style={typography.label}>Macro</Text>
        {hasMacros ? (
          <>
            <MacroRow
              label="Proteine"
              consumed={macrosConsumed.protein}
              target={macroTargets.proteinG}
              color={colors.purple}
            />
            <MacroRow
              label="Carboidrati"
              consumed={macrosConsumed.carbs}
              target={macroTargets.carbsG}
              color={colors.blue}
            />
            <MacroRow
              label="Grassi"
              consumed={macrosConsumed.fat}
              target={macroTargets.fatG}
              color={colors.green}
            />
          </>
        ) : (
          <Text style={typography.caption}>
            I macro compaiono qui quando registri alimenti con dati nutrizionali.
          </Text>
        )}
      </View>
    </Card>
  );
}

function MacroRow({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const consumedRounded = Math.round(consumed);
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const widthPct = `${Math.round(ratio * 100)}%` as const;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelCol}>
        <Text style={typography.bodyBold}>{label}</Text>
      </View>
      <View style={styles.macroBarCol}>
        <View style={styles.macroBarTrack}>
          <View
            style={[styles.macroBarFill, { backgroundColor: color, width: widthPct }]}
          />
        </View>
      </View>
      <Text style={[typography.caption, styles.macroValue]}>
        {consumedRounded} / {target} g
      </Text>
    </View>
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
  macroBlock: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  macroLabelCol: {
    width: 96,
  },
  macroBarCol: {
    flex: 1,
  },
  macroBarTrack: {
    height: 6,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: radii.round,
  },
  macroValue: {
    minWidth: 72,
    textAlign: 'right',
  },
});
