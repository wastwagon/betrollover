import { chunkIds, SQL_IN_CHUNK_SIZE } from './sql-in-chunks';

describe('chunkIds', () => {
  it('drops nulls and duplicates', () => {
    expect(chunkIds([1, 1, null, 2, undefined, 2])).toEqual([[1, 2]]);
  });

  it('returns no chunks for an empty list', () => {
    expect(chunkIds([])).toEqual([]);
  });

  it('splits above the TypeORM In() bind budget', () => {
    const ids = Array.from({ length: SQL_IN_CHUNK_SIZE + 3 }, (_, i) => i + 1);
    const chunks = chunkIds(ids);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(SQL_IN_CHUNK_SIZE);
    expect(chunks[1]).toEqual([SQL_IN_CHUNK_SIZE + 1, SQL_IN_CHUNK_SIZE + 2, SQL_IN_CHUNK_SIZE + 3]);
  });

  it('explains the production bind overflow (65992 fixture ids + result param)', () => {
    // 65992 + 1 = 65993 binds; uint16 wrap is 65993 % 65536 = 457
    expect((65992 + 1) % 65536).toBe(457);
    expect((65992 + 3) % 65536).toBe(459);
  });
});
