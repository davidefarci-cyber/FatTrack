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
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { FAB } from '@/components/FAB';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { WorkoutDetailModal } from '@/components/sport/WorkoutDetailModal';
import { WorkoutEditorModal } from '@/components/sport/WorkoutEditorModal';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { workoutsDB } from '@/database';
import type { NewWorkout, Workout } from '@/database';
import { colors, radii, shadows, spacing, sportPalette, typography } from '@/theme';

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { state: activeSessionState, start } = useActiveSession();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState<Workout | null>(null);
  const [editing, setEditing] = useState<Workout | 'new' | null>(null);

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
    reload();
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
          err instanceof Error
            ? err.message
            : 'Eliminazione non riuscita';
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
        // Apriamo subito l'editor sulla copia: l'utente di solito vuole
        // personalizzare prima di salvare di nuovo (rinominare, cambiare
        // reps, ecc.). Pattern allineato a "Modifica" su scheda utente.
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
        // L'apertura della ActiveSessionScreen avviene automaticamente
        // via SportTabNavigator (consuma `pendingOpen` dal provider).
        setOpenDetail(null);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Avvio sessione non riuscito';
        toast.show(msg);
      }
    },
    [activeSessionState, start, toast],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Schede"
        subtitle="Le tue routine + preset"
        style={{ paddingTop: insets.top + spacing.xl }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 4 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Card style={styles.placeholderCard}>
            <ActivityIndicator color={colors.textSec} />
          </Card>
        ) : workouts.length === 0 ? (
          <Card style={styles.placeholderCard}>
            <Text style={typography.body}>Nessuna scheda</Text>
            <Text style={typography.caption}>
              Usa il pulsante + per creare la tua prima scheda.
            </Text>
          </Card>
        ) : (
          workouts.map((workout) => (
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
    </View>
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

  // I preset non sono cancellabili: niente swipe-left.
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
});
