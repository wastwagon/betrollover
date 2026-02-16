<?php
/**
 * View Notifications - Display all user notifications
 * Shows a paginated list of all notifications for the current user
 */

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/NotificationService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Ensure session and authentication
if (session_status() === PHP_SESSION_NONE) { session_start(); }
AuthMiddleware::requireAuth();

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

$db = Database::getInstance();
$notificationService = NotificationService::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'user';

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get pagination parameters
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$perPage = 20;
$offset = ($page - 1) * $perPage;

// Get filter parameters
$filter = $_GET['filter'] ?? 'all'; // all, unread, read

// Get notifications
$notifications = [];
$totalNotifications = 0;
$unreadCount = 0;

try {
    // Get unread count
    $unreadCount = $notificationService->getUnreadCount($userId);
    
    // Get total counts for pagination
    if ($filter === 'unread') {
        $totalNotifications = $unreadCount;
        $notifications = $notificationService->getUserNotifications($userId, $perPage, true);
    } elseif ($filter === 'read') {
        // Get total read count
        $readCountResult = $db->fetch("
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = ? AND is_read = 1
        ", [$userId]);
        $totalNotifications = (int)($readCountResult['count'] ?? 0);
        
        // Get read notifications with pagination
        $allReadNotifications = $db->fetchAll("
            SELECT 
                id, type, title, message, link, COALESCE(icon, 'bell') as icon, 
                COALESCE(priority, 'medium') as priority, is_read, 
                created_at, metadata
            FROM notifications
            WHERE user_id = ? AND is_read = 1
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ", [$userId, $perPage, $offset]);
        
        $notifications = $allReadNotifications;
    } else {
        // Get total count (all notifications)
        $totalResult = $db->fetch("
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = ?
        ", [$userId]);
        $totalNotifications = (int)($totalResult['count'] ?? 0);
        
        // Get notifications with pagination
        $notifications = $db->fetchAll("
            SELECT 
                id, type, title, message, link, COALESCE(icon, 'bell') as icon, 
                COALESCE(priority, 'medium') as priority, is_read, 
                created_at, metadata
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ", [$userId, $perPage, $offset]);
    }
    
    // Format notifications with time ago
    foreach ($notifications as &$notification) {
        $notification['time_ago'] = timeAgo($notification['created_at']);
        $notification['metadata'] = $notification['metadata'] ? json_decode($notification['metadata'], true) : null;
    }
    unset($notification);
    
} catch (Exception $e) {
    error_log('Error fetching notifications: ' . $e->getMessage());
    $notifications = [];
}

// Calculate pagination
$totalPages = ceil($totalNotifications / $perPage);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Set page variables
$pageTitle = "Notifications";

// Start content buffer
ob_start();
?>

<div class="notifications-page" style="width: 100% !important; max-width: 100% !important; margin: 0 !important;">
    <div class="card" style="width: 100% !important; max-width: 100% !important; margin: 0 !important;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2><i class="fas fa-bell"></i> Notifications</h2>
            <div style="display: flex; gap: 10px; align-items: center;">
                <a href="<?php echo $baseUrl; ?>/notification_preferences" class="btn btn-secondary" style="padding: 8px 16px;">
                    <i class="fas fa-cog"></i> Preferences
                </a>
                <button onclick="markAllAsRead()" class="btn btn-primary" style="padding: 8px 16px;">
                    <i class="fas fa-check-double"></i> Mark All as Read
                </button>
            </div>
        </div>
        
        <!-- Filters -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;">
            <a href="<?php echo $baseUrl; ?>/notifications?filter=all" 
               class="filter-btn <?php echo $filter === 'all' ? 'active' : ''; ?>" 
               style="padding: 8px 16px; text-decoration: none; border-radius: 4px; background: <?php echo $filter === 'all' ? '#d32f2f' : '#f5f5f5'; ?>; color: <?php echo $filter === 'all' ? 'white' : '#666'; ?>;">
                All (<?php echo $totalNotifications; ?>)
            </a>
            <a href="<?php echo $baseUrl; ?>/notifications?filter=unread" 
               class="filter-btn <?php echo $filter === 'unread' ? 'active' : ''; ?>" 
               style="padding: 8px 16px; text-decoration: none; border-radius: 4px; background: <?php echo $filter === 'unread' ? '#d32f2f' : '#f5f5f5'; ?>; color: <?php echo $filter === 'unread' ? 'white' : '#666'; ?>;">
                Unread (<?php echo $unreadCount; ?>)
            </a>
            <a href="<?php echo $baseUrl; ?>/notifications?filter=read" 
               class="filter-btn <?php echo $filter === 'read' ? 'active' : ''; ?>" 
               style="padding: 8px 16px; text-decoration: none; border-radius: 4px; background: <?php echo $filter === 'read' ? '#d32f2f' : '#f5f5f5'; ?>; color: <?php echo $filter === 'read' ? 'white' : '#666'; ?>;">
                Read
            </a>
        </div>
        
        <!-- Notifications List -->
        <?php if (empty($notifications)): ?>
        <div style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-bell-slash" style="font-size: 64px; color: #ccc; margin-bottom: 20px;"></i>
            <h3 style="color: #666; margin-bottom: 10px;">No notifications</h3>
            <p style="color: #999;"><?php echo $filter === 'unread' ? 'You have no unread notifications.' : 'You don\'t have any notifications yet.'; ?></p>
        </div>
        <?php else: ?>
        
        <div class="notifications-list" style="width: 100%;">
            <?php foreach ($notifications as $notification): ?>
            <?php
            $iconClass = getIconClass($notification['icon'] ?? 'bell');
            $iconColor = getIconColor($notification['type'] ?? 'default');
            $isRead = (bool)$notification['is_read'];
            ?>
            <div class="notification-item <?php echo $isRead ? 'read' : 'unread'; ?>" 
                 onclick="handleNotificationClick(<?php echo $notification['id']; ?>, '<?php echo htmlspecialchars($notification['link'] ?? '', ENT_QUOTES); ?>')"
                 style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; background: <?php echo $isRead ? '#fff' : '#f8f9ff'; ?>; border-left: 4px solid <?php echo $isRead ? '#e0e0e0' : $iconColor; ?>;"
                 onmouseover="this.style.backgroundColor='<?php echo $isRead ? '#f8f9fa' : '#f0f4ff'; ?>'"
                 onmouseout="this.style.backgroundColor='<?php echo $isRead ? '#fff' : '#f8f9ff'; ?>'">
                <div style="display: flex; gap: 15px; align-items: flex-start; width: 100%;">
                    <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; background: <?php echo $iconColor; ?>; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas fa-<?php echo $iconClass; ?>" style="font-size: 18px;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0; width: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; width: 100%;">
                            <h4 style="margin: 0; color: #333; font-size: 16px; font-weight: 600; flex: 1; min-width: 0; padding-right: 15px;">
                                <?php echo htmlspecialchars($notification['title']); ?>
                                <?php if (!$isRead): ?>
                                <span style="display: inline-block; width: 8px; height: 8px; background: #d32f2f; border-radius: 50%; margin-left: 8px;"></span>
                                <?php endif; ?>
                            </h4>
                            <span style="color: #999; font-size: 12px; white-space: nowrap; flex-shrink: 0; text-align: right;">
                                <?php echo htmlspecialchars($notification['time_ago']); ?>
                            </span>
                        </div>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
                            <?php echo htmlspecialchars($notification['message']); ?>
                        </p>
                        <?php if ($notification['link']): ?>
                        <div style="margin-top: 8px;">
                            <a href="<?php echo htmlspecialchars($baseUrl . $notification['link']); ?>" 
                               style="color: #d32f2f; text-decoration: none; font-size: 13px; font-weight: 500;">
                                View details <i class="fas fa-arrow-right" style="font-size: 10px; margin-left: 4px;"></i>
                            </a>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        
        <!-- Pagination -->
        <?php if ($totalPages > 1): ?>
        <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <?php if ($page > 1): ?>
            <a href="<?php echo $baseUrl; ?>/notifications?page=<?php echo $page - 1; ?>&filter=<?php echo $filter; ?>" 
               class="btn btn-secondary" style="padding: 8px 16px;">
                <i class="fas fa-chevron-left"></i> Previous
            </a>
            <?php endif; ?>
            
            <span style="color: #666; padding: 0 15px;">
                Page <?php echo $page; ?> of <?php echo $totalPages; ?>
            </span>
            
            <?php if ($page < $totalPages): ?>
            <a href="<?php echo $baseUrl; ?>/notifications?page=<?php echo $page + 1; ?>&filter=<?php echo $filter; ?>" 
               class="btn btn-secondary" style="padding: 8px 16px;">
                Next <i class="fas fa-chevron-right"></i>
            </a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        
        <?php endif; ?>
    </div>
</div>

<script>
function getIconClass(icon) {
    if (!icon) return 'bell';
    
    const iconMap = {
        'check-circle': 'check-circle',
        'times-circle': 'times-circle',
        'times': 'times-circle',
        'shopping-cart': 'shopping-cart',
        'trophy': 'trophy',
        'arrow-down': 'arrow-down',
        'arrow-up': 'arrow-up',
        'plus-circle': 'plus-circle',
        'money-bill-wave': 'money-bill-wave',
        'bullhorn': 'bullhorn',
        'exclamation-triangle': 'exclamation-triangle',
        'hand-holding-usd': 'hand-holding-usd',
        'bell': 'bell',
        'user-check': 'user-check',
        'info-circle': 'info-circle',
        'file-alt': 'file-alt',
        'user-shield': 'user-shield'
    };
    return iconMap[icon] || 'bell';
}

function getIconColor(type) {
    const iconColors = {
        'pick_approved': '#2e7d32',
        'pick_rejected': '#d32f2f',
        'pick_purchased': '#1976d2',
        'pick_settled': '#f57c00',
        'pick_won': '#2e7d32',
        'pick_lost': '#d32f2f',
        'wallet_deposit': '#2e7d32',
        'wallet_withdrawal': '#1976d2',
        'wallet_topup': '#2e7d32',
        'wallet_payout': '#2e7d32',
        'tipster_verified': '#2e7d32',
        'tipster_application_submitted': '#1976d2',
        'tipster_application_approved': '#2e7d32',
        'tipster_application_rejected': '#d32f2f',
        'admin_action': '#d32f2f',
        'default': '#1976d2'
    };
    return iconColors[type] || iconColors['default'];
}

function handleNotificationClick(notificationId, link) {
    // Mark as read
    const baseUrl = '<?php echo $baseUrl; ?>';
    fetch(`${baseUrl}/api/mark_notification_read.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `notification_id=${notificationId}`
    }).catch(error => console.log('Failed to mark as read:', error));
    
    // Navigate to link if provided
    if (link) {
        window.location.href = baseUrl + link;
    } else {
        // Remove unread indicator
        const item = event.currentTarget;
        item.classList.remove('unread');
        item.classList.add('read');
        item.style.background = '#fff';
        item.style.borderLeftColor = '#e0e0e0';
    }
}

function markAllAsRead() {
    if (!confirm('Mark all notifications as read?')) {
        return;
    }
    
    const baseUrl = '<?php echo $baseUrl; ?>';
    fetch(`${baseUrl}/api/mark_all_notifications_read.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload page to show updated status
            window.location.reload();
        } else {
            alert('Failed to mark all as read: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to mark all as read. Please try again.');
    });
}
</script>

<?php
// Helper function for time ago
function timeAgo($datetime) {
    if (empty($datetime)) {
        return 'just now';
    }
    
    try {
        $timezone = config('timezone', 'Africa/Accra');
        $now = new DateTime('now', new DateTimeZone($timezone));
        $then = DateTime::createFromFormat('Y-m-d H:i:s', $datetime, new DateTimeZone('UTC'));
        
        if ($then === false) {
            $then = DateTime::createFromFormat('Y-m-d H:i:s.u', $datetime, new DateTimeZone('UTC'));
        }
        
        if ($then === false) {
            $timestamp = strtotime($datetime);
            if ($timestamp !== false) {
                $then = new DateTime('@' . $timestamp, new DateTimeZone('UTC'));
            } else {
                return 'just now';
            }
        }
        
        $then->setTimezone(new DateTimeZone($timezone));
        $diff = $now->getTimestamp() - $then->getTimestamp();
        
        if ($diff < 0) return 'just now';
        if ($diff < 60) return 'just now';
        if ($diff < 3600) return floor($diff / 60) . 'm ago';
        if ($diff < 86400) return floor($diff / 3600) . 'h ago';
        if ($diff < 604800) return floor($diff / 86400) . 'd ago';
        return $then->format('M j, Y');
        
    } catch (Exception $e) {
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

// Helper function for icon class
function getIconClass($icon) {
    if (!$icon) return 'bell';
    
    $iconMap = [
        'check-circle' => 'check-circle',
        'times-circle' => 'times-circle',
        'times' => 'times-circle',
        'shopping-cart' => 'shopping-cart',
        'trophy' => 'trophy',
        'arrow-down' => 'arrow-down',
        'arrow-up' => 'arrow-up',
        'plus-circle' => 'plus-circle',
        'money-bill-wave' => 'money-bill-wave',
        'bullhorn' => 'bullhorn',
        'exclamation-triangle' => 'exclamation-triangle',
        'hand-holding-usd' => 'hand-holding-usd',
        'bell' => 'bell',
        'user-check' => 'user-check',
        'info-circle' => 'info-circle',
        'file-alt' => 'file-alt',
        'user-shield' => 'user-shield'
    ];
    return $iconMap[$icon] ?? 'bell';
}

// Helper function for icon color
function getIconColor($type) {
    $iconColors = [
        'pick_approved' => '#2e7d32',
        'pick_rejected' => '#d32f2f',
        'pick_purchased' => '#1976d2',
        'pick_settled' => '#f57c00',
        'pick_won' => '#2e7d32',
        'pick_lost' => '#d32f2f',
        'wallet_deposit' => '#2e7d32',
        'wallet_withdrawal' => '#1976d2',
        'wallet_topup' => '#2e7d32',
        'wallet_payout' => '#2e7d32',
        'tipster_verified' => '#2e7d32',
        'tipster_application_submitted' => '#1976d2',
        'tipster_application_approved' => '#2e7d32',
        'tipster_application_rejected' => '#d32f2f',
        'admin_action' => '#d32f2f',
        'default' => '#1976d2'
    ];
    return $iconColors[$type] ?? $iconColors['default'];
}

// Get the content
$content = ob_get_clean();

// Include the appropriate layout based on user role
if ($userRole === 'admin') {
    include __DIR__ . '/../views/layouts/admin_layout.php';
} elseif ($userRole === 'tipster') {
    include __DIR__ . '/../views/layouts/tipster_layout.php';
} else {
    include __DIR__ . '/../views/layouts/user_layout.php';
}
?>

