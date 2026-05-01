import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { exercisesDB, sessionsDB } from '@/database';
import type { Exercise, Session, SessionSet } from '@/database';
import { colors, radii, spacing, sportPalette, typography } from '@/theme';

// Riepilogo sessione (Fase 4): nome scheda, data, badge categoria, stats
// (durata/calorie/set), elenco esercizi con i set registrati. RPE è
// salvato in `session_sets` ma intenzionalmente non mostrato in UI per
// ora (possibile aggiunta futura).

type Props = {
  visible: boolean;
  sessionId: number | null;
  onClose: () => void;
};

type GroupedExercise = {
  exerciseId: number;
  position: number;
  sets: SessionSet[];
};

function parseSqlIso(s: string): number | null {
  if (!s) return null;
  const iso = s.includes('T') ? s : `${s.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function formatFullDate(startedAt: string): string {
  const ms = parseSqlIso(startedAt);
  if (ms === null) return startedAt;
  return new Date(ms).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatSet(set: SessionSet): string {
  if (set.durationSec !== null && set.durationSec !== undefined) {
    return `${set.durationSec}s`;
  }
  const reps = set.repsDone ?? 0;
  if (set.weightKg !== null && set.weightKg !== undefined) {
    return `${reps} reps × ${set.weightKg} kg`;
  }
  return `${reps} reps`;
}

export function SessionDetailModal({ visible, sessionId, onClose }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [groups, setGroups] = useState<GroupedExercise[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<number, Exercise>>(
    new Map(),
  );

  useEffect(() => {
    if (!visible || sessionId === null) return;
    let active = true;
    (async () => {
      try {
        const [s, sets] = await Promise.all([
          sessionsDB.getSessionById(sessionId),
          sessionsDB.getSessionSets(sessionId),
        ]);
        if (!active) return;
        setSession(s);
        // Raggruppa per (position, exerciseId) preservando l'ordine di
        // posizione e set_number (già garantito dalla query).
        const byKey = new Map<string, GroupedExercise>();
        for (const set of sets) {
          const key = `${set.position}-${set.exerciseId}`;
          const existing = byKey.get(key);
          if (existing) {
            existing.sets.push(set);
          } else {
            byKey.set(key, {
              exerciseId: set.exerciseId,
              position: set.position,
              sets: [set],
            });
          }
        }
        const ordered = Array.from(byKey.values()).sort(
          (a, b) => a.position - b.position,
        );
        setGroups(ordered);

        const ids = Array.from(new Set(sets.map((s) => s.exerciseId)));
        const exs = await exercisesDB.getExercisesByIds(ids);
        if (!active) return;
        const m = new Map<number, Exercise>();
        for (const e of exs) m.set(e.id, e);
        setExerciseMap(m);
      } catch {
        if (active) {
          setSession(null);
          setGroups([]);
          setExerciseMap(new Map());
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [visible, sessionId]);

  if (!session) {
    return (
      <BottomSheet visible={visible} onClose={onClose}>
        <View />
      </BottomSheet>
    );
  }

  const palette =
    session.category in sportPalette
      ? sportPalette[session.category as keyof typeof sportPalette]
      : null;

  const durationMin = Math.round((session.durationSec ?? 0) / 60);
  const calories = session.caloriesEstimated ?? 0;
  const setCount = groups.reduce((acc, g) => acc + g.sets.length, 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={90}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={typography.h1}>{session.workoutName}</Text>
          <Text style={typography.caption}>
            {formatFullDate(session.startedAt)}
          </Text>
          {palette ? (
            <View style={[styles.badge, { backgroundColor: palette.bg }]}>
              <Text style={[typography.bodyBold, { color: palette.color }]}>
                {palette.label}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Durata" value={`${durationMin} min`} />
          <Stat label="Calorie" value={`${calories} kcal`} />
          <Stat label="Set" value={`${setCount}`} />
        </View>

        <View style={styles.section}>
          <Text style={typography.label}>Esercizi</Text>
          {groups.length === 0 ? (
            <Text style={typography.caption}>
              Nessun set registrato in questa sessione.
            </Text>
          ) : (
            <View style={styles.list}>
              {groups.map((g, idx) => {
                const ex = exerciseMap.get(g.exerciseId);
                return (
                  <View
                    key={`${g.position}-${g.exerciseId}`}
                    style={[
                      styles.exerciseBlock,
                      idx < groups.length - 1 && styles.blockDivider,
                    ]}
                  >
                    <Text style={typography.body}>
                      {ex?.name ?? 'Esercizio'}
                    </Text>
                    {g.sets.map((s) => (
                      <Text
                        key={s.id}
                        style={[typography.caption, styles.setRow]}
                      >
                        Set {s.setNumber}: {formatSet(s)}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {session.notes ? (
          <Text style={[typography.caption, styles.notes]}>
            {session.notes}
          </Text>
        ) : null}

        <Button label="Chiudi" variant="secondary" onPress={onClose} />
      </ScrollView>
    </BottomSheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={typography.label}>{label}</Text>
      <Text style={typography.value}>{value}</Text>
    </View>
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
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xxs,
    alignItems: 'flex-start',
  },
  section: {
    gap: spacing.md,
  },
  list: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
  },
  exerciseBlock: {
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  blockDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  setRow: {
    paddingLeft: spacing.md,
  },
  notes: {
    fontStyle: 'italic',
  },
});
