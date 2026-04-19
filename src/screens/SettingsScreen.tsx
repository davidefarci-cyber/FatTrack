import { StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '@/hooks/usePreferences';

export default function SettingsScreen() {
  const { preferences, loading } = usePreferences();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Caricamento preferenze…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Impostazioni</Text>
      <Text>Obiettivo kcal: {preferences.dailyKcalTarget}</Text>
      <Text>Obiettivo grassi: {preferences.dailyFatTargetG} g</Text>
      <Text>Unità: {preferences.units}</Text>
      <Text>Tema: {preferences.theme}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
