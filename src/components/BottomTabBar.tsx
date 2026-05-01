import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppMode } from '@/database';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/ThemeContext';

import { Icon } from './Icon';
import type { IconName } from './Icon';

type TabConfig = { routeName: string; label: string; icon: IconName };

// Tab bar a 5 voci, parametrizzata sulla modalità corrente:
// - diet:  Barcode · Preferiti · Home (FAB) · Storico · Cerca
// - sport: Timer   · Schede    · Home (FAB) · Storico · Esercizi
// L'ordine nel TabParamList mette la Home al centro così il FAB rialzato
// resta visualmente centrato; `initialRouteName` sul Tab.Navigator
// garantisce comunque l'avvio sulla Home.
// Le rotte non in TAB_CONFIG (Settings, Profile, SportSettings) vengono
// saltate dal renderer: restano registrate come Tab.Screen ma non appaiono
// nella bar (raggiungibili dall'icona ingranaggio in HomeScreen).
const DIET_TAB_CONFIG: Record<string, TabConfig> = {
  Barcode: { routeName: 'Barcode', label: 'Scansiona', icon: 'barcode' },
  Favorites: { routeName: 'Favorites', label: 'Preferiti', icon: 'star' },
  Home: { routeName: 'Home', label: 'Home', icon: 'home' },
  History: { routeName: 'History', label: 'Storico', icon: 'chart' },
  FoodSearch: { routeName: 'FoodSearch', label: 'Cerca', icon: 'search' },
};

const SPORT_TAB_CONFIG: Record<string, TabConfig> = {
  Timer: { routeName: 'Timer', label: 'Timer', icon: 'timer' },
  Workouts: { routeName: 'Workouts', label: 'Schede', icon: 'list-checks' },
  Home: { routeName: 'Home', label: 'Home', icon: 'home' },
  History: { routeName: 'History', label: 'Storico', icon: 'chart' },
  Exercises: { routeName: 'Exercises', label: 'Esercizi', icon: 'dumbbell' },
};

export function getTabConfig(mode: AppMode): Record<string, TabConfig> {
  return mode === 'sport' ? SPORT_TAB_CONFIG : DIET_TAB_CONFIG;
}

// Durata del long-press su Home per togglare la modalità app. Esposta come
// costante in cima al file per poterla calibrare durante i test manuali.
// Q5 del piano: il default 600ms è da convalidare a mano sul device.
const LONG_PRESS_MS = 600;

type BottomTabBarExtraProps = {
  // Callback per il long-press sull'icona Home. Iniettata da MainTabNavigator
  // / SportTabNavigator: tocca la modalità app via appSettingsDB. Non viene
  // gestita dentro il tab bar perché lo store di appSettings vive in un
  // hook che è meglio non consumare qui (la bar resta uno "stupido" renderer).
  onHomeLongPress?: () => void;
};

export function BottomTabBar({
  state,
  navigation,
  onHomeLongPress,
}: BottomTabBarProps & BottomTabBarExtraProps) {
  const insets = useSafeAreaInsets();
  const { mode, accent } = useAppTheme();
  const tabConfig = getTabConfig(mode);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const config = tabConfig[route.name];
        if (!config) return null;

        const isFocused = state.index === index;
        const tint = isFocused ? accent : colors.textSec;
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
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onHomeLongPress}
              delayLongPress={LONG_PRESS_MS}
              style={styles.tab}
            >
              <View
                style={[
                  styles.homeFab,
                  shadows.sm,
                  { backgroundColor: isFocused ? accent : colors.text },
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
            <View style={[styles.dot, isFocused && { backgroundColor: accent }]} />
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
  homeFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
});
