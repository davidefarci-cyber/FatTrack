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
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { ProgramDetailModal } from '@/components/sport/ProgramDetailModal';
import { WorkoutDetailModal } from '@/components/sport/WorkoutDetailModal';
import { WorkoutEditorModal } from '@/components/sport/WorkoutEditorModal';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { workoutsDB } from '@/database';
import type {
  EquipmentTag,
  NewWorkout,
  Program,
  Workout,
  WorkoutGoal,
  WorkoutLevel,
} from '@/database';
import { useActiveProgram } from '@/hooks/useActiveProgram';
import { useProfile } from '@/hooks/useProfile';
import { usePrograms } from '@/hooks/usePrograms';
import { colors, radii, shadows, spacing, sportPalette, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// View mode top-level: l'utente sceglie tra le schede sciolte (preset +
// utente) e i programmi multi-day (preset). Su `Programmi` la CTA per
// "Imposta come piano attivo" vive nel modal di dettaglio. Su `Schede`
// restano filtri (goal, livello, durata, attrezzatura) per restringere
// la lista, oltre al FAB+ per creare schede personali.

type ViewMode = 'schede' | 'programmi';

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

function matchesDuration(
  estimated: number | null,
  filter: DurationFilter,
): boolean {
  if (filter === 'all') return true;
  // Senza durata stimata non possiamo decidere; filtriamo via per non
  // mostrare workout di durata sconosciuta sotto un filtro specifico.
  if (estimated === null) return false;
  if (filter === 'short') return estimated <= 25;
  if (filter === 'medium') return estimated > 25 && estimated <= 45;
  return estimated > 45;
}

// Subset check: required ⊆ available. Se required è vuoto è sempre eseguibile.
function isExecutable(
  required: EquipmentTag[],
  available: EquipmentTag[],
): boolean {
  if (required.length === 0) return true;
  const set = new Set(available);
  return required.every((tag) => set.has(tag));
}

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { state: activeSessionState, start } = useActiveSession();
  const { programs, reload: reloadPrograms } = usePrograms();
  const {
    active: activeProgramRow,
    setActive: setActiveProgram,
    clearActive: clearActiveProgram,
  } = useActiveProgram();
  const { profile } = useProfile();

  const [viewMode, setViewMode] = useState<ViewMode>('schede');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState<Workout | null>(null);
  const [openProgram, setOpenProgram] = useState<Program | null>(null);
  const [editing, setEditing] = useState<Workout | 'new' | null>(null);

  // Filtri Schede.
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [onlyExecutable, setOnlyExecutable] = useState(false);

  const reload = useCallback(async () => {
    try {
      const rows = await workoutsDB.getAllWorkouts();
      setWorkouts(rows);
    } catch (err) {
      console.warn('Workouts load failed', err);
      setWorkouts([]);
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

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
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
    goalFilter,
    levelFilter,
    durationFilter,
    onlyExecutable,
    availableEquipment,
    canFilterEquipment,
  ]);

  const filtersActive =
    goalFilter !== 'all' ||
    levelFilter !== 'all' ||
    durationFilter !== 'all' ||
    onlyExecutable;

  const resetFilters = () => {
    setGoalFilter('all');
    setLevelFilter('all');
    setDurationFilter('all');
    setOnlyExecutable(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={viewMode === 'programmi' ? 'Programmi' : 'Schede'}
        subtitle={
          viewMode === 'programmi'
            ? 'Piani multi-giorno preset'
            : 'Le tue routine + preset'
        }
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <View style={styles.toggleWrap}>
        <SegmentedControl<ViewMode>
          options={[
            { value: 'schede', label: 'Schede' },
            { value: 'programmi', label: 'Programmi' },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 4 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'schede' ? (
          <>
            <FilterBar
              expanded={filtersExpanded}
              onToggle={() => setFiltersExpanded((v) => !v)}
              filtersActive={filtersActive}
              filteredCount={filteredWorkouts.length}
              totalCount={workouts.length}
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
            ) : filteredWorkouts.length === 0 ? (
              <Card style={styles.placeholderCard}>
                <Text style={typography.body}>
                  {filtersActive
                    ? 'Nessuna scheda corrisponde ai filtri.'
                    : 'Nessuna scheda'}
                </Text>
                <Text style={typography.caption}>
                  {filtersActive
                    ? 'Prova a rimuovere uno dei filtri attivi.'
                    : 'Usa il pulsante + per creare la tua prima scheda.'}
                </Text>
              </Card>
            ) : (
              filteredWorkouts.map((workout) => (
                <WorkoutRow
                  key={workout.id}
                  workout={workout}
                  onOpen={() => setOpenDetail(workout)}
                  onAction={() => {
                    if (workout.isPreset) handleDuplicate(workout);
                    else setEditing(workout);
                  }}
                  onDelete={() => handleDelete(workout)}
                />
              ))
            )}
          </>
        ) : (
          <ProgramsList
            programs={programs}
            activeProgramId={activeProgramRow?.programId ?? null}
            onOpenProgram={setOpenProgram}
          />
        )}
      </ScrollView>

      {viewMode === 'schede' ? (
        <FAB
          icon="plus"
          onPress={() => setEditing('new')}
          bottom={insets.bottom + spacing.xxl * 2}
          accessibilityLabel="Crea nuova scheda"
        />
      ) : null}

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
            {filteredCount}/{totalCount} schede
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

type ProgramsListProps = {
  programs: Program[];
  activeProgramId: number | null;
  onOpenProgram: (p: Program) => void;
};

function ProgramsList({
  programs,
  activeProgramId,
  onOpenProgram,
}: ProgramsListProps) {
  const { accent } = useAppTheme();
  if (programs.length === 0) {
    return (
      <Card style={styles.placeholderCard}>
        <Text style={typography.body}>Nessun programma</Text>
        <Text style={typography.caption}>
          Riavvia l'app per popolare i programmi preset.
        </Text>
      </Card>
    );
  }
  return (
    <>
      {programs.map((program) => {
        const isActive = activeProgramId === program.id;
        const goalLabel = program.goal
          ? GOAL_LABELS[program.goal] ?? program.goal
          : '—';
        return (
          <Pressable
            key={program.id}
            onPress={() => onOpenProgram(program)}
            accessibilityRole="button"
            accessibilityLabel={`Apri programma ${program.name}`}
          >
            <Card
              style={[
                styles.programCard,
                isActive && { borderColor: accent, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.programHeader}>
                <View style={styles.programTitle}>
                  <Text style={typography.body} numberOfLines={1}>
                    {program.name}
                  </Text>
                  <Text style={typography.caption}>
                    {goalLabel} · {program.daysPerWeek}× a settimana ·{' '}
                    {program.workouts.length}{' '}
                    {program.workouts.length === 1 ? 'giorno' : 'giorni'}
                  </Text>
                </View>
                {isActive ? (
                  <View style={[styles.activeChip, { backgroundColor: accent }]}>
                    <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>
                      Attivo
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
          </Pressable>
        );
      })}
    </>
  );
}

const GOAL_LABELS: Record<string, string> = {
  dimagrimento: 'Dimagrimento',
  resistenza: 'Resistenza',
  mantenimento: 'Mantenimento',
  mobilita: 'Mobilità',
};

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
  toggleWrap: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
  },
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
  programCard: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  programTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  activeChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
});
