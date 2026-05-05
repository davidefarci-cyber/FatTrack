# Esercizi da rifare

Lista cumulativa degli slug le cui illustrazioni sono state scartate
in fase di verifica. Quando un esercizio viene rigenerato e supera lo
spot-check, va **rimosso** da questa lista (e il WebP committato in
`assets/exercises/verificate/`).

A fine processo, da questa lista verrà generato un file
`batches/rifare.md` con i prompt rinforzati per la rigenerazione.

## In sospeso

| Slug | Severità | Problema | Note per prompt rinforzato |
|---|---|---|---|
| `spinal-twist` | 🔴 grave | GPT ha disegnato eagle/tree pose yoga in piedi invece di torsione spinale supina | Enfatizzare: POSIZIONE SUPINA SUL PAVIMENTO, NON IN PIEDI. Vista dall'alto. Ginocchio piegato che cade lateralmente sul pavimento dal lato opposto. |
| `shoulder-rolls` | 🔴 grave | I due frame sono praticamente identici, niente movimento di spalle visibile | Enfatizzare differenza marcata tra frame: frame 1 spalle BASSE rilassate, frame 2 spalle ALZATE quasi alle orecchie e ARRETRATE. Visibilità chiara dell'arco di rotazione. |
| `skater-jumps` | 🔴 grave | I due frame sembrano due corse normali invece del salto laterale stile pattinaggio | Enfatizzare: passo laterale ampio, gamba dietro INCROCIATA appoggiata dietro alla gamba portante, busto inclinato lateralmente, niente postura da corsa frontale. |
| `mountain-climber` | 🟡 borderline | Frame 1 e 2 troppo simili, alternanza ginocchia poco chiara | Rendere drammatica la differenza: frame 1 ginocchio destro proprio sotto al petto col piede destro vicino alla mano destra, frame 2 ginocchio sinistro nella stessa posizione speculare. Gamba opposta ben tesa indietro in entrambi. |
| `hamstring-stretch` | 🟡 borderline | Variante semplificata (forward fold base) invece di figure-4 seated col piede al ginocchio opposto | Specificare esplicitamente: una gamba TESA in avanti, l'ALTRA gamba PIEGATA con la pianta del piede contro l'INTERNO del ginocchio della gamba tesa (forma a "4"). Busto inclinato verso il piede della gamba tesa. |
| `diamond-push-up` | 🟡 borderline | Il rombo formato dalle mani non è evidente, sembra solo un close-grip push-up | Vista dall'alto preferibile O 3/4 marcata. Mostrare ESPLICITAMENTE le mani con pollici e indici che si toccano formando un rombo nitido visibile a colpo d'occhio. Magari con leggera enfasi (#FF7A1A) sul contorno del rombo. |
| `russian-twist` | 🟡 borderline | La rotazione del busto tra i due frame è troppo sottile | Frame 1: busto centrato dritto, mani giunte davanti al petto. Frame 2: busto **chiaramente ruotato di 60-70°** verso un lato, mani giunte portate ben fuori dal centro vicino al fianco. Differenza tra i due frame inequivocabile. |

## Storico delle promozioni dopo rigenerazione

_(vuoto — verrà popolato man mano)_

Ogni volta che un esercizio viene rigenerato, verificato e promosso in
`verificate/`, sposta la sua riga qui sotto con la data di promozione e
una breve nota su cosa è cambiato.
