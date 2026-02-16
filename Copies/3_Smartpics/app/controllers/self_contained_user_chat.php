<?php
/**
 * SmartPicks Pro - Self-Contained User Chat
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();

$error = '';
$success = '';
$chatMessages = [];
$onlineUsers = [];

try {
    // Get recent chat messages
    $chatMessages = $db->fetchAll("
        SELECT 
            cm.id,
            cm.user_id,
            cm.message,
            cm.created_at,
            cm.is_flagged,
            u.username,
            u.display_name,
            u.role
        FROM chat_messages cm
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE cm.is_deleted = 0
        ORDER BY cm.created_at DESC
        LIMIT 50
    ");
    
    // Get online users
    $onlineUsers = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            u.role,
            u.last_login
        FROM users u
        WHERE u.last_login >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ORDER BY u.last_login DESC
    ");
    
} catch (Exception $e) {
    $error = 'Error loading chat data: ' . $e->getMessage();
    $logger->error('Chat data loading failed', ['error' => $e->getMessage()]);
}

// Handle message sending
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'send_message') {
    $message = trim($_POST['message'] ?? '');
    
    if (!empty($message)) {
        try {
            $result = $db->query("
                INSERT INTO chat_messages (user_id, message, created_at) 
                VALUES (?, ?, NOW())
            ", [$_SESSION['user_id'], $message]);
            
            if ($result) {
                $success = 'Message sent successfully!';
                // Refresh messages
                $chatMessages = $db->fetchAll("
                    SELECT 
                        cm.id,
                        cm.user_id,
                        cm.message,
                        cm.created_at,
                        cm.is_flagged,
                        u.username,
                        u.display_name,
                        u.role
                    FROM chat_messages cm
                    LEFT JOIN users u ON cm.user_id = u.id
                    WHERE cm.is_deleted = 0
                    ORDER BY cm.created_at DESC
                    LIMIT 50
                ");
            } else {
                $error = 'Failed to send message.';
            }
        } catch (Exception $e) {
            $error = 'Error sending message: ' . $e->getMessage();
        }
    } else {
        $error = 'Please enter a message.';
    }
}

// Safely get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$_SESSION['user_id']]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat - SmartPicks Pro</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        /* Basic Reset & Body */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f7f6;
            color: #333;
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: 250px;
            background-color: #2E7D32; /* Green */
            color: white;
            padding: 20px 0;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease-in-out;
            position: fixed;
            height: 100%;
            z-index: 1000;
        }

        .sidebar-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 0 20px;
        }

        .sidebar-header .logo-text {
            font-size: 24px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 5px;
        }

        .sidebar-header .app-name {
            font-size: 14px;
            color: rgba(255,255,255,0.8);
        }

        .sidebar-menu {
            list-style: none;
            padding: 0;
            margin: 0;
            flex-grow: 1;
        }

        .sidebar-menu li a {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            color: white;
            text-decoration: none;
            font-size: 16px;
            transition: background-color 0.2s, padding-left 0.2s;
        }

        .sidebar-menu li a i {
            margin-right: 15px;
            font-size: 18px;
        }

        .sidebar-menu li a:hover,
        .sidebar-menu li a.active {
            background-color: #1B5E20; /* Darker Green */
            padding-left: 25px;
        }

        /* Main Content Wrapper */
        .main-content-wrapper {
            margin-left: 250px; /* Adjust for sidebar width */
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            background-color: #f4f7f6;
        }

        /* Top Bar */
        .top-bar {
            background-color: #fff;
            padding: 15px 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 999;
        }

        .top-bar .page-title-section {
            display: flex;
            flex-direction: column;
        }

        .top-bar .page-title {
            font-size: 22px;
            font-weight: bold;
            color: #333;
        }

        .top-bar .page-subtitle {
            font-size: 14px;
            color: #666;
        }

        .top-bar .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .top-bar .user-info .wallet-display {
            background-color: #E8F5E9; /* Light Green */
            color: #2E7D32; /* Dark Green */
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .top-bar .user-info .user-avatar {
            width: 40px;
            height: 40px;
            background-color: #2E7D32; /* Green */
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
        }

        /* Content Area */
        .content-area {
            padding: 25px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        /* Chat Container */
        .chat-container {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            flex-grow: 1;
        }

        .chat-messages {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            max-height: 600px;
        }

        .online-users {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            height: fit-content;
        }

        .chat-messages h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
        }

        .messages-container {
            flex-grow: 1;
            overflow-y: auto;
            max-height: 400px;
            margin-bottom: 20px;
            border: 1px solid #eee;
            border-radius: 8px;
            padding: 15px;
        }

        .chat-message {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 8px;
            background-color: #f8f9fa;
        }

        .chat-message.own-message {
            background-color: #E8F5E9;
            margin-left: 20px;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }

        .message-user {
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }

        .message-time {
            font-size: 12px;
            color: #666;
        }

        .message-content {
            font-size: 14px;
            line-height: 1.4;
        }

        .message-form {
            display: flex;
            gap: 10px;
        }

        .message-input {
            flex-grow: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }

        .send-btn {
            padding: 10px 20px;
            background-color: #2E7D32;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }

        .send-btn:hover {
            background-color: #1B5E20;
        }

        /* Online Users */
        .online-user {
            display: flex;
            align-items: center;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            background-color: #f8f9fa;
        }

        .online-indicator {
            width: 10px;
            height: 10px;
            background-color: #28a745;
            border-radius: 50%;
            margin-right: 10px;
        }

        /* Alerts */
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .alert.alert-success {
            background-color: #E8F5E9; /* Light Green */
            color: #2E7D32; /* Dark Green */
            border: 1px solid #A5D6A7;
        }

        .alert.alert-error {
            background-color: #FFEBEE; /* Light Red */
            color: #C62828; /* Dark Red */
            border: 1px solid #EF9A9A;
        }

        /* Badges */
        .badge {
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            color: white;
            display: inline-block;
            margin-left: 5px;
        }

        .badge-admin { background-color: #D32F2F; } /* Red */
        .badge-user { background-color: #2196F3; } /* Blue */

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-250px);
                position: fixed;
                height: 100%;
                top: 0;
                left: 0;
            }

            .sidebar.open {
                transform: translateX(0);
            }

            .main-content-wrapper {
                margin-left: 0;
            }

            .top-bar {
                padding: 10px 15px;
            }

            .top-bar .page-title {
                font-size: 18px;
            }

            .top-bar .page-subtitle {
                font-size: 12px;
            }

            .top-bar .user-info {
                gap: 5px;
            }

            .top-bar .user-info .wallet-display {
                padding: 5px 8px;
                font-size: 12px;
            }

            .top-bar .user-info .user-avatar {
                width: 35px;
                height: 35px;
                font-size: 16px;
            }

            .content-area {
                padding: 15px;
            }

            .chat-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="logo-text">Tipster Dashboard</div>
            <div class="app-name">SmartPicks Pro</div>
        </div>
        <ul class="sidebar-menu">
            <li><a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="/create_pick"><i class="fas fa-plus-circle"></i> Create Pick</a></li>
            <li><a href="/my_picks"><i class="fas fa-chart-line"></i> My Picks</a></li>
            <li><a href="/user_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/marketplace"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
            <li><a href="/my_purchases"><i class="fas fa-shopping-cart"></i> My Purchases</a></li>
            <li><a href="/chat" class="active"><i class="fas fa-comments"></i> Chat</a></li>
            <li><a href="/contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/wallet"><i class="fas fa-wallet"></i> Wallet</a></li>
            <li><a href="/payouts"><i class="fas fa-money-bill-wave"></i> Payouts</a></li>
            <li><a href="/profile"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Public Chat</div>
                <div class="page-subtitle">SmartPicks Pro Tipster Dashboard</div>
            </div>
            <div class="user-info">
                <div class="wallet-display">
                    <i class="fas fa-wallet"></i> GHS <?= number_format($walletBalance, 2) ?>
                </div>
                <div class="user-avatar">
                    <?= strtoupper(substr($_SESSION['username'] ?? 'U', 0, 1)) ?>
                </div>
                <div>
                    <div style="font-weight: 600;"><?= htmlspecialchars($_SESSION['display_name'] ?? $_SESSION['username'] ?? 'User') ?></div>
                    <div style="font-size: 12px; color: #666;">Tipster</div>
                </div>
            </div>
        </div>

        <div class="content-area">
            <?php if (!empty($error)): ?>
                <div class="alert alert-error">
                    <h4>❌ Error</h4>
                    <p><?= htmlspecialchars($error) ?></p>
                </div>
            <?php endif; ?>

            <?php if (!empty($success)): ?>
                <div class="alert alert-success">
                    <h4>✅ Success</h4>
                    <p><?= htmlspecialchars($success) ?></p>
                </div>
            <?php endif; ?>

            <div class="chat-container">
                <div class="chat-messages">
                    <h3><i class="fas fa-comments"></i> Public Chat</h3>
                    
                    <div class="messages-container">
                        <?php if (!empty($chatMessages)): ?>
                            <?php foreach (array_reverse($chatMessages) as $message): ?>
                                <div class="chat-message <?= $message['user_id'] == $_SESSION['user_id'] ? 'own-message' : '' ?>">
                                    <div class="message-header">
                                        <div class="message-user">
                                            <?= htmlspecialchars($message['display_name'] ?? $message['username']) ?>
                                            <?php if ($message['role'] === 'admin'): ?>
                                                <span class="badge badge-admin">Admin</span>
                                            <?php else: ?>
                                                <span class="badge badge-user">User</span>
                                            <?php endif; ?>
                                        </div>
                                        <div class="message-time"><?= date('H:i', strtotime($message['created_at'])) ?></div>
                                    </div>
                                    <div class="message-content">
                                        <?= htmlspecialchars($message['message']) ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div style="text-align: center; padding: 40px; color: #666;">
                                <i class="fas fa-comments" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                                <h4>No Messages Yet</h4>
                                <p>Be the first to start the conversation!</p>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                    <form method="post" class="message-form">
                        <input type="hidden" name="action" value="send_message">
                        <input type="text" name="message" placeholder="Type your message..." class="message-input" required>
                        <button type="submit" class="send-btn">
                            <i class="fas fa-paper-plane"></i> Send
                        </button>
                    </form>
                </div>

                <div class="online-users">
                    <h3><i class="fas fa-user-check"></i> Online Users</h3>
                    <?php if (!empty($onlineUsers)): ?>
                        <?php foreach ($onlineUsers as $user): ?>
                            <div class="online-user">
                                <div class="online-indicator"></div>
                                <div>
                                    <div style="font-weight: 600;"><?= htmlspecialchars($user['display_name'] ?? $user['username']) ?></div>
                                    <div style="font-size: 12px; color: #666;">
                                        <?= $user['role'] === 'admin' ? 'Admin' : 'User' ?> • 
                                        <?= date('H:i', strtotime($user['last_login'])) ?>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-user-times" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <p>No users online</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>💬 Public Chat</h4>
                <p>Connect with other tipsters, share insights, and discuss picks in real-time.</p>
                <p><strong>Current Status:</strong> <?= count($onlineUsers) ?> users online | <?= count($chatMessages) ?> recent messages</p>
            </div>
        </div>
    </div>

    <script>
        // Auto-scroll to bottom of messages
        function scrollToBottom() {
            const messagesContainer = document.querySelector('.messages-container');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Scroll to bottom on page load
        document.addEventListener('DOMContentLoaded', function() {
            scrollToBottom();
        });

        // Mobile menu toggle
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        // Add mobile menu button if needed
        if (window.innerWidth <= 768) {
            const topBar = document.querySelector('.top-bar');
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            menuBtn.onclick = toggleSidebar;
            topBar.insertBefore(menuBtn, topBar.firstChild);
        }

        // Auto-refresh messages every 30 seconds
        setInterval(function() {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
