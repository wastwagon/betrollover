<?php
/**
 * Tipster Performance Service
 * Handles ROI calculations and performance metrics for tipsters
 */

class TipsterPerformanceService {
    private static $instance = null;
    private $db;
    
    private function __construct() {
        $this->db = Database::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Calculate ROI for a tipster based on actual odds
     * ROI = ((Total Potential Winnings - Total Stakes) / Total Stakes) * 100
     */
    public function calculateROI($tipsterId) {
        $roiData = $this->db->fetch("
            SELECT 
                SUM(CASE WHEN status = 'won' THEN total_odds ELSE 0 END) as total_winnings,
                SUM(CASE WHEN status IN ('won', 'lost') THEN 1 ELSE 0 END) as total_stakes,
                COUNT(CASE WHEN status = 'won' THEN 1 END) as won_count,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_count
            FROM accumulator_tickets 
            WHERE user_id = ? AND status IN ('won', 'lost')
        ", [$tipsterId]);
        
        if (!$roiData || $roiData['total_stakes'] == 0) {
            return 0;
        }
        
        // ROI = ((Total Winnings - Total Stakes) / Total Stakes) * 100
        $totalWinnings = $roiData['total_winnings'];
        $totalStakes = $roiData['total_stakes'];
        $roi = (($totalWinnings - $totalStakes) / $totalStakes) * 100;
        
        return round($roi, 2);
    }
    
    /**
     * Calculate Win Rate for a tipster
     * Win Rate = (Won Picks / Total Settled Picks) * 100
     */
    public function calculateWinRate($tipsterId) {
        $stats = $this->getTipsterStats($tipsterId);
        
        $totalSettledPicks = $stats['won'] + $stats['lost'];
        
        if ($totalSettledPicks == 0) {
            return 0;
        }
        
        $winRate = ($stats['won'] / $totalSettledPicks) * 100;
        return round($winRate, 2);
    }
    
    /**
     * Get comprehensive stats for a tipster
     */
    public function getTipsterStats($tipsterId) {
        $stats = $this->db->fetch("
            SELECT 
                COUNT(*) as total_picks,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'decline' THEN 1 ELSE 0 END) as declined,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost
            FROM accumulator_tickets 
            WHERE user_id = ?
        ", [$tipsterId]);
        
        return $stats ?: [
            'total_picks' => 0,
            'active' => 0,
            'pending' => 0,
            'declined' => 0,
            'won' => 0,
            'lost' => 0
        ];
    }
    
    /**
     * Get leaderboard data for all tipsters
     */
    public function getLeaderboard($limit = 10) {
        $tipsters = $this->db->fetchAll("
            SELECT 
                u.id,
                u.username,
                u.display_name,
                COUNT(at.id) as total_picks,
                SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) as won_picks,
                SUM(CASE WHEN at.status = 'lost' THEN 1 ELSE 0 END) as lost_picks,
                SUM(CASE WHEN at.status = 'active' THEN 1 ELSE 0 END) as active_picks,
                COALESCE(SUM(pm.purchase_count * pm.price), 0) as total_sales
            FROM users u
            LEFT JOIN accumulator_tickets at ON u.id = at.user_id
            LEFT JOIN pick_marketplace pm ON at.id = pm.accumulator_id
            WHERE u.role = 'tipster'
            GROUP BY u.id, u.username, u.display_name
            HAVING total_picks > 0
            ORDER BY 
                CASE 
                    WHEN (SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) + SUM(CASE WHEN at.status = 'lost' THEN 1 ELSE 0 END)) = 0 THEN 0
                    ELSE ((SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) - SUM(CASE WHEN at.status = 'lost' THEN 1 ELSE 0 END)) / (SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) + SUM(CASE WHEN at.status = 'lost' THEN 1 ELSE 0 END))) * 100
                END DESC,
                SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) DESC,
                COUNT(at.id) DESC
            LIMIT ?
        ", [$limit]);
        
        // Calculate ROI and Win Rate for each tipster
        foreach ($tipsters as &$tipster) {
            $tipster['roi'] = $this->calculateROI($tipster['id']);
            $tipster['win_rate'] = $this->calculateWinRate($tipster['id']);
        }
        
        return $tipsters;
    }
    
    /**
     * Get top performing tipsters
     */
    public function getTopPerformers($limit = 5) {
        return $this->getLeaderboard($limit);
    }
    
    /**
     * Check if tipster meets qualification requirements
     * Requirements: 20+ free picks with 20%+ ROI
     */
    public function checkQualification($tipsterId) {
        $stats = $this->getTipsterStats($tipsterId);
        
        // Count free picks (price = 0)
        $freePicks = $this->db->fetch("
            SELECT COUNT(*) as count
            FROM accumulator_tickets 
            WHERE user_id = ? AND price = 0 AND status IN ('won', 'lost')
        ", [$tipsterId])['count'];
        
        $roi = $this->calculateROI($tipsterId);
        
        return [
            'qualified' => $freePicks >= 20 && $roi >= 20,
            'free_picks' => $freePicks,
            'roi' => $roi,
            'required_free_picks' => 20,
            'required_roi' => 20
        ];
    }
}
?>
