export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        globalThis: 'readonly',
        QLENS: 'readonly',
        chrome: 'readonly',
        importScripts: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        Node: 'readonly',
        URL: 'readonly',
        AbortController: 'readonly',
        CSSStyleSheet: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        console: 'readonly',
        crypto: 'readonly'
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