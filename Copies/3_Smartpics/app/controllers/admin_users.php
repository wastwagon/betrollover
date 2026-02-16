<?php
/**
 * Admin Users - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    // Detect base URL dynamically
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
    $baseUrl = '';
    if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
        $baseUrl = '/SmartPicksPro-Local';
    }
    header('Location: ' . $baseUrl . '/login');
    exit;
}

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get users
$users = [];
$stats = [];

try {
    $users = $db->fetchAll("
        SELECT u.*, uw.balance
        FROM users u
        LEFT JOIN user_wallets uw ON u.id = uw.user_id
        ORDER BY u.created_at DESC
    ");
    
    // Get statistics
    $stats['total_users'] = count($users);
    $stats['total_admins'] = count(array_filter($users, function($u) { return $u['role'] === 'admin'; }));
    $stats['total_tipsters'] = count(array_filter($users, function($u) { return $u['role'] === 'tipster'; }));
    $stats['total_regular_users'] = count(array_filter($users, function($u) { return $u['role'] === 'user'; }));
    
} catch (Exception $e) {
    $users = [];
    $stats = ['total_users' => 0, 'total_admins' => 0, 'total_tipsters' => 0, 'total_regular_users' => 0];
}

// Handle user actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_role') {
        $targetUserId = intval($_POST['user_id'] ?? 0);
        $newRole = trim($_POST['new_role'] ?? '');
        
        if ($targetUserId && in_array($newRole, ['user', 'tipster', 'admin'])) {
            try {
                $db->execute("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?", [$newRole, $targetUserId]);
                $message = "User role updated successfully.";
                
                // Refresh users
                $users = $db->fetchAll("
                    SELECT u.*, uw.balance
                    FROM users u
                    LEFT JOIN user_wallets uw ON u.id = uw.user_id
                    ORDER BY u.created_at DESC
                ");
            } catch (Exception $e) {
                $error = "Error updating user role: " . $e->getMessage();
            }
        } else {
            $error = "Invalid user or role selected.";
        }
    }
    
    if ($action === 'toggle_status') {
        $targetUserId = intval($_POST['user_id'] ?? 0);
        
        if ($targetUserId) {
            try {
                $currentStatus = $db->fetch("SELECT is_active FROM users WHERE id = ?", [$targetUserId]);
                $newStatus = $currentStatus['is_active'] ? 0 : 1;
                
                $db->execute("UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?", [$newStatus, $targetUserId]);
                $message = "User status updated successfully.";
                
                // Refresh users
                $users = $db->fetchAll("
                    SELECT u.*, uw.balance
                    FROM users u
                    LEFT JOIN user_wallets uw ON u.id = uw.user_id
                    ORDER BY u.created_at DESC
                ");
            } catch (Exception $e) {
                $error = "Error updating user status: " . $e->getMessage();
            }
        }
    }
}

// Set page variables
$pageTitle = "User Management";

// Start content buffer
ob_start();
?>

<div class="admin-users-content">
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
        <h2><i class="fas fa-users"></i> User Management</h2>
        <p style="color: #666; margin-top: 10px;">Manage all platform users, roles, and account status.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['total_users']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Users</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['total_tipsters']; ?></p>
                <p style="font-size: 14px; color: #666;">Tipsters</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_regular_users']; ?></p>
                <p style="font-size: 14px; color: #666;">Regular Users</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['total_admins']; ?></p>
                <p style="font-size: 14px; color: #666;">Admins</p>
            </div>
        </div>
    </div>
    
    <!-- Users Table -->
    <div class="card">
        <h3><i class="fas fa-list"></i> All Users</h3>
        
        <?php if (empty($users)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No users found.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">User</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Role</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Balance</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Joined</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $userData): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px;">
                            <div>
                                <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($userData['username']); ?></p>
                                <p style="font-size: 12px; color: #666;"><?php echo htmlspecialchars($userData['email']); ?></p>
                            </div>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $userData['role'] === 'admin' ? '#d32f2f' : ($userData['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                                <?php echo $userData['role']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: 500; color: #2e7d32;">
                                $<?php echo number_format($userData['balance'] ?? 0, 2); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $userData['is_active'] ? '#2e7d32' : '#d32f2f'; ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                                <?php echo $userData['is_active'] ? 'Active' : 'Inactive'; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-size: 12px; color: #666;">
                                <?php echo date('M j, Y', strtotime($userData['created_at'])); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; gap: 5px;">
                                <!-- Role Update Form -->
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="update_role">
                                    <input type="hidden" name="user_id" value="<?php echo $userData['id']; ?>">
                                    <select name="new_role" onchange="this.form.submit()" style="padding: 4px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;">
                                        <option value="user" <?php echo $userData['role'] === 'user' ? 'selected' : ''; ?>>User</option>
                                        <option value="tipster" <?php echo $userData['role'] === 'tipster' ? 'selected' : ''; ?>>Tipster</option>
                                        <option value="admin" <?php echo $userData['role'] === 'admin' ? 'selected' : ''; ?>>Admin</option>
                                    </select>
                                </form>
                                
                                <!-- Status Toggle Form -->
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="toggle_status">
                                    <input type="hidden" name="user_id" value="<?php echo $userData['id']; ?>">
                                    <button type="submit" class="btn btn-sm <?php echo $userData['is_active'] ? 'btn-secondary' : 'btn-success'; ?>" style="padding: 4px 8px; font-size: 12px;">
                                        <?php echo $userData['is_active'] ? 'Deactivate' : 'Activate'; ?>
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
    
    <!-- User Management Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> User Management Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Only change user roles when necessary and with proper justification.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-exclamation-triangle"></i> 
                Deactivating users will prevent them from logging in and using the platform.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-user-check"></i> 
                Tipster role grants access to create and sell picks on the marketplace.
            </p>
            <p style="color: #666;">
                <i class="fas fa-crown"></i> 
                Admin role provides full access to all platform management features.
            </p>
        </div>
    </div>
</div>

<style>
.btn-sm {
    padding: 4px 8px;
    font-size: 12px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
}

.btn-sm:hover {
    opacity: 0.8;
    text-decoration: none;
}
</style>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

