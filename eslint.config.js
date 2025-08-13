import pluginJs from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import { config, configs } from 'typescript-eslint';

export default config([
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      '*.gen.ts',
      '*.generated.ts',
    ],
  },

  pluginJs.configs.recommended,
  ...configs.recommended,
  eslintPluginPrettierRecommended,
  eslintPluginImportX.flatConfigs.recommended,
  ...eslintPluginAstro.configs.recommended,

  // General rules for all files
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx,astro}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      // Treat Astro virtual modules as core modules so they don't error
      'import-x/core-modules': ['astro:actions'],
    },
    rules: {
      // off
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',

      // error
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'import-x/no-extraneous-dependencies': [
        'error',
        { devDependencies: true },
      ],
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
        },
      ],

      // warn
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
]);
