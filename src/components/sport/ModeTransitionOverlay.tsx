import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import type { AppMode } from '@/database';
import { APP_NAME_SPORT, colors, sportColors, typography } from '@/theme';

import { Icon } from '../Icon';

// Splash di transizione tra modalità (Fase 5):
// - 200ms fade-in opacity 0 → 1 con il "volto" della modalità destinazione
// - 300ms hold con wordmark + sottotitolo
// - 200ms fade-out opacity 1 → 0
//
// Mostra solo testo (placeholder): l'asset definitivo del wordmark
// "FitTrack" arriva dopo il merge della Fase 5 — sarà un piccolo Edit.
//
// `pointerEvents="none"` sempre: l'utente non interagisce con l'overlay,
// e il navigator sotto resta accessibile (in pratica per i 700ms di
// animazione l'overlay copre lo schermo ma non blocca i tocchi residui).

type Props = { mode: AppMode };

const FADE_IN_MS = 200;
const HOLD_MS = 300;
const FADE_OUT_MS = 200;

export function ModeTransitionOverlay({ mode }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [renderMode, setRenderMode] = useState<AppMode | null>(null);
  const prevModeRef = useRef<AppMode>(mode);

  useEffect(() => {
    if (mode === prevModeRef.current) return;
    prevModeRef.current = mode;
    setRenderMode(mode);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setRenderMode(null);
    });
  }, [mode, opacity]);

  if (renderMode === null) return null;

  const isSport = renderMode === 'sport';
  const bg = isSport ? sportColors.accent : colors.bg;
  const txt = isSport ? '#FFFFFF' : colors.text;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        { opacity, backgroundColor: bg },
      ]}
    >
      {isSport ? <Icon name="bolt" size={48} color={txt} /> : null}
      <Text style={[styles.brand, { color: txt }]}>
        {isSport ? APP_NAME_SPORT : 'FatTrack'}
      </Text>
      <Text style={[styles.subtitle, { color: txt }]}>
        {isSport ? 'Modalità sport' : 'Modalità dieta'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 9999,
  },
  brand: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: typography.display.fontFamily,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.caption,
    opacity: 0.85,
  },
});
