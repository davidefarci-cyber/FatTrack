import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { RestTimer } from '@/components/sport/RestTimer';
import {
  getElapsedSec,
  useActiveSession,
} from '@/contexts/ActiveSessionContext';
import type { ActiveSessionState } from '@/contexts/ActiveSessionContext';
import type { Session, WorkoutExercise } from '@/database';
import { useAppSettings } from '@/hooks/useAppSettings';
import {
  colors,
  radii,
  spacing,
  sportPalette,
  typography,
} from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import type { SportCategory } from '@/theme';
import { lightHaptic } from '@/utils/haptics';

// Modal full-screen della sessione live. Montata in SportTabNavigator
// come sibling del Tab.Navigator. NON è una Tab.Screen: è imperativa,
// si apre dal banner o dalla partenza di una nuova sessione (vedi
// step 3D, flag `pendingOpen` del provider).

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Phase = 'live' | 'summary';

const RPE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
  value: n,
  label: String(n),
}));

export default function ActiveSessionScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const toast = useToast();
  const {
    state,
    loading,
    completeSet,
    skipSet,
    pause,
    resume,
    skipRest,
    endSession,
    cancelSession,
  } = useActiveSession();

  const [phase, setPhase] = useState<Phase>('live');
  const [summary, setSummary] = useState<{
    durationSec: number;
    calories: number;
    setsCount: number;
    exercisesCount: number;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [savedSession, setSavedSession] = useState<Session | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quando la modal si chiude resettiamo il riepilogo locale per la
  // prossima apertura. Tieni il phase a 'live' di default — se l'utente
  // aveva chiuso a metà del summary, alla riapertura tornerà alla live.
  useEffect(() => {
    if (!visible) {
      setPhase('live');
      setSummary(null);
      setNotes('');
      setSavedSession(null);
      setSubmitting(false);
    }
  }, [visible]);

  if (!visible) return null;

  const onTerminate = () => {
    if (!state) return;
    Alert.alert(
      'Terminare allenamento?',
      'Verrà salvato con i set fatti finora.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Termina',
          onPress: () => goToSummary(),
        },
      ],
    );
  };

  const goToSummary = () => {
    if (!state) return;
    const elapsed = getElapsedSec(state);
    // Stima locale prima del save reale: il valore definitivo arriverà
    // da endSession (DB). Per il summary in pre-save mostriamo
    // duration+set conteggio; le calorie vengono calcolate solo al save.
    setSummary({
      durationSec: elapsed,
      calories: 0,
      setsCount: 0,
      exercisesCount: state.workout.exercises.length,
    });
    setPhase('summary');
  };

  const onSaveAndClose = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await endSession(notes.trim() || null);
      setSavedSession(result.session);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              durationSec: result.session.durationSec ?? prev.durationSec,
              calories: result.calories,
            }
          : prev,
      );
      toast.show('Sessione salvata');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Salvataggio fallito';
      toast.show(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = () => {
    Alert.alert(
      'Cancellare la sessione?',
      'I set registrati andranno persi.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSession();
              toast.show('Sessione annullata');
              onClose();
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : 'Cancellazione fallita';
              toast.show(msg);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (phase === 'summary') {
          onClose();
        } else {
          onTerminate();
        }
      }}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {loading ? (
          <View style={styles.loading}>
            <Text style={typography.body}>Caricamento sessione…</Text>
          </View>
        ) : !state ? (
          <View style={styles.loading}>
            <Text style={typography.body}>Nessuna sessione attiva.</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={[typography.bodyBold, { color: colors.text }]}>
                Chiudi
              </Text>
            </Pressable>
          </View>
        ) : phase === 'live' ? (
          <LiveBody
            state={state}
            onTerminate={onTerminate}
            onCompleteSet={completeSet}
            onSkipSet={skipSet}
            onPause={pause}
            onResume={resume}
            onSkipRest={skipRest}
            onAllDone={goToSummary}
            insetBottom={insets.bottom}
            accent={theme.accent}
          />
        ) : (
          <SummaryBody
            state={state}
            summary={summary}
            notes={notes}
            onChangeNotes={setNotes}
            onSave={onSaveAndClose}
            onCancel={onCancel}
            submitting={submitting}
            saved={savedSession !== null}
            insetBottom={insets.bottom}
          />
        )}
      </View>
    </Modal>
  );
}

type LiveBodyProps = {
  state: ActiveSessionState;
  onTerminate: () => void;
  onCompleteSet: (data: {
    repsDone?: number;
    weightKg?: number;
    durationSec?: number;
    rpe?: number;
  }) => Promise<void>;
  onSkipSet: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onSkipRest: () => Promise<void>;
  onAllDone: () => void;
  insetBottom: number;
  accent: string;
};

function LiveBody({
  state,
  onTerminate,
  onCompleteSet,
  onSkipSet,
  onPause,
  onResume,
  onSkipRest,
  onAllDone,
  insetBottom,
  accent,
}: LiveBodyProps) {
  const toast = useToast();
  const { spotifyPlaylistUri } = useAppSettings();
  const totalExercises = state.workout.exercises.length;
  const exIdx = state.currentExerciseIndex;
  const ex = state.workout.exercises[exIdx];
  const exMeta = ex ? state.exerciseMap.get(ex.exerciseId) : undefined;
  const totalSets = ex?.sets ?? 1;
  const isDurationBased =
    ex?.durationSec !== null && ex?.durationSec !== undefined;
  const category = state.workout.category as SportCategory;
  const palette = sportPalette[category];

  const isResting = state.restEndsAt !== null;
  const restDurationSec = useMemo(() => {
    if (!ex) return 0;
    return ex.restSec ?? 0;
  }, [ex]);

  const [reps, setReps] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [rpe, setRpe] = useState<number | null>(null);

  // Reset degli input quando cambia esercizio o set: i default sono
  // i valori prescritti (placeholder che l'utente può accettare premendo
  // direttamente "Set completato").
  useEffect(() => {
    setReps(ex?.reps !== null && ex?.reps !== undefined ? String(ex.reps) : '');
    setWeight(
      ex?.weightKg !== null && ex?.weightKg !== undefined
        ? String(ex.weightKg)
        : '',
    );
    setDuration(
      ex?.durationSec !== null && ex?.durationSec !== undefined
        ? String(ex.durationSec)
        : '',
    );
    setRpe(null);
  }, [ex, state.currentSetNumber]);

  const elapsed = getElapsedSec(state);

  const openSpotify = async () => {
    const target = spotifyPlaylistUri ?? 'spotify:';
    try {
      const supported = await Linking.canOpenURL(target);
      if (!supported) {
        toast.show('Installa Spotify per usare questa scorciatoia.');
        return;
      }
      await Linking.openURL(target);
    } catch {
      toast.show('Impossibile aprire Spotify.');
    }
  };

  const submit = async () => {
    if (!ex) return;
    const data: {
      repsDone?: number;
      weightKg?: number;
      durationSec?: number;
      rpe?: number;
    } = {};
    if (isDurationBased) {
      const d = Number(duration);
      if (Number.isFinite(d) && d > 0) data.durationSec = d;
      else if (ex.durationSec) data.durationSec = ex.durationSec;
    } else {
      const r = Number(reps);
      if (Number.isFinite(r) && r > 0) data.repsDone = r;
      else if (ex.reps !== null) data.repsDone = ex.reps;
      const w = Number(weight);
      if (Number.isFinite(w) && w > 0) data.weightKg = w;
    }
    if (rpe !== null) data.rpe = rpe;

    const isLastSet = state.currentSetNumber >= totalSets;
    const isLastExercise = exIdx >= totalExercises - 1;
    void lightHaptic();
    await onCompleteSet(data);
    if (isLastSet && isLastExercise) {
      onAllDone();
    }
  };

  return (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={typography.label}>{palette.label}</Text>
          <Text style={typography.h1} numberOfLines={1}>
            {state.workout.name}
          </Text>
          <Text style={typography.caption}>
            {formatElapsed(elapsed)}{state.isPaused ? ' · in pausa' : ''}
          </Text>
        </View>
        <Pressable
          onPress={openSpotify}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Apri Spotify"
        >
          <Icon name="music" size={18} color={accent} />
        </Pressable>
        <Pressable
          onPress={onTerminate}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Termina allenamento"
        >
          <Icon name="close" size={18} color={colors.textSec} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insetBottom + spacing.screen * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.exerciseCard}>
          <Text style={typography.label}>
            Esercizio {exIdx + 1} / {totalExercises}
          </Text>
          <Text style={typography.h1}>{exMeta?.name ?? 'Esercizio'}</Text>
          <Text style={typography.caption}>
            {formatPrescription(ex, totalSets, state.currentSetNumber)}
          </Text>
          {ex?.notes ? (
            <Text style={typography.caption}>{ex.notes}</Text>
          ) : null}
        </Card>

        {isResting ? (
          <View style={styles.restBlock}>
            <RestTimer
              endsAt={state.restEndsAt as number}
              durationSec={restDurationSec}
              paused={state.isPaused}
              onComplete={onSkipRest}
            />
            <Pressable
              onPress={onSkipRest}
              style={styles.skipRestBtn}
              accessibilityRole="button"
            >
              <Text style={[typography.bodyBold, { color: colors.textSec }]}>
                Salta recupero
              </Text>
            </Pressable>
          </View>
        ) : ex ? (
          <Card style={styles.inputsCard}>
            <Text style={typography.label}>
              Set {state.currentSetNumber} / {totalSets}
            </Text>
            {isDurationBased ? (
              <Input
                label="Durata"
                unit="sec"
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
                placeholder={ex.durationSec ? String(ex.durationSec) : ''}
              />
            ) : (
              <>
                <Input
                  label="Reps fatte"
                  keyboardType="numeric"
                  value={reps}
                  onChangeText={setReps}
                  placeholder={ex.reps !== null ? String(ex.reps) : ''}
                />
                <Input
                  label="Peso (kg) — opzionale"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={ex.weightKg !== null ? String(ex.weightKg) : ''}
                />
              </>
            )}
            <Text style={[typography.label, { marginTop: spacing.md }]}>
              RPE — opzionale
            </Text>
            <View style={styles.rpeRow}>
              {RPE_OPTIONS.map((opt) => {
                const active = rpe === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRpe(active ? null : opt.value)}
                    style={[
                      styles.rpeChip,
                      active && {
                        backgroundColor: accent,
                        borderColor: accent,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        typography.bodyBold,
                        { color: active ? colors.card : colors.textSec },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : null}

        {!isResting ? (
          <View style={styles.actions}>
            <Button
              label="Set completato"
              onPress={submit}
              style={{ backgroundColor: accent }}
            />
            <View style={styles.actionsRow}>
              <Button
                label="Salta"
                variant="secondary"
                onPress={onSkipSet}
                style={styles.flex}
              />
              <Button
                label={state.isPaused ? 'Riprendi' : 'Pausa'}
                variant="secondary"
                onPress={state.isPaused ? onResume : onPause}
                style={styles.flex}
              />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              label={state.isPaused ? 'Riprendi' : 'Pausa'}
              variant="secondary"
              onPress={state.isPaused ? onResume : onPause}
            />
          </View>
        )}
      </ScrollView>
    </>
  );
}

type SummaryBodyProps = {
  state: ActiveSessionState;
  summary: {
    durationSec: number;
    calories: number;
    setsCount: number;
    exercisesCount: number;
  } | null;
  notes: string;
  onChangeNotes: (s: string) => void;
  onSave: () => void;
  onCancel: () => void;
  submitting: boolean;
  saved: boolean;
  insetBottom: number;
};

function SummaryBody({
  state,
  summary,
  notes,
  onChangeNotes,
  onSave,
  onCancel,
  submitting,
  saved,
  insetBottom,
}: SummaryBodyProps) {
  const theme = useAppTheme();
  return (
    <>
      <ScreenHeader
        title="Sessione completata"
        subtitle={state.workout.name}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insetBottom + spacing.screen * 2 },
        ]}
      >
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={typography.label}>Durata</Text>
            <Text style={[typography.value, { color: theme.accent }]}>
              {formatElapsed(summary?.durationSec ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={typography.label}>Esercizi</Text>
            <Text style={typography.body}>
              {summary?.exercisesCount ?? state.workout.exercises.length}
            </Text>
          </View>
          {saved ? (
            <View style={styles.summaryRow}>
              <Text style={typography.label}>Calorie stimate</Text>
              <Text style={[typography.value, { color: theme.accent }]}>
                {summary?.calories ?? 0} kcal
              </Text>
            </View>
          ) : null}
        </Card>

        <Card style={styles.notesCard}>
          <Text style={typography.label}>Note (opzionale)</Text>
          <TextInput
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="Sensazioni, osservazioni…"
            placeholderTextColor={colors.textSec}
            multiline
            textAlignVertical="top"
            style={styles.notesInput}
          />
        </Card>

        <View style={styles.summaryActions}>
          <Button
            label={saved ? 'Chiudi' : 'Salva e chiudi'}
            onPress={onSave}
            loading={submitting}
            style={{ backgroundColor: theme.accent }}
          />
          {!saved ? (
            <Button
              label="Annulla sessione"
              variant="secondary"
              onPress={onCancel}
            />
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function formatPrescription(
  ex: WorkoutExercise | undefined,
  totalSets: number,
  currentSet: number,
): string {
  if (!ex) return '';
  if (ex.durationSec !== null && ex.durationSec !== undefined) {
    return `Durata: ${ex.durationSec}s`;
  }
  if (ex.reps !== null) {
    return `${currentSet} / ${totalSets} set · ${ex.reps} reps${
      ex.weightKg ? ` · ${ex.weightKg}kg` : ''
    }`;
  }
  return `${currentSet} / ${totalSets} set`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  closeBtn: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.round,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  exerciseCard: {
    padding: spacing.screen,
    gap: spacing.sm,
  },
  inputsCard: {
    padding: spacing.screen,
    gap: spacing.md,
  },
  restBlock: {
    gap: spacing.md,
  },
  skipRestBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  rpeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rpeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.round,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    minWidth: 38,
    alignItems: 'center',
  },
  actions: {
    gap: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  summaryCard: {
    padding: spacing.screen,
    gap: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesCard: {
    padding: spacing.screen,
    gap: spacing.md,
  },
  notesInput: {
    ...typography.bodyRegular,
    minHeight: 90,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  summaryActions: {
    gap: spacing.md,
  },
});
