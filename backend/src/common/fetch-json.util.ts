/**
 * Safely parse JSON from a fetch Response.
 * When the API returns non-JSON (e.g. proxy/nginx error "upstream connection..."),
 * res.json() throws an opaque SyntaxError. This helper reads text first, attempts
 * parse, and throws a clear error including status and snippet for debugging.
 */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return parsed as T;
  } catch (e) {
    const snippet = text.slice(0, 100).replace(/\s+/g, ' ');
    const hint = text.includes('upstream')
      ? 'API returned a proxy/upstream error instead of JSON. Try again later or check API-Football status.'
      : `Response is not valid JSON. Status: ${res.status}. Body snippet: "${snippet}..."`;
    throw new Error(hint);
  }
}
