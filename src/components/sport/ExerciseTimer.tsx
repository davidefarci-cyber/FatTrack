import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { formatDuration, formatMMSS } from '@/utils/formatDuration';
import { lightHaptic, successHaptic } from '@/utils/haptics';
import { playPauseTick } from '@/utils/sportSounds';
import { describeArc } from '@/utils/svgArc';

// Timer per esercizi a tempo (plank, wall sit, corsa, mobilità statica…).
//
// Tre modalità, derivate dalla prescrizione `durationSec`:
// - `durationSec > 0` → countdown da durationSec a 0; bip negli ultimi 5s,
//   haptic finale; ring SVG si svuota in senso orario come `RestTimer`.
// - `durationSec` null o 0 → count-up cronometro (parte da 0, l'utente
//   ferma manualmente); ring si riempie progressivamente verso un soft
//   target di 60s (puramente visivo, il timer prosegue oltre).
//
// Tre stati: idle | running | paused | done.
// - idle: bottone tondo "Avvia · 0:30" gigante.
// - running: ring + numero centrale; sotto +30s / Pausa / Stop.
// - paused: freeza il display, "Riprendi" al posto di "Pausa".
// - done: bordo pieno, label "Fatto", il chiamante riceve `onDone(sec)`.
//
// Sostituzione netta (no animazione) tra idle→running, come da brief.

type Phase = 'idle' | 'running' | 'paused' | 'done';

type Props = {
  // Durata prescritta in secondi (può essere quella della scheda OPPURE
  // il carry-over della volta scorsa: il chiamante decide). Se null o 0
  // → modalità cronometro.
  durationSec: number | null;
  // Chiamato quando l'utente preme Stop o il countdown arriva a 0.
  // `secondsRun` è quanto ha effettivamente cronometrato (per countdown
  // = durationSec - residuo; per cronometro = elapsed).
  onDone: (secondsRun: number) => void;
};

const TICK_MS = 200;
const RING_SIZE = 220;
const RING_RADIUS = 96;
const RING_STROKE = 14;
const BIP_SECONDS = [5, 4, 3, 2, 1] as const;
const COUNTUP_VISUAL_TARGET_SEC = 60;

export function ExerciseTimer({ durationSec, onDone }: Props) {
  const theme = useAppTheme();
  const isCountdown = durationSec !== null && durationSec > 0;

  const [phase, setPhase] = useState<Phase>('idle');
  // Per countdown: timestamp di fine. Per countup: timestamp di start.
  const [anchorAt, setAnchorAt] = useState<number | null>(null);
  // Quando in pausa: ms residui (countdown) o ms accumulati (countup).
  const [frozenMs, setFrozenMs] = useState(0);
  const [now, setNow] = useState(Date.now());
  // Target snapshot al momento dello Start: previene race se la prop
  // `durationSec` cambia mentre il timer sta girando (es. carry-over
  // async che arriva dopo l'avvio). In phase idle riflette la prop.
  const liveTargetMs = isCountdown ? (durationSec as number) * 1000 : 0;
  const [snapshotTargetMs, setSnapshotTargetMs] = useState(liveTargetMs);
  const targetMs = phase === 'idle' ? liveTargetMs : snapshotTargetMs;
  const completedRef = useRef(false);
  const bipFiredRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  // Reset dei flag al cambio anchor (nuovo start o resume): vogliamo che
  // i bip 5..1 si rifirino correttamente dopo un resume.
  useEffect(() => {
    if (anchorAt === null) return;
    completedRef.current = false;
    bipFiredRef.current = new Set();
  }, [anchorAt]);

  // Stato visivo calcolato a partire da phase + anchorAt + frozenMs.
  let elapsedMs: number;
  let remainingMs: number;
  if (isCountdown) {
    if (phase === 'running' && anchorAt !== null) {
      remainingMs = Math.max(0, anchorAt - now);
    } else if (phase === 'paused') {
      remainingMs = frozenMs;
    } else if (phase === 'done') {
      remainingMs = 0;
    } else {
      remainingMs = targetMs;
    }
    elapsedMs = targetMs - remainingMs;
  } else {
    if (phase === 'running' && anchorAt !== null) {
      elapsedMs = Math.max(0, now - anchorAt);
    } else if (phase === 'paused') {
      elapsedMs = frozenMs;
    } else if (phase === 'done') {
      elapsedMs = frozenMs;
    } else {
      elapsedMs = 0;
    }
    remainingMs = 0;
  }

  const progress = isCountdown
    ? Math.min(1, Math.max(0, 1 - remainingMs / Math.max(1, targetMs)))
    : Math.min(1, elapsedMs / (COUNTUP_VISUAL_TARGET_SEC * 1000));

  // Bip + completion handler solo per countdown.
  useEffect(() => {
    if (!isCountdown || phase !== 'running') return;
    if (remainingMs <= 0 && !completedRef.current) {
      completedRef.current = true;
      void successHaptic();
      setPhase('done');
      onDone(Math.round(targetMs / 1000));
      return;
    }
    const remainingSec = Math.ceil(remainingMs / 1000);
    if (remainingMs > 0 && BIP_SECONDS.includes(remainingSec as 5)) {
      const fired = bipFiredRef.current;
      if (!fired.has(remainingSec)) {
        fired.add(remainingSec);
        void lightHaptic();
        void playPauseTick();
      }
    }
  }, [isCountdown, phase, remainingMs, targetMs, onDone]);

  const handleStart = () => {
    void lightHaptic();
    setSnapshotTargetMs(liveTargetMs);
    if (isCountdown) {
      setAnchorAt(Date.now() + liveTargetMs);
    } else {
      setAnchorAt(Date.now());
    }
    setFrozenMs(0);
    setNow(Date.now());
    setPhase('running');
  };

  const handlePause = () => {
    if (phase !== 'running' || anchorAt === null) return;
    void lightHaptic();
    const nowMs = Date.now();
    if (isCountdown) {
      setFrozenMs(Math.max(0, anchorAt - nowMs));
    } else {
      setFrozenMs(Math.max(0, nowMs - anchorAt));
    }
    setAnchorAt(null);
    setPhase('paused');
  };

  const handleResume = () => {
    if (phase !== 'paused') return;
    void lightHaptic();
    if (isCountdown) {
      setAnchorAt(Date.now() + frozenMs);
    } else {
      setAnchorAt(Date.now() - frozenMs);
    }
    setPhase('running');
  };

  const handleStop = () => {
    void lightHaptic();
    const secondsRun = isCountdown
      ? Math.max(0, Math.round((targetMs - remainingMs) / 1000))
      : Math.max(0, Math.round(elapsedMs / 1000));
    setPhase('done');
    setFrozenMs(elapsedMs);
    onDone(secondsRun);
  };

  const handleExtend = (deltaSec: number) => {
    if (!isCountdown) return;
    void lightHaptic();
    const deltaMs = deltaSec * 1000;
    if (phase === 'running' && anchorAt !== null) {
      setAnchorAt(anchorAt + deltaMs);
    } else if (phase === 'paused') {
      setFrozenMs(Math.max(0, frozenMs + deltaMs));
    }
    // Estende anche il target così il ring resta proporzionale (sweep
    // calcolato su targetMs).
    setSnapshotTargetMs((cur) => cur + deltaMs);
    // Reset completed/bip così l'extension permette di sentire di nuovo
    // gli ultimi 5 bip.
    completedRef.current = false;
    bipFiredRef.current = new Set();
  };

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const sweep = progress * 360;
  const arcPath = describeArc(cx, cy, RING_RADIUS, -90, -90 + sweep);

  const displaySec = isCountdown
    ? Math.ceil(remainingMs / 1000)
    : Math.floor(elapsedMs / 1000);

  // Idle: bottone tondo gigante.
  if (phase === 'idle') {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel={
            isCountdown
              ? `Avvia timer di ${formatDuration(durationSec as number)}`
              : 'Avvia cronometro'
          }
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="play" size={36} color={colors.card} />
          <Text style={[styles.startLabel, { color: colors.card }]}>
            {isCountdown
              ? formatDuration(durationSec as number)
              : 'Cronometro'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Running / paused / done: ring + display + actions.
  return (
    <View style={styles.container}>
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={cx}
            cy={cy}
            r={RING_RADIUS}
            fill="none"
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            opacity={0.6}
          />
          {sweep > 0 ? (
            <Path
              d={arcPath}
              fill="none"
              stroke={theme.accent}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.countdown, { color: theme.accent }]}>
            {formatMMSS(displaySec)}
          </Text>
          {phase === 'paused' ? (
            <Text style={typography.caption}>In pausa</Text>
          ) : phase === 'done' ? (
            <Text style={[typography.bodyBold, { color: theme.accent }]}>
              Fatto
            </Text>
          ) : null}
        </View>
      </View>

      {phase !== 'done' ? (
        <View style={styles.actionsRow}>
          {isCountdown ? (
            <Pressable
              onPress={() => handleExtend(30)}
              accessibilityRole="button"
              accessibilityLabel="Aggiungi 30 secondi"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  borderColor: theme.accent,
                  backgroundColor: theme.bgTint,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[typography.bodyBold, { color: theme.accent }]}>
                +30s
              </Text>
            </Pressable>
          ) : null}

          {phase === 'running' ? (
            <Pressable
              onPress={handlePause}
              accessibilityRole="button"
              accessibilityLabel="Metti in pausa"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  borderColor: theme.accent,
                  backgroundColor: theme.bgTint,
                },
                pressed && styles.pressed,
              ]}
            >
              <Icon name="pause" size={18} color={theme.accent} />
              <Text style={[typography.bodyBold, { color: theme.accent }]}>
                Pausa
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleResume}
              accessibilityRole="button"
              accessibilityLabel="Riprendi"
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  borderColor: theme.accent,
                  backgroundColor: theme.accent,
                },
                pressed && styles.pressed,
              ]}
            >
              <Icon name="play" size={18} color={colors.card} />
              <Text style={[typography.bodyBold, { color: colors.card }]}>
                Riprendi
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel="Termina"
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: colors.border, backgroundColor: colors.card },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[typography.bodyBold, { color: colors.text }]}>
              Stop
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  startBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  startLabel: {
    ...typography.bodyBold,
    fontSize: 22,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  countdown: {
    fontFamily: typography.display.fontFamily,
    fontSize: 56,
    lineHeight: 62,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  pressed: {
    opacity: 0.85,
  },
});
