<?php
/**
 * BetRollover - Get Notifications API
 * Returns user notifications for real-time updates
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
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$notificationService = NotificationService::getInstance();

try {
    // Get parameters
    $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $since = isset($_GET['since']) ? $_GET['since'] : null;
    
    // Get notifications
    if ($since) {
        // Get notifications since a specific timestamp (for real-time polling)
        $notifications = $notificationService->getUserNotifications($userId, $limit, $unreadOnly);
        $notifications = array_filter($notifications, function($n) use ($since) {
            return strtotime($n['created_at']) > strtotime($since);
        });
        $notifications = array_values($notifications);
    } else {
        $notifications = $notificationService->getUserNotifications($userId, $limit, $unreadOnly);
    }
    
    // Get unread count
    $unreadCount = $notificationService->getUnreadCount($userId);
    
    // Format notifications
    $formattedNotifications = array_map(function($n) {
        return [
            'id' => (int)$n['id'],
            'type' => $n['type'],
            'title' => $n['title'],
            'message' => $n['message'],
            'link' => $n['link'],
            'icon' => $n['icon'],
            'priority' => $n['priority'],
            'is_read' => (bool)$n['is_read'],
            'created_at' => $n['created_at'],
            'time_ago' => timeAgo($n['created_at']),
            'metadata' => $n['metadata'] ? json_decode($n['metadata'], true) : null
        ];
    }, $notifications);
    
    echo json_encode([
        'success' => true,
        'notifications' => $formattedNotifications,
        'unread_count' => $unreadCount,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log('Notification API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch notifications',
        'message' => $e->getMessage()
    ]);
}

function timeAgo($datetime) {
    if (empty($datetime)) {
        return 'just now';
    }
    
    try {
        // Get configured timezone
        $timezone = config('timezone', 'Africa/Accra');
        
        // Create current time in app timezone
        $now = new DateTime('now', new DateTimeZone($timezone));
        
        // Parse the notification datetime
        // MySQL timestamps are typically stored without timezone info
        // Try to parse as UTC first (most common database timezone), then convert to app timezone
        $then = null;
        
        // Try parsing as MySQL datetime format (Y-m-d H:i:s) assuming UTC
        $then = DateTime::createFromFormat('Y-m-d H:i:s', $datetime, new DateTimeZone('UTC'));
        
        if ($then === false) {
            // Try with microseconds
            $then = DateTime::createFromFormat('Y-m-d H:i:s.u', $datetime, new DateTimeZone('UTC'));
        }
        
        if ($then === false) {
            // Try parsing with strtotime (handles various formats)
            $timestamp = strtotime($datetime);
            if ($timestamp !== false) {
                $then = new DateTime('@' . $timestamp, new DateTimeZone('UTC'));
            }
        }
        
        if ($then === false) {
            // Last resort - try direct parsing
            try {
                $then = new DateTime($datetime, new DateTimeZone('UTC'));
            } catch (Exception $e) {
                return 'just now';
            }
        }
        
        // Convert from UTC to app timezone for comparison
        $then->setTimezone(new DateTimeZone($timezone));
        
        // Calculate difference in seconds
        $diff = $now->getTimestamp() - $then->getTimestamp();
        
        // Handle edge cases
        if ($diff < 0) return 'just now'; // Future dates
        if ($diff < 60) return 'just now';
        if ($diff < 3600) return floor($diff / 60) . 'm ago';
        if ($diff < 86400) return floor($diff / 3600) . 'h ago';
        if ($diff < 604800) return floor($diff / 86400) . 'd ago';
        return $then->format('M j, Y');
        
    } catch (Exception $e) {
        // Fallback: simple calculation using server time
        $timestamp = strtotime($datetime);
        if ($timestamp === false) {
            return 'just now';
        }
        $diff = time() - $timestamp;
        
        if ($diff < 0) return 'just now';
        if ($diff < 60) return 'just now';
        if ($diff < 3600) return floor($diff / 60) . 'm ago';
        if ($diff < 86400) return floor($diff / 3600) . 'h ago';
        if ($diff < 604800) return floor($diff / 86400) . 'd ago';
        return date('M j, Y', $timestamp);
    }
}

