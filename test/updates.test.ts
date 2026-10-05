import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LATEST_RELEASE_API } from '../src/shared/links'

/**
 * La consulta de versiones es la unica conexion de Cotejo. Lo que se prueba es
 * como interpreta cada respuesta de GitHub; `net.fetch` y la version instalada
 * vienen de Electron y se doblan.
 */
const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>()

vi.mock('electron', () => ({
  app: { getVersion: () => '0.6.0' },
  net: { fetch: (url: string, init?: RequestInit) => fetch(url, init) }
}))

const { checkForUpdates } = await import('../src/main/services/updates')

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

beforeEach(() => {
  fetch.mockReset()
})

describe('checkForUpdates', () => {
  it('consulta la URL fija, con User-Agent propio y tiempo limite', async () => {
    fetch.mockResolvedValue(json({ tag_name: 'v0.6.0' }))

    await checkForUpdates()

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe(LATEST_RELEASE_API)
    expect(init?.headers).toMatchObject({ 'User-Agent': 'Cotejo/0.6.0' })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('avisa si la ultima release es mas nueva', async () => {
    fetch.mockResolvedValue(json({ tag_name: 'v0.7.0' }))

    const result = await checkForUpdates()

    expect(result).toMatchObject({ current: '0.6.0', latest: 'v0.7.0', available: true })
  })

  it('no avisa si es la misma o una anterior', async () => {
    fetch.mockResolvedValue(json({ tag_name: 'v0.6.0' }))
    expect((await checkForUpdates()).available).toBe(false)

    fetch.mockResolvedValue(json({ tag_name: 'v0.5.0' }))
    expect((await checkForUpdates()).available).toBe(false)
  })

  it('un repositorio sin releases no es un error', async () => {
    fetch.mockResolvedValue(json({ message: 'Not Found' }, 404))

    const result = await checkForUpdates()

    expect(result).toMatchObject({ latest: null, available: false })
  })

  it('una respuesta sin etiqueta no inventa version', async () => {
    fetch.mockResolvedValue(json({ name: 'sin tag' }))

    const result = await checkForUpdates()

    expect(result).toMatchObject({ latest: null, available: false })
  })

  it('cualquier otro estado HTTP es un fallo', async () => {
    fetch.mockResolvedValue(json({ message: 'rate limit' }, 403))

    await expect(checkForUpdates()).rejects.toThrow('403')
  })
})
