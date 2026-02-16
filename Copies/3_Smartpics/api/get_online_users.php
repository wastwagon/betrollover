<?php
/**
 * Online Users API
 * Returns count of currently online users
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';

header('Content-Type: application/json');

$db = Database::getInstance();
$response = ['success' => false, 'count' => 0, 'users' => []];

try {
    // Get online users (active in last 5 minutes)
    $onlineUsers = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            u.role,
            u.avatar,
            u.last_login
        FROM users u
        WHERE u.last_login >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ORDER BY u.last_login DESC
    ");
    
    $response['success'] = true;
    $response['count'] = count($onlineUsers);
    $response['users'] = $onlineUsers;
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
    error_log("Online users API error: " . $e->getMessage());
}

echo json_encode($response);
?>

