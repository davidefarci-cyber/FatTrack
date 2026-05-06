import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { workoutsDB } from '@/database';
import type { Program, Workout } from '@/database';
import { colors, radii, spacing, sportPalette, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Modal di dettaglio programma. Mostra meta (goal/level/giorni), note del
// programma e la lista ordinata dei giorni (ognuno → workout). CTA in
// fondo: "Imposta come piano attivo" oppure "Disattiva piano" se è già
// quello attivo. Tap su un giorno chiama `onOpenDay` per aprirne il
// dettaglio scheda nel parent (la WorkoutsScreen riusa il
// WorkoutDetailModal esistente).

type Props = {
  visible: boolean;
  program: Program | null;
  isActive: boolean;
  onClose: () => void;
  onSetActive: () => Promise<void> | void;
  onClearActive: () => Promise<void> | void;
  onOpenDay: (workout: Workout) => void;
};

const GOAL_LABEL: Record<string, string> = {
  dimagrimento: 'Dimagrimento',
  resistenza: 'Resistenza',
  mantenimento: 'Mantenimento',
  mobilita: 'Mobilità',
};

const LEVEL_LABEL: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
};

export function ProgramDetailModal({
  visible,
  program,
  isActive,
  onClose,
  onSetActive,
  onClearActive,
  onOpenDay,
}: Props) {
  const { accent } = useAppTheme();
  const [workouts, setWorkouts] = useState<Map<number, Workout>>(new Map());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Carica i workout collegati ai program_workouts. Cache locale per id.
  useEffect(() => {
    if (!visible || !program) {
      setWorkouts(new Map());
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const ids = program.workouts.map((pw) => pw.workoutId);
      const rows = await Promise.all(
        ids.map((id) => workoutsDB.getWorkoutById(id)),
      );
      if (!active) return;
      const map = new Map<number, Workout>();
      for (const w of rows) if (w) map.set(w.id, w);
      setWorkouts(map);
      setLoading(false);
    })().catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [visible, program]);

  if (!program) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.placeholder}>
          <ActivityIndicator color={colors.textSec} />
        </View>
      </BottomSheet>
    );
  }

  const goalLabel = program.goal ? GOAL_LABEL[program.goal] ?? program.goal : '—';
  const levelLabel = program.level
    ? LEVEL_LABEL[program.level] ?? program.level
    : '—';

  const handleSetActive = async () => {
    setBusy(true);
    try {
      await onSetActive();
    } finally {
      setBusy(false);
    }
  };

  const handleClearActive = async () => {
    setBusy(true);
    try {
      await onClearActive();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={typography.h1}>{program.name}</Text>
          <Text style={typography.caption}>
            {goalLabel} · {levelLabel} · {program.daysPerWeek}× a settimana
          </Text>
        </View>

        {isActive ? (
          <View style={[styles.activeBanner, { borderColor: accent }]}>
            <Icon name="bolt" size={16} color={accent} />
            <Text style={[typography.bodyBold, { color: accent }]}>
              Piano attivo
            </Text>
          </View>
        ) : null}

        {program.notes ? (
          <View style={styles.notesBox}>
            <Text style={typography.label}>Note</Text>
            <Text style={typography.caption}>{program.notes}</Text>
          </View>
        ) : null}

        <View style={styles.daysSection}>
          <Text style={typography.label}>Giorni del programma</Text>
          {loading ? (
            <ActivityIndicator color={colors.textSec} />
          ) : (
            program.workouts.map((pw, idx) => {
              const w = workouts.get(pw.workoutId);
              const palette = w ? sportPalette[w.category] : null;
              const dayLabel = pw.dayLabel ?? `Giorno ${idx + 1}`;
              return (
                <Pressable
                  key={pw.id}
                  onPress={() => {
                    if (w) onOpenDay(w);
                  }}
                  style={styles.dayRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Apri ${dayLabel}`}
                >
                  <View style={styles.dayBody}>
                    <Text style={typography.bodyBold}>{dayLabel}</Text>
                    <Text style={typography.caption} numberOfLines={1}>
                      {w?.name ?? '—'}
                    </Text>
                    <Text style={typography.micro}>
                      {w
                        ? `${w.exercises.length} esercizi${
                            w.estimatedDurationMin
                              ? ` · ${w.estimatedDurationMin} min`
                              : ''
                          }`
                        : ''}
                    </Text>
                  </View>
                  {palette ? (
                    <View
                      style={[styles.badge, { backgroundColor: palette.bg }]}
                    >
                      <Text
                        style={[typography.bodyBold, { color: palette.color }]}
                      >
                        {palette.label}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.cta}>
          {isActive ? (
            <Button
              label={busy ? '…' : 'Disattiva piano'}
              variant="secondary"
              onPress={handleClearActive}
              disabled={busy}
            />
          ) : (
            <Button
              label={busy ? 'Imposto…' : 'Imposta come piano attivo'}
              onPress={handleSetActive}
              disabled={busy}
            />
          )}
          <Text style={[typography.micro, styles.ctaCaption]}>
            La home sport ti proporrà la prossima sessione del piano dopo
            ogni allenamento completato.
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.screen,
    gap: spacing.xl,
  },
  placeholder: {
    padding: spacing.screen,
    alignItems: 'center',
  },
  header: {
    gap: spacing.xs,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  notesBox: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  daysSection: {
    gap: spacing.md,
  },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  dayBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
  },
  cta: {
    gap: spacing.sm,
  },
  ctaCaption: {
    textAlign: 'center',
  },
});
