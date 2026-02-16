<?php
/**
 * SmartPicks Pro - Pick Approval System
 * 
 * Handles the approval workflow for picks before they appear in marketplace
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class PickApprovalSystem {
    
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
     * Get pending approvals for admin
     */
    public function getPendingApprovals($limit = 10) {
        try {
            $result = $this->db->fetchAll("
                SELECT 
                    at.id,
                    at.title,
                    at.description,
                    at.total_picks,
                    at.total_odds,
                    at.price,
                    at.confidence_level,
                    at.created_at,
                    u.username,
                    u.display_name,
                    u.country
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                WHERE at.status = 'pending_approval'
                ORDER BY at.created_at DESC
                LIMIT ?
            ", [$limit]);
            
            return $result ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting pending approvals", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Submit pick for approval
     */
    public function submitForApproval($pickId, $userId) {
        try {
            $this->db->beginTransaction();
            
            // Update pick status to pending approval
            $this->db->query("
                UPDATE accumulator_tickets 
                SET status = 'pending_approval', 
                    is_marketplace = 0,
                    updated_at = NOW() 
                WHERE id = ? AND user_id = ?
            ", [$pickId, $userId]);
            
            // Log approval submission
            $this->logger->info("Pick submitted for approval", [
                'pick_id' => $pickId,
                'user_id' => $userId
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Pick submitted for admin approval'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error("Error submitting pick for approval", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId,
                'user_id' => $userId
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Approve pick (admin only)
     */
    public function approvePick($pickId, $adminId) {
        try {
            $this->db->beginTransaction();
            
            // Update pick status to active and marketplace
            $this->db->query("
                UPDATE accumulator_tickets 
                SET status = 'active', 
                    is_marketplace = 1,
                    approved_at = NOW(),
                    approved_by = ?,
                    updated_at = NOW() 
                WHERE id = ?
            ", [$adminId, $pickId]);
            
            // Log approval
            $this->logger->info("Pick approved by admin", [
                'pick_id' => $pickId,
                'admin_id' => $adminId
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Pick approved and added to marketplace'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error("Error approving pick", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId,
                'admin_id' => $adminId
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Reject pick (admin only)
     */
    public function rejectPick($pickId, $adminId, $reason = '') {
        try {
            $this->db->beginTransaction();
            
            // Update pick status to rejected
            $this->db->query("
                UPDATE accumulator_tickets 
                SET status = 'rejected', 
                    is_marketplace = 0,
                    rejected_at = NOW(),
                    rejected_by = ?,
                    rejection_reason = ?,
                    updated_at = NOW() 
                WHERE id = ?
            ", [$adminId, $reason, $pickId]);
            
            // Log rejection
            $this->logger->info("Pick rejected by admin", [
                'pick_id' => $pickId,
                'admin_id' => $adminId,
                'reason' => $reason
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Pick rejected'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error("Error rejecting pick", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId,
                'admin_id' => $adminId
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get pending picks for approval
     */
    public function getPendingPicks($limit = 50) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    at.*,
                    u.username,
                    u.display_name,
                    u.email
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                WHERE at.status = 'pending_approval'
                ORDER BY at.created_at ASC
                LIMIT ?
            ", [$limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting pending picks", [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }
    
    /**
     * Get pick details for approval
     */
    public function getPickDetails($pickId) {
        try {
            $pick = $this->db->fetch("
                SELECT 
                    at.*,
                    u.username,
                    u.display_name,
                    u.email
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                WHERE at.id = ?
            ", [$pickId]);
            
            if (!$pick) {
                return null;
            }
            
            // Get pick selections
            $selections = $this->db->fetchAll("
                SELECT * FROM pick_selections 
                WHERE pick_id = ? 
                ORDER BY id ASC
            ", [$pickId]);
            
            $pick['selections'] = $selections;
            
            return $pick;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting pick details", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId
            ]);
            
            return null;
        }
    }
    
    /**
     * Get approval statistics
     */
    public function getApprovalStats() {
        try {
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_pending,
                    COUNT(CASE WHEN created_at >= CURDATE() THEN 1 END) as pending_today,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as pending_week
                FROM accumulator_tickets 
                WHERE status = 'pending_approval'
            ");
            
            return $stats ?: [
                'total_pending' => 0,
                'pending_today' => 0,
                'pending_week' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting approval stats", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'total_pending' => 0,
                'pending_today' => 0,
                'pending_week' => 0
            ];
        }
    }
    
    /**
     * Get user's pending picks
     */
    public function getUserPendingPicks($userId) {
        try {
            return $this->db->fetchAll("
                SELECT * FROM accumulator_tickets 
                WHERE user_id = ? AND status = 'pending_approval'
                ORDER BY created_at DESC
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user pending picks", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            
            return [];
        }
    }
    
    /**
     * Get user's approved picks
     */
    public function getUserApprovedPicks($userId) {
        try {
            return $this->db->fetchAll("
                SELECT * FROM accumulator_tickets 
                WHERE user_id = ? AND status = 'active' AND is_marketplace = 1
                ORDER BY approved_at DESC
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user approved picks", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            
            return [];
        }
    }
    
    /**
     * Get user's rejected picks
     */
    public function getUserRejectedPicks($userId) {
        try {
            return $this->db->fetchAll("
                SELECT * FROM accumulator_tickets 
                WHERE user_id = ? AND status = 'rejected'
                ORDER BY rejected_at DESC
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user rejected picks", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            
            return [];
        }
    }
}
?>
