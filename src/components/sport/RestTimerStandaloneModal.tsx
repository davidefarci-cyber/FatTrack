import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { lightHaptic, successHaptic } from '@/utils/haptics';
import { playPauseTick } from '@/utils/sportSounds';
import { describeArc } from '@/utils/svgArc';

// Modal "Timer di pausa" standalone aperto da SportHomeScreen ([36] / C3.2).
// Spin-off della modalità "Libero" di TimerScreen: timer di riposo
// configurabile al volo per allenamenti non guidati. A differenza del
// RestTimer della sessione live ([16]), non persiste su DB e non programma
// notifiche push — per design l'utente è in foreground.
//
// Due fasi:
//   config  → 4 chip preset (30/60/90/120s) + stepper custom (5-600s step 5).
//   running → pie chart SVG + countdown numerico + +30s/Pausa/Termina.
//   paused  → freeza il display, Resume riparte da dove era.
//   done    → flash "Pausa terminata!" per ~1.5s poi torna a config.

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Phase = 'config' | 'running' | 'paused' | 'done';

const PRESETS_SEC = [30, 60, 90, 120] as const;
const TICK_MS = 200;
const RING_SIZE = 220;
const RING_RADIUS = 96;
const RING_STROKE = 12;
const STEPPER_MIN = 5;
const STEPPER_MAX = 600;
const STEPPER_STEP = 5;
const DEFAULT_SEC = 60;
const EXTEND_SEC = 30;
const DONE_AUTODISMISS_MS = 1500;
const BIP_SECONDS = [5, 4, 3, 2, 1] as const;

export function RestTimerStandaloneModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const [phase, setPhase] = useState<Phase>('config');
  const [durationSec, setDurationSec] = useState(DEFAULT_SEC);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [now, setNow] = useState(Date.now());
  const completedRef = useRef(false);
  const bipFiredRef = useRef<Set<number>>(new Set());

  // Reset all'apertura: chi riapre il modal torna sempre al config view,
  // anche se aveva chiuso a metà countdown (l'eventuale tick precedente
  // viene cancellato dall'effetto del phase).
  useEffect(() => {
    if (!visible) return;
    setPhase('config');
    setDurationSec(DEFAULT_SEC);
    setEndsAt(null);
    setRemainingMs(0);
    completedRef.current = false;
    bipFiredRef.current = new Set();
  }, [visible]);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  // Reset dei flag bip/complete quando inizia un nuovo countdown o si
  // estende — altrimenti dopo un "+30s" non riceveremmo i bip 5..1 nuovi.
  useEffect(() => {
    if (endsAt === null) return;
    completedRef.current = false;
    bipFiredRef.current = new Set();
  }, [endsAt]);

  const liveRemainingMs =
    phase === 'running' && endsAt !== null
      ? Math.max(0, endsAt - now)
      : phase === 'paused'
        ? remainingMs
        : phase === 'done'
          ? 0
          : durationSec * 1000;
  const remainingSec = Math.ceil(liveRemainingMs / 1000);
  const totalMs = Math.max(1, durationSec * 1000);
  const progress = Math.min(1, Math.max(0, 1 - liveRemainingMs / totalMs));

  useEffect(() => {
    if (phase !== 'running') return;
    if (liveRemainingMs <= 0 && !completedRef.current) {
      completedRef.current = true;
      void successHaptic();
      setPhase('done');
      return;
    }
    if (liveRemainingMs > 0 && BIP_SECONDS.includes(remainingSec as 5)) {
      const fired = bipFiredRef.current;
      if (!fired.has(remainingSec)) {
        fired.add(remainingSec);
        void lightHaptic();
        void playPauseTick();
      }
    }
  }, [liveRemainingMs, remainingSec, phase]);

  // Stato "done": flash di feedback + reset automatico a config dopo ~1.5s.
  useEffect(() => {
    if (phase !== 'done') return;
    const id = setTimeout(() => {
      setPhase('config');
      setEndsAt(null);
      setRemainingMs(0);
    }, DONE_AUTODISMISS_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const startCountdown = (sec: number) => {
    void lightHaptic();
    setDurationSec(sec);
    setEndsAt(Date.now() + sec * 1000);
    setRemainingMs(0);
    setNow(Date.now());
    setPhase('running');
  };

  const handlePause = () => {
    if (phase !== 'running' || endsAt === null) return;
    void lightHaptic();
    const left = Math.max(0, endsAt - Date.now());
    setRemainingMs(left);
    setEndsAt(null);
    setPhase('paused');
  };

  const handleResume = () => {
    if (phase !== 'paused') return;
    void lightHaptic();
    setEndsAt(Date.now() + remainingMs);
    setPhase('running');
  };

  const handleExtend = () => {
    void lightHaptic();
    const bumpMs = EXTEND_SEC * 1000;
    if (phase === 'running' && endsAt !== null) {
      setEndsAt(endsAt + bumpMs);
    } else if (phase === 'paused') {
      setRemainingMs(remainingMs + bumpMs);
    }
    setDurationSec((s) => s + EXTEND_SEC);
  };

  const handleStop = () => {
    void lightHaptic();
    setPhase('config');
    setEndsAt(null);
    setRemainingMs(0);
  };

  const handleStepperDelta = (delta: number) => {
    void lightHaptic();
    setDurationSec((cur) => {
      const next = cur + delta;
      return Math.max(STEPPER_MIN, Math.min(STEPPER_MAX, next));
    });
  };

  const handleClose = () => {
    setPhase('config');
    setEndsAt(null);
    setRemainingMs(0);
    onClose();
  };

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const sweep = progress * 360;
  const arcPath = describeArc(cx, cy, RING_RADIUS, -90, -90 + sweep);

  const stepperMinusDisabled = durationSec <= STEPPER_MIN;
  const stepperPlusDisabled = durationSec >= STEPPER_MAX;

  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeightPercent={90}>
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Chiudi timer di pausa"
          hitSlop={8}
          style={styles.closeBtn}
        >
          <Icon name="close" size={22} color={colors.textSec} />
        </Pressable>
        <Text style={typography.h1}>Timer di pausa</Text>
      </View>

      {phase === 'config' ? (
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={typography.label}>Preset</Text>
            <View style={styles.presetRow}>
              {PRESETS_SEC.map((sec) => {
                const selected = durationSec === sec;
                return (
                  <Pressable
                    key={sec}
                    onPress={() => startCountdown(sec)}
                    accessibilityRole="button"
                    accessibilityLabel={`Avvia timer di ${sec} secondi`}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: selected
                          ? theme.accentSoft
                          : colors.card,
                        borderColor: selected ? theme.accent : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        typography.bodyBold,
                        { color: selected ? theme.accent : colors.text },
                      ]}
                    >
                      {sec}s
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={typography.label}>Durata personalizzata</Text>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() =>
                  stepperMinusDisabled ? null : handleStepperDelta(-STEPPER_STEP)
                }
                disabled={stepperMinusDisabled}
                accessibilityRole="button"
                accessibilityLabel="Riduci di 5 secondi"
                style={({ pressed }) => [
                  styles.stepperBtn,
                  { borderColor: theme.accent },
                  stepperMinusDisabled && styles.stepperBtnDisabled,
                  pressed && !stepperMinusDisabled && styles.pressed,
                ]}
              >
                <Icon name="minus" size={20} color={theme.accent} />
              </Pressable>
              <View style={styles.stepperValue}>
                <Text
                  style={[
                    typography.display,
                    { color: theme.accent },
                  ]}
                >
                  {formatSeconds(durationSec)}
                </Text>
                <Text style={typography.caption}>
                  {durationSec} sec
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  stepperPlusDisabled ? null : handleStepperDelta(STEPPER_STEP)
                }
                disabled={stepperPlusDisabled}
                accessibilityRole="button"
                accessibilityLabel="Aggiungi 5 secondi"
                style={({ pressed }) => [
                  styles.stepperBtn,
                  { borderColor: theme.accent },
                  stepperPlusDisabled && styles.stepperBtnDisabled,
                  pressed && !stepperPlusDisabled && styles.pressed,
                ]}
              >
                <Icon name="plus" size={20} color={theme.accent} />
              </Pressable>
            </View>
          </View>

          <Button
            label="Avvia"
            onPress={() => startCountdown(durationSec)}
            style={{ backgroundColor: theme.accent }}
          />
        </View>
      ) : (
        <View style={styles.body}>
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
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={[styles.countdown, { color: theme.accent }]}>
                {formatSeconds(remainingSec)}
              </Text>
              {phase === 'paused' ? (
                <Text style={typography.caption}>In pausa</Text>
              ) : phase === 'done' ? (
                <Text
                  style={[typography.bodyBold, { color: theme.accent }]}
                >
                  Pausa terminata!
                </Text>
              ) : null}
            </View>
          </View>

          {phase !== 'done' ? (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={handleExtend}
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
                  accessibilityLabel="Riprendi countdown"
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
                accessibilityLabel="Termina countdown"
                style={({ pressed }) => [
                  styles.actionBtn,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[typography.bodyBold, { color: colors.text }]}>
                  Termina
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

function formatSeconds(total: number): string {
  const sec = Math.max(0, total);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    gap: spacing.screen,
    paddingBottom: spacing.screen,
  },
  section: {
    gap: spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.xxl,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: 'center',
    position: 'relative',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  countdown: {
    fontFamily: typography.display.fontFamily,
    fontSize: 56,
    lineHeight: 62,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
