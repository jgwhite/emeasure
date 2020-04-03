import * as cp from 'child_process'

export function sleep(d: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, d))
}

type milliseconds = number

export async function measure<R>(fn: () => Promise<R>): Promise<[milliseconds, R]> {
  const t1 = Date.now()
  const result = await fn()
  const t2 = Date.now()
  const measurement = t2 - t1

  return [measurement, result]
}

export function exec(cmd: string): Promise<ExecResult> {
  const opts = {
    env: {
      ...process.env,
      CLEAR_BROCCOLI_PERSISTENT_FILTER_CACHE: 'true',
    },
  }

  return new Promise((resolve, reject) => {
    cp.exec(cmd, opts, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({stdout, stderr})
      }
    })
  })
}

export type ExecResult = {
  stdout: string;
  stderr: string;
}

type bytes = number;

export function extractSize(input: string, prefix: string, suffix: string): bytes {
  const re = new RegExp(`${prefix}.+\\.${suffix}: ([\\d.]+) (KB|MB|B)`)
  const match = re.exec(input)

  if (!match) {
    throw new Error(`Could not parse build output: \n ${input}`)
  }

  const [, size, unit] = match

  switch (unit) {
  case 'MB':
    return Number(size) * 1000000
  case 'KB':
    return Number(size) * 1000
  case 'B':
    return Number(size)
  default:
    throw new Error(`Unknown unit: ${unit}`)
  }
}

export function humanize(bytes: bytes) {
  if (bytes > 1000000) {
    return `${(bytes / 1000000).toFixed(2)} MB`
  }

  if (bytes > 1000) {
    return `${(bytes / 1000).toFixed(2)} KB`
  }

  return `${bytes} B`
}
