import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/BottomTabBar';
import { getDatabase } from '@/database';
import { useFonts } from '@/hooks/useFonts';
import BarcodeScreen from '@/screens/BarcodeScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import HomeScreen from '@/screens/HomeScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import type { TabParamList } from '@/types';

const Tab = createBottomTabNavigator<TabParamList>();

export default function App() {
  const { fontsLoaded, fontError } = useFonts();

  useEffect(() => {
    getDatabase().catch((err) => console.warn('DB init failed', err));
  }, []);

  // Niente UI finché i font del design non sono pronti: evita il flash
  // con il font di sistema. In caso di errore font procediamo comunque,
  // meglio un fallback che un'app bloccata.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
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
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
