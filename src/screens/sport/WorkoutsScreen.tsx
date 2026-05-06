import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { FAB } from '@/components/FAB';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { ProgramDetailModal } from '@/components/sport/ProgramDetailModal';
import { WorkoutDetailModal } from '@/components/sport/WorkoutDetailModal';
import { WorkoutEditorModal } from '@/components/sport/WorkoutEditorModal';
import {
  WorkoutsIntroModal,
  type WorkoutsIntroKind,
} from '@/components/sport/WorkoutsIntroModal';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { programsDB, workoutsDB } from '@/database';
import type {
  EquipmentTag,
  NewWorkout,
  Program,
  Workout,
  WorkoutGoal,
  WorkoutLevel,
} from '@/database';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useProfile } from '@/hooks/useProfile';
import { usePrograms } from '@/hooks/usePrograms';
import { colors, radii, shadows, spacing, sportPalette, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import type { SportTabParamList } from '@/types';

// Lista unica "Schede" che mescola programmi multi-giorno e schede sciolte.
// I 12 workout interni ai programmi NON compaiono come voci individuali
// (l'utente li esegue dal dettaglio del programma, in ordine). I workout
// preset sciolti (Full Body Casa, PPL, Mobilità mattina) e quelli utente
// restano come voci singole. Tutti i filtri (goal/livello/durata/
// equipment) si applicano a entrambi i tipi di item.

type GoalFilter = 'all' | WorkoutGoal;
type LevelFilter = 'all' | WorkoutLevel;
type DurationFilter = 'all' | 'short' | 'medium' | 'long';

const GOAL_FILTER_OPTIONS: ReadonlyArray<{ value: GoalFilter; label: string }> = [
  { value: 'all', label: 'Tutti' },
  { value: 'dimagrimento', label: 'Dimagrimento' },
  { value: 'resistenza', label: 'Resistenza' },
  { value: 'mantenimento', label: 'Mantenimento' },
  { value: 'mobilita', label: 'Mobilità' },
];

const LEVEL_FILTER_OPTIONS: ReadonlyArray<{
  value: LevelFilter;
  label: string;
}> = [
  { value: 'all', label: 'Tutti' },
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzato', label: 'Avanzato' },
];

const DURATION_FILTER_OPTIONS: ReadonlyArray<{
  value: DurationFilter;
  label: string;
}> = [
  { value: 'all', label: 'Tutte' },
  { value: 'short', label: '≤ 25 min' },
  { value: 'medium', label: '25–45 min' },
  { value: 'long', label: '> 45 min' },
];

const GOAL_LABELS: Record<string, string> = {
  dimagrimento: 'Dimagrimento',
  resistenza: 'Resistenza',
  mantenimento: 'Mantenimento',
  mobilita: 'Mobilità',
};

function matchesDuration(
  estimated: number | null,
  filter: DurationFilter,
): boolean {
  if (filter === 'all') return true;
  // Senza durata stimata non possiamo decidere; filtriamo via per non
  // mostrare item di durata sconosciuta sotto un filtro specifico.
  if (estimated === null) return false;
  if (filter === 'short') return estimated <= 25;
  if (filter === 'medium') return estimated > 25 && estimated <= 45;
  return estimated > 45;
}

function isExecutable(
  required: EquipmentTag[],
  available: EquipmentTag[],
): boolean {
  if (required.length === 0) return true;
  const set = new Set(available);
  return required.every((tag) => set.has(tag));
}

// Per ogni programma derivo durata massima dei suoi giorni e l'union dei
// requiredEquipment così posso filtrarlo come fosse un singolo item.
type ProgramView = {
  program: Program;
  maxDuration: number | null;
  requiredEquipment: EquipmentTag[];
};

function deriveProgramView(
  program: Program,
  workoutsById: Map<number, Workout>,
): ProgramView {
  const ws = program.workouts
    .map((pw) => workoutsById.get(pw.workoutId))
    .filter((w): w is Workout => w !== undefined);
  const durations = ws
    .map((w) => w.estimatedDurationMin)
    .filter((d): d is number => d !== null);
  const maxDuration = durations.length > 0 ? Math.max(...durations) : null;
  const eq = new Set<EquipmentTag>();
  for (const w of ws) for (const t of w.requiredEquipment) eq.add(t);
  return { program, maxDuration, requiredEquipment: Array.from(eq) };
}

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<BottomTabNavigationProp<SportTabParamList>>();
  const toast = useToast();
  const { state: activeSessionState, start } = useActiveSession();
  const { programs } = usePrograms();
  const {
    active: activeProgramRow,
    setActive: setActiveProgram,
    clearActive: clearActiveProgram,
  } = useActiveProgram();
  const { profile } = useProfile();
  const { coachMarksSeen, markCoachMarkSeen } = useAppSettings();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [programWorkoutIds, setProgramWorkoutIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState<Workout | null>(null);
  const [openProgram, setOpenProgram] = useState<Program | null>(null);
  const [editing, setEditing] = useState<Workout | 'new' | null>(null);

  // Filtri.
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [onlyExecutable, setOnlyExecutable] = useState(false);

  // Onboarding intro: due banner sequenziali (equipment → programs).
  const introToShow: WorkoutsIntroKind | null = (() => {
    if (!coachMarksSeen.workoutsEquipmentIntro) return 'equipment';
    if (!coachMarksSeen.workoutsProgramsNews) return 'programs';
    return null;
  })();
  const [introVisible, setIntroVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (introToShow !== null) setIntroVisible(true);
    }, [introToShow]),
  );

  const reload = useCallback(async () => {
    try {
      const [rows, ids] = await Promise.all([
        workoutsDB.getAllWorkouts(),
        programsDB.getWorkoutIdsInPrograms(),
      ]);
      setWorkouts(rows);
      setProgramWorkoutIds(ids);
    } catch (err) {
      console.warn('Workouts load failed', err);
      setWorkouts([]);
      setProgramWorkoutIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSave = useCallback(
    async (input: NewWorkout) => {
      if (editing && editing !== 'new') {
        await workoutsDB.updateWorkout(editing.id, input);
        toast.show('Scheda aggiornata');
      } else {
        await workoutsDB.createWorkout(input);
        toast.show('Scheda creata');
      }
      await reload();
    },
    [editing, reload, toast],
  );

  const handleDelete = useCallback(
    async (workout: Workout) => {
      try {
        await workoutsDB.deleteWorkout(workout.id);
        toast.show('Scheda eliminata');
        await reload();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Eliminazione non riuscita';
        toast.show(msg);
      }
    },
    [reload, toast],
  );

  const handleDuplicate = useCallback(
    async (workout: Workout) => {
      try {
        const copy = await workoutsDB.duplicateWorkout(workout.id);
        await reload();
        setOpenDetail(null);
        setEditing(copy);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Duplicazione non riuscita';
        toast.show(msg);
      }
    },
    [reload, toast],
  );

  const handleAction = useCallback(
    (workout: Workout) => {
      setOpenDetail(null);
      if (workout.isPreset) {
        handleDuplicate(workout);
      } else {
        setEditing(workout);
      }
    },
    [handleDuplicate],
  );

  const handleStart = useCallback(
    async (workout: Workout) => {
      if (activeSessionState) {
        Alert.alert(
          'Sessione già attiva',
          'Termina la sessione corrente prima di iniziarne una nuova.',
        );
        return;
      }
      try {
        await start(workout.id);
        setOpenDetail(null);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Avvio sessione non riuscito';
        toast.show(msg);
      }
    },
    [activeSessionState, start, toast],
  );

  const availableEquipment: EquipmentTag[] = profile?.availableEquipment ?? [];
  const canFilterEquipment = availableEquipment.length > 0;

  // Lookup workout per id (include i workout-of-program — servono solo
  // alla derivazione di durata/equipment del programma, NON alla lista).
  const workoutsById = useMemo(() => {
    const m = new Map<number, Workout>();
    for (const w of workouts) m.set(w.id, w);
    return m;
  }, [workouts]);

  // Programmi filtrati: applico goal/livello/durata/equipment usando
  // i metadati derivati dai loro workout interni.
  const programViews = useMemo(() => {
    return programs.map((p) => deriveProgramView(p, workoutsById));
  }, [programs, workoutsById]);

  const filteredPrograms = useMemo(() => {
    return programViews.filter(({ program, maxDuration, requiredEquipment }) => {
      if (goalFilter !== 'all' && program.goal !== goalFilter) return false;
      if (levelFilter !== 'all' && program.level !== levelFilter) return false;
      if (!matchesDuration(maxDuration, durationFilter)) return false;
      if (
        onlyExecutable &&
        canFilterEquipment &&
        !isExecutable(requiredEquipment, availableEquipment)
      ) {
        return false;
      }
      return true;
    });
  }, [
    programViews,
    goalFilter,
    levelFilter,
    durationFilter,
    onlyExecutable,
    canFilterEquipment,
    availableEquipment,
  ]);

  // Schede sciolte: tutti i workout NON dentro un programma, filtrati.
  const filteredStandaloneWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      if (programWorkoutIds.has(w.id)) return false;
      if (goalFilter !== 'all' && w.goal !== goalFilter) return false;
      if (levelFilter !== 'all' && w.level !== levelFilter) return false;
      if (!matchesDuration(w.estimatedDurationMin, durationFilter)) return false;
      if (
        onlyExecutable &&
        canFilterEquipment &&
        !isExecutable(w.requiredEquipment, availableEquipment)
      ) {
        return false;
      }
      return true;
    });
  }, [
    workouts,
    programWorkoutIds,
    goalFilter,
    levelFilter,
    durationFilter,
    onlyExecutable,
    canFilterEquipment,
    availableEquipment,
  ]);

  // Ordine programmi: attivo in cima.
  const orderedPrograms = useMemo(() => {
    const activeId = activeProgramRow?.programId ?? null;
    return [...filteredPrograms].sort((a, b) => {
      if (a.program.id === activeId) return -1;
      if (b.program.id === activeId) return 1;
      return 0;
    });
  }, [filteredPrograms, activeProgramRow?.programId]);

  const filtersActive =
    goalFilter !== 'all' ||
    levelFilter !== 'all' ||
    durationFilter !== 'all' ||
    onlyExecutable;

  const totalItems = programs.length + workouts.filter((w) => !programWorkoutIds.has(w.id)).length;
  const filteredCount =
    orderedPrograms.length + filteredStandaloneWorkouts.length;

  const resetFilters = () => {
    setGoalFilter('all');
    setLevelFilter('all');
    setDurationFilter('all');
    setOnlyExecutable(false);
  };

  const handleIntroPrimary = useCallback(async () => {
    if (introToShow === 'equipment') {
      await markCoachMarkSeen('workoutsEquipmentIntro');
      setIntroVisible(false);
      navigation.navigate('SportSettings');
    } else if (introToShow === 'programs') {
      await markCoachMarkSeen('workoutsProgramsNews');
      setIntroVisible(false);
    }
  }, [introToShow, markCoachMarkSeen, navigation]);

  const handleIntroDismiss = useCallback(async () => {
    if (introToShow === 'equipment') {
      await markCoachMarkSeen('workoutsEquipmentIntro');
    } else if (introToShow === 'programs') {
      await markCoachMarkSeen('workoutsProgramsNews');
    }
    setIntroVisible(false);
  }, [introToShow, markCoachMarkSeen]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Schede"
        subtitle="Programmi multi-giorno + schede singole"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 4 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FilterBar
          expanded={filtersExpanded}
          onToggle={() => setFiltersExpanded((v) => !v)}
          filtersActive={filtersActive}
          filteredCount={filteredCount}
          totalCount={totalItems}
          goalFilter={goalFilter}
          setGoalFilter={setGoalFilter}
          levelFilter={levelFilter}
          setLevelFilter={setLevelFilter}
          durationFilter={durationFilter}
          setDurationFilter={setDurationFilter}
          onlyExecutable={onlyExecutable}
          setOnlyExecutable={setOnlyExecutable}
          canFilterEquipment={canFilterEquipment}
          onReset={resetFilters}
        />

        {loading ? (
          <Card style={styles.placeholderCard}>
            <ActivityIndicator color={colors.textSec} />
          </Card>
        ) : filteredCount === 0 ? (
          <Card style={styles.placeholderCard}>
            <Text style={typography.body}>
              {filtersActive
                ? 'Nessuna voce corrisponde ai filtri.'
                : 'Nessuna scheda'}
            </Text>
            <Text style={typography.caption}>
              {filtersActive
                ? 'Prova a rimuovere uno dei filtri attivi.'
                : 'Usa il pulsante + per creare la tua prima scheda.'}
            </Text>
          </Card>
        ) : (
          <>
            {orderedPrograms.map(({ program, maxDuration }) => {
              const isActive = activeProgramRow?.programId === program.id;
              return (
                <ProgramRow
                  key={`p-${program.id}`}
                  program={program}
                  isActive={isActive}
                  maxDuration={maxDuration}
                  onOpen={() => setOpenProgram(program)}
                />
              );
            })}
            {filteredStandaloneWorkouts.map((workout) => (
              <WorkoutRow
                key={`w-${workout.id}`}
                workout={workout}
                onOpen={() => setOpenDetail(workout)}
                onAction={() => {
                  if (workout.isPreset) handleDuplicate(workout);
                  else setEditing(workout);
                }}
                onDelete={() => handleDelete(workout)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        onPress={() => setEditing('new')}
        bottom={insets.bottom + spacing.xxl * 2}
        accessibilityLabel="Crea nuova scheda"
      />

      <WorkoutDetailModal
        visible={openDetail !== null}
        workout={openDetail}
        onClose={() => setOpenDetail(null)}
        onAction={() => {
          if (openDetail) handleAction(openDetail);
        }}
        onStart={
          openDetail
            ? () => {
                const w = openDetail;
                handleStart(w);
              }
            : undefined
        }
      />

      <WorkoutEditorModal
        visible={editing !== null}
        editing={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onValidationError={(msg) => toast.show(msg)}
        onSaveError={(msg) => toast.show(msg)}
      />

      <WorkoutsIntroModal
        visible={introVisible && introToShow !== null}
        kind={introToShow ?? 'equipment'}
        onPrimary={handleIntroPrimary}
        onDismiss={handleIntroDismiss}
      />

      <ProgramDetailModal
        visible={openProgram !== null}
        program={openProgram}
        isActive={
          openProgram !== null &&
          activeProgramRow?.programId === openProgram.id
        }
        onClose={() => setOpenProgram(null)}
        onSetActive={async () => {
          if (!openProgram) return;
          await setActiveProgram(openProgram.id);
          toast.show('Piano attivo impostato');
        }}
        onClearActive={async () => {
          await clearActiveProgram();
          toast.show('Piano disattivato');
        }}
        onOpenDay={(workout) => {
          setOpenProgram(null);
          setOpenDetail(workout);
        }}
      />
    </View>
  );
}

type FilterBarProps = {
  expanded: boolean;
  onToggle: () => void;
  filtersActive: boolean;
  filteredCount: number;
  totalCount: number;
  goalFilter: GoalFilter;
  setGoalFilter: (v: GoalFilter) => void;
  levelFilter: LevelFilter;
  setLevelFilter: (v: LevelFilter) => void;
  durationFilter: DurationFilter;
  setDurationFilter: (v: DurationFilter) => void;
  onlyExecutable: boolean;
  setOnlyExecutable: (v: boolean) => void;
  canFilterEquipment: boolean;
  onReset: () => void;
};

function FilterBar({
  expanded,
  onToggle,
  filtersActive,
  filteredCount,
  totalCount,
  goalFilter,
  setGoalFilter,
  levelFilter,
  setLevelFilter,
  durationFilter,
  setDurationFilter,
  onlyExecutable,
  setOnlyExecutable,
  canFilterEquipment,
  onReset,
}: FilterBarProps) {
  const { accent } = useAppTheme();
  return (
    <Card style={styles.filterCard}>
      <Pressable onPress={onToggle} style={styles.filterHeader}>
        <View style={styles.filterHeaderLeft}>
          <Text
            style={[
              typography.bodyBold,
              { color: filtersActive ? accent : colors.text },
            ]}
          >
            Filtri{filtersActive ? ' attivi' : ''}
          </Text>
        </View>
        <View style={styles.filterHeaderRight}>
          <Text style={typography.caption}>
            {filteredCount}/{totalCount}
          </Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSec}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.filterBody}>
          <FilterRow
            label="Obiettivo"
            options={GOAL_FILTER_OPTIONS}
            value={goalFilter}
            onChange={setGoalFilter}
          />
          <FilterRow
            label="Livello"
            options={LEVEL_FILTER_OPTIONS}
            value={levelFilter}
            onChange={setLevelFilter}
          />
          <FilterRow
            label="Durata"
            options={DURATION_FILTER_OPTIONS}
            value={durationFilter}
            onChange={setDurationFilter}
          />
          <View style={styles.filterEquipRow}>
            <View style={styles.filterEquipText}>
              <Text style={typography.bodyBold}>
                Solo eseguibili con la mia attrezzatura
              </Text>
              <Text style={typography.caption}>
                {canFilterEquipment
                  ? 'Filtra in base ai tag salvati nelle Impostazioni sport.'
                  : 'Imposta prima la tua attrezzatura nelle Impostazioni sport.'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (canFilterEquipment) setOnlyExecutable(!onlyExecutable);
              }}
              accessibilityRole="switch"
              accessibilityState={{
                checked: onlyExecutable,
                disabled: !canFilterEquipment,
              }}
              style={[
                styles.toggleChip,
                !canFilterEquipment && styles.toggleChipDisabled,
                onlyExecutable && canFilterEquipment
                  ? { backgroundColor: accent, borderColor: accent }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.toggleChipText,
                  {
                    color:
                      onlyExecutable && canFilterEquipment
                        ? '#FFFFFF'
                        : colors.textSec,
                  },
                ]}
              >
                {onlyExecutable && canFilterEquipment ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
          </View>

          {filtersActive ? (
            <Pressable onPress={onReset} style={styles.resetBtn}>
              <Text style={[typography.bodyBold, { color: accent }]}>
                Azzera filtri
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

type FilterRowProps<T extends string> = {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
};

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: FilterRowProps<T>) {
  const { accent } = useAppTheme();
  return (
    <View style={styles.filterRow}>
      <Text style={typography.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onChange(opt.value)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: accent, borderColor: accent }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  typography.body,
                  { color: active ? '#FFFFFF' : colors.text },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type ProgramRowProps = {
  program: Program;
  isActive: boolean;
  maxDuration: number | null;
  onOpen: () => void;
};

function ProgramRow({
  program,
  isActive,
  maxDuration,
  onOpen,
}: ProgramRowProps) {
  const { accent } = useAppTheme();
  const goalLabel = program.goal
    ? GOAL_LABELS[program.goal] ?? program.goal
    : '—';
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Apri programma ${program.name}`}
    >
      <Card
        style={[
          styles.card,
          isActive && { borderColor: accent, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={typography.body} numberOfLines={1}>
              {program.name}
            </Text>
            <Text style={typography.caption}>
              {goalLabel} · {program.daysPerWeek}× a settimana ·{' '}
              {program.workouts.length}{' '}
              {program.workouts.length === 1 ? 'giorno' : 'giorni'}
              {maxDuration !== null ? ` · fino a ${maxDuration} min` : ''}
            </Text>
          </View>
          <View style={[styles.programBadge, { backgroundColor: accent }]}>
            <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>
              Programma
            </Text>
          </View>
        </View>
        {isActive ? (
          <View style={styles.activeFooter}>
            <Icon name="bolt" size={14} color={accent} />
            <Text style={[typography.label, { color: accent }]}>
              Piano attivo
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

type RowProps = {
  workout: Workout;
  onOpen: () => void;
  onAction: () => void;
  onDelete: () => void;
};

function WorkoutRow({ workout, onOpen, onAction, onDelete }: RowProps) {
  const palette = sportPalette[workout.category];
  const exerciseCount = workout.exercises.length;
  const actionLabel = workout.isPreset ? 'Duplica' : 'Modifica';

  const card = (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={typography.body} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={typography.caption}>
            {exerciseCount} {exerciseCount === 1 ? 'esercizio' : 'esercizi'}
            {workout.estimatedDurationMin !== null
              ? ` · ${workout.estimatedDurationMin} min`
              : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
          <Text style={[typography.bodyBold, { color: palette.color }]}>
            {palette.label}
          </Text>
        </View>
      </View>

      {workout.notes ? (
        <Text style={typography.caption} numberOfLines={2}>
          {workout.notes}
        </Text>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable
          onPress={onOpen}
          style={styles.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel={`Apri ${workout.name}`}
        >
          <Text style={[typography.bodyBold, { color: colors.text }]}>
            Apri
          </Text>
        </Pressable>
        <Pressable
          onPress={onAction}
          style={styles.secondaryBtn}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel} ${workout.name}`}
        >
          <Text style={[typography.bodyBold, { color: colors.textSec }]}>
            {actionLabel}
          </Text>
        </Pressable>
      </View>
    </Card>
  );

  if (workout.isPreset) {
    return card;
  }

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={`Elimina ${workout.name}`}
        >
          <Icon name="trash" size={16} color={colors.card} />
          <Text style={[typography.bodyBold, { color: colors.card }]}>
            Elimina
          </Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      {card}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.screen, gap: spacing.screen },
  placeholderCard: {
    padding: spacing.screen,
    gap: spacing.sm,
    alignItems: 'center',
  },
  card: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  programBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  activeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  deleteAction: {
    width: 96,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  filterCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterBody: {
    gap: spacing.lg,
  },
  filterRow: {
    gap: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
    borderWidth: 1.5,
  },
  filterEquipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  filterEquipText: {
    flex: 1,
    gap: spacing.xxs,
  },
  toggleChip: {
    minWidth: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleChipDisabled: {
    opacity: 0.5,
  },
  toggleChipText: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  resetBtn: {
    paddingVertical: spacing.sm,
    alignSelf: 'flex-end',
  },
});
