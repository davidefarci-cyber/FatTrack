import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { radii, shadows, spacing, typography } from '@/theme';
import { lightHaptic, successHaptic } from '@/utils/haptics';

// Pulsante pizza con hold-to-add. Tenendo premuto, le 6 fette spariscono
// staggered (250ms ciascuna, 1.5s totale). Al completamento appare un "+1"
// grande e viene chiamato `onComplete`. Rilasciando prima del completamento
// le fette si rifondono e niente viene aggiunto.
//
// La pizza è disegnata internamente in SVG: cerchio "padella" sotto, 6 path
// di fetta (cheese + topping pattern fisso) sopra. Le fette animano la
// loro `opacity` via Animated.Value individuali.

// Colori "scenografici" della pizza. Sono letterali e scoped a questo
// componente — non vanno nel theme (one-off easter egg, niente token
// pizza-specifici per altre schermate).
const PALETTE = {
  pan: '#2E1A0E', // padella sotto la pizza (marrone scuro)
  crust: '#A0651E', // bordo crosta
  cheese: '#F4C95D', // formaggio
  cheeseShadow: '#E0AE3D', // separazione fette
  pepperoni: '#C04A2C', // pepperoni
  basil: '#5A8F3E', // basilico
} as const;

const SLICE_COUNT = 6;
// Ogni fetta sparisce in 250ms, staggered → 1.5s totale per il successo.
const SLICE_DURATION_MS = 250;
const TOTAL_HOLD_MS = SLICE_COUNT * SLICE_DURATION_MS;
// Reset delle fette quando si rilascia in anticipo.
const RESET_DURATION_MS = 220;
// Quanto resta visibile il "+1" prima di tornare alla pizza intera.
const PLUS_ONE_VISIBLE_MS = 700;

const SIZE = 220; // diametro target del pulsante
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 6;
const CRUST_WIDTH = 10;

// Toppings per fetta. Pattern fisso (3 pepperoni / 3 basilico alternati) come
// richiesto dal design: niente randomizzazione runtime, identità visiva
// stabile dell'easter egg.
type Topping = { kind: 'pepperoni' | 'basil'; r: number; offset: number; angleOffsetDeg: number };

const SLICE_TOPPINGS: readonly (readonly Topping[])[] = [
  // Fetta 0: 2 pepperoni
  [
    { kind: 'pepperoni', r: 8, offset: 0.55, angleOffsetDeg: -10 },
    { kind: 'pepperoni', r: 6, offset: 0.78, angleOffsetDeg: 8 },
  ],
  // Fetta 1: basilico (3 foglie piccole)
  [
    { kind: 'basil', r: 5, offset: 0.5, angleOffsetDeg: 0 },
    { kind: 'basil', r: 4, offset: 0.7, angleOffsetDeg: -12 },
    { kind: 'basil', r: 4, offset: 0.72, angleOffsetDeg: 12 },
  ],
  // Fetta 2: 2 pepperoni
  [
    { kind: 'pepperoni', r: 7, offset: 0.6, angleOffsetDeg: 5 },
    { kind: 'pepperoni', r: 6, offset: 0.82, angleOffsetDeg: -8 },
  ],
  // Fetta 3: basilico (2 foglie + 1 pepperoni piccolo)
  [
    { kind: 'pepperoni', r: 5, offset: 0.55, angleOffsetDeg: -8 },
    { kind: 'basil', r: 4, offset: 0.75, angleOffsetDeg: 6 },
    { kind: 'basil', r: 4, offset: 0.65, angleOffsetDeg: 10 },
  ],
  // Fetta 4: 2 pepperoni
  [
    { kind: 'pepperoni', r: 8, offset: 0.58, angleOffsetDeg: 8 },
    { kind: 'pepperoni', r: 5, offset: 0.8, angleOffsetDeg: -10 },
  ],
  // Fetta 5: basilico (2 foglie)
  [
    { kind: 'basil', r: 5, offset: 0.55, angleOffsetDeg: 0 },
    { kind: 'basil', r: 4, offset: 0.78, angleOffsetDeg: -6 },
  ],
] as const;

function polarToCartesian(angleRad: number, distance: number) {
  return {
    x: CENTER + Math.cos(angleRad) * distance,
    y: CENTER + Math.sin(angleRad) * distance,
  };
}

// Path di una fetta = settore circolare (60°) dal centro al bordo, ruotato in
// modo che la fetta 0 punti verso l'alto (-90°).
function slicePath(index: number): string {
  const sliceAngleDeg = 360 / SLICE_COUNT;
  const startDeg = -90 + index * sliceAngleDeg;
  const endDeg = startDeg + sliceAngleDeg;
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const start = polarToCartesian(startRad, RADIUS - CRUST_WIDTH / 2);
  const end = polarToCartesian(endRad, RADIUS - CRUST_WIDTH / 2);
  return [
    `M ${CENTER} ${CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${RADIUS - CRUST_WIDTH / 2} ${RADIUS - CRUST_WIDTH / 2} 0 0 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function sliceCenterAngleRad(index: number): number {
  const sliceAngleDeg = 360 / SLICE_COUNT;
  const centerDeg = -90 + index * sliceAngleDeg + sliceAngleDeg / 2;
  return (centerDeg * Math.PI) / 180;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  onComplete: () => void;
  disabled?: boolean;
};

export function PizzaHoldButton({ onComplete, disabled }: Props) {
  // Una opacity per fetta + relativa "topping group" (tiene insieme cheese
  // e topping della stessa fetta).
  const sliceOpacities = useRef(
    Array.from({ length: SLICE_COUNT }, () => new Animated.Value(1)),
  ).current;
  const plusOneScale = useRef(new Animated.Value(0)).current;
  const plusOneOpacity = useRef(new Animated.Value(0)).current;

  const [busy, setBusy] = useState(false);
  const sequenceRef = useRef<Animated.CompositeAnimation | null>(null);
  // Indice dell'ultima fetta che ha "ticchettato" l'haptic. Usiamo un
  // listener su una Animated.Value per scandire i tick durante il timing.
  const tickProgress = useRef(new Animated.Value(0)).current;
  const lastTickedIndex = useRef(-1);

  useEffect(() => {
    const id = tickProgress.addListener(({ value }) => {
      // value ∈ [0,1] durante l'hold. Mappa a "quante fette sono già
      // sparite" e triggera lightHaptic quando attraversiamo la soglia.
      const slicesGone = Math.floor(value * SLICE_COUNT);
      if (slicesGone > lastTickedIndex.current && slicesGone <= SLICE_COUNT) {
        lastTickedIndex.current = slicesGone;
        if (slicesGone < SLICE_COUNT) {
          void lightHaptic();
        }
      }
    });
    return () => tickProgress.removeListener(id);
  }, [tickProgress]);

  const resetSlices = (duration: number) => {
    Animated.parallel(
      sliceOpacities.map((op) =>
        Animated.timing(op, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  };

  const showPlusOne = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(plusOneScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(plusOneOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(PLUS_ONE_VISIBLE_MS),
      Animated.parallel([
        Animated.timing(plusOneOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(plusOneScale, {
          toValue: 0.6,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (!finished) return;
      plusOneScale.setValue(0);
      plusOneOpacity.setValue(0);
      resetSlices(RESET_DURATION_MS);
      setBusy(false);
    });
  };

  const startHold = () => {
    if (busy || disabled) return;
    lastTickedIndex.current = -1;
    tickProgress.setValue(0);

    const holdAnimations: Animated.CompositeAnimation[] = [
      Animated.timing(tickProgress, {
        toValue: 1,
        duration: TOTAL_HOLD_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      ...sliceOpacities.map((op, i) =>
        Animated.timing(op, {
          toValue: 0,
          duration: SLICE_DURATION_MS,
          delay: i * SLICE_DURATION_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ];

    const seq = Animated.parallel(holdAnimations, { stopTogether: false });
    sequenceRef.current = seq;
    seq.start(({ finished }) => {
      sequenceRef.current = null;
      if (!finished) return;
      // Tutte le 6 fette sono andate → aggiungi pizza.
      setBusy(true);
      void successHaptic();
      onComplete();
      showPlusOne();
    });
  };

  const cancelHold = () => {
    if (busy) return;
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current = null;
    }
    tickProgress.stopAnimation();
    sliceOpacities.forEach((op) => op.stopAnimation());
    resetSlices(RESET_DURATION_MS);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={startHold}
        onPressOut={cancelHold}
        disabled={disabled || busy}
        style={({ pressed }) => [
          styles.pressable,
          shadows.md,
          pressed && !busy ? styles.pressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Tieni premuto per aggiungere una pizza"
        accessibilityHint="Le sei fette spariscono in 1,5 secondi"
      >
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Padella sotto: marrone scuro, sempre visibile (è quello che
              "appare" man mano che le fette spariscono). */}
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill={PALETTE.pan} />
          {/* Crosta: anello arancio/marrone tra padella e fette. */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS - CRUST_WIDTH / 2}
            stroke={PALETTE.crust}
            strokeWidth={CRUST_WIDTH}
            fill="none"
          />
          {/* Fette: cheese path + topping. Ogni fetta è un gruppo con la
              stessa opacity, così cheese e topping spariscono insieme. */}
          {Array.from({ length: SLICE_COUNT }).map((_, i) => {
            const opacity = sliceOpacities[i];
            return (
              <AnimatedPath
                key={`cheese-${i}`}
                d={slicePath(i)}
                fill={PALETTE.cheese}
                stroke={PALETTE.cheeseShadow}
                strokeWidth={1.5}
                opacity={opacity}
              />
            );
          })}
          {Array.from({ length: SLICE_COUNT }).map((_, i) => {
            const opacity = sliceOpacities[i];
            const centerAngle = sliceCenterAngleRad(i);
            return SLICE_TOPPINGS[i].map((topping, ti) => {
              const angleOffsetRad = (topping.angleOffsetDeg * Math.PI) / 180;
              const pos = polarToCartesian(
                centerAngle + angleOffsetRad,
                (RADIUS - CRUST_WIDTH) * topping.offset,
              );
              return (
                <AnimatedCircle
                  key={`topping-${i}-${ti}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={topping.r}
                  fill={
                    topping.kind === 'pepperoni' ? PALETTE.pepperoni : PALETTE.basil
                  }
                  opacity={opacity}
                />
              );
            });
          })}
        </Svg>
        {/* "+1" overlay che appare al completamento dell'hold. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.plusOneOverlay,
            {
              opacity: plusOneOpacity,
              transform: [{ scale: plusOneScale }],
            },
          ]}
        >
          <Text style={styles.plusOneText}>+1</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxs,
  },
  pressed: {
    opacity: 0.95,
  },
  plusOneOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOneText: {
    fontSize: 88,
    lineHeight: 96,
    fontFamily: typography.display.fontFamily,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 4 },
  },
});
