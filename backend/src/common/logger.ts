/**
 * Optional structured logger for backend.
 * Use in new code only. Existing console.log in scripts/services stays unchanged.
 *
 * When LOG_LEVEL is set: outputs JSON for log aggregation (e.g. Datadog, CloudWatch).
 * When unset: uses console with simple format. Zero impact on existing behavior.
 */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
const currentLevel = LEVELS[(process.env.LOG_LEVEL?.toLowerCase() || 'info') as keyof typeof LEVELS] ?? 1;
const useStructured = !!process.env.LOG_LEVEL;

function log(level: keyof typeof LEVELS, msg: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < currentLevel) return;
  const entry = { level, msg, ...meta, timestamp: new Date().toISOString() };
  if (useStructured) {
    const out = JSON.stringify(entry);
    if (level === 'error') process.stderr.write(out + '\n');
    else process.stdout.write(out + '\n');
  } else {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level}] ${msg}`, meta ?? '');
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
