const MENTION_TOKEN = /@([a-zA-Z0-9_]{2,30})\b/g;

/** Active @mention query at cursor (min 2 chars), or null. */
const MENTION_BEFORE_CURSOR = /@([a-zA-Z0-9_]*)$/;

/** Unique @usernames in comment body (for profile resolve). */
export function extractMentionsFromBody(body: string, max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const raw = match[1];
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
    if (out.length >= max) break;
  }
  return out;
}

export function getActiveMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(MENTION_BEFORE_CURSOR);
  if (!match) return null;
  const query = match[1];
  if (query.length < 2) return null;
  return query;
}

export function insertMentionAtCursor(
  text: string,
  cursor: number,
  username: string,
): { nextText: string; nextCursor: number } {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  const match = before.match(MENTION_BEFORE_CURSOR);
  if (!match) {
    return { nextText: text, nextCursor: cursor };
  }
  const start = before.length - match[0].length;
  const prefix = text.slice(0, start);
  const mention = `@${username} `;
  const nextText = prefix + mention + after;
  return { nextText, nextCursor: prefix.length + mention.length };
}
