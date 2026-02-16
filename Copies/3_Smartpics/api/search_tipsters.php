<?php
/**
 * API endpoint for searching tipsters
 * Returns tipster suggestions with performance metrics
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../app/models/Database.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    $query = $_GET['q'] ?? '';
    
    if (strlen($query) < 2) {
        echo json_encode(['success' => true, 'tipsters' => []]);
        exit;
    }
    
    $searchTerm = '%' . $query . '%';
    
    $tipsters = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            COALESCE(tp_stats.total_picks, 0) as total_picks,
            COALESCE(tp_stats.won_picks, 0) as won_picks,
            COALESCE(tp_stats.lost_picks, 0) as lost_picks,
            CASE 
                WHEN (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0)) > 0 
                THEN ROUND((COALESCE(tp_stats.won_picks, 0) / (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0))) * 100, 1)
                ELSE 0 
            END as win_rate,
            CASE 
                WHEN (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0)) > 0 
                THEN ROUND(((COALESCE(tp_stats.won_picks, 0) - COALESCE(tp_stats.lost_picks, 0)) / (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0))) * 100, 1)
                ELSE 0 
            END as roi
        FROM users u
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_picks,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_picks,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_picks
            FROM accumulator_tickets 
            WHERE status IN ('won', 'lost')
            GROUP BY user_id
        ) tp_stats ON u.id = tp_stats.user_id
        WHERE u.role = 'tipster' 
        AND (u.username LIKE ? OR u.display_name LIKE ?)
        ORDER BY 
            CASE 
                WHEN (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0)) > 0 
                THEN ROUND((COALESCE(tp_stats.won_picks, 0) / (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0))) * 100, 1)
                ELSE 0 
            END DESC,
            u.username ASC
        LIMIT 10
    ", [$searchTerm, $searchTerm]);
    
    echo json_encode([
        'success' => true,
        'tipsters' => $tipsters
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

