import type { SeoHubFaq, SeoHubSection } from '@/components/seo/SeoHubLayout';

export type Phase3HubKey =
  | 'sportybet-booking-codes'
  | 'bet9ja-booking-codes'
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
  liveQuery?: 'booking' | 'today' | 'btts' | 'over25' | 'ghana' | 'settled';
};

const DISCLAIMER =
  'BetRollover sells football predictions and tipster subscriptions. We are not a bookmaker. Tips are informational and not a promise of profit. 18+ only. Use responsibly.';

export const PHASE3_HUBS: Record<Phase3HubKey, Phase3HubContent> = {
  'sportybet-booking-codes': {
    path: '/sportybet-booking-codes',
    metaTitle: 'SportyBet Booking Codes for Football Tips | BetRollover',
    metaDescription:
      'Copy SportyBet booking codes from tipster picks on BetRollover. Load the same slip in the SportyBet app. Marketplace picks, VIP plans, Ghana focus. Not a bookmaker. 18+.',
    keywords: [
      'sportybet booking code',
      'sportybet code tips',
      'football booking code ghana',
      'sportybet tipster picks',
    ],
    label: 'Booking codes',
    title: 'SportyBet booking codes on BetRollover',
    tagline:
      'When a tipster attaches a SportyBet booking code, you can copy it and open the same slip in the SportyBet app — without BetRollover placing any bet for you.',
    intro: [
      'SportyBet is a popular bookmaker across Ghana and other African markets. Many tipsters who sell football predictions also publish a booking code so followers can load the exact selection list in their SportyBet account. BetRollover is the place those tipsters list the prediction, the price, the settled record, and — when they choose — the booking code. We are a predictions marketplace, not SportyBet, and we do not operate betting wallets or settle bookmaker stakes.',
      'A booking code is a share string generated inside the bookmaker app. It does not change the odds on BetRollover, and it does not guarantee a win. It only helps you recreate the tipster’s slip faster. If the tipster did not attach a code, you can still read the revealed selections and enter them yourself. Purchase protection on paid marketplace picks refunds the tip price to your BetRollover wallet if the pick loses; it never refunds money you staked at SportyBet.',
      'This page explains how SportyBet codes appear on BetRollover, how they differ from Bet9ja codes, how free and paid picks treat codes, and where to find live listings. Use it together with the Ghana hub, the marketplace, and the VIP plans page when you want both the analysis trail and a bookmaker-ready slip.',
    ],
    sections: [
      {
        heading: 'How a SportyBet code shows on a pick',
        paragraphs: [
          'On free picks that are revealed after sign-in, and on paid picks you have unlocked, a tipster may show a booking-code block labelled for SportyBet. The block includes a copy button. After you copy the code, open SportyBet, use that app’s share or booking-code import flow, and confirm the selections and stakes yourself. BetRollover never sends the stake or confirms the bet.',
          'If a pick is still locked, you see the tipster’s public stats and price first. Buying unlocks the selections and, when present, the booking code. VIP subscription slips follow the tipster’s VIP rules: losing VIP slips are not refunded like single marketplace picks. The VIP plan fee is returned only if zero VIP slips were published in your paid period — that rule is shown in plain text on the buy page.',
        ],
        links: [
          { href: '/marketplace', label: 'Open marketplace' },
          { href: '/buy-football-tips', label: 'VIP and paid tips' },
          { href: '/guides/purchase-protection', label: 'Purchase protection guide' },
        ],
      },
      {
        heading: 'SportyBet vs Bet9ja codes',
        paragraphs: [
          'Tipsters pick one bookmaker key per code. A SportyBet code will not load correctly in Bet9ja, and the reverse is also true. Always match the label on the pick to the app you use. Some tipsters publish both over time; treat each pick separately. Our Bet9ja booking-codes page covers the Nigeria-facing flow in the same marketplace.',
          'Neither code proves the tipster is “verified for profit.” Verified on a human tipster profile means account checks passed. AI or automated tipsters are labelled Automated or AI tipster. Settled win rate and ROI are the public performance numbers — check those before you pay.',
        ],
        links: [
          { href: '/bet9ja-booking-codes', label: 'Bet9ja booking codes' },
          { href: '/tipsters', label: 'Tipster directory' },
          { href: '/leaderboard', label: 'Leaderboard' },
        ],
      },
      {
        heading: 'Ghana users, Mobile Money, and responsible use',
        paragraphs: [
          'BetRollover is Ghana-based. Wallet deposits and withdrawals support local methods described on the product pages — including Mobile Money where enabled — for buying tips, not for staking on matches. After you copy a SportyBet code, any stake is between you and SportyBet. 18+ only. Never chase losses. Predictions are opinions with a public record, not fixed matches or sure wins.',
          'If you want Ghana Premier League context, today’s football predictions, or BTTS and over 2.5 goal markets, use the linked hubs below. Each page points back to live marketplace and settled archive lists so you can verify results after kickoff.',
        ],
        links: [
          { href: '/football-tips-ghana', label: 'Football tips Ghana' },
          { href: '/ghana-premier-league-predictions', label: 'Ghana Premier League predictions' },
          { href: '/football-predictions-today', label: 'Football predictions today' },
          { href: '/responsible-gambling', label: 'Responsible use' },
        ],
      },
      {
        heading: 'Finding picks that include a code',
        paragraphs: [
          'Browse the marketplace for free and paid football picks. The booking-code shelf highlights revealed picks that already include a code. Tipsters can also attach codes to VIP content. Settled picks stay in the public archive so you can see whether a tipster who often posts SportyBet codes also posts honest results.',
          'Internal links worth keeping open: how free vs paid picks work, how leaderboard form and ROI are calculated, and how accumulator settlement marks won, lost, or void. Those guides keep the booking-code habit tied to transparent stats instead of social hype.',
        ],
        links: [
          { href: '/guides/free-and-paid-picks#booking-codes', label: 'Free vs paid (booking summary)' },
          { href: '/coupons/archive', label: 'Settled archive' },
          { href: '/how-it-works', label: 'How it works' },
        ],
      },
    ],
    faqs: [
      {
        question: 'Does a SportyBet booking code place the bet for me?',
        answer:
          'No. The code only helps you load selections in the SportyBet app. You confirm stake and place the bet yourself. BetRollover does not place bets.',
      },
      {
        question: 'If the tip loses, does SportyBet refund my stake?',
        answer:
          'No. Purchase protection on BetRollover refunds the tip purchase price to your BetRollover wallet for eligible paid marketplace picks. Bookmaker stakes are separate.',
      },
      {
        question: 'Can I use a SportyBet code in Bet9ja?',
        answer:
          'No. Use the bookmaker named on the pick. See the Bet9ja booking-codes page for Bet9ja-labelled slips.',
      },
      {
        question: 'Are booking-code tips guaranteed?',
        answer:
          'No. BetRollover does not sell sure wins, guaranteed tips, or fixed matches. Check settled ROI and win rate on the tipster profile.',
      },
    ],
    ctaPrimary: { href: '/marketplace', label: 'Browse marketplace' },
    ctaSecondary: { href: '/bet9ja-booking-codes', label: 'Bet9ja booking codes' },
    disclaimer: DISCLAIMER,
    liveHeading: 'Recent picks with booking codes',
    liveEmpty: 'No booking-code picks are listed right now. Check the marketplace shortly.',
    liveMoreHref: '/marketplace',
    liveMoreLabel: 'All marketplace picks',
    liveQuery: 'booking',
  },

  'bet9ja-booking-codes': {
    path: '/bet9ja-booking-codes',
    metaTitle: 'Bet9ja Booking Codes for Football Tips | BetRollover',
    metaDescription:
      'Copy Bet9ja booking codes from tipster football predictions on BetRollover. Load slips in Bet9ja yourself. Purchase-protected picks, public ROI. Not a bookmaker. 18+.',
    keywords: [
      'bet9ja booking code',
      'bet9ja code tips',
      'nigeria football tipster booking code',
      'bet9ja predictions marketplace',
    ],
    label: 'Booking codes',
    title: 'Bet9ja booking codes on BetRollover',
    tagline:
      'Tipsters can attach a Bet9ja booking code to a prediction so you can load the same slip in Bet9ja — while BetRollover stays a tips marketplace, not a betting site.',
    intro: [
      'Bet9ja is widely used in Nigeria for football markets. Tipsters who sell analysis often want followers to recreate a slip quickly. On BetRollover, that happens through an optional booking code field on a pick or VIP slip. You buy or unlock the prediction on our site, copy the code when it is revealed, then import it inside Bet9ja. We never take a stake on the match and we never claim the code makes the tip safe.',
      'Nigeria is a core audience for BetRollover alongside Ghana, Kenya, South Africa, and Francophone markets. Wallet currency can differ from the bookmaker currency you use in Bet9ja. Pay for tips on BetRollover; stake separately if you choose to bet. Purchase protection refunds eligible paid tip prices to the BetRollover wallet when a marketplace pick loses — not your Bet9ja balance.',
      'This hub covers how Bet9ja codes appear, how they differ from SportyBet codes, what verified and AI tipster labels mean, and where to compare tipsters before you pay. Pair it with today’s predictions and market hubs for BTTS and over 2.5 goals when you are shopping by market type rather than by bookmaker.',
    ],
    sections: [
      {
        heading: 'Using a Bet9ja code after you unlock a pick',
        paragraphs: [
          'Open the pick detail once selections are revealed. If the tipster chose Bet9ja, the booking-code block names that bookmaker. Copy the string, open Bet9ja, and use the app’s booking or share import. Confirm every selection and your own stake size. If the code fails to load, the tipster may have expired it, or the market may have suspended — you can still place selections manually from the written pick.',
          'Free picks still settle into the public record. Paid marketplace picks charge a listed price with purchase protection. VIP packages are separate subscriptions with their own fee and refund rule shown on the buy page. Booking codes can appear in any of those formats when the tipster adds them.',
        ],
        links: [
          { href: '/marketplace', label: 'Marketplace' },
          { href: '/buy-football-tips', label: 'Buy football tips / VIP' },
          { href: '/guides/free-and-paid-picks', label: 'Free vs paid picks' },
        ],
      },
      {
        heading: 'Bet9ja vs SportyBet on the same platform',
        paragraphs: [
          'Each code is tied to one bookmaker key. Do not paste a Bet9ja code into SportyBet. Tipsters serving both Nigeria and Ghana often publish different picks with different codes. Filter by tipster and read the bookmaker label every time. Our SportyBet page mirrors this guide for Ghana-facing users.',
          'Booking codes are a convenience layer. They do not replace reading form, league context, or the tipster’s settled ROI. Use match pages for kickoff and standings snippets, and the leaderboard for form-weighted rankings.',
        ],
        links: [
          { href: '/sportybet-booking-codes', label: 'SportyBet booking codes' },
          { href: '/leaderboard', label: 'Leaderboard' },
          { href: '/live-scores', label: 'Live scores / matches' },
        ],
      },
      {
        heading: 'Trust signals that are not “sure tips”',
        paragraphs: [
          'BetRollover forbids marketing language like sure win, guaranteed, or fixed match. Tipsters earn visibility through settled results. “Verified” on a human account means platform account checks — not a profit promise. Automated desks are labelled so you know they are platform-run, not human sellers.',
          'If a dispute arises about a tip purchase, use support with the pick id and purchase id. Bookmaker account issues stay with Bet9ja support. Keep those channels separate so refunds and stakes are not confused.',
        ],
        links: [
          { href: '/about', label: 'About BetRollover' },
          { href: '/support', label: 'Support' },
          { href: '/track-record', label: 'Track record' },
        ],
      },
      {
        heading: 'Related prediction hubs',
        paragraphs: [
          'Looking for today’s card, Ghana Premier League angles, both-teams-to-score ideas, or over 2.5 goals? Those hubs link into the same marketplace and archive. Booking codes remain optional extras on whatever market the tipster chose.',
        ],
        links: [
          { href: '/football-predictions-today', label: 'Football predictions today' },
          { href: '/btts-predictions', label: 'BTTS predictions' },
          { href: '/over-2-5-goals-predictions', label: 'Over 2.5 goals predictions' },
          { href: '/football-tips-ghana', label: 'Football tips Ghana' },
        ],
      },
    ],
    faqs: [
      {
        question: 'Is BetRollover part of Bet9ja?',
        answer:
          'No. BetRollover is an independent tipster marketplace. Bet9ja is an external bookmaker. Booking codes are optional links between a tip and that app.',
      },
      {
        question: 'Do I need a BetRollover wallet to copy a code?',
        answer:
          'You need access to the revealed pick. Free picks usually need sign-in to reveal. Paid picks need a purchase or VIP access. Copying the code itself does not charge SportyBet or Bet9ja.',
      },
      {
        question: 'What if the Bet9ja code is invalid?',
        answer:
          'Use the written selections on the pick page, or contact the tipster via platform support channels. Invalid codes do not automatically refund a tip unless the pick itself settles as a losing paid marketplace pick under purchase protection.',
      },
      {
        question: 'Can tipsters promise Bet9ja wins?',
        answer:
          'No. Platform rules reject sure-win and fixed-match claims. Judge tipsters by settled public stats.',
      },
    ],
    ctaPrimary: { href: '/marketplace', label: 'Browse marketplace' },
    ctaSecondary: { href: '/sportybet-booking-codes', label: 'SportyBet booking codes' },
    disclaimer: DISCLAIMER,
    liveHeading: 'Recent picks with booking codes',
    liveEmpty: 'No booking-code picks are listed right now. Check the marketplace shortly.',
    liveMoreHref: '/marketplace',
    liveMoreLabel: 'All marketplace picks',
    liveQuery: 'booking',
  },

  'ghana-premier-league-predictions': {
    path: '/ghana-premier-league-predictions',
    metaTitle: 'Ghana Premier League Predictions & Tips | BetRollover',
    metaDescription:
      'Ghana Premier League football predictions from tipsters with public ROI. Purchase-protected picks, Mobile Money wallets, SportyBet codes. BetRollover — Ghana-based, not a bookmaker. 18+.',
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
      'The Ghana Premier League sits at the centre of local football conversation: weekend kickoffs, title races, relegation fights, and cup overlaps. Fans looking for GPL predictions often land on Telegram forwards with no settled history. BetRollover gives tipsters a place to publish Ghana Premier League tips alongside other leagues, with win rate and ROI calculated from official settlement — not screenshots.',
      'We are based in Ghana. Wallets support GHS and the deposit methods described in-product, including Mobile Money where enabled, so you can buy tips without converting everything through a foreign card processor. Buying a tip is not placing a bet. If you later use SportyBet or another bookmaker, that stake stays outside our purchase-protection wallet refund.',
      'This page is your GPL hub: how tipsters cover domestic matches, how to read standings snippets on match pages, how booking codes fit Ghana bookmaker habits, and where today’s broader football predictions sit when the international calendar is louder than the local one.',
    ],
    sections: [
      {
        heading: 'What a GPL prediction looks like here',
        paragraphs: [
          'A tipster lists selections — match winner, double chance, goals lines, BTTS, or accumulators that include GPL legs. Free picks build a public trail. Paid picks show a price and purchase protection. After full time, the platform marks won, lost, or void from results feeds. Pending picks do not inflate ROI.',
          'Match pages for GPL fixtures show teams, league name, kickoff, and standings snippets when we have table data. Related public predictions for that fixture appear below the scoreboard so you can compare tipsters on the same game.',
        ],
        links: [
          { href: '/marketplace?sport=football', label: 'Football marketplace' },
          { href: '/live-scores', label: 'Live scores' },
          { href: '/league-tables', label: 'League tables' },
        ],
      },
      {
        heading: 'Local payments and local bookmakers',
        paragraphs: [
          'Ghana users often deposit with Mobile Money to buy tips, then optionally copy a SportyBet booking code. Those are two different money paths: tip price on BetRollover versus stake at the bookmaker. Keep them separate in your budgeting. Withdrawals of tipster earnings and wallet balances follow the rules on the wallet and support pages.',
          'Francophone and Nigerian visitors follow the same tip pages with their own bookmakers (including Bet9ja). GPL content remains useful whenever tipsters publish Accra, Kumasi, or Cape Coast kickoffs with transparent stats.',
        ],
        links: [
          { href: '/sportybet-booking-codes', label: 'SportyBet booking codes' },
          { href: '/football-tips-ghana', label: 'Football tips Ghana hub' },
          { href: '/about', label: 'About / company' },
        ],
      },
      {
        heading: 'How tipsters are checked',
        paragraphs: [
          'Anyone can start with free picks. Charging for marketplace tips requires minimum settled ROI and win rate set by the platform. Leaderboard ranking mixes recent form with ROI — a high ROI tipster with thin form can sit below a steadier profile. Read the ranking guide before assuming position equals “best tip.”',
          'Verified badges mean account checks. AI tipsters are labelled Automated. Neither label means Ghana Premier League picks are locked in. Domestic leagues can be low-liquidity and unpredictable — size any external stake carefully.',
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
          'When you care about today’s full card, both teams to score, or over 2.5 goals — including GPL legs inside multis — use the market hubs. Settled archive links let you audit weekend tips after the fact.',
        ],
        links: [
          { href: '/football-predictions-today', label: 'Predictions today' },
          { href: '/btts-predictions', label: 'BTTS predictions' },
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
          'On the pick page, tipster profile, track-record views, and the settled archive once settlement finishes.',
      },
    ],
    ctaPrimary: { href: '/marketplace?sport=football', label: 'Browse football tips' },
    ctaSecondary: { href: '/football-tips-ghana', label: 'Ghana tips hub' },
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
      'Football predictions today from tipsters with public win rate and ROI. Free and purchase-protected picks, match pages, booking codes. Ghana-based marketplace. 18+.',
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
      '“Predictions today” should mean more than a long list of logos. On BetRollover, today’s football tips are tied to tipster accounts, prices, and settlement rules you can read before kickoff. Browse the marketplace, open match pages for teams and league standings snippets, and compare settled history when two tipsters disagree on the same fixture.',
      'Coverage spans major European leagues, African competitions including the Ghana Premier League, and cups that fall on midweek cards. Automated desks and human tipsters are labelled differently. We never market sure odds. If a tipster’s copy sounds like a guarantee, treat that as a red flag against our rules.',
      'Use this hub as the daily entry point: how “today” filters work, how free reveals differ from paid unlocks, how booking codes help SportyBet or Bet9ja users load slips, and which sibling pages cover BTTS and over 2.5 goals when you are shopping by market.',
    ],
    sections: [
      {
        heading: 'Finding today’s picks',
        paragraphs: [
          'Start on the marketplace and use the day filter for today when you want kickoffs on the current calendar date. Home and live-scores surfaces also highlight matches with related picks. Each public match page lists predictions linked to that fixture so you are not hunting only by tipster name.',
          'VIP plans deliver a stream of slips over a paid period rather than a single tip. Marketplace singles and accumulators remain purchase-protected per pick. Read the buy page for plan length, price in GHS, and the VIP refund rule in plain text.',
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
          'Check total odds, number of legs, tipster ROI and win rate, and whether the pick is free or paid. For paid tips, know that a loss refunds the tip price to your wallet under purchase protection. For free tips, there is nothing to refund — but the result still hits the public record.',
          'Match preview text uses teams, league, kickoff, and standings when available. We do not invent head-to-head stories without data. If standings are missing, rely on the tipster write-up and your own research.',
        ],
        links: [
          { href: '/guides/purchase-protection', label: 'Purchase protection' },
          { href: '/guides/read-tipster-stats', label: 'Tipster stats guide' },
          { href: '/track-record', label: 'Track record' },
        ],
      },
      {
        heading: 'Bookmaker codes for today’s card',
        paragraphs: [
          'Optional SportyBet or Bet9ja booking codes appear after reveal. They speed up slip entry; they do not place the bet. Ghana and Nigeria users often combine today’s tips with those codes — still keeping tip spend and stake spend separate.',
        ],
        links: [
          { href: '/sportybet-booking-codes', label: 'SportyBet codes' },
          { href: '/bet9ja-booking-codes', label: 'Bet9ja codes' },
        ],
      },
      {
        heading: 'Market-focused today lists',
        paragraphs: [
          'If you specifically want both teams to score or over 2.5 goals ideas for today’s fixtures, open those hubs. For domestic Ghana focus, use the GPL and Ghana tips pages. After full time, verify outcomes in the settled archive instead of trusting chat forwards.',
        ],
        links: [
          { href: '/btts-predictions', label: 'BTTS predictions' },
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
          'Some are free after sign-in; others are paid marketplace picks or VIP slips. Prices and refund rules are shown on each listing.',
      },
      {
        question: 'Do pending tips count on the leaderboard?',
        answer:
          'No. Only settled won/lost results feed win rate and ROI. Pending tips wait for settlement.',
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
    metaTitle: 'BTTS Predictions — Both Teams to Score Tips | BetRollover',
    metaDescription:
      'Both teams to score (BTTS) football predictions from tipsters with public records. Purchase-protected picks, match pages, Ghana marketplace. Not sure wins. 18+.',
    keywords: [
      'btts predictions',
      'both teams to score tips',
      'gg predictions',
      'btts tipster',
    ],
    label: 'Markets',
    title: 'BTTS predictions (both teams to score)',
    tagline:
      'Find tipster picks that target both teams to score — with transparent settlement, not “GG banker” hype.',
    intro: [
      'Both teams to score (BTTS / GG) is one of the most searched football tip markets. It looks simple: each side finds the net. In practice, tipsters disagree on open games, derbies, and high-press teams. BetRollover lets those tipsters publish BTTS selections inside singles or accumulators, then settles them from official scores so buyers can audit the record.',
      'We do not brand BTTS tips as bankers, locks, or sure wins. Language like that is banned. What you get instead is a price (or a free listing), optional booking codes, and public ROI. Paid marketplace BTTS picks use the same purchase protection as other paid tips: lose the pick, get the tip price back in your wallet.',
      'Use this page to understand how BTTS appears in our product, how to combine it with match previews, and how it sits beside over 2.5 goals when tipsters stack goal markets. Ghana, Nigeria, Kenya, South Africa, and Francophone users all browse the same football marketplace with local wallet options where enabled.',
    ],
    sections: [
      {
        heading: 'How tipsters list BTTS',
        paragraphs: [
          'A pick may be a single BTTS yes/no line, or a multi that includes BTTS legs with match winners or totals. Read every leg before you buy. Accumulator settlement fails if any non-void leg loses — the purchase-protection guide explains refunds for those cases.',
          'Titles on modern listings prefer readable match-based names instead of opaque ids. Open the coupon page for full selections once revealed. Related picks on a match page help you see whether several tipsters agree on BTTS for the same fixture.',
        ],
        links: [
          { href: '/marketplace?sport=football', label: 'Football marketplace' },
          { href: '/guides/accumulator-settlement', label: 'Accumulator settlement' },
          { href: '/guides/purchase-protection', label: 'Purchase protection' },
        ],
      },
      {
        heading: 'Match context for BTTS',
        paragraphs: [
          'On /matches/{id} pages you get teams, league, kickoff, and standings snippets (played, wins, draws, losses, points) when available. That is not a full expected-goals model — it is enough to ground the tip before kickoff. Live scores update while the match is in play; settlement follows full time.',
          'If you also care about total goals, cross-check the over 2.5 hub. BTTS yes and over 2.5 often correlate but they are not the same market. Tipsters who confuse them will show it in their settled results.',
        ],
        links: [
          { href: '/over-2-5-goals-predictions', label: 'Over 2.5 goals predictions' },
          { href: '/football-predictions-today', label: 'Predictions today' },
          { href: '/live-scores', label: 'Live scores' },
        ],
      },
      {
        heading: 'Booking codes and regional bookmakers',
        paragraphs: [
          'SportyBet and Bet9ja users can copy booking codes when tipsters attach them to BTTS slips. The code does not improve the probability of both teams scoring. It only maps the slip into the bookmaker app.',
        ],
        links: [
          { href: '/sportybet-booking-codes', label: 'SportyBet booking codes' },
          { href: '/bet9ja-booking-codes', label: 'Bet9ja booking codes' },
        ],
      },
      {
        heading: 'Compare tipsters on goal markets',
        paragraphs: [
          'Filter the tipster directory and leaderboard for accounts that publish often. Read win rate and ROI together with sample size. Thin samples swing wildly on BTTS. Prefer tipsters who also post losses publicly — purchase protection and settled archives make hiding losses harder than on closed Telegram channels.',
        ],
        links: [
          { href: '/tipsters', label: 'Tipsters' },
          { href: '/leaderboard', label: 'Leaderboard' },
          { href: '/football-tips-ghana', label: 'Ghana tips hub' },
          { href: '/coupons/archive', label: 'Settled archive' },
        ],
      },
    ],
    faqs: [
      {
        question: 'What does BTTS mean?',
        answer:
          'Both teams to score — each team scores at least one goal in the match (subject to the exact market the tipster selected).',
      },
      {
        question: 'Do you sell “GG bankers”?',
        answer:
          'No. We do not market bankers, sure wins, or fixed matches. Tips are informational predictions with a public record.',
      },
      {
        question: 'Is a losing BTTS pick refunded?',
        answer:
          'Paid marketplace picks: tip price refunded to your BetRollover wallet if the pick settles lost/void under purchase protection. Free picks and VIP slips follow their own rules on the buy and how-it-works pages.',
      },
      {
        question: 'Can AI tipsters post BTTS?',
        answer:
          'Yes. Automated tipsters are labelled. Judge them by settled stats like any other desk.',
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
      'Over 2.5 goals football predictions from tipsters with public ROI and win rate. Purchase-protected picks, match previews, booking codes. Not a bookmaker. 18+.',
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
      'Over 2.5 goals is a staple total-goals market: the match needs at least three goals for the selection to win (unless the tipster chose a different line — always read the slip). Tipsters use it in singles, doubles, and longer accumulators. On BetRollover those tips sit next to the tipster’s full record so you can see how often goal-heavy calls actually land.',
      'Search traffic for over 2.5 is full of “safe” claims. Our rules reject sure-win marketing. A paid over 2.5 marketplace pick still carries purchase protection on the tip price. Your bookmaker stake, if any, is separate. That split matters for Ghana Mobile Money users and for Nigeria Bet9ja users alike.',
      'This hub explains how over 2.5 listings work here, how they relate to BTTS, how match pages supply kickoff and table context, and where to go for today’s card or Ghana Premier League angles that include goals markets.',
    ],
    sections: [
      {
        heading: 'Reading an over 2.5 tip',
        paragraphs: [
          'Confirm the exact market line on the coupon. Some slips mix over 2.5 with team totals or first-half goals. Odds and leg count are shown on cards before purchase. After unlock, selections and optional booking codes appear in plain text — not only inside images — so you can copy carefully.',
          'Settlement uses official full-time totals for the selected market. Void rules follow the platform accumulator guide. Pending tips do not count toward ROI until they settle.',
        ],
        links: [
          { href: '/marketplace?sport=football', label: 'Football marketplace' },
          { href: '/guides/accumulator-settlement', label: 'Settlement guide' },
          { href: '/buy-football-tips', label: 'VIP and paid tips' },
        ],
      },
      {
        heading: 'Over 2.5 vs BTTS',
        paragraphs: [
          'Over 2.5 can win with a 3–0 scoreline; BTTS would lose that game. BTTS can win 1–1 while over 2.5 loses. Tipsters who treat them as identical will show noisy results. Use both hubs when you want market-specific browsing, and compare tipsters who specialise rather than chasing every theme.',
        ],
        links: [
          { href: '/btts-predictions', label: 'BTTS predictions' },
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
        heading: 'Regional links and booking codes',
        paragraphs: [
          'Ghana hub and GPL pages help local fans. SportyBet and Bet9ja booking-code pages explain how to load goal-market slips externally. About and support pages state we are not a bookmaker and how to reach OceanCyber-operated BetRollover support.',
        ],
        links: [
          { href: '/football-tips-ghana', label: 'Football tips Ghana' },
          { href: '/ghana-premier-league-predictions', label: 'GPL predictions' },
          { href: '/sportybet-booking-codes', label: 'SportyBet codes' },
          { href: '/bet9ja-booking-codes', label: 'Bet9ja codes' },
          { href: '/support', label: 'Support' },
        ],
      },
    ],
    faqs: [
      {
        question: 'What is over 2.5 goals?',
        answer:
          'A total-goals market that typically wins when the match has three or more goals. Always confirm the exact line on the tipster’s slip.',
      },
      {
        question: 'Are over 2.5 tips “safe”?',
        answer:
          'No tip is safe or guaranteed on BetRollover. Review settled ROI and win rate before paying.',
      },
      {
        question: 'Does purchase protection cover over 2.5 accumulators?',
        answer:
          'Eligible paid marketplace picks refund the tip price if the pick settles lost or void, including multis under the published accumulator rules. VIP plans use a different fee refund rule.',
      },
      {
        question: 'Where can I see today’s over 2.5 ideas?',
        answer:
          'Browse the football marketplace and today’s predictions hub, then open individual match pages for fixture-linked tips.',
      },
    ],
    ctaPrimary: { href: '/marketplace?sport=football', label: 'Browse football tips' },
    ctaSecondary: { href: '/btts-predictions', label: 'BTTS predictions' },
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
