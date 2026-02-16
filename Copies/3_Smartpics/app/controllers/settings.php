<?php
/**
 * Settings - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'user';

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Handle settings updates
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_password') {
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';
        
        if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
            $error = "Please fill in all password fields.";
        } elseif ($newPassword !== $confirmPassword) {
            $error = "New passwords do not match.";
        } elseif (strlen($newPassword) < 6) {
            $error = "New password must be at least 6 characters long.";
        } else {
            try {
                // Verify current password
                $userCheck = $db->fetch("SELECT password FROM users WHERE id = ?", [$userId]);
                if (!password_verify($currentPassword, $userCheck['password'])) {
                    $error = "Current password is incorrect.";
                } else {
                    // Update password
                    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                    $db->query("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", [$hashedPassword, $userId]);
                    $message = "Password updated successfully.";
                }
            } catch (Exception $e) {
                $error = "Error updating password: " . $e->getMessage();
            }
        }
    }
    
    if ($action === 'update_notifications') {
        $emailNotifications = isset($_POST['email_notifications']) ? 1 : 0;
        $smsNotifications = isset($_POST['sms_notifications']) ? 1 : 0;
        $pushNotifications = isset($_POST['push_notifications']) ? 1 : 0;
        
        try {
            $db->query("
                UPDATE users 
                SET email_notifications = ?, sms_notifications = ?, push_notifications = ?, updated_at = NOW()
                WHERE id = ?
            ", [$emailNotifications, $smsNotifications, $pushNotifications, $userId]);
            
            $message = "Notification settings updated successfully.";
            
            // Refresh user data
            $user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);
        } catch (Exception $e) {
            $error = "Error updating notification settings: " . $e->getMessage();
        }
    }
}

// Set page variables
$pageTitle = "Settings";

// Start content buffer
ob_start();
?>

<div class="settings-content">
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
    
    <!-- Password Settings -->
    <div class="card">
        <h3><i class="fas fa-lock"></i> Password Settings</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_password">
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Current Password</label>
                <input type="password" name="current_password" required
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">New Password</label>
                <input type="password" name="new_password" required minlength="6"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-size: 12px; color: #666; margin-top: 5px;">Minimum 6 characters</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Confirm New Password</label>
                <input type="password" name="confirm_password" required minlength="6"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Update Password
            </button>
        </form>
    </div>
    
    <!-- Notification Settings -->
    <div class="card">
        <h3><i class="fas fa-bell"></i> Notification Settings</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_notifications">
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="email_notifications" value="1" 
                           <?php echo ($user['email_notifications'] ?? 1) ? 'checked' : ''; ?>>
                    <span>Email Notifications</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    Receive updates about your account, picks, and transactions via email.
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="sms_notifications" value="1" 
                           <?php echo ($user['sms_notifications'] ?? 0) ? 'checked' : ''; ?>>
                    <span>SMS Notifications</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    Receive important updates via SMS (requires phone number).
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="push_notifications" value="1" 
                           <?php echo ($user['push_notifications'] ?? 1) ? 'checked' : ''; ?>>
                    <span>Push Notifications</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    Receive browser push notifications for real-time updates.
                </p>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Update Notifications
            </button>
        </form>
    </div>
    
    <!-- Account Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Account Information</h3>
        <div style="margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Username:</span>
                <span style="color: #666;"><?php echo htmlspecialchars($user['username']); ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Email:</span>
                <span style="color: #666;"><?php echo htmlspecialchars($user['email']); ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Role:</span>
                <span style="color: #d32f2f; text-transform: capitalize;"><?php echo $userRole; ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Member Since:</span>
                <span style="color: #666;"><?php echo date('M j, Y', strtotime($user['created_at'])); ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span style="font-weight: 500;">Last Login:</span>
                <span style="color: #666;"><?php echo isset($user['last_login']) ? date('M j, Y g:i A', strtotime($user['last_login'])) : 'Never'; ?></span>
            </div>
        </div>
    </div>
    
    <!-- Security Information -->
    <div class="card">
        <h3><i class="fas fa-shield-alt"></i> Security Information</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-lock"></i> 
                Your password is encrypted and stored securely.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                All transactions are protected by our escrow system.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-user-secret"></i> 
                Your personal information is never shared with third parties.
            </p>
            <p style="color: #666;">
                <i class="fas fa-key"></i> 
                Use a strong, unique password for better security.
            </p>
        </div>
    </div>
</div>

<?php
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
