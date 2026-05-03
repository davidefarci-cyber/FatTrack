import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAppTheme } from '@/theme/ThemeContext';
import { colors, radii, spacing, typography } from '@/theme';
import { lightHaptic, successHaptic } from '@/utils/haptics';

// Countdown del recupero tra set: pie chart SVG che si svuota in senso
// orario, numero centrale, pulsante "+30s" sotto. Re-render ogni 200ms
// per fluidità senza scomodare Animated. Quando `paused`, freeza il
// display al valore corrente — il provider si occupa di posticipare
// `endsAt` al resume, quindi alla ripresa il countdown riparte da dove
// era stato fermato.

type Props = {
  endsAt: number;
  durationSec: number;
  paused?: boolean;
  onComplete?: () => void;
  onExtend?: (seconds: number) => void;
};

const TICK_MS = 200;
const RING_SIZE = 200;
const RING_RADIUS = 88;
const RING_STROKE = 12;
const BIP_SECONDS = [5, 4, 3, 2, 1] as const;

export function RestTimer({
  endsAt,
  durationSec,
  paused,
  onComplete,
  onExtend,
}: Props) {
  const theme = useAppTheme();
  const [now, setNow] = useState(Date.now());
  const completedRef = useRef(false);
  // Set di secondi già "biparati" per questo recupero: evita che i tick
  // a 200ms emettano due haptic sullo stesso bordo del secondo.
  const bipFiredRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    completedRef.current = false;
    bipFiredRef.current = new Set();
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
      return;
    }
    if (remainingMs > 0 && BIP_SECONDS.includes(remainingSec as 5)) {
      const fired = bipFiredRef.current;
      if (!fired.has(remainingSec)) {
        fired.add(remainingSec);
        void lightHaptic();
      }
    }
  }, [remainingMs, remainingSec, paused, onComplete]);

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const sweep = progress * 360;
  const arcPath = describeArc(cx, cy, RING_RADIUS, -90, -90 + sweep);

  const extendDisabled = !!paused || !onExtend;

  return (
    <View style={styles.container}>
      <Text style={typography.label}>Recupero</Text>
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
            {formatSeconds(remainingSec)}
          </Text>
        </View>
      </View>
      {onExtend ? (
        <Pressable
          onPress={() => {
            if (extendDisabled) return;
            void lightHaptic();
            onExtend(30);
          }}
          disabled={extendDisabled}
          style={({ pressed }) => [
            styles.extendBtn,
            { borderColor: theme.accent, backgroundColor: theme.bgTint },
            extendDisabled && styles.extendBtnDisabled,
            pressed && !extendDisabled && styles.extendBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Aggiungi 30 secondi al recupero"
          accessibilityState={{ disabled: extendDisabled }}
        >
          <Text style={[typography.bodyBold, { color: theme.accent }]}>+30s</Text>
        </Pressable>
      ) : null}
      {paused ? <Text style={typography.caption}>In pausa</Text> : null}
    </View>
  );
}

function formatSeconds(total: number): string {
  const sec = Math.max(0, total);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Arco da `startAngle` a `endAngle` (gradi) disegnato in senso orario.
// Convenzione SVG-friendly: 0° è a destra, gli angoli crescono in senso
// orario nel sistema di coordinate SVG (Y verso il basso). Per evitare
// che il flag M+A degeneri quando l'arco è quasi 360°, taglia il sweep
// a 359.999° prima di chiamare.
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const safeEnd = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, safeEnd);
  const largeArcFlag = safeEnd - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.md,
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
  },
  countdown: {
    fontFamily: typography.display.fontFamily,
    fontSize: 56,
    lineHeight: 62,
  },
  extendBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendBtnDisabled: {
    opacity: 0.5,
  },
  extendBtnPressed: {
    opacity: 0.85,
  },
});
