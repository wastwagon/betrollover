-- Migration: Add National Teams Support
-- Creates national_teams table and modifies accumulator_picks table

-- Step 1: Create national_teams table
CREATE TABLE IF NOT EXISTS `national_teams` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `country_code` VARCHAR(3) NOT NULL,
    `team_name` VARCHAR(100) NOT NULL,
    `fifa_code` VARCHAR(3) NOT NULL,
    `fifa_ranking` INT(11) DEFAULT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_country_code` (`country_code`),
    UNIQUE KEY `unique_team_name` (`team_name`),
    KEY `idx_fifa_ranking` (`fifa_ranking`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Add match type columns to accumulator_picks table
ALTER TABLE `accumulator_picks` 
ADD COLUMN IF NOT EXISTS `match_type` ENUM('league', 'international') DEFAULT 'league' AFTER `accumulator_id`,
ADD COLUMN IF NOT EXISTS `home_team_type` ENUM('club', 'national') DEFAULT 'club' AFTER `match_type`,
ADD COLUMN IF NOT EXISTS `away_team_type` ENUM('club', 'national') DEFAULT 'club' AFTER `home_team_type`;

-- Step 3: Update existing records to default to league match type
UPDATE `accumulator_picks` 
SET `match_type` = 'league', 
    `home_team_type` = 'club', 
    `away_team_type` = 'club'
WHERE `match_type` IS NULL OR `home_team_type` IS NULL OR `away_team_type` IS NULL;

