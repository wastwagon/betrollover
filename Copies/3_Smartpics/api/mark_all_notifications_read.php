<?php
/**
 * Mark All Notifications as Read API
 * Marks all notifications for the current user as read
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
require_once APP_PATH . '/models/NotificationService.php';

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$notificationService = NotificationService::getInstance();

try {
    // Mark all notifications as read using NotificationService
    $notificationService->markAllAsRead($userId);
    
    echo json_encode([
        'success' => true,
        'message' => 'All notifications marked as read'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('Mark all notifications read API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Failed to mark all notifications as read',
        'message' => $e->getMessage()
    ]);
}
?>

