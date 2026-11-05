import { defineConfig } from 'eslint/config'

const browserGlobals = [
  'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'location', 'history', 'fetch', 'Headers', 'Request', 'Response',
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader',
  'AbortController', 'AbortSignal', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'console', 'alert', 'confirm', 'prompt',
  'HTMLElement', 'Element', 'Node', 'MutationObserver', 'IntersectionObserver',
  'ResizeObserver', 'Image', 'Audio', 'Event', 'CustomEvent',
  'requestAnimationFrame', 'cancelAnimationFrame', 'performance',
  'crypto', 'atob', 'btoa', 'Intl', 'structuredClone'
]

const globals = Object.fromEntries(browserGlobals.map((name) => [name, 'readonly']))

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**']
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals
    },
    rules: {
      'no-undef': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',
      'no-constant-condition': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unexpected-multiline': 'error',
      'no-unused-vars': ['warn', {
        args: 'none',
        caughtErrors: 'none',
        ignoreRestSiblings: true
      }]
    }
  }
])
