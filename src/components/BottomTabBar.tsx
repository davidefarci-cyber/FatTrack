import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing, typography } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './Icon';

type TabConfig = { routeName: string; label: string; icon: IconName };

// Tab bar a 5 voci: Barcode · Preferiti · Home (FAB centrale) · Storico · Cerca.
// L'ordine nel TabParamList mette la Home al centro così il FAB rialzato è
// visualmente centrato; `initialRouteName` sul Tab.Navigator garantisce comunque
// l'avvio sulla Home.
// Settings resta registrato come Tab.Screen ma non è in TAB_CONFIG: il
// renderer salta le rotte non configurate (`if (!config) return null;`),
// quindi non appare nella bar. È raggiungibile dall'icona ingranaggio in
// alto a destra di Home.
const TAB_CONFIG: Record<string, TabConfig> = {
  Barcode: { routeName: 'Barcode', label: 'Scansiona', icon: 'barcode' },
  Favorites: { routeName: 'Favorites', label: 'Preferiti', icon: 'star' },
  Home: { routeName: 'Home', label: 'Home', icon: 'home' },
  History: { routeName: 'History', label: 'Storico', icon: 'chart' },
  FoodSearch: { routeName: 'FoodSearch', label: 'Cerca', icon: 'search' },
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const config = TAB_CONFIG[route.name];
        if (!config) return null;

        const isFocused = state.index === index;
        const tint = isFocused ? colors.green : colors.textSec;
        const isHome = route.name === 'Home';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        if (isHome) {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <View
                style={[
                  styles.homeFab,
                  shadows.sm,
                  { backgroundColor: isFocused ? colors.green : colors.text },
                ]}
              >
                <Icon name="home" size={22} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: tint, fontFamily: isFocused ? typography.bodyBold.fontFamily : typography.caption.fontFamily },
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <Icon name={config.icon} size={22} color={tint} />
            <Text
              style={[
                styles.tabLabel,
                { color: tint, fontFamily: isFocused ? typography.bodyBold.fontFamily : typography.caption.fontFamily },
              ]}
            >
              {config.label}
            </Text>
            <View style={[styles.dot, isFocused && styles.dotActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 3,
  },
  tabLabel: {
    fontSize: 9,
    lineHeight: 12,
    marginTop: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: radii.round,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.green,
  },
  homeFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
});
