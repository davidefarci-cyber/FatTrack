import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';

import { BottomTabBar } from '@/components/BottomTabBar';
import { useToast } from '@/components/Toast';
import ExercisesScreen from '@/screens/sport/ExercisesScreen';
import SportHistoryScreen from '@/screens/sport/SportHistoryScreen';
import SportHomeScreen from '@/screens/sport/SportHomeScreen';
import SportSettingsScreen from '@/screens/sport/SportSettingsScreen';
import TimerScreen from '@/screens/sport/TimerScreen';
import WorkoutsScreen from '@/screens/sport/WorkoutsScreen';
import type { SportTabParamList } from '@/types';

import { navigationRef } from './RootNavigator';

const Tab = createBottomTabNavigator<SportTabParamList>();

const EXIT_DOUBLE_TAP_MS = 2000;

// Bottom tab a 5 voci visibili (mode='sport'): Timer · Schede · Home (FAB) ·
// Storico · Esercizi. SportSettings resta registrata come Tab.Screen
// (raggiungibile dal cog di SportHomeScreen) ma non appare nella bar perché
// il TAB_CONFIG sport non la include — il renderer skippa le rotte non
// configurate. La Home è centrale per coerenza con il design diet.
//
// Back-handler hardware Android: stessa logica di MainTabNavigator —
// duplicata volutamente, non astratta. Il piano (sezione 1C) chiede
// "incolla la logica, non astrarre prematuramente". DRY arriva quando
// avremo tre navigator paralleli.
export function SportTabNavigator() {
  const toast = useToast();
  const lastBackRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigationRef.isReady()) return false;
      const current = navigationRef.getCurrentRoute()?.name;
      if (current && current !== 'Home') {
        navigationRef.navigate('Home');
        return true;
      }
      const now = Date.now();
      if (now - lastBackRef.current < EXIT_DOUBLE_TAP_MS) {
        BackHandler.exitApp();
        return true;
      }
      lastBackRef.current = now;
      if (ToastAndroid && typeof ToastAndroid.show === 'function') {
        ToastAndroid.show('Premi ancora per uscire', ToastAndroid.SHORT);
      } else {
        toast.show('Premi ancora per uscire');
      }
      return true;
    });
    return () => sub.remove();
  }, [toast]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="none"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Home" component={SportHomeScreen} />
      <Tab.Screen name="History" component={SportHistoryScreen} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} />
      <Tab.Screen name="SportSettings" component={SportSettingsScreen} />
    </Tab.Navigator>
  );
}
