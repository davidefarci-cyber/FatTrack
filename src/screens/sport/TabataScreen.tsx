import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { CountdownOverlay } from '@/components/sport/CountdownOverlay';
import { HoldToStartButton } from '@/components/sport/HoldToStartButton';
import { TabataConfigModal } from '@/components/sport/TabataConfigModal';
import { TabataInfoSheet } from '@/components/sport/TabataInfoSheet';
import { useAppSettings } from '@/hooks/useAppSettings';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';
import { lightHaptic } from '@/utils/haptics';
import { playRestStart, playTick, playWorkStart } from '@/utils/sportSounds';
import { describeArc } from '@/utils/svgArc';

// Schermata Tabata: brochure premium del protocollo HIIT.
// Pre-workout: hero copy + stat-card (4 min / +28% / +14%) + riepilogo
// config corrente + HoldToStartButton centrale. Cog header → config
// modal, info header → sheet divulgativo. Hold-to-start → countdown
// fullscreen 5→1 con audio+haptic per ogni tick → parte la fase
// "lavoro" del primo round e mostriamo la RunningView: titolo "Round X/Y",
// pie chart SVG attorno al countdown (accent saturo in lavoro, accent soft
// + bgTint overlay in recupero), label "LAVORO" / "RECUPERO" sotto.

type Phase = 'work' | 'rest' | 'done';

type IntervalState = {
  phase: Phase;
  round: number;
  endsAt: number;
};

export default function TabataScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const toast = useToast();
  const {
    tabataWorkSec,
    tabataRestSec,
    tabataRounds,
    setTabataConfig,
  } = useAppSettings();

  const [configOpen, setConfigOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [intervalState, setIntervalState] = useState<IntervalState | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [, setPausedTotalMs] = useState(0);

  // Tick + check di avanzamento ogni 200ms. Il check di scadenza vive
  // qui dentro (non in un effect separato) perché `endsAt` cambia solo
  // a inizio fase: senza polling non potremmo accorgerci che il timer è
  // arrivato a 0. setTick forza il re-render di RunningView per il
  // countdown visivo.
  const [, setTick] = useState(0);
  const intervalStateRef = useRef(intervalState);
  // Set di secondi già "ticchettati" negli ultimi 5 della fase corrente:
  // evita che il polling 200ms emetta due volte audio+haptic sullo stesso
  // secondo intero. Reset a ogni cambio fase.
  const tickedSecondsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    intervalStateRef.current = intervalState;
  }, [intervalState]);
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const current = intervalStateRef.current;
      if (!current || current.phase === 'done') return;
      const remainingMs = current.endsAt - Date.now();
      if (remainingMs <= 0) {
        advanceInterval();
        return;
      }
      const remainingSec = Math.ceil(remainingMs / 1000);
      if (remainingSec >= 1 && remainingSec <= 5) {
        const fired = tickedSecondsRef.current;
        if (!fired.has(remainingSec)) {
          fired.add(remainingSec);
          void playTick();
          void lightHaptic();
        }
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, paused]);

  function advanceInterval() {
    const current = intervalStateRef.current;
    if (!current) return;
    const now = Date.now();
    tickedSecondsRef.current.clear();
    if (current.phase === 'work') {
      if (tabataRestSec > 0) {
        setIntervalState({
          phase: 'rest',
          round: current.round,
          endsAt: now + tabataRestSec * 1000,
        });
        void playRestStart();
        return;
      }
      // Recupero a 0 → vai al prossimo round o termina.
    }
    // Era in 'rest' (o work con restSec=0): incrementa round.
    if (current.round >= tabataRounds) {
      setIntervalState({ phase: 'done', round: tabataRounds, endsAt: now });
      setRunning(false);
      setPaused(false);
      toast.show('Allenamento completato');
      return;
    }
    setIntervalState({
      phase: 'work',
      round: current.round + 1,
      endsAt: now + tabataWorkSec * 1000,
    });
    void playWorkStart();
  }

  const handleConfirmStart = () => {
    setOverlayVisible(true);
  };

  const handleCountdownComplete = () => {
    setOverlayVisible(false);
    tickedSecondsRef.current.clear();
    setIntervalState({
      phase: 'work',
      round: 1,
      endsAt: Date.now() + tabataWorkSec * 1000,
    });
    setPausedTotalMs(0);
    setPausedAt(null);
    setRunning(true);
    setPaused(false);
    void playWorkStart();
  };

  const handleTick = () => {
    void playTick();
    void lightHaptic();
  };

  const pauseToggle = () => {
    if (!running) return;
    if (paused) {
      const now = Date.now();
      const delta = pausedAt ? now - pausedAt : 0;
      setPausedTotalMs((p) => p + delta);
      setPausedAt(null);
      if (intervalState) {
        setIntervalState({
          ...intervalState,
          endsAt: intervalState.endsAt + delta,
        });
      }
      setPaused(false);
    } else {
      setPausedAt(Date.now());
      setPaused(true);
    }
  };

  const reset = () => {
    setRunning(false);
    setPaused(false);
    setIntervalState(null);
    setPausedAt(null);
    setPausedTotalMs(0);
  };

  const handleSaveConfig = (config: {
    workSec: number;
    restSec: number;
    rounds: number;
  }) => {
    void setTabataConfig(config).catch(() => {
      toast.show('Impossibile salvare la config');
    });
  };

  const totalSec = (tabataWorkSec + tabataRestSec) * tabataRounds;
  const totalMin = Math.floor(totalSec / 60);
  const totalRemSec = totalSec % 60;
  const totalLabel = formatTotal(totalMin, totalRemSec);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Tabata"
        style={{ paddingTop: insets.top + spacing.xl }}
        right={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setConfigOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Personalizza il Tabata"
              hitSlop={8}
              style={styles.headerIconBtn}
            >
              <Icon name="cog" size={22} color={colors.textSec} />
            </Pressable>
            <Pressable
              onPress={() => setInfoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Informazioni sul Tabata"
              hitSlop={8}
              style={styles.headerIconBtn}
            >
              <Icon name="info" size={22} color={colors.textSec} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.screen * 4 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!running ? (
          <>
            <View style={styles.hero}>
              <Text style={typography.h1}>Benvenuto nel circuito Tabata</Text>
              <Text style={[typography.body, styles.heroSub]}>
                4 minuti di allenamento ad alta intensità che valgono come 30 di
                cardio. Otto round di lavoro esplosivo intervallati da brevi
                recuperi: tra i protocolli più efficienti per fitness
                cardiorespiratorio e capacità anaerobica.
              </Text>
            </View>

            <View style={styles.statRow}>
              <StatCard value="4 min" label="totali" accent={theme.accent} />
              <StatCard
                value="+28%"
                label="capacità anaerobica*"
                accent={theme.accent}
              />
              <StatCard value="+14%" label="VO₂max*" accent={theme.accent} />
            </View>
            <Text style={styles.footnote}>
              *Studio Tabata et al., 1996 — 5 sessioni/sett. per 6 settimane
            </Text>

            <Pressable
              onPress={() => setConfigOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Modifica la configurazione del Tabata"
            >
              <Card style={styles.configCard}>
                <Text style={typography.label}>La tua config</Text>
                <Text style={typography.body}>
                  {`${tabataWorkSec}s lavoro · ${tabataRestSec}s recupero · ${tabataRounds} round`}
                </Text>
                <Text style={[typography.caption, { color: theme.accent }]}>
                  {`Durata totale: ${totalLabel}`}
                </Text>
              </Card>
            </Pressable>

            <View style={styles.startWrap}>
              <HoldToStartButton
                accent={theme.accent}
                onConfirm={handleConfirmStart}
                label="Avvia"
              />
              <Text style={[typography.caption, styles.startHint]}>
                Tieni premuto per 2 secondi
              </Text>
            </View>
          </>
        ) : (
          <RunningView
            paused={paused}
            intervalState={intervalState}
            onPauseToggle={pauseToggle}
            onReset={reset}
            workSec={tabataWorkSec}
            restSec={tabataRestSec}
            totalRounds={tabataRounds}
          />
        )}
      </ScrollView>

      <CountdownOverlay
        visible={overlayVisible}
        accent={theme.accent}
        onComplete={handleCountdownComplete}
        onTick={handleTick}
      />

      <TabataConfigModal
        visible={configOpen}
        onClose={() => setConfigOpen(false)}
        initialConfig={{
          workSec: tabataWorkSec,
          restSec: tabataRestSec,
          rounds: tabataRounds,
        }}
        onSave={handleSaveConfig}
      />

      <TabataInfoSheet visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </View>
  );
}

type StatCardProps = {
  value: string;
  label: string;
  accent: string;
};

function StatCard({ value, label, accent }: StatCardProps) {
  return (
    <View style={[styles.statCard, shadows.sm]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type RunningViewProps = {
  paused: boolean;
  intervalState: IntervalState | null;
  onPauseToggle: () => void;
  onReset: () => void;
  workSec: number;
  restSec: number;
  totalRounds: number;
};

const RUNNING_RING_SIZE = 240;
const RUNNING_RING_RADIUS = 108;
const RUNNING_RING_STROKE = 12;

function RunningView({
  paused,
  intervalState,
  onPauseToggle,
  onReset,
  workSec,
  restSec,
  totalRounds,
}: RunningViewProps) {
  const theme = useAppTheme();
  const now = Date.now();

  const phase = intervalState?.phase;
  const isRest = phase === 'rest';
  const isDone = phase === 'done';

  const phaseDurationSec = isRest ? restSec : isDone ? 0 : workSec;
  const remainingMs = intervalState
    ? Math.max(0, intervalState.endsAt - now)
    : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalMs = Math.max(1, phaseDurationSec * 1000);
  const progress = isDone
    ? 1
    : Math.min(1, Math.max(0, 1 - remainingMs / totalMs));

  const phaseLabel = isRest ? 'Recupero' : isDone ? 'Completato' : 'Lavoro';
  // In fase Recupero usiamo l'accent "soft" per il ring (più morbido,
  // visibile contro il bgTint chiaro). I testi restano sull'accent saturo
  // per leggibilità: l'accent soft come testo sarebbe troppo pallido.
  const ringStroke = isRest ? theme.accentSoft : theme.accent;
  const bigText =
    remainingSec < 60 ? String(remainingSec) : formatSeconds(remainingSec);

  const cx = RUNNING_RING_SIZE / 2;
  const cy = RUNNING_RING_SIZE / 2;
  const sweep = progress * 360;
  const arcPath = describeArc(cx, cy, RUNNING_RING_RADIUS, -90, -90 + sweep);

  return (
    <View style={styles.runningWrap}>
      <Text style={[styles.roundTitle, { color: theme.accent }]}>
        {`Round ${intervalState?.round ?? 1} / ${totalRounds}`}
      </Text>

      <View
        style={[
          styles.runningCard,
          isRest && {
            backgroundColor: theme.bgTint,
            borderColor: theme.accentSoft,
          },
        ]}
      >
        <View style={styles.ringWrap}>
          <Svg width={RUNNING_RING_SIZE} height={RUNNING_RING_SIZE}>
            <Circle
              cx={cx}
              cy={cy}
              r={RUNNING_RING_RADIUS}
              fill="none"
              stroke={colors.border}
              strokeWidth={RUNNING_RING_STROKE}
              opacity={0.6}
            />
            {sweep > 0 ? (
              <Path
                d={arcPath}
                fill="none"
                stroke={ringStroke}
                strokeWidth={RUNNING_RING_STROKE}
                strokeLinecap="round"
              />
            ) : null}
          </Svg>
          <View style={styles.ringCenter} pointerEvents="none">
            <Text style={[styles.bigCountdown, { color: theme.accent }]}>
              {bigText}
            </Text>
          </View>
        </View>

        <Text style={[styles.phaseLabel, { color: theme.accent }]}>
          {phaseLabel.toUpperCase()}
        </Text>
        {paused ? (
          <Text style={typography.caption}>In pausa</Text>
        ) : null}
      </View>

      <View style={styles.runningActions}>
        <Button
          label={paused ? 'Riprendi' : 'Pausa'}
          variant="secondary"
          onPress={onPauseToggle}
          style={styles.runningBtn}
        />
        <Button
          label="Reset"
          onPress={onReset}
          style={[styles.runningBtn, { backgroundColor: theme.accent }]}
        />
      </View>
    </View>
  );
}

function formatSeconds(total: number): string {
  const sec = Math.max(0, total);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTotal(min: number, sec: number): string {
  if (min === 0) return `${sec} sec`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} sec`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: spacing.screen,
    gap: spacing.screen,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIconBtn: {
    padding: spacing.xs,
  },
  hero: {
    gap: spacing.md,
  },
  heroSub: {
    color: colors.textSec,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 92,
    justifyContent: 'center',
  },
  statValue: {
    ...typography.value,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  footnote: {
    ...typography.micro,
    textAlign: 'center',
    marginTop: -spacing.md,
  },
  configCard: {
    padding: spacing.screen,
    gap: spacing.xs,
  },
  startWrap: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  startHint: {
    textAlign: 'center',
  },
  runningWrap: {
    gap: spacing.screen,
    alignItems: 'stretch',
  },
  roundTitle: {
    ...typography.h1,
    textAlign: 'center',
  },
  runningCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.screen + spacing.md,
    paddingHorizontal: spacing.screen,
    alignItems: 'center',
    gap: spacing.lg,
  },
  ringWrap: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCountdown: {
    fontFamily: typography.display.fontFamily,
    fontSize: 80,
    lineHeight: 86,
  },
  phaseLabel: {
    ...typography.value,
    letterSpacing: 1.5,
  },
  runningActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  runningBtn: {
    flex: 1,
  },
});
