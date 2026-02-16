<?php
/**
 * Admin Chat - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get chat data
$chatMessages = [];
$stats = [];
$chatUsers = [];

// Get filter parameters
$filter = $_GET['filter'] ?? 'all';

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

try {
    // Get recent chat messages with filter
    $chatMessages = $db->fetchAll("
        SELECT cm.*, u.username, u.role
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        {$whereClause}
        ORDER BY cm.created_at DESC
        LIMIT 50
    ");
    
    // Get statistics
    $stats['total_messages'] = $db->fetch("SELECT COUNT(*) as count FROM chat_messages")['count'] ?? 0;
    $stats['today_messages'] = $db->fetch("SELECT COUNT(*) as count FROM chat_messages WHERE DATE(created_at) = CURDATE()")['count'] ?? 0;
    $stats['active_users'] = $db->fetch("SELECT COUNT(DISTINCT user_id) as count FROM chat_messages WHERE DATE(created_at) = CURDATE()")['count'] ?? 0;
    $stats['flagged_messages'] = $db->fetch("SELECT COUNT(*) as count FROM chat_messages WHERE is_flagged = 1")['count'] ?? 0;
    $stats['banned_users'] = $db->fetch("SELECT COUNT(*) as count FROM users WHERE status = 'suspended'")['count'] ?? 0;
    
    // Get chat users (users who have sent messages)
    $chatUsers = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            u.email,
            u.role,
            u.status,
            u.last_login,
            COUNT(DISTINCT cm.id) as message_count,
            MAX(cm.created_at) as last_message_time
        FROM users u
        LEFT JOIN chat_messages cm ON u.id = cm.user_id
        WHERE cm.id IS NOT NULL
        GROUP BY u.id
        ORDER BY last_message_time DESC
        LIMIT 100
    ");
    
} catch (Exception $e) {
    $chatMessages = [];
    $stats = ['total_messages' => 0, 'today_messages' => 0, 'active_users' => 0, 'flagged_messages' => 0, 'banned_users' => 0];
    $chatUsers = [];
}

// Handle chat moderation actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'moderate_message') {
        $messageId = intval($_POST['message_id'] ?? 0);
        $moderationAction = trim($_POST['moderation_action'] ?? '');
        $adminNotes = trim($_POST['admin_notes'] ?? '');
        
        if ($messageId && in_array($moderationAction, ['delete', 'flag', 'unflag'])) {
            try {
                switch ($moderationAction) {
                    case 'delete':
                        $db->query("UPDATE chat_messages SET is_deleted = 1 WHERE id = ?", [$messageId]);
                        // Store moderation info in metadata
                        $metadata = json_encode(['moderated_by' => $userId, 'moderated_at' => date('Y-m-d H:i:s'), 'action' => 'deleted', 'notes' => $adminNotes]);
                        $db->query("UPDATE chat_messages SET metadata = ? WHERE id = ?", [$metadata, $messageId]);
                        break;
                    case 'flag':
                        $db->query("UPDATE chat_messages SET is_flagged = 1 WHERE id = ?", [$messageId]);
                        // Store moderation info in metadata
                        $metadata = json_encode(['moderated_by' => $userId, 'moderated_at' => date('Y-m-d H:i:s'), 'action' => 'flagged', 'notes' => $adminNotes]);
                        $db->query("UPDATE chat_messages SET metadata = ? WHERE id = ?", [$metadata, $messageId]);
                        break;
                    case 'unflag':
                        $db->query("UPDATE chat_messages SET is_flagged = 0 WHERE id = ?", [$messageId]);
                        // Store moderation info in metadata
                        $metadata = json_encode(['moderated_by' => $userId, 'moderated_at' => date('Y-m-d H:i:s'), 'action' => 'unflagged', 'notes' => $adminNotes]);
                        $db->query("UPDATE chat_messages SET metadata = ? WHERE id = ?", [$metadata, $messageId]);
                        break;
                }
                
                $message = "Message moderated successfully.";
                
                // Refresh chat messages
                $chatMessages = $db->fetchAll("
                    SELECT cm.*, u.username, u.role
                    FROM chat_messages cm
                    JOIN users u ON cm.user_id = u.id
                    ORDER BY cm.created_at DESC
                    LIMIT 50
                ");
                
            } catch (Exception $e) {
                $error = "Error moderating message: " . $e->getMessage();
                $logger->error('Error moderating message', ['error' => $e->getMessage(), 'message_id' => $messageId]);
            }
        } else {
            $error = "Invalid message or action selected.";
        }
    } elseif ($action === 'ban_user') {
        $targetUserId = intval($_POST['user_id'] ?? 0);
        $banReason = trim($_POST['ban_reason'] ?? 'Violation of chat rules');
        
        if ($targetUserId && $targetUserId != $userId) {
            try {
                // Ban user (set status to suspended)
                $db->query("
                    UPDATE users 
                    SET status = 'suspended', updated_at = NOW() 
                    WHERE id = ?
                ", [$targetUserId]);
                
                // Log the ban action
                $logger->info('User banned from chat', [
                    'target_user_id' => $targetUserId,
                    'admin_id' => $userId,
                    'reason' => $banReason
                ]);
                
                $message = "User banned successfully from chat.";
                
            } catch (Exception $e) {
                $error = "Error banning user: " . $e->getMessage();
                $logger->error('Error banning user', ['error' => $e->getMessage(), 'user_id' => $targetUserId]);
            }
        } else {
            $error = "Invalid user selected or cannot ban yourself.";
        }
    } elseif ($action === 'unban_user') {
        $targetUserId = intval($_POST['user_id'] ?? 0);
        
        if ($targetUserId) {
            try {
                // Unban user (set status to active)
                $db->query("
                    UPDATE users 
                    SET status = 'active', updated_at = NOW() 
                    WHERE id = ?
                ", [$targetUserId]);
                
                // Log the unban action
                $logger->info('User unbanned from chat', [
                    'target_user_id' => $targetUserId,
                    'admin_id' => $userId
                ]);
                
                $message = "User unbanned successfully from chat.";
                
            } catch (Exception $e) {
                $error = "Error unbanning user: " . $e->getMessage();
                $logger->error('Error unbanning user', ['error' => $e->getMessage(), 'user_id' => $targetUserId]);
            }
        } else {
            $error = "Invalid user selected.";
        }
    } elseif ($action === 'delete_user_messages') {
        $targetUserId = intval($_POST['user_id'] ?? 0);
        
        if ($targetUserId) {
            try {
                // Delete all messages from user
                $deletedCount = $db->query("
                    UPDATE chat_messages 
                    SET is_deleted = 1 
                    WHERE user_id = ?
                ", [$targetUserId]);
                
                // Log the action
                $logger->info('All user messages deleted', [
                    'target_user_id' => $targetUserId,
                    'admin_id' => $userId
                ]);
                
                $message = "All messages from user deleted successfully.";
                
            } catch (Exception $e) {
                $error = "Error deleting user messages: " . $e->getMessage();
                $logger->error('Error deleting user messages', ['error' => $e->getMessage(), 'user_id' => $targetUserId]);
            }
        } else {
            $error = "Invalid user selected.";
        }
    }
}

// Refresh data after actions
if (!empty($message) || !empty($error)) {
    // Refresh chat messages
    $chatMessages = $db->fetchAll("
        SELECT cm.*, u.username, u.role
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        {$whereClause}
        ORDER BY cm.created_at DESC
        LIMIT 50
    ");
    
    // Refresh chat users
    try {
        $chatUsers = $db->fetchAll("
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.email,
                u.role,
                u.status,
                u.last_login,
                COUNT(DISTINCT cm.id) as message_count,
                MAX(cm.created_at) as last_message_time
            FROM users u
            LEFT JOIN chat_messages cm ON u.id = cm.user_id
            WHERE cm.id IS NOT NULL
            GROUP BY u.id
            ORDER BY last_message_time DESC
            LIMIT 100
        ");
    } catch (Exception $e) {
        $chatUsers = [];
    }
}

// Set page variables
$pageTitle = "Chat Moderation";

// Start content buffer
ob_start();
?>

<div class="admin-chat-content">
    <?php if ($message): ?>
    <div class="card" style="background-color: #e8f5e8; border-left: 4px solid #2e7d32;">
        <p style="color: #2e7d32; margin: 0;"><i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($message); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-comments"></i> Chat Moderation</h2>
        <p style="color: #666; margin-top: 10px;">Monitor and moderate real-time community chat messages. Messages appear instantly to users - use moderation to flag inappropriate content or remove violations.</p>
        
        <!-- Filter Options -->
        <div style="margin-top: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h4 style="color: #d32f2f; margin-bottom: 10px;">Filter Messages</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="?filter=all" class="btn <?php echo $filter === 'all' ? 'btn-primary' : 'btn-secondary'; ?>" style="padding: 6px 12px; font-size: 12px;">
                    All Messages
                </a>
                <a href="?filter=today" class="btn <?php echo $filter === 'today' ? 'btn-primary' : 'btn-secondary'; ?>" style="padding: 6px 12px; font-size: 12px;">
                    Today
                </a>
                <a href="?filter=week" class="btn <?php echo $filter === 'week' ? 'btn-primary' : 'btn-secondary'; ?>" style="padding: 6px 12px; font-size: 12px;">
                    This Week
                </a>
                <a href="?filter=flagged" class="btn <?php echo $filter === 'flagged' ? 'btn-primary' : 'btn-secondary'; ?>" style="padding: 6px 12px; font-size: 12px;">
                    Flagged Only
                </a>
                <a href="?filter=deleted" class="btn <?php echo $filter === 'deleted' ? 'btn-primary' : 'btn-secondary'; ?>" style="padding: 6px 12px; font-size: 12px;">
                    Deleted Only
                </a>
            </div>
        </div>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_messages']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Messages</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['today_messages']; ?></p>
                <p style="font-size: 14px; color: #666;">Today's Messages</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['active_users']; ?></p>
                <p style="font-size: 14px; color: #666;">Active Users Today</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['flagged_messages']; ?></p>
                <p style="font-size: 14px; color: #666;">Flagged Messages</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['banned_users']; ?></p>
                <p style="font-size: 14px; color: #666;">Banned Users</p>
            </div>
        </div>
    </div>
    
    <!-- User Management Section -->
    <div class="card">
        <h3><i class="fas fa-users-cog"></i> Chat User Management</h3>
        <p style="color: #666; margin-top: 10px;">Manage users and tipsters in the chat system. Ban/unban users, delete their messages, and view their activity.</p>
        
        <?php if (empty($chatUsers)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No chat users found.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">User</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Role</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Messages</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Last Activity</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($chatUsers as $chatUser): ?>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">
                            <strong><?php echo htmlspecialchars($chatUser['display_name'] ?? $chatUser['username']); ?></strong>
                            <p style="font-size: 12px; color: #666; margin: 3px 0 0 0;">
                                <?php echo htmlspecialchars($chatUser['username']); ?>
                            </p>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $chatUser['role'] === 'admin' ? '#d32f2f' : ($chatUser['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px; text-transform: capitalize;">
                                <?php echo $chatUser['role']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <?php if ($chatUser['status'] === 'suspended'): ?>
                            <span style="background-color: #d32f2f; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px;">
                                <i class="fas fa-ban"></i> Banned
                            </span>
                            <?php else: ?>
                            <span style="background-color: #2e7d32; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px;">
                                <i class="fas fa-check"></i> Active
                            </span>
                            <?php endif; ?>
                        </td>
                        <td style="padding: 12px; color: #666;">
                            <?php echo $chatUser['message_count'] ?? 0; ?>
                        </td>
                        <td style="padding: 12px; color: #666; font-size: 12px;">
                            <?php echo $chatUser['last_message_time'] ? date('M j, Y H:i', strtotime($chatUser['last_message_time'])) : 'Never'; ?>
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                <?php if ($chatUser['status'] === 'suspended'): ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="unban_user">
                                    <input type="hidden" name="user_id" value="<?php echo $chatUser['id']; ?>">
                                    <button type="submit" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="return confirm('Unban this user from chat?');">
                                        <i class="fas fa-unlock"></i> Unban
                                    </button>
                                </form>
                                <?php else: ?>
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="ban_user">
                                    <input type="hidden" name="user_id" value="<?php echo $chatUser['id']; ?>">
                                    <input type="hidden" name="ban_reason" value="Chat rule violation">
                                    <button type="submit" class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="return confirm('Ban this user from chat? This will prevent them from sending messages.');">
                                        <i class="fas fa-ban"></i> Ban
                                    </button>
                                </form>
                                <?php endif; ?>
                                
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="delete_user_messages">
                                    <input type="hidden" name="user_id" value="<?php echo $chatUser['id']; ?>">
                                    <button type="submit" class="btn btn-warning" style="padding: 6px 12px; font-size: 12px; background-color: #f57c00; color: white;" onclick="return confirm('Delete ALL messages from this user? This action cannot be undone.');">
                                        <i class="fas fa-trash"></i> Delete All Messages
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>
    
    <!-- Chat Messages -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Recent Chat Messages</h3>
        
        <?php if (empty($chatMessages)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-comments" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No chat messages found.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($chatMessages as $chatMessage): ?>
            <div class="card" style="margin-bottom: 15px; <?php echo $chatMessage['is_flagged'] ? 'border-left: 4px solid #d32f2f;' : ''; ?>">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <h4 style="color: #d32f2f; margin-bottom: 5px;">
                            <?php echo htmlspecialchars($chatMessage['username']); ?>
                            <span style="background-color: <?php echo $chatMessage['role'] === 'admin' ? '#d32f2f' : ($chatMessage['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; text-transform: capitalize; margin-left: 10px;">
                                <?php echo $chatMessage['role']; ?>
                            </span>
                        </h4>
                        <p style="color: #666; font-size: 12px;">
                            <?php echo date('M j, Y g:i A', strtotime($chatMessage['created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <?php if ($chatMessage['is_flagged']): ?>
                        <span style="background-color: #d32f2f; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                            <i class="fas fa-flag"></i> Flagged
                        </span>
                        <?php endif; ?>
                        <?php if ($chatMessage['is_deleted']): ?>
                        <span style="background-color: #666; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                            <i class="fas fa-trash"></i> Deleted
                        </span>
                        <?php endif; ?>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <?php echo htmlspecialchars($chatMessage['message']); ?>
                    </p>
                </div>
                
                <?php 
                // Parse moderation metadata
                $moderationData = null;
                if (!empty($chatMessage['metadata'])) {
                    $moderationData = json_decode($chatMessage['metadata'], true);
                }
                ?>
                
                <?php if ($moderationData && !empty($moderationData['notes'])): ?>
                <div style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                    <h5 style="color: #d32f2f; margin-bottom: 5px;">Moderation Notes</h5>
                    <p style="color: #666; font-size: 12px;">
                        <?php echo htmlspecialchars($moderationData['notes']); ?>
                    </p>
                    <?php if (isset($moderationData['moderated_at'])): ?>
                    <p style="color: #888; font-size: 10px;">
                        Moderated: <?php echo date('M j, Y g:i A', strtotime($moderationData['moderated_at'])); ?>
                    </p>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
                
                <?php if (!$chatMessage['is_deleted']): ?>
                <div style="border-top: 1px solid #f0f0f0; padding-top: 10px;">
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <form method="POST" style="flex: 1;">
                            <input type="hidden" name="action" value="moderate_message">
                            <input type="hidden" name="message_id" value="<?php echo $chatMessage['id']; ?>">
                            
                            <div style="display: grid; grid-template-columns: 150px 1fr auto; gap: 10px; margin-bottom: 10px;">
                                <select name="moderation_action" required style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                    <option value="">Select Action</option>
                                    <option value="flag">Flag Message</option>
                                    <option value="delete">Delete Message</option>
                                    <?php if ($chatMessage['is_flagged']): ?>
                                    <option value="unflag">Unflag Message</option>
                                    <?php endif; ?>
                                </select>
                                
                                <textarea name="admin_notes" rows="1" 
                                          placeholder="Add moderation notes (optional)..."
                                          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                                
                                <button type="submit" class="btn btn-primary" style="padding: 8px 16px;">
                                    <i class="fas fa-gavel"></i> Moderate
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div style="display: flex; gap: 5px; margin-top: 10px;">
                        <?php if (!$chatMessage['is_flagged']): ?>
                        <form method="POST" style="display: inline;">
                            <input type="hidden" name="action" value="moderate_message">
                            <input type="hidden" name="message_id" value="<?php echo $chatMessage['id']; ?>">
                            <input type="hidden" name="moderation_action" value="flag">
                            <input type="hidden" name="admin_notes" value="Quick flag">
                            <button type="submit" class="btn btn-warning" style="padding: 6px 12px; font-size: 11px;">
                                <i class="fas fa-flag"></i> Quick Flag
                            </button>
                        </form>
                        <?php endif; ?>
                        
                        <form method="POST" style="display: inline;">
                            <input type="hidden" name="action" value="moderate_message">
                            <input type="hidden" name="message_id" value="<?php echo $chatMessage['id']; ?>">
                            <input type="hidden" name="moderation_action" value="delete">
                            <input type="hidden" name="admin_notes" value="Quick delete">
                            <button type="submit" class="btn btn-danger" style="padding: 6px 12px; font-size: 11px;" onclick="return confirm('Delete this message?');">
                                <i class="fas fa-trash"></i> Quick Delete
                            </button>
                        </form>
                        
                        <!-- Ban User Quick Action -->
                        <?php if ($chatMessage['user_id'] != $userId): ?>
                        <form method="POST" style="display: inline;">
                            <input type="hidden" name="action" value="ban_user">
                            <input type="hidden" name="user_id" value="<?php echo $chatMessage['user_id']; ?>">
                            <input type="hidden" name="ban_reason" value="Chat violation - Message ID: <?php echo $chatMessage['id']; ?>">
                            <button type="submit" class="btn btn-danger" style="padding: 6px 12px; font-size: 11px; background-color: #d32f2f;" onclick="return confirm('Ban this user from chat?');">
                                <i class="fas fa-ban"></i> Ban User
                            </button>
                        </form>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Moderation Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Real-Time Chat Moderation Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-bolt"></i> 
                <strong>Real-Time Chat:</strong> Messages appear instantly to all users. No pre-approval required.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-flag"></i> 
                <strong>Flag Messages:</strong> Mark inappropriate content (spam, harassment, offensive language) for review.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-trash"></i> 
                <strong>Delete Messages:</strong> Remove policy violations that should not be visible to users.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-undo"></i> 
                <strong>Unflag Messages:</strong> Remove flags from messages that were incorrectly flagged.
            </p>
            <p style="color: #666;">
                <i class="fas fa-file-alt"></i> 
                <strong>Document Actions:</strong> Add notes explaining moderation decisions for transparency.
            </p>
        </div>
    </div>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
