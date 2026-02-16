<?php
/**
 * SmartPicks Pro - Chat API
 * 
 * Handles real-time chat operations via AJAX
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/ChatManager.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Set JSON header
header('Content-Type: application/json');

// Check authentication
try {
    AuthMiddleware::checkAuth();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$chat = ChatManager::getInstance();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'send_message':
            handleSendMessage();
            break;
        case 'get_messages':
            handleGetMessages();
            break;
        case 'upload_image':
            handleUploadImage();
            break;
        case 'delete_message':
            handleDeleteMessage();
            break;
        case 'clear_chat':
            handleClearChat();
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} catch (Exception $e) {
    $logger->error("Chat API error", ['error' => $e->getMessage()]);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function handleSendMessage() {
    global $chat;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $message = $input['message'] ?? '';
    $type = $input['type'] ?? 'text';
    
    if (empty(trim($message)) && $type === 'text') {
        echo json_encode(['success' => false, 'error' => 'Message cannot be empty']);
        return;
    }
    
    $messageId = $chat->sendMessage($_SESSION['user_id'], $message, $type);
    
    echo json_encode(['success' => true, 'message_id' => $messageId]);
}

function handleGetMessages() {
    global $chat;
    
    $lastId = $_GET['last_id'] ?? 0;
    
    $messages = $chat->getRecentMessages(50, 0);
    $newMessages = array_filter($messages, function($msg) use ($lastId) {
        return $msg['id'] > $lastId;
    });
    
    // Format messages for frontend
    $formattedMessages = array_map(function($msg) use ($chat) {
        return [
            'id' => $msg['id'],
            'user_id' => $msg['user_id'],
            'message' => $msg['message'],
            'type' => $msg['type'],
            'display_name' => $msg['display_name'],
            'username' => $msg['username'],
            'avatar' => $msg['avatar'],
            'country' => $msg['country'],
            'role' => $msg['role'],
            'is_verified' => $msg['is_verified'],
            'is_featured' => $msg['is_featured'],
            'time' => date('H:i', strtotime($msg['created_at'])),
            'user_badges' => $chat->getUserBadge($msg),
            'is_admin' => $_SESSION['role'] === 'admin'
        ];
    }, $newMessages);
    
    echo json_encode(['success' => true, 'messages' => $formattedMessages]);
}

function handleUploadImage() {
    global $chat;
    
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'No image uploaded']);
        return;
    }
    
    $file = $_FILES['image'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['success' => false, 'error' => 'Invalid file type']);
        return;
    }
    
    // Validate file size (max 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        echo json_encode(['success' => false, 'error' => 'File too large (max 5MB)']);
        return;
    }
    
    // Create upload directory if it doesn't exist
    $uploadDir = __DIR__ . '/../../storage/uploads/chat/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        // Save message with image
        $imageUrl = '/storage/uploads/chat/' . $filename;
        $messageId = $chat->sendMessage($_SESSION['user_id'], $imageUrl, 'image');
        
        echo json_encode(['success' => true, 'message_id' => $messageId, 'image_url' => $imageUrl]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to upload image']);
    }
}

function handleDeleteMessage() {
    global $chat;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $messageId = $input['message_id'] ?? 0;
    
    if ($_SESSION['role'] !== 'admin') {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        return;
    }
    
    $chat->deleteMessage($messageId, $_SESSION['user_id']);
    echo json_encode(['success' => true]);
}

function handleClearChat() {
    global $db;
    
    if ($_SESSION['role'] !== 'admin') {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        return;
    }
    
    $db->execute("DELETE FROM chat_messages WHERE is_public = 1");
    echo json_encode(['success' => true]);
}
?>
