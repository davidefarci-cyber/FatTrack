import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radii, spacing, typography } from '@/theme';

export type OptionItem<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

type OptionSelectProps<T extends string | number> = {
  options: ReadonlyArray<OptionItem<T>>;
  value: T | null;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
};

// Lista verticale di opzioni a selezione singola. Ogni riga mostra label
// principale + descrizione opzionale; lo stato attivo usa il verde FatTrack
// sul bordo e una spunta coerente con `Icon`.
export function OptionSelect<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: OptionSelectProps<T>) {
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
            style={[styles.row, active && styles.rowActive]}
          >
            <View style={styles.textCol}>
              <Text style={[styles.label, active && styles.labelActive]}>
                {opt.label}
              </Text>
              {opt.description ? (
                <Text style={styles.description}>{opt.description}</Text>
              ) : null}
            </View>
            <View style={[styles.indicator, active && styles.indicatorActive]}>
              {active ? <Icon name="check" size={14} color={colors.card} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rowActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
  },
  textCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  labelActive: {
    fontFamily: typography.value.fontFamily,
  },
  description: {
    ...typography.caption,
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: radii.round,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
});
