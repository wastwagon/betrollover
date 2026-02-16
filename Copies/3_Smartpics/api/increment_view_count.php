<?php
/**
 * Increment View Count API
 * Increments the view count for a marketplace pick
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../app/models/Database.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    
    $accumulatorId = intval($_GET['accumulator_id'] ?? 0);
    
    if (!$accumulatorId) {
        throw new Exception('Accumulator ID is required');
    }
    
    // Increment view count for this marketplace entry
    $result = $db->query("
        UPDATE pick_marketplace 
        SET view_count = COALESCE(view_count, 0) + 1,
            updated_at = NOW()
        WHERE accumulator_id = ?
    ", [$accumulatorId]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'View count incremented'
        ]);
    } else {
        throw new Exception('Failed to increment view count');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

