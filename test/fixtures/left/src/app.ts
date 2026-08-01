import { readFile } from 'node:fs/promises'

export interface Config {
  host: string
  port: number
  retries: number
}

export async function loadConfig(path: string): Promise<Config> {
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw) as Partial<Config>
  return {
    host: parsed.host ?? 'localhost',
    port: parsed.port ?? 8080,
    retries: parsed.retries ?? 3
  }
}

export function describe(config: Config): string {
  return `${config.host}:${config.port}`
}

// Esta linea solo existe en la izquierda
const LEGACY_TIMEOUT = 30
