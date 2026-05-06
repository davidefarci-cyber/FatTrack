// Flat config ESLint v9 per FatTrack.
// Stack: React Native 0.74 + Expo SDK 51 + TypeScript strict.
// Le regole sono tarate per intercettare i bug realmente capitati nel
// progetto (es. il loop infinito di SportHomeScreen causato da
// useFocusEffect con dipendenza non-memoizzata) senza sommergere il
// dev di rumore stilistico.

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  // File / cartelle da ignorare globalmente.
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'assets/**',
      // Generato automaticamente dalla pipeline immagini esercizi.
      'src/utils/exerciseImages.ts',
      // Script Node a parte, hanno il loro disable in-file.
      'scripts/**',
      'babel.config.js',
      'metro.config.js',
      // Il file di config ESLint stesso.
      'eslint.config.js',
    ],
  },

  // Base: ESLint recommended.
  js.configs.recommended,

  // TypeScript: parser + recommended (no type-checked, troppo lento per il
  // gate pre-release; se serve si aggiunge in iterazione successiva).
  ...tseslint.configs.recommended,

  // React + React Hooks per i file TSX/TS dell'app.
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx', 'index.ts'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React: regole utili senza obbligare React in scope (RN usa il
      // new JSX transform).
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // TypeScript copre i prop types.
      'react/display-name': 'off',
      // L'app e' tutta in italiano: apostrofi ("l'utente", "un'app") e
      // virgolette tipografiche sono frequentissimi nel JSX. Escaparli
      // distruggerebbe la leggibilita' del codice senza alcun beneficio
      // pratico (RN non interpreta entity HTML, e il rendering e'
      // sempre Text-only). Regola disattivata.
      'react/no-unescaped-entities': 'off',

      // React Hooks: questi sono i due che hanno un ROI concreto sul
      // codebase (vedi loop SportHomeScreen).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript: lasciamo recommended ma rilassiamo "no-explicit-any"
      // (warn) e "no-unused-vars" (warn con prefisso _ tollerato).
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Tolleriamo require() in alcuni punti specifici (es. immagini
      // statiche di RN). Niente errore globale.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
