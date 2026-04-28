import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';

import { BottomTabBar } from '@/components/BottomTabBar';
import { useToast } from '@/components/Toast';
import BarcodeScreen from '@/screens/BarcodeScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import HomeScreen from '@/screens/HomeScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import type { TabParamList } from '@/types';

import { navigationRef } from './RootNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

const EXIT_DOUBLE_TAP_MS = 2000;

// Bottom tab a 5 voci (design originale): Barcode · Preferiti · Home · Storico · Impostazioni.
// La Home resta centrale nel design (FAB rialzato) e `initialRouteName`
// garantisce l'avvio sulla Home anche se viene prima nell'ordine di rendering.
export function MainTabNavigator() {
  const toast = useToast();
  const lastBackRef = useRef(0);

  // Back hardware Android: il default del bottom-tab navigator e' "torna al
  // tab visitato in precedenza", che genera comportamenti confusi (Home ->
  // Barcode -> Home, back finisce su Barcode). Sostituiamo con la regola:
  // - tab != Home  -> vai a Home (intercetta).
  // - tab == Home  -> primo back: toast "Premi ancora per uscire";
  //                  secondo back entro 2s: BackHandler.exitApp().
  // I Modal RN nativi (vedi <Modal onRequestClose={...} /> usato da
  // GramsInputModal, EditMealModal, BottomSheet, ecc.) intercettano il back
  // PRIMA che arrivi qui, quindi non interferiamo con la chiusura modali.
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
      // ToastAndroid e' nativo e visibile anche quando l'app sta per
      // chiudersi: lo preferiamo al toast in-app per il prompt di uscita.
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
