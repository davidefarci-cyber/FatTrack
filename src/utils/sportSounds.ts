import { Audio } from 'expo-av';

// Cache per file: ogni Sound viene caricato una sola volta per la durata
// dell'app e riprodotto via replayAsync. Pattern già rodato per
// countdown-tick in C3.1, qui generalizzato a 4 file (8bit, gogogo, cool,
// countdown-tick) con loader lazy condiviso. Audio è requisito esplicito:
// niente fallback solo-haptic. Se un file manca o non è riproducibile
// loggiamo un warning ma non crashiamo (degrado, non blocco).

type SoundKey = 'tick' | 'workStart' | 'restStart' | 'pauseTick';

const SOUND_FILES: Record<SoundKey, number> = {
  tick: require('../../assets/sounds/8bit.wav'),
  workStart: require('../../assets/sounds/gogogo.wav'),
  restStart: require('../../assets/sounds/cool.wav'),
  pauseTick: require('../../assets/sounds/countdown-tick.wav'),
};

const cache: Partial<Record<SoundKey, Audio.Sound>> = {};
const loading: Partial<Record<SoundKey, Promise<Audio.Sound | null>>> = {};

async function getSound(key: SoundKey): Promise<Audio.Sound | null> {
  const cached = cache[key];
  if (cached) return cached;
  const inFlight = loading[key];
  if (inFlight) return inFlight;
  const promise = (async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key]);
      cache[key] = sound;
      return sound;
    } catch (err) {
      console.warn(`sound ${key} not loadable`, err);
      return null;
    } finally {
      delete loading[key];
    }
  })();
  loading[key] = promise;
  return promise;
}

async function play(key: SoundKey): Promise<void> {
  const s = await getSound(key);
  if (!s) return;
  try {
    await s.replayAsync();
  } catch {
    // Riproduzione fallita (interruzione audio, focus): degrado silenzioso.
  }
}

export const playTick = (): Promise<void> => play('tick');
export const playWorkStart = (): Promise<void> => play('workStart');
export const playRestStart = (): Promise<void> => play('restStart');
export const playPauseTick = (): Promise<void> => play('pauseTick');

export async function unloadAllSounds(): Promise<void> {
  for (const key of Object.keys(cache) as SoundKey[]) {
    await cache[key]?.unloadAsync().catch(() => {});
    delete cache[key];
  }
}
