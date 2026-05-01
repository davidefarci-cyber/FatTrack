import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { SegmentedControl } from '@/components/SegmentedControl';
import { exercisesDB } from '@/database';
import type {
  Exercise,
  NewWorkout,
  Workout,
  WorkoutCategory,
} from '@/database';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

import { ExercisePickerModal } from './ExercisePickerModal';

// Editor scheda: form completo per creazione/modifica. Riusa il pattern di
// FavoriteEditorModal ma è basato su BottomSheet (più aderente al resto
// della modalità sport). Ogni esercizio ha due "modalità di prescrizione":
// - reps: serie × ripetizioni
// - duration: secondi (cardio/mobilità)
// Toggle tra le due via SegmentedControl per riga. Validazione client su
// salvataggio: nome ≥ 2 char, almeno 1 esercizio, ogni esercizio con
// `sets+reps` OPPURE `durationSec`.

const CATEGORY_OPTIONS: ReadonlyArray<{ value: WorkoutCategory; label: string }> = [
  { value: 'forza', label: 'Forza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobilita', label: 'Mobilità' },
  { value: 'misto', label: 'Misto' },
];

const PRESCRIPTION_OPTIONS = [
  { value: 'reps' as const, label: 'Serie × reps' },
  { value: 'duration' as const, label: 'Tempo' },
];

type PrescriptionMode = 'reps' | 'duration';

type DraftExercise = {
  exerciseId: number;
  mode: PrescriptionMode;
  sets: string;
  reps: string;
  durationSec: string;
  restSec: string;
  notes: string;
};

type Props = {
  visible: boolean;
  editing: Workout | null;
  onClose: () => void;
  onSave: (input: NewWorkout) => Promise<void>;
  onValidationError: (message: string) => void;
  onSaveError: (message: string) => void;
};

function workoutToDraft(w: Workout): {
  name: string;
  category: WorkoutCategory;
  duration: string;
  exercises: DraftExercise[];
} {
  return {
    name: w.name,
    category: w.category,
    duration:
      w.estimatedDurationMin !== null ? String(w.estimatedDurationMin) : '',
    exercises: w.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      mode: ex.durationSec !== null && ex.durationSec !== undefined ? 'duration' : 'reps',
      sets: ex.sets !== null && ex.sets !== undefined ? String(ex.sets) : '',
      reps: ex.reps !== null && ex.reps !== undefined ? String(ex.reps) : '',
      durationSec:
        ex.durationSec !== null && ex.durationSec !== undefined
          ? String(ex.durationSec)
          : '',
      restSec:
        ex.restSec !== null && ex.restSec !== undefined ? String(ex.restSec) : '',
      notes: ex.notes ?? '',
    })),
  };
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export function WorkoutEditorModal({
  visible,
  editing,
  onClose,
  onSave,
  onValidationError,
  onSaveError,
}: Props) {
  const { accent } = useAppTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('forza');
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [exerciseMeta, setExerciseMeta] = useState<Map<number, Exercise>>(
    new Map(),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset form on every open + carica metadata esercizi referenziati per
  // mostrarne il nome read-only.
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      const draft = workoutToDraft(editing);
      setName(draft.name);
      setCategory(draft.category);
      setDuration(draft.duration);
      setExercises(draft.exercises);
    } else {
      setName('');
      setCategory('forza');
      setDuration('');
      setExercises([]);
    }
    setSaving(false);
  }, [visible, editing]);

  // Risolvi i nomi degli esercizi (sia per editing iniziale, sia per quelli
  // aggiunti dal picker). `getExercisesByIds` è batch e idempotente.
  useEffect(() => {
    if (!visible) return;
    const ids = Array.from(new Set(exercises.map((e) => e.exerciseId)));
    if (ids.length === 0) {
      setExerciseMeta(new Map());
      return;
    }
    let active = true;
    exercisesDB
      .getExercisesByIds(ids)
      .then((rows) => {
        if (!active) return;
        const m = new Map<number, Exercise>();
        for (const r of rows) m.set(r.id, r);
        setExerciseMeta(m);
      })
      .catch(() => {
        if (active) setExerciseMeta(new Map());
      });
    return () => {
      active = false;
    };
  }, [exercises, visible]);

  const canSave = name.trim().length >= 2 && exercises.length > 0 && !saving;

  const updateExerciseField = useCallback(
    (idx: number, patch: Partial<DraftExercise>) => {
      setExercises((prev) =>
        prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const moveExercise = useCallback(
    (idx: number, direction: -1 | 1) => {
      setExercises((prev) => {
        const target = idx + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const tmp = next[idx];
        next[idx] = next[target];
        next[target] = tmp;
        return next;
      });
    },
    [],
  );

  const removeExercise = useCallback((idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handlePickExercise = useCallback((exerciseId: number) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId,
        mode: 'reps',
        sets: '',
        reps: '',
        durationSec: '',
        restSec: '',
        notes: '',
      },
    ]);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      onValidationError('Nome scheda troppo corto.');
      return;
    }
    if (exercises.length === 0) {
      onValidationError('Aggiungi almeno un esercizio.');
      return;
    }

    const payloadExercises: NewWorkout['exercises'] = [];
    for (let i = 0; i < exercises.length; i++) {
      const row = exercises[i];
      const restSec = parsePositiveInt(row.restSec);
      if (row.mode === 'reps') {
        const sets = parsePositiveInt(row.sets);
        const reps = parsePositiveInt(row.reps);
        if (sets === null || reps === null) {
          onValidationError(
            `Esercizio ${i + 1}: imposta serie e ripetizioni o passa a Tempo.`,
          );
          return;
        }
        payloadExercises.push({
          exerciseId: row.exerciseId,
          position: i,
          sets,
          reps,
          durationSec: null,
          restSec,
          weightKg: null,
          notes: row.notes.trim() ? row.notes.trim() : null,
        });
      } else {
        const durationSec = parsePositiveInt(row.durationSec);
        if (durationSec === null) {
          onValidationError(
            `Esercizio ${i + 1}: imposta i secondi o passa a Serie × reps.`,
          );
          return;
        }
        payloadExercises.push({
          exerciseId: row.exerciseId,
          position: i,
          sets: null,
          reps: null,
          durationSec,
          restSec,
          weightKg: null,
          notes: row.notes.trim() ? row.notes.trim() : null,
        });
      }
    }

    const payload: NewWorkout = {
      name: trimmedName,
      category,
      notes: editing?.notes ?? null,
      estimatedDurationMin: parsePositiveInt(duration),
      exercises: payloadExercises,
    };

    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Salvataggio non riuscito.';
      onSaveError(msg);
    } finally {
      setSaving(false);
    }
  }, [
    name,
    category,
    duration,
    exercises,
    editing,
    onSave,
    onClose,
    onValidationError,
    onSaveError,
  ]);

  const totalCount = useMemo(() => exercises.length, [exercises]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={92}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={typography.label}>
            {editing ? 'Modifica scheda' : 'Nuova scheda'}
          </Text>
          <Text style={typography.h1}>
            {editing ? editing.name : 'Crea la tua routine'}
          </Text>
        </View>

        <Input
          label="Nome scheda"
          value={name}
          onChangeText={setName}
          placeholder="Es. Allenamento serale"
          autoCapitalize="sentences"
        />

        <View style={styles.section}>
          <Text style={typography.label}>Categoria</Text>
          <SegmentedControl
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
          />
        </View>

        <Input
          label="Durata stimata (min)"
          value={duration}
          onChangeText={setDuration}
          placeholder="30"
          keyboardType="number-pad"
          unit="min"
        />

        <View style={styles.section}>
          <Text style={typography.label}>
            Esercizi ({totalCount})
          </Text>
          {exercises.length === 0 ? (
            <Text style={[typography.caption, styles.emptyHint]}>
              Aggiungi gli esercizi che compongono la scheda.
            </Text>
          ) : (
            <View style={styles.exerciseList}>
              {exercises.map((row, idx) => {
                const meta = exerciseMeta.get(row.exerciseId);
                const exName = meta?.name ?? 'Esercizio';
                const isFirst = idx === 0;
                const isLast = idx === exercises.length - 1;
                return (
                  <View
                    key={`${row.exerciseId}-${idx}`}
                    style={[
                      styles.exerciseCard,
                      idx < exercises.length - 1 && styles.exerciseCardDivider,
                    ]}
                  >
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseTitle}>
                        <Text style={typography.body} numberOfLines={1}>
                          {idx + 1}. {exName}
                        </Text>
                        {meta ? (
                          <Text style={typography.caption} numberOfLines={1}>
                            {meta.muscleGroup}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.exerciseActions}>
                        <Pressable
                          onPress={() => moveExercise(idx, -1)}
                          disabled={isFirst}
                          style={[
                            styles.iconBtn,
                            isFirst && styles.iconBtnDisabled,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Sposta su"
                        >
                          <Icon
                            name="chevron-up"
                            size={14}
                            color={isFirst ? colors.border : colors.textSec}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => moveExercise(idx, 1)}
                          disabled={isLast}
                          style={[
                            styles.iconBtn,
                            isLast && styles.iconBtnDisabled,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Sposta giù"
                        >
                          <Icon
                            name="chevron-down"
                            size={14}
                            color={isLast ? colors.border : colors.textSec}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => removeExercise(idx)}
                          style={styles.deleteBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Rimuovi ${exName}`}
                        >
                          <Icon name="trash" size={14} color={colors.red} />
                        </Pressable>
                      </View>
                    </View>

                    <SegmentedControl
                      options={PRESCRIPTION_OPTIONS}
                      value={row.mode}
                      onChange={(mode) => updateExerciseField(idx, { mode })}
                    />

                    {row.mode === 'reps' ? (
                      <View style={styles.fieldsRow}>
                        <Input
                          containerStyle={styles.fieldThird}
                          label="Serie"
                          value={row.sets}
                          onChangeText={(v) =>
                            updateExerciseField(idx, { sets: v })
                          }
                          placeholder="3"
                          keyboardType="number-pad"
                        />
                        <Input
                          containerStyle={styles.fieldThird}
                          label="Reps"
                          value={row.reps}
                          onChangeText={(v) =>
                            updateExerciseField(idx, { reps: v })
                          }
                          placeholder="10"
                          keyboardType="number-pad"
                        />
                        <Input
                          containerStyle={styles.fieldThird}
                          label="Riposo"
                          unit="s"
                          value={row.restSec}
                          onChangeText={(v) =>
                            updateExerciseField(idx, { restSec: v })
                          }
                          placeholder="60"
                          keyboardType="number-pad"
                        />
                      </View>
                    ) : (
                      <View style={styles.fieldsRow}>
                        <Input
                          containerStyle={styles.fieldHalf}
                          label="Durata"
                          unit="s"
                          value={row.durationSec}
                          onChangeText={(v) =>
                            updateExerciseField(idx, { durationSec: v })
                          }
                          placeholder="30"
                          keyboardType="number-pad"
                        />
                        <Input
                          containerStyle={styles.fieldHalf}
                          label="Riposo"
                          unit="s"
                          value={row.restSec}
                          onChangeText={(v) =>
                            updateExerciseField(idx, { restSec: v })
                          }
                          placeholder="45"
                          keyboardType="number-pad"
                        />
                      </View>
                    )}

                    <Input
                      label="Note (opzionale)"
                      value={row.notes}
                      onChangeText={(v) =>
                        updateExerciseField(idx, { notes: v })
                      }
                      placeholder="Es. per gamba"
                      autoCapitalize="sentences"
                    />
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.addBtn, { borderColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel="Aggiungi esercizio"
          >
            <Icon name="plus" size={14} color={accent} />
            <Text style={[typography.bodyBold, { color: accent }]}>
              Aggiungi esercizio
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button
            label={editing ? 'Salva modifiche' : 'Crea scheda'}
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
            style={{ backgroundColor: accent }}
          />
          <Button label="Annulla" variant="secondary" onPress={onClose} />
        </View>
      </ScrollView>

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickExercise}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xxs,
  },
  section: {
    gap: spacing.md,
  },
  emptyHint: {
    paddingVertical: spacing.sm,
  },
  exerciseList: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  exerciseCard: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  exerciseCardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: {
    flex: 1,
    marginBottom: 0,
  },
  fieldThird: {
    flex: 1,
    marginBottom: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  footer: {
    gap: spacing.md,
  },
});
