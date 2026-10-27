type JsonObject = Record<string, unknown>;

function isEventType(type: unknown): boolean {
  if (type === 'SportsEvent' || type === 'Event') return true;
  if (Array.isArray(type)) return type.some((t) => t === 'SportsEvent' || t === 'Event');
  return false;
}

function collectNodes(value: unknown, out: JsonObject[]): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out);
    return;
  }
  const obj = value as JsonObject;
  if ('@graph' in obj && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph'] as unknown[]) collectNodes(item, out);
  }
  if (isEventType(obj['@type'])) out.push(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') collectNodes(v, out);
  }
}

export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      /* ignore malformed */
    }
  }
  return blocks;
}

export function validateSportsEventJsonLdInHtml(html: string): { ok: boolean; detail?: string } {
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    return { ok: false, detail: 'No JSON-LD on page' };
  }

  const events: JsonObject[] = [];
  for (const block of blocks) collectNodes(block, events);

  const sportsEvents = events.filter((e) => {
    const t = e['@type'];
    return t === 'SportsEvent' || (Array.isArray(t) && t.includes('SportsEvent'));
  });

  if (sportsEvents.length === 0) {
    return { ok: false, detail: 'No SportsEvent in JSON-LD' };
  }

  if (sportsEvents.length > 1) {
    return { ok: false, detail: `${sportsEvents.length} SportsEvent nodes — expect 1 (nested superEvent causes GSC errors)` };
  }

  const ev = sportsEvents[0]!;
  const missing: string[] = [];

  const startDate = ev['startDate'];
  if (typeof startDate !== 'string' || !startDate.trim()) missing.push('startDate');

  const location = ev['location'];
  if (!location || typeof location !== 'object') {
    missing.push('location');
  } else {
    const loc = location as JsonObject;
    const address = loc['address'];
    if (!address || typeof address !== 'object') missing.push('location.address');
  }

  if (ev['superEvent'] && typeof ev['superEvent'] === 'object') {
    const nested = ev['superEvent'] as JsonObject;
    if (isEventType(nested['@type'])) {
      missing.push('remove nested superEvent @type SportsEvent');
    }
  }

  if (missing.length > 0) {
    return { ok: false, detail: `GSC Events invalid: ${missing.join(', ')}` };
  }

  const warns: string[] = [];
  if (!ev['endDate']) warns.push('endDate');
  if (!ev['description']) warns.push('description');
  if (!ev['image']) warns.push('image');
  if (!ev['eventStatus']) warns.push('eventStatus');
  if (!ev['organizer']) warns.push('organizer');

  if (warns.length > 0) {
    return { ok: true, detail: `Required OK; optional missing: ${warns.join(', ')}` };
  }

  return { ok: true, detail: 'SportsEvent passes GSC required + recommended fields' };
}

export function firstMatchPathInSitemapXml(xml: string): string | null {
  const m = xml.match(/<loc>\s*[^<]*\/matches\/(\d+)\s*<\/loc>/i);
  return m?.[1] ? `/matches/${m[1]}` : null;
}
