-- Multi-sport content phase 2 — fills thin sports + football-tagged guides
-- Run after multisport-content-seed.sql

-- =============================================================================
-- NEWS — second stories for thin sports + football marketplace piece
-- =============================================================================
INSERT INTO news_articles (slug, language, title, excerpt, content, category, sport, featured, meta_description, published_at)
VALUES
  (
    'football-injury-crisis-premier-league-march-2026',
    'en',
    'Premier League injury crisis: How team news moves closing lines',
    'Five title contenders enter the international break with key absences — spreads and totals are already adjusting.',
    'Injury lists across the Premier League are reshaping weekend markets. Clubs chasing the title and European places have reported knocks to centre-backs and midfield engines; books have shortened unders on several fixtures. For BetRollover football picks, wait for confirmed lineups — accumulator legs void only on official postponements, not late scratches that still kick off.',
    'injury',
    'football',
    false,
    'Premier League injury news and line movement for bettors',
    NOW() - INTERVAL '2 days'
  ),
  (
    'volleyball-olympic-qualifiers-europe-2026',
    'en',
    'Olympic volleyball qualifiers: European pools tighten after upsets',
    'Poland and Italy dropped sets in Sofia; outright prices on Olympic berths have lengthened for two favourites.',
    'European Olympic qualifying for volleyball produced several straight-set surprises. Serving pressure and reception errors decided tight fourth sets; coaches rotated liberos earlier than expected. Match totals and set handicaps are sensitive to rotation in must-win fixtures — track confirmed starters before backing volleyball marketplace picks.',
    'news',
    'volleyball',
    false,
    'Volleyball Olympic qualifier results and betting notes',
    NOW() - INTERVAL '2 days'
  ),
  (
    'nhl-goalie-injury-wave-march-2026',
    'en',
    'NHL goalie injury wave: Starters ruled out as playoff race intensifies',
    'Three probable starters are day-to-day; puck lines moved within an hour of morning skates.',
    'The NHL stretch run coincides with a cluster of lower-body injuries to starting goaltenders. Teams on back-to-backs are leaning on AHL call-ups, pushing totals higher in several markets. Confirmed starter tweets remain the highest-signal event for hockey picks — lines often close 15–30 points from the open once netminders are official.',
    'injury',
    'hockey',
    false,
    'NHL goalie injury updates for hockey betting',
    NOW() - INTERVAL '1 day'
  ),
  (
    'nfl-draft-rumours-qb-class-2026',
    'en',
    'NFL draft rumours: Quarterback class reshuffles early mock boards',
    'A pro-day performance has vaulted one prospect into top-five chatter; futures on win totals are reacting.',
    'NFL draft season is moving futures and season-win markets. A standout combine and pro day shifted which teams are linked to quarterbacks at the top of the board. Offseason lines on division winners often overreact to mock-draft noise — separate roster-building news from click-driven rumours before buying american football picks on the marketplace.',
    'gossip',
    'american_football',
    false,
    'NFL draft rumours and futures market impact',
    NOW() - INTERVAL '3 days'
  ),
  (
    'indian-wells-2026-draw-shockers',
    'en',
    'Indian Wells 2026: Early draw shockers shake outright prices',
    'Two top-eight seeds exited before the quarter-finals on slow hard courts in the desert.',
    'The ATP and WTA draws at Indian Wells produced early upsets on gritty hard courts. Wind gusts lengthened rallies and boosted break rates versus season averages on faster surfaces. Tennis outrights have repriced; for match betting, weigh second-serve points won on hard court over generic ranking — especially when tipsters publish pre-quarter-final picks.',
    'news',
    'tennis',
    false,
    'Indian Wells tennis results and hard-court betting angles',
    NOW() - INTERVAL '2 days'
  ),
  (
    'basketball-injury-report-late-scratches-nba',
    'en',
    'NBA late scratches: Why 6 PM ET injury reports move your pick',
    'Starters listed questionable are dominating line movement on spreads and alt totals.',
    'NBA injury reports at 6 PM ET remain the clearest catalyst for closing-line value. Teams resting back-to-back veterans trigger 2–4 point swings on spreads and meaningful moves on team totals. If you bought a basketball pick earlier in the day, compare the published leg against the final injury report — void rules apply to postponements, not healthy scratches.',
    'injury',
    'basketball',
    false,
    'NBA injury report timing and betting impact',
    NOW() - INTERVAL '1 day'
  ),
  (
    'mma-main-event-medical-clearance-2026',
    'en',
    'UFC medical updates: Weigh-in clearance reshapes fight-night totals',
    'A co-main event fighter passed late medicals; the over on significant strikes shortened overnight.',
    'Fight week medical clearance remains the last major information drop before MMA markets close. Cardio-heavy matchups see totals compress when a replacement steps in on short notice. For marketplace picks, compare published legs against final weigh-in results — late opponent swaps can change style matchups entirely.',
    'injury',
    'mma',
    false,
    'UFC medical clearance and MMA betting line moves',
    NOW() - INTERVAL '2 days'
  ),
  (
    'rugby-coaching-change-six-nations-fallout',
    'en',
    'Six Nations coaching shake-up: Selection leaks move handicap markets',
    'A surprise assistant coach exit has the squad in flux before the final round.',
    'Rugby selection leaks ahead of championship deciders routinely move handicap lines by 3–5 points. When coaching staff changes coincide with injury returns, books struggle to price pack dominance correctly. Track confirmed matchday 23s before backing rugby accumulators — weather and referee tendencies amplify late team-news swings.',
    'gossip',
    'rugby',
    false,
    'Six Nations team news and rugby handicap movement',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT (slug, language) DO NOTHING;

-- =============================================================================
-- RESOURCE GUIDES — football-tagged + intermediate depth + volleyball featured fix
-- =============================================================================
INSERT INTO resource_items (category_id, slug, language, title, excerpt, content, type, sport, duration_minutes, featured, sort_order, published_at)
VALUES
  (
    1,
    'football-1x2-and-goal-markets',
    'en',
    'Football: 1X2, BTTS, and goal markets explained',
    'Match result, both teams to score, and over/under — when each market fits a football pick.',
    '1X2 is the baseline: home, draw, away. BTTS rewards open games; combine with league pace and defensive injuries. Over/under goals need tempo, weather, and motivation — derby unders are a cliché but still show up in closing data. On BetRollover, football legs settle on official full-time scores including stoppage time. Tag your own picks by competition so buyers can judge your ROI on Premier League vs domestic cups separately.',
    'article',
    'football',
    11,
    true,
    5,
    NOW()
  ),
  (
    2,
    'basketball-live-betting-pitfalls',
    'en',
    'NBA live betting: Pace runs and when to avoid chasing',
    'Second-half totals and live spreads punish late entry without a pre-game thesis.',
    'Live NBA markets overreact to 10–0 runs. If your pre-game read was pace-and-efficiency based, a slow first quarter can offer better totals — not worse. Foul-trouble stars inflate live spreads temporarily. For marketplace picks, prefer pre-game coupons unless your tipster publishes a documented live strategy; escrow settlement still keys off final scores, not quarter-by-quarter cash-outs.',
    'strategy',
    'basketball',
    13,
    false,
    21,
    NOW()
  ),
  (
    2,
    'football-accumulator-leg-selection',
    'en',
    'Football accumulators: Picking legs that do not correlate',
    'Avoid stacking the same match narrative across multiple legs in one coupon.',
    'Correlated football acca legs (e.g. favourite to win + over 2.5 in the same match) inflate risk without proportional edge. Prefer independent fixtures: different kick-off times, leagues, or game scripts. On BetRollover, one losing leg loses the whole pick and triggers buyer refund — treat each leg as if it were a single with full stake risk.',
    'strategy',
    'football',
    12,
    true,
    22,
    NOW()
  ),
  (
    2,
    'tennis-in-play-momentum-traps',
    'en',
    'Tennis live markets: Momentum traps after first-set breaks',
    'Live prices often overcorrect when a favourite drops an early set on hard court.',
    'Live tennis odds swing hard after a break in set one. Markets assume momentum persists; on medium-paced hard courts, hold percentages regress toward season norms. Use pre-match service hold trends before buying live-influenced picks. For accumulators, avoid mixing clay specialists on grass legs — sport tags help buyers filter tipsters with surface-specific ROI.',
    'strategy',
    'tennis',
    11,
    false,
    23,
    NOW()
  ),
  (
    3,
    'rugby-live-handicap-advanced',
    'en',
    'Rugby live handicaps: Card cascades and bench impact',
    'Yellow cards and front-row substitutions move live handicaps more than pre-match models capture.',
    'Rugby live handicaps react sharply to yellow cards and scrum penalties inside the 22. Bench props change scrum odds in the last quarter — markets are slow when a tighthead is replaced. Advanced bettors map referee tendencies and bench depth before kick-off. Settlement uses official full-time including extra time only where competition rules specify — check competition format on each leg.',
    'strategy',
    'rugby',
    16,
    false,
    30,
    NOW()
  ),
  (
    2,
    'hockey-totals-and-special-teams',
    'en',
    'NHL totals: Power-play pace and back-to-back fatigue',
    'Special teams efficiency and schedule spots drive over/under more than raw goal averages.',
    'NHL totals hinge on power-play conversion and penalty kill workload. Back-to-back road games with a backup goalie often inflate overs early, then snap back once starter confirmation hits. Track confirmed netminders and last-change matchups before buying hockey marketplace picks.',
    'strategy',
    'hockey',
    12,
    false,
    24,
    NOW()
  ),
  (
    2,
    'volleyball-set-handicap-strategy',
    'en',
    'Volleyball set handicaps: Rotation depth and serving runs',
    'Set spreads punish teams with thin benches when liberos struggle in reception.',
    'Volleyball set handicaps move when a starting opposite is rested or a libero is swapped mid-match. Serving runs cluster — markets sometimes overreact after one dominant set. Compare reception efficiency trends before backing -1.5 set lines in must-win Olympic or Nations League fixtures.',
    'strategy',
    'volleyball',
    10,
    false,
    25,
    NOW()
  ),
  (
    2,
    'nfl-divisional-race-markets',
    'en',
    'NFL divisional races: When win-total moves are actionable',
    'Offseason division odds often misprice quarterback continuity and schedule strength.',
    'NFL division winner markets react to free agency and draft capital. Win-total steam moves in May rarely account for strength-of-schedule revisions in August. Separate roster quality from narrative-driven line moves before backing american football season-long picks on the marketplace.',
    'strategy',
    'american_football',
    11,
    false,
    26,
    NOW()
  ),
  (
    2,
    'mma-method-of-victory-edges',
    'en',
    'MMA method markets: Stylistic mismatches vs public bias',
    'Decision overs crowd out value on KO props when grapplers face strikers with cardio questions.',
    'MMA method-of-victory markets overweight highlight-reel knockouts. Wrestlers with high control time often land decision overs at better prices than KO/TKO hype suggests. Check reach, stance, and cardio profiles before buying method legs inside marketplace accumulators.',
    'strategy',
    'mma',
    12,
    false,
    27,
    NOW()
  )
ON CONFLICT (category_id, slug, language) DO NOTHING;

UPDATE resource_items
SET featured = true
WHERE slug = 'volleyball-set-markets'
  AND language = 'en'
  AND category_id = 1;
