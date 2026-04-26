// Testi statici delle spiegazioni dei tre numeri del profilo (BMR, TDEE,
// Target). Centralizzati così Settings e Onboarding mostrano lo stesso
// contenuto. Italiano, frase breve.

export const PROFILE_EXPLAINERS = {
  bmr: {
    title: 'BMR — Metabolismo basale',
    body: 'Le calorie che il tuo corpo brucia a riposo per mantenere le funzioni vitali (respirazione, circolazione, temperatura). Calcolato con la formula di Mifflin-St Jeor a partire da peso, altezza, età e sesso.',
  },
  tdee: {
    title: 'TDEE — Fabbisogno totale',
    body: 'Le calorie totali che bruci in una giornata, includendo il livello di attività fisica indicato. È il valore di mantenimento: mangiando questa quantità il peso resta stabile.',
  },
  target: {
    title: 'Target calorie',
    body: "L'obiettivo giornaliero che vedi nel diario. Calcolato dal TDEE applicando il deficit (per dimagrire) o il surplus (per aumentare di peso) corrispondente al tuo obiettivo settimanale.",
  },
} as const;

export type ProfileExplainerKey = keyof typeof PROFILE_EXPLAINERS;
