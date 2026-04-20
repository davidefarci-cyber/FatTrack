import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AddFoodScreen from '@/screens/AddFoodScreen';
import HomeScreen from '@/screens/HomeScreen';
import type { HomeStackParamList } from '@/types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

// Stack dedicato alla tab Home. HomeMain è il diario, AddFood è il flusso
// di inserimento alimento (ricerca / barcode) con presentation a scorrimento.
export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="AddFood"
        component={AddFoodScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
