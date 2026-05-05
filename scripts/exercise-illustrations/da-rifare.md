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
| `curl-isometrico-asciugamano` | 🔴 grave | GPT ha disegnato un uomo che tiene un asciugamano verticale a due mani davanti al corpo, NON il curl isometrico col piede sull'asciugamano | Enfatizzare: l'asciugamano PASSA SOTTO UN PIEDE (visibile a terra), le mani tengono le DUE estremità che escono ai lati del piede, gomiti a 90° vicini al busto, palmi verso l'alto. Posizione statica di tensione. |
| `pull-apart-elastico` | 🔴 grave | Manca completamente l'elastico, le mani sono libere | OBBLIGATORIO disegnare l'elastico come linea curva sottile arancio (#FF7A1A) tesa visibilmente tra le due mani in entrambi i frame. Frame 2: l'elastico è chiaramente teso al massimo davanti al petto. |
| `y-t-w-prone` | 🔴 grave | Ordine sbagliato dei 3 frame, la Y manca, sembra W-T-W | Definire ESPLICITAMENTE le 3 forme:<br>- Frame 1 (Y): braccia tese aperte a 45° dal busto, formando una Y vista dall'alto.<br>- Frame 2 (T): braccia tese aperte a 90° (perpendicolari al busto), formando una T.<br>- Frame 3 (W): gomiti piegati vicino al busto, mani sollevate ai lati della testa, formando una W. |
| `twist-seduti` | 🔴 grave | La rotazione del busto è troppo subtle, sembra solo "donna seduta" | Frame 1: busto centrato dritto, mani giunte davanti al petto. Frame 2: busto **chiaramente ruotato di 60-70°** verso un lato, mani giunte portate ben fuori dal centro vicino al fianco, spalle visibilmente girate. Differenza inequivocabile tra i due frame. |
| `mountain-climber` | 🟡 borderline | Frame 1 e 2 troppo simili, alternanza ginocchia poco chiara | Rendere drammatica la differenza: frame 1 ginocchio destro proprio sotto al petto col piede destro vicino alla mano destra, frame 2 ginocchio sinistro nella stessa posizione speculare. Gamba opposta ben tesa indietro in entrambi. |
| `hamstring-stretch` | 🟡 borderline | Variante semplificata (forward fold base) invece di figure-4 seated col piede al ginocchio opposto | Specificare esplicitamente: una gamba TESA in avanti, l'ALTRA gamba PIEGATA con la pianta del piede contro l'INTERNO del ginocchio della gamba tesa (forma a "4"). Busto inclinato verso il piede della gamba tesa. |
| `diamond-push-up` | 🟡 borderline | Il rombo formato dalle mani non è evidente, sembra solo un close-grip push-up | Vista dall'alto preferibile O 3/4 marcata. Mostrare ESPLICITAMENTE le mani con pollici e indici che si toccano formando un rombo nitido visibile a colpo d'occhio. Magari con leggera enfasi (#FF7A1A) sul contorno del rombo. |
| `russian-twist` | 🟡 borderline | La rotazione del busto tra i due frame è troppo sottile | Frame 1: busto centrato dritto, mani giunte davanti al petto. Frame 2: busto **chiaramente ruotato di 60-70°** verso un lato, mani giunte portate ben fuori dal centro vicino al fianco. Differenza tra i due frame inequivocabile. |

## Storico delle promozioni dopo rigenerazione

_(vuoto — verrà popolato man mano)_

Ogni volta che un esercizio viene rigenerato, verificato e promosso in
`verificate/`, sposta la sua riga qui sotto con la data di promozione e
una breve nota su cosa è cambiato.
