<?php
/**
 * SmartPicks Pro - User Performance Service
 * Handles ROI calculations, performance tracking, and rankings
 */

class UserPerformanceService {
    
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
     * Calculate user ROI
     */
    public function calculateUserROI($userId) {
        try {
            $performance = $this->getUserPerformance($userId);
            
            if ($performance['total_amount_spent'] > 0) {
                $totalEarned = $performance['total_amount_earned'] + $performance['total_amount_refunded'];
                $roi = (($totalEarned - $performance['total_amount_spent']) / $performance['total_amount_spent']) * 100;
            } else {
                $roi = 0; // No investment, no ROI
            }
            
            return round($roi, 2);
            
        } catch (Exception $e) {
            $this->logger->error("Error calculating user ROI", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }
    
    /**
     * Get user performance data
     */
    public function getUserPerformance($userId) {
        try {
            $performance = $this->db->fetch("
                SELECT * FROM user_performance 
                WHERE user_id = ?
            ", [$userId]);
            
            if (!$performance) {
                // Create initial performance record
                $this->initializeUserPerformance($userId);
                return $this->getUserPerformance($userId);
            }
            
            return $performance;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user performance", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Initialize user performance record
     */
    private function initializeUserPerformance($userId) {
        try {
            $this->db->insert('user_performance', [
                'user_id' => $userId,
                'total_picks_created' => 0,
                'total_picks_won' => 0,
                'total_picks_lost' => 0,
                'total_picks_sold' => 0,
                'total_picks_purchased' => 0,
                'total_purchased_won' => 0,
                'total_purchased_lost' => 0,
                'total_amount_spent' => 0.00,
                'total_amount_earned' => 0.00,
                'total_amount_refunded' => 0.00,
                'roi_percentage' => 0.00,
                'win_rate_percentage' => 0.00,
                'average_odds' => 0.000,
                'last_updated' => date('Y-m-d H:i:s')
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error initializing user performance", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Update user performance after pick settlement
     */
    public function updatePerformanceAfterSettlement($userId, $pickResult) {
        try {
            $this->db->beginTransaction();
            
            // Get current performance
            $performance = $this->getUserPerformance($userId);
            if (!$performance) {
                throw new Exception("User performance record not found");
            }
            
            $updates = [];
            
            // Update based on pick type and result
            if ($pickResult['pick_type'] === 'created') {
                if ($pickResult['result'] === 'won') {
                    $updates['total_picks_won'] = $performance['total_picks_won'] + 1;
                    $updates['total_amount_earned'] = $performance['total_amount_earned'] + $pickResult['payout'];
                } else {
                    $updates['total_picks_lost'] = $performance['total_picks_lost'] + 1;
                }
            } else { // purchased
                if ($pickResult['result'] === 'won') {
                    $updates['total_purchased_won'] = $performance['total_purchased_won'] + 1;
                    $updates['total_amount_earned'] = $performance['total_amount_earned'] + $pickResult['payout'];
                } else {
                    $updates['total_purchased_lost'] = $performance['total_purchased_lost'] + 1;
                    $updates['total_amount_refunded'] = $performance['total_amount_refunded'] + $pickResult['refund'];
                }
            }
            
            // Recalculate win rate
            $totalPicks = $performance['total_picks_created'] + $performance['total_picks_purchased'];
            $totalWon = ($updates['total_picks_won'] ?? $performance['total_picks_won']) + 
                       ($updates['total_purchased_won'] ?? $performance['total_purchased_won']);
            
            if ($totalPicks > 0) {
                $updates['win_rate_percentage'] = round(($totalWon / $totalPicks) * 100, 2);
            }
            
            // Recalculate ROI
            $totalSpent = $performance['total_amount_spent'];
            $totalEarned = ($updates['total_amount_earned'] ?? $performance['total_amount_earned']) + 
                          ($updates['total_amount_refunded'] ?? $performance['total_amount_refunded']);
            
            if ($totalSpent > 0) {
                $updates['roi_percentage'] = round((($totalEarned - $totalSpent) / $totalSpent) * 100, 2);
            }
            
            // Update performance record
            if (!empty($updates)) {
                $updates['last_updated'] = date('Y-m-d H:i:s');
                $this->db->update('user_performance', $updates, 'user_id = ?', [$userId]);
            }
            
            $this->db->commit();
            
            $this->logger->info("User performance updated after settlement", [
                'user_id' => $userId,
                'pick_result' => $pickResult,
                'updates' => $updates
            ]);
            
            return [
                'success' => true,
                'updates' => $updates
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error updating user performance", [
                'user_id' => $userId,
                'pick_result' => $pickResult,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Track pick creation
     */
    public function trackPickCreation($userId, $pickData) {
        try {
            // Insert into analytics
            $this->db->insert('pick_performance_analytics', [
                'user_id' => $userId,
                'pick_id' => $pickData['pick_id'],
                'accumulator_id' => $pickData['accumulator_id'] ?? null,
                'pick_type' => 'created',
                'market_type' => $pickData['market_type'],
                'odds_value' => $pickData['odds'],
                'amount_invested' => $pickData['amount_invested'] ?? 0,
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // Update performance counters
            $this->db->query("
                INSERT INTO user_performance (user_id, total_picks_created, last_updated)
                VALUES (?, 1, NOW())
                ON DUPLICATE KEY UPDATE 
                total_picks_created = total_picks_created + 1,
                last_updated = NOW()
            ", [$userId]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error tracking pick creation", [
                'user_id' => $userId,
                'pick_data' => $pickData,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Track pick purchase
     */
    public function trackPickPurchase($userId, $purchaseData) {
        try {
            // Insert into analytics
            $this->db->insert('pick_performance_analytics', [
                'user_id' => $userId,
                'pick_id' => $purchaseData['pick_id'] ?? null,
                'accumulator_id' => $purchaseData['accumulator_id'],
                'pick_type' => 'purchased',
                'market_type' => $purchaseData['market_type'] ?? 'accumulator',
                'odds_value' => $purchaseData['odds'] ?? 1.0,
                'amount_invested' => $purchaseData['purchase_price'],
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // Update performance counters
            $this->db->query("
                INSERT INTO user_performance (user_id, total_picks_purchased, total_amount_spent, last_updated)
                VALUES (?, 1, ?, NOW())
                ON DUPLICATE KEY UPDATE 
                total_picks_purchased = total_picks_purchased + 1,
                total_amount_spent = total_amount_spent + ?,
                last_updated = NOW()
            ", [$userId, $purchaseData['purchase_price'], $purchaseData['purchase_price']]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error tracking pick purchase", [
                'user_id' => $userId,
                'purchase_data' => $purchaseData,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Get user rankings
     */
    public function getUserRankings($category = 'overall', $limit = 100) {
        try {
            $whereClause = "WHERE up.total_picks_created >= 10"; // Minimum picks for ranking
            $orderBy = "ORDER BY up.roi_percentage DESC";
            
            switch ($category) {
                case 'monthly':
                    $whereClause .= " AND up.last_updated >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                    $orderBy = "ORDER BY up.roi_percentage DESC";
                    break;
                case 'weekly':
                    $whereClause .= " AND up.last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                    $orderBy = "ORDER BY up.roi_percentage DESC";
                    break;
                case 'win_rate':
                    $orderBy = "ORDER BY up.win_rate_percentage DESC, up.total_picks_created DESC";
                    break;
                case 'most_profitable':
                    $orderBy = "ORDER BY up.total_amount_earned DESC";
                    break;
            }
            
            $rankings = $this->db->fetchAll("
                SELECT 
                    up.user_id,
                    u.username as display_name,
                    up.roi_percentage,
                    up.win_rate_percentage,
                    up.total_picks_created,
                    up.total_picks_won,
                    up.total_amount_earned,
                    up.total_amount_spent,
                    up.average_odds,
                    ROW_NUMBER() OVER ({$orderBy}) as rank_position
                FROM user_performance up
                JOIN users u ON up.user_id = u.id
                {$whereClause}
                {$orderBy}
                LIMIT ?
            ", [$limit]);
            
            return $rankings ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user rankings", [
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get user's ranking position
     */
    public function getUserRankingPosition($userId, $category = 'overall') {
        try {
            $rankings = $this->getUserRankings($category, 1000); // Get more rankings for accurate position
            
            foreach ($rankings as $index => $ranking) {
                if ($ranking['user_id'] == $userId) {
                    return [
                        'position' => $index + 1,
                        'total_users' => count($rankings),
                        'percentile' => round((1 - ($index / count($rankings))) * 100, 1)
                    ];
                }
            }
            
            return [
                'position' => null,
                'total_users' => count($rankings),
                'percentile' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user ranking position", [
                'user_id' => $userId,
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Update tipster rankings
     */
    public function updateTipsterRankings($category = 'overall') {
        try {
            $rankings = $this->getUserRankings($category, 1000);
            
            foreach ($rankings as $index => $ranking) {
                $position = $index + 1;
                
                // Insert or update ranking
                $this->db->query("
                    INSERT INTO tipster_rankings (user_id, rank_position, category, roi_ranking, win_rate_ranking, total_picks_ranking, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    rank_position = VALUES(rank_position),
                    roi_ranking = VALUES(roi_ranking),
                    win_rate_ranking = VALUES(win_rate_ranking),
                    total_picks_ranking = VALUES(total_picks_ranking),
                    last_updated = NOW()
                ", [
                    $ranking['user_id'],
                    $position,
                    $category,
                    $position,
                    $position, // Simplified for now
                    $position  // Simplified for now
                ]);
            }
            
            $this->logger->info("Tipster rankings updated", [
                'category' => $category,
                'total_rankings' => count($rankings)
            ]);
            
            return [
                'success' => true,
                'total_rankings' => count($rankings)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error updating tipster rankings", [
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get performance analytics
     */
    public function getPerformanceAnalytics($userId, $timeframe = '30') {
        try {
            $analytics = $this->db->fetchAll("
                SELECT 
                    DATE(created_at) as date,
                    pick_type,
                    market_type,
                    COUNT(*) as picks_count,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_count,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_count,
                    AVG(odds_value) as avg_odds,
                    SUM(amount_invested) as total_invested,
                    SUM(amount_returned) as total_returned
                FROM pick_performance_analytics
                WHERE user_id = ? 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(created_at), pick_type, market_type
                ORDER BY date DESC
            ", [$userId, $timeframe]);
            
            return $analytics ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting performance analytics", [
                'user_id' => $userId,
                'timeframe' => $timeframe,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}
?>
