/**
 * La comprobacion de versiones es la unica conexion que hace Cotejo, y el
 * sitio promete que se puede apagar. Esto comprueba que apagarla la apaga de
 * verdad, sin quitar la busqueda a mano.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdates } from '@renderer/state/updateStore'

const checkForUpdates = vi.fn()

beforeEach(() => {
  checkForUpdates.mockReset()
  checkForUpdates.mockResolvedValue({
    current: '0.5.0',
    latest: 'v0.5.0',
    available: false,
    checkedAt: Date.now()
  })
  vi.stubGlobal('window', { api: { checkForUpdates } })
  useUpdates.setState({ status: 'idle', lastCheck: 0, autoCheck: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('comprobacion de versiones', () => {
  it('por defecto comprueba sola', async () => {
    await useUpdates.getState().check()
    expect(checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('apagada, no sale a la red al arrancar', async () => {
    useUpdates.getState().setAutoCheck(false)
    await useUpdates.getState().check()
    expect(checkForUpdates).not.toHaveBeenCalled()
  })

  it('apagada, el boton de «Acerca de» sigue buscando', async () => {
    useUpdates.getState().setAutoCheck(false)
    await useUpdates.getState().check(true)
    expect(checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('no repite dentro del mismo dia', async () => {
    await useUpdates.getState().check()
    await useUpdates.getState().check()
    expect(checkForUpdates).toHaveBeenCalledTimes(1)
  })
})
