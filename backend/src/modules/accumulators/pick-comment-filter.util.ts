import { filterMessageContent } from '../chat/chat-filter.util';

/** Extra patterns to reduce paywall bypass via comments (booking codes, leg spoilers). */
const PICK_COMMENT_EXTRA: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bbooking\s*code\b/i, reason: 'Booking codes cannot be shared in comments' },
  { pattern: /\b(btts|over\s*2\.5|under\s*2\.5|1x2|double\s*chance)\b.*@\s*\d/i, reason: 'Pick selections cannot be shared in comments' },
  { pattern: /@\s*\d+\.?\d*\s*odds/i, reason: 'Odds tips cannot be shared in comments' },
  { pattern: /\b[A-Z0-9]{6,12}\b.*\b(code|slip)\b/i, reason: 'Codes cannot be shared in comments' },
];

export function filterPickCommentContent(text: string): { blocked: boolean; reason?: string } {
  const base = filterMessageContent(text);
  if (base.blocked) return base;
  const trimmed = text.trim();
  for (const { pattern, reason } of PICK_COMMENT_EXTRA) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false };
}
