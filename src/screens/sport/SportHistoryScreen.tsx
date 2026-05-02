import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SessionDetailModal } from '@/components/sport/SessionDetailModal';
import { sessionsDB } from '@/database';
import type { Session } from '@/database';
import { colors, radii, spacing, sportPalette, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import type { SportTabParamList } from '@/types';

// Storico sessioni (Fase 4): SegmentedControl periodo + Card riepilogo +
// lista sessioni filtrate. Tap su una sessione → SessionDetailModal.
//
// Deep-link da SportHomeScreen "Ultimo allenamento": il param di rotta
// `openSessionId` apre direttamente il modal del session passato. Lo
// resettiamo dopo l'apertura per non riaprire il modal a ogni focus.

type Period = '7d' | '30d' | 'all';

const PERIOD_OPTIONS: ReadonlyArray<{ value: Period; label: string }> = [
  { value: '7d', label: '7 gg' },
  { value: '30d', label: '30 gg' },
  { value: 'all', label: 'Tutto' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function parseSqlIso(s: string): number {
  if (!s) return Date.now();
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.now();
}

function formatShortDate(startedAt: string): string {
  const ms = parseSqlIso(startedAt);
  return new Date(ms)
    .toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
    .replace('.', '');
}

export default function SportHistoryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const route = useRoute<RouteProp<SportTabParamList, 'History'>>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [openId, setOpenId] = useState<number | null>(null);
  const [paramConsumed, setParamConsumed] = useState(false);

  const reload = useCallback(async () => {
    try {
      const rows = await sessionsDB.getAllSessions();
      setSessions(rows);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload solo via useFocusEffect: è già la prima volta al mount + ad
  // ogni focus successivo. Avere anche un useEffect su [reload] sarebbe
  // ridondante e produrrebbe due query al primo render.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Apertura on-demand quando arriviamo dalla Home con openSessionId.
  // Resettiamo il flag dopo l'apertura così il modal non si riapre
  // tornando in tab da un'altra rotta.
  useEffect(() => {
    const id = route.params?.openSessionId;
    if (id !== undefined && !paramConsumed) {
      setOpenId(id);
      setParamConsumed(true);
    }
  }, [route.params?.openSessionId, paramConsumed]);

  const filtered = useMemo(() => {
    if (period === 'all') return sessions;
    const cutoffDays = period === '7d' ? 7 : 30;
    const cutoff = Date.now() - cutoffDays * DAY_MS;
    return sessions.filter((s) => parseSqlIso(s.startedAt) >= cutoff);
  }, [sessions, period]);

  const summary = useMemo(() => {
    let totalMinutes = 0;
    let totalCalories = 0;
    for (const s of filtered) {
      if (s.durationSec) totalMinutes += Math.round(s.durationSec / 60);
      if (s.caloriesEstimated) totalCalories += s.caloriesEstimated;
    }
    return {
      totalSessions: filtered.length,
      totalMinutes,
      totalCalories,
    };
  }, [filtered]);

  const maxMinutes = useMemo(() => {
    let m = 0;
    for (const s of filtered) {
      const min = Math.round((s.durationSec ?? 0) / 60);
      if (min > m) m = min;
    }
    return m;
  }, [filtered]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Storico"
        subtitle="Le tue sessioni"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
      >
        <SegmentedControl
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />

        <Card style={styles.summaryCard}>
          <Text style={typography.label}>Riepilogo periodo</Text>
          <Text style={typography.body}>
            {summary.totalSessions}{' '}
            {summary.totalSessions === 1 ? 'sessione' : 'sessioni'} ·{' '}
            {summary.totalMinutes} min · {summary.totalCalories} kcal
          </Text>
        </Card>

        {loading ? (
          <Card style={styles.placeholder}>
            <ActivityIndicator color={colors.textSec} />
          </Card>
        ) : filtered.length === 0 ? (
          <Card style={styles.placeholder}>
            <Text style={typography.body}>Nessuna sessione</Text>
            <Text style={typography.caption}>
              Nessuna sessione nel periodo.
            </Text>
          </Card>
        ) : (
          filtered.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              maxMinutes={maxMinutes}
              accent={theme.accent}
              onPress={() => setOpenId(s.id)}
            />
          ))
        )}
      </ScrollView>

      <SessionDetailModal
        visible={openId !== null}
        sessionId={openId}
        onClose={() => setOpenId(null)}
      />
    </View>
  );
}

type SessionRowProps = {
  session: Session;
  maxMinutes: number;
  accent: string;
  onPress: () => void;
};

function SessionRow({ session, maxMinutes, accent, onPress }: SessionRowProps) {
  const palette =
    session.category in sportPalette
      ? sportPalette[session.category as keyof typeof sportPalette]
      : null;
  const minutes = Math.round((session.durationSec ?? 0) / 60);
  const calories = session.caloriesEstimated ?? 0;
  const barWidthPct = maxMinutes > 0 ? Math.round((minutes / maxMinutes) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Apri sessione del ${formatShortDate(session.startedAt)}`}
    >
      <Card style={styles.row}>
        <View style={styles.rowHead}>
          <View style={styles.rowTitle}>
            <Text style={typography.body} numberOfLines={1}>
              {session.workoutName}
            </Text>
            <Text style={typography.caption}>
              {formatShortDate(session.startedAt)}
            </Text>
          </View>
          {palette ? (
            <View style={[styles.badge, { backgroundColor: palette.bg }]}>
              <Text style={[typography.bodyBold, { color: palette.color }]}>
                {palette.label}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={typography.caption}>
          {minutes} min · {calories} kcal
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${barWidthPct}%`, backgroundColor: accent },
            ]}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  summaryCard: {
    padding: spacing.screen,
    gap: spacing.sm,
  },
  placeholder: {
    padding: spacing.screen,
    gap: spacing.sm,
    alignItems: 'center',
  },
  row: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  barTrack: {
    height: 8,
    borderRadius: radii.round,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.round,
  },
});
