import { StyleSheet, Text, View } from 'react-native';

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Statistiche</Text>
      <Text>Andamento settimanale e mensile.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
