<?php
/**
 * Send Chat Message API
 * Handles sending new chat messages via AJAX
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';

header('Content-Type: application/json');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$response = ['success' => false, 'message' => ''];

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    $response['message'] = 'You must be logged in to send messages.';
    echo json_encode($response);
    exit;
}

$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];

try {
    // Get user info
    $user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);
    
    if (!$user) {
        $response['message'] = 'User not found.';
        echo json_encode($response);
        exit;
    }
    
    // Check if user is suspended
    if ($user['status'] === 'suspended') {
        $response['message'] = 'Your account is suspended. You cannot send messages.';
        echo json_encode($response);
        exit;
    }
    
    // Get message from POST data
    $message = trim($_POST['message'] ?? '');
    
    if (empty($message)) {
        $response['message'] = 'Message cannot be empty.';
        echo json_encode($response);
        exit;
    }
    
    if (strlen($message) > 500) {
        $response['message'] = 'Message cannot be longer than 500 characters.';
        echo json_encode($response);
        exit;
    }
    
    // Insert message
    $db->query("
        INSERT INTO chat_messages (user_id, message, type, is_public, created_at) 
        VALUES (?, ?, 'text', 1, NOW())
    ", [$userId, $message]);
    
    // Update user's last activity
    $db->query("UPDATE users SET last_login = NOW() WHERE id = ?", [$userId]);
    
    $response['success'] = true;
    $response['message'] = 'Message sent successfully!';
    
    // Log the message
    $logger->info("Chat message sent via API", [
        'user_id' => $userId,
        'message_length' => strlen($message)
    ]);
    
} catch (Exception $e) {
    $response['message'] = 'Error sending message: ' . $e->getMessage();
    $logger->error('Chat message API error', ['error' => $e->getMessage()]);
}

echo json_encode($response);
?>

