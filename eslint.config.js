import globals from 'globals';

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      // Browser + WebExtension surface. Hand-picking globals one by one kept
      // producing no-undef false positives (btoa/atob/Blob/FormData/
      // FontFace/FileReader/createImageBitmap/InputEvent/URLSearchParams/
      // confirm), which trains you to ignore the linter. The extension
      // globals are read-only so nothing can shadow chrome.*.
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.serviceworker,
        QLENS: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-global-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
      'no-const-assign': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-constant-condition': 'error',
      'no-prototype-builtins': 'error',
      'no-useless-escape': 'error',
      'no-useless-catch': 'error',
      'no-extra-boolean-cast': 'off',
      'no-unexpected-multiline': 'error'
    }
  }
];