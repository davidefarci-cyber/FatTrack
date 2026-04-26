import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import type { HistoryInsights } from '@/hooks/useHistory';
import { colors, radii, spacing, typography } from '@/theme';

type HistoryInsightsRowProps = {
  insights: HistoryInsights;
  hasProfileTarget: boolean;
};

export function HistoryInsightsRow({
  insights,
  hasProfileTarget,
}: HistoryInsightsRowProps) {
  const { streakDays, trendKcalDelta, trendDirection, bestDay } = insights;

  const streakHeadline =
    !hasProfileTarget
      ? '—'
      : streakDays > 0
      ? `${streakDays} ${streakDays === 1 ? 'giorno' : 'giorni'}`
      : '0';
  const streakBody = !hasProfileTarget
    ? 'Imposta un target in Impostazioni per vedere lo streak.'
    : streakDays > 0
    ? streakDays === 1
      ? 'in target'
      : 'consecutivi in target'
    : 'Inizia oggi: registra le calorie giornaliere.';

  let trendHeadline: string;
  let trendBody: string;
  let trendIcon: IconName | null;
  let trendIconColor: string;
  if (!hasProfileTarget) {
    trendHeadline = '—';
    trendBody = 'Imposta un target per vedere il trend.';
    trendIcon = null;
    trendIconColor = colors.textSec;
  } else if (trendKcalDelta === null) {
    trendHeadline = '—';
    trendBody = 'Servono 14 giorni di dati per il trend.';
    trendIcon = null;
    trendIconColor = colors.textSec;
  } else if (trendDirection === 'flat') {
    trendHeadline = 'Stabile';
    trendBody = 'rispetto alla settimana scorsa';
    trendIcon = null;
    trendIconColor = colors.textSec;
  } else {
    const sign = trendKcalDelta > 0 ? '+' : '−';
    const abs = Math.abs(trendKcalDelta).toLocaleString('it-IT');
    trendHeadline = `${sign}${abs} kcal`;
    trendBody = 'vs settimana scorsa';
    trendIcon = trendDirection === 'up' ? 'chevron-up' : 'chevron-down';
    trendIconColor = colors.text;
  }

  const bestHeadline = !hasProfileTarget
    ? '—'
    : bestDay !== null
    ? `${bestDay.deltaKcal.toLocaleString('it-IT')} kcal`
    : '—';
  const bestBody = !hasProfileTarget
    ? 'Imposta un target per vedere il giorno migliore.'
    : bestDay !== null
    ? `${bestDay.fullLabel} · dal target`
    : 'Registra qualche pasto per vedere il giorno migliore.';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollWrap}
      contentContainerStyle={styles.scroll}
    >
      <InsightTile
        label="Streak"
        headline={streakHeadline}
        body={streakBody}
        icon="check"
        accent={hasProfileTarget && streakDays > 0 ? colors.green : colors.textSec}
      />
      <InsightTile
        label="Trend"
        headline={trendHeadline}
        body={trendBody}
        icon={trendIcon}
        accent={trendIconColor}
      />
      <InsightTile
        label="Giorno migliore"
        headline={bestHeadline}
        body={bestBody}
        icon="target"
        accent={
          hasProfileTarget && bestDay !== null ? colors.purple : colors.textSec
        }
      />
    </ScrollView>
  );
}

function InsightTile({
  label,
  headline,
  body,
  icon,
  accent,
}: {
  label: string;
  headline: string;
  body: string;
  icon: IconName | null;
  accent: string;
}) {
  return (
    <Card style={styles.tile}>
      <View style={styles.tileHeader}>
        <Text style={typography.label}>{label}</Text>
        {icon ? <Icon name={icon} size={14} color={accent} /> : null}
      </View>
      <Text style={[typography.value, { color: accent }]} numberOfLines={1}>
        {headline}
      </Text>
      <Text style={typography.caption}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Estende lo scroll fino al bordo dello schermo, neutralizzando il padding
  // del genitore. Consente al primo tile di partire dal margine sinistro
  // dello screen e all'ultimo di scorrere oltre il bordo destro.
  scrollWrap: {
    marginHorizontal: -spacing.screen,
  },
  scroll: {
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  tile: {
    width: 200,
    padding: spacing.xl,
    gap: spacing.xs,
    borderRadius: radii.lg,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
