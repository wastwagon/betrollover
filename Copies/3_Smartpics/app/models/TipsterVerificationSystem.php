<?php
/**
 * SmartPicks Pro - Tipster Verification System
 * 
 * Handles tipster verification, badges, and achievements
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class TipsterVerificationSystem {
    
    private static $instance = null;
    private $db;
    private $logger;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Apply for verification
     */
    public function applyForVerification($userId, $applicationData) {
        try {
            // Check if already verified
            $existing = $this->db->fetch("
                SELECT is_verified FROM tipster_profiles WHERE user_id = ?
            ", [$userId]);
            
            if ($existing && $existing['is_verified']) {
                throw new Exception('User is already verified');
            }
            
            // Insert verification application
            $this->db->query("
                INSERT INTO tipster_verification_applications 
                (user_id, application_data, status, created_at) 
                VALUES (?, ?, 'pending', NOW())
            ", [$userId, json_encode($applicationData)]);
            
            $applicationId = $this->db->lastInsertId();
            
            $this->logger->info("Verification application submitted", [
                'user_id' => $userId,
                'application_id' => $applicationId
            ]);
            
            return $applicationId;
            
        } catch (Exception $e) {
            $this->logger->error("Error applying for verification", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            throw $e;
        }
    }
    
    /**
     * Approve verification (admin only)
     */
    public function approveVerification($applicationId, $adminId) {
        try {
            // Get application
            $application = $this->db->fetch("
                SELECT user_id FROM tipster_verification_applications 
                WHERE id = ? AND status = 'pending'
            ", [$applicationId]);
            
            if (!$application) {
                throw new Exception('Application not found or already processed');
            }
            
            $userId = $application['user_id'];
            
            // Update application status
            $this->db->query("
                UPDATE tipster_verification_applications 
                SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() 
                WHERE id = ?
            ", [$adminId, $applicationId]);
            
            // Update user role from 'user' to 'tipster'
            $this->db->query("
                UPDATE users 
                SET role = 'tipster' 
                WHERE id = ?
            ", [$userId]);
            
            // Check if tipster profile exists, create if not
            $profileExists = $this->db->fetch("
                SELECT id FROM tipster_profiles WHERE user_id = ?
            ", [$userId]);
            
            if (!$profileExists) {
                // Create tipster profile
                $this->db->query("
                    INSERT INTO tipster_profiles 
                    (user_id, is_verified, created_at, updated_at) 
                    VALUES (?, 1, NOW(), NOW())
                ", [$userId]);
            } else {
                // Update existing profile
                $this->db->query("
                    UPDATE tipster_profiles 
                    SET is_verified = 1, updated_at = NOW() 
                    WHERE user_id = ?
                ", [$userId]);
            }
            
            // Award verification badge (skip if method doesn't exist)
            if (method_exists($this, 'awardBadge')) {
                try {
                    $this->awardBadge($userId, 'verified_tipster');
                } catch (Exception $e) {
                    // Badge system might not be fully implemented, log but don't fail
                    $this->logger->warning("Badge awarding failed", [
                        'user_id' => $userId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $this->logger->info("Verification approved", [
                'application_id' => $applicationId,
                'user_id' => $application['user_id'],
                'admin_id' => $adminId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error approving verification", [
                'error' => $e->getMessage(),
                'application_id' => $applicationId,
                'admin_id' => $adminId
            ]);
            throw $e;
        }
    }
    
    /**
     * Reject verification
     */
    public function rejectVerification($applicationId, $adminId, $reason) {
        try {
            $this->db->execute("
                UPDATE tipster_verification_applications 
                SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? 
                WHERE id = ?
            ", [$adminId, $reason, $applicationId]);
            
            $this->logger->info("Verification rejected", [
                'application_id' => $applicationId,
                'admin_id' => $adminId,
                'reason' => $reason
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error rejecting verification", [
                'error' => $e->getMessage(),
                'application_id' => $applicationId,
                'admin_id' => $adminId
            ]);
            throw $e;
        }
    }
    
    /**
     * Award badge to user
     */
    public function awardBadge($userId, $badgeType, $metadata = null) {
        try {
            // Check if badge already exists
            $existing = $this->db->fetch("
                SELECT id FROM user_badges ub
                JOIN badges b ON ub.badge_id = b.id
                WHERE ub.user_id = ? AND b.name = ?
            ", [$userId, $badgeType]);
            
            if ($existing) {
                return false; // Badge already exists
            }
            
            // Get badge ID first
            $badge = $this->db->fetch("SELECT id FROM badges WHERE name = ?", [$badgeType]);
            if (!$badge) {
                throw new Exception('Badge not found');
            }
            
            // Insert badge
            $this->db->insert("
                INSERT INTO user_badges (user_id, badge_id, metadata, awarded_at) 
                VALUES (?, ?, ?, NOW())
            ", [$userId, $badge['id'], $metadata ? json_encode($metadata) : null]);
            
            $this->logger->info("Badge awarded", [
                'user_id' => $userId,
                'badge_type' => $badgeType
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error awarding badge", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'badge_type' => $badgeType
            ]);
            throw $e;
        }
    }
    
    /**
     * Get all available badges
     */
    public function getAllBadges() {
        try {
            return $this->db->fetchAll("
                SELECT 
                    id,
                    name,
                    description,
                    icon,
                    color,
                    criteria,
                    is_active,
                    created_at
                FROM badges 
                WHERE is_active = 1
                ORDER BY name ASC
            ");
        } catch (Exception $e) {
            $this->logger->error("Error getting all badges", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get user badges
     */
    public function getUserBadges($userId) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    ub.awarded_at,
                    b.name,
                    b.description,
                    b.icon,
                    b.color
                FROM user_badges ub
                JOIN badges b ON ub.badge_id = b.id
                WHERE ub.user_id = ?
                ORDER BY ub.awarded_at DESC
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user badges", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Check and award achievement badges
     */
    public function checkAchievements($userId) {
        try {
            $achievements = [];
            
            // Get user stats
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_picks,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_picks,
                    SUM(views) as total_views,
                    SUM(purchases) as total_purchases,
                    SUM(CASE WHEN status = 'won' THEN price ELSE 0 END) as total_earnings
                FROM accumulator_tickets 
                WHERE user_id = ?
            ", [$userId]);
            
            // First Pick Achievement
            if ($stats['total_picks'] >= 1) {
                $achievements[] = 'first_pick';
            }
            
            // 10 Picks Achievement
            if ($stats['total_picks'] >= 10) {
                $achievements[] = 'ten_picks';
            }
            
            // 50 Picks Achievement
            if ($stats['total_picks'] >= 50) {
                $achievements[] = 'fifty_picks';
            }
            
            // 100 Picks Achievement
            if ($stats['total_picks'] >= 100) {
                $achievements[] = 'hundred_picks';
            }
            
            // First Win Achievement
            if ($stats['won_picks'] >= 1) {
                $achievements[] = 'first_win';
            }
            
            // 10 Wins Achievement
            if ($stats['won_picks'] >= 10) {
                $achievements[] = 'ten_wins';
            }
            
            // 50 Wins Achievement
            if ($stats['won_picks'] >= 50) {
                $achievements[] = 'fifty_wins';
            }
            
            // 100 Wins Achievement
            if ($stats['won_picks'] >= 100) {
                $achievements[] = 'hundred_wins';
            }
            
            // 1000 Views Achievement
            if ($stats['total_views'] >= 1000) {
                $achievements[] = 'thousand_views';
            }
            
            // 100 Purchases Achievement
            if ($stats['total_purchases'] >= 100) {
                $achievements[] = 'hundred_purchases';
            }
            
            // 1000 GHS Earnings Achievement
            if ($stats['total_earnings'] >= 1000) {
                $achievements[] = 'thousand_earnings';
            }
            
            // Award achievements
            foreach ($achievements as $achievement) {
                $this->awardBadge($userId, $achievement);
            }
            
            return $achievements;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking achievements", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Get verification applications (admin only)
     */
    public function getVerificationApplications($status = 'pending') {
        try {
            return $this->db->fetchAll("
                SELECT 
                    tva.id,
                    tva.user_id,
                    tva.application_data,
                    tva.status,
                    tva.reviewed_at,
                    u.username,
                    u.display_name,
                    u.email,
                    u.country,
                    tp.total_picks,
                    tp.win_rate
                FROM tipster_verification_applications tva
                JOIN users u ON tva.user_id = u.id
                LEFT JOIN tipster_profiles tp ON u.id = tp.user_id
                WHERE tva.status = ?
                ORDER BY tva.id DESC
            ", [$status]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting verification applications", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get badge definitions
     */
    public function getBadgeDefinitions() {
        return [
            'verified_tipster' => [
                'name' => 'Verified Tipster',
                'description' => 'Officially verified tipster',
                'icon' => 'fas fa-check-circle',
                'color' => 'success'
            ],
            'first_pick' => [
                'name' => 'First Pick',
                'description' => 'Created your first pick',
                'icon' => 'fas fa-star',
                'color' => 'primary'
            ],
            'ten_picks' => [
                'name' => 'Pick Creator',
                'description' => 'Created 10 picks',
                'icon' => 'fas fa-plus-circle',
                'color' => 'info'
            ],
            'fifty_picks' => [
                'name' => 'Pick Master',
                'description' => 'Created 50 picks',
                'icon' => 'fas fa-crown',
                'color' => 'warning'
            ],
            'hundred_picks' => [
                'name' => 'Pick Legend',
                'description' => 'Created 100 picks',
                'icon' => 'fas fa-trophy',
                'color' => 'danger'
            ],
            'first_win' => [
                'name' => 'First Win',
                'description' => 'Won your first pick',
                'icon' => 'fas fa-medal',
                'color' => 'success'
            ],
            'ten_wins' => [
                'name' => 'Winner',
                'description' => 'Won 10 picks',
                'icon' => 'fas fa-award',
                'color' => 'success'
            ],
            'fifty_wins' => [
                'name' => 'Champion',
                'description' => 'Won 50 picks',
                'icon' => 'fas fa-crown',
                'color' => 'warning'
            ],
            'hundred_wins' => [
                'name' => 'Legend',
                'description' => 'Won 100 picks',
                'icon' => 'fas fa-trophy',
                'color' => 'danger'
            ],
            'thousand_views' => [
                'name' => 'Popular',
                'description' => 'Reached 1000 views',
                'icon' => 'fas fa-eye',
                'color' => 'info'
            ],
            'hundred_purchases' => [
                'name' => 'In Demand',
                'description' => '100 purchases',
                'icon' => 'fas fa-shopping-cart',
                'color' => 'success'
            ],
            'thousand_earnings' => [
                'name' => 'High Earner',
                'description' => 'Earned 1000 GHS',
                'icon' => 'fas fa-money-bill-wave',
                'color' => 'warning'
            ]
        ];
    }
}
?>
