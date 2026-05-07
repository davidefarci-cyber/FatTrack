import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppSettings } from '@/hooks/useAppSettings';
import { colors, spacing } from '@/theme';

import { Icon } from './Icon';

// Coppia user + cog usata nel right slot di tutti gli ScreenHeader dei
// due tab navigator. Decide la rotta del cog in base a appMode (Settings
// in diet, SportSettings in sport) e naviga a Profile per l'icona user
// (registrata come Tab.Screen nascosta in entrambi i navigator).
export function HeaderActions() {
  const navigation = useNavigation<{ navigate: (route: string) => void }>();
  const { appMode } = useAppSettings();
  const settingsRoute = appMode === 'sport' ? 'SportSettings' : 'Settings';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => navigation.navigate('Profile')}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Apri profilo"
      >
        <Icon name="user" size={24} color={colors.textSec} />
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate(settingsRoute)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Apri impostazioni"
      >
        <Icon name="cog" size={24} color={colors.textSec} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
});
