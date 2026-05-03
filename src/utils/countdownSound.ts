import { Audio } from 'expo-av';

// Cache globale del Sound: il file (~21KB) viene caricato una sola volta
// per tutta la durata dell'app. `replayAsync` permette di triggerare 5
// tick consecutivi senza dover ricreare il Sound a ogni colpo. Audio è
// requisito esplicito del proprietario per il countdown 5→1: niente
// fallback solo-haptic. Se il file manca o non è riproducibile loggiamo
// un warning ma non crashiamo (è un degrado, non un blocco).

let cachedSound: Audio.Sound | null = null;
let loadPromise: Promise<Audio.Sound | null> | null = null;

async function getSound(): Promise<Audio.Sound | null> {
  if (cachedSound) return cachedSound;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/countdown-tick.wav'),
      );
      cachedSound = sound;
      return sound;
    } catch (err) {
      console.warn('countdown-tick.wav not found or unplayable', err);
      return null;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

export async function playCountdownTick(): Promise<void> {
  const sound = await getSound();
  if (!sound) return;
  try {
    await sound.replayAsync();
  } catch {
    // Riproduzione fallita (interruzione audio, focus): degrado silenzioso.
  }
}

export async function unloadCountdownSound(): Promise<void> {
  if (cachedSound) {
    await cachedSound.unloadAsync().catch(() => {});
    cachedSound = null;
  }
}
