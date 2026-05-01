import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/CalorieRing';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { WorkoutPickerSheet } from '@/components/sport/WorkoutPickerSheet';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { workoutsDB } from '@/database';
import type { Workout } from '@/database';
import { useSportStats } from '@/hooks/useSportStats';
import {
  APP_NAME_SPORT,
  colors,
  radii,
  spacing,
  sportPalette,
  typography,
} from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import type { SportTabParamList } from '@/types';

// Dashboard sport (Fase 4): tre Card sopra al cog di SportSettings.
//
// 1. "Allenamento di oggi"
//    - Sessione attiva ⇒ mostra "in corso" + Riprendi (riapre la
//      ActiveSessionScreen via setPendingOpen del context).
//    - Altrimenti scheda preselezionata = ultima usata (lookup
//      su getAllSessions()[0].workoutId, se la scheda esiste ancora);
//      fallback al primo preset. L'utente può cambiarla dal sheet
//      "Cambia scheda" — selezione locale, non persistita.
// 2. "Questa settimana": ring giorni allenati / target 4, sotto i
//    minuti/calorie totali dalla settimana corrente (lunedì→ora).
// 3. "Ultimo allenamento" (solo se esiste): nome scheda + data
//    relativa + count esercizi/set/durata. Tap → naviga a Storico
//    con openSessionId per aprire il modal di dettaglio.

export default function SportHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<BottomTabNavigationProp<SportTabParamList>>();
  const theme = useAppTheme();
  const stats = useSportStats();
  const {
    state: activeSessionState,
    start,
    requestOpen,
  } = useActiveSession();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [overrideWorkoutId, setOverrideWorkoutId] = useState<number | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadWorkouts = useCallback(async () => {
    try {
      const rows = await workoutsDB.getAllWorkouts();
      setWorkouts(rows);
    } catch {
      setWorkouts([]);
    } finally {
      setWorkoutsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  // Refresh quando l'utente torna in tab Home: la lista workouts può
  // essere cambiata in WorkoutsScreen, e useSportStats già si
  // re-aggiorna alla chiusura sessione.
  useFocusEffect(
    useCallback(() => {
      void loadWorkouts();
      void stats.reload();
    }, [loadWorkouts, stats]),
  );

  const lastSessionWorkoutId = stats.last?.session.workoutId ?? null;

  // Scheda preselezionata: override locale > ultima usata > primo preset.
  const todaysWorkout: Workout | null = (() => {
    if (overrideWorkoutId !== null) {
      const found = workouts.find((w) => w.id === overrideWorkoutId);
      if (found) return found;
    }
    if (lastSessionWorkoutId !== null) {
      const found = workouts.find((w) => w.id === lastSessionWorkoutId);
      if (found) return found;
    }
    return workouts.find((w) => w.isPreset) ?? workouts[0] ?? null;
  })();

  const handleStart = async () => {
    if (activeSessionState) {
      // Sessione già attiva → riapertura della ActiveSessionScreen.
      // requestOpen alza pendingOpen=true; SportTabNavigator lo osserva
      // e rimonta il modal in cima. Niente start() qui (throwerebbe).
      requestOpen();
      return;
    }
    if (!todaysWorkout) return;
    setStarting(true);
    try {
      await start(todaysWorkout.id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Avvio sessione non riuscito';
      Alert.alert('Errore', msg);
    } finally {
      setStarting(false);
    }
  };

  const handleOpenLast = async () => {
    if (!stats.last) return;
    navigation.navigate('History', {
      openSessionId: stats.last.session.id,
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={APP_NAME_SPORT}
        subtitle="Modalità sport"
        style={{ paddingTop: insets.top + spacing.xl }}
        right={
          <Pressable
            onPress={() => navigation.navigate('SportSettings')}
            accessibilityRole="button"
            accessibilityLabel="Apri impostazioni sport"
            hitSlop={8}
          >
            <Icon name="cog" size={22} color={colors.textSec} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 2 },
        ]}
      >
        <TodayCard
          workout={todaysWorkout}
          loading={workoutsLoading}
          activeWorkoutName={
            activeSessionState ? activeSessionState.workout.name : null
          }
          starting={starting}
          accent={theme.accent}
          accentDark={theme.accentDark}
          onStart={handleStart}
          onChangeWorkout={() => setPickerOpen(true)}
        />

        <WeekCard
          daysTrained={stats.week.daysTrained}
          weeklyTarget={stats.week.weeklyTarget}
          totalMinutes={stats.week.totalMinutes}
          totalCalories={stats.week.totalCalories}
          accent={theme.accent}
        />

        {stats.last ? (
          <LastSessionCard
            workoutName={stats.last.session.workoutName}
            category={stats.last.session.category}
            startedAt={stats.last.session.startedAt}
            durationMin={Math.round(
              (stats.last.session.durationSec ?? 0) / 60,
            )}
            exerciseCount={stats.last.exerciseCount}
            setCount={stats.last.setCount}
            onPress={handleOpenLast}
          />
        ) : null}

        {stats.loading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={colors.textSec} />
          </Card>
        ) : null}
      </ScrollView>

      <WorkoutPickerSheet
        visible={pickerOpen}
        workouts={workouts}
        selectedId={todaysWorkout?.id ?? null}
        onPick={(id) => {
          setOverrideWorkoutId(id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

type TodayCardProps = {
  workout: Workout | null;
  loading: boolean;
  activeWorkoutName: string | null;
  starting: boolean;
  accent: string;
  accentDark: string;
  onStart: () => void;
  onChangeWorkout: () => void;
};

function TodayCard({
  workout,
  loading,
  activeWorkoutName,
  starting,
  accent,
  accentDark,
  onStart,
  onChangeWorkout,
}: TodayCardProps) {
  const isActive = activeWorkoutName !== null;
  const ctaLabel = isActive ? 'Riprendi' : 'Inizia ora';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Icon name="bolt" size={22} color={accent} />
        <Text style={typography.bodyBold}>
          {isActive ? 'Sessione in corso' : 'Allenamento di oggi'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.textSec} />
      ) : isActive ? (
        <>
          <View style={styles.todayMeta}>
            <Text style={typography.h1} numberOfLines={1}>
              {activeWorkoutName}
            </Text>
            <Text style={typography.caption}>
              Riprendi dove hai lasciato.
            </Text>
          </View>
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Riprendi sessione"
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[typography.bodyBold, { color: colors.card }]}>
              {ctaLabel}
            </Text>
          </Pressable>
        </>
      ) : workout ? (
        <>
          <View style={styles.todayMeta}>
            <Text style={typography.h1} numberOfLines={1}>
              {workout.name}
            </Text>
            <Text style={typography.caption}>
              {sportPalette[workout.category].label} ·{' '}
              {workout.exercises.length}{' '}
              {workout.exercises.length === 1 ? 'esercizio' : 'esercizi'}
              {workout.estimatedDurationMin !== null
                ? ` · ${workout.estimatedDurationMin} min`
                : ''}
            </Text>
          </View>

          <Pressable
            onPress={starting ? undefined : onStart}
            accessibilityRole="button"
            accessibilityLabel={`Inizia ora ${workout.name}`}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: accent },
              pressed && !starting && styles.pressed,
              starting && styles.disabled,
            ]}
          >
            {starting ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={[typography.bodyBold, { color: colors.card }]}>
                {ctaLabel}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onChangeWorkout}
            accessibilityRole="button"
            accessibilityLabel="Cambia scheda"
            style={styles.linkBtn}
          >
            <Text style={[typography.bodyBold, { color: accentDark }]}>
              Cambia scheda
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={typography.caption}>
          Nessuna scheda disponibile. Crea la tua prima scheda dal tab Schede.
        </Text>
      )}
    </Card>
  );
}

type WeekCardProps = {
  daysTrained: number;
  weeklyTarget: number;
  totalMinutes: number;
  totalCalories: number;
  accent: string;
};

function WeekCard({
  daysTrained,
  weeklyTarget,
  totalMinutes,
  totalCalories,
  accent,
}: WeekCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Icon name="flame" size={22} color={accent} />
        <Text style={typography.bodyBold}>Questa settimana</Text>
      </View>
      <View style={styles.weekRingWrap}>
        <CalorieRing
          consumed={daysTrained}
          target={weeklyTarget}
          accent={accent}
          unit="giorni"
        />
      </View>
      <Text style={[typography.caption, styles.weekStats]}>
        {totalMinutes} min totali · {totalCalories} kcal bruciate
      </Text>
    </Card>
  );
}

type LastSessionCardProps = {
  workoutName: string;
  category: string;
  startedAt: string;
  durationMin: number;
  exerciseCount: number;
  setCount: number;
  onPress: () => void;
};

function formatRelativeDate(startedAt: string): string {
  const ms = Date.parse(
    startedAt.includes('T') ? startedAt : `${startedAt.replace(' ', 'T')}Z`,
  );
  if (!Number.isFinite(ms)) return startedAt;
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((startOfToday - ms) / dayMs);
  if (diffDays <= 0) return 'oggi';
  if (diffDays === 1) return 'ieri';
  if (diffDays < 7) return `${diffDays} giorni fa`;
  const d = new Date(ms);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function LastSessionCard({
  workoutName,
  category,
  startedAt,
  durationMin,
  exerciseCount,
  setCount,
  onPress,
}: LastSessionCardProps) {
  const palette =
    category in sportPalette
      ? sportPalette[category as keyof typeof sportPalette]
      : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Apri ultima sessione ${workoutName}`}
    >
      <Card style={styles.card}>
        <Text style={typography.label}>Ultimo allenamento</Text>
        <View style={styles.lastHeader}>
          <View style={styles.lastTitle}>
            <Text style={typography.body} numberOfLines={1}>
              {workoutName}
            </Text>
            <Text style={typography.caption}>
              {formatRelativeDate(startedAt)}
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
          {exerciseCount} {exerciseCount === 1 ? 'esercizio' : 'esercizi'} ·{' '}
          {setCount} set · {durationMin} min
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.screen, gap: spacing.screen },
  card: { padding: spacing.screen, gap: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  todayMeta: {
    gap: spacing.xs,
  },
  startBtn: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.screen,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  linkBtn: {
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
  weekRingWrap: {
    alignItems: 'center',
  },
  weekStats: {
    textAlign: 'center',
  },
  loadingCard: {
    padding: spacing.screen,
    alignItems: 'center',
  },
  lastHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  lastTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
});
