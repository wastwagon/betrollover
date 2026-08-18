/** Crons run unless explicitly turned off. Production sets ENABLE_SCHEDULING=true. */
export function isSchedulingEnabled(): boolean {
  const raw = (process.env.ENABLE_SCHEDULING || '').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export function accraMinutesSinceMidnight(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}
