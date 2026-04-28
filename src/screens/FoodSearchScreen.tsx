import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodSearchList } from '@/components/FoodSearchList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useFoodSearch } from '@/hooks/useFoodSearch';
import { colors, spacing } from '@/theme';

// Schermata di lookup informativo: cerca un alimento nel DB locale e su
// Open Food Facts, mostra calorie e macro per 100 g per ogni risultato.
// Pensata per la 5ª voce della tab bar (vedi Fase 3 del piano): nessuna
// integrazione con il diario, niente "Aggiungi a pasto", niente edit
// porzioni — è una vista solo lettura. Il wiring in MainTabNavigator e
// BottomTabBar arriva con la Fase 3.

export default function FoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const search = useFoodSearch();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Cerca alimento"
        subtitle="Database e Open Food Facts"
        style={{ paddingTop: insets.top + spacing.xl }}
      />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.screen }]}>
        <FoodSearchList
          search={search}
          searchPlaceholder="Cerca alimento, marchio o ingrediente"
          readOnly
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
  },
});
