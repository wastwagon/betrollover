-- ============================================
-- Full AI Tipsters Seed: 25 users + link to tipsters
-- Run: psql -U betrollover -d betrollover -f database/seeds/ai-tipsters-full-seed.sql
-- Or: docker exec -i betrollover-postgres psql -U betrollover -d betrollover < database/seeds/ai-tipsters-full-seed.sql
-- Idempotent: uses ON CONFLICT / INSERT ... WHERE NOT EXISTS
-- ============================================

-- Shared bcrypt hash for internal tipster users (they never log in)
-- Same hash as admin (password) for simplicity
-- 1. Insert 25 users (AI tipsters as real human tipsters)
INSERT INTO users (username, email, password, display_name, role, status, country, timezone, country_code, flag_emoji, avatar, bio, is_verified, email_notifications, push_notifications)
VALUES
  ('SafetyFirstPro', 'safetyfirstpro@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekly Premium', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/safety_first.png', 'One quality pick per week. Favorites only. Steady profits over volume.', true, true, true),
  ('TheBankroller', 'thebankroller@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekly Bankroll', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/bankroller.png', 'One low-odds acca per week. Combined 2–4 odds. Building the bankroll.', true, true, true),
  ('SteadyEddie', 'steadyeddie@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekly Steady', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/steady_eddie.png', 'One pick per week. No gambles, just value. Consistent returns.', true, true, true),
  ('ConsistentCarl', 'consistentcarl@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekly Elite', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/consistent_carl.png', 'One elite pick per week. 70%+ win rate target. Small but steady profits.', true, true, true),
  ('WeekendWarrior', 'weekendwarrior@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekend Value', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/weekend_warrior.png', 'Weekend fixtures only. Sat & Sun leagues. Value when it matters.', true, true, true),
  ('PremierLeaguePro', 'premierleaguepro@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekend EPL', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/epl_pro.png', 'EPL weekend specialist. Saturday and Sunday Premier League value.', true, true, true),
  ('LaLigaLegend', 'laligalegend@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekend La Liga', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/laliga_legend.png', 'La Liga weekend specialist. Spanish football Sat & Sun.', true, true, true),
  ('BundesligaBoss', 'bundesligaboss@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Weekend Bundesliga', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/bundesliga_boss.png', 'Bundesliga weekend specialist. German football Sat & Sun.', true, true, true),
  ('MidweekMagic', 'midweekmagic@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Midweek Edge', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/midweek_magic.png', 'Midweek fixtures only. Champions League, Europa, cup games. Rotation expert.', true, true, true),
  ('LateBloomer', 'latebloomer@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Midweek Value', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/late_bloomer.png', 'Midweek value hunter. Tue/Wed/Thu when European leagues play.', true, true, true),
  ('TheAnalyst', 'theanalyst@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Daily Value', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/analyst.png', 'Posts daily when value appears. Data-driven. Top 5 leagues.', true, true, true),
  ('ValueHunter', 'valuehunter@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Daily Value Hunter', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/value_hunter.png', 'Only posts when odds are in our favor. Value is everything.', true, true, true),
  ('FormExpert', 'formexpert@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Daily Form', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/form_expert.png', 'Current form over history. Posts daily when momentum aligns.', true, true, true),
  ('StatsMachine', 'statsmachine@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Daily Stats', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/stats_machine.png', 'Pure mathematics. No emotions. Posts daily when numbers say value.', true, true, true),
  ('BTTSMaster', 'bttsmaster@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'BTTS Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/btts_master.png', 'Both Teams To Score specialist. Posts daily when BTTS value appears.', true, true, true),
  ('OverUnderGuru', 'overunderguru@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Over 2.5 Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/over_under_guru.png', 'Over 2.5 goals specialist. Posts daily when goals market has value.', true, true, true),
  ('CleanSheetChaser', 'cleansheetchaser@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Under 2.5 Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/clean_sheet_chaser.png', 'Under 2.5 goals specialist. Defense-focused. Serie A & La Liga.', true, true, true),
  ('SerieASavant', 'serieasavant@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Serie A Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/serie_a_savant.png', 'Italian football specialist. Tactical. Posts daily when value appears.', true, true, true),
  ('Ligue1Lion', 'ligue1lion@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Ligue 1 Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/ligue1_lion.png', 'French football specialist. PSG and beyond. Daily value.', true, true, true),
  ('ChampionshipChamp', 'championshipchamp@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Championship Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/championship_champ.png', 'English Championship specialist. Know every team. Daily when value.', true, true, true),
  ('HomeHeroes', 'homeheroes@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Home Win Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/home_heroes.png', 'Home advantage specialist. Fortress teams only. Posts when home value appears.', true, true, true),
  ('UnderdogKing', 'underdogking@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Underdog Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/underdog_king.png', 'Value specialist. Low-odds accas. Posts when value appears.', true, true, true),
  ('HighRollerHQ', 'highrollerhq@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'High Odds Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/high_roller.png', 'Low-odds accas. Combined 2–4. Premium selections.', true, true, true),
  ('TheGambler', 'thegambler@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'The Gambler', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/gambler.png', '2–3 picks daily when value appears. 1X2, BTTS, Over/Under. All leagues.', true, true, true),
  ('TopSixSniper', 'topsixsniper@betrollover.internal', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Big 6 Daily', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', '/avatars/top_six_sniper.png', 'EPL Big 6 specialist. Elite teams only. Posts when favorites offer value.', true, true, true)
ON CONFLICT (email) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar = EXCLUDED.avatar,
  bio = EXCLUDED.bio,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  is_verified = EXCLUDED.is_verified,
  updated_at = NOW();

-- 2. Link tipsters to users (by username match)
UPDATE tipsters t
SET user_id = u.id,
    display_name = u.display_name,
    avatar_url = u.avatar,
    bio = u.bio,
    updated_at = NOW()
FROM users u
WHERE t.username = u.username
  AND u.email LIKE '%@betrollover.internal';

-- 3. Ensure user_wallets exist for AI tipsters (required for marketplace)
INSERT INTO user_wallets (user_id, balance, currency)
SELECT u.id, 0, 'GHS'
FROM users u
WHERE u.email LIKE '%@betrollover.internal'
  AND NOT EXISTS (SELECT 1 FROM user_wallets w WHERE w.user_id = u.id);
