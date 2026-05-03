import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, View } from 'react-native';

import { colors, fontFamily } from '@/theme';

// Modal fullscreen che mostra una sequenza animata 5→4→3→2→1, un numero
// per secondo, su sfondo accent saturo. Ogni numero entra "piccolo →
// grande con dissolvenza" (stile videogame), poi esce con un altro burst.
// `onTick(n)` viene chiamato all'inizio di ogni numero — il consumer lo
// usa per audio + haptic. Niente "0" o "GO" finale: arrivati a "1" parte
// `onComplete` e si chiude (decisione di prodotto del brainstorm).

type CountdownOverlayProps = {
  visible: boolean;
  from?: number;
  onComplete: () => void;
  accent: string;
  onTick?: (n: number) => void;
};

const CYCLE_MS = 1000;

export function CountdownOverlay({
  visible,
  from = 5,
  onComplete,
  accent,
  onTick,
}: CountdownOverlayProps) {
  const [current, setCurrent] = useState(from);
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cycleAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!visible) {
      cycleAnimRef.current?.stop();
      cycleAnimRef.current = null;
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      setCurrent(from);
      return;
    }

    let n = from;
    setCurrent(n);
    runCycle(n);

    function runCycle(value: number) {
      onTickRef.current?.(value);
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      const cycle = Animated.parallel([
        Animated.sequence([
          // 0-200ms: fade in espansivo
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          // 200-900ms: hold opacity
          Animated.delay(700),
          // 900-1000ms: fade out
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          // 0-200ms: scale 0.3 → 1.5
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          // 200-900ms: scale 1.5 → 1.0 (lieve compressione)
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 700,
            useNativeDriver: true,
          }),
          // 900-1000ms: scale 1.0 → 1.7 (burst di uscita)
          Animated.timing(scaleAnim, {
            toValue: 1.7,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]);
      cycleAnimRef.current = cycle;
      cycle.start();

      cycleTimerRef.current = setTimeout(() => {
        const next = value - 1;
        if (next < 1) {
          onCompleteRef.current();
          return;
        }
        n = next;
        setCurrent(next);
        runCycle(next);
      }, CYCLE_MS);
    }

    return () => {
      cycleAnimRef.current?.stop();
      cycleAnimRef.current = null;
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, from]);

  return (
    <Modal
      animationType="fade"
      transparent={false}
      visible={visible}
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={[styles.container, { backgroundColor: accent }]}>
        <Animated.Text
          style={[
            styles.number,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {current}
        </Animated.Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fontFamily.extrabold,
    fontSize: 160,
    lineHeight: 180,
    color: colors.card,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
