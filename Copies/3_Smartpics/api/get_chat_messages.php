<?php
/**
 * Chat Messages API
 * Returns recent chat messages for real-time updates
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';

header('Content-Type: application/json');

$db = Database::getInstance();
$response = ['success' => false, 'messages' => []];

try {
    // Get recent chat messages (last 50)
    $messages = $db->fetchAll("
        SELECT 
            cm.id,
            cm.user_id,
            cm.message,
            cm.created_at,
            cm.is_flagged,
            cm.is_deleted,
            cm.reaction_count,
            u.username,
            u.display_name,
            u.role,
            u.avatar
        FROM chat_messages cm
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE cm.is_deleted = 0 AND cm.is_public = 1
        ORDER BY cm.created_at DESC
        LIMIT 50
    ");
    
    // Reverse to show oldest first
    $messages = array_reverse($messages);
    
    $response['success'] = true;
    $response['messages'] = $messages;
    $response['count'] = count($messages);
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
    error_log("Chat messages API error: " . $e->getMessage());
}

echo json_encode($response);
?>

