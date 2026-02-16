<?php
/**
 * User Dashboard - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

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

// Set page variables
$pageTitle = "Dashboard";

// Start content buffer
ob_start();
?>

<div class="dashboard-content">
    <div class="card">
        <h2><i class="fas fa-tachometer-alt"></i> Welcome Back, <?php echo htmlspecialchars($user['username']); ?>!</h2>
        <p>Here's what's happening with your account today.</p>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-wallet"></i> Wallet Summary</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
            <div>
                <p class="stat-label">Available Balance</p>
                <p class="number-large" style="color: #2e7d32; margin-top: 4px;">
                    GHS <?php echo number_format($walletBalance, 2); ?>
                </p>
            </div>
            <a href="<?= $baseUrl ?>/wallet" class="btn btn-primary">
                <i class="fas fa-wallet"></i> Manage Wallet
            </a>
        </div>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-store"></i> Quick Actions</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
            <a href="<?= $baseUrl ?>/marketplace" class="btn btn-success" style="text-align: center; padding: 20px;">
                <i class="fas fa-store" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Browse Marketplace
            </a>
            
            <a href="<?= $baseUrl ?>/my_purchases" class="btn btn-secondary" style="text-align: center; padding: 20px;">
                <i class="fas fa-shopping-bag" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                My Purchases
            </a>
            
            <?php if ($userRole === 'user'): ?>
            <a href="<?= $baseUrl ?>/become_tipster" class="btn btn-primary" style="text-align: center; padding: 20px;">
                <i class="fas fa-star" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Become Tipster
            </a>
            <?php endif; ?>
            
            <a href="<?= $baseUrl ?>/profile" class="btn btn-secondary" style="text-align: center; padding: 20px;">
                <i class="fas fa-user" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Edit Profile
            </a>
        </div>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-chart-line"></i> Recent Activity</h3>
        <p style="color: #666; margin-top: 15px;">
            <i class="fas fa-info-circle"></i> 
            Your recent activity will appear here. Start by browsing the marketplace or managing your wallet.
        </p>
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
