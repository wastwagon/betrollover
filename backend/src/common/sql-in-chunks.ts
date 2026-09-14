/**
 * PostgreSQL Bind messages encode the parameter count as uint16 (max 65535).
 * TypeORM `In(ids)` creates one bind per id; going over that limit surfaces as
 * `bind message has N parameter formats but 0 parameters` (N = overflowed count).
 */
export const SQL_IN_CHUNK_SIZE = 5000;

export function chunkIds(
  ids: Iterable<number | null | undefined>,
  size: number = SQL_IN_CHUNK_SIZE,
): number[][] {
  const unique: number[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  if (unique.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += size) {
    chunks.push(unique.slice(i, i + size));
  }
  return chunks;
}
