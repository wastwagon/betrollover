<?php
/**
 * Public Chat - Real-time Community Chat
 * Modern, interactive chat interface for users and tipsters
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    // Set session cookie parameters BEFORE starting session
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
    $cookiePath = $isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false ? '/SmartPicksPro-Local/' : '/';
    $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    
    session_set_cookie_params([
        'path' => $cookiePath,
        'httponly' => true,
        'secure' => $isSecure,
        'samesite' => 'Lax'
    ]);
    
    session_start();
}

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
    // Show login prompt instead of redirecting
    $pageTitle = "Login Required";
    ob_start();
    ?>
    <div class="login-required-container">
        <div class="card" style="text-align: center; padding: 40px; max-width: 500px; margin: 50px auto;">
            <div style="margin-bottom: 30px;">
                <i class="fas fa-lock" style="font-size: 64px; color: #d32f2f; margin-bottom: 20px;"></i>
                <h2 style="color: #d32f2f; margin-bottom: 10px;">Login Required</h2>
                <p style="color: #666; font-size: 16px;">You need to be logged in to access the public chat.</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <p style="color: #333; margin-bottom: 20px;">Join the community chat to:</p>
                <ul style="text-align: left; color: #666; margin-bottom: 20px;">
                    <li>Share tips and strategies with other users</li>
                    <li>Discuss picks and predictions</li>
                    <li>Connect with tipsters and experts</li>
                    <li>Get real-time updates and insights</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <a href="/SmartPicksPro-Local/login" class="btn btn-primary" style="padding: 12px 24px;">
                    <i class="fas fa-sign-in-alt"></i> Login to Chat
                </a>
                <a href="/SmartPicksPro-Local/user_dashboard" class="btn btn-secondary" style="padding: 12px 24px;">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </a>
            </div>
        </div>
    </div>
    <?php
    $content = ob_get_clean();
    include __DIR__ . '/../views/layouts/user_layout.php';
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

$error = '';
$success = '';
$chatMessages = [];
$onlineUsers = [];

try {
    // Get recent chat messages (last 50)
    $chatMessages = $db->fetchAll("
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
    $chatMessages = array_reverse($chatMessages);
    
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
        AND u.id != ?
        ORDER BY u.last_login DESC
        LIMIT 20
    ", [$userId]);
    
    // Update user's last activity
    $db->query("UPDATE users SET last_login = NOW() WHERE id = ?", [$userId]);
    
} catch (Exception $e) {
    $error = 'Error loading chat data: ' . $e->getMessage();
    $logger->error('Chat data loading failed', ['error' => $e->getMessage()]);
}

// Handle message sending
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'send_message') {
    $message = trim($_POST['message'] ?? '');
    
    if (!empty($message) && strlen($message) <= 500) {
        try {
            // Check if user is suspended
            if ($user['status'] === 'suspended') {
                $error = 'Your account is suspended. You cannot send messages.';
            } else {
                // Insert message
                $db->query("
                    INSERT INTO chat_messages (user_id, message, type, is_public, created_at) 
                    VALUES (?, ?, 'text', 1, NOW())
                ", [$userId, $message]);
                
                $success = 'Message sent successfully!';
                
                // Refresh messages
                $chatMessages = $db->fetchAll("
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
                $chatMessages = array_reverse($chatMessages);
                
                // Update user's last activity
                $db->query("UPDATE users SET last_login = NOW() WHERE id = ?", [$userId]);
            }
        } catch (Exception $e) {
            $error = 'Error sending message: ' . $e->getMessage();
            $logger->error('Message sending failed', ['error' => $e->getMessage()]);
        }
    } else {
        $error = 'Message cannot be empty or longer than 500 characters.';
    }
}

// Set page variables
$pageTitle = "Public Chat";

// Start content buffer
ob_start();
?>

<div class="public-chat-container">
    <?php if ($success): ?>
    <div class="card" style="background-color: #e8f5e8; border-left: 4px solid #2e7d32; margin-bottom: 20px;">
        <p style="color: #2e7d32; margin: 0;"><i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f; margin-bottom: 20px;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <!-- Chat Header -->
    <div class="card" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="color: #d32f2f; margin-bottom: 5px;">
                    <i class="fas fa-comments"></i> Public Chat
                </h2>
                <p style="color: #666; margin: 0;">Real-time community chat for all users</p>
            </div>
            <div style="text-align: right;">
                <div style="background-color: #e8f5e8; padding: 10px 15px; border-radius: 5px; display: inline-block;">
                    <span style="color: #2e7d32; font-weight: bold;">
                        <i class="fas fa-circle" style="color: #2e7d32; font-size: 8px;"></i>
                        <span id="online-count"><?php echo count($onlineUsers) + 1; ?></span> Online
                    </span>
                </div>
            </div>
        </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px;">
        <!-- Main Chat Area -->
        <div>
            <!-- Chat Messages -->
            <div class="card" style="height: 500px; overflow-y: auto; padding: 20px;" id="chat-messages">
                <?php if (empty($chatMessages)): ?>
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-comments" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <p>No messages yet. Be the first to start the conversation!</p>
                </div>
                <?php else: ?>
                
                <?php foreach ($chatMessages as $message): ?>
                <div class="chat-message" style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 10px; border-left: 4px solid <?php echo $message['role'] === 'admin' ? '#d32f2f' : ($message['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <!-- User Avatar -->
                        <div style="flex-shrink: 0;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background-color: <?php echo $message['role'] === 'admin' ? '#d32f2f' : ($message['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; overflow: hidden;">
                                <?php if (!empty($message['avatar'])): ?>
                                    <img src="/SmartPicksPro-Local/<?php echo htmlspecialchars($message['avatar']); ?>" 
                                         alt="Avatar" 
                                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <span style="display: none;"><?php echo strtoupper(substr($message['username'], 0, 1)); ?></span>
                                <?php else: ?>
                                    <?php echo strtoupper(substr($message['username'], 0, 1)); ?>
                                <?php endif; ?>
                            </div>
                        </div>
                        
                        <!-- Message Content -->
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <h4 style="color: #d32f2f; margin: 0; font-size: 14px;">
                                    <?php echo htmlspecialchars($message['display_name'] ?: $message['username']); ?>
                                </h4>
                                <span style="background-color: <?php echo $message['role'] === 'admin' ? '#d32f2f' : ($message['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; text-transform: capitalize;">
                                    <?php echo $message['role']; ?>
                                </span>
                                <span style="color: #999; font-size: 12px;">
                                    <?php echo date('g:i A', strtotime($message['created_at'])); ?>
                                </span>
                            </div>
                            
                            <p style="color: #333; margin: 0; line-height: 1.4;">
                                <?php echo htmlspecialchars($message['message']); ?>
                            </p>
                            
                            <?php if ($message['is_flagged']): ?>
                            <div style="margin-top: 8px;">
                                <span style="background-color: #d32f2f; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                                    <i class="fas fa-flag"></i> Flagged
                                </span>
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
                
                <?php endif; ?>
            </div>
            
            <!-- Message Input -->
            <div class="card" style="margin-top: 20px;">
                <form method="POST" id="chat-form">
                    <input type="hidden" name="action" value="send_message">
                    <div style="display: flex; gap: 10px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <textarea name="message" 
                                      placeholder="Type your message here..." 
                                      rows="3" 
                                      maxlength="500"
                                      required
                                      style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; resize: vertical; font-family: inherit;"
                                      id="message-input"></textarea>
                            <div style="text-align: right; margin-top: 5px;">
                                <span style="color: #999; font-size: 12px;">
                                    <span id="char-count">0</span>/500 characters
                                </span>
                            </div>
                        </div>
                        <button type="submit" 
                                class="btn btn-primary" 
                                style="padding: 12px 20px; height: fit-content;">
                            <i class="fas fa-paper-plane"></i> Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Online Users Sidebar -->
        <div>
            <div class="card">
                <h3 style="color: #d32f2f; margin-bottom: 15px;">
                    <i class="fas fa-users"></i> Online Users
                </h3>
                
                <div id="online-users-list">
                    <!-- Current User -->
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background-color: #e8f5e8; border-radius: 5px; margin-bottom: 8px;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background-color: #2e7d32; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; overflow: hidden;">
                            <?php if (!empty($user['avatar'])): ?>
                                <img src="/SmartPicksPro-Local/<?php echo htmlspecialchars($user['avatar']); ?>" 
                                     alt="Avatar" 
                                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <span style="display: none;"><?php echo strtoupper(substr($user['username'], 0, 1)); ?></span>
                            <?php else: ?>
                                <?php echo strtoupper(substr($user['username'], 0, 1)); ?>
                            <?php endif; ?>
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: bold; color: #2e7d32; font-size: 14px;">
                                <?php echo htmlspecialchars($user['display_name'] ?: $user['username']); ?> (You)
                            </p>
                            <p style="margin: 0; color: #666; font-size: 12px; text-transform: capitalize;">
                                <?php echo $user['role']; ?>
                            </p>
                        </div>
                    </div>
                    
                    <!-- Other Online Users -->
                    <?php foreach ($onlineUsers as $onlineUser): ?>
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid #f0f0f0;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background-color: <?php echo $onlineUser['role'] === 'admin' ? '#d32f2f' : ($onlineUser['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; overflow: hidden;">
                            <?php if (!empty($onlineUser['avatar'])): ?>
                                <img src="/SmartPicksPro-Local/<?php echo htmlspecialchars($onlineUser['avatar']); ?>" 
                                     alt="Avatar" 
                                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <span style="display: none;"><?php echo strtoupper(substr($onlineUser['username'], 0, 1)); ?></span>
                            <?php else: ?>
                                <?php echo strtoupper(substr($onlineUser['username'], 0, 1)); ?>
                            <?php endif; ?>
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: 500; color: #333; font-size: 14px;">
                                <?php echo htmlspecialchars($onlineUser['display_name'] ?: $onlineUser['username']); ?>
                            </p>
                            <p style="margin: 0; color: #666; font-size: 12px; text-transform: capitalize;">
                                <?php echo $onlineUser['role']; ?>
                            </p>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    
                    <?php if (empty($onlineUsers)): ?>
                    <div style="text-align: center; padding: 20px; color: #666;">
                        <i class="fas fa-user-friends" style="font-size: 24px; color: #ccc; margin-bottom: 10px;"></i>
                        <p style="margin: 0; font-size: 14px;">No other users online</p>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Chat Guidelines -->
            <div class="card" style="margin-top: 20px;">
                <h4 style="color: #d32f2f; margin-bottom: 10px;">
                    <i class="fas fa-info-circle"></i> Chat Guidelines
                </h4>
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                    <p style="margin-bottom: 8px;">
                        <i class="fas fa-check"></i> Be respectful and friendly
                    </p>
                    <p style="margin-bottom: 8px;">
                        <i class="fas fa-check"></i> Keep messages relevant to sports betting
                    </p>
                    <p style="margin-bottom: 8px;">
                        <i class="fas fa-check"></i> No spam or promotional content
                    </p>
                    <p style="margin-bottom: 8px;">
                        <i class="fas fa-check"></i> No offensive language or harassment
                    </p>
                    <p style="margin: 0;">
                        <i class="fas fa-check"></i> Messages are moderated in real-time
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.chat-message {
    transition: all 0.3s ease;
}

.chat-message:hover {
    background-color: #f0f0f0 !important;
}

#chat-messages {
    scroll-behavior: smooth;
}

#chat-messages::-webkit-scrollbar {
    width: 6px;
}

#chat-messages::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

#chat-messages::-webkit-scrollbar-thumb {
    background: #d32f2f;
    border-radius: 3px;
}

#chat-messages::-webkit-scrollbar-thumb:hover {
    background: #b71c1c;
}

@media (max-width: 768px) {
    .public-chat-container > div:first-child {
        grid-template-columns: 1fr !important;
    }
    
    .public-chat-container > div:first-child > div:last-child {
        order: -1;
        margin-bottom: 20px;
    }
}
</style>

<script>
// Character counter
document.getElementById('message-input').addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('char-count').textContent = count;
    
    if (count > 450) {
        document.getElementById('char-count').style.color = '#d32f2f';
    } else {
        document.getElementById('char-count').style.color = '#999';
    }
});

// Auto-scroll to bottom of chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Scroll to bottom on page load
document.addEventListener('DOMContentLoaded', function() {
    scrollToBottom();
});

// Real-time updates (simplified version - will be enhanced with WebSocket later)
setInterval(function() {
    // Update online users count
    fetch('/SmartPicksPro-Local/api/get_online_users.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('online-count').textContent = data.count;
            }
        })
        .catch(error => console.log('Online users update failed:', error));
}, 30000); // Update every 30 seconds

// Auto-refresh messages every 10 seconds
setInterval(function() {
    fetch('/SmartPicksPro-Local/api/get_chat_messages.php')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.messages.length > 0) {
                // Simple check - if we have new messages, reload the page
                const currentMessageCount = document.querySelectorAll('.chat-message').length;
                if (data.messages.length !== currentMessageCount) {
                    location.reload();
                }
            }
        })
        .catch(error => console.log('Message refresh failed:', error));
}, 10000); // Check every 10 seconds
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include appropriate layout based on user role
if ($userRole === 'admin') {
    include __DIR__ . '/../views/layouts/admin_layout.php';
} elseif ($userRole === 'tipster') {
    include __DIR__ . '/../views/layouts/tipster_layout.php';
} else {
    include __DIR__ . '/../views/layouts/user_layout.php';
}
?>
