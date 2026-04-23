import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomTabBar } from '@/components/BottomTabBar';
import BarcodeScreen from '@/screens/BarcodeScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import HomeScreen from '@/screens/HomeScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import type { TabParamList } from '@/types';

const Tab = createBottomTabNavigator<TabParamList>();

// Bottom tab a 5 voci (design originale): Barcode · Preferiti · Home · Storico · Impostazioni.
// La Home resta centrale nel design (FAB rialzato) e `initialRouteName`
// garantisce l'avvio sulla Home anche se viene prima nell'ordine di rendering.
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Barcode" component={BarcodeScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
