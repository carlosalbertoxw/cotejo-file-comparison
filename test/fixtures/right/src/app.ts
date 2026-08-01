import { readFile } from 'node:fs/promises'

export interface Config {
  host: string
  port: number
  retries: number
  timeout: number
}

export async function loadConfig(path: string): Promise<Config> {
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw) as Partial<Config>
  return {
    host: parsed.host ?? '127.0.0.1',
    port: parsed.port ?? 9090,
    retries: parsed.retries ?? 5,
    timeout: parsed.timeout ?? 30
  }
}

export function describe(config: Config): string {
  return `${config.host}:${config.port} (timeout ${config.timeout}s)`
}
