import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/BottomTabBar';
import { getDatabase } from '@/database';
import { useFonts } from '@/hooks/useFonts';
import { useProfile } from '@/hooks/useProfile';
import AddFoodScreen from '@/screens/AddFoodScreen';
import BarcodeScreen from '@/screens/BarcodeScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import HomeScreen from '@/screens/HomeScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import type { RootStackParamList, TabParamList } from '@/types';

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
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

export default function App() {
  const { fontsLoaded, fontError } = useFonts();
  const { profile, loading: profileLoading } = useProfile();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    getDatabase().catch((err) => console.warn('DB init failed', err));
  }, []);

  // Niente UI finché i font del design non sono pronti: evita il flash
  // con il font di sistema. In caso di errore font procediamo comunque,
  // meglio un fallback che un'app bloccata.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Il profilo è obbligatorio per calcolare il target calorico; finché
  // non è stato creato mostriamo l'onboarding al posto della tab bar.
  if (profileLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider />
      </GestureHandlerRootView>
    );
  }

  const needsOnboarding = !profile && !onboardingComplete;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          {needsOnboarding ? (
            <OnboardingScreen onComplete={() => setOnboardingComplete(true)} />
          ) : (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="MainTabs" component={MainTabs} />
              <RootStack.Screen
                name="AddFood"
                component={AddFoodScreen}
                options={{ presentation: 'card', animation: 'slide_from_right' }}
              />
            </RootStack.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
