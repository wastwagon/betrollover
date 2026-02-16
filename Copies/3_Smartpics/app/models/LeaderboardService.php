<?php
/**
 * SmartPicks Pro - Leaderboard Service
 * Handles tipster rankings and performance metrics
 */

class LeaderboardService {
    
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
     * Get all-time leaderboard (alias for getLeaderboard with 'all' period)
     */
    public function getAllTimeLeaderboard($limit = 50) {
        return $this->getLeaderboard('all', $limit);
    }
    
    /**
     * Get tipster leaderboard
     */
    public function getLeaderboard($period = 'all', $limit = 50) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            $query = "
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    COUNT(at.id) as total_picks,
                    SUM(CASE WHEN COALESCE(at.result, 'pending') = 'won' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN COALESCE(at.result, 'pending') = 'lost' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN COALESCE(at.result, 'pending') = 'void' THEN 1 ELSE 0 END) as voids,
                    SUM(CASE WHEN COALESCE(at.result, 'pending') = 'won' THEN at.total_odds ELSE 0 END) as total_odds_won,
                    AVG(CASE WHEN COALESCE(at.result, 'pending') = 'won' THEN at.total_odds ELSE NULL END) as avg_winning_odds,
                    SUM(at.purchases) as total_purchases,
                    SUM(at.views) as total_views,
                    SUM(CASE WHEN COALESCE(at.result, 'pending') = 'won' THEN at.price ELSE 0 END) as total_earnings,
                    0 as win_rate,
                    COUNT(at.id) as tipster_total_picks
                FROM users u
                LEFT JOIN accumulator_tickets at ON u.id = at.user_id {$dateFilter}
                WHERE u.role = 'tipster' AND u.status = 'active'
                GROUP BY u.id, u.username, u.display_name, u.avatar
                ORDER BY 
                    (SUM(CASE WHEN at.result = 'won' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN at.result IN ('won', 'lost') THEN 1 ELSE 0 END), 0)) DESC,
                    total_picks DESC,
                    total_earnings DESC
                LIMIT ?
            ";
            
            $leaderboard = $this->db->fetchAll($query, [$limit]);
            
            // Calculate additional metrics
            foreach ($leaderboard as &$tipster) {
                $tipster['win_rate'] = $this->calculateWinRate($tipster['wins'], $tipster['losses']);
                $tipster['roi'] = $this->calculateROI($tipster['wins'], $tipster['losses']);
                $tipster['profit_loss'] = $this->calculateProfitLoss($tipster['wins'], $tipster['losses'], $tipster['total_odds_won']);
                $tipster['rank'] = $this->getRank($tipster, $leaderboard);
                $tipster['tier'] = $this->calculateTier($tipster['win_rate'], $tipster['total_picks']);
            }
            
            return $leaderboard;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting leaderboard", [
                'period' => $period,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get top performers by category
     */
    public function getTopPerformers($category = 'win_rate', $limit = 10) {
        try {
            $dateFilter = $this->getDateFilter('all');
            
            $orderBy = match($category) {
                'win_rate' => '(SUM(CASE WHEN at.result = "won" THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN at.result IN ("won", "lost") THEN 1 ELSE 0 END), 0)) DESC',
                'total_earnings' => 'SUM(CASE WHEN at.result = "won" THEN at.price ELSE 0 END) DESC',
                'total_picks' => 'COUNT(at.id) DESC',
                'roi' => '((SUM(CASE WHEN at.result = "won" THEN 1 ELSE 0 END) - SUM(CASE WHEN at.result = "lost" THEN 1 ELSE 0 END)) / NULLIF(SUM(CASE WHEN at.result IN ("won", "lost") THEN 1 ELSE 0 END), 0)) DESC',
                default => '(SUM(CASE WHEN at.result = "won" THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN at.result IN ("won", "lost") THEN 1 ELSE 0 END), 0)) DESC'
            };
            
            $query = "
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    COUNT(at.id) as total_picks,
                    SUM(CASE WHEN at.result = 'won' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN at.result = 'lost' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN at.result = 'void' THEN 1 ELSE 0 END) as voids,
                    SUM(at.purchases) as total_purchases,
                    SUM(at.views) as total_views,
                    SUM(CASE WHEN at.result = 'won' THEN at.price ELSE 0 END) as total_earnings
                FROM users u
                LEFT JOIN accumulator_tickets at ON u.id = at.user_id {$dateFilter}
                WHERE u.role = 'tipster' AND u.status = 'active'
                GROUP BY u.id, u.username, u.display_name, u.avatar
                ORDER BY {$orderBy}
                LIMIT ?
            ";
            
            $performers = $this->db->fetchAll($query, [$limit]);
            
            // Calculate metrics
            foreach ($performers as &$performer) {
                $performer['win_rate'] = $this->calculateWinRate($performer['wins'], $performer['losses']);
                $performer['roi'] = $this->calculateROI($performer['wins'], $performer['losses']);
                $performer['tier'] = $this->calculateTier($performer['win_rate'], $performer['total_picks']);
            }
            
            return $performers;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting top performers", [
                'category' => $category,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get tipster statistics
     */
    public function getTipsterStats($tipsterId, $period = 'all') {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(p.id) as total_picks,
                    SUM(CASE WHEN p.result = 'won' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN p.result = 'lost' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN p.result = 'void' THEN 1 ELSE 0 END) as voids,
                    SUM(p.purchases) as total_purchases,
                    SUM(p.views) as total_views,
                    SUM(te.amount) as total_earnings,
                    AVG(CASE WHEN p.result = 'won' THEN p.odds ELSE NULL END) as avg_winning_odds,
                    MAX(p.odds) as highest_odds,
                    MIN(p.odds) as lowest_odds
                FROM picks p
                LEFT JOIN tipster_earnings te ON p.id = te.pick_id {$dateFilter}
                WHERE p.tipster_id = ? AND p.status = 'approved'
            ", [$tipsterId]);
            
            if ($stats) {
                $stats['win_rate'] = $this->calculateWinRate($stats['wins'], $stats['losses']);
                $stats['roi'] = $this->calculateROI($stats['wins'], $stats['losses']);
                $stats['profit_loss'] = $this->calculateProfitLoss($stats['wins'], $stats['losses']);
                $stats['tier'] = $this->calculateTier($stats['win_rate'], $stats['total_picks']);
            }
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting tipster stats", [
                'tipster_id' => $tipsterId,
                'period' => $period,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Calculate win rate
     */
    private function calculateWinRate($wins, $losses) {
        $total = $wins + $losses;
        return $total > 0 ? round(($wins / $total) * 100, 1) : 0;
    }
    
    /**
     * Calculate ROI
     */
    private function calculateROI($wins, $losses) {
        $total = $wins + $losses;
        return $total > 0 ? round((($wins - $losses) / $total) * 100, 1) : 0;
    }
    
    /**
     * Calculate profit/loss
     */
    private function calculateProfitLoss($wins, $losses, $totalOddsWon = 0) {
        return $totalOddsWon - $losses; // Simplified calculation
    }
    
    /**
     * Calculate tipster tier
     */
    private function calculateTier($winRate, $totalPicks) {
        if ($totalPicks < 10) return 'Bronze';
        if ($totalPicks < 25) {
            return $winRate >= 70 ? 'Silver' : 'Bronze';
        }
        if ($totalPicks < 50) {
            if ($winRate >= 75) return 'Gold';
            if ($winRate >= 65) return 'Silver';
            return 'Bronze';
        }
        if ($winRate >= 80) return 'Platinum';
        if ($winRate >= 70) return 'Gold';
        if ($winRate >= 60) return 'Silver';
        return 'Bronze';
    }
    
    /**
     * Get rank in leaderboard
     */
    private function getRank($tipster, $leaderboard) {
        $rank = 1;
        foreach ($leaderboard as $index => $other) {
            if ($other['id'] === $tipster['id']) {
                $rank = $index + 1;
                break;
            }
        }
        return $rank;
    }
    
    /**
     * Get date filter for period
     */
    private function getDateFilter($period) {
        return match($period) {
            'today' => "AND DATE(p.created_at) = CURDATE()",
            'week' => "AND p.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)",
            'month' => "AND p.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)",
            'year' => "AND YEAR(p.created_at) = YEAR(NOW())",
            default => ""
        };
    }
    
    /**
     * Get trending tipsters (recent performance)
     */
    public function getTrendingTipsters($limit = 10) {
        try {
            $query = "
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    COUNT(p.id) as recent_picks,
                    SUM(CASE WHEN p.result = 'won' THEN 1 ELSE 0 END) as recent_wins,
                    SUM(CASE WHEN p.result = 'lost' THEN 1 ELSE 0 END) as recent_losses,
                    AVG(p.views) as avg_views,
                    SUM(p.purchases) as recent_purchases
                FROM users u
                LEFT JOIN picks p ON u.id = p.tipster_id 
                    AND p.status = 'approved' 
                    AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                WHERE u.role IN ('tipster', 'admin') AND u.status = 'active'
                GROUP BY u.id, u.username, u.display_name, u.avatar
                HAVING recent_picks >= 3
                ORDER BY recent_wins DESC, avg_views DESC
                LIMIT ?
            ";
            
            $trending = $this->db->fetchAll($query, [$limit]);
            
            foreach ($trending as &$tipster) {
                $tipster['recent_win_rate'] = $this->calculateWinRate($tipster['recent_wins'], $tipster['recent_losses']);
            }
            
            return $trending;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting trending tipsters", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Update tipster profile statistics
     */
    public function updateTipsterProfile($tipsterId) {
        try {
            $stats = $this->getTipsterStats($tipsterId, 'all');
            
            if ($stats) {
                // Update or insert tipster profile
                $this->db->query("
                    INSERT INTO tipster_profiles 
                    (user_id, win_rate, total_picks, total_wins, total_losses, total_voids, monthly_earnings, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                    win_rate = VALUES(win_rate),
                    total_picks = VALUES(total_picks),
                    total_wins = VALUES(total_wins),
                    total_losses = VALUES(total_losses),
                    total_voids = VALUES(total_voids),
                    monthly_earnings = VALUES(monthly_earnings),
                    updated_at = NOW()
                ", [
                    $tipsterId,
                    $stats['win_rate'],
                    $stats['total_picks'],
                    $stats['wins'],
                    $stats['losses'],
                    $stats['voids'],
                    $stats['total_earnings']
                ]);
                
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->logger->error("Error updating tipster profile", [
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
?>
