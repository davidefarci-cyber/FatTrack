import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { playCountdownTick } from '@/utils/countdownSound';

// Schermata Tabata: brochure premium del protocollo HIIT.
// Pre-workout: hero copy + stat-card (4 min / +28% / +14%) + riepilogo
// config corrente + HoldToStartButton centrale. Cog header → config
// modal, info header → sheet divulgativo. Hold-to-start → countdown
// fullscreen 5→1 con audio+haptic per ogni tick → parte la fase
// "lavoro" del primo round e mostriamo la RunningView (logica copiata
// invariata dal vecchio TimerScreen — il restyle è scope di TODO [37]).

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

  // Tick ogni 200ms; ferma in pausa o quando non running.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [running, paused]);

  // Avanzamento intervalli: quando endsAt è scaduto e siamo in
  // running+!paused, passiamo alla fase successiva. Logica copiata dal
  // vecchio TimerScreen (semantica work → rest → next round → done).
  const intervalStateRef = useRef(intervalState);
  useEffect(() => {
    intervalStateRef.current = intervalState;
  }, [intervalState]);
  useEffect(() => {
    if (!running || paused) return;
    if (!intervalState) return;
    if (Date.now() < intervalState.endsAt) return;
    advanceInterval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalState?.endsAt, running, paused]);

  function advanceInterval() {
    const current = intervalStateRef.current;
    if (!current) return;
    const now = Date.now();
    if (current.phase === 'work') {
      if (tabataRestSec > 0) {
        setIntervalState({
          phase: 'rest',
          round: current.round,
          endsAt: now + tabataRestSec * 1000,
        });
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
  }

  const handleConfirmStart = () => {
    setOverlayVisible(true);
  };

  const handleCountdownComplete = () => {
    setOverlayVisible(false);
    setIntervalState({
      phase: 'work',
      round: 1,
      endsAt: Date.now() + tabataWorkSec * 1000,
    });
    setPausedTotalMs(0);
    setPausedAt(null);
    setRunning(true);
    setPaused(false);
  };

  const handleTick = () => {
    void playCountdownTick();
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
            accent={theme.accent}
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
  accent: string;
};

function RunningView({
  paused,
  intervalState,
  onPauseToggle,
  onReset,
  accent,
}: RunningViewProps) {
  const now = Date.now();

  let bigText = '00:00';
  let phaseLabel = 'Timer';
  if (intervalState) {
    const remainingMs = Math.max(0, intervalState.endsAt - now);
    bigText = formatSeconds(Math.ceil(remainingMs / 1000));
    if (intervalState.phase === 'work') phaseLabel = 'Lavoro';
    else if (intervalState.phase === 'rest') phaseLabel = 'Recupero';
    else phaseLabel = 'Completato';
  }

  return (
    <View style={styles.runningWrap}>
      <Card style={styles.runningCard}>
        <Text style={typography.label}>{phaseLabel}</Text>
        <Text style={[styles.bigCountdown, { color: accent }]}>{bigText}</Text>
        {intervalState ? (
          <Text style={typography.caption}>{`Round ${intervalState.round}`}</Text>
        ) : null}
        {paused ? <Text style={typography.caption}>In pausa</Text> : null}
      </Card>

      <View style={styles.runningActions}>
        <Button
          label={paused ? 'Riprendi' : 'Pausa'}
          variant="secondary"
          onPress={onPauseToggle}
        />
        <Button
          label="Reset"
          onPress={onReset}
          style={{ backgroundColor: accent }}
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
  },
  runningCard: {
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.md,
  },
  bigCountdown: {
    fontFamily: typography.display.fontFamily,
    fontSize: 72,
    lineHeight: 78,
  },
  runningActions: {
    gap: spacing.md,
  },
});
