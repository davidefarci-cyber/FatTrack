import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { HistoryDay, HistoryPeriod } from '@/hooks/useHistory';
import { colors, fontFamily, spacing, typography } from '@/theme';

type HistoryChartProps = {
  days: HistoryDay[];
  period: HistoryPeriod;
  target: number;
  width: number;
};

const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 16, bottom: 28, left: 40 };
const TARGET_LABEL = 'Obiettivo';

// Grafico a barre impilate disegnato a mano con react-native-svg.
// Scelta: niente Victory per evitare il peso di victory-native; i requisiti
// (barre verdi/rosse impilate, linea obiettivo tratteggiata, opacità passato)
// sono elementari da esprimere come primitive SVG.
export function HistoryChart({ days, period, target, width }: HistoryChartProps) {
  if (days.length === 0 || width <= 0) {
    return (
      <View style={[styles.empty, { height: CHART_HEIGHT }]}>
        <Text style={typography.caption}>Nessun dato nel periodo.</Text>
      </View>
    );
  }

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 1);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const maxCalories = Math.max(...days.map((d) => d.calories), target, 1);
  const yMax = Math.ceil((maxCalories * 1.1) / 100) * 100;

  const slot = plotWidth / days.length;
  const barWidth = Math.max(Math.min(period <= 7 ? 30 : 7, slot * 0.72), 3);

  const targetY = PADDING.top + plotHeight * (1 - target / yMax);
  const yTicks = buildYTicks(yMax);

  const todayIdx = days.length - 1;
  const todayLabelStride = period <= 7 ? 1 : Math.ceil(period / 6);

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* Y gridlines tratteggiate */}
        {yTicks.map((tick) => {
          const y = PADDING.top + plotHeight * (1 - tick / yMax);
          return (
            <G key={`grid-${tick}`}>
              <Line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + plotWidth}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="2,4"
              />
              <SvgText
                x={PADDING.left - 6}
                y={y + 3}
                fill={colors.textSec}
                fontFamily={fontFamily.medium}
                fontSize={10}
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </G>
          );
        })}

        {/* Barre verdi (fino al target) + rosse (eccesso) */}
        {days.map((d, i) => {
          const cx = PADDING.left + slot * (i + 0.5);
          const x = cx - barWidth / 2;
          const greenValue = Math.min(d.calories, target);
          const redValue = Math.max(0, d.calories - target);
          const greenH = plotHeight * (greenValue / yMax);
          const redH = plotHeight * (redValue / yMax);
          const greenY = PADDING.top + plotHeight - greenH;
          const redY = greenY - redH;
          const opacity = i === todayIdx ? 1 : 0.65;
          return (
            <G key={d.date}>
              {greenH > 0 ? (
                <Rect
                  x={x}
                  y={greenY}
                  width={barWidth}
                  height={greenH}
                  rx={3}
                  fill={colors.green}
                  opacity={opacity}
                />
              ) : null}
              {redH > 0 ? (
                <Rect
                  x={x}
                  y={redY}
                  width={barWidth}
                  height={redH}
                  rx={3}
                  fill={colors.red}
                  opacity={opacity}
                />
              ) : null}
            </G>
          );
        })}

        {/* Linea target tratteggiata + etichetta */}
        <Line
          x1={PADDING.left}
          y1={targetY}
          x2={PADDING.left + plotWidth}
          y2={targetY}
          stroke={colors.red}
          strokeWidth={1.5}
          strokeDasharray="6,4"
        />
        <SvgText
          x={PADDING.left + plotWidth - 4}
          y={targetY - 4}
          fill={colors.red}
          fontFamily={fontFamily.semibold}
          fontSize={10}
          textAnchor="end"
        >
          {`${TARGET_LABEL} ${Math.round(target).toLocaleString('it-IT')}`}
        </SvgText>

        {/* Etichette asse X */}
        {days.map((d, i) => {
          if (i % todayLabelStride !== 0 && i !== todayIdx) return null;
          const cx = PADDING.left + slot * (i + 0.5);
          return (
            <SvgText
              key={`lbl-${d.date}`}
              x={cx}
              y={CHART_HEIGHT - 8}
              fill={colors.textSec}
              fontFamily={fontFamily.medium}
              fontSize={10}
              textAnchor="middle"
            >
              {d.shortLabel}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function buildYTicks(yMax: number): number[] {
  if (yMax <= 0) return [0];
  const step = niceStep(yMax / 4);
  const out: number[] = [];
  for (let v = 0; v <= yMax + 1; v += step) {
    out.push(v);
  }
  return out;
}

function niceStep(raw: number): number {
  if (raw <= 0) return 100;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  let rounded: number;
  if (n <= 1) rounded = 1;
  else if (n <= 2) rounded = 2;
  else if (n <= 5) rounded = 5;
  else rounded = 10;
  return rounded * pow;
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
});
