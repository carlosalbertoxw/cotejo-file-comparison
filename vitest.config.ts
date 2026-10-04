import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer')
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Solo con `npm run test:coverage`. Es un informe, no una puerta: sin
    // umbral, para ver donde faltan pruebas sin obligar a perseguir un numero.
    // Los componentes de React se prueban de punta a punta en e2e/, que no
    // pasa por aqui, asi que quedan fuera para no ahogar la cifra que importa:
    // la del proceso principal y la logica pura.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/renderer/**/*.tsx'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage'
    }
  }
})
