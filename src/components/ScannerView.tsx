import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '@/theme';

import { Icon } from './Icon';

// Vista scanner riusabile: camera + overlay del design handoff.
// - viewport arrotondato (radii.xxl)
// - griglia leggera (opacity 0.07)
// - corner markers verdi 22x22
// - scan-line animata
// - flash toggle (solo in variante `full`)

type ScannerVariant = 'full' | 'compact';

type ScannerViewProps = {
  onScan: (code: string) => void;
  // Quando true la scansione resta sospesa (utile dopo un hit, in attesa di reset).
  paused?: boolean;
  variant?: ScannerVariant;
  helperText?: string;
};

export function ScannerView({
  onScan,
  paused = false,
  variant = 'compact',
  helperText,
}: ScannerViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastCodeRef = useRef<string | null>(null);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Scan-line animata in loop quando la scansione è attiva.
  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine, paused]);

  // Reset lastCode alla ripresa: se l'app chiama `paused=false` è perché
  // vuole accettare di nuovo la stessa barcode (utente ha confermato/annullato).
  useEffect(() => {
    if (!paused) lastCodeRef.current = null;
  }, [paused]);

  const handleScanned = ({ data }: { data: string }) => {
    if (!data || paused) return;
    if (lastCodeRef.current === data) return;
    lastCodeRef.current = data;
    onScan(data);
  };

  if (!permission) {
    return (
      <View style={[styles.viewport, styles.statusBox, variant === 'full' && styles.viewportFull]}>
        <ActivityIndicator color={colors.card} />
        <Text style={[typography.caption, { color: colors.card }]}>Controllo dei permessi…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.viewport, styles.statusBox, variant === 'full' && styles.viewportFull]}>
        <Text style={[typography.body, { color: colors.card }]}>Fotocamera non disponibile</Text>
        <Text style={[typography.caption, { color: colors.card, textAlign: 'center' }]}>
          Abilita la fotocamera nelle impostazioni del sistema per scansionare i codici a barre.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.viewport, variant === 'full' && styles.viewportFull]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={paused ? undefined : handleScanned}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <GridOverlay />
      </View>

      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={styles.frame}>
          <CornerMarker position="tl" />
          <CornerMarker position="tr" />
          <CornerMarker position="bl" />
          <CornerMarker position="br" />

          <Animated.View
            style={[
              styles.scanLine,
              {
                opacity: paused ? 0 : 1,
                transform: [
                  {
                    translateY: scanLine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 134],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </View>

      {helperText ? (
        <View pointerEvents="none" style={styles.helperBar}>
          <Text style={[typography.caption, { color: colors.card, textAlign: 'center' }]}>
            {helperText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function GridOverlay() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity: 0.07 }}
    >
      {[20, 40, 60, 80].map((x) => (
        <Line key={`v-${x}`} x1={x} y1={0} x2={x} y2={100} stroke={colors.card} strokeWidth={0.3} />
      ))}
      {[20, 40, 60, 80].map((y) => (
        <Line key={`h-${y}`} x1={0} y1={y} x2={100} y2={y} stroke={colors.card} strokeWidth={0.3} />
      ))}
    </Svg>
  );
}

function CornerMarker({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const paths: Record<typeof position, string> = {
    tl: 'M0 8 L0 0 L8 0',
    tr: 'M14 0 L22 0 L22 8',
    bl: 'M0 14 L0 22 L8 22',
    br: 'M22 14 L22 22 L14 22',
  };
  const placement = {
    tl: { top: 0, left: 0 },
    tr: { top: 0, right: 0 },
    bl: { bottom: 0, left: 0 },
    br: { bottom: 0, right: 0 },
  }[position];
  return (
    <View style={[styles.corner, placement]}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Path d={paths[position]} stroke={colors.green} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// Toggle della torcia: rendering opzionale per la variante `full`.
// Componente UI puro — il wiring effettivo a `enableTorch` di CameraView
// è rinviato (basterebbe propagare lo stato fino a ScannerView).
export function ScannerFlashButton({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel="Flash"
      style={[styles.flashBtn, enabled && styles.flashBtnActive]}
    >
      <Icon name="target" size={18} color={enabled ? colors.text : colors.card} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewport: {
    aspectRatio: 4 / 3,
    borderRadius: radii.xxl,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  viewportFull: {
    aspectRatio: undefined,
    flex: 1,
    borderRadius: 0,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.screen,
  },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '72%',
    height: 140,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  scanLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: colors.green,
    borderRadius: radii.round,
  },
  helperBar: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
  },
  flashBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashBtnActive: {
    backgroundColor: colors.card,
  },
});
