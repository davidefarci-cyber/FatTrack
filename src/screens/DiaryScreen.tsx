import { StyleSheet, Text, View } from 'react-native';

export default function DiaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diario</Text>
      <Text>Qui vedrai gli alimenti consumati oggi.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
