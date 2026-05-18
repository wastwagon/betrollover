/** Extract @username tokens from comment body (max 5 unique, case-insensitive dedupe). */
const MENTION_PATTERN = /@([a-zA-Z0-9_]{2,30})\b/g;

export function extractMentionUsernames(body: string, max = 5): string[] {
  const seen = new Set<string>();
  const usernames: string[] = [];
  const matches = body.matchAll(MENTION_PATTERN);
  for (const match of matches) {
    const raw = match[1];
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    usernames.push(raw);
    if (usernames.length >= max) break;
  }
  return usernames;
}
