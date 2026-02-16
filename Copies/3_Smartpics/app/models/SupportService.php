<?php
/**
 * SmartPicks Pro - Support Service
 * 
 * Handles support ticket management and user assistance
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class SupportService {
    
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
     * Create a new support ticket
     */
    public function createTicket($userId, $subject, $description, $priority = 'medium') {
        try {
            $result = $this->db->query("
                INSERT INTO support_tickets (user_id, subject, description, priority, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, 'open', NOW(), NOW())
            ", [$userId, $subject, $description, $priority]);
            
            if ($result) {
                $ticketId = $this->db->lastInsertId();
                $this->logger->info('Support ticket created', [
                    'ticket_id' => $ticketId,
                    'user_id' => $userId,
                    'subject' => $subject,
                    'priority' => $priority
                ]);
                return $ticketId;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->logger->error('Error creating support ticket', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'subject' => $subject
            ]);
            return false;
        }
    }
    
    /**
     * Get support tickets with filters
     */
    public function getTickets($filters = []) {
        try {
            $whereClause = '';
            $params = [];
            
            if (!empty($filters['status'])) {
                $whereClause .= " AND status = ?";
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['priority'])) {
                $whereClause .= " AND priority = ?";
                $params[] = $filters['priority'];
            }
            
            if (!empty($filters['user_id'])) {
                $whereClause .= " AND user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            if (!empty($filters['date_from'])) {
                $whereClause .= " AND DATE(created_at) >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $whereClause .= " AND DATE(created_at) <= ?";
                $params[] = $filters['date_to'];
            }
            
            return $this->db->fetchAll("
                SELECT 
                    st.*,
                    u.username,
                    u.display_name,
                    u.email
                FROM support_tickets st
                LEFT JOIN users u ON st.user_id = u.id
                WHERE 1=1 {$whereClause}
                ORDER BY 
                    CASE st.priority 
                        WHEN 'urgent' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        WHEN 'low' THEN 4 
                    END,
                    st.created_at DESC
            ", $params);
            
        } catch (Exception $e) {
            $this->logger->error('Error getting support tickets', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            return [];
        }
    }
    
    /**
     * Get a single support ticket with responses
     */
    public function getTicket($ticketId) {
        try {
            $ticket = $this->db->fetch("
                SELECT 
                    st.*,
                    u.username,
                    u.display_name,
                    u.email
                FROM support_tickets st
                LEFT JOIN users u ON st.user_id = u.id
                WHERE st.id = ?
            ", [$ticketId]);
            
            if ($ticket) {
                // Get responses
                $ticket['responses'] = $this->db->fetchAll("
                    SELECT 
                        tr.*,
                        u.username,
                        u.display_name
                    FROM ticket_responses tr
                    LEFT JOIN users u ON tr.user_id = u.id
                    WHERE tr.ticket_id = ?
                    ORDER BY tr.created_at ASC
                ", [$ticketId]);
            }
            
            return $ticket;
            
        } catch (Exception $e) {
            $this->logger->error('Error getting support ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $ticketId
            ]);
            return null;
        }
    }
    
    /**
     * Update ticket status
     */
    public function updateTicketStatus($ticketId, $status) {
        try {
            $result = $this->db->query("
                UPDATE support_tickets 
                SET status = ?, updated_at = NOW() 
                WHERE id = ?
            ", [$status, $ticketId]);
            
            if ($result) {
                $this->logger->info('Support ticket status updated', [
                    'ticket_id' => $ticketId,
                    'new_status' => $status
                ]);
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->logger->error('Error updating ticket status', [
                'error' => $e->getMessage(),
                'ticket_id' => $ticketId,
                'status' => $status
            ]);
            return false;
        }
    }
    
    /**
     * Add response to ticket
     */
    public function addResponse($ticketId, $userId, $message, $isInternal = false) {
        try {
            // Convert boolean to integer (0 or 1) for MySQL tinyint
            $isInternalInt = $isInternal ? 1 : 0;
            
            $result = $this->db->query("
                INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ", [$ticketId, $userId, $message, $isInternalInt]);
            
            if ($result) {
                // Update ticket timestamp
                $this->db->query("
                    UPDATE support_tickets 
                    SET updated_at = NOW() 
                    WHERE id = ?
                ", [$ticketId]);
                
                $this->logger->info('Response added to support ticket', [
                    'ticket_id' => $ticketId,
                    'user_id' => $userId,
                    'is_internal' => $isInternal
                ]);
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->logger->error('Error adding response to ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $ticketId,
                'user_id' => $userId
            ]);
            return false;
        }
    }
    
    /**
     * Get support statistics
     */
    public function getSupportStats() {
        try {
            $stats = [];
            
            // Total tickets
            $stats['total_tickets'] = $this->db->fetch("SELECT COUNT(*) as count FROM support_tickets")['count'] ?? 0;
            
            // Open tickets
            $stats['open_tickets'] = $this->db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'")['count'] ?? 0;
            
            // Urgent tickets
            $stats['urgent_tickets'] = $this->db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE priority = 'urgent' AND status != 'closed'")['count'] ?? 0;
            
            // Resolved today
            $stats['resolved_today'] = $this->db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE DATE(updated_at) = CURDATE() AND status = 'resolved'")['count'] ?? 0;
            
            // Average response time
            $avgResponse = $this->db->fetch("
                SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_time 
                FROM support_tickets 
                WHERE status = 'resolved'
            ");
            $stats['avg_response_time'] = round($avgResponse['avg_time'] ?? 0);
            
            // Tickets by priority
            $priorityStats = $this->db->fetchAll("
                SELECT priority, COUNT(*) as count 
                FROM support_tickets 
                WHERE status != 'closed'
                GROUP BY priority
            ");
            
            $stats['by_priority'] = [];
            foreach ($priorityStats as $stat) {
                $stats['by_priority'][$stat['priority']] = $stat['count'];
            }
            
            // Tickets by status
            $statusStats = $this->db->fetchAll("
                SELECT status, COUNT(*) as count 
                FROM support_tickets 
                GROUP BY status
            ");
            
            $stats['by_status'] = [];
            foreach ($statusStats as $stat) {
                $stats['by_status'][$stat['status']] = $stat['count'];
            }
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error('Error getting support statistics', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get recent tickets
     */
    public function getRecentTickets($limit = 10) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    st.id,
                    st.subject,
                    st.priority,
                    st.status,
                    st.created_at,
                    u.username,
                    u.display_name
                FROM support_tickets st
                LEFT JOIN users u ON st.user_id = u.id
                ORDER BY st.created_at DESC
                LIMIT ?
            ", [$limit]);
            
        } catch (Exception $e) {
            $this->logger->error('Error getting recent tickets', [
                'error' => $e->getMessage(),
                'limit' => $limit
            ]);
            return [];
        }
    }
    
    /**
     * Search tickets
     */
    public function searchTickets($query) {
        try {
            $searchTerm = '%' . $query . '%';
            
            return $this->db->fetchAll("
                SELECT 
                    st.*,
                    u.username,
                    u.display_name,
                    u.email
                FROM support_tickets st
                LEFT JOIN users u ON st.user_id = u.id
                WHERE st.subject LIKE ? 
                   OR st.description LIKE ?
                   OR u.username LIKE ?
                   OR u.display_name LIKE ?
                ORDER BY st.created_at DESC
                LIMIT 50
            ", [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            
        } catch (Exception $e) {
            $this->logger->error('Error searching tickets', [
                'error' => $e->getMessage(),
                'query' => $query
            ]);
            return [];
        }
    }
    
    /**
     * Close old resolved tickets
     */
    public function closeOldResolvedTickets($daysOld = 30) {
        try {
            $result = $this->db->query("
                UPDATE support_tickets 
                SET status = 'closed', updated_at = NOW() 
                WHERE status = 'resolved' 
                  AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            ", [$daysOld]);
            
            if ($result) {
                $this->logger->info('Closed old resolved tickets', [
                    'days_old' => $daysOld,
                    'affected_rows' => $result
                ]);
                return $result;
            }
            
            return 0;
            
        } catch (Exception $e) {
            $this->logger->error('Error closing old resolved tickets', [
                'error' => $e->getMessage(),
                'days_old' => $daysOld
            ]);
            return 0;
        }
    }
}