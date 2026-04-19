import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

type Option<T extends string | number> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string | number> = {
  options: ReadonlyArray<Option<T>>;
  value: T | null;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
};

// Toggle a pillola in stile design system: singola barra con opzioni
// equivalenti, selezione piena su sfondo card. Usato per il sesso M/F
// ma generico su qualsiasi valore piccolo.
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: '#1E2532',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    ...typography.body,
    color: colors.textSec,
  },
  labelActive: {
    color: colors.text,
    fontFamily: typography.value.fontFamily,
  },
});
