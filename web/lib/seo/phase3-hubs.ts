import type { SeoHubFaq, SeoHubSection } from '@/components/seo/SeoHubLayout';

export type Phase3HubKey =
  | 'ghana-premier-league-predictions'
  | 'football-predictions-today'
  | 'btts-predictions'
  | 'over-2-5-goals-predictions';

export type Phase3HubContent = {
  path: `/${Phase3HubKey}`;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  label: string;
  title: string;
  tagline: string;
  intro: string[];
  sections: SeoHubSection[];
  faqs: SeoHubFaq[];
  ctaPrimary: { href: string; label: string };
  ctaSecondary: { href: string; label: string };
  disclaimer: string;
  liveHeading: string;
  liveEmpty: string;
  liveMoreHref: string;
  liveMoreLabel: string;
  /** Optional marketplace / archive filter hint for live block fetch */
  liveQuery?: 'today' | 'btts' | 'over25' | 'ghana' | 'settled';
};

const DISCLAIMER =
  'BetRollover sells football predictions and tipster subscriptions. We are not a bookmaker. Tips are informational and not a promise of profit. 18+ only. Use responsibly.';

export const PHASE3_HUBS: Record<Phase3HubKey, Phase3HubContent> = {


  'ghana-premier-league-predictions': {
    path: '/ghana-premier-league-predictions',
    metaTitle: 'Ghana Premier League Predictions & Tips | BetRollover',
    metaDescription:
      'Ghana Premier League football predictions from tipsters with public records. Purchase-protected picks and wallet payments where enabled. BetRollover — Ghana-based, not a bookmaker. 18+.',
    keywords: [
      'ghana premier league predictions',
      'GPL tips',
      'ghana football tipsters',
      'premier league ghana predictions',
    ],
    label: 'Ghana football',
    title: 'Ghana Premier League predictions',
    tagline:
      'Follow GPL fixtures through tipster picks with public settled records — built for Ghana users who want predictions, not a bookmaker account on BetRollover.',
    intro: [
      'The Ghana Premier League sits at the centre of local football conversation: weekend kickoffs, title races, relegation fights, and cup overlaps. Fans looking for GPL predictions often land on Telegram forwards with no settled history. BetRollover gives tipsters a place to publish Ghana Premier League tips alongside other leagues, with win rate and profit per GHS 100 bet calculated from official tip settlement — not screenshots.',
      'We are based in Ghana. Wallets support GHS and the deposit methods described in-product, including Mobile Money where enabled, so you can buy tips without converting everything through a foreign card processor. Buying a tip is not placing a bet. If you later use SportyBet or another bookmaker, that stake stays outside our purchase-protection wallet refund.',
      'This page is your GPL hub: how tipsters cover domestic matches, how to read standings snippets on match pages, and where today’s broader football predictions sit when the international calendar is louder than the local one.',
    ],
    sections: [
      {
        heading: 'What a GPL prediction looks like here',
        paragraphs: [
          'A tipster lists selections — match result, double chance (two of three results win), goals lines, both teams to score, or accumulators that include GPL legs. Free picks build a public trail. Paid picks show a price and purchase protection. After full time, the platform marks won, lost, or cancelled from results feeds. Picks waiting for a result do not inflate profit per GHS 100 bet.',
          'Match pages for GPL fixtures show teams, league name, kickoff, and standings snippets when we have table data. Related public predictions for that fixture appear below the scoreboard so you can compare tipsters on the same game.',
        ],
        links: [
          { href: '/marketplace?sport=football', label: 'Football marketplace' },
          { href: '/live-scores', label: 'Live scores' },
          { href: '/league-tables', label: 'League tables' },
        ],
      },
      {
        heading: 'Local payments',
        paragraphs: [
          'Ghana users can deposit with the wallet methods shown when they are live. That pays for predictions on BetRollover. It is not a bet. Withdrawals of tipster earnings and wallet balances follow the rules on the wallet and support pages.',
          'Francophone and Nigerian visitors follow the same tip pages. GPL content remains useful whenever tipsters publish Accra, Kumasi, or Cape Coast kickoffs with transparent stats.',
        ],
        links: [
          { href: '/football-tips-ghana', label: 'Football predictions in Ghana' },
          { href: '/about', label: 'About / company' },
        ],
      },
      {
        heading: 'How tipsters are checked',
        paragraphs: [
          'Anyone can start with free picks. Charging for marketplace tips requires minimum result-confirmed profit per GHS 100 bet and win rate set by the platform. Leaderboard ranking mixes recent form with that profit figure — a high-profit tipster with thin form can sit below a steadier profile. Read the ranking guide before assuming position equals “best tip.”',
          'Verified badges mean account checks. Platform-run accounts are labelled AI tipster. Neither label means Ghana Premier League picks will win. Domestic leagues can be hard to predict — size any external stake carefully.',
        ],
        links: [
          { href: '/guides/leaderboard-ranking', label: 'Leaderboard ranking' },
          { href: '/guides/read-tipster-stats', label: 'Read tipster stats' },
          { href: '/tipsters', label: 'Tipsters' },
        ],
      },
      {
        heading: 'More prediction angles',
        paragraphs: [
          'When you care about today’s full card, both teams to score, or over 2.5 goals — including GPL legs inside accumulators — use the market hubs. Settled archive links let you audit weekend tips after the fact.',
        ],
        links: [
          { href: '/football-predictions-today', label: 'Predictions today' },
          { href: '/btts-predictions', label: 'Both teams to score' },
          { href: '/over-2-5-goals-predictions', label: 'Over 2.5 goals' },
          { href: '/coupons/archive', label: 'Settled archive' },
        ],
      },
    ],
    faqs: [
      {
        question: 'Do you only cover the Ghana Premier League?',
        answer:
          'No. Tipsters publish many leagues. This hub focuses on GPL, while the marketplace lists football tips across competitions.',
      },
      {
        question: 'Can I pay for GPL tips with Mobile Money?',
        answer:
          'Where Mobile Money deposits are enabled for your wallet, yes — you are paying for predictions on BetRollover, not placing a GPL bet with us.',
      },
      {
        question: 'Are GPL tips guaranteed?',
        answer:
          'No. We do not sell sure wins or fixed matches. Check each tipster’s settled record.',
      },
      {
        question: 'Where do results appear after the match?',
        answer:
          'On the pick page, tipster profile, track-record views, and the settled archive once the result is confirmed.',
      },
    ],
    ctaPrimary: { href: '/marketplace?sport=football', label: 'Browse football tips' },
    ctaSecondary: { href: '/football-tips-ghana', label: 'Football predictions in Ghana' },
    disclaimer: DISCLAIMER,
    liveHeading: 'Recent settled football picks',
    liveEmpty: 'No settled picks to show yet.',
    liveMoreHref: '/coupons/archive',
    liveMoreLabel: 'Full settled archive',
    liveQuery: 'settled',
  },

  'football-predictions-today': {
    path: '/football-predictions-today',
    metaTitle: 'Football Predictions Today | Tipster Marketplace | BetRollover',
    metaDescription:
      'Football predictions today from tipsters with public win rate and ROI. Free and purchase-protected picks, match pages. Ghana-based marketplace. 18+.',
    keywords: [
      'football predictions today',
      'football tips today',
      'today football predictions',
      'tipster picks today',
    ],
    label: 'Today',
    title: 'Football predictions today',
    tagline:
      'See today’s football tips from tipsters who publish on BetRollover — with kickoff context, public stats, and purchase protection on paid marketplace picks.',
    intro: [
      '“Predictions today” should mean more than a long list of logos. On BetRollover, today’s football tips are tied to tipster accounts, prices, and refund rules you can read before kickoff. Browse the marketplace, open match pages for teams and league standings snippets, and compare settled history when two tipsters disagree on the same fixture.',
      'Coverage spans major European leagues, African competitions including the Ghana Premier League, and cups that fall on midweek cards. AI tipsters and human tipsters are labelled differently. We never market sure odds. If a tipster’s copy sounds like a guarantee, treat that as a red flag against our rules.',
      'Use this hub as the daily entry point: how “today” filters work, how free reveals differ from paid unlocks, and which sibling pages cover both teams to score and over 2.5 goals when you are shopping by market.',
    ],
    sections: [
      {
        heading: 'Finding today’s picks',
        paragraphs: [
          'Start on the marketplace and use the day filter for today when you want kickoffs on the current calendar date. Home and live-scores surfaces also highlight matches with related picks. Each public match page lists predictions linked to that fixture so you are not hunting only by tipster name.',
          'VIP plans deliver a stream of VIP picks over a paid period rather than a single tip. Marketplace singles and accumulators remain purchase-protected per pick. Read the buy page for plan length, price in GHS, and the VIP refund rule.',
        ],
        links: [
          { href: '/marketplace', label: 'Marketplace' },
          { href: '/live-scores', label: 'Live scores' },
          { href: '/buy-football-tips', label: 'VIP plans' },
        ],
      },
      {
        heading: 'Reading a tip before kickoff',
        paragraphs: [
          'Check total odds, number of legs, tipster profit per GHS 100 bet and win rate, and whether the pick is free or paid. For paid tips, know that a loss refunds the tip price to your wallet under purchase protection. For free tips, there is nothing to refund — but the result still hits the public record.',
          'Match preview text uses teams, league, kickoff, and standings when available. We do not invent head-to-head stories without data. If standings are missing, rely on the tipster write-up and your own research.',
        ],
        links: [
          { href: '/guides/purchase-protection', label: 'Purchase protection' },
          { href: '/guides/read-tipster-stats', label: 'Tipster stats guide' },
          { href: '/track-record', label: 'Track record' },
        ],
      },
      
      {
        heading: 'Market-focused today lists',
        paragraphs: [
          'If you specifically want both teams to score or over 2.5 goals ideas for today’s fixtures, open those hubs. For domestic Ghana focus, use the GPL and Ghana tips pages. After full time, verify outcomes in the settled archive instead of trusting chat forwards.',
        ],
        links: [
          { href: '/btts-predictions', label: 'Both teams to score' },
          { href: '/over-2-5-goals-predictions', label: 'Over 2.5 goals' },
          { href: '/ghana-premier-league-predictions', label: 'GPL predictions' },
          { href: '/football-tips-ghana', label: 'Ghana hub' },
        ],
      },
    ],
    faqs: [
      {
        question: 'Are today’s tips free?',
        answer:
          'Some are free after sign-in; others are paid marketplace picks or VIP picks. Prices and refund rules are shown on each listing.',
      },
      {
        question: 'Do tips waiting for a result count on the leaderboard?',
        answer:
          'No. Only result-confirmed won/lost results feed win rate and profit per GHS 100 bet. Tips waiting for a result wait until the result is confirmed.',
      },
      {
        question: 'Can I see tips for tomorrow as well?',
        answer:
          'Yes. Marketplace day filters include tomorrow. This page focuses on the today intent while linking the full marketplace.',
      },
      {
        question: 'Is BetRollover a betting site for today’s matches?',
        answer:
          'No. We sell predictions. Stakes at bookmakers are outside the platform.',
      },
    ],
    ctaPrimary: { href: '/marketplace', label: 'Marketplace — today filter' },
    ctaSecondary: { href: '/live-scores', label: 'Today’s matches' },
    disclaimer: DISCLAIMER,
    liveHeading: 'Latest football picks',
    liveEmpty: 'No picks to show yet. Open the marketplace for the live list.',
    liveMoreHref: '/marketplace',
    liveMoreLabel: 'Open marketplace',
    liveQuery: 'today',
  },

  'btts-predictions': {
    path: '/btts-predictions',
    metaTitle: 'Both Teams to Score Predictions | BetRollover',
    metaDescription:
      'Both teams to score (BTTS) football predictions from tipsters with public records. Purchase-protected picks, match pages, Ghana marketplace. Not sure wins. 18+.',
    keywords: [
      'btts predictions',
      'both teams to score tips',
      'gg predictions',
      'btts tipster',
    ],
    label: 'Markets',
    title: 'Both teams to score predictions',
    tagline:
      'Find tipster picks that target both teams to score — with transparent tip settlement, not empty “sure tip” claims.',
    intro: [
      'Both teams to score is one of the most searched football tip markets. It looks simple: each side finds the net. In practice, tipsters disagree on open games, derbies, and high-press teams. BetRollover lets those tipsters publish both-teams-to-score selections inside singles or accumulators, then settles them from official scores so buyers can audit the record.',
      'We do not brand these tips as locks or sure wins. Language like that is banned. What you get instead is a price (or a free listing) and public profit per GHS 100 bet. Paid marketplace both-teams-to-score picks use the same purchase protection as other paid tips: lose the pick, get the tip price back in your wallet.',
      'Use this page to understand how both teams to score appears in our product, how to combine it with match previews, and how it sits beside over 2.5 goals when tipsters stack goal markets. Ghana, Nigeria, Kenya, South Africa, and Francophone users all browse the same football marketplace with wallet options where enabled.',
    ],
    sections: [
      {
        heading: 'How tipsters list both teams to score',
        paragraphs: [
          'A pick may be a single both-teams-to-score yes/no line, or an accumulator that includes those legs with match results or totals. Read every leg before you buy. An accumulator loses if any non-cancelled leg loses — the purchase-protection guide explains refunds for those cases.',
          'Titles on modern listings prefer readable match-based names instead of opaque ids. Open the pick page for full selections once revealed. Related picks on a match page help you see whether several tipsters agree on both teams to score for the same fixture.',
        ],
        links: [
          { href: '/marketplace?sport=football', label: 'Football marketplace' },
          { href: '/guides/how-accumulators-settle', label: 'How accumulators settle' },
          { href: '/guides/purchase-protection', label: 'Purchase protection' },
        ],
      },
      {
        heading: 'Match context for both teams to score',
        paragraphs: [
          'On match pages you get teams, league, kickoff, and standings snippets (played, wins, draws, losses, points) when available. That is not a full expected-goals model — it is enough to ground the tip before kickoff. Live scores update while the match is in play; tips settle after full time.',
          'If you also care about total goals, cross-check the over 2.5 hub. Both teams to score yes and over 2.5 often correlate but they are not the same market. Tipsters who confuse them will show it in their result-confirmed records.',
        ],
        links: [
          { href: '/over-2-5-goals-predictions', label: 'Over 2.5 goals predictions' },
          { href: '/football-predictions-today', label: 'Predictions today' },
          { href: '/live-scores', label: 'Live scores' },
        ],
      },
      
      {
        heading: 'Compare tipsters on goal markets',
        paragraphs: [
          'Filter the tipster directory and leaderboard for accounts that publish often. Read win rate and profit per GHS 100 bet together with sample size. Thin samples swing wildly on both teams to score. Prefer tipsters who also post losses publicly — purchase protection and result-confirmed archives make hiding losses harder than on closed Telegram channels.',
        ],
        links: [
          { href: '/tipsters', label: 'Tipsters' },
          { href: '/leaderboard', label: 'Leaderboard' },
          { href: '/football-tips-ghana', label: 'Football predictions in Ghana' },
          { href: '/coupons/archive', label: 'Settled archive' },
        ],
      },
    ],
    faqs: [
      {
        question: 'What does both teams to score mean?',
        answer:
          'Each team scores at least one goal in the match (subject to the exact market the tipster selected).',
      },
      {
        question: 'Do you sell sure wins on both teams to score?',
        answer:
          'No. We do not market sure wins or fixed matches. Tips are informational predictions with a public record.',
      },
      {
        question: 'Is a losing both-teams-to-score pick refunded?',
        answer:
          'Paid marketplace picks: tip price refunded to your BetRollover wallet if the pick settles lost or cancelled under purchase protection. Free picks and VIP picks follow their own rules on the buy and how-it-works pages.',
      },
      {
        question: 'Can AI tipsters post both teams to score?',
        answer:
          'Yes. AI tipsters are labelled. Judge them by result-confirmed stats like any other tipster.',
      },
    ],
    ctaPrimary: { href: '/marketplace?sport=football', label: 'Browse football tips' },
    ctaSecondary: { href: '/over-2-5-goals-predictions', label: 'Over 2.5 goals' },
    disclaimer: DISCLAIMER,
    liveHeading: 'Recent football picks',
    liveEmpty: 'No picks to show yet.',
    liveMoreHref: '/marketplace?sport=football',
    liveMoreLabel: 'Football marketplace',
    liveQuery: 'today',
  },

  'over-2-5-goals-predictions': {
    path: '/over-2-5-goals-predictions',
    metaTitle: 'Over 2.5 Goals Predictions & Tips | BetRollover',
    metaDescription:
      'Over 2.5 goals football predictions from tipsters with public win rate and profit per GHS 100 bet. Purchase-protected picks, match previews. Not a bookmaker. 18+.',
    keywords: [
      'over 2.5 goals predictions',
      'over 2.5 tips',
      'total goals predictions',
      'over under 2.5 tipster',
    ],
    label: 'Markets',
    title: 'Over 2.5 goals predictions',
    tagline:
      'Tipster predictions on over 2.5 total goals — settled in public, priced clearly, never sold as guaranteed.',
    intro: [
      'Over 2.5 goals is a staple total-goals market: the match needs at least three goals for the selection to win (unless the tipster chose a different line — always read the pick). Tipsters use it in singles, two-fold picks, and longer accumulators. On BetRollover those tips sit next to the tipster’s full record so you can see how often goal-heavy calls actually land.',
      'Search traffic for over 2.5 is full of soft claims. Our rules reject sure-win marketing. A paid over 2.5 marketplace pick still carries purchase protection on the tip price. Your bookmaker stake, if any, is separate. That split matters for Ghana wallet users and for buyers elsewhere who bet off-platform.',
      'This hub explains how over 2.5 listings work here, how they relate to both teams to score, how match pages supply kickoff and table context, and where to go for today’s card or Ghana Premier League angles that include goals markets.',
    ],
    sections: [
      {
        heading: 'Reading an over 2.5 tip',
        paragraphs: [
          'Confirm the exact market line on the pick. Some picks mix over 2.5 with team totals or first-half goals. Odds and leg count are shown on cards before purchase. After unlock, selections appear — not only inside images — so you can read them carefully.',
          'Result checking uses official full-time totals for the selected market. Cancelled-leg rules follow the platform accumulator result-checking guide. Tips waiting for a result do not count toward profit per GHS 100 bet until they settle.',
        ],
        links: [
          { href: '/marketplace?sport=football', label: 'Football marketplace' },
          { href: '/guides/how-accumulators-settle', label: 'How accumulators settle' },
          { href: '/buy-football-tips', label: 'VIP and paid tips' },
        ],
      },
      {
        heading: 'Over 2.5 vs both teams to score',
        paragraphs: [
          'Over 2.5 can win with a 3–0 scoreline; both teams to score would lose that game. Both teams to score can win 1–1 while over 2.5 loses. Tipsters who treat them as identical will show noisy results. Use both hubs when you want market-specific browsing, and compare tipsters who specialise rather than chasing every theme.',
        ],
        links: [
          { href: '/btts-predictions', label: 'Both teams to score' },
          { href: '/football-predictions-today', label: 'Predictions today' },
        ],
      },
      {
        heading: 'Match pages and live follow-up',
        paragraphs: [
          'Open the fixture page for team names, league, kickoff, standings snippets, and related predictions. During the match, live scores update; after full time, check the pick result and the settled archive. That loop replaces screenshot culture with durable URLs search engines and AI agents can cite.',
        ],
        links: [
          { href: '/live-scores', label: 'Live scores' },
          { href: '/coupons/archive', label: 'Settled archive' },
          { href: '/track-record', label: 'Track record' },
        ],
      },
      {
        heading: 'Regional links',
        paragraphs: [
          'Ghana hub and GPL pages help local fans. About and support pages state we are not a bookmaker and how to reach OceanCyber-operated BetRollover support.',
        ],
        links: [
          { href: '/football-tips-ghana', label: 'Football predictions in Ghana' },
          { href: '/ghana-premier-league-predictions', label: 'GPL predictions' },
          { href: '/support', label: 'Support' },
        ],
      },
    ],
    faqs: [
      {
        question: 'What is over 2.5 goals?',
        answer:
          'A total-goals market that typically wins when the match has three or more goals. Always confirm the exact line on the tipster’s pick.',
      },
      {
        question: 'Are over 2.5 tips sure wins?',
        answer:
          'No tip is guaranteed on BetRollover. Review result-confirmed profit per GHS 100 bet and win rate before paying.',
      },
      {
        question: 'Does purchase protection cover over 2.5 accumulators?',
        answer:
          'Eligible paid marketplace picks refund the tip price if the pick loses or is cancelled after the result is confirmed, including accumulators under the published rules. VIP plans use a different fee refund rule.',
      },
      {
        question: 'Where can I see today’s over 2.5 ideas?',
        answer:
          'Browse the football marketplace and today’s predictions hub, then open individual match pages for fixture-linked tips.',
      },
    ],
    ctaPrimary: { href: '/marketplace?sport=football', label: 'Browse football tips' },
    ctaSecondary: { href: '/btts-predictions', label: 'Both teams to score' },
    disclaimer: DISCLAIMER,
    liveHeading: 'Recent football picks',
    liveEmpty: 'No picks to show yet.',
    liveMoreHref: '/marketplace?sport=football',
    liveMoreLabel: 'Football marketplace',
    liveQuery: 'today',
  },
};

export function phase3Hub(key: Phase3HubKey): Phase3HubContent {
  return PHASE3_HUBS[key];
}
