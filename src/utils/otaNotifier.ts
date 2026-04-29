import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/Toast';

const STORAGE_KEY_LAST_UPDATE_ID = '@fattrack/ota/lastUpdateId';

// Due segnali OTA per non lasciare l'utente all'oscuro:
//
// 1) Toast "App aggiornata" al cold-start: confronta updateId corrente con
//    quello visto la sessione precedente. Se e' cambiato, la sessione
//    passata ha scaricato un OTA che ora e' attivo.
//
// 2) Alert "Aggiornamento scaricato" durante la sessione: useUpdates()
//    espone isUpdatePending=true quando expo-updates ha appena finito di
//    scaricare un nuovo bundle in background. Proponiamo "Riavvia ora"
//    (Updates.reloadAsync) o "Dopo" (verra' applicato al prossimo lancio).
export function useOtaNotifier(): void {
  const toast = useToast();
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  // Tracciamo l'updateId per cui abbiamo gia' mostrato l'alert: evita
  // di ri-fare comparire il prompt a ogni render finche' il bundle resta
  // pending. Se in seguito arriva un OTA diverso, il nuovo updateId
  // sblocca un secondo prompt.
  const alertedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const current = Updates.updateId;
    if (!current) return;
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY_LAST_UPDATE_ID)
      .then((last) => {
        if (cancelled) return;
        if (last && last !== current) {
          toast.show('App aggiornata');
        }
        if (last !== current) {
          void AsyncStorage.setItem(STORAGE_KEY_LAST_UPDATE_ID, current);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    if (!isUpdatePending) return;
    const pendingId = downloadedUpdate?.updateId ?? '__pending__';
    if (alertedIdRef.current === pendingId) return;
    alertedIdRef.current = pendingId;
    Alert.alert(
      'Aggiornamento scaricato',
      'È pronto un nuovo aggiornamento. Riavvia per applicarlo.',
      [
        { text: 'Dopo', style: 'cancel' },
        {
          text: 'Riavvia ora',
          onPress: () => {
            Updates.reloadAsync().catch(() => undefined);
          },
        },
      ],
      { cancelable: true },
    );
  }, [isUpdatePending, downloadedUpdate]);
}
