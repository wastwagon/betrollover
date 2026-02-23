/**
 * Content filtering for chat messages.
 * Blocks external links, contact details, spam patterns, and profanity.
 */

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /https?:\/\/(?!betrollover\.com)/i,          reason: 'External links are not allowed' },
  { pattern: /www\.[a-z0-9-]+\.[a-z]{2,}/i,              reason: 'External links are not allowed' },
  { pattern: /\+?\d[\d\s\-().]{7,}\d/,                   reason: 'Phone numbers are not allowed' },
  { pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,  reason: 'Email addresses are not allowed' },
  {
    pattern: /(t\.me|wa\.me|whatsapp|telegram|snapchat|instagram\.com|discord\.gg)\b/i,
    reason: 'Off-platform contact references are not allowed',
  },
  {
    pattern: /\b(dm\s?me|message\s?me|contact\s?me|text\s?me|reach\s?me|chat\s?me|inbox\s?me)\b/i,
    reason: 'Soliciting off-platform contact is not allowed',
  },
  {
    pattern: /\b(0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,}|[13][a-km-zA-HJ-NP-Z1-9]{25,})\b/,
    reason: 'Crypto addresses are not allowed',
  },
  { pattern: /(.)\1{9,}/,                                 reason: 'Repeated characters detected' },
];

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🔥'];

export function filterMessageContent(text: string): { blocked: boolean; reason?: string } {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length < 1) {
    return { blocked: true, reason: 'Message cannot be empty' };
  }
  if (trimmed.length > 500) {
    return { blocked: true, reason: 'Message exceeds 500 characters' };
  }

  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason };
    }
  }

  // Block excessive caps (>70% uppercase for messages longer than 20 chars)
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 20) {
    const upper = (letters.match(/[A-Z]/g) || []).length;
    if (upper / letters.length > 0.7) {
      return { blocked: true, reason: 'Excessive use of capital letters' };
    }
  }

  return { blocked: false };
}

export function isAllowedReaction(emoji: string): boolean {
  return ALLOWED_EMOJIS.includes(emoji);
}
