-- Multi-sport news articles and sport-specific tipster guides
-- Run: psql ... -f database/seeds/multisport-content-seed.sql

-- =============================================================================
-- NEWS — one featured story per sport (plus extras for basketball & MMA)
-- =============================================================================
INSERT INTO news_articles (slug, language, title, excerpt, content, category, sport, featured, meta_description, published_at)
VALUES
  (
    'nba-playoff-race-2026',
    'en',
    'NBA playoff race: Western Conference battle goes down to the wire',
    'With weeks left in the regular season, Denver, Oklahoma City, and Minnesota are separated by just a few games in the West.',
    'The NBA Western Conference playoff picture remains wide open heading into the final stretch. Defending champions Denver have shown championship pedigree, while Oklahoma City''s young core continues to exceed expectations. In the East, Boston and Milwaukee remain the teams to beat, but Miami and New York are pushing hard for home-court advantage. Injury reports and back-to-back schedules will be decisive — key for anyone following tipster picks on basketball markets.',
    'news',
    'basketball',
    true,
    'NBA playoff race analysis and conference standings',
    NOW() - INTERVAL '3 days'
  ),
  (
    'nba-trade-deadline-rumours-2026',
    'en',
    'NBA trade deadline: Which stars could still move before the buzzer?',
    'Front offices are working the phones as contenders look for one more piece and sellers eye draft capital.',
    'The NBA trade deadline always reshapes the playoff map. Contenders in both conferences are hunting a defensive wing or a backup big; lottery teams are shopping veterans for picks. Watch for buyout candidates joining playoff teams after the deadline — those roster moves often shift closing lines on totals and spreads within hours.',
    'transfer_rumour',
    'basketball',
    false,
    'NBA trade deadline rumours and market impact',
    NOW() - INTERVAL '1 day'
  ),
  (
    'six-nations-2026-round-four-preview',
    'en',
    'Six Nations Round 4: Ireland vs France headlines a pivotal weekend',
    'The championship is still alive for three nations with two rounds to play — form, injuries, and home advantage all matter.',
    'Round four of the Six Nations promises high stakes. Ireland''s pack depth will be tested against a French side that has found rhythm in attack. England and Scotland remain in the hunt, making every point difference critical on the table. Weather in Dublin and Paris could favour forward-heavy game plans — relevant for handicap and totals markets on rugby picks.',
    'news',
    'rugby',
    true,
    'Six Nations rugby preview and betting angles',
    NOW() - INTERVAL '4 days'
  ),
  (
    'springboks-injury-update-2026',
    'en',
    'Springboks injury update: Key forwards race to fitness before test window',
    'South Africa''s medical team is managing a short turnaround before the incoming tour series.',
    'The Springboks are monitoring several front-row and loose-forward knocks ahead of the test window. Selection stability often drives handicap markets — if a first-choice scrum halves pairing is ruled out, line moves can be sharp. Follow confirmed team sheets before acting on any rugby accumulator that includes South African fixtures.',
    'injury',
    'rugby',
    false,
    'Springboks injury news for rugby bettors',
    NOW() - INTERVAL '2 days'
  ),
  (
    'ufc-302-card-breakdown',
    'en',
    'UFC 302: Full card breakdown and stylistic matchups to watch',
    'From grappler vs striker dynamics to cardio in five-round main events — how the card stacks up.',
    'The UFC 302 card features a main event where wrestling pressure meets elite striking defence. On the undercard, two bantamweights with high finish rates collide — historically a spot where the Over on significant strikes outperforms. For MMA markets, weigh reach, stance, and recent layoffs alongside raw records before backing a tipster pick.',
    'news',
    'mma',
    true,
    'UFC card analysis for MMA markets',
    NOW() - INTERVAL '5 days'
  ),
  (
    'champion-double-champion-rumours',
    'en',
    'Double-champion talk: Lightweight title unification still on the table',
    'Promoters are hinting at a summer super-fight if both champions defend successfully in March.',
    'A potential lightweight unification bout would be one of the biggest MMA events of the year. Both camps have publicly expressed interest; the hold-up is timing around international broadcast windows. When super-fights are announced, early lines often offer value before public money steams the favourite — worth tracking for marketplace picks.',
    'gossip',
    'mma',
    false,
    'MMA title unification rumours',
    NOW() - INTERVAL '1 day'
  ),
  (
    'fivb-nations-league-week-one',
    'en',
    'Volleyball Nations League: Pool standings after an explosive opening week',
    'Upsets in both men''s and women''s pools have already shifted outright market prices.',
    'The Volleyball Nations League opened with several ranked teams dropping sets to motivated opponents. Brazil and Poland remain favourites in the men''s draw, while Italy''s women look sharp in early pool play. Set-handicap markets are volatile early in tournaments — tipsters with strong volleyball ROI often focus on match totals once rotation patterns emerge.',
    'news',
    'volleyball',
    true,
    'Volleyball Nations League standings and analysis',
    NOW() - INTERVAL '3 days'
  ),
  (
    'nhl-playoff-picture-march-2026',
    'en',
    'NHL playoff picture: Wild card races in both conferences heat up',
    'Ten points separate six teams fighting for the final spots — every game is essentially a play-in.',
    'The NHL stretch run is here. In the West, Vancouver and Nashville are trending up while a former division leader has lost five of seven. In the East, the wild card is a three-team sprint with brutal remaining schedules. Goalie confirmations move puck lines more than almost any other sport — check starters before buying hockey picks.',
    'news',
    'hockey',
    true,
    'NHL playoff race and betting notes',
    NOW() - INTERVAL '2 days'
  ),
  (
    'nfl-free-agency-2026-winners',
    'en',
    'NFL free agency: Winners, losers, and early Super Bowl line moves',
    'A franchise QB changing teams has already shifted futures markets by a full point.',
    'NFL free agency reset the board for several contenders. The biggest splash moved a Pro Bowl quarterback to an NFC favourite, shortening their Super Bowl odds overnight. AFC powers responded with defensive additions rather than headline signings. For American football picks, monitor OTA reports and depth charts — summer lines rarely match September reality.',
    'confirmed_transfer',
    'american_football',
    true,
    'NFL free agency impact on futures and spreads',
    NOW() - INTERVAL '6 days'
  ),
  (
    'wimbledon-2026-early-favourites',
    'en',
    'Wimbledon 2026: Early favourites on grass as the draw approaches',
    'Serve-and-volley specialists and big servers lead the discourse before qualifying ends.',
    'Grass season shifts the ATP and WTA hierarchy. A former champion returns from injury with limited warm-up matches; the market is split on whether match sharpness or rust matters more. On grass, tie-break frequency rises — set betting and game handicaps behave differently than on clay. Tennis tipsters with strong ROI on grass often publish picks only after first-round ball-speed data.',
    'news',
    'tennis',
    true,
    'Wimbledon favourites and grass-court betting guide',
    NOW() - INTERVAL '4 days'
  ),
  (
    'multi-sport-accumulator-platform-guide',
    'en',
    'How multi-sport picks work on BetRollover',
    'Combine football, basketball, tennis, and more in one escrow-protected pick — same refund rules apply.',
    'BetRollover tipsters can publish accumulators that mix sports in a single pick. Each leg settles independently using official data sources for that sport. The pick wins only if every non-void leg wins; if it loses, buyers receive an automatic wallet refund of the pick price. When evaluating multi-sport coupons, check the tipster''s settled record for each sport tag on the card — not just their overall ROI.',
    'news',
    'football',
    false,
    'Multi-sport accumulator picks explained on BetRollover',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (slug, language) DO NOTHING;

-- =============================================================================
-- RESOURCE GUIDES — sport-specific (category_id 1=beginner, 2=intermediate)
-- sport NULL on existing rows = universal; new rows tagged per sport
-- =============================================================================
INSERT INTO resource_items (category_id, slug, language, title, excerpt, content, type, sport, duration_minutes, featured, sort_order, published_at)
VALUES
  (
    1,
    'basketball-reading-nba-lines',
    'en',
    'Reading NBA spreads and totals',
    'How point spreads, alt lines, and rest days affect basketball markets.',
    'NBA spreads account for home court, rest, and injury news. Totals move sharply when starting centres are ruled out. Compare a team''s pace over the last ten games with opponent defensive rating — not just season averages. Back-to-backs punish road teams more than the headline spread suggests. Use closing line value on totals when official injury reports drop at 5 PM ET.',
    'article',
    'basketball',
    10,
    true,
    10,
    NOW()
  ),
  (
    1,
    'rugby-handicap-basics',
    'en',
    'Rugby handicap betting explained',
    'Why +7.5 and -3.5 matter in union and how weather shifts game plans.',
    'Rugby handicaps reflect expected margin, not just win probability. Wet conditions favour tight games and unders on totals points. Watch squad rotation before Six Nations and Rugby Championship rounds — second-string packs change handicap value significantly. Live betting spikes after early yellow cards; pre-match picks should factor discipline records.',
    'article',
    'rugby',
    9,
    true,
    11,
    NOW()
  ),
  (
    1,
    'mma-styles-and-odds',
    'en',
    'MMA: Matching fighting styles to market odds',
    'Grappler vs striker, reach advantages, and cardio in five-round fights.',
    'MMA odds often overweight recent knockouts. Style matchups matter more: southpaw strikers vs orthodox wrestlers create predictable takedown attempts. Five-round main events favour cardio and volume — unders on early finishes can hold value. Weigh layoff length and weight-cut history. BetRollover tipsters must attach event IDs for settlement; verify legs are on scheduled bouts before buying.',
    'article',
    'mma',
    11,
    true,
    12,
    NOW()
  ),
  (
    1,
    'volleyball-set-markets',
    'en',
    'Volleyball set betting and totals',
    'Set handicaps, match totals, and rotation impact in international play.',
    'Volleyball markets focus on sets won and total points. Strong serving teams outperform in tie-break sets. In Nations League pool play, rotation policies rest stars — early-week lines can misprice motivation. Set +1.5 on underdogs is a common hedge when the favourite is priced short. Track tipster ROI on volleyball separately from football-led accumulators.',
    'article',
    'volleyball',
    8,
    false,
    13,
    NOW()
  ),
  (
    1,
    'nhl-goalie-starters',
    'en',
    'NHL betting: Goalie confirmations and puck lines',
    'Why confirmed starters move lines more than team form.',
    'Hockey puck lines (-1.5) demand empty-net goals or blowouts — know when to take moneyline instead. Starting goalie announcements typically arrive mid-morning; lines adjust within minutes. Back-to-back starters with high save workloads underperform closing totals. Shop alt puck lines when backing road underdogs in divisional games.',
    'article',
    'hockey',
    9,
    true,
    14,
    NOW()
  ),
  (
    1,
    'nfl-key-numbers',
    'en',
    'NFL key numbers and spread shopping',
    'Why 3 and 7 matter on football spreads and how to shop alt lines.',
    'NFL spreads cluster on key numbers 3 and 7. Moving from -2.5 to -3.5 crosses a critical margin. Teasers that cross key numbers need extra scrutiny. Divisional rematches compress totals; primetime unders have historical edges but shrink each season. Futures bets belong in a separate bankroll from weekly pick purchases on the marketplace.',
    'article',
    'american_football',
    10,
    true,
    15,
    NOW()
  ),
  (
    1,
    'tennis-surface-form',
    'en',
    'Tennis: Surface form and set markets',
    'Clay, grass, and hard court stats — and when to trust head-to-head.',
    'Tennis form is surface-specific. A clay specialist priced on grass is a common market mistake. Hold and break percentages on the current surface beat overall ranking. Head-to-head matters less after coaching changes or major injury layoffs. Live markets overreact to first-set bagels — pre-match picks should use service hold trends.',
    'article',
    'tennis',
    10,
    true,
    16,
    NOW()
  ),
  (
    2,
    'multi-sport-accumulator-strategy',
    'en',
    'Building multi-sport accumulators with discipline',
    'When mixing sports in one pick adds value — and when it only inflates odds.',
    'Multi-sport accumulators on BetRollover settle leg-by-leg across data providers. Correlation still exists: rainy weekends hit both football unders and lower-scoring rugby. Avoid stacking long-shot legs from different sports just to chase odds. Prefer one strong anchor leg plus one value leg in a different sport. Track CLV per sport; drop sports where your reads consistently lose to the close.',
    'strategy',
    NULL,
    14,
    true,
    20,
    NOW()
  )
ON CONFLICT (category_id, slug, language) DO NOTHING;
