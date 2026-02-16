<?php
/**
 * Admin Dashboard - Clean, Simple Version
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

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get dashboard statistics
$stats = [];

try {
    // Total users
    $userResult = $db->fetch("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
    $stats['total_users'] = $userResult ? $userResult['count'] : 0;
    
    // Total tipsters
    $tipsterResult = $db->fetch("SELECT COUNT(*) as count FROM users WHERE role = 'tipster'");
    $stats['total_tipsters'] = $tipsterResult ? $tipsterResult['count'] : 0;
    
    // Pending tipster applications
    $appResult = $db->fetch("SELECT COUNT(*) as count FROM tipster_verification_applications WHERE status = 'pending'");
    $stats['pending_applications'] = $appResult ? $appResult['count'] : 0;
    
    // Pick statistics from accumulator_tickets table
    $picksResult = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets");
    $stats['total_picks'] = $picksResult ? $picksResult['count'] : 0;
    
    $pendingResult = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'pending_approval'");
    $stats['pending_approvals'] = $pendingResult ? $pendingResult['count'] : 0;
    
    $approvedResult = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status IN ('active', 'won', 'lost')");
    $stats['approved_picks'] = $approvedResult ? $approvedResult['count'] : 0;
    
    $wonResult = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'won'");
    $stats['won_picks'] = $wonResult ? $wonResult['count'] : 0;
    
    $lostResult = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'lost'");
    $stats['lost_picks'] = $lostResult ? $lostResult['count'] : 0;
    
    $unsettledResult = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'active'");
    $stats['unsettled_picks'] = $unsettledResult ? $unsettledResult['count'] : 0;
    
    // Total escrow funds (from escrow_funds table)
    $escrowResult = $db->fetch("SELECT SUM(amount) as total FROM escrow_funds WHERE status = 'held'");
    $stats['escrow_funds'] = ($escrowResult && $escrowResult['total'] !== null) ? floatval($escrowResult['total']) : 0.00;
    
    // Recent users
    $stats['recent_users'] = $db->fetchAll("
        SELECT username, email, created_at, role 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
    ") ?: [];
    
    // Recent transactions
    $stats['recent_transactions'] = $db->fetchAll("
        SELECT wt.*, u.username 
        FROM wallet_transactions wt 
        JOIN users u ON wt.user_id = u.id 
        ORDER BY wt.created_at DESC 
        LIMIT 5
    ") ?: [];
    
} catch (Exception $e) {
    // Debug: Log the error
    error_log("Admin Dashboard Error: " . $e->getMessage());
    
    $stats = [
        'total_users' => 0,
        'total_tipsters' => 0,
        'pending_applications' => 0,
        'total_picks' => 0,
        'pending_approvals' => 0,
        'approved_picks' => 0,
        'won_picks' => 0,
        'lost_picks' => 0,
        'unsettled_picks' => 0,
        'escrow_funds' => 0,
        'recent_users' => [],
        'recent_transactions' => []
    ];
}

// Set page variables
$pageTitle = "Admin Dashboard";
$pageSubtitle = "Welcome back, admin! Here's your platform overview.";

// Start content buffer
ob_start();
?>
<div class="admin-dashboard-content">
    <div class="card">
        <h2><i class="fas fa-tachometer-alt"></i> Admin Dashboard</h2>
        <p style="color: #666; margin-top: 10px;">Welcome back, <?php echo htmlspecialchars($user['username']); ?>! Here's your platform overview.</p>
    </div>
    
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card stat-card">
            <p class="stat-label">Total Users</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['total_users']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Total Tipsters</p>
            <p class="stat-value" style="color: #2e7d32;"><?php echo number_format($stats['total_tipsters']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Pending Applications</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['pending_applications']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Total Picks</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['total_picks']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Pending Approvals</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['pending_approvals']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Approved Picks</p>
            <p class="stat-value" style="color: #2e7d32;"><?php echo number_format($stats['approved_picks']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Won Picks</p>
            <p class="stat-value" style="color: #2e7d32;"><?php echo number_format($stats['won_picks']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Lost Picks</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['lost_picks']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Unsettled Picks</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['unsettled_picks']); ?></p>
        </div>
    </div>
    
    <!-- Escrow Funds -->
    <div class="card">
        <h3><i class="fas fa-shield-alt"></i> Escrow Funds</h3>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 15px;">
            <div>
                <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Escrow Funds</p>
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;">
                    $<?php echo number_format($stats['escrow_funds'], 2); ?>
                </p>
            </div>
            <a href="<?= $baseUrl ?>/admin_escrow" class="btn btn-primary">
                <i class="fas fa-shield-alt"></i> Manage Escrow
            </a>
        </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="card">
        <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
            <a href="<?= $baseUrl ?>/admin_users" class="btn btn-primary" style="text-align: center; padding: 20px;">
                <i class="fas fa-users" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Manage Users
            </a>
            
            <a href="<?= $baseUrl ?>/admin_tipster_applications" class="btn btn-success" style="text-align: center; padding: 20px;">
                <i class="fas fa-user-check" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Review Applications
            </a>
            
            <a href="<?= $baseUrl ?>/admin_approve_pick" class="btn btn-secondary" style="text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Approve Picks
            </a>
            
            <a href="<?= $baseUrl ?>/admin_analytics" class="btn btn-primary" style="text-align: center; padding: 20px;">
                <i class="fas fa-chart-bar" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                View Analytics
            </a>
        </div>
    </div>
    
    <!-- Recent Activity -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="card">
            <h3><i class="fas fa-user-plus"></i> Recent Users</h3>
            <?php if (empty($stats['recent_users'])): ?>
            <p style="color: #666; margin-top: 15px;">No recent users.</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($stats['recent_users'] as $recentUser): ?>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                    <div>
                        <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($recentUser['username']); ?></p>
                        <p style="font-size: 12px; color: #666;"><?php echo date('M j, Y', strtotime($recentUser['created_at'])); ?></p>
                    </div>
                    <span style="background-color: <?php echo $recentUser['role'] === 'admin' ? '#d32f2f' : ($recentUser['role'] === 'tipster' ? '#2e7d32' : '#666'); ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                        <?php echo $recentUser['role']; ?>
                    </span>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-exchange-alt"></i> Recent Transactions</h3>
            <?php if (empty($stats['recent_transactions'])): ?>
            <p style="color: #666; margin-top: 15px;">No recent transactions.</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($stats['recent_transactions'] as $transaction): ?>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                    <div>
                        <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($transaction['username']); ?></p>
                        <p style="font-size: 12px; color: #666;"><?php echo htmlspecialchars($transaction['description']); ?></p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-weight: bold; color: <?php echo $transaction['amount'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>;">
                            <?php echo ($transaction['amount'] >= 0 ? '+' : '') . '$' . number_format($transaction['amount'], 2); ?>
                        </p>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
