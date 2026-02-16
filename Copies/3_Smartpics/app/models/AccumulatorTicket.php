<?php
/**
 * SmartPicks Pro - Accumulator Ticket Model
 * Handles accumulator ticket operations and management
 */

class AccumulatorTicket {
    
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
     * Create a new accumulator ticket
     */
    public function create($userId, $title, $description = '', $status = 'draft') {
        try {
            $data = [
                'user_id' => $userId,
                'title' => $title,
                'description' => $description,
                'total_picks' => 0,
                'total_odds' => 1.000,
                'status' => $status,
                'is_marketplace' => 0,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            $accumulatorId = $this->db->insert('accumulator_tickets', $data);
            
            $this->logger->info("Accumulator ticket created", [
                'user_id' => $userId,
                'accumulator_id' => $accumulatorId,
                'title' => $title
            ]);
            
            return [
                'success' => true,
                'accumulator_id' => $accumulatorId
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error creating accumulator ticket", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get accumulator ticket by ID
     */
    public function getById($accumulatorId) {
        try {
            $accumulator = $this->db->fetch("
                SELECT 
                    at.*,
                    u.display_name as creator_name
                FROM accumulator_tickets at
                LEFT JOIN users u ON at.user_id = u.id
                WHERE at.id = ?
            ", [$accumulatorId]);
            
            if ($accumulator) {
                // Get picks for this accumulator
                $picks = $this->db->fetchAll("
                    SELECT 
                        p.*,
                        f.home_team,
                        f.away_team,
                        f.match_date,
                        l.name as league_name
                    FROM picks p
                    LEFT JOIN fixtures f ON p.fixture_id = f.id
                    LEFT JOIN leagues l ON f.league_id = l.id
                    WHERE p.accumulator_id = ?
                    ORDER BY p.created_at ASC
                ", [$accumulatorId]);
                
                $accumulator['picks'] = $picks;
            }
            
            return $accumulator;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting accumulator by ID", [
                'accumulator_id' => $accumulatorId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Get user's accumulator tickets
     */
    public function getUserAccumulators($userId, $status = null, $limit = 50, $offset = 0) {
        try {
            $whereClause = "WHERE at.user_id = ?";
            $params = [$userId];
            
            if ($status) {
                $whereClause .= " AND at.status = ?";
                $params[] = $status;
            }
            
            $accumulators = $this->db->fetchAll("
                SELECT 
                    at.*,
                    COUNT(p.id) as actual_picks,
                    pm.price as marketplace_price,
                    pm.status as marketplace_status
                FROM accumulator_tickets at
                LEFT JOIN picks p ON at.id = p.accumulator_id
                LEFT JOIN pick_marketplace pm ON at.id = pm.accumulator_id
                {$whereClause}
                GROUP BY at.id
                ORDER BY at.created_at DESC
                LIMIT ? OFFSET ?
            ", array_merge($params, [$limit, $offset]));
            
            return $accumulators ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user accumulators", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Add pick to accumulator
     */
    public function addPick($accumulatorId, $pickData) {
        try {
            $this->db->beginTransaction();
            
            // Get current accumulator
            $accumulator = $this->getById($accumulatorId);
            if (!$accumulator) {
                throw new Exception("Accumulator not found");
            }
            
            // Add accumulator_id to pick data
            $pickData['accumulator_id'] = $accumulatorId;
            $pickData['created_at'] = date('Y-m-d H:i:s');
            $pickData['updated_at'] = date('Y-m-d H:i:s');
            
            // Insert pick
            $pickId = $this->db->insert('picks', $pickData);
            
            // Recalculate total odds
            $this->recalculateOdds($accumulatorId);
            
            $this->db->commit();
            
            $this->logger->info("Pick added to accumulator", [
                'accumulator_id' => $accumulatorId,
                'pick_id' => $pickId,
                'pick_data' => $pickData
            ]);
            
            return [
                'success' => true,
                'pick_id' => $pickId
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error adding pick to accumulator", [
                'accumulator_id' => $accumulatorId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Remove pick from accumulator
     */
    public function removePick($accumulatorId, $pickId) {
        try {
            $this->db->beginTransaction();
            
            // Remove pick
            $deleted = $this->db->delete('picks', 'id = ? AND accumulator_id = ?', [$pickId, $accumulatorId]);
            
            if ($deleted > 0) {
                // Recalculate total odds
                $this->recalculateOdds($accumulatorId);
            }
            
            $this->db->commit();
            
            $this->logger->info("Pick removed from accumulator", [
                'accumulator_id' => $accumulatorId,
                'pick_id' => $pickId,
                'deleted' => $deleted
            ]);
            
            return [
                'success' => true,
                'deleted' => $deleted
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error removing pick from accumulator", [
                'accumulator_id' => $accumulatorId,
                'pick_id' => $pickId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Recalculate total odds for accumulator
     */
    public function recalculateOdds($accumulatorId) {
        try {
            // Get all picks for this accumulator
            $picks = $this->db->fetchAll("
                SELECT odds FROM picks 
                WHERE accumulator_id = ? AND odds > 0
            ", [$accumulatorId]);
            
            $totalOdds = 1.000;
            $pickCount = count($picks);
            
            if ($pickCount > 0) {
                foreach ($picks as $pick) {
                    $totalOdds *= (float)$pick['odds'];
                }
            }
            
            // Update accumulator
            $this->db->update('accumulator_tickets', [
                'total_picks' => $pickCount,
                'total_odds' => $totalOdds,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$accumulatorId]);
            
            $this->logger->info("Accumulator odds recalculated", [
                'accumulator_id' => $accumulatorId,
                'total_picks' => $pickCount,
                'total_odds' => $totalOdds
            ]);
            
            return [
                'success' => true,
                'total_picks' => $pickCount,
                'total_odds' => $totalOdds
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error recalculating accumulator odds", [
                'accumulator_id' => $accumulatorId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Update accumulator status
     */
    public function updateStatus($accumulatorId, $status, $userId = null) {
        try {
            $whereClause = "id = ?";
            $params = [$accumulatorId];
            
            // Add user check if provided
            if ($userId) {
                $whereClause .= " AND user_id = ?";
                $params[] = $userId;
            }
            
            $updated = $this->db->update('accumulator_tickets', [
                'status' => $status,
                'updated_at' => date('Y-m-d H:i:s')
            ], $whereClause, $params);
            
            if ($updated > 0) {
                $this->logger->info("Accumulator status updated", [
                    'accumulator_id' => $accumulatorId,
                    'status' => $status,
                    'user_id' => $userId
                ]);
            }
            
            return [
                'success' => $updated > 0,
                'updated' => $updated
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error updating accumulator status", [
                'accumulator_id' => $accumulatorId,
                'status' => $status,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Delete accumulator ticket
     */
    public function delete($accumulatorId, $userId = null) {
        try {
            $whereClause = "id = ?";
            $params = [$accumulatorId];
            
            // Add user check if provided
            if ($userId) {
                $whereClause .= " AND user_id = ?";
                $params[] = $userId;
            }
            
            $deleted = $this->db->delete('accumulator_tickets', $whereClause, $params);
            
            if ($deleted > 0) {
                $this->logger->info("Accumulator deleted", [
                    'accumulator_id' => $accumulatorId,
                    'user_id' => $userId
                ]);
            }
            
            return [
                'success' => $deleted > 0,
                'deleted' => $deleted
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error deleting accumulator", [
                'accumulator_id' => $accumulatorId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get accumulator statistics
     */
    public function getStatistics($userId = null) {
        try {
            $whereClause = "";
            $params = [];
            
            if ($userId) {
                $whereClause = "WHERE user_id = ?";
                $params = [$userId];
            }
            
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_accumulators,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
                    AVG(total_odds) as average_odds,
                    MAX(total_odds) as highest_odds,
                    SUM(total_picks) as total_picks_created
                FROM accumulator_tickets
                {$whereClause}
            ", $params);
            
            return $stats ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting accumulator statistics", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}
?>

