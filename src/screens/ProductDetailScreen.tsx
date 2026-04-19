import { StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen({ route }: Props) {
  const { barcode } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prodotto</Text>
      <Text>Codice: {barcode}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
});
