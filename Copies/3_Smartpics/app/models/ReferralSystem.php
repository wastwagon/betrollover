<?php
/**
 * SmartPicks Pro - Referral System
 * Handles referral codes, tracking, and rewards
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Wallet.php';

class ReferralSystem {
    
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
     * Generate referral code for user
     */
    public function generateReferralCode($userId) {
        try {
            // Verify user exists and has username
            $user = $this->db->fetch("SELECT username FROM users WHERE id = ?", [$userId]);
            if (!$user || empty($user['username'])) {
                throw new Exception("User not found or username is empty");
            }
            
            // Check if user already has an active referral code
            $existing = $this->db->fetch("
                SELECT id, code FROM referral_codes 
                WHERE user_id = ? AND is_active = 1
            ", [$userId]);
            
            if ($existing && !empty($existing['code'])) {
                return $existing['code'];
            }
            
            // Generate unique code
            $code = $this->generateUniqueCode($userId);
            
            if (empty($code)) {
                throw new Exception("Failed to generate unique referral code");
            }
            
            // Insert referral code
            $this->db->query("
                INSERT INTO referral_codes (user_id, code, is_active, created_at) 
                VALUES (?, ?, 1, NOW())
            ", [$userId, $code]);
            
            $this->logger->info("Referral code generated", [
                'user_id' => $userId,
                'code' => $code
            ]);
            
            return $code;
            
        } catch (Exception $e) {
            $this->logger->error("Error generating referral code", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
    
    /**
     * Generate unique referral code based on username
     */
    private function generateUniqueCode($userId) {
        try {
            // Get username
            $user = $this->db->fetch("SELECT username FROM users WHERE id = ?", [$userId]);
            if (!$user || empty($user['username'])) {
                throw new Exception('User not found or username is empty');
            }
            
            $username = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $user['username']));
            $code = $username;
            
            // Check if code already exists for another user
            $existing = $this->db->fetch("
                SELECT user_id FROM referral_codes WHERE code = ? AND user_id != ?
            ", [$code, $userId]);
            
            // If username is taken, append numbers
            if ($existing) {
                $counter = 1;
                while ($counter < 1000) {
                    $code = $username . $counter;
                    $existing = $this->db->fetch("
                        SELECT user_id FROM referral_codes WHERE code = ? AND user_id != ?
                    ", [$code, $userId]);
                    if (!$existing) {
                        break;
                    }
                    $counter++;
                }
                
                if ($counter >= 1000) {
                    throw new Exception('Unable to generate unique referral code');
                }
            }
            
            return $code;
            
        } catch (Exception $e) {
            $this->logger->error("Error generating referral code from username", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            throw $e;
        }
    }
    
    /**
     * Process referral when user registers
     */
    public function processReferral($refereeId, $referralCode) {
        try {
            // Get referral code details
            $referralData = $this->db->fetch("
                SELECT rc.*, u.username, u.display_name 
                FROM referral_codes rc
                JOIN users u ON rc.user_id = u.id
                WHERE rc.code = ? AND rc.is_active = 1
            ", [$referralCode]);
            
            if (!$referralData) {
                throw new Exception('Invalid referral code');
            }
            
            $referrerId = $referralData['user_id'];
            
            // Check if referee is trying to refer themselves
            if ($referrerId == $refereeId) {
                throw new Exception('Cannot refer yourself');
            }
            
            // Check if already referred
            $existing = $this->db->fetch("
                SELECT id FROM referral_tracking 
                WHERE referee_id = ? AND referrer_id = ?
            ", [$refereeId, $referrerId]);
            
            if ($existing) {
                throw new Exception('Already referred by this user');
            }
            
            // Create referral tracking record (status will be 'pending' until first deposit)
            $this->db->query("
                INSERT INTO referral_tracking 
                (referrer_id, referee_id, referral_code, status, created_at) 
                VALUES (?, ?, ?, 'pending', NOW())
            ", [
                $referrerId,
                $refereeId,
                $referralCode
            ]);
            
            // Update referral code usage
            $this->db->query("
                UPDATE referral_codes 
                SET total_uses = total_uses + 1 
                WHERE id = ?
            ", [$referralData['id']]);
            
            $this->logger->info("Referral processed", [
                'referrer_id' => $referrerId,
                'referee_id' => $refereeId,
                'referral_code' => $referralCode
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error processing referral", [
                'error' => $e->getMessage(),
                'referee_id' => $refereeId,
                'referral_code' => $referralCode
            ]);
            throw $e;
        }
    }
    
    /**
     * Complete referral when referee makes first deposit
     */
    public function completeReferralOnFirstDeposit($refereeId, $depositAmount) {
        try {
            // Get pending referral
            $referral = $this->db->fetch("
                SELECT rt.*, rc.code 
                FROM referral_tracking rt
                JOIN referral_codes rc ON rt.referral_code = rc.code
                WHERE rt.referee_id = ? AND rt.status = 'pending'
            ", [$refereeId]);
            
            if (!$referral) {
                return false; // No pending referral
            }
            
            // Get referral settings
            $settings = $this->getReferralSettings();
            
            // Check minimum deposit requirement
            $minDeposit = floatval($settings['referral_min_deposit'] ?? 0);
            if ($minDeposit > 0 && $depositAmount < $minDeposit) {
                // Deposit is below minimum, don't process referral bonus
                $this->logger->info("Referral deposit below minimum", [
                    'referral_id' => $referral['id'],
                    'deposit_amount' => $depositAmount,
                    'min_deposit' => $minDeposit
                ]);
                return false;
            }
            
            $bonusType = $settings['referral_bonus_type'] ?? 'exact'; // 'exact' = same as deposit, 'percentage' = percentage of deposit, 'fixed' = fixed amount
            
            // Calculate referrer bonus based on settings
            if ($bonusType === 'exact') {
                // Referrer gets the exact deposit amount
                $referrerBonus = $depositAmount;
            } elseif ($bonusType === 'percentage') {
                // Referrer gets a percentage of deposit
                $bonusPercentage = floatval($settings['referral_bonus_percentage'] ?? 100);
                $referrerBonus = ($depositAmount * $bonusPercentage) / 100;
            } else {
                // Fixed amount
                $referrerBonus = floatval($settings['referral_bonus_amount'] ?? 0);
            }
            
            // Update referral status
            $this->db->query("
                UPDATE referral_tracking 
                SET status = 'completed', 
                    first_deposit_amount = ?, 
                    referrer_bonus_paid = ?,
                    completed_at = NOW() 
                WHERE id = ?
            ", [$depositAmount, $referrerBonus, $referral['id']]);
            
            // Add bonus to referrer's wallet (exact deposit amount)
            if ($referrerBonus > 0) {
                $this->wallet->addFunds(
                    $referral['referrer_id'],
                    $referrerBonus,
                    'REFERRAL_BONUS_' . $referral['id'],
                    'Referral bonus - First deposit from referred user'
                );
            }
            
            // Mark bonus as paid
            $this->db->query("
                UPDATE referral_tracking 
                SET bonus_paid = 1, bonus_paid_at = NOW()
                WHERE id = ?
            ", [$referral['id']]);
            
            $this->logger->info("Referral completed on first deposit", [
                'referral_id' => $referral['id'],
                'referrer_id' => $referral['referrer_id'],
                'referee_id' => $refereeId,
                'deposit_amount' => $depositAmount,
                'referrer_bonus' => $referrerBonus
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error completing referral", [
                'error' => $e->getMessage(),
                'referee_id' => $refereeId
            ]);
            throw $e;
        }
    }
    
    /**
     * Get user's referral statistics
     */
    public function getUserReferralStats($userId) {
        try {
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_referrals,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_referrals,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_referrals,
                    SUM(CASE WHEN status = 'completed' THEN referrer_bonus_paid ELSE 0 END) as total_bonus_earned,
                    SUM(CASE WHEN status = 'completed' THEN first_deposit_amount ELSE 0 END) as total_referred_deposits
                FROM referral_tracking 
                WHERE referrer_id = ?
            ", [$userId]);
            
            return $stats ?: [
                'total_referrals' => 0,
                'completed_referrals' => 0,
                'pending_referrals' => 0,
                'total_bonus_earned' => 0,
                'total_referred_deposits' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting referral stats", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [
                'total_referrals' => 0,
                'completed_referrals' => 0,
                'total_bonus_earned' => 0,
                'total_referred_purchases' => 0
            ];
        }
    }
    
    /**
     * Get referral settings from admin
     */
    public function getReferralSettings() {
        try {
            $settings = $this->db->fetchAll("
                SELECT setting_key, setting_value, setting_type 
                FROM growth_settings 
                WHERE category = 'referral' AND is_active = 1
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
            $this->logger->error("Error getting referral settings", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get user's referral code
     */
    public function getUserReferralCode($userId) {
        try {
            // First check if table exists
            $tableExists = $this->db->fetch("
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'referral_codes'
            ");
            
            if (!$tableExists || $tableExists['count'] == 0) {
                $this->logger->error("Referral codes table does not exist", ['user_id' => $userId]);
                return null;
            }
            
            $code = $this->db->fetch("
                SELECT code FROM referral_codes 
                WHERE user_id = ? AND is_active = 1
            ", [$userId]);
            
            if (!$code || empty($code['code'])) {
                // Generate new code if doesn't exist
                return $this->generateReferralCode($userId);
            }
            
            return $code['code'];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user referral code", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Get user's referral link
     */
    public function getUserReferralLink($userId) {
        try {
            $code = $this->getUserReferralCode($userId);
            if (!$code) {
                return null;
            }
            
            // Get base URL from config or determine dynamically
            $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $basePath = '/SmartPicksPro-Local';
            
            return $protocol . '://' . $host . $basePath . '/register?ref=' . urlencode($code);
            
        } catch (Exception $e) {
            $this->logger->error("Error generating referral link", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return null;
        }
    }
    
    /**
     * Get list of referred users
     */
    public function getReferredUsers($userId, $limit = 50) {
        try {
            $referred = $this->db->fetchAll("
                SELECT 
                    rt.*,
                    u.username,
                    u.display_name,
                    u.email,
                    u.created_at as user_registered_at
                FROM referral_tracking rt
                JOIN users u ON rt.referee_id = u.id
                WHERE rt.referrer_id = ?
                ORDER BY rt.created_at DESC
                LIMIT ?
            ", [$userId, $limit]);
            
            return $referred ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting referred users", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Check if user has made their first deposit
     */
    public function hasMadeFirstDeposit($userId) {
        try {
            $deposit = $this->db->fetch("
                SELECT COUNT(*) as count 
                FROM wallet_transactions 
                WHERE user_id = ? AND type = 'deposit' AND status = 'completed'
            ", [$userId]);
            
            return ($deposit && $deposit['count'] > 0);
            
        } catch (Exception $e) {
            return false;
        }
    }
}
