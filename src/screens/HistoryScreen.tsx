import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { HistoryChart } from '@/components/HistoryChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useHistory } from '@/hooks/useHistory';
import type { HistoryDay, HistoryPeriod } from '@/hooks/useHistory';
import { colors, radii, spacing, typography } from '@/theme';

const PERIOD_OPTIONS: ReadonlyArray<{ value: HistoryPeriod; label: string }> = [
  { value: 7, label: '7 giorni' },
  { value: 30, label: '30 giorni' },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const {
    period,
    setPeriod,
    targetCalories,
    days,
    averageCalories,
    daysInTarget,
    daysOverTarget,
    daysWithData,
    loading,
  } = useHistory(7);

  // Larghezza interna: screen - padding ScrollView (spacing.screen × 2)
  // - padding Card (spacing.screen × 2).
  const chartWidth = Dimensions.get('window').width - spacing.screen * 4;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Storico"
        subtitle="Andamento delle tue calorie"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.summaryCard}>
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
          />
          <View style={styles.summaryRow}>
            <SummaryStat
              label="Media"
              value={`${averageCalories.toLocaleString('it-IT')} kcal`}
            />
            <SummaryStat
              label="In target"
              value={`${daysInTarget} / ${daysWithData || days.length}`}
              tone="positive"
            />
            <SummaryStat
              label="Fuori target"
              value={String(daysOverTarget)}
              tone={daysOverTarget > 0 ? 'negative' : 'neutral'}
            />
          </View>
          <Text style={typography.caption}>
            Target {Math.round(targetCalories).toLocaleString('it-IT')} kcal / giorno
          </Text>
        </Card>

        <Card style={styles.chartCard}>
          <HistoryChart
            days={days}
            period={period}
            target={targetCalories}
            width={chartWidth}
          />
        </Card>

        <Card style={styles.listCard}>
          <Text style={typography.label}>Dettaglio giorni</Text>
          {loading && days.length === 0 ? (
            <Text style={[typography.caption, styles.emptyText]}>Caricamento…</Text>
          ) : days.every((d) => d.calories === 0) ? (
            <Text style={[typography.caption, styles.emptyText]}>
              Nessun pasto registrato in questo periodo.
            </Text>
          ) : (
            [...days].reverse().map((day, idx, arr) => (
              <DayRow
                key={day.date}
                day={day}
                target={targetCalories}
                isLast={idx === arr.length - 1}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const color =
    tone === 'positive'
      ? colors.green
      : tone === 'negative'
      ? colors.red
      : colors.text;
  return (
    <View style={styles.stat}>
      <Text style={typography.label}>{label}</Text>
      <Text style={[typography.value, { color }]}>{value}</Text>
    </View>
  );
}

function DayRow({
  day,
  target,
  isLast,
}: {
  day: HistoryDay;
  target: number;
  isLast: boolean;
}) {
  const hasData = day.calories > 0;
  const deltaColor = !hasData
    ? colors.textSec
    : day.overTarget
    ? colors.red
    : colors.green;

  return (
    <View style={[styles.dayRow, !isLast && styles.dayRowDivider]}>
      <View style={styles.dayRowText}>
        <Text style={typography.body}>{day.fullLabel}</Text>
        <Text style={typography.caption}>
          Target {Math.round(target).toLocaleString('it-IT')} kcal
        </Text>
      </View>
      <View style={styles.dayRowValues}>
        <Text style={typography.bodyBold}>
          {hasData ? `${day.calories.toLocaleString('it-IT')} kcal` : '—'}
        </Text>
        <Text style={[typography.caption, { color: deltaColor }]}>
          {hasData ? formatDelta(day.delta) : 'Nessun pasto'}
        </Text>
      </View>
    </View>
  );
}

function formatDelta(delta: number): string {
  if (delta === 0) return 'In target';
  const sign = delta > 0 ? '+' : '−';
  const abs = Math.abs(delta).toLocaleString('it-IT');
  return `${sign}${abs} kcal`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  summaryCard: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    flex: 1,
    gap: spacing.xxs,
  },
  chartCard: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  listCard: {
    padding: spacing.screen,
    gap: spacing.md,
  },
  emptyText: {
    paddingVertical: spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginHorizontal: -spacing.md,
    borderRadius: radii.md,
  },
  dayRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayRowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  dayRowValues: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
});
