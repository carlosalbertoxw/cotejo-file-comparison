import { describe, expect, it } from 'vitest'
import { operableRoots } from '@renderer/components/dir/operableRoots'

const COMPARED = { leftRoot: '/datos/izquierda', rightRoot: '/datos/derecha' }

describe('operableRoots', () => {
  it('opera sobre las raices de la comparacion que esta en pantalla', () => {
    expect(operableRoots(COMPARED, '/datos/izquierda', '/datos/derecha', false)).toEqual(COMPARED)
  })

  it('no deja operar mientras se compara', () => {
    expect(operableRoots(COMPARED, '/datos/izquierda', '/datos/derecha', true)).toBeNull()
  })

  it('no deja operar si la ruta de la pestana ya no es la comparada', () => {
    // Se escribio otra carpeta a la derecha y la tabla sigue siendo la vieja:
    // borrar a la derecha iria a `/otra/<ruta vieja>`.
    expect(operableRoots(COMPARED, '/datos/izquierda', '/otra', false)).toBeNull()
    expect(operableRoots(COMPARED, null, '/datos/derecha', false)).toBeNull()
  })

  it('sin comparacion no hay nada sobre lo que operar', () => {
    expect(operableRoots(null, '/datos/izquierda', '/datos/derecha', false)).toBeNull()
  })

  it('la misma ruta escrita de otra forma sigue siendo la comparada', () => {
    const roots = operableRoots(COMPARED, '/datos/izquierda/', '/datos/derecha', false)
    // Devuelve las de la comparacion, no las de la pestana.
    expect(roots).toEqual(COMPARED)
  })
})
