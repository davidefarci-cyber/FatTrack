import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors, radii, shadows } from '@/theme';

type FABProps = {
  icon: IconName;
  onPress: () => void;
  color?: string;
  iconColor?: string;
  size?: number;
  iconSize?: number;
  bottom?: number;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FAB({
  icon,
  onPress,
  color = colors.purple,
  iconColor = colors.card,
  size = 52,
  iconSize = 22,
  bottom = 80,
  accessibilityLabel,
  disabled = false,
  style,
}: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.fab,
        shadows.md,
        {
          width: size,
          height: size,
          borderRadius: radii.round,
          backgroundColor: color,
          bottom,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
