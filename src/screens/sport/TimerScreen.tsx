import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { WheelPicker } from '@/components/WheelPicker';
import { colors, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

// Timer standalone: indipendente dalla sessione live (NON usa
// ActiveSessionContext né active_session). Tre modalità:
// - Tabata: preset 20s lavoro / 10s recupero / 8 round (modificabili).
// - Intervalli: lavoro/recupero/round liberi.
// - Libero: count-up dal momento dello Start.
//
// La logica di countdown è duplicata da RestTimer per pragmatismo:
// il piano nota esplicitamente "Pragmatismo prima di DRY". Quando
// avremo un terzo timer in app valuteremo l'estrazione.

type Mode = 'tabata' | 'intervalli' | 'libero';

const MODE_OPTIONS: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: 'tabata', label: 'Tabata' },
  { value: 'intervalli', label: 'Intervalli' },
  { value: 'libero', label: 'Libero' },
];

const TABATA_DEFAULT = { workSec: 20, restSec: 10, rounds: 8 };

type Phase = 'work' | 'rest' | 'done';

type IntervalState = {
  phase: Phase;
  round: number;
  endsAt: number;
};

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('tabata');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  // Config Tabata / Intervalli (stringhe per gli input):
  const [workSec, setWorkSec] = useState(String(TABATA_DEFAULT.workSec));
  const [restSec, setRestSec] = useState(String(TABATA_DEFAULT.restSec));
  const [rounds, setRounds] = useState(String(TABATA_DEFAULT.rounds));

  // Stato runtime del timer:
  const [intervalState, setIntervalState] = useState<IntervalState | null>(null);
  // Per il count-up "Libero":
  const [freeStartedAt, setFreeStartedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedTotalMs, setPausedTotalMs] = useState(0);

  // Tick ogni 200ms; ferma in pausa o quando non running.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [running, paused]);

  // Quando si cambia modalità mentre fermi, reset config se non Tabata.
  // Niente reset durante l'esecuzione (non serve, visto che il Avvia è
  // disabilitato).
  useEffect(() => {
    if (running) return;
    if (mode === 'tabata') {
      setWorkSec(String(TABATA_DEFAULT.workSec));
      setRestSec(String(TABATA_DEFAULT.restSec));
      setRounds(String(TABATA_DEFAULT.rounds));
    }
  }, [mode, running]);

  // Avanzamento Tabata/Intervalli: quando endsAt è scaduto e siamo in
  // running+!paused, passiamo alla fase successiva.
  const intervalStateRef = useRef(intervalState);
  useEffect(() => {
    intervalStateRef.current = intervalState;
  }, [intervalState]);
  useEffect(() => {
    if (!running || paused) return;
    if (mode === 'libero') return;
    if (!intervalState) return;
    if (Date.now() < intervalState.endsAt) return;
    advanceInterval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalState?.endsAt, running, paused, mode]);

  function parsedConfig(): { workSec: number; restSec: number; rounds: number } | null {
    const w = Number(workSec);
    const r = Number(restSec);
    const n = Number(rounds);
    if (!Number.isFinite(w) || w <= 0) return null;
    if (!Number.isFinite(r) || r < 0) return null;
    if (!Number.isFinite(n) || n <= 0) return null;
    return { workSec: Math.round(w), restSec: Math.round(r), rounds: Math.round(n) };
  }

  function totalMinutesPreview(): string | null {
    const cfg = parsedConfig();
    if (!cfg) return null;
    const totalSec = cfg.rounds * (cfg.workSec + cfg.restSec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m === 0) return `${s} sec totali`;
    if (s === 0) return `${m} min totali`;
    return `${m} min ${s} sec totali`;
  }

  function start() {
    if (mode === 'libero') {
      setFreeStartedAt(Date.now());
      setPausedTotalMs(0);
      setPausedAt(null);
      setRunning(true);
      setPaused(false);
      return;
    }
    const cfg = parsedConfig();
    if (!cfg) {
      toast.show('Valori non validi');
      return;
    }
    setIntervalState({
      phase: 'work',
      round: 1,
      endsAt: Date.now() + cfg.workSec * 1000,
    });
    setPausedTotalMs(0);
    setPausedAt(null);
    setRunning(true);
    setPaused(false);
  }

  function pauseToggle() {
    if (!running) return;
    if (paused) {
      // Resume: riassorbi delta nella pausa cumulativa, posticipa endsAt.
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
  }

  function reset() {
    setRunning(false);
    setPaused(false);
    setIntervalState(null);
    setFreeStartedAt(null);
    setPausedAt(null);
    setPausedTotalMs(0);
  }

  function finish() {
    reset();
    toast.show('Timer terminato');
  }

  function advanceInterval() {
    const cfg = parsedConfig();
    const current = intervalStateRef.current;
    if (!cfg || !current) return;
    const now = Date.now();
    if (current.phase === 'work') {
      if (cfg.restSec > 0) {
        setIntervalState({
          phase: 'rest',
          round: current.round,
          endsAt: now + cfg.restSec * 1000,
        });
        return;
      }
      // Recupero a 0 → vai al prossimo round o termina.
    }
    // Era in 'rest' (o work con restSec=0): incrementa round.
    if (current.round >= cfg.rounds) {
      // Allenamento completato.
      setIntervalState({ phase: 'done', round: cfg.rounds, endsAt: now });
      setRunning(false);
      setPaused(false);
      toast.show('Allenamento completato');
      return;
    }
    setIntervalState({
      phase: 'work',
      round: current.round + 1,
      endsAt: now + cfg.workSec * 1000,
    });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Timer"
        subtitle="Tabata, intervalli, libero"
        style={{ paddingTop: insets.top + spacing.xl }}
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
            <SegmentedControl<Mode>
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
            />

            {mode === 'tabata' ? (
              <Card style={styles.card}>
                <Text style={typography.label}>Tabata</Text>
                <Text style={typography.caption}>
                  Preset 20s lavoro / 10s recupero / 8 round (modificabili)
                </Text>
                <ConfigPickers
                  workSec={workSec}
                  restSec={restSec}
                  rounds={rounds}
                  setWorkSec={setWorkSec}
                  setRestSec={setRestSec}
                  setRounds={setRounds}
                  accent={theme.accent}
                />
                {totalMinutesPreview() ? (
                  <Text style={typography.caption}>
                    {`${rounds} × (${workSec}s lavoro + ${restSec}s recupero) = ${totalMinutesPreview()}`}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            {mode === 'intervalli' ? (
              <Card style={styles.card}>
                <Text style={typography.label}>Intervalli</Text>
                <ConfigPickers
                  workSec={workSec}
                  restSec={restSec}
                  rounds={rounds}
                  setWorkSec={setWorkSec}
                  setRestSec={setRestSec}
                  setRounds={setRounds}
                  accent={theme.accent}
                />
                {totalMinutesPreview() ? (
                  <Text style={typography.caption}>
                    {totalMinutesPreview()}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            {mode === 'libero' ? (
              <Card style={styles.card}>
                <Text style={typography.label}>Libero</Text>
                <Text style={typography.caption}>
                  Count-up dal momento dello Start. Nessun limite.
                </Text>
              </Card>
            ) : null}

            <Button
              label="Avvia"
              onPress={start}
              style={{ backgroundColor: theme.accent }}
            />
          </>
        ) : (
          <RunningView
            mode={mode}
            paused={paused}
            intervalState={intervalState}
            freeStartedAt={freeStartedAt}
            pausedTotalMs={pausedTotalMs}
            pausedAt={pausedAt}
            onPauseToggle={pauseToggle}
            onReset={reset}
            onFinish={finish}
            accent={theme.accent}
          />
        )}
      </ScrollView>
    </View>
  );
}

type ConfigPickersProps = {
  workSec: string;
  restSec: string;
  rounds: string;
  setWorkSec: (s: string) => void;
  setRestSec: (s: string) => void;
  setRounds: (s: string) => void;
  accent: string;
};

function ConfigPickers({
  workSec,
  restSec,
  rounds,
  setWorkSec,
  setRestSec,
  setRounds,
  accent,
}: ConfigPickersProps) {
  return (
    <View style={styles.pickerRow}>
      <View style={styles.pickerCol}>
        <Text style={typography.label}>Lavoro</Text>
        <WheelPicker
          value={Number(workSec) || TABATA_DEFAULT.workSec}
          onChange={(n) => setWorkSec(String(n))}
          min={5}
          max={300}
          step={5}
          suffix="sec"
          accent={accent}
        />
      </View>
      <View style={styles.pickerCol}>
        <Text style={typography.label}>Recupero</Text>
        <WheelPicker
          value={Number(restSec) || TABATA_DEFAULT.restSec}
          onChange={(n) => setRestSec(String(n))}
          min={5}
          max={300}
          step={5}
          suffix="sec"
          accent={accent}
        />
      </View>
      <View style={styles.pickerCol}>
        <Text style={typography.label}>Round</Text>
        <WheelPicker
          value={Number(rounds) || TABATA_DEFAULT.rounds}
          onChange={(n) => setRounds(String(n))}
          min={1}
          max={30}
          step={1}
          suffix="round"
          accent={accent}
        />
      </View>
    </View>
  );
}

type RunningViewProps = {
  mode: Mode;
  paused: boolean;
  intervalState: IntervalState | null;
  freeStartedAt: number | null;
  pausedTotalMs: number;
  pausedAt: number | null;
  onPauseToggle: () => void;
  onReset: () => void;
  onFinish: () => void;
  accent: string;
};

function RunningView({
  mode,
  paused,
  intervalState,
  freeStartedAt,
  pausedTotalMs,
  pausedAt,
  onPauseToggle,
  onReset,
  onFinish,
  accent,
}: RunningViewProps) {
  const isFree = mode === 'libero';
  const now = Date.now();

  let bigText = '00:00';
  let phaseLabel = '';

  if (isFree && freeStartedAt) {
    const currentPause = pausedAt ? now - pausedAt : 0;
    const elapsedMs = now - freeStartedAt - pausedTotalMs - currentPause;
    bigText = formatSeconds(Math.floor(Math.max(0, elapsedMs) / 1000));
    phaseLabel = 'Tempo';
  } else if (intervalState) {
    const remainingMs = Math.max(0, intervalState.endsAt - now);
    bigText = formatSeconds(Math.ceil(remainingMs / 1000));
    if (intervalState.phase === 'work') phaseLabel = 'Lavoro';
    else if (intervalState.phase === 'rest') phaseLabel = 'Recupero';
    else phaseLabel = 'Completato';
  }

  return (
    <View style={styles.runningWrap}>
      <Card style={styles.runningCard}>
        <Text style={typography.label}>{phaseLabel || 'Timer'}</Text>
        <Text style={[styles.bigCountdown, { color: accent }]}>{bigText}</Text>
        {intervalState && !isFree ? (
          <Text style={typography.caption}>
            Round {intervalState.round}
          </Text>
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
          variant="secondary"
          onPress={onReset}
        />
        <Button
          label="Termina"
          onPress={onFinish}
          style={{ backgroundColor: accent }}
        />
      </View>
    </View>
  );
}

function formatSeconds(total: number): string {
  const sec = Math.max(0, total);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.screen, gap: spacing.screen },
  card: { padding: spacing.screen, gap: spacing.md },
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
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-around',
  },
  pickerCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
});
