<?php
/**
 * API endpoint to get detailed pick information
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../app/models/Database.php';

header('Content-Type: application/json');

$db = Database::getInstance();

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['pick_id'])) {
    $pickId = intval($_GET['pick_id']);
    
    try {
        // Get accumulator ticket details
        $pick = $db->fetch("
            SELECT 
                at.*,
                u.username as tipster_name,
                u.display_name as tipster_display_name
            FROM accumulator_tickets at
            JOIN users u ON at.user_id = u.id
            WHERE at.id = ?
        ", [$pickId]);
        
        if (!$pick) {
            echo json_encode(['success' => false, 'message' => 'Pick not found']);
            exit;
        }
        
        // Get individual picks within this accumulator
        $individualPicks = $db->fetchAll("
            SELECT 
                ap.*
            FROM accumulator_picks ap
            WHERE ap.accumulator_id = ?
            ORDER BY ap.match_date ASC
        ", [$pickId]);
        
        // Recalculate total odds if it seems incorrect (1.0 or missing)
        if (empty($pick['total_odds']) || floatval($pick['total_odds']) == 1.0) {
            $calculatedOdds = 1.0;
            foreach ($individualPicks as $individualPick) {
                $odds = floatval($individualPick['odds'] ?? 0);
                if ($odds > 0) {
                    $calculatedOdds *= $odds;
                }
            }
            
            // Update the pick if odds were recalculated
            if ($calculatedOdds != floatval($pick['total_odds'])) {
                $db->query("UPDATE accumulator_tickets SET total_odds = ?, updated_at = NOW() WHERE id = ?", 
                    [round($calculatedOdds, 3), $pickId]);
                $pick['total_odds'] = round($calculatedOdds, 3);
            }
        }
        
        // Get marketplace data if exists
        $marketplaceData = $db->fetch("
            SELECT 
                pm.*,
                COUNT(upp.id) as purchase_count
            FROM pick_marketplace pm
            LEFT JOIN user_purchased_picks upp ON pm.accumulator_id = upp.accumulator_id
            WHERE pm.accumulator_id = ?
            GROUP BY pm.id
        ", [$pickId]);
        
        echo json_encode([
            'success' => true,
            'pick' => $pick,
            'individual_picks' => $individualPicks,
            'marketplace' => $marketplaceData
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
?>