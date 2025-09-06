// eslint.config.js
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginPrettier from 'eslint-plugin-prettier';
import configPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      'dist/',
      'generated/',
      'node_modules/',
      'tsp-output/',
      'coverage/',
      '.venv/',
      'docs/',
      'vite.config.ts',
      'vitest.config.js',
    ],
  },
  {
    files: ['**/*.js'], // JavaScript files
    extends: [pluginJs.configs.recommended, configPrettier],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['**/*.ts'], // TypeScript files
    extends: [
      pluginJs.configs.recommended,
      ...tseslint.configs.recommended,
      configPrettier,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json'],
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: pluginPrettier,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
  }
);
