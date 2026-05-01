import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { exercisesDB } from '@/database';
import type { Exercise, Workout } from '@/database';
import { colors, radii, spacing, sportPalette, typography } from '@/theme';

// Dettaglio scheda: vista read-only con header (nome + badge categoria)
// e lista esercizi numerata. Il bottone "Inizia allenamento" è
// volutamente disabilitato in Fase 2: il flusso reale arriva in Fase 3.
// Per i preset il bottone secondario è "Duplica"; per le schede utente è
// "Modifica".

type Props = {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
  onAction: () => void; // Modifica per user, Duplica per preset.
};

function formatPrescription(
  ex: Workout['exercises'][number],
  exName: string,
): string {
  if (ex.durationSec !== null && ex.durationSec !== undefined) {
    const rest = ex.restSec ? ` (riposo ${ex.restSec}s)` : '';
    return `${exName} — ${ex.durationSec}s${rest}`;
  }
  if (ex.sets !== null && ex.reps !== null) {
    const rest = ex.restSec ? ` (riposo ${ex.restSec}s)` : '';
    return `${exName} — ${ex.sets}×${ex.reps}${rest}`;
  }
  return exName;
}

export function WorkoutDetailModal({
  visible,
  workout,
  onClose,
  onAction,
}: Props) {
  const [exerciseMap, setExerciseMap] = useState<Map<number, Exercise>>(
    new Map(),
  );

  useEffect(() => {
    if (!visible || !workout) return;
    let active = true;
    const ids = workout.exercises.map((e) => e.exerciseId);
    exercisesDB
      .getExercisesByIds(ids)
      .then((rows) => {
        if (!active) return;
        const m = new Map<number, Exercise>();
        for (const r of rows) m.set(r.id, r);
        setExerciseMap(m);
      })
      .catch(() => {
        if (active) setExerciseMap(new Map());
      });
    return () => {
      active = false;
    };
  }, [visible, workout]);

  if (!workout) {
    return <BottomSheet visible={visible} onClose={onClose}><View /></BottomSheet>;
  }

  const palette = sportPalette[workout.category];
  const actionLabel = workout.isPreset ? 'Duplica' : 'Modifica';

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={85}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={typography.h1}>{workout.name}</Text>
          <View style={styles.headerMeta}>
            <View
              style={[styles.badge, { backgroundColor: palette.bg }]}
              accessibilityLabel={`Categoria ${palette.label}`}
            >
              <Text style={[typography.bodyBold, { color: palette.color }]}>
                {palette.label}
              </Text>
            </View>
            {workout.estimatedDurationMin !== null ? (
              <Text style={typography.caption}>
                {workout.estimatedDurationMin} min ·{' '}
                {workout.exercises.length}{' '}
                {workout.exercises.length === 1 ? 'esercizio' : 'esercizi'}
              </Text>
            ) : (
              <Text style={typography.caption}>
                {workout.exercises.length}{' '}
                {workout.exercises.length === 1 ? 'esercizio' : 'esercizi'}
              </Text>
            )}
          </View>
          {workout.notes ? (
            <Text style={typography.caption}>{workout.notes}</Text>
          ) : null}
        </View>

        <View style={styles.list}>
          {workout.exercises.length === 0 ? (
            <Text style={typography.caption}>Nessun esercizio.</Text>
          ) : (
            workout.exercises.map((ex, idx) => {
              const meta = exerciseMap.get(ex.exerciseId);
              const exName = meta?.name ?? 'Esercizio';
              return (
                <View
                  key={ex.id}
                  style={[
                    styles.row,
                    idx < workout.exercises.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={styles.position}>
                    <Text style={[typography.bodyBold, { color: palette.color }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={typography.body}>
                      {formatPrescription(ex, exName)}
                    </Text>
                    {ex.notes ? (
                      <Text style={typography.caption}>{ex.notes}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footer}>
          <Button label="Inizia allenamento" disabled />
          <Text style={[typography.caption, styles.footerHint]}>
            Disponibile a breve.
          </Text>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.md,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  list: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  position: {
    width: 28,
    height: 28,
    borderRadius: radii.round,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  footer: {
    gap: spacing.md,
  },
  footerHint: {
    textAlign: 'center',
  },
});
