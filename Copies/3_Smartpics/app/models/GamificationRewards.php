<?php
/**
 * SmartPicks Pro - Gamification Rewards System
 * Handles achievement rewards, level bonuses, and challenge rewards
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Wallet.php';

class GamificationRewards {
    
    private static $instance = null;
    private $db;
    private $logger;
    private $wallet;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->wallet = Wallet::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Check and award achievement rewards
     */
    public function checkAchievementRewards($userId, $achievementType, $achievementData = []) {
        try {
            $settings = $this->getGamificationSettings();
            
            if (!$settings['gamification_enabled']) {
                return false;
            }
            
            $rewardAmount = 0;
            $achievementId = 0;
            
            // Determine reward based on achievement type
            switch ($achievementType) {
                case 'first_purchase':
                    $rewardAmount = $settings['achievement_first_purchase_bonus'];
                    $achievementId = 1; // First Purchase badge
                    break;
                    
                case 'loyal_customer':
                    $rewardAmount = $settings['achievement_loyal_customer_bonus'];
                    $achievementId = 2; // Loyal Customer badge
                    break;
                    
                case 'social_butterfly':
                    $rewardAmount = $settings['achievement_social_butterfly_bonus'];
                    $achievementId = 4; // Social Butterfly badge
                    break;
                    
                case 'referral_champion':
                    $rewardAmount = $settings['achievement_referral_champion_bonus'];
                    $achievementId = 5; // Referral Champion badge
                    break;
            }
            
            if ($rewardAmount <= 0) {
                return false;
            }
            
            // Check if already rewarded
            $existing = $this->db->fetch("
                SELECT id FROM achievement_rewards 
                WHERE user_id = ? AND achievement_id = ? AND is_claimed = 1
            ", [$userId, $achievementId]);
            
            if ($existing) {
                return false; // Already rewarded
            }
            
            // Create achievement reward
            $rewardId = $this->db->insert("
                INSERT INTO achievement_rewards 
                (achievement_id, user_id, reward_type, reward_amount, reward_description, created_at) 
                VALUES (?, ?, 'wallet_bonus', ?, ?, NOW())
            ", [
                $achievementId,
                $userId,
                $rewardAmount,
                ucfirst(str_replace('_', ' ', $achievementType)) . ' Achievement Reward'
            ]);
            
            // Auto-claim the reward
            $this->claimAchievementReward($rewardId);
            
            $this->logger->info("Achievement reward created", [
                'user_id' => $userId,
                'achievement_type' => $achievementType,
                'reward_amount' => $rewardAmount,
                'reward_id' => $rewardId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking achievement rewards", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'achievement_type' => $achievementType
            ]);
            return false;
        }
    }
    
    /**
     * Check and award level rewards
     */
    public function checkLevelRewards($userId, $newLevel) {
        try {
            $settings = $this->getGamificationSettings();
            
            if (!$settings['gamification_enabled']) {
                return false;
            }
            
            $rewardAmount = 0;
            
            // Determine reward based on level
            switch ($newLevel) {
                case 'Bronze':
                    $rewardAmount = $settings['level_bronze_bonus'];
                    break;
                case 'Silver':
                    $rewardAmount = $settings['level_silver_bonus'];
                    break;
                case 'Gold':
                    $rewardAmount = $settings['level_gold_bonus'];
                    break;
                case 'Platinum':
                    $rewardAmount = $settings['level_platinum_bonus'];
                    break;
            }
            
            if ($rewardAmount <= 0) {
                return false;
            }
            
            // Check if already rewarded for this level
            $existing = $this->db->fetch("
                SELECT id FROM level_rewards 
                WHERE user_id = ? AND level = ? AND is_claimed = 1
            ", [$userId, $newLevel]);
            
            if ($existing) {
                return false; // Already rewarded
            }
            
            // Create level reward
            $rewardId = $this->db->insert("
                INSERT INTO level_rewards 
                (user_id, level, reward_amount, created_at) 
                VALUES (?, ?, ?, NOW())
            ", [$userId, $newLevel, $rewardAmount]);
            
            // Auto-claim the reward
            $this->claimLevelReward($rewardId);
            
            $this->logger->info("Level reward created", [
                'user_id' => $userId,
                'level' => $newLevel,
                'reward_amount' => $rewardAmount,
                'reward_id' => $rewardId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking level rewards", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'level' => $newLevel
            ]);
            return false;
        }
    }
    
    /**
     * Check and award challenge rewards
     */
    public function checkChallengeRewards($userId, $challengeType, $challengeId) {
        try {
            $settings = $this->getGamificationSettings();
            
            if (!$settings['gamification_enabled']) {
                return false;
            }
            
            $rewardAmount = 0;
            
            // Determine reward based on challenge type
            switch ($challengeType) {
                case 'daily':
                    $rewardAmount = $settings['challenge_daily_bonus'];
                    break;
                case 'weekly':
                    $rewardAmount = $settings['challenge_weekly_bonus'];
                    break;
                case 'monthly':
                    $rewardAmount = $settings['challenge_monthly_bonus'];
                    break;
            }
            
            if ($rewardAmount <= 0) {
                return false;
            }
            
            // Check if already rewarded for this challenge
            $existing = $this->db->fetch("
                SELECT id FROM challenge_rewards 
                WHERE user_id = ? AND challenge_id = ? AND is_claimed = 1
            ", [$userId, $challengeId]);
            
            if ($existing) {
                return false; // Already rewarded
            }
            
            // Create challenge reward
            $rewardId = $this->db->insert("
                INSERT INTO challenge_rewards 
                (challenge_id, user_id, challenge_type, reward_amount, is_completed, created_at) 
                VALUES (?, ?, ?, ?, 1, NOW())
            ", [$challengeId, $userId, $challengeType, $rewardAmount]);
            
            // Auto-claim the reward
            $this->claimChallengeReward($rewardId);
            
            $this->logger->info("Challenge reward created", [
                'user_id' => $userId,
                'challenge_type' => $challengeType,
                'challenge_id' => $challengeId,
                'reward_amount' => $rewardAmount,
                'reward_id' => $rewardId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking challenge rewards", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'challenge_type' => $challengeType
            ]);
            return false;
        }
    }
    
    /**
     * Claim achievement reward
     */
    public function claimAchievementReward($rewardId) {
        try {
            $reward = $this->db->fetch("
                SELECT ar.*, u.username 
                FROM achievement_rewards ar
                JOIN users u ON ar.user_id = u.id
                WHERE ar.id = ? AND ar.is_claimed = 0
            ", [$rewardId]);
            
            if (!$reward) {
                throw new Exception('Reward not found or already claimed');
            }
            
            // Add funds to wallet
            $this->wallet->addFunds(
                $reward['user_id'],
                $reward['reward_amount'],
                'ACHIEVEMENT_REWARD_' . $rewardId,
                $reward['reward_description']
            );
            
            // Mark as claimed
            $this->db->execute("
                UPDATE achievement_rewards 
                SET is_claimed = 1, claimed_at = NOW() 
                WHERE id = ?
            ", [$rewardId]);
            
            $this->logger->info("Achievement reward claimed", [
                'reward_id' => $rewardId,
                'user_id' => $reward['user_id'],
                'amount' => $reward['reward_amount']
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error claiming achievement reward", [
                'error' => $e->getMessage(),
                'reward_id' => $rewardId
            ]);
            throw $e;
        }
    }
    
    /**
     * Claim level reward
     */
    public function claimLevelReward($rewardId) {
        try {
            $reward = $this->db->fetch("
                SELECT lr.*, u.username 
                FROM level_rewards lr
                JOIN users u ON lr.user_id = u.id
                WHERE lr.id = ? AND lr.is_claimed = 0
            ", [$rewardId]);
            
            if (!$reward) {
                throw new Exception('Reward not found or already claimed');
            }
            
            // Add funds to wallet
            $this->wallet->addFunds(
                $reward['user_id'],
                $reward['reward_amount'],
                'LEVEL_REWARD_' . $rewardId,
                $reward['level'] . ' Level Achievement Reward'
            );
            
            // Mark as claimed
            $this->db->execute("
                UPDATE level_rewards 
                SET is_claimed = 1, claimed_at = NOW() 
                WHERE id = ?
            ", [$rewardId]);
            
            $this->logger->info("Level reward claimed", [
                'reward_id' => $rewardId,
                'user_id' => $reward['user_id'],
                'level' => $reward['level'],
                'amount' => $reward['reward_amount']
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error claiming level reward", [
                'error' => $e->getMessage(),
                'reward_id' => $rewardId
            ]);
            throw $e;
        }
    }
    
    /**
     * Claim challenge reward
     */
    public function claimChallengeReward($rewardId) {
        try {
            $reward = $this->db->fetch("
                SELECT cr.*, u.username 
                FROM challenge_rewards cr
                JOIN users u ON cr.user_id = u.id
                WHERE cr.id = ? AND cr.is_claimed = 0
            ", [$rewardId]);
            
            if (!$reward) {
                throw new Exception('Reward not found or already claimed');
            }
            
            // Add funds to wallet
            $this->wallet->addFunds(
                $reward['user_id'],
                $reward['reward_amount'],
                'CHALLENGE_REWARD_' . $rewardId,
                ucfirst($reward['challenge_type']) . ' Challenge Completion Reward'
            );
            
            // Mark as claimed
            $this->db->execute("
                UPDATE challenge_rewards 
                SET is_claimed = 1, claimed_at = NOW() 
                WHERE id = ?
            ", [$rewardId]);
            
            $this->logger->info("Challenge reward claimed", [
                'reward_id' => $rewardId,
                'user_id' => $reward['user_id'],
                'challenge_type' => $reward['challenge_type'],
                'amount' => $reward['reward_amount']
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error claiming challenge reward", [
                'error' => $e->getMessage(),
                'reward_id' => $rewardId
            ]);
            throw $e;
        }
    }
    
    /**
     * Get user's reward statistics
     */
    public function getUserRewardStats($userId) {
        try {
            $stats = [
                'total_achievement_rewards' => 0,
                'total_level_rewards' => 0,
                'total_challenge_rewards' => 0,
                'total_rewards_earned' => 0,
                'pending_rewards' => 0
            ];
            
            // Achievement rewards
            $achievementStats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_claimed = 1 THEN reward_amount ELSE 0 END) as claimed_amount,
                    SUM(CASE WHEN is_claimed = 0 THEN 1 ELSE 0 END) as pending_count
                FROM achievement_rewards 
                WHERE user_id = ?
            ", [$userId]);
            
            if ($achievementStats) {
                $stats['total_achievement_rewards'] = $achievementStats['total'];
                $stats['total_rewards_earned'] += $achievementStats['claimed_amount'];
                $stats['pending_rewards'] += $achievementStats['pending_count'];
            }
            
            // Level rewards
            $levelStats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_claimed = 1 THEN reward_amount ELSE 0 END) as claimed_amount,
                    SUM(CASE WHEN is_claimed = 0 THEN 1 ELSE 0 END) as pending_count
                FROM level_rewards 
                WHERE user_id = ?
            ", [$userId]);
            
            if ($levelStats) {
                $stats['total_level_rewards'] = $levelStats['total'];
                $stats['total_rewards_earned'] += $levelStats['claimed_amount'];
                $stats['pending_rewards'] += $levelStats['pending_count'];
            }
            
            // Challenge rewards
            $challengeStats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_claimed = 1 THEN reward_amount ELSE 0 END) as claimed_amount,
                    SUM(CASE WHEN is_claimed = 0 THEN 1 ELSE 0 END) as pending_count
                FROM challenge_rewards 
                WHERE user_id = ?
            ", [$userId]);
            
            if ($challengeStats) {
                $stats['total_challenge_rewards'] = $challengeStats['total'];
                $stats['total_rewards_earned'] += $challengeStats['claimed_amount'];
                $stats['pending_rewards'] += $challengeStats['pending_count'];
            }
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user reward stats", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [
                'total_achievement_rewards' => 0,
                'total_level_rewards' => 0,
                'total_challenge_rewards' => 0,
                'total_rewards_earned' => 0,
                'pending_rewards' => 0
            ];
        }
    }
    
    /**
     * Get gamification settings from admin
     */
    public function getGamificationSettings() {
        try {
            $settings = $this->db->fetchAll("
                SELECT setting_key, setting_value, setting_type 
                FROM growth_settings 
                WHERE category = 'gamification' AND is_active = 1
            ");
            
            $result = [];
            foreach ($settings as $setting) {
                $value = $setting['setting_value'];
                
                // Convert based on type
                switch ($setting['setting_type']) {
                    case 'number':
                        $value = (float)$value;
                        break;
                    case 'boolean':
                        $value = (bool)$value;
                        break;
                    case 'json':
                        $value = json_decode($value, true);
                        break;
                }
                
                $result[$setting['setting_key']] = $value;
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting gamification settings", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}

