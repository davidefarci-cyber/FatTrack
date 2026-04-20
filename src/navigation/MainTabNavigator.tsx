import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomTabBar } from '@/components/BottomTabBar';
import FavoritesScreen from '@/screens/FavoritesScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import type { TabParamList } from '@/types';

import { HomeStackNavigator } from './HomeStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

// Bottom tab a 4 voci. La Home resta centrale nel design (FAB rialzato)
// quindi nell'ordine di rendering è al centro: Preferiti · Home · Storico · Impostazioni.
// `initialRouteName` assicura l'avvio sulla Home indipendentemente dall'ordine.
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
