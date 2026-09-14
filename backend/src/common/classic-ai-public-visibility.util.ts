/**
 * Classic 1-fixture AI tipsters (tipsterType=ai). Public by default.
 * Acca Desk (tipsterType=acca_desk) is unaffected.
 *
 * Toggle: HIDE_CLASSIC_AI_TIPSTERS_FROM_PUBLIC=true to hide browse / leaderboard / marketplace.
 */
export const CLASSIC_AI_TIPSTER_TYPE = 'ai';

export function isClassicAiHiddenFromPublic(): boolean {
  const raw = (process.env.HIDE_CLASSIC_AI_TIPSTERS_FROM_PUBLIC ?? 'false').toLowerCase().trim();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function isClassicAiTipsterRow(row: {
  isAi?: boolean | null;
  tipsterType?: string | null;
}): boolean {
  if (!row.isAi) return false;
  const type = (row.tipsterType || CLASSIC_AI_TIPSTER_TYPE).toLowerCase().trim();
  return type === CLASSIC_AI_TIPSTER_TYPE;
}

/** Linked user ids for classic 1-fixture AI only (excludes Acca Desk and VIP). */
export function classicAiOwnerUserIds(
  rows: Array<{ isAi?: boolean | null; tipsterType?: string | null; userId?: number | null }>,
): number[] {
  const ids: number[] = [];
  for (const row of rows) {
    if (!isClassicAiTipsterRow(row) || row.userId == null) continue;
    const id = Number(row.userId);
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return ids;
}

/**
 * TypeORM QB fragment on tipsters alias.
 * Uses snake_case DB columns so nested SQL functions stay valid under SnakeNamingStrategy.
 * Keeps humans and non-classic AI (e.g. Acca Desk); hides classic 1-fixture AI.
 */
export function classicAiPublicExcludeSql(tipsterAlias = 't'): string {
  return `(${tipsterAlias}.is_ai = false OR COALESCE(NULLIF(TRIM(${tipsterAlias}.tipster_type), ''), 'ai') <> :classicAiTipsterType)`;
}

/**
 * Raw SQL fragment on tipsters table (snake_case columns).
 * Safe for static embedding — tipster type value is a fixed constant, not user input.
 */
export function classicAiPublicExcludeRawSql(tipsterAlias = 't'): string {
  return `(${tipsterAlias}.is_ai = false OR COALESCE(NULLIF(TRIM(${tipsterAlias}.tipster_type), ''), 'ai') <> '${CLASSIC_AI_TIPSTER_TYPE}')`;
}

/**
 * Exclude marketplace tickets owned by classic 1-fixture AI tipsters.
 * `ticketAlias.user_id` must be the ticket owner column in raw/QB SQL.
 */
export function classicAiMarketplaceTicketExcludeRawSql(ticketAlias = 't'): string {
  return `NOT EXISTS (
    SELECT 1 FROM tipsters classic_ai_tip
    WHERE classic_ai_tip.user_id = ${ticketAlias}.user_id
      AND classic_ai_tip.is_ai = true
      AND COALESCE(NULLIF(TRIM(classic_ai_tip.tipster_type), ''), 'ai') = '${CLASSIC_AI_TIPSTER_TYPE}'
  )`;
}
