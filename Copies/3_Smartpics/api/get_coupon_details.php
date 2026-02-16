<?php
/**
 * Get Coupon Details API
 * Returns detailed information about a coupon including all individual picks
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Define paths
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__ . '/..');
}
if (!defined('APP_PATH')) {
    define('APP_PATH', ROOT_PATH . '/app');
}
if (!defined('CONFIG_PATH')) {
    define('CONFIG_PATH', ROOT_PATH . '/config');
}

// Load configuration
require_once CONFIG_PATH . '/config.php';
require_once APP_PATH . '/models/Database.php';
require_once APP_PATH . '/models/Logger.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    $logger = Logger::getInstance();
    
    $accumulatorId = intval($_GET['accumulator_id'] ?? 0);
    
    if (!$accumulatorId) {
        throw new Exception('Accumulator ID is required');
    }
    
    // Get coupon details with marketplace price
    $coupon = $db->fetch("
        SELECT 
            at.*,
            u.display_name as tipster_name,
            u.username,
            COALESCE(pm.price, 0.00) as price,
            pm.status as marketplace_status,
            pm.purchase_count,
            pm.view_count
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        LEFT JOIN pick_marketplace pm ON pm.accumulator_id = at.id
        WHERE at.id = ?
    ", [$accumulatorId]);
    
    if (!$coupon) {
        throw new Exception('Coupon not found');
    }
    
    // Get individual picks (including match type)
    $picks = $db->fetchAll("
        SELECT 
            ap.*,
            COALESCE(ap.match_type, 'league') as match_type,
            COALESCE(ap.home_team_type, 'club') as home_team_type,
            COALESCE(ap.away_team_type, 'club') as away_team_type
        FROM accumulator_picks ap
        WHERE ap.accumulator_id = ?
        ORDER BY ap.match_date ASC
    ", [$accumulatorId]);
    
    if (empty($picks)) {
        throw new Exception('No picks found for this coupon');
    }
    
    echo json_encode([
        'success' => true,
        'coupon' => $coupon,
        'picks' => $picks
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    
    // Log the error
    if (isset($logger)) {
        $logger->error('Get coupon details API error', [
            'accumulator_id' => $accumulatorId ?? 0,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    } else {
        error_log('Get coupon details API error: ' . $e->getMessage());
    }
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'Failed to load coupon details'
    ]);
}
?>
