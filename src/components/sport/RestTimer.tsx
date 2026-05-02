import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/ThemeContext';
import { colors, radii, spacing, typography } from '@/theme';
import { successHaptic } from '@/utils/haptics';

// Countdown del recupero tra set: numero grosso al centro, barra di
// progresso lineare in basso. Re-render ogni 200ms per fluidità senza
// scomodare Animated. Quando `paused`, freeza il display al valore
// corrente — il provider si occupa di posticipare `endsAt` al resume,
// quindi alla ripresa il countdown riparte da dove era stato fermato.

type Props = {
  endsAt: number;
  durationSec: number;
  paused?: boolean;
  onComplete?: () => void;
};

const TICK_MS = 200;

export function RestTimer({ endsAt, durationSec, paused, onComplete }: Props) {
  const theme = useAppTheme();
  const [now, setNow] = useState(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
  }, [endsAt]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalMs = Math.max(1, durationSec * 1000);
  const progress = Math.min(1, Math.max(0, 1 - remainingMs / totalMs));

  useEffect(() => {
    if (paused) return;
    if (remainingMs <= 0 && !completedRef.current) {
      completedRef.current = true;
      void successHaptic();
      onComplete?.();
    }
  }, [remainingMs, paused, onComplete]);

  return (
    <View style={styles.container}>
      <Text style={typography.label}>Recupero</Text>
      <Text style={[styles.countdown, { color: theme.accent }]}>
        {formatSeconds(remainingSec)}
      </Text>
      <View style={styles.track}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.accent,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>
      {paused ? (
        <Text style={typography.caption}>In pausa</Text>
      ) : null}
    </View>
  );
}

function formatSeconds(total: number): string {
  const sec = Math.max(0, total);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.md,
  },
  countdown: {
    fontFamily: typography.display.fontFamily,
    fontSize: 64,
    lineHeight: 70,
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radii.round,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.round,
  },
});
