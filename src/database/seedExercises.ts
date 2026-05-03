import type * as SQLite from 'expo-sqlite';

import type { ExerciseLevel } from './exercisesDB';

// Seed della libreria esercizi (Fase 4: ~40 esercizi a corpo libero o
// con sedia/panca). Pattern allineato a `seedFoodsIfEmpty` con un'aggiunta:
// dopo l'INSERT iniziale (DB vuoto) eseguiamo un top-up idempotente
// `INSERT OR IGNORE` che aggiunge solo i nomi mancanti — senza UPDATE
// sui record esistenti, così non sovrascriviamo eventuali edit utente
// futuri (oggi la libreria è read-only ma teniamo aperta la porta).
//
// `videoUrl` è null per ora: i link curati arriveranno in un TODO
// futuro (vedi PLAN.md §4A "Open questions").

type SeedExercise = {
  name: string;
  muscleGroup: string;
  equipment: string;
  level: ExerciseLevel;
  description: string;
  guideSteps: string[];
  videoUrl: string | null;
  met: number | null;
};

export const SEED_EXERCISES: SeedExercise[] = [
  // ─── GAMBE / GLUTEI ────────────────────────────────────────────
  {
    name: 'Squat',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 5,
    description: 'Squat a corpo libero per quadricipiti, glutei e core.',
    guideSteps: [
      'Piedi alla larghezza delle spalle, punte leggermente in fuori.',
      'Scendi piegando le ginocchia, mantenendo la schiena dritta.',
      'Fermati quando le cosce sono parallele al pavimento.',
      'Risali spingendo dai talloni fino alla posizione iniziale.',
    ],
    videoUrl: null,
  },
  {
    name: 'Affondi',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 5,
    description: 'Affondi alternati per quadricipiti, glutei e equilibrio.',
    guideSteps: [
      'In piedi, fai un passo avanti con una gamba.',
      'Piega entrambe le ginocchia formando due angoli di 90°.',
      'Il ginocchio posteriore sfiora il pavimento senza appoggiarsi.',
      'Spingi sul tallone anteriore per tornare in piedi e cambia gamba.',
    ],
    videoUrl: null,
  },
  {
    name: 'Bulgarian split squat',
    muscleGroup: 'Gambe',
    equipment: 'Sedia o panca',
    level: 'intermedio',
    met: 6,
    description: 'Affondo monopodalico col piede posteriore in appoggio rialzato.',
    guideSteps: [
      'Posiziona il collo del piede posteriore su sedia o panca.',
      'Avanza con l’altro piede tanto da formare un angolo di 90° in discesa.',
      'Scendi controllato finché la coscia anteriore è parallela al suolo.',
      'Spingi con il tallone anteriore per risalire mantenendo il busto eretto.',
    ],
    videoUrl: null,
  },
  {
    name: 'Wall sit',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Tenuta isometrica a 90° contro la parete per quadricipiti.',
    guideSteps: [
      'Schiena appoggiata al muro, piedi avanti alla larghezza dei fianchi.',
      'Scivola in basso fino ad avere le ginocchia a 90°.',
      'Mantieni la schiena interamente a contatto con il muro.',
      'Resta in posizione respirando regolarmente.',
    ],
    videoUrl: null,
  },
  {
    name: 'Calf raise',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Sollevamenti sui polpacci a corpo libero.',
    guideSteps: [
      'In piedi, piedi alla larghezza dei fianchi.',
      'Solleva i talloni spingendo sulle punte.',
      'Mantieni 1 secondo in cima sentendo la contrazione del polpaccio.',
      'Scendi controllato senza far rimbalzare i talloni.',
    ],
    videoUrl: null,
  },
  {
    name: 'Single-leg deadlift',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 4,
    description: 'Stacco monopodalico per glutei, posteriori e equilibrio.',
    guideSteps: [
      'In piedi su una gamba, l’altra leggermente sollevata dietro.',
      'Inclinati in avanti dall’anca tenendo la schiena dritta.',
      'Estendi la gamba libera all’indietro fino a essere paralleli al suolo.',
      'Risali contraendo i glutei, alterna lato dopo le ripetizioni.',
    ],
    videoUrl: null,
  },
  {
    name: 'Hip thrust',
    muscleGroup: 'Glutei',
    equipment: 'Sedia o panca',
    level: 'principiante',
    met: 4,
    description: 'Spinta del bacino con scapole appoggiate per attivare i glutei.',
    guideSteps: [
      'Scapole appoggiate al bordo della panca, piedi a terra alla larghezza dei fianchi.',
      'Piega le ginocchia a circa 90° lasciando il bacino basso.',
      'Spingi con i talloni e solleva il bacino fino ad allineare ginocchia, anche e spalle.',
      'Contrai i glutei in cima e scendi controllato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Glute bridge',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Ponte glutei per attivare la catena posteriore.',
    guideSteps: [
      'Disteso supino, ginocchia piegate e piedi vicini ai glutei.',
      'Spingi con i talloni e solleva il bacino verso l’alto.',
      'Contrai i glutei in cima e mantieni 1–2 secondi.',
      'Scendi controllato senza appoggiare del tutto il bacino.',
    ],
    videoUrl: null,
  },
  {
    name: 'Step-up',
    muscleGroup: 'Gambe',
    equipment: 'Sedia o panca',
    level: 'principiante',
    met: 5,
    description: 'Salita su rialzo per quadricipiti e glutei monopodalici.',
    guideSteps: [
      'In piedi davanti a una sedia stabile, busto eretto.',
      'Sali appoggiando un piede intero sulla sedia.',
      'Spingi col tallone e porta su anche la gamba opposta senza appoggiarla.',
      'Scendi controllato e ripeti, alternando o restando sullo stesso lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Sumo squat',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 5,
    description: 'Squat con stance larga per gambe e adduttori.',
    guideSteps: [
      'Piedi più larghi delle spalle, punte ruotate verso l’esterno.',
      'Scendi tenendo le ginocchia in linea con le punte dei piedi.',
      'Arriva con le cosce parallele al pavimento, busto eretto.',
      'Risali spingendo con i talloni e contraendo i glutei.',
    ],
    videoUrl: null,
  },

  // ─── PETTO / SPALLE / TRICIPITI ────────────────────────────────
  {
    name: 'Push-up',
    muscleGroup: 'Petto',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Piegamenti sulle braccia per petto, spalle e tricipiti.',
    guideSteps: [
      'Mani a terra alla larghezza delle spalle, corpo allineato.',
      'Piega i gomiti scendendo fino a sfiorare il pavimento col petto.',
      'Mantieni il core attivo: niente bacino abbassato o sollevato.',
      'Spingi per tornare alla posizione di partenza con braccia tese.',
    ],
    videoUrl: null,
  },
  {
    name: 'Push-up declinati',
    muscleGroup: 'Petto',
    equipment: 'Sedia o panca',
    level: 'intermedio',
    met: 5,
    description: 'Push-up con i piedi rialzati per enfatizzare il petto alto.',
    guideSteps: [
      'Punte dei piedi su sedia/panca, mani a terra alla larghezza delle spalle.',
      'Mantieni il corpo allineato, core attivo, sguardo poco avanti alle mani.',
      'Scendi controllato fino a sfiorare il pavimento col petto.',
      'Spingi per risalire mantenendo i gomiti a circa 45°.',
    ],
    videoUrl: null,
  },
  {
    name: 'Diamond push-up',
    muscleGroup: 'Tricipiti',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 5,
    description: 'Push-up con mani vicine a formare un rombo: focus tricipiti.',
    guideSteps: [
      'Mani a terra ravvicinate, indici e pollici a formare un rombo.',
      'Corpo allineato, gomiti che restano vicini al busto in discesa.',
      'Scendi finché il petto sfiora le mani.',
      'Spingi per risalire mantenendo i gomiti il più vicino possibile al corpo.',
    ],
    videoUrl: null,
  },
  {
    name: 'Pike push-up',
    muscleGroup: 'Spalle',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 5,
    description: 'Push-up a "V rovesciata" per spostare il carico sulle spalle.',
    guideSteps: [
      'Posizione di plank con bacino alto e gambe tese (V rovesciata).',
      'Mani a terra alla larghezza delle spalle, sguardo verso i piedi.',
      'Piega i gomiti scendendo finché la testa sfiora il pavimento.',
      'Spingi per risalire mantenendo bacino e bacino in alto.',
    ],
    videoUrl: null,
  },
  {
    name: 'Tricep dip',
    muscleGroup: 'Tricipiti',
    equipment: 'Sedia o panca',
    level: 'intermedio',
    met: 5,
    description: 'Dip su sedia per i tricipiti.',
    guideSteps: [
      'Mani sul bordo della sedia, glutei staccati, gambe avanti.',
      'Scendi piegando i gomiti dritti all’indietro fino a 90°.',
      'Spalle basse e lontane dalle orecchie, niente shrug.',
      'Spingi sui palmi per risalire fino a quasi distendere le braccia.',
    ],
    videoUrl: null,
  },
  {
    name: 'Wide push-up',
    muscleGroup: 'Petto',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Push-up con presa larga per enfatizzare il petto esterno.',
    guideSteps: [
      'Mani a terra leggermente più larghe delle spalle.',
      'Corpo allineato, core attivo, gomiti aperti verso l’esterno.',
      'Scendi finché il petto sfiora il pavimento.',
      'Spingi per risalire mantenendo il corpo dritto.',
    ],
    videoUrl: null,
  },
  {
    name: 'Plank to push-up',
    muscleGroup: 'Petto',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 5,
    description: 'Transizione plank ↔ push-up alternando appoggio.',
    guideSteps: [
      'Parti in plank sugli avambracci.',
      'Sali su un palmo alla volta fino in posizione di push-up.',
      'Torna in plank ribassandoti su un avambraccio alla volta.',
      'Alterna il braccio guida ad ogni ripetizione, core sempre attivo.',
    ],
    videoUrl: null,
  },

  // ─── CORE ──────────────────────────────────────────────────────
  {
    name: 'Plank',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Tenuta isometrica per addominali, lombari e stabilità.',
    guideSteps: [
      'Avambracci a terra, gomiti sotto le spalle.',
      'Corpo dritto dalla testa ai talloni, glutei contratti.',
      'Sguardo rivolto al pavimento, collo allineato alla schiena.',
      'Mantieni la posizione respirando regolarmente.',
    ],
    videoUrl: null,
  },
  {
    name: 'Side plank',
    muscleGroup: 'Core obliqui',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Plank laterale per gli obliqui e la stabilità del bacino.',
    guideSteps: [
      'Su un fianco, avambraccio appoggiato a terra sotto la spalla.',
      'Solleva il bacino formando una linea retta dalla testa ai piedi.',
      'L’altra mano sull’anca o tesa verso l’alto, sguardo avanti.',
      'Mantieni la posizione respirando, poi cambia lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Crunch',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3.5,
    description: 'Esercizio classico per il retto addominale.',
    guideSteps: [
      'Disteso a terra, ginocchia piegate e piedi appoggiati.',
      'Mani dietro la testa, gomiti aperti.',
      'Solleva spalle e parte alta della schiena contraendo gli addominali.',
      'Scendi lentamente senza far cadere la testa di colpo.',
    ],
    videoUrl: null,
  },
  {
    name: 'Russian twist',
    muscleGroup: 'Core obliqui',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Rotazioni del busto seduti per gli obliqui.',
    guideSteps: [
      'Seduto a terra, ginocchia piegate, busto inclinato indietro a 45°.',
      'Mani giunte davanti al petto, piedi appoggiati o sollevati.',
      'Ruota il busto a destra portando le mani vicino al fianco.',
      'Ruota a sinistra in modo controllato senza muovere le gambe.',
    ],
    videoUrl: null,
  },
  {
    name: 'Hollow hold',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 4,
    description: 'Tenuta in posizione "scafo" per il core profondo.',
    guideSteps: [
      'Disteso supino, lombari schiacciati a terra.',
      'Solleva spalle e gambe tese tenendole vicine al pavimento.',
      'Braccia tese sopra la testa, sguardo tra le punte dei piedi.',
      'Mantieni la posizione respirando senza staccare le lombari.',
    ],
    videoUrl: null,
  },
  {
    name: 'Bird-dog',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2.5,
    description: 'Esercizio di stabilizzazione per core e lombari.',
    guideSteps: [
      'In quadrupedia, mani sotto le spalle e ginocchia sotto i fianchi.',
      'Estendi un braccio in avanti e la gamba opposta indietro.',
      'Mantieni il bacino stabile, niente rotazioni del busto.',
      'Torna lentamente al centro e alterna lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Dead bug',
    muscleGroup: 'Core',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Anti-estensione per il core con movimento controlaterale.',
    guideSteps: [
      'Supino, braccia tese verso il soffitto, ginocchia a 90° in alto.',
      'Lombari schiacciati a terra per tutto l’esercizio.',
      'Estendi un braccio dietro la testa e la gamba opposta in avanti.',
      'Torna al centro e alterna lato senza inarcare la schiena.',
    ],
    videoUrl: null,
  },
  {
    name: 'Leg raise',
    muscleGroup: 'Core basso',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Sollevamenti delle gambe da supino per il basso ventre.',
    guideSteps: [
      'Supino, gambe tese unite, mani lungo i fianchi.',
      'Lombari ben aderenti al pavimento.',
      'Solleva le gambe tese fino a 90° col busto.',
      'Scendi controllato senza toccare terra fino alla fine della serie.',
    ],
    videoUrl: null,
  },

  // ─── CARDIO / FULL BODY ────────────────────────────────────────
  {
    name: 'Burpees',
    muscleGroup: 'Full body',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 8,
    description: 'Esercizio total body ad alta intensità per cardio e forza.',
    guideSteps: [
      'In piedi, scendi in squat e poggia le mani a terra.',
      'Salta indietro con i piedi finendo in posizione plank.',
      'Esegui un push-up (opzionale) e riporta i piedi alle mani.',
      'Salta verticalmente con le braccia distese sopra la testa.',
    ],
    videoUrl: null,
  },
  {
    name: 'Mountain climber',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 7,
    description: 'Cardio dinamico in plank per core e gambe.',
    guideSteps: [
      'Posizione di plank alta con braccia tese.',
      'Porta un ginocchio verso il petto mantenendo il core attivo.',
      'Cambia gamba rapidamente come se stessi correndo.',
      'Mantieni il bacino basso e i glutei in linea con la schiena.',
    ],
    videoUrl: null,
  },
  {
    name: 'Jumping jacks',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 7,
    description: 'Saltelli sul posto con apertura/chiusura coordinata.',
    guideSteps: [
      'In piedi, piedi uniti, braccia lungo i fianchi.',
      'Saltella aprendo le gambe e portando le braccia sopra la testa.',
      'Saltella richiudendo gambe e braccia alla posizione iniziale.',
      'Mantieni un ritmo costante e respirazione regolare.',
    ],
    videoUrl: null,
  },
  {
    name: 'High knees',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 7,
    description: 'Corsa sul posto con ginocchia alte per il cardio.',
    guideSteps: [
      'In piedi, busto eretto e core attivo.',
      'Solleva le ginocchia alternate verso l’altezza dei fianchi.',
      'Atterra sull’avampiede mantenendo passo veloce.',
      'Coordina con braccia in movimento alternato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Skater jumps',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 7,
    description: 'Salti laterali in stile pattinaggio per cardio e equilibrio.',
    guideSteps: [
      'In piedi, leggero squat di partenza.',
      'Salta lateralmente atterrando su una gamba sola.',
      'L’altra gamba si appoggia dietro per equilibrio, busto leggermente flesso.',
      'Salta nel verso opposto in modo fluido e ritmato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Squat jumps',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 8,
    description: 'Squat esplosivi con salto verticale per potenza.',
    guideSteps: [
      'Scendi in squat con la stessa tecnica dello squat classico.',
      'Esplodi verso l’alto saltando con le braccia che accompagnano.',
      'Atterra morbido tornando in squat in modo controllato.',
      'Riparti subito col salto successivo senza pause lunghe.',
    ],
    videoUrl: null,
  },

  // ─── MOBILITÀ ──────────────────────────────────────────────────
  {
    name: 'Schiena - Cat-cow',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Mobilità per la colonna vertebrale, ottima al risveglio.',
    guideSteps: [
      'In quadrupedia, mani sotto le spalle, ginocchia sotto i fianchi.',
      '"Cow": inarca la schiena guardando in alto, addome verso terra.',
      '"Cat": arrotonda la schiena verso l’alto, mento verso il petto.',
      'Alterna i due movimenti seguendo il respiro.',
    ],
    videoUrl: null,
  },
  {
    name: 'Schiena - Cobra',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Estensione della schiena prona per mobilità lombare.',
    guideSteps: [
      'Prono a terra, mani sotto le spalle, gomiti vicini al busto.',
      'Spingi con le mani sollevando petto e spalle, bacino a terra.',
      'Allunga il collo verso l’alto, spalle lontane dalle orecchie.',
      'Mantieni qualche secondo respirando, poi torna giù lento.',
    ],
    videoUrl: null,
  },
  {
    name: 'Schiena - Child pose',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Posizione del bambino: rilascio lombare e spalle.',
    guideSteps: [
      'In ginocchio, glutei sui talloni, alluci che si toccano.',
      'Apri leggermente le ginocchia e siediti indietro.',
      'Allunga le braccia in avanti sul pavimento.',
      'Appoggia la fronte e respira mantenendo la posizione.',
    ],
    videoUrl: null,
  },
  {
    name: 'Full body - Downward dog',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2.5,
    description: 'Cane a testa in giù: mobilità globale di catena posteriore.',
    guideSteps: [
      'In quadrupedia, mani avanti alle spalle, dita aperte.',
      'Solleva i fianchi spingendo indietro fino alla "V rovesciata".',
      'Talloni che cercano il pavimento, gambe il più tese possibile.',
      'Spalle lontane dalle orecchie, sguardo tra i piedi.',
    ],
    videoUrl: null,
  },
  {
    name: 'Anche - Hip circles',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Cerchi delle anche per scaldare l’articolazione.',
    guideSteps: [
      'In quadrupedia, ginocchio sollevato a 90° lateralmente.',
      'Disegna cerchi ampi con il ginocchio mantenendo il bacino stabile.',
      'Alterna senso orario e antiorario.',
      'Cambia lato dopo le ripetizioni.',
    ],
    videoUrl: null,
  },
  {
    name: 'Spalle - Shoulder rolls',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Rotazioni delle spalle per scaldare la cintura scapolare.',
    guideSteps: [
      'In piedi, braccia rilassate lungo i fianchi.',
      'Rotola le spalle indietro in cerchi ampi.',
      'Alterna con cerchi in avanti dopo qualche ripetizione.',
      'Mantieni il collo lungo e rilassato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Anche - Pigeon pose',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 2.5,
    description: 'Apertura profonda dell’anca anteriore.',
    guideSteps: [
      'Da quadrupedia, porta una gamba avanti col ginocchio piegato sotto al busto.',
      'Distendi l’altra gamba indietro, collo del piede a terra.',
      'Inclina il busto in avanti sull’anca anteriore, mani a terra.',
      'Mantieni la posizione respirando, poi cambia lato.',
    ],
    videoUrl: null,
  },

  // ─── RECUPERO / STRETCHING ─────────────────────────────────────
  {
    name: 'Hamstring stretch',
    muscleGroup: 'Stretching',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Allungamento dei posteriori della coscia da seduto.',
    guideSteps: [
      'Seduto, una gamba tesa avanti e l’altra piegata col piede al ginocchio.',
      'Inclinati in avanti dall’anca cercando la punta del piede.',
      'Schiena lunga, niente curvatura della zona lombare.',
      'Mantieni la posizione respirando, poi cambia lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Quad stretch',
    muscleGroup: 'Stretching',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Allungamento dei quadricipiti in piedi.',
    guideSteps: [
      'In piedi, afferra il dorso del piede portandolo verso il gluteo.',
      'Mantieni le ginocchia vicine e il bacino in posizione neutra.',
      'Spingi leggermente l’anca in avanti per sentire l’allungamento.',
      'Mantieni la posizione respirando, poi cambia lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Chest opener',
    muscleGroup: 'Stretching',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Apertura del petto unendo le mani dietro la schiena.',
    guideSteps: [
      'In piedi, intreccia le dita dietro la schiena.',
      'Distendi le braccia portando le scapole l’una verso l’altra.',
      'Apri il petto sollevando leggermente lo sguardo.',
      'Mantieni la posizione respirando profondamente.',
    ],
    videoUrl: null,
  },
  {
    name: 'Spinal twist',
    muscleGroup: 'Stretching',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Torsione della colonna da supino per la fascia lombare.',
    guideSteps: [
      'Supino, braccia a croce a terra ai lati.',
      'Piega un ginocchio verso il petto e ruotalo verso il lato opposto.',
      'Sguardo verso la mano del lato che resta a terra.',
      'Mantieni la posizione respirando, poi cambia lato.',
    ],
    videoUrl: null,
  },

  // ─── SCHIENA / DORSALI ─────────────────────────────────────────
  {
    name: 'Superman',
    muscleGroup: 'Schiena',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Estensione prona di braccia e gambe per la catena posteriore.',
    guideSteps: [
      'Prono a terra, braccia tese in avanti e gambe distese unite.',
      'Solleva contemporaneamente braccia, petto e gambe da terra.',
      'Contrai glutei e lombari, sguardo verso il pavimento.',
      'Mantieni 1–2 secondi e scendi controllato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Reverse snow angel',
    muscleGroup: 'Schiena',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Movimento prono delle braccia tese per dorsali alti e trapezio medio.',
    guideSteps: [
      'Prono a terra, braccia distese lungo i fianchi, palmi verso l’alto.',
      'Sollevale leggermente dal pavimento e portale ad arco sopra la testa.',
      'Mantieni le braccia tese per tutto il movimento, scapole attive.',
      'Torna alla posizione iniziale lentamente e ripeti.',
    ],
    videoUrl: null,
  },
  {
    name: 'Rematore con bottiglie',
    muscleGroup: 'Schiena',
    equipment: 'Bottiglie d’acqua',
    level: 'intermedio',
    met: 5,
    description: 'Tirata orizzontale per dorsali e romboidi con carico improvvisato.',
    guideSteps: [
      'In piedi, busto inclinato in avanti a 45° dalle anche, schiena dritta.',
      'Una bottiglia piena per mano, braccia tese verso il pavimento.',
      'Tira i gomiti indietro lungo il busto avvicinando le scapole.',
      'Scendi controllato fino a braccia tese senza arrotondare la schiena.',
    ],
    videoUrl: null,
  },
  {
    name: 'Pull-apart con elastico',
    muscleGroup: 'Schiena',
    equipment: 'Elastico',
    level: 'principiante',
    met: 4,
    description: 'Apertura orizzontale dell’elastico per trapezio medio e romboidi.',
    guideSteps: [
      'In piedi, braccia tese in avanti all’altezza delle spalle.',
      'Afferra l’elastico alla larghezza delle spalle, leggera tensione iniziale.',
      'Apri le braccia ai lati allargando l’elastico, scapole che si avvicinano.',
      'Torna lentamente al centro mantenendo le braccia tese.',
    ],
    videoUrl: null,
  },
  {
    name: 'Trazioni assistite con elastico',
    muscleGroup: 'Schiena',
    equipment: 'Elastico + sbarra',
    level: 'intermedio',
    met: 8,
    description: 'Trazioni alla sbarra con elastico che riduce parte del carico.',
    guideSteps: [
      'Aggancia un elastico alla sbarra e infilaci un piede o un ginocchio.',
      'Afferra la sbarra con presa prona alla larghezza delle spalle.',
      'Tira il petto verso la sbarra contraendo dorsali e bicipiti.',
      'Scendi controllato fino a braccia distese senza dondolare.',
    ],
    videoUrl: null,
  },

  // ─── BICIPITI ──────────────────────────────────────────────────
  {
    name: 'Curl con bottiglie',
    muscleGroup: 'Bicipiti',
    equipment: 'Bottiglie d’acqua',
    level: 'principiante',
    met: 4,
    description: 'Flessione del gomito con carico improvvisato per i bicipiti.',
    guideSteps: [
      'In piedi, una bottiglia piena per mano, braccia distese lungo i fianchi.',
      'Palmi rivolti in avanti, gomiti vicini al busto.',
      'Piega i gomiti portando le bottiglie verso le spalle.',
      'Scendi controllato fino a braccia tese senza dondolare il busto.',
    ],
    videoUrl: null,
  },
  {
    name: 'Curl isometrico con asciugamano',
    muscleGroup: 'Bicipiti',
    equipment: 'Asciugamano',
    level: 'principiante',
    met: 3,
    description: 'Tenuta isometrica del bicipite tirando un asciugamano sotto il piede.',
    guideSteps: [
      'Passa l’asciugamano sotto un piede, afferra le estremità con le mani.',
      'Gomiti vicini al busto, palmi verso l’alto.',
      'Tira verso l’alto contro la resistenza del piede senza muoverti.',
      'Mantieni la tensione per il tempo previsto, poi rilascia controllato.',
    ],
    videoUrl: null,
  },

  // ─── SPALLE ────────────────────────────────────────────────────
  {
    name: 'Shoulder taps',
    muscleGroup: 'Spalle',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'In plank alta, tocchi alternati delle spalle per stabilità e deltoidi.',
    guideSteps: [
      'Posizione di plank alta, mani sotto le spalle, corpo allineato.',
      'Solleva una mano e tocca la spalla opposta senza ruotare il bacino.',
      'Riappoggia e ripeti col lato opposto in modo controllato.',
      'Mantieni il core attivo: i fianchi non devono oscillare.',
    ],
    videoUrl: null,
  },
  {
    name: 'Y-T-W prone',
    muscleGroup: 'Spalle',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Sollevamenti prone delle braccia in tre angoli per cuffia dei rotatori.',
    guideSteps: [
      'Prono a terra, fronte appoggiata, braccia distese.',
      'Y: braccia avanti a 45° dal busto, sollevale contraendo le scapole.',
      'T: braccia ai lati a 90°, ripeti il sollevamento.',
      'W: gomiti vicini al busto e mani in alto, ripeti la spinta verso l’alto.',
      'Mantieni il collo lungo e rilassato per tutto il movimento.',
    ],
    videoUrl: null,
  },

  // ─── GLUTEI ────────────────────────────────────────────────────
  {
    name: 'Clamshell',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Apertura dell’anca da decubito laterale per medio gluteo.',
    guideSteps: [
      'Su un fianco, ginocchia piegate a 90°, talloni in linea con i glutei.',
      'Testa appoggiata sul braccio inferiore, bacino stabile.',
      'Apri il ginocchio in alto mantenendo i piedi uniti.',
      'Scendi lentamente senza ruotare il bacino, poi cambia lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Donkey kick',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Calcio posteriore in quadrupedia per gluteo massimo.',
    guideSteps: [
      'In quadrupedia, mani sotto le spalle e ginocchia sotto i fianchi.',
      'Spingi un tallone verso il soffitto mantenendo il ginocchio piegato a 90°.',
      'Contrai il gluteo in cima senza inarcare la lombare.',
      'Torna controllato e alterna lato dopo le ripetizioni.',
    ],
    videoUrl: null,
  },
  {
    name: 'Fire hydrant',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Apertura laterale dell’anca in quadrupedia per medio gluteo.',
    guideSteps: [
      'In quadrupedia, mani sotto le spalle e ginocchia sotto i fianchi.',
      'Apri lateralmente un ginocchio mantenendolo piegato a 90°.',
      'Solleva fino all’altezza del bacino senza ruotare il busto.',
      'Scendi controllato e cambia lato dopo le ripetizioni.',
    ],
    videoUrl: null,
  },

  // ─── GAMBE VARIANTI ────────────────────────────────────────────
  {
    name: 'Lateral lunge',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 5,
    description: 'Affondo laterale per quadricipiti, glutei e adduttori.',
    guideSteps: [
      'In piedi, piedi alla larghezza dei fianchi, busto eretto.',
      'Fai un passo ampio di lato piegando il ginocchio dello stesso lato.',
      'L’altra gamba resta tesa, peso sul tallone della gamba piegata.',
      'Spingi per tornare in piedi e alterna lato.',
    ],
    videoUrl: null,
  },
  {
    name: 'Cossack squat',
    muscleGroup: 'Gambe',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 5,
    description: 'Squat laterale profondo con una gamba tesa per mobilità d’anca.',
    guideSteps: [
      'Piedi più larghi delle spalle, punte leggermente in fuori.',
      'Sposta il peso su una gamba scendendo in squat profondo.',
      'L’altra gamba resta tesa con la punta del piede sollevata verso l’alto.',
      'Risali e trasferisci il peso sull’altro lato in modo fluido.',
    ],
    videoUrl: null,
  },
  {
    name: 'Goblet squat con bottiglia',
    muscleGroup: 'Gambe',
    equipment: 'Bottiglie d’acqua',
    level: 'intermedio',
    met: 6,
    description: 'Squat con carico tenuto al petto per quadricipiti e glutei.',
    guideSteps: [
      'Tieni una bottiglia piena al petto con entrambe le mani, gomiti bassi.',
      'Piedi alla larghezza delle spalle, punte leggermente in fuori.',
      'Scendi in squat fino ad avere le cosce parallele al pavimento.',
      'Risali spingendo dai talloni mantenendo il busto eretto.',
    ],
    videoUrl: null,
  },

  // ─── STACCHI VARIANTI ──────────────────────────────────────────
  {
    name: 'Romanian deadlift con bottiglie',
    muscleGroup: 'Glutei',
    equipment: 'Bottiglie d’acqua',
    level: 'intermedio',
    met: 5,
    description: 'Stacco a gambe semi-tese per posteriori della coscia e glutei.',
    guideSteps: [
      'In piedi, una bottiglia piena per mano davanti alle cosce.',
      'Inclina il busto in avanti dall’anca con ginocchia leggermente piegate.',
      'Scendi le bottiglie lungo le gambe finché senti l’allungamento dietro.',
      'Risali contraendo i glutei e spingendo le anche in avanti.',
    ],
    videoUrl: null,
  },
  {
    name: 'Good morning',
    muscleGroup: 'Glutei',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 4,
    description: 'Inclinazione del busto in piedi per catena posteriore e mobilità d’anca.',
    guideSteps: [
      'In piedi, piedi alla larghezza dei fianchi, mani dietro la testa.',
      'Ginocchia leggermente piegate, schiena dritta.',
      'Inclinati in avanti dall’anca portando il petto verso il pavimento.',
      'Risali contraendo glutei e posteriori senza arrotondare la schiena.',
    ],
    videoUrl: null,
  },

  // ─── PLIOMETRIA ────────────────────────────────────────────────
  {
    name: 'Tuck jump',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 8,
    description: 'Salto verticale con ginocchia al petto per potenza e cardio.',
    guideSteps: [
      'In piedi, piedi alla larghezza delle spalle, leggero squat di partenza.',
      'Esplodi verso l’alto portando le ginocchia verso il petto.',
      'Atterra morbido sulle punte e ammortizza piegando le ginocchia.',
      'Riparti subito col salto successivo mantenendo il ritmo.',
    ],
    videoUrl: null,
  },
  {
    name: 'Broad jump',
    muscleGroup: 'Cardio',
    equipment: 'Corpo libero',
    level: 'intermedio',
    met: 7,
    description: 'Salto in lungo da fermo per potenza esplosiva degli arti inferiori.',
    guideSteps: [
      'In piedi, piedi alla larghezza dei fianchi, leggero squat di partenza.',
      'Slancia le braccia indietro e poi in avanti per generare spinta.',
      'Esplodi in avanti spingendo dai piedi, atterra in posizione di squat.',
      'Recupera in piedi e riparti, mantenendo l’atterraggio controllato.',
    ],
    videoUrl: null,
  },

  // ─── ESERCIZI SEDUTI ───────────────────────────────────────────
  {
    name: 'Marcia da seduti',
    muscleGroup: 'Cardio',
    equipment: 'Sedia',
    level: 'principiante',
    met: 3,
    description: 'Sollevamento alternato delle ginocchia da seduto per cardio leggero.',
    guideSteps: [
      'Seduto su una sedia stabile, schiena dritta e piedi a terra.',
      'Solleva un ginocchio alla volta verso il petto.',
      'Coordina con un’oscillazione naturale delle braccia.',
      'Mantieni un ritmo costante respirando regolarmente.',
    ],
    videoUrl: null,
  },
  {
    name: 'Alzata gambe da seduti',
    muscleGroup: 'Gambe',
    equipment: 'Sedia',
    level: 'principiante',
    met: 3,
    description: 'Estensione della gamba da seduti per i quadricipiti.',
    guideSteps: [
      'Seduto su una sedia stabile, schiena appoggiata allo schienale.',
      'Distendi una gamba in avanti fino a portarla parallela al pavimento.',
      'Contrai il quadricipite in cima per 1–2 secondi.',
      'Scendi controllato e alterna lato dopo le ripetizioni.',
    ],
    videoUrl: null,
  },
  {
    name: 'Twist da seduti',
    muscleGroup: 'Core obliqui',
    equipment: 'Sedia',
    level: 'principiante',
    met: 3,
    description: 'Rotazioni del busto da seduti per gli obliqui.',
    guideSteps: [
      'Seduto su una sedia stabile, mani giunte davanti al petto.',
      'Piedi appoggiati a terra, schiena eretta e core attivo.',
      'Ruota il busto a destra mantenendo il bacino fermo.',
      'Torna al centro e ruota a sinistra in modo controllato.',
    ],
    videoUrl: null,
  },

  // ─── MOBILITÀ ──────────────────────────────────────────────────
  {
    name: 'Anche - Leg swings',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 3,
    description: 'Oscillazioni della gamba per scaldare l’articolazione dell’anca.',
    guideSteps: [
      'In piedi accanto a una parete, una mano in appoggio per l’equilibrio.',
      'Oscilla una gamba avanti e indietro mantenendola tesa.',
      'Aumenta l’ampiezza progressivamente senza inarcare la schiena.',
      'Cambia lato e ripeti, poi prova oscillazioni laterali.',
    ],
    videoUrl: null,
  },
  {
    name: 'Polsi - Wrist circles',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Cerchi dei polsi per scaldare le articolazioni delle mani.',
    guideSteps: [
      'In piedi o seduto, braccia tese in avanti.',
      'Stringi i pugni e disegna cerchi ampi con i polsi.',
      'Alterna senso orario e antiorario per qualche ripetizione.',
      'Mantieni le spalle rilassate e le braccia ferme.',
    ],
    videoUrl: null,
  },
  {
    name: 'Caviglie - Ankle circles',
    muscleGroup: 'Mobilità',
    equipment: 'Corpo libero',
    level: 'principiante',
    met: 2,
    description: 'Cerchi delle caviglie per mobilizzare l’articolazione.',
    guideSteps: [
      'Seduto o in piedi con un appoggio, solleva un piede da terra.',
      'Disegna cerchi ampi con la punta del piede.',
      'Alterna senso orario e antiorario per qualche ripetizione.',
      'Cambia piede e ripeti.',
    ],
    videoUrl: null,
  },
];

async function insertExercise(
  db: SQLite.SQLiteDatabase,
  ex: SeedExercise,
  ignoreOnConflict: boolean,
): Promise<void> {
  const verb = ignoreOnConflict ? 'INSERT OR IGNORE INTO' : 'INSERT INTO';
  await db.runAsync(
    `${verb} exercises
       (name, muscle_group, equipment, level, description, guide_steps, video_url, met)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ex.name,
    ex.muscleGroup,
    ex.equipment,
    ex.level,
    ex.description,
    JSON.stringify(ex.guideSteps),
    ex.videoUrl,
    ex.met,
  );
}

export async function seedExercisesIfEmpty(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM exercises',
  );
  const isEmpty = !row || row.count === 0;

  if (isEmpty) {
    for (const ex of SEED_EXERCISES) {
      await insertExercise(db, ex, false);
    }
    return;
  }

  // Migration idempotente di accorpamento muscleGroup + rinaming nomi
  // mobilità. Eseguita prima del top-up così le UPDATE non collidono
  // con eventuali INSERT OR IGNORE successivi sugli stessi name.
  await migrateMuscleGroupsAndNames(db);

  // Top-up idempotente: chi ha già seedato una versione precedente con
  // meno esercizi riceve i nuovi nomi. UNIQUE su `exercises.name` ci
  // protegge da duplicati; INSERT OR IGNORE evita di sovrascrivere
  // eventuali edit utente futuri (oggi la libreria è read-only ma
  // teniamo aperta la porta — vedi PLAN.md §4A).
  for (const ex of SEED_EXERCISES) {
    await insertExercise(db, ex, true);
  }
}

const MUSCLE_GROUP_RENAMES: Array<[string, string]> = [
  ['Petto/Core', 'Petto'],
  ['Gambe/Cardio', 'Cardio'],
  ['Glutei/Femorali', 'Glutei'],
  ['Schiena alta', 'Schiena'],
  ['Mobilità schiena', 'Mobilità'],
  ['Mobilità full body', 'Mobilità'],
  ['Mobilità anche', 'Mobilità'],
  ['Mobilità spalle', 'Mobilità'],
  ['Mobilità polsi', 'Mobilità'],
  ['Mobilità caviglie', 'Mobilità'],
];

const NAME_RENAMES: Array<[string, string]> = [
  ['Cat-cow', 'Schiena - Cat-cow'],
  ['Cobra', 'Schiena - Cobra'],
  ['Child pose', 'Schiena - Child pose'],
  ['Downward dog', 'Full body - Downward dog'],
  ['Hip circles', 'Anche - Hip circles'],
  ['Shoulder rolls', 'Spalle - Shoulder rolls'],
  ['Pigeon pose', 'Anche - Pigeon pose'],
  ['Leg swings', 'Anche - Leg swings'],
  ['Wrist circles', 'Polsi - Wrist circles'],
  ['Ankle circles', 'Caviglie - Ankle circles'],
];

async function migrateMuscleGroupsAndNames(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  for (const [from, to] of MUSCLE_GROUP_RENAMES) {
    await db.runAsync(
      'UPDATE exercises SET muscle_group = ? WHERE muscle_group = ?',
      to,
      from,
    );
  }
  for (const [from, to] of NAME_RENAMES) {
    await db.runAsync(
      'UPDATE OR IGNORE exercises SET name = ? WHERE name = ?',
      to,
      from,
    );
  }
}
