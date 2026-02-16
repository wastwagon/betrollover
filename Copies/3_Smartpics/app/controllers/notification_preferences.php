<?php
/**
 * BetRollover - Notification Preferences Page
 * Allows users to toggle notification preferences
 */

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check authentication
if (!isset($_SESSION['user_id'])) {
    header('Location: /login');
    exit;
}

// Define paths
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__ . '/../..');
}
if (!defined('APP_PATH')) {
    define('APP_PATH', ROOT_PATH . '/app');
}
if (!defined('CONFIG_PATH')) {
    define('CONFIG_PATH', ROOT_PATH . '/config');
}

// Detect base URL
// Detect base path - only use /SmartPicksPro-Local for local development
$baseUrl = '';
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;

// Only use base path on localhost AND if the path actually contains it
// Never use base path on production domains
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

// Load configuration
require_once CONFIG_PATH . '/config.php';
require_once APP_PATH . '/models/Database.php';
require_once APP_PATH . '/models/NotificationService.php';
require_once APP_PATH . '/middleware/AuthMiddleware.php';

$db = Database::getInstance();
$notificationService = NotificationService::getInstance();
$userId = $_SESSION['user_id'];

// Get user info
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Handle form submission
$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $preferences = $_POST['preferences'] ?? [];
        
        // Update each preference
        foreach ($preferences as $type => $settings) {
            $emailEnabled = isset($settings['email']) ? 1 : 0;
            $inAppEnabled = isset($settings['in_app']) ? 1 : 0;
            $pushEnabled = isset($settings['push']) ? 1 : 0;
            
            $notificationService->updatePreferences(
                $userId,
                $type,
                $emailEnabled,
                $inAppEnabled,
                $pushEnabled
            );
        }
        
        $success = 'Notification preferences updated successfully!';
    } catch (Exception $e) {
        $error = 'Failed to update preferences: ' . $e->getMessage();
    }
}

// Get current preferences
$currentPreferences = $notificationService->getAllPreferences($userId);
$prefsMap = [];
foreach ($currentPreferences as $pref) {
    $prefsMap[$pref['notification_type']] = $pref;
}

// Notification types with descriptions
$notificationTypes = [
    'pick_approved' => [
        'title' => 'Pick Approved',
        'description' => 'Get notified when your picks are approved by admin',
        'icon' => 'check-circle',
        'color' => '#2e7d32'
    ],
    'pick_rejected' => [
        'title' => 'Pick Rejected',
        'description' => 'Get notified when your picks are rejected',
        'icon' => 'times-circle',
        'color' => '#d32f2f'
    ],
    'pick_purchased' => [
        'title' => 'Pick Purchased',
        'description' => 'Get notified when someone purchases your pick',
        'icon' => 'shopping-cart',
        'color' => '#1976d2'
    ],
    'pick_settled' => [
        'title' => 'Pick Settled',
        'description' => 'Get notified when your picks are settled',
        'icon' => 'trophy',
        'color' => '#f57c00'
    ],
    'pick_won' => [
        'title' => 'Pick Won',
        'description' => 'Get notified when your picks win',
        'icon' => 'trophy',
        'color' => '#2e7d32'
    ],
    'pick_lost' => [
        'title' => 'Pick Lost',
        'description' => 'Get notified when your picks lose',
        'icon' => 'times',
        'color' => '#d32f2f'
    ],
    'wallet_deposit' => [
        'title' => 'Wallet Deposit',
        'description' => 'Get notified when money is deposited to your wallet',
        'icon' => 'arrow-down',
        'color' => '#2e7d32'
    ],
    'wallet_withdrawal' => [
        'title' => 'Wallet Withdrawal',
        'description' => 'Get notified when you withdraw from your wallet',
        'icon' => 'arrow-up',
        'color' => '#1976d2'
    ],
    'wallet_topup' => [
        'title' => 'Wallet Top-up',
        'description' => 'Get notified when your wallet is topped up',
        'icon' => 'plus-circle',
        'color' => '#2e7d32'
    ],
    'wallet_payout' => [
        'title' => 'Payout Received',
        'description' => 'Get notified when you receive a payout',
        'icon' => 'money-bill-wave',
        'color' => '#2e7d32'
    ],
    'tipster_verified' => [
        'title' => 'Tipster Verified',
        'description' => 'Get notified when your tipster account is verified',
        'icon' => 'check-circle',
        'color' => '#2e7d32'
    ],
    'tipster_application_approved' => [
        'title' => 'Application Approved',
        'description' => 'Get notified when your tipster application is approved',
        'icon' => 'check-circle',
        'color' => '#2e7d32'
    ],
    'tipster_application_rejected' => [
        'title' => 'Application Rejected',
        'description' => 'Get notified when your tipster application is rejected',
        'icon' => 'times-circle',
        'color' => '#d32f2f'
    ],
    'system_announcement' => [
        'title' => 'System Announcements',
        'description' => 'Get notified about important platform updates',
        'icon' => 'bullhorn',
        'color' => '#1976d2'
    ],
    'low_balance' => [
        'title' => 'Low Balance Alert',
        'description' => 'Get notified when your wallet balance is low',
        'icon' => 'exclamation-triangle',
        'color' => '#f57c00'
    ],
    'payout_requested' => [
        'title' => 'Payout Requested',
        'description' => 'Get notified when you request a payout',
        'icon' => 'hand-holding-usd',
        'color' => '#1976d2'
    ],
    'payout_approved' => [
        'title' => 'Payout Approved',
        'description' => 'Get notified when your payout is approved',
        'icon' => 'check-circle',
        'color' => '#2e7d32'
    ],
    'payout_rejected' => [
        'title' => 'Payout Rejected',
        'description' => 'Get notified when your payout is rejected',
        'icon' => 'times-circle',
        'color' => '#d32f2f'
    ]
];

// Determine layout based on role
$userRole = $_SESSION['role'] ?? 'user';
$layoutFile = $userRole === 'admin' ? 'admin_layout.php' : ($userRole === 'tipster' ? 'tipster_layout.php' : 'user_layout.php');

$pageTitle = 'Notification Preferences';
$content = '';

ob_start();
?>
<div class="card">
    <h2><i class="fas fa-bell"></i> Notification Preferences</h2>
    <p style="color: #666; margin-bottom: 20px;">Manage how you receive notifications for different activities on the platform.</p>
    
    <?php if ($success): ?>
        <div style="background: #e8f5e8; color: #2e7d32; padding: 12px; border-radius: 5px; margin-bottom: 20px;">
            <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
        </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
        <div style="background: #ffebee; color: #d32f2f; padding: 12px; border-radius: 5px; margin-bottom: 20px;">
            <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
        </div>
    <?php endif; ?>
    
    <form method="POST" action="">
        <div style="display: grid; gap: 20px;">
            <?php foreach ($notificationTypes as $type => $config): 
                $pref = $prefsMap[$type] ?? null;
                $emailEnabled = $pref ? (bool)$pref['email_enabled'] : true;
                $inAppEnabled = $pref ? (bool)$pref['in_app_enabled'] : true;
                $pushEnabled = $pref ? (bool)$pref['push_enabled'] : false;
            ?>
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background: white;">
                    <div style="display: flex; align-items: start; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: <?php echo $config['color']; ?>; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                            <i class="fas fa-<?php echo $config['icon']; ?>"></i>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600;"><?php echo htmlspecialchars($config['title']); ?></h3>
                            <p style="margin: 0; color: #666; font-size: 13px;"><?php echo htmlspecialchars($config['description']); ?></p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; padding-top: 15px; border-top: 1px solid #f0f0f0;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="preferences[<?php echo $type; ?>][email]" value="1" <?php echo $emailEnabled ? 'checked' : ''; ?>>
                            <span><i class="fas fa-envelope" style="color: #1976d2;"></i> Email</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="preferences[<?php echo $type; ?>][in_app]" value="1" <?php echo $inAppEnabled ? 'checked' : ''; ?>>
                            <span><i class="fas fa-bell" style="color: #d32f2f;"></i> In-App</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" name="preferences[<?php echo $type; ?>][push]" value="1" <?php echo $pushEnabled ? 'checked' : ''; ?>>
                            <span><i class="fas fa-mobile-alt" style="color: #2e7d32;"></i> Push</span>
                        </label>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <button type="submit" class="btn btn-primary" style="padding: 12px 30px; font-size: 16px;">
                <i class="fas fa-save"></i> Save Preferences
            </button>
            <a href="<?php echo $baseUrl; ?>/<?php echo $userRole === 'admin' ? 'admin_dashboard' : ($userRole === 'tipster' ? 'tipster_dashboard' : 'user_dashboard'); ?>" class="btn" style="padding: 12px 30px; margin-left: 10px; background: #f5f5f5; color: #333; text-decoration: none;">
                Cancel
            </a>
        </div>
    </form>
</div>

<style>
    input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
    
    label {
        user-select: none;
    }
    
    .btn {
        display: inline-block;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.3s;
    }
    
    .btn-primary {
        background: #d32f2f;
        color: white;
    }
    
    .btn-primary:hover {
        background: #b71c1c;
    }
</style>
<?php
$content = ob_get_clean();

include __DIR__ . '/../views/layouts/' . $layoutFile;

