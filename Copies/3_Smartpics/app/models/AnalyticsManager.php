<?php
/**
 * SmartPicks Pro - Analytics Manager
 * 
 * Handles comprehensive analytics and reporting for users and admins
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class AnalyticsManager {
    
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
     * Get user performance analytics
     */
    public function getUserAnalytics($userId, $period = '30_days') {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            // Basic pick statistics
            $pickStats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_picks,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_picks,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_picks,
                    SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_picks,
                    SUM(CASE WHEN status = 'active' AND is_marketplace = 1 THEN 1 ELSE 0 END) as marketplace_picks,
                    SUM(views) as total_views,
                    SUM(purchases) as total_purchases,
                    SUM(CASE WHEN status = 'won' THEN price ELSE 0 END) as total_earnings,
                    AVG(confidence_level) as avg_confidence
                FROM accumulator_tickets 
                WHERE user_id = ? AND created_at >= ?
            ", [$userId, $dateFilter]);
            
            // Calculate success rate
            $totalSettled = ($pickStats['won_picks'] ?? 0) + ($pickStats['lost_picks'] ?? 0);
            $pickStats['success_rate'] = $totalSettled > 0 ? round((($pickStats['won_picks'] ?? 0) / $totalSettled) * 100, 1) : 0;
            
            // Calculate ROI
            $totalInvested = $pickStats['total_picks'] * 10; // Assuming 10 GHS per pick
            $pickStats['roi'] = $totalInvested > 0 ? round((($pickStats['total_earnings'] ?? 0) / $totalInvested) * 100, 1) : 0;
            
            // Monthly performance
            $monthlyPerformance = $this->getMonthlyPerformance($userId, $period);
            
            // Top performing picks
            $topPicks = $this->getTopPerformingPicks($userId, $period);
            
            // Performance trends
            $performanceTrends = $this->getPerformanceTrends($userId, $period);
            
            return [
                'pick_stats' => $pickStats,
                'monthly_performance' => $monthlyPerformance,
                'top_picks' => $topPicks,
                'performance_trends' => $performanceTrends,
                'period' => $period
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user analytics", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            
            return [
                'pick_stats' => [],
                'monthly_performance' => [],
                'top_picks' => [],
                'performance_trends' => [],
                'period' => $period
            ];
        }
    }
    
    /**
     * Get platform analytics (admin only)
     */
    public function getPlatformAnalytics($period = '30_days') {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            // Platform statistics
            $platformStats = $this->db->fetch("
                SELECT 
                    COUNT(DISTINCT u.id) as total_users,
                    COUNT(DISTINCT CASE WHEN u.created_at >= ? THEN u.id END) as new_users,
                    COUNT(*) as total_picks,
                    SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) as won_picks,
                    SUM(CASE WHEN at.status = 'lost' THEN 1 ELSE 0 END) as lost_picks,
                    SUM(CASE WHEN at.status = 'pending_approval' THEN 1 ELSE 0 END) as pending_picks,
                    SUM(CASE WHEN at.is_marketplace = 1 THEN 1 ELSE 0 END) as marketplace_picks,
                    SUM(at.views) as total_views,
                    SUM(at.purchases) as total_purchases,
                    SUM(CASE WHEN at.status = 'won' THEN at.price ELSE 0 END) as total_earnings
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                WHERE at.created_at >= ?
            ", [$dateFilter, $dateFilter]);
            
            // Financial analytics
            $financialStats = $this->getFinancialAnalytics($period);
            
            // User activity analytics
            $userActivity = $this->getUserActivityAnalytics($period);
            
            // Pick performance analytics
            $pickPerformance = $this->getPickPerformanceAnalytics($period);
            
            // Revenue analytics
            $revenueAnalytics = $this->getRevenueAnalytics($period);
            
            return [
                'platform_stats' => $platformStats,
                'financial_stats' => $financialStats,
                'user_activity' => $userActivity,
                'pick_performance' => $pickPerformance,
                'revenue_analytics' => $revenueAnalytics,
                'period' => $period
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting platform analytics", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'platform_stats' => [],
                'financial_stats' => [],
                'user_activity' => [],
                'pick_performance' => [],
                'revenue_analytics' => [],
                'period' => $period
            ];
        }
    }
    
    /**
     * Get leaderboard data
     */
    public function getLeaderboard($period = '30_days', $limit = 50) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetchAll("
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    COUNT(at.id) as total_picks,
                    SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) as won_picks,
                    SUM(CASE WHEN at.status = 'lost' THEN 1 ELSE 0 END) as lost_picks,
                    ROUND(
                        (SUM(CASE WHEN at.status = 'won' THEN 1 ELSE 0 END) / 
                         NULLIF(SUM(CASE WHEN at.status IN ('won', 'lost') THEN 1 ELSE 0 END), 0)) * 100, 1
                    ) as success_rate,
                    SUM(at.views) as total_views,
                    SUM(at.purchases) as total_purchases,
                    SUM(CASE WHEN at.status = 'won' THEN at.price ELSE 0 END) as total_earnings,
                    AVG(at.confidence_level) as avg_confidence
                FROM users u
                JOIN accumulator_tickets at ON u.id = at.user_id
                WHERE at.created_at >= ?
                GROUP BY u.id, u.username, u.display_name
                HAVING total_picks > 0
                ORDER BY success_rate DESC, total_earnings DESC, total_picks DESC
                LIMIT ?
            ", [$dateFilter, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting leaderboard", [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }
    
    /**
     * Get user's monthly performance
     */
    private function getMonthlyPerformance($userId, $period) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetchAll("
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as picks_created,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as picks_won,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as picks_lost,
                    SUM(views) as total_views,
                    SUM(purchases) as total_purchases,
                    SUM(CASE WHEN status = 'won' THEN price ELSE 0 END) as earnings
                FROM accumulator_tickets 
                WHERE user_id = ? AND created_at >= ?
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC
            ", [$userId, $dateFilter]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get top performing picks
     */
    private function getTopPerformingPicks($userId, $period, $limit = 5) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetchAll("
                SELECT 
                    id,
                    title,
                    total_odds,
                    price,
                    status,
                    views,
                    purchases,
                    confidence_level,
                    created_at
                FROM accumulator_tickets 
                WHERE user_id = ? AND created_at >= ?
                ORDER BY 
                    CASE WHEN status = 'won' THEN 1 ELSE 0 END DESC,
                    purchases DESC,
                    views DESC
                LIMIT ?
            ", [$userId, $dateFilter, $limit]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get performance trends
     */
    private function getPerformanceTrends($userId, $period) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetchAll("
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as picks_created,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as picks_won,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as picks_lost,
                    SUM(views) as views,
                    SUM(purchases) as purchases
                FROM accumulator_tickets 
                WHERE user_id = ? AND created_at >= ?
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            ", [$userId, $dateFilter]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get financial analytics
     */
    private function getFinancialAnalytics($period) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetch("
                SELECT 
                    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_purchases,
                    SUM(CASE WHEN type = 'commission' THEN amount ELSE 0 END) as total_commissions,
                    SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) as total_refunds,
                    COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchase_count,
                    COUNT(CASE WHEN type = 'commission' THEN 1 END) as commission_count,
                    COUNT(CASE WHEN type = 'refund' THEN 1 END) as refund_count
                FROM wallet_transactions 
                WHERE created_at >= ?
            ", [$dateFilter]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get user activity analytics
     */
    private function getUserActivityAnalytics($period) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetchAll("
                SELECT 
                    DATE(created_at) as date,
                    COUNT(DISTINCT user_id) as active_users,
                    COUNT(*) as total_activity
                FROM (
                    SELECT user_id, created_at FROM accumulator_tickets WHERE created_at >= ?
                    UNION ALL
                    SELECT user_id, purchase_date as created_at FROM user_purchased_picks WHERE purchase_date >= ?
                ) activity
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            ", [$dateFilter, $dateFilter]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get pick performance analytics
     */
    private function getPickPerformanceAnalytics($period) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetch("
                SELECT 
                    AVG(total_odds) as avg_odds,
                    AVG(confidence_level) as avg_confidence,
                    AVG(views) as avg_views,
                    AVG(purchases) as avg_purchases,
                    AVG(price) as avg_price,
                    COUNT(CASE WHEN total_odds > 2.0 THEN 1 END) as high_odds_picks,
                    COUNT(CASE WHEN confidence_level > 80 THEN 1 END) as high_confidence_picks
                FROM accumulator_tickets 
                WHERE created_at >= ?
            ", [$dateFilter]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get pick analytics for a specific user
     */
    public function getPickAnalytics($userId, $period = '30_days') {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetch("
                SELECT 
                    COUNT(*) as total_picks,
                    SUM(views) as total_views,
                    SUM(purchases) as total_purchases,
                    SUM(CASE WHEN purchases > 0 THEN views / purchases ELSE 0 END) as conversion_rate,
                    AVG(price) as avg_price,
                    SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_picks,
                    SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_picks,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_picks
                FROM accumulator_tickets 
                WHERE user_id = ? AND created_at >= ?
            ", [$userId, $dateFilter]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting pick analytics", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Get financial analytics for a specific user
     */
    public function getFinancialAnalytics($userId, $period = '30_days') {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetch("
                SELECT 
                    SUM(CASE WHEN type = 'commission' THEN amount ELSE 0 END) as commission,
                    SUM(CASE WHEN type = 'purchase' THEN ABS(amount) ELSE 0 END) as pick_sales,
                    SUM(CASE WHEN type = 'platform_fee' THEN ABS(amount) ELSE 0 END) as platform_fees,
                    SUM(CASE WHEN type = 'commission' THEN amount ELSE 0 END) - 
                    SUM(CASE WHEN type = 'platform_fee' THEN ABS(amount) ELSE 0 END) as net_earnings
                FROM wallet_transactions 
                WHERE user_id = ? AND created_at >= ?
            ", [$userId, $dateFilter]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting financial analytics", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }

    /**
     * Get revenue analytics
     */
    private function getRevenueAnalytics($period) {
        try {
            $dateFilter = $this->getDateFilter($period);
            
            return $this->db->fetch("
                SELECT 
                    SUM(CASE WHEN type = 'commission' THEN amount ELSE 0 END) as platform_revenue,
                    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_volume,
                    COUNT(CASE WHEN type = 'commission' THEN 1 END) as commission_transactions,
                    AVG(CASE WHEN type = 'commission' THEN amount ELSE NULL END) as avg_commission
                FROM wallet_transactions 
                WHERE created_at >= ?
            ", [$dateFilter]);
            
        } catch (Exception $e) {
            return [];
        }
    }
    
    /**
     * Get date filter for period
     */
    private function getDateFilter($period) {
        switch ($period) {
            case '7_days':
                return date('Y-m-d H:i:s', strtotime('-7 days'));
            case '30_days':
                return date('Y-m-d H:i:s', strtotime('-30 days'));
            case '90_days':
                return date('Y-m-d H:i:s', strtotime('-90 days'));
            case '1_year':
                return date('Y-m-d H:i:s', strtotime('-1 year'));
            case 'all_time':
                return '1970-01-01 00:00:00';
            default:
                return date('Y-m-d H:i:s', strtotime('-30 days'));
        }
    }
    
    /**
     * Export analytics data
     */
    public function exportAnalytics($userId, $type, $period = '30_days', $format = 'json') {
        try {
            $data = [];
            
            if ($type === 'user') {
                $data = $this->getUserAnalytics($userId, $period);
            } elseif ($type === 'platform') {
                $data = $this->getPlatformAnalytics($period);
            }
            
            if ($format === 'json') {
                return json_encode($data, JSON_PRETTY_PRINT);
            } elseif ($format === 'csv') {
                return $this->convertToCSV($data);
            }
            
            return $data;
            
        } catch (Exception $e) {
            $this->logger->error("Error exporting analytics", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'type' => $type
            ]);
            
            return null;
        }
    }
    
    /**
     * Convert data to CSV format
     */
    private function convertToCSV($data) {
        // Implementation for CSV conversion
        // This would convert the analytics data to CSV format
        return "CSV export functionality would be implemented here";
    }
}
?>
