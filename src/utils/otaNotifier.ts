import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/Toast';

const STORAGE_KEY_LAST_UPDATE_ID = '@fattrack/ota/lastUpdateId';

let alertOpen = false;

// Due segnali OTA per non lasciare l'utente all'oscuro:
//
// 1) Toast "App aggiornata" al cold-start: confronta updateId corrente con
//    quello visto la sessione precedente. Se e' cambiato, la sessione
//    passata ha scaricato un OTA che ora e' attivo.
//
// 2) Alert "Aggiornamento scaricato" durante la sessione: expo-updates con
//    checkAutomatically=ON_LOAD scarica il nuovo bundle in background.
//    Intercettiamo UPDATE_AVAILABLE e proponiamo "Riavvia ora" o "Dopo".
export function useOtaNotifier(): void {
  const toast = useToast();

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

  // useCallback per evitare re-iscrizioni: useUpdateEvents tipicamente
  // registra il listener in un useEffect con [listener] in dep.
  const onUpdateEvent = useCallback((event: Updates.UpdateEvent) => {
    if (__DEV__ || !Updates.isEnabled) return;
    if (event.type !== Updates.UpdateEventType.UPDATE_AVAILABLE) return;
    if (alertOpen) return;
    alertOpen = true;
    Alert.alert(
      'Aggiornamento scaricato',
      'È pronto un nuovo aggiornamento. Riavvia per applicarlo.',
      [
        {
          text: 'Dopo',
          style: 'cancel',
          onPress: () => {
            alertOpen = false;
          },
        },
        {
          text: 'Riavvia ora',
          onPress: () => {
            alertOpen = false;
            Updates.reloadAsync().catch(() => undefined);
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  Updates.useUpdateEvents(onUpdateEvent);
}
