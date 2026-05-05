// AUTOGENERATO da scripts/exercise-illustrations/generate-image-map.js
// NON modificare a mano: rilancia lo script dopo aggiornamenti al manifest.

import type { ImageSourcePropType } from 'react-native';

// Mappa nome esercizio (esatto come nel seed) → slug del file PNG/WebP.
// Lo slug è la chiave del lookup nella mappa EXERCISE_IMAGES.
const NAME_TO_SLUG: Record<string, string> = {
  "Squat": "squat",
  "Affondi": "affondi",
  "Bulgarian split squat": "bulgarian-split-squat",
  "Wall sit": "wall-sit",
  "Calf raise": "calf-raise",
  "Single-leg deadlift": "single-leg-deadlift",
  "Hip thrust": "hip-thrust",
  "Glute bridge": "glute-bridge",
  "Step-up": "step-up",
  "Sumo squat": "sumo-squat",
  "Push-up": "push-up",
  "Push-up declinati": "push-up-declinati",
  "Diamond push-up": "diamond-push-up",
  "Pike push-up": "pike-push-up",
  "Tricep dip": "tricep-dip",
  "Wide push-up": "wide-push-up",
  "Plank to push-up": "plank-to-push-up",
  "Plank": "plank",
  "Side plank": "side-plank",
  "Crunch": "crunch",
  "Russian twist": "russian-twist",
  "Hollow hold": "hollow-hold",
  "Bird-dog": "bird-dog",
  "Dead bug": "dead-bug",
  "Leg raise": "leg-raise",
  "Burpees": "burpees",
  "Mountain climber": "mountain-climber",
  "Jumping jacks": "jumping-jacks",
  "High knees": "high-knees",
  "Skater jumps": "skater-jumps",
  "Squat jumps": "squat-jumps",
  "Schiena - Cat-cow": "cat-cow",
  "Schiena - Cobra": "cobra",
  "Schiena - Child pose": "child-pose",
  "Full body - Downward dog": "downward-dog",
  "Anche - Hip circles": "hip-circles",
  "Spalle - Shoulder rolls": "shoulder-rolls",
  "Anche - Pigeon pose": "pigeon-pose",
  "Hamstring stretch": "hamstring-stretch",
  "Quad stretch": "quad-stretch",
  "Chest opener": "chest-opener",
  "Spinal twist": "spinal-twist",
  "Superman": "superman",
  "Reverse snow angel": "reverse-snow-angel",
  "Rematore con bottiglie": "rematore-bottiglie",
  "Pull-apart con elastico": "pull-apart-elastico",
  "Trazioni assistite con elastico": "trazioni-assistite",
  "Curl con bottiglie": "curl-bottiglie",
  "Curl isometrico con asciugamano": "curl-isometrico-asciugamano",
  "Shoulder taps": "shoulder-taps",
  "Y-T-W prone": "y-t-w-prone",
  "Clamshell": "clamshell",
  "Donkey kick": "donkey-kick",
  "Fire hydrant": "fire-hydrant",
  "Lateral lunge": "lateral-lunge",
  "Cossack squat": "cossack-squat",
  "Goblet squat con bottiglia": "goblet-squat-bottiglia",
  "Romanian deadlift con bottiglie": "romanian-deadlift-bottiglie",
  "Good morning": "good-morning",
  "Tuck jump": "tuck-jump",
  "Broad jump": "broad-jump",
  "Marcia da seduti": "marcia-seduti",
  "Alzata gambe da seduti": "alzata-gambe-seduti",
  "Twist da seduti": "twist-seduti",
  "Anche - Leg swings": "leg-swings",
  "Polsi - Wrist circles": "wrist-circles",
  "Caviglie - Ankle circles": "ankle-circles",
};

// Mappa slug → require statico del WebP. Metro non supporta require
// dinamici sui path, quindi serve l'elenco completo qui.
const EXERCISE_IMAGES: Record<string, ImageSourcePropType> = {
  "squat": require('@/assets/exercises/squat.webp'),
  "affondi": require('@/assets/exercises/affondi.webp'),
  "bulgarian-split-squat": require('@/assets/exercises/bulgarian-split-squat.webp'),
  "wall-sit": require('@/assets/exercises/wall-sit.webp'),
  "calf-raise": require('@/assets/exercises/calf-raise.webp'),
  "single-leg-deadlift": require('@/assets/exercises/single-leg-deadlift.webp'),
  "hip-thrust": require('@/assets/exercises/hip-thrust.webp'),
  "glute-bridge": require('@/assets/exercises/glute-bridge.webp'),
  "step-up": require('@/assets/exercises/step-up.webp'),
  "sumo-squat": require('@/assets/exercises/sumo-squat.webp'),
  "push-up": require('@/assets/exercises/push-up.webp'),
  "push-up-declinati": require('@/assets/exercises/push-up-declinati.webp'),
  "diamond-push-up": require('@/assets/exercises/diamond-push-up.webp'),
  "pike-push-up": require('@/assets/exercises/pike-push-up.webp'),
  "tricep-dip": require('@/assets/exercises/tricep-dip.webp'),
  "wide-push-up": require('@/assets/exercises/wide-push-up.webp'),
  "plank-to-push-up": require('@/assets/exercises/plank-to-push-up.webp'),
  "plank": require('@/assets/exercises/plank.webp'),
  "side-plank": require('@/assets/exercises/side-plank.webp'),
  "crunch": require('@/assets/exercises/crunch.webp'),
  "russian-twist": require('@/assets/exercises/russian-twist.webp'),
  "hollow-hold": require('@/assets/exercises/hollow-hold.webp'),
  "bird-dog": require('@/assets/exercises/bird-dog.webp'),
  "dead-bug": require('@/assets/exercises/dead-bug.webp'),
  "leg-raise": require('@/assets/exercises/leg-raise.webp'),
  "burpees": require('@/assets/exercises/burpees.webp'),
  "mountain-climber": require('@/assets/exercises/mountain-climber.webp'),
  "jumping-jacks": require('@/assets/exercises/jumping-jacks.webp'),
  "high-knees": require('@/assets/exercises/high-knees.webp'),
  "skater-jumps": require('@/assets/exercises/skater-jumps.webp'),
  "squat-jumps": require('@/assets/exercises/squat-jumps.webp'),
  "cat-cow": require('@/assets/exercises/cat-cow.webp'),
  "cobra": require('@/assets/exercises/cobra.webp'),
  "child-pose": require('@/assets/exercises/child-pose.webp'),
  "downward-dog": require('@/assets/exercises/downward-dog.webp'),
  "hip-circles": require('@/assets/exercises/hip-circles.webp'),
  "shoulder-rolls": require('@/assets/exercises/shoulder-rolls.webp'),
  "pigeon-pose": require('@/assets/exercises/pigeon-pose.webp'),
  "hamstring-stretch": require('@/assets/exercises/hamstring-stretch.webp'),
  "quad-stretch": require('@/assets/exercises/quad-stretch.webp'),
  "chest-opener": require('@/assets/exercises/chest-opener.webp'),
  "spinal-twist": require('@/assets/exercises/spinal-twist.webp'),
  "superman": require('@/assets/exercises/superman.webp'),
  "reverse-snow-angel": require('@/assets/exercises/reverse-snow-angel.webp'),
  "rematore-bottiglie": require('@/assets/exercises/rematore-bottiglie.webp'),
  "pull-apart-elastico": require('@/assets/exercises/pull-apart-elastico.webp'),
  "trazioni-assistite": require('@/assets/exercises/trazioni-assistite.webp'),
  "curl-bottiglie": require('@/assets/exercises/curl-bottiglie.webp'),
  "curl-isometrico-asciugamano": require('@/assets/exercises/curl-isometrico-asciugamano.webp'),
  "shoulder-taps": require('@/assets/exercises/shoulder-taps.webp'),
  "y-t-w-prone": require('@/assets/exercises/y-t-w-prone.webp'),
  "clamshell": require('@/assets/exercises/clamshell.webp'),
  "donkey-kick": require('@/assets/exercises/donkey-kick.webp'),
  "fire-hydrant": require('@/assets/exercises/fire-hydrant.webp'),
  "lateral-lunge": require('@/assets/exercises/lateral-lunge.webp'),
  "cossack-squat": require('@/assets/exercises/cossack-squat.webp'),
  "goblet-squat-bottiglia": require('@/assets/exercises/goblet-squat-bottiglia.webp'),
  "romanian-deadlift-bottiglie": require('@/assets/exercises/romanian-deadlift-bottiglie.webp'),
  "good-morning": require('@/assets/exercises/good-morning.webp'),
  "tuck-jump": require('@/assets/exercises/tuck-jump.webp'),
  "broad-jump": require('@/assets/exercises/broad-jump.webp'),
  "marcia-seduti": require('@/assets/exercises/marcia-seduti.webp'),
  "alzata-gambe-seduti": require('@/assets/exercises/alzata-gambe-seduti.webp'),
  "twist-seduti": require('@/assets/exercises/twist-seduti.webp'),
  "leg-swings": require('@/assets/exercises/leg-swings.webp'),
  "wrist-circles": require('@/assets/exercises/wrist-circles.webp'),
  "ankle-circles": require('@/assets/exercises/ankle-circles.webp'),
};

// Mappa slug → aspectRatio (width / height) per impostare correttamente
// il box dell'<Image> senza dover fare load asincrono delle dimensioni.
// Derivato dalla strategy nel manifest:
// - single → 1:1 (1024 x 1024)
// - dual → 4:3 (1600 x 1200, due frame affiancati)
// - triple → 16:9 (1920 x 1080, tre frame affiancati)
const EXERCISE_ASPECT_RATIO: Record<string, number> = {
  "squat": 4 / 3,
  "affondi": 4 / 3,
  "bulgarian-split-squat": 4 / 3,
  "wall-sit": 1,
  "calf-raise": 4 / 3,
  "single-leg-deadlift": 4 / 3,
  "hip-thrust": 4 / 3,
  "glute-bridge": 4 / 3,
  "step-up": 4 / 3,
  "sumo-squat": 4 / 3,
  "push-up": 4 / 3,
  "push-up-declinati": 4 / 3,
  "diamond-push-up": 4 / 3,
  "pike-push-up": 4 / 3,
  "tricep-dip": 4 / 3,
  "wide-push-up": 4 / 3,
  "plank-to-push-up": 4 / 3,
  "plank": 1,
  "side-plank": 1,
  "crunch": 4 / 3,
  "russian-twist": 4 / 3,
  "hollow-hold": 1,
  "bird-dog": 4 / 3,
  "dead-bug": 4 / 3,
  "leg-raise": 4 / 3,
  "burpees": 16 / 9,
  "mountain-climber": 4 / 3,
  "jumping-jacks": 4 / 3,
  "high-knees": 4 / 3,
  "skater-jumps": 4 / 3,
  "squat-jumps": 4 / 3,
  "cat-cow": 4 / 3,
  "cobra": 1,
  "child-pose": 1,
  "downward-dog": 1,
  "hip-circles": 1,
  "shoulder-rolls": 4 / 3,
  "pigeon-pose": 1,
  "hamstring-stretch": 1,
  "quad-stretch": 1,
  "chest-opener": 1,
  "spinal-twist": 1,
  "superman": 4 / 3,
  "reverse-snow-angel": 4 / 3,
  "rematore-bottiglie": 4 / 3,
  "pull-apart-elastico": 4 / 3,
  "trazioni-assistite": 4 / 3,
  "curl-bottiglie": 4 / 3,
  "curl-isometrico-asciugamano": 1,
  "shoulder-taps": 4 / 3,
  "y-t-w-prone": 16 / 9,
  "clamshell": 4 / 3,
  "donkey-kick": 4 / 3,
  "fire-hydrant": 4 / 3,
  "lateral-lunge": 4 / 3,
  "cossack-squat": 4 / 3,
  "goblet-squat-bottiglia": 4 / 3,
  "romanian-deadlift-bottiglie": 4 / 3,
  "good-morning": 4 / 3,
  "tuck-jump": 4 / 3,
  "broad-jump": 4 / 3,
  "marcia-seduti": 4 / 3,
  "alzata-gambe-seduti": 4 / 3,
  "twist-seduti": 4 / 3,
  "leg-swings": 4 / 3,
  "wrist-circles": 1,
  "ankle-circles": 1,
};

/**
 * Recupera l'immagine per un esercizio dato il suo nome.
 * Il nome deve corrispondere ESATTO a quello in seedExercises.ts.
 * Ritorna null se non c'è asset disponibile (fallback graceful).
 */
export function getExerciseImage(name: string): ImageSourcePropType | null {
  const slug = NAME_TO_SLUG[name];
  if (!slug) return null;
  return EXERCISE_IMAGES[slug] ?? null;
}

/**
 * Aspect ratio dell'immagine (width / height) per dimensionare il box
 * correttamente. Default 1 se l'esercizio non ha asset.
 */
export function getExerciseAspectRatio(name: string): number {
  const slug = NAME_TO_SLUG[name];
  if (!slug) return 1;
  return EXERCISE_ASPECT_RATIO[slug] ?? 1;
}

/**
 * True se l'esercizio ha un'illustrazione disponibile.
 */
export function hasExerciseImage(name: string): boolean {
  return getExerciseImage(name) !== null;
}
