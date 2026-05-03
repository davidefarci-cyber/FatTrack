import { useEffect, useMemo, useRef } from 'react';
import type {
  AccessibilityActionEvent,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

// Selettore numerico verticale snap-to-interval. Riusabile in qualsiasi
// schermata che debba raccogliere un numero ranged (reps, sec, kg, …).
// FlatList built-in, niente lib esterne. Il valore selezionato si centra
// nella finestra; sopra/sotto sfumano in opacity decrescente.

type WheelPickerProps = {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  // Marker tenue (opacity 0.5) sull'item corrispondente al valore
  // prescritto. Pensato per indicare "qui c'è il default" in pickers
  // che editano una scelta personalizzata (es. reps fatte vs prescritte).
  prescribedValue?: number;
  height?: number;
  itemHeight?: number;
  // Tinta dell'item selezionato. Default colors.text; in modalità sport
  // i caller passano l'accent del theme.
  accent?: string;
};

export function WheelPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  prescribedValue,
  height = 180,
  itemHeight = 44,
  accent = colors.text,
}: WheelPickerProps) {
  const data = useMemo(() => {
    const arr: number[] = [];
    for (let v = min; v <= max; v += step) arr.push(v);
    return arr;
  }, [min, max, step]);

  const listRef = useRef<FlatList<number>>(null);
  const isUserScrollingRef = useRef(false);

  const indexFromValue = (v: number) => {
    const raw = Math.round((v - min) / step);
    return Math.max(0, Math.min(data.length - 1, raw));
  };
  const selectedIndex = indexFromValue(value);
  const verticalPadding = (height - itemHeight) / 2;

  // Pre-calcoliamo le opacity per evitare di ricalcolare su ogni
  // renderItem. Re-memoizzata solo quando il valore selezionato cambia.
  const opacities = useMemo(() => {
    return data.map((_, idx) => {
      const dist = Math.abs(idx - selectedIndex);
      if (dist === 0) return 1;
      if (dist === 1) return 0.5;
      if (dist === 2) return 0.25;
      return 0.1;
    });
  }, [data, selectedIndex]);

  // Quando value cambia da fuori, riallinea lo scroll. Skip se l'utente
  // sta trascinando in quel momento — lasciamo che il momentum si concluda
  // e il prossimo onMomentumScrollEnd determini il valore reale.
  useEffect(() => {
    if (isUserScrollingRef.current) return;
    listRef.current?.scrollToOffset({
      offset: selectedIndex * itemHeight,
      animated: false,
    });
  }, [selectedIndex, itemHeight]);

  const onScrollBeginDrag = () => {
    isUserScrollingRef.current = true;
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserScrollingRef.current = false;
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = Math.max(
      0,
      Math.min(data.length - 1, Math.round(offsetY / itemHeight)),
    );
    const next = min + idx * step;
    if (next !== value) onChange(next);
  };

  const renderItem: ListRenderItem<number> = ({ item, index }) => {
    const isSelected = index === selectedIndex;
    const isPrescribed =
      prescribedValue !== undefined && item === prescribedValue;
    return (
      <View style={[styles.row, { height: itemHeight }]}>
        <Text
          style={
            isSelected
              ? [styles.selectedText, { color: accent }]
              : [styles.unselectedText, { opacity: opacities[index] }]
          }
        >
          {item}
        </Text>
        {isPrescribed && !isSelected ? (
          <View pointerEvents="none" style={styles.prescribedMarker} />
        ) : null}
      </View>
    );
  };

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const action = e.nativeEvent.actionName;
    if (action === 'increment') {
      const next = clamp(value + step);
      if (next !== value) onChange(next);
    } else if (action === 'decrement') {
      const next = clamp(value - step);
      if (next !== value) onChange(next);
    }
  };

  return (
    <View
      style={[styles.container, { height }]}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min,
        max,
        now: value,
        text: `${value}${suffix ? ` ${suffix}` : ''}`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => String(item)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: verticalPadding }}
        getItemLayout={(_, idx) => ({
          length: itemHeight,
          offset: itemHeight * idx,
          index: idx,
        })}
        initialScrollIndex={selectedIndex}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />
      {/* Fade overlays — leggera vignetta verso colors.bg sopra/sotto. */}
      <View
        pointerEvents="none"
        style={[styles.fadeTop, { height: verticalPadding }]}
      />
      <View
        pointerEvents="none"
        style={[styles.fadeBottom, { height: verticalPadding }]}
      />
      {/* Linee sottili sopra/sotto la slot del valore selezionato. */}
      <View
        pointerEvents="none"
        style={[styles.centerLine, { top: verticalPadding }]}
      />
      <View
        pointerEvents="none"
        style={[styles.centerLine, { top: verticalPadding + itemHeight }]}
      />
      {/* Suffix subito sotto il centro, sopra il fade. */}
      {suffix ? (
        <View
          pointerEvents="none"
          style={[
            styles.suffixOverlay,
            { top: verticalPadding + itemHeight + spacing.xxs },
          ]}
        >
          <Text style={[typography.caption, { color: accent }]}>{suffix}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    ...typography.value,
  },
  unselectedText: {
    ...typography.body,
    color: colors.text,
  },
  prescribedMarker: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSec,
    opacity: 0.5,
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  suffixOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    opacity: 0.45,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    opacity: 0.45,
  },
});
