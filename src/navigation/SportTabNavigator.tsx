import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ToastAndroid, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/BottomTabBar';
import { useToast } from '@/components/Toast';
import { ActiveSessionBanner } from '@/components/sport/ActiveSessionBanner';
import {
  getElapsedSec,
  useActiveSession,
} from '@/contexts/ActiveSessionContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import ActiveSessionScreen from '@/screens/sport/ActiveSessionScreen';
import ExercisesScreen from '@/screens/sport/ExercisesScreen';
import SportHistoryScreen from '@/screens/sport/SportHistoryScreen';
import SportHomeScreen from '@/screens/sport/SportHomeScreen';
import SportSettingsScreen from '@/screens/sport/SportSettingsScreen';
import TabataScreen from '@/screens/sport/TabataScreen';
import WorkoutsScreen from '@/screens/sport/WorkoutsScreen';
import { spacing } from '@/theme';
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
// Altezza visiva approssimativa della BottomTabBar (FAB rialzato esclude
// il calcolo "esatto"): la usiamo per offsettare il banner sticky sopra
// la bar. Calibrata a mano sull'emulatore — non c'è un modo affidabile
// di misurarla a runtime senza onLayout sulla bar stessa.
const TAB_BAR_HEIGHT = 64;

export function SportTabNavigator() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const lastBackRef = useRef(0);
  const { setAppMode, markSportModeSeen } = useAppSettings();
  const {
    state: activeSessionState,
    pendingOpen,
    acknowledgePendingOpen,
  } = useActiveSession();
  const [sessionVisible, setSessionVisible] = useState(false);

  // Auto-apertura della session screen quando una nuova sessione parte
  // (start() dal WorkoutDetailModal in WorkoutsScreen). Il provider setta
  // pendingOpen=true; qui apriamo il modal e ack il flag.
  useEffect(() => {
    if (pendingOpen) {
      setSessionVisible(true);
      acknowledgePendingOpen();
    }
  }, [pendingOpen, acknowledgePendingOpen]);

  // Long-press sul tab Home → toggle inverso (sport → diet). Stessa logica
  // di MainTabNavigator. `markSportModeSeen()` resta vero anche al ritorno
  // in diet: una volta visto il primo passaggio, la scoperta è chiusa per
  // sempre (vedi Fase 5).
  const handleHomeLongPress = useCallback(async () => {
    await setAppMode('diet');
    await markSportModeSeen();
  }, [setAppMode, markSportModeSeen]);

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

  const elapsedSec = activeSessionState ? getElapsedSec(activeSessionState) : 0;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Home"
        backBehavior="none"
        tabBar={(props) => (
          <BottomTabBar {...props} onHomeLongPress={handleHomeLongPress} />
        )}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Timer" component={TabataScreen} />
        <Tab.Screen name="Workouts" component={WorkoutsScreen} />
        <Tab.Screen name="Home" component={SportHomeScreen} />
        <Tab.Screen name="History" component={SportHistoryScreen} />
        <Tab.Screen name="Exercises" component={ExercisesScreen} />
        <Tab.Screen name="SportSettings" component={SportSettingsScreen} />
      </Tab.Navigator>

      {activeSessionState && !sessionVisible ? (
        <ActiveSessionBanner
          workoutName={activeSessionState.workout.name}
          elapsedSec={elapsedSec}
          isPaused={activeSessionState.isPaused}
          bottomOffset={insets.bottom + TAB_BAR_HEIGHT + spacing.md}
          onPress={() => setSessionVisible(true)}
        />
      ) : null}

      <ActiveSessionScreen
        visible={sessionVisible}
        onClose={() => setSessionVisible(false)}
      />
    </View>
  );
}
