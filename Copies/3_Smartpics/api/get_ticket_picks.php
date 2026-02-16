<?php
/**
 * API: Get Ticket Picks
 * Returns ticket information and individual picks for settlement
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../app/models/Database.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance();
    
    $ticketId = intval($_GET['ticket_id'] ?? 0);
    
    if (!$ticketId) {
        throw new Exception('Ticket ID is required');
    }
    
    // Get ticket information
    $ticket = $db->fetch("
        SELECT 
            at.*,
            u.username as tipster_name,
            u.display_name as tipster_display_name
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        WHERE at.id = ?
    ", [$ticketId]);
    
    if (!$ticket) {
        throw new Exception('Ticket not found');
    }
    
    // Get individual picks
    $picks = $db->fetchAll("
        SELECT 
            id,
            match_description,
            prediction,
            odds,
            match_date,
            match_time
        FROM accumulator_picks
        WHERE accumulator_id = ?
        ORDER BY id
    ", [$ticketId]);
    
    echo json_encode([
        'success' => true,
        'ticket' => $ticket,
        'picks' => $picks
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
