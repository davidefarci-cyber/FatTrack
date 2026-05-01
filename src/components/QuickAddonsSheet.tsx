import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import type { QuickAddon } from '@/database';
import { colors, radii, spacing, typography } from '@/theme';

// Sheet di selezione delle "Aggiunte rapide" (contorno, zucchero, grana, …).
// Si apre da un pasto in Home; ogni tap su una riga aggiunge l'addon al pasto
// senza chiudere lo sheet, così si possono accumulare aggiunte. Lo sheet si
// chiude solo con tap sul backdrop o swipe-down (gestito da BottomSheet).
// Per dare feedback al tap (altrimenti invisibile, l'addon va nello state del
// pasto sotto allo sheet) la riga premuta combina due segnali:
// - un "punch" fisico: scale 1 → 0.94 → 1 con rimbalzo (Animated.spring)
// - un flash di stato per ~800ms: icona da plus a check, bubble piena,
//   label "Aggiunto" al posto delle kcal.

const FEEDBACK_DURATION_MS = 800;

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  addons: QuickAddon[];
  onPick: (addon: QuickAddon) => void;
};

export function QuickAddonsSheet({ visible, onClose, title, addons, onPick }: Props) {
  const [recentId, setRecentId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Una scale value per riga, lazy: la creiamo al primo render dell'addon
  // e la conserviamo fra render. La Map vive nel ref, non viene re-istanziata.
  const scaleMap = useRef(new Map<number, Animated.Value>()).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Reset del feedback quando lo sheet si chiude: alla riapertura la riga
  // non deve apparire ancora "appena aggiunta".
  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setRecentId(null);
    }
  }, [visible]);

  function getScale(id: number): Animated.Value {
    let v = scaleMap.get(id);
    if (!v) {
      v = new Animated.Value(1);
      scaleMap.set(id, v);
    }
    return v;
  }

  function handlePick(addon: QuickAddon) {
    onPick(addon);
    setRecentId(addon.id);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRecentId(null), FEEDBACK_DURATION_MS);

    const scale = getScale(addon.id);
    // Tap rapidi: stoppiamo eventuale animazione in corso e ripartiamo da
    // 1, così ogni tap ha il proprio "punch" anche se ravvicinato.
    scale.stopAnimation();
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={55}>
      <View style={styles.header}>
        <Text style={typography.h1}>Aggiunte rapide</Text>
        <Text style={typography.caption}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {addons.map((addon, idx) => {
          const justAdded = recentId === addon.id;
          const scale = getScale(addon.id);
          return (
            <Pressable
              key={addon.id}
              onPress={() => handlePick(addon)}
              accessibilityRole="button"
              accessibilityLabel={`Aggiungi ${addon.label}`}
              accessibilityState={{ selected: justAdded }}
            >
              <Animated.View
                style={[
                  styles.row,
                  idx < addons.length - 1 && styles.rowDivider,
                  { transform: [{ scale }] },
                ]}
              >
                <View style={[styles.iconBubble, justAdded && styles.iconBubbleActive]}>
                  <Icon
                    name={justAdded ? 'check' : 'plus'}
                    size={14}
                    color={justAdded ? colors.card : colors.green}
                  />
                </View>
                <Text style={[typography.body, styles.label]} numberOfLines={1}>
                  {addon.label}
                </Text>
                {justAdded ? (
                  <Text style={[typography.bodyBold, styles.addedLabel]}>Aggiunto</Text>
                ) : (
                  <Text style={typography.bodyBold}>
                    {Math.round(addon.calories).toLocaleString('it-IT')} kcal
                  </Text>
                )}
              </Animated.View>
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xxs,
    paddingBottom: spacing.xl,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleActive: {
    backgroundColor: colors.green,
  },
  label: {
    flex: 1,
  },
  addedLabel: {
    color: colors.green,
  },
});
