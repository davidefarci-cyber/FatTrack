import { BarCodeScanner } from 'expo-barcode-scanner';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export default function ScannerScreen({ navigation }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text>Richiesta permessi fotocamera…</Text>
      </View>
    );
  }
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Permesso fotocamera negato.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                navigation.replace('ProductDetail', { barcode: data });
              }
        }
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && <Button title="Scansiona di nuovo" onPress={() => setScanned(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
});
