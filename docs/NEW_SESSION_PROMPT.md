# Prompt per nuova sessione — Macro · History insights · Tooltip

Copia il blocco qui sotto come primo messaggio in una sessione pulita di
Claude Code, in cwd `/home/user/FatTrack` (o equivalente), partendo dal
branch `main` aggiornato (post-merge della PR precedente).

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa i 3 miglioramenti UX approvati nell'audit precedente:
macro nutrients (proteine/carboidrati/grassi), history insights
(streak/trend/giorno migliore), tooltip BMR/TDEE/Target.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici, design system non negoziabile,
   convenzioni DB e codice. Non sono opzionali.
2. docs/PLAN_MACRO_HISTORY_TOOLTIP.md — il piano completo: contesto,
   decisioni di schema, file path con line ranges, algoritmi, sequenza
   dei 6 commit, smoke test e open questions.

Poi:

- Crea il branch claude/macro-history-tooltip da main.
- Esegui le 6 fasi descritte nella sezione "Sequenza commit suggerita"
  del piano, una alla volta, con un commit separato per ognuna.
- Dopo ogni fase, prima del commit: `npm run typecheck` deve passare.
  Se la prima volta node_modules manca, fai `npm ci`.
- I messaggi di commit seguono il pattern già usato sul repo: titolo
  conciso `feat(area): …` + body descrittivo + trailer
  https://claude.ai/code/session_<id>.
- Niente PR: alla fine fai solo `git push -u origin <branch>`. Sarò
  io a decidere quando aprire la PR e mergiare.

Vincoli operativi:

- Italiano per tutti i testi UI e i nomi delle label.
- Solo i token/primitives di src/theme: niente hex inline, niente
  librerie UI esterne.
- Alias `@/` per gli import.
- expo-sqlite async API; ALTER TABLE idempotenti via try/catch nel
  pattern già presente in src/database/db.ts.
- Non toccare: settings.json, hook git, CI/CD, package.json (a meno
  che il piano non lo richieda esplicitamente — non lo richiede).
- Non creare file di documentazione aggiuntivi non richiesti dal piano.
- Se trovi una decisione ambigua, leggi prima la sezione "Open
  questions" del piano (decisioni di default già prese); fai una
  AskUserQuestion solo se rimane davvero un dubbio bloccante.

Procedi.
```

---

## Note operative per chi avvia la sessione

- **Verifica preliminare**: il branch `main` deve contenere
  `docs/PLAN_MACRO_HISTORY_TOOLTIP.md` (questo file accompagna). Se non
  c'è, la PR del lavoro precedente non è stata mergeata correttamente.
- **node_modules**: in ambienti effimeri potrebbe non essere installato.
  Il prompt include `npm ci` come fallback nella prima fase.
- **Sessione sul web**: se la sessione è on-demand e ha un session-start
  hook, può preparare l'ambiente automaticamente. Vedi
  `src/components/SessionStart` (se presente) o `setup.bat` per Windows.
- **Tempi attesi**: 6 commit, ogni commit S/M effort. Stima ~1.5–2h per
  un agente, dipende dal volume di file toccati nella fase 2 (capture
  macro lungo i flussi tocca 5+ file).

## Cosa NON includere nel prompt

Volutamente fuori scope (decisione del proprietario):

- Apertura PR / merge / delete branch — operazioni di review umana.
- Modifiche a `setup.bat`, `eas.json`, `app.json`, `package.json`.
- Aggiunta di librerie (chart custom, animation libs, ecc.).
- Refactor di file non toccati dal piano.
- Modifica al design system (`src/theme/index.ts`) salvo aggiunta di
  un'icona `info` se mancante (esplicitamente prevista dal piano).
