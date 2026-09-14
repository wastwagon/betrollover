export type TelegramSlipLeg = {
  matchDescription?: string | null;
  prediction?: string | null;
  odds?: number | null;
  matchDate?: string | Date | null;
  result?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
};

export function telegramKickoffLabel(raw?: string | Date | null): string {
  if (!raw) return '';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Accra',
  });
}
