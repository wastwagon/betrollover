<?php
/**
 * SmartPicks Pro - User Impersonation Service
 * Allows admins to log in as other users for support purposes
 */

class UserImpersonationService {
    
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
     * Start impersonation session
     */
    public function startImpersonation($adminId, $targetUserId, $reason = '') {
        try {
            // Validate admin permissions
            $admin = $this->db->fetch("SELECT * FROM users WHERE id = ? AND role = 'admin' AND status = 'active'", [$adminId]);
            if (!$admin) {
                throw new Exception('Unauthorized: Admin access required');
            }
            
            // Validate target user
            $targetUser = $this->db->fetch("SELECT * FROM users WHERE id = ? AND status = 'active'", [$targetUserId]);
            if (!$targetUser) {
                throw new Exception('Target user not found or inactive');
            }
            
            // Check if admin is trying to impersonate another admin
            if ($targetUser['role'] === 'admin') {
                throw new Exception('Cannot impersonate other administrators');
            }
            
            // Store original admin session
            $impersonationId = $this->db->insert('user_impersonations', [
                'admin_id' => $adminId,
                'target_user_id' => $targetUserId,
                'reason' => $reason,
                'started_at' => date('Y-m-d H:i:s'),
                'status' => 'active'
            ]);
            
            // Store impersonation data in session
            $_SESSION['impersonation'] = [
                'id' => $impersonationId,
                'admin_id' => $adminId,
                'admin_username' => $admin['username'],
                'admin_display_name' => $admin['display_name'],
                'target_user_id' => $targetUserId,
                'reason' => $reason,
                'started_at' => date('Y-m-d H:i:s')
            ];
            
            // Log impersonation start
            $this->logger->warning("User impersonation started", [
                'admin_id' => $adminId,
                'admin_username' => $admin['username'],
                'target_user_id' => $targetUserId,
                'target_username' => $targetUser['username'],
                'reason' => $reason,
                'impersonation_id' => $impersonationId
            ]);
            
            return [
                'success' => true,
                'impersonation_id' => $impersonationId,
                'target_user' => $targetUser
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error starting impersonation", [
                'admin_id' => $adminId,
                'target_user_id' => $targetUserId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * End impersonation session
     */
    public function endImpersonation($impersonationId = null) {
        try {
            if (!$impersonationId && isset($_SESSION['impersonation'])) {
                $impersonationId = $_SESSION['impersonation']['id'];
            }
            
            if (!$impersonationId) {
                throw new Exception('No active impersonation session');
            }
            
            // Update impersonation record
            $this->db->query("
                UPDATE user_impersonations 
                SET status = 'ended', 
                    ended_at = NOW()
                WHERE id = ? AND status = 'active'
            ", [$impersonationId]);
            
            // Get impersonation details for logging
            $impersonation = $this->db->fetch("
                SELECT ui.*, u.username as admin_username, u.display_name as admin_display_name
                FROM user_impersonations ui
                INNER JOIN users u ON ui.admin_id = u.id
                WHERE ui.id = ?
            ", [$impersonationId]);
            
            // Log impersonation end
            $this->logger->info("User impersonation ended", [
                'impersonation_id' => $impersonationId,
                'admin_id' => $impersonation['admin_id'],
                'admin_username' => $impersonation['admin_username'],
                'target_user_id' => $impersonation['target_user_id'],
                'duration_minutes' => $this->calculateDuration($impersonation['started_at'])
            ]);
            
            // Clear impersonation session
            unset($_SESSION['impersonation']);
            
            return [
                'success' => true,
                'message' => 'Impersonation ended successfully'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error ending impersonation", [
                'impersonation_id' => $impersonationId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Check if current session is impersonated
     */
    public function isImpersonated() {
        return isset($_SESSION['impersonation']) && $_SESSION['impersonation']['status'] !== 'ended';
    }
    
    /**
     * Get impersonation details
     */
    public function getImpersonationDetails() {
        return $_SESSION['impersonation'] ?? null;
    }
    
    /**
     * Get impersonation history
     */
    public function getImpersonationHistory($adminId = null, $limit = 50) {
        try {
            $whereClause = $adminId ? "WHERE ui.admin_id = ?" : "";
            $params = $adminId ? [$adminId, $limit] : [$limit];
            
            return $this->db->fetchAll("
                SELECT 
                    ui.*,
                    admin.username as admin_username,
                    admin.display_name as admin_display_name,
                    target.username as target_username,
                    target.display_name as target_display_name
                FROM user_impersonations ui
                INNER JOIN users admin ON ui.admin_id = admin.id
                INNER JOIN users target ON ui.target_user_id = target.id
                {$whereClause}
                ORDER BY ui.started_at DESC
                LIMIT ?
            ", $params);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting impersonation history", [
                'admin_id' => $adminId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get active impersonations
     */
    public function getActiveImpersonations() {
        try {
            return $this->db->fetchAll("
                SELECT 
                    ui.*,
                    admin.username as admin_username,
                    admin.display_name as admin_display_name,
                    target.username as target_username,
                    target.display_name as target_display_name
                FROM user_impersonations ui
                INNER JOIN users admin ON ui.admin_id = admin.id
                INNER JOIN users target ON ui.target_user_id = target.id
                WHERE ui.status = 'active'
                ORDER BY ui.started_at DESC
            ");
            
        } catch (Exception $e) {
            $this->logger->error("Error getting active impersonations", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Calculate impersonation duration
     */
    private function calculateDuration($startTime) {
        $start = new DateTime($startTime);
        $end = new DateTime();
        $interval = $start->diff($end);
        
        return ($interval->h * 60) + $interval->i; // Duration in minutes
    }
    
    /**
     * Get impersonation statistics
     */
    public function getImpersonationStats() {
        try {
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_impersonations,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_impersonations,
                    SUM(CASE WHEN started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last_24h,
                    SUM(CASE WHEN started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last_7d,
                    AVG(TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW()))) as avg_duration_minutes
                FROM user_impersonations
            ");
            
            return $stats ?: [
                'total_impersonations' => 0,
                'active_impersonations' => 0,
                'last_24h' => 0,
                'last_7d' => 0,
                'avg_duration_minutes' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting impersonation stats", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Validate impersonation permissions
     */
    public function canImpersonate($adminId, $targetUserId) {
        try {
            // Check admin role
            $admin = $this->db->fetch("SELECT role FROM users WHERE id = ?", [$adminId]);
            if (!$admin || $admin['role'] !== 'admin') {
                return false;
            }
            
            // Check target user exists and is not admin
            $target = $this->db->fetch("SELECT role FROM users WHERE id = ? AND status = 'active'", [$targetUserId]);
            if (!$target || $target['role'] === 'admin') {
                return false;
            }
            
            // Check if admin is already impersonating someone
            $activeImpersonation = $this->db->fetch("
                SELECT id FROM user_impersonations 
                WHERE admin_id = ? AND status = 'active'
            ", [$adminId]);
            
            if ($activeImpersonation) {
                return false;
            }
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error validating impersonation permissions", [
                'admin_id' => $adminId,
                'target_user_id' => $targetUserId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
?>
