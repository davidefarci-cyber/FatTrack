import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryStack,
} from 'victory-native';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useHistory } from '@/hooks/useHistory';
import type { HistoryDay, HistoryPeriod } from '@/hooks/useHistory';
import { colors, fontFamily, radii, shadows, spacing, typography } from '@/theme';

const PERIOD_OPTIONS: ReadonlyArray<{ value: HistoryPeriod; label: string }> = [
  { value: 7, label: '7 giorni' },
  { value: 30, label: '30 giorni' },
];

const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 24, bottom: 36, left: 52, right: 20 };

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
    reload,
  } = useHistory(7);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Ricarichiamo all'apertura del tab: se l'utente aggiunge pasti da Home
  // vogliamo vederli nel grafico senza dover cambiare periodo.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Larghezza interna: screen - padding ScrollView - padding Card (entrambi spacing.screen).
  const chartWidth = Dimensions.get('window').width - spacing.screen * 4;

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate],
  );

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
            onChange={(next) => {
              setPeriod(next);
              setSelectedDate(null);
            }}
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
          {selectedDay ? (
            <Pressable
              onPress={() => setSelectedDate(null)}
              style={[styles.chartTooltip, shadows.sm]}
              accessibilityRole="button"
              accessibilityLabel="Chiudi dettaglio"
            >
              <Text style={typography.label}>{selectedDay.fullLabel}</Text>
              <Text style={typography.value}>
                {selectedDay.calories.toLocaleString('it-IT')} kcal
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: selectedDay.overTarget
                      ? colors.red
                      : selectedDay.calories > 0
                      ? colors.green
                      : colors.textSec,
                  },
                ]}
              >
                {formatDelta(selectedDay.delta)}
              </Text>
            </Pressable>
          ) : (
            <Text style={typography.caption}>
              Tocca una barra per vedere il dettaglio.
            </Text>
          )}

          <HistoryChart
            days={days}
            period={period}
            target={targetCalories}
            width={chartWidth}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </Card>

        <Card style={styles.listCard}>
          <Text style={typography.label}>Dettaglio giorni</Text>
          {loading && days.length === 0 ? (
            <Text style={[typography.caption, styles.emptyText]}>Caricamento\u2026</Text>
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
                selected={day.date === selectedDate}
                onPress={() =>
                  setSelectedDate((current) => (current === day.date ? null : day.date))
                }
                isLast={idx === arr.length - 1}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Grafico
// -----------------------------------------------------------------------------

type HistoryChartProps = {
  days: HistoryDay[];
  period: HistoryPeriod;
  target: number;
  width: number;
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
};

type StackDatum = {
  x: number;
  y: number;
  date: string;
};

function HistoryChart({
  days,
  period,
  target,
  width,
  selectedDate,
  onSelect,
}: HistoryChartProps) {
  // Due serie impilate: la base verde arriva al minimo fra calorie e target,
  // la porzione rossa rappresenta l'eventuale eccedenza sopra il target.
  // Sommandole si ottengono le calorie totali del giorno.
  const greenData: StackDatum[] = days.map((d, i) => ({
    x: i,
    y: Math.min(d.calories, target),
    date: d.date,
  }));

  const redData: StackDatum[] = days.map((d, i) => ({
    x: i,
    y: Math.max(0, d.calories - target),
    date: d.date,
  }));

  const targetLineData = days.map((_, i) => ({ x: i, y: target }));

  // Domain Y: almeno il target + 10%, espanso se c'è una barra più alta.
  const maxCalories = Math.max(...days.map((d) => d.calories), target);
  const yMax = Math.ceil((maxCalories * 1.1) / 100) * 100;

  // Asse X: per 7 giorni mostriamo ogni tick; per 30 ne mostriamo circa 6
  // per evitare sovrapposizioni.
  const tickValues = days.map((_, i) => i);
  const tickStride = period <= 7 ? 1 : Math.ceil(period / 6);

  return (
    <VictoryChart
      width={width}
      height={CHART_HEIGHT}
      padding={CHART_PADDING}
      domain={{ y: [0, yMax] }}
      domainPadding={{ x: period <= 7 ? 24 : 8 }}
    >
      <VictoryAxis
        tickValues={tickValues}
        tickFormat={(t: number) => {
          const idx = Number(t);
          if (idx % tickStride !== 0) return '';
          return days[idx]?.shortLabel ?? '';
        }}
        style={{
          axis: { stroke: colors.border },
          tickLabels: {
            fill: colors.textSec,
            fontFamily: fontFamily.medium,
            fontSize: 11,
          },
        }}
      />
      <VictoryAxis
        dependentAxis
        tickFormat={(t: number) => `${Math.round(t)}`}
        style={{
          axis: { stroke: 'transparent' },
          grid: { stroke: colors.border, strokeDasharray: '2,4' },
          tickLabels: {
            fill: colors.textSec,
            fontFamily: fontFamily.medium,
            fontSize: 10,
          },
        }}
      />

      <VictoryStack>
        <VictoryBar
          data={greenData}
          barRatio={period <= 7 ? 0.7 : 1}
          cornerRadius={{
            // Arrotonda solo se non c'è la parte rossa sopra.
            top: ({ datum }) => {
              const d = datum as StackDatum | undefined;
              if (!d) return 0;
              return (redData[d.x]?.y ?? 0) > 0 ? 0 : 6;
            },
          }}
          style={{
            data: {
              fill: colors.green,
              opacity: ({ datum }) => {
                const d = datum as StackDatum | undefined;
                if (!d) return 1;
                return selectedDate === null || d.date === selectedDate ? 1 : 0.4;
              },
            },
          }}
          events={[
            {
              target: 'data',
              eventHandlers: {
                onPressIn: () => [
                  {
                    target: 'data',
                    mutation: (props) => {
                      const d = props.datum as StackDatum | undefined;
                      if (!d) return null;
                      onSelect(selectedDate === d.date ? null : d.date);
                      return null;
                    },
                  },
                ],
              },
            },
          ]}
        />
        <VictoryBar
          data={redData}
          barRatio={period <= 7 ? 0.7 : 1}
          cornerRadius={{ top: 6 }}
          style={{
            data: {
              fill: colors.red,
              opacity: ({ datum }) => {
                const d = datum as StackDatum | undefined;
                if (!d) return 1;
                return selectedDate === null || d.date === selectedDate ? 1 : 0.4;
              },
            },
          }}
          events={[
            {
              target: 'data',
              eventHandlers: {
                onPressIn: () => [
                  {
                    target: 'data',
                    mutation: (props) => {
                      const d = props.datum as StackDatum | undefined;
                      if (!d) return null;
                      onSelect(selectedDate === d.date ? null : d.date);
                      return null;
                    },
                  },
                ],
              },
            },
          ]}
        />
      </VictoryStack>

      <VictoryLine
        data={targetLineData}
        style={{
          data: {
            stroke: colors.red,
            strokeDasharray: '6,4',
            strokeWidth: 1.5,
          },
        }}
      />
    </VictoryChart>
  );
}

// -----------------------------------------------------------------------------
// Componenti minori
// -----------------------------------------------------------------------------

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
  selected,
  onPress,
  isLast,
}: {
  day: HistoryDay;
  target: number;
  selected: boolean;
  onPress: () => void;
  isLast: boolean;
}) {
  const hasData = day.calories > 0;
  const deltaColor = !hasData
    ? colors.textSec
    : day.overTarget
    ? colors.red
    : colors.green;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayRow,
        !isLast && styles.dayRowDivider,
        selected && styles.dayRowSelected,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${day.fullLabel}, ${day.calories} kcal`}
    >
      <View style={styles.dayRowText}>
        <Text style={typography.body}>{day.fullLabel}</Text>
        <Text style={typography.caption}>
          Target {Math.round(target).toLocaleString('it-IT')} kcal
        </Text>
      </View>
      <View style={styles.dayRowValues}>
        <Text style={typography.bodyBold}>
          {hasData ? `${day.calories.toLocaleString('it-IT')} kcal` : '\u2014'}
        </Text>
        <Text style={[typography.caption, { color: deltaColor }]}>
          {hasData ? formatDelta(day.delta) : 'Nessun pasto'}
        </Text>
      </View>
    </Pressable>
  );
}

function formatDelta(delta: number): string {
  if (delta === 0) return 'In target';
  const sign = delta > 0 ? '+' : '\u2212';
  const abs = Math.abs(delta).toLocaleString('it-IT');
  return `${sign}${abs} kcal`;
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

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
  chartTooltip: {
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
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
  dayRowSelected: {
    backgroundColor: colors.bg,
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
