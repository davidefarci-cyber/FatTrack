import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import DiaryScreen from '@/screens/DiaryScreen';
import HomeScreen from '@/screens/HomeScreen';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import ScannerScreen from '@/screens/ScannerScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import StatsScreen from '@/screens/StatsScreen';
import { getDatabase } from '@/database';
import type { RootStackParamList, TabParamList } from '@/types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Diary" component={DiaryScreen} options={{ title: 'Diario' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: 'Statistiche' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Impostazioni' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    getDatabase().catch((err) => console.warn('DB init failed', err));
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Scansione' }} />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Dettaglio prodotto' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
