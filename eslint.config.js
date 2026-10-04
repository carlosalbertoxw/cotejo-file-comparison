// Reglas de estilo y correccion para todo el codigo de la aplicacion.
//
// Hasta ahora habia cuatro `// eslint-disable-next-line react-hooks/...` en el
// codigo sin ningun ESLint que las leyera: senalaban los efectos con
// dependencias incompletas a proposito —los sitios donde un despiste provoca
// un bucle de recarga— y no habia nada comprobandolos.
//
// El sitio de `sitio/` queda fuera: es otro proyecto npm, con su propio
// `astro check`.

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'dist/**',
      'release/**',
      'sitio/**',
      'build/**',
      // Son datos de prueba, no codigo: existen justamente para tener
      // diferencias que comparar, incluidas variables sin usar.
      'test/fixtures/**',
      'test-results/**',
      'playwright-report/**',
      '**/*.tsbuildinfo',
      'node_modules/**'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Reglas generales. Van antes que las secciones por carpeta: en la
  // configuracion plana gana el ultimo bloque que casa con el archivo, asi que
  // lo que se pone aqui se puede matizar despues y no al reves.
  {
    rules: {
      // El proyecto ya usa `_` para lo que se ignora a proposito, sobre todo en
      // los manejadores de IPC, donde el primer argumento es el evento.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      // El BOM que se escribe en THIRD-PARTY-NOTICES.txt va dentro de una
      // plantilla y es intencionado.
      'no-irregular-whitespace': ['error', { skipTemplates: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },

  // El estilo que pide CONTRIBUTING.md, comprobado en vez de confiado a la
  // disciplina de cada uno. Solo reglas que el codigo ya cumple: un
  // formateador como Prettier reescribiria de golpe una treintena de archivos
  // por diferencias que nadie ha pedido, y esto deja el historial como esta.
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/eol-last': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      // El mismo ancho que `.editorconfig`. La sangria no se comprueba: la
      // regla de @stylistic discrepa del codigo en JSX y en ternarios
      // anidados, y ahi manda lo que ya hay.
      '@stylistic/max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true
        }
      ]
    }
  },

  // Proceso principal y preload: Node, sin DOM.
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', '*.config.{ts,mjs,js}'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },

  // Utilidades de build: son de linea de comandos, imprimir es su trabajo.
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      'no-console': 'off'
    }
  },

  // Renderer: DOM y navegador.
  //
  // De `react-hooks` se activan las dos reglas clasicas y no el preset
  // completo: la version 7 del plugin trae ademas las reglas del compilador de
  // React (`refs`, `set-state-in-effect`, `preserve-manual-memoization`), que
  // dan por incorrectos patrones que aqui son deliberados —el espejo de estado
  // en una `ref` para no reinstalar los atajos de teclado en cada pulsacion, o
  // el `setState` de un efecto al llegar un resultado del worker—. Este
  // proyecto no usa el compilador; activarlas seria pelearse con el linter.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },

  {
    files: ['test/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node }
    }
  }
)
