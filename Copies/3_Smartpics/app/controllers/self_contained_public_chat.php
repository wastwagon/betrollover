<?php
/**
 * SmartPicks Pro - Self-Contained Public Chat Moderation
 * Clean version without any flagged_reason references
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAdmin();

$db = Database::getInstance();
$logger = Logger::getInstance();

$error = '';
$success = '';
$chatMessages = [];
$onlineUsers = [];
$filter = $_GET['filter'] ?? 'all';

// Initialize variables with default values
$totalMessages = 0;
$todayMessages = 0;
$flaggedMessages = 0;
$deletedMessages = 0;

try {
    // Build query based on filter
    $whereClause = '';
    switch ($filter) {
        case 'today':
            $whereClause = "WHERE DATE(cm.created_at) = CURDATE()";
            break;
        case 'week':
            $whereClause = "WHERE cm.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
        case 'flagged':
            $whereClause = "WHERE cm.is_flagged = 1";
            break;
        case 'deleted':
            $whereClause = "WHERE cm.is_deleted = 1";
            break;
        default:
            $whereClause = "";
    }
    
    // Get chat messages - CLEAN QUERY
    $chatMessages = $db->fetchAll("
        SELECT 
            cm.id,
            cm.user_id,
            cm.message,
            cm.created_at,
            cm.is_flagged,
            cm.is_deleted,
            u.username,
            u.display_name,
            u.role
        FROM chat_messages cm
        LEFT JOIN users u ON cm.user_id = u.id
        {$whereClause}
        ORDER BY cm.created_at DESC
        LIMIT 100
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
    
    // Calculate statistics
    $totalMessages = count($chatMessages);
    $todayMessages = count(array_filter($chatMessages, function($msg) { return date('Y-m-d', strtotime($msg['created_at'])) === date('Y-m-d'); }));
    $flaggedMessages = count(array_filter($chatMessages, function($msg) { return $msg['is_flagged'] == 1; }));
    $deletedMessages = count(array_filter($chatMessages, function($msg) { return $msg['is_deleted'] == 1; }));
    
} catch (Exception $e) {
    $error = 'Error loading chat data: ' . $e->getMessage();
    $logger->error('Chat data loading failed', ['error' => $e->getMessage()]);
}

// Handle chat moderation actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $messageId = intval($_POST['message_id'] ?? 0);
    
    if ($action === 'delete_message' && $messageId) {
        try {
            $result = $db->query("UPDATE chat_messages SET is_deleted = 1 WHERE id = ?", [$messageId]);
            if ($result) {
                $success = 'Message deleted successfully!';
                // Refresh the list
                $chatMessages = $db->fetchAll("
                    SELECT 
                        cm.id,
                        cm.user_id,
                        cm.message,
                        cm.created_at,
                        cm.is_flagged,
                        cm.is_deleted,
                        u.username,
                        u.display_name,
                        u.role
                    FROM chat_messages cm
                    LEFT JOIN users u ON cm.user_id = u.id
                    {$whereClause}
                    ORDER BY cm.created_at DESC
                    LIMIT 100
                ");
            }
        } catch (Exception $e) {
            $error = 'Error deleting message: ' . $e->getMessage();
        }
    } elseif ($action === 'flag_message' && $messageId) {
        try {
            $result = $db->query("UPDATE chat_messages SET is_flagged = 1 WHERE id = ?", [$messageId]);
            if ($result) {
                $success = 'Message flagged successfully!';
                // Refresh the list
                $chatMessages = $db->fetchAll("
                    SELECT 
                        cm.id,
                        cm.user_id,
                        cm.message,
                        cm.created_at,
                        cm.is_flagged,
                        cm.is_deleted,
                        u.username,
                        u.display_name,
                        u.role
                    FROM chat_messages cm
                    LEFT JOIN users u ON cm.user_id = u.id
                    {$whereClause}
                    ORDER BY cm.created_at DESC
                    LIMIT 100
                ");
            }
        } catch (Exception $e) {
            $error = 'Error flagging message: ' . $e->getMessage();
        }
    } elseif ($action === 'unflag_message' && $messageId) {
        try {
            $result = $db->query("UPDATE chat_messages SET is_flagged = 0 WHERE id = ?", [$messageId]);
            if ($result) {
                $success = 'Message unflagged successfully!';
                // Refresh the list
                $chatMessages = $db->fetchAll("
                    SELECT 
                        cm.id,
                        cm.user_id,
                        cm.message,
                        cm.created_at,
                        cm.is_flagged,
                        cm.is_deleted,
                        u.username,
                        u.display_name,
                        u.role
                    FROM chat_messages cm
                    LEFT JOIN users u ON cm.user_id = u.id
                    {$whereClause}
                    ORDER BY cm.created_at DESC
                    LIMIT 100
                ");
            }
        } catch (Exception $e) {
            $error = 'Error unflagging message: ' . $e->getMessage();
        }
    }
}

// Recalculate statistics after actions
$totalMessages = count($chatMessages);
$todayMessages = count(array_filter($chatMessages, function($msg) { return date('Y-m-d', strtotime($msg['created_at'])) === date('Y-m-d'); }));
$flaggedMessages = count(array_filter($chatMessages, function($msg) { return $msg['is_flagged'] == 1; }));
$deletedMessages = count(array_filter($chatMessages, function($msg) { return $msg['is_deleted'] == 1; }));
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Moderation - SmartPicks Pro</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
            color: #333;
        }
        
        .admin-layout {
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 250px;
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            padding: 20px 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 0 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }
        
        .sidebar-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .sidebar-header p {
            font-size: 14px;
            opacity: 0.8;
        }
        
        .nav-menu {
            list-style: none;
        }
        
        .nav-item {
            margin-bottom: 5px;
        }
        
        .nav-link {
            display: block;
            padding: 12px 20px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }
        
        .nav-link:hover {
            background-color: rgba(255,255,255,0.1);
            border-left-color: white;
        }
        
        .nav-link.active {
            background-color: rgba(255,255,255,0.2);
            border-left-color: white;
        }
        
        .main-content {
            flex: 1;
            margin-left: 250px;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-left h1 {
            color: #dc3545;
            margin-bottom: 5px;
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .balance-badge {
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            background: #dc3545;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            border: 1px solid transparent;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
        }
        
        .alert-success {
            background-color: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        
        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 4px solid #dc3545;
        }
        
        .kpi-icon {
            font-size: 32px;
            margin-bottom: 10px;
            color: #dc3545;
        }
        
        .kpi-value {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .kpi-label {
            color: #666;
            font-size: 14px;
        }
        
        .filter-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .filter-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 10px 20px;
            border: 2px solid #dc3545;
            background: white;
            color: #dc3545;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            font-size: 14px;
        }
        
        .filter-btn:hover {
            background: #dc3545;
            color: white;
        }
        
        .filter-btn.active {
            background: #dc3545;
            color: white;
        }
        
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
        }
        
        .chat-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .section-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .section-header h3 {
            color: #dc3545;
            margin-bottom: 5px;
        }
        
        .chat-messages {
            max-height: 600px;
            overflow-y: auto;
            padding: 20px;
        }
        
        .message-item {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background: #f8f9fa;
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .message-user {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .user-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .user-badge.admin {
            background: #dc3545;
            color: white;
        }
        
        .user-badge.user {
            background: #28a745;
            color: white;
        }
        
        .message-time {
            font-size: 12px;
            color: #666;
        }
        
        .message-content {
            margin-bottom: 10px;
            line-height: 1.5;
        }
        
        .message-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .btn-warning:hover {
            background: #e0a800;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-success:hover {
            background: #218838;
        }
        
        .sidebar-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
        }
        
        .sidebar-section h4 {
            color: #dc3545;
            margin-bottom: 15px;
        }
        
        .online-user {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .online-user:last-child {
            border-bottom: none;
        }
        
        .online-indicator {
            width: 8px;
            height: 8px;
            background: #28a745;
            border-radius: 50%;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .no-data-icon {
            font-size: 48px;
            margin-bottom: 15px;
            color: #dc3545;
        }
        
        .info-box {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .info-box h4 {
            color: #0c5460;
            margin-bottom: 10px;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 8px;
            min-width: 400px;
        }
        
        .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                height: auto;
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .content-grid {
                grid-template-columns: 1fr;
            }
            
            .kpi-cards {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .filter-buttons {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="admin-layout">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>Admin Panel</h1>
                <p>SmartPicks Pro</p>
            </div>
            <nav>
                <ul class="nav-menu">
                    <li class="nav-item"><a href="/dashboard" class="nav-link">Dashboard</a></li>
                    <li class="nav-item"><a href="/admin_approve_pick" class="nav-link">Pending Approvals</a></li>
                    <li class="nav-item"><a href="/admin_picks" class="nav-link">All Picks</a></li>
                    <li class="nav-item"><a href="/admin_users" class="nav-link">Users</a></li>
                    <li class="nav-item"><a href="/admin_analytics" class="nav-link">Analytics</a></li>
                    <li class="nav-item"><a href="/leaderboard" class="nav-link">Leaderboard</a></li>
                    <li class="nav-item"><a href="/admin_escrow" class="nav-link">Escrow Funds</a></li>
                    <li class="nav-item"><a href="/public_chat" class="nav-link active">Chat Moderation</a></li>
                    <li class="nav-item"><a href="/admin_verification" class="nav-link">Verification</a></li>
                    <li class="nav-item"><a href="/admin_contests" class="nav-link">Contests</a></li>
                    <li class="nav-item"><a href="/admin_mentorship" class="nav-link">Mentorship</a></li>
                    <li class="nav-item"><a href="/admin_support" class="nav-link">Support</a></li>
                    <li class="nav-item"><a href="/admin_settings" class="nav-link">Settings</a></li>
                </ul>
            </nav>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Header -->
            <div class="header">
                <div class="header-left">
                    <h1>Chat Moderation</h1>
                    <p>Monitor and moderate the public chat system</p>
                </div>
                <div class="header-right">
                    <div class="balance-badge">GHS 1,000.00</div>
                    <div class="user-info">
                        <div class="user-avatar">A</div>
                        <div>
                            <div>admin</div>
                            <div style="font-size: 12px; color: #666;">Administrator</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Error/Success Messages -->
            <?php if ($error): ?>
                <div class="alert alert-danger">
                    <strong>Error</strong> <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <strong>Success</strong> <?= htmlspecialchars($success) ?>
                </div>
            <?php endif; ?>

            <!-- KPI Cards -->
            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="kpi-icon">💬</div>
                    <div class="kpi-value"><?= number_format($totalMessages) ?></div>
                    <div class="kpi-label">Total Messages</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📅</div>
                    <div class="kpi-value"><?= number_format($todayMessages) ?></div>
                    <div class="kpi-label">Today's Messages</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🚩</div>
                    <div class="kpi-value"><?= number_format($flaggedMessages) ?></div>
                    <div class="kpi-label">Flagged Messages</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-value"><?= count($onlineUsers) ?></div>
                    <div class="kpi-label">Online Users</div>
                </div>
            </div>

            <!-- Filter Section -->
            <div class="filter-section">
                <h3>Filter Messages</h3>
                <div class="filter-buttons">
                    <a href="?filter=all" class="filter-btn <?= $filter === 'all' ? 'active' : '' ?>">All Messages</a>
                    <a href="?filter=today" class="filter-btn <?= $filter === 'today' ? 'active' : '' ?>">Today</a>
                    <a href="?filter=week" class="filter-btn <?= $filter === 'week' ? 'active' : '' ?>">This Week</a>
                    <a href="?filter=flagged" class="filter-btn <?= $filter === 'flagged' ? 'active' : '' ?>">Flagged</a>
                    <a href="?filter=deleted" class="filter-btn <?= $filter === 'deleted' ? 'active' : '' ?>">Deleted</a>
                </div>
            </div>

            <!-- Content Grid -->
            <div class="content-grid">
                <!-- Chat Messages -->
                <div class="chat-section">
                    <div class="section-header">
                        <h3>Chat Messages</h3>
                        <p>Manage and moderate chat messages</p>
                    </div>
                    <div class="chat-messages">
                        <?php if (empty($chatMessages)): ?>
                            <div class="no-data">
                                <div class="no-data-icon">💬</div>
                                <h3>No Chat Messages</h3>
                                <p>No chat messages match your current filter criteria.</p>
                            </div>
                        <?php else: ?>
                            <?php foreach ($chatMessages as $message): ?>
                                <div class="message-item">
                                    <div class="message-header">
                                        <div class="message-user">
                                            <span class="user-badge <?= $message['role'] ?>"><?= strtoupper($message['role']) ?></span>
                                            <strong><?= htmlspecialchars($message['display_name'] ?: $message['username']) ?></strong>
                                        </div>
                                        <div class="message-time"><?= date('M j, Y H:i', strtotime($message['created_at'])) ?></div>
                                    </div>
                                    <div class="message-content">
                                        <?= htmlspecialchars($message['message']) ?>
                                        <?php if ($message['is_flagged']): ?>
                                            <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 5px; font-size: 12px;">
                                                <strong>Flagged:</strong> This message has been flagged for review
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    <div class="message-actions">
                                        <?php if (!$message['is_deleted']): ?>
                                            <?php if ($message['is_flagged']): ?>
                                                <button class="btn btn-success" onclick="unflagMessage(<?= $message['id'] ?>)">Unflag</button>
                                            <?php else: ?>
                                                <button class="btn btn-warning" onclick="flagMessage(<?= $message['id'] ?>)">Flag</button>
                                            <?php endif; ?>
                                            <button class="btn btn-danger" onclick="deleteMessage(<?= $message['id'] ?>)">Delete</button>
                                        <?php else: ?>
                                            <span style="color: #dc3545; font-size: 12px;">Message Deleted</span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Online Users Sidebar -->
                <div class="sidebar-section">
                    <h4>Online Users</h4>
                    <?php if (empty($onlineUsers)): ?>
                        <div class="no-data">
                            <div class="no-data-icon">👤</div>
                            <p>No users online</p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($onlineUsers as $user): ?>
                            <div class="online-user">
                                <div class="online-indicator"></div>
                                <div>
                                    <div><strong><?= htmlspecialchars($user['display_name'] ?: $user['username']) ?></strong></div>
                                    <div style="font-size: 12px; color: #666;"><?= $user['role'] ?></div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <h4>Chat Moderation</h4>
                <p>Monitor and moderate the public chat system to ensure a safe and positive environment.</p>
                <p><strong>Current Status:</strong> <?= count($onlineUsers) ?> users online | <?= $totalMessages ?> total messages | <?= $flaggedMessages ?> flagged | <?= $deletedMessages ?> deleted</p>
            </div>
        </div>
    </div>

    <!-- Flag Message Modal -->
    <div id="flagModal" class="modal">
        <div class="modal-content">
            <h3>Flag Message</h3>
            <form method="post" id="flagForm">
                <input type="hidden" name="action" value="flag_message">
                <input type="hidden" name="message_id" id="flagMessageId">
                
                <div style="margin-bottom: 20px;">
                    <p>Are you sure you want to flag this message for review?</p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideFlagModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-warning">Flag Message</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Delete Message Modal -->
    <div id="deleteModal" class="modal">
        <div class="modal-content">
            <h3>Delete Message</h3>
            <form method="post" id="deleteForm">
                <input type="hidden" name="action" value="delete_message">
                <input type="hidden" name="message_id" id="deleteMessageId">
                
                <div style="margin-bottom: 20px;">
                    <p>Are you sure you want to delete this message? This action cannot be undone.</p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideDeleteModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-danger">Delete Message</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function flagMessage(messageId) {
            document.getElementById('flagMessageId').value = messageId;
            document.getElementById('flagModal').style.display = 'block';
        }

        function hideFlagModal() {
            document.getElementById('flagModal').style.display = 'none';
        }

        function unflagMessage(messageId) {
            if (confirm('Are you sure you want to unflag this message?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.innerHTML = `
                    <input type="hidden" name="action" value="unflag_message">
                    <input type="hidden" name="message_id" value="${messageId}">
                `;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function deleteMessage(messageId) {
            document.getElementById('deleteMessageId').value = messageId;
            document.getElementById('deleteModal').style.display = 'block';
        }

        function hideDeleteModal() {
            document.getElementById('deleteModal').style.display = 'none';
        }

        // Close modals when clicking outside
        window.onclick = function(event) {
            const flagModal = document.getElementById('flagModal');
            const deleteModal = document.getElementById('deleteModal');
            
            if (event.target === flagModal) {
                hideFlagModal();
            }
            if (event.target === deleteModal) {
                hideDeleteModal();
            }
        }
    </script>
</body>
</html>