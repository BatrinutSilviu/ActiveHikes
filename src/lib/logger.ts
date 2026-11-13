// One-line JSON logs on stdout/stderr — `docker logs` collects them (archived for 30 days on the VPS),
// so there are no log files here. Each line: { time, level, msg, ...context }, errors as { name, message, stack }.

type Level = 'info' | 'warn' | 'error'
type Context = Record<string, unknown>

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    const digest = (value as Error & { digest?: string }).digest
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(digest ? { digest } : {}),
      ...(value.cause !== undefined ? { cause: serialize(value.cause) } : {}),
    }
  }
  return value
}

function write(level: Level, msg: string, context?: Context) {
  const entry: Context = { time: new Date().toISOString(), level, msg }
  for (const [key, value] of Object.entries(context ?? {})) entry[key] = serialize(value)
  let line: string
  try {
    line = JSON.stringify(entry)
  } catch {
    line = JSON.stringify({ time: entry.time, level, msg, note: 'context not serializable' })
  }
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (msg: string, context?: Context) => write('info', msg, context),
  warn: (msg: string, context?: Context) => write('warn', msg, context),
  error: (msg: string, context?: Context) => write('error', msg, context),
}
