import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, typography } from '@/theme';
import { lightHaptic, successHaptic } from '@/utils/haptics';
import { describeArc } from '@/utils/svgArc';

// Pulsante hero "Avvia" del Tabata: hold-to-confirm con animazione di
// riempimento ad arco SVG (-90° → 360° in holdDurationMs) e glow accent
// crescente. Il rilascio prima del completamento annulla. Pensato per il
// flow "premi e tieni" specifico del Tabata; vive in `sport/` perché il
// caso d'uso è dedicato.

type HoldToStartButtonProps = {
  onConfirm: () => void;
  holdDurationMs?: number;
  label?: string;
  size?: number;
  accent: string;
  disabled?: boolean;
};

const STROKE_WIDTH = 6;
const SVG_PADDING = 8;
const TICK_HAPTIC_MS = 500;

export function HoldToStartButton({
  onConfirm,
  holdDurationMs = 2000,
  label = 'Avvia',
  size = 160,
  accent,
  disabled = false,
}: HoldToStartButtonProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0); // 0..1, mirror animato per SVG
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => setProgress(value));
    return () => {
      progressAnim.removeListener(id);
    };
  }, [progressAnim]);

  const cancel = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    progressAnim.stopAnimation();
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handlePressIn = () => {
    if (disabled) return;
    confirmedRef.current = false;
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: holdDurationMs,
      useNativeDriver: false,
    }).start();

    tickIntervalRef.current = setInterval(() => {
      if (!confirmedRef.current) void lightHaptic();
    }, TICK_HAPTIC_MS);

    holdTimerRef.current = setTimeout(() => {
      confirmedRef.current = true;
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      void successHaptic();
      onConfirm();
    }, holdDurationMs);
  };

  const handlePressOut = () => {
    if (confirmedRef.current) return;
    cancel();
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  // Geometria del cerchio + arco progressivo.
  const svgSize = size + SVG_PADDING * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = size / 2;
  const sweep = Math.min(progress, 0.9999) * 360;
  const arcPath = describeArc(cx, cy, radius, -90, -90 + sweep);

  // Visual feedback: il pulsante si comprime leggermente quando held.
  const scale = 1 - progress * 0.05;
  const glowOpacity = 0.25 + progress * 0.6;

  return (
    <View
      style={[
        styles.wrap,
        { width: svgSize, height: svgSize },
      ]}
    >
      <View
        style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: accent,
            shadowOpacity: glowOpacity,
            shadowRadius: 18 + progress * 22,
            elevation: 6 + Math.round(progress * 12),
          },
        ]}
        pointerEvents="none"
      />
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label} — tieni premuto per ${holdDurationMs / 1000} secondi`}
        accessibilityHint="Tieni premuto per confermare l'avvio."
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: accent,
            transform: [{ scale }],
            opacity: disabled ? 0.5 : pressed ? 0.95 : 1,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.card }]}>{label}</Text>
      </Pressable>
      {sweep > 0 ? (
        <Svg
          width={svgSize}
          height={svgSize}
          style={styles.svgOverlay}
          pointerEvents="none"
        >
          <Path
            d={arcPath}
            fill="none"
            stroke={accent}
            strokeOpacity={0.6}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.h1,
    color: colors.card,
    letterSpacing: 0.5,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
