import globals from 'globals';
import pluginJs from '@eslint/js';
import googleConfig from 'eslint-config-google'; // Import Google style guide

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: globals.browser,
      sourceType: 'module', // Default to ESM
      ecmaVersion: 'latest' // Latest JavaScript features
    },
  },
  pluginJs.configs.recommended,
  googleConfig, // Apply Google ESLint rules
  {
    rules: {
      'no-undefined': ['error'],
      'linebreak-style': ['error', 'windows'],
      'max-len': ['error', { 'code': 100, 'tabWidth': 2, 'comments': 200 }],
      'arrow-parens': ['error', 'as-needed'],
      'comma-dangle': ['error', 'never'],
      'valid-jsdoc': 'off',
      'require-jsdoc': 'off',
      'object-curly-spacing': ['error', 'always']
    }
  },
];
