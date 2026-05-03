import { useEffect, useMemo, useRef } from 'react';
import type {
  AccessibilityActionEvent,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

// Selettore numerico snap-to-interval. Riusabile in qualsiasi schermata che
// debba raccogliere un numero ranged (reps, sec, kg, …). FlatList built-in,
// niente lib esterne. Il valore selezionato si centra nella finestra; gli
// item adiacenti sfumano in opacity decrescente.
//
// Due orientamenti:
// - 'vertical' (default, retrocompat con i caller esistenti): wheel a colonna,
//   altezza `height`, scroll verticale, fade in alto/basso.
// - 'horizontal': wheel a riga sottile e larga, larghezza `width`, scroll
//   orizzontale, fade a sinistra/destra. Il suffix NON è renderizzato
//   internamente (è responsabilità del caller mettere una label sotto la wheel).

type Orientation = 'vertical' | 'horizontal';

type WheelPickerProps = {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  // Renderizzato solo in vertical mode (overlay sotto lo slot centrale).
  // In horizontal il caller deve gestire la label esterna alla wheel.
  suffix?: string;
  // Marker tenue (opacity 0.5) sull'item corrispondente al valore prescritto.
  // In vertical: pallino a destra del numero. In horizontal: pallino sopra
  // il numero (più visibile in una wheel a riga).
  prescribedValue?: number;
  orientation?: Orientation;
  // Vertical-only: altezza totale e altezza item.
  height?: number;
  itemHeight?: number;
  // Horizontal-only: larghezza totale e larghezza item.
  width?: number;
  itemWidth?: number;
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
  orientation = 'vertical',
  height = 180,
  itemHeight = 44,
  width = 240,
  itemWidth = 64,
  accent = colors.text,
}: WheelPickerProps) {
  const isHorizontal = orientation === 'horizontal';
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

  // In horizontal il "main axis" è la X: dimensioni e padding ruotano.
  const itemMain = isHorizontal ? itemWidth : itemHeight;
  const totalMain = isHorizontal ? width : height;
  const padding = (totalMain - itemMain) / 2;

  // Pre-calcoliamo le opacity per evitare di ricalcolare su ogni renderItem.
  // Re-memoizzata solo quando il valore selezionato cambia.
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
      offset: selectedIndex * itemMain,
      animated: false,
    });
  }, [selectedIndex, itemMain]);

  const onScrollBeginDrag = () => {
    isUserScrollingRef.current = true;
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserScrollingRef.current = false;
    const offset = isHorizontal
      ? e.nativeEvent.contentOffset.x
      : e.nativeEvent.contentOffset.y;
    const idx = Math.max(
      0,
      Math.min(data.length - 1, Math.round(offset / itemMain)),
    );
    const next = min + idx * step;
    if (next !== value) onChange(next);
  };

  const renderItem: ListRenderItem<number> = ({ item, index }) => {
    const isSelected = index === selectedIndex;
    const isPrescribed =
      prescribedValue !== undefined && item === prescribedValue;
    const cellStyle = isHorizontal
      ? { width: itemWidth, height: itemHeight }
      : { height: itemHeight };
    return (
      <View style={[styles.row, cellStyle]}>
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
          <View
            pointerEvents="none"
            style={
              isHorizontal
                ? styles.prescribedMarkerHorizontal
                : styles.prescribedMarker
            }
          />
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

  const containerStyle = isHorizontal
    ? { width, height: itemHeight }
    : { height };

  return (
    <View
      style={[styles.container, containerStyle]}
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
        horizontal={isHorizontal}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemMain}
        decelerationRate="fast"
        contentContainerStyle={
          isHorizontal
            ? { paddingHorizontal: padding }
            : { paddingVertical: padding }
        }
        getItemLayout={(_, idx) => ({
          length: itemMain,
          offset: itemMain * idx,
          index: idx,
        })}
        initialScrollIndex={selectedIndex}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />
      {/* Fade overlays — vignetta verso colors.bg sui bordi della wheel. */}
      {isHorizontal ? (
        <>
          <View
            pointerEvents="none"
            style={[styles.fadeLeft, { width: padding }]}
          />
          <View
            pointerEvents="none"
            style={[styles.fadeRight, { width: padding }]}
          />
        </>
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[styles.fadeTop, { height: padding }]}
          />
          <View
            pointerEvents="none"
            style={[styles.fadeBottom, { height: padding }]}
          />
        </>
      )}
      {/* Linee di slot del valore selezionato. */}
      {isHorizontal ? (
        <>
          <View
            pointerEvents="none"
            style={[styles.centerLineVertical, { left: padding }]}
          />
          <View
            pointerEvents="none"
            style={[styles.centerLineVertical, { left: padding + itemWidth }]}
          />
        </>
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[styles.centerLineHorizontal, { top: padding }]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.centerLineHorizontal,
              { top: padding + itemHeight },
            ]}
          />
        </>
      )}
      {/* Suffix solo in vertical: overlay sotto lo slot centrale. In horizontal
          il caller renderizza la label esternamente alla wheel. */}
      {!isHorizontal && suffix ? (
        <View
          pointerEvents="none"
          style={[
            styles.suffixOverlay,
            { top: padding + itemHeight + spacing.xxs },
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
  prescribedMarkerHorizontal: {
    position: 'absolute',
    top: spacing.xxs,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSec,
    opacity: 0.5,
  },
  centerLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  centerLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
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
  fadeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg,
    opacity: 0.45,
  },
  fadeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: colors.bg,
    opacity: 0.45,
  },
});
