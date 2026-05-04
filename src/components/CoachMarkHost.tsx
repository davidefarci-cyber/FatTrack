import { CoachMarkBanner } from '@/components/CoachMarkBanner';
import type { CoachMarkId } from '@/utils/coachMarks';

// Host del coach mark corrente: switch su id e renderizza il banner adatto.
// Se l'utente preme la CTA principale (es. "Provala" per sportMode) chiamiamo
// `onPrimary` prima del dismiss; altrimenti il dismiss è il close-button.
//
// Centralizzare il rendering qui (invece che spargere in HomeScreen) permette
// di aggiungere step futuri senza toccare la schermata host: basta aggiungere
// un id al registry in `utils/coachMarks.ts` e un caso qui.

type Props = {
  currentId: CoachMarkId | null;
  onDismiss: (id: CoachMarkId) => void;
  onSwitchToSport?: () => void;
};

export function CoachMarkHost({ currentId, onDismiss, onSwitchToSport }: Props) {
  if (!currentId) return null;

  switch (currentId) {
    case 'firstMeal':
      return (
        <CoachMarkBanner
          tone="blue"
          icon="plus"
          title="Inizia col primo pasto"
          description="Tocca Aggiungi sotto a un pasto per registrare il primo alimento. Puoi cercare nel database, scansionare un barcode o inserire i valori manualmente."
          onDismiss={() => onDismiss('firstMeal')}
        />
      );
    case 'rowActions':
      return (
        <CoachMarkBanner
          tone="purple"
          icon="more"
          title="Scorciatoie sui tuoi alimenti"
          description="Tieni premuto un alimento o tocca i tre puntini per modificare, eliminare o salvare. Scorri verso destra per aggiungerlo direttamente alle aggiunte rapide."
          onDismiss={() => onDismiss('rowActions')}
        />
      );
    case 'mealAsFavorite':
      return (
        <CoachMarkBanner
          tone="orange"
          icon="heart"
          title="Salva il pasto come preferito"
          description="Hai un pasto ricorrente? Tocca il cuore in alto a destra del pasto per salvarlo nei preferiti e riusarlo con un tap."
          onDismiss={() => onDismiss('mealAsFavorite')}
        />
      );
    case 'usePreferiti':
      return (
        <CoachMarkBanner
          tone="green"
          icon="heart"
          title="Riusa i tuoi preferiti"
          description="Da ogni pasto puoi toccare 'Dai preferiti' per inserire un pasto salvato in un colpo solo."
          onDismiss={() => onDismiss('usePreferiti')}
        />
      );
    case 'sportMode':
      return (
        <CoachMarkBanner
          tone="orange"
          icon="dumbbell"
          title="Nuova: modalità Sport"
          description="Cambia faccia all'app e accedi a schede, timer e libreria esercizi. Tieni premuto Home oppure usa il bottone qui sotto."
          primaryLabel="Provala"
          onPrimary={() => {
            onSwitchToSport?.();
          }}
          onDismiss={() => onDismiss('sportMode')}
        />
      );
  }
}
