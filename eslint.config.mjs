import babelParser from '@babel/eslint-parser';
import js from '@eslint/js';

// Rules shared by source and test code.
const sharedRules = {
  curly: ['error', 'all'],
  eqeqeq: ['error', 'always'],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-wrappers': 'error',
  'no-var': 'error',
  'prefer-const': 'error',
};

// Globals the CommonJS tests and benchmark use, listed by hand so linting needs no extra dependency.
// Node.js provides all of them; the event classes are the same web globals browsers provide.
const nodeGlobals = {
  require: 'readonly',
  __dirname: 'readonly',
  process: 'readonly',
  console: 'readonly',
  EventTarget: 'readonly',
  CustomEvent: 'readonly',
  AbortController: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: 'unambiguous',
        babelOptions: {
          presets: ['@babel/preset-typescript'],
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      ...sharedRules,
    },
  },
  {
    files: ['test/**/*.js', 'benchmark/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sharedRules,
    },
  },
  {
    // Callbacks passed to Playwright's page.evaluate() run inside the Chromium page, not in Node.
    files: ['test/browser/**/*.js'],
    languageOptions: {
      globals: {document: 'readonly', navigator: 'readonly'},
    },
  },
];
