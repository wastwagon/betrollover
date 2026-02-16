<?php
/**
 * BetRollover - Mark Notification as Read API
 */

session_start();

// Define paths
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__ . '/..');
}
define('APP_PATH', ROOT_PATH . '/app');
define('CONFIG_PATH', ROOT_PATH . '/config');

// Load configuration
require_once CONFIG_PATH . '/config.php';
require_once APP_PATH . '/models/Database.php';
require_once APP_PATH . '/models/NotificationService.php';

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$notificationService = NotificationService::getInstance();

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $notificationId = $input['notification_id'] ?? $_POST['notification_id'] ?? null;
    $markAll = isset($input['mark_all']) && $input['mark_all'] === true;
    
    if ($markAll) {
        $notificationService->markAllAsRead($userId);
        echo json_encode(['success' => true, 'message' => 'All notifications marked as read']);
    } elseif ($notificationId) {
        $notificationService->markAsRead($userId, $notificationId);
        echo json_encode(['success' => true, 'message' => 'Notification marked as read']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing notification_id']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to mark notification as read', 'message' => $e->getMessage()]);
}

