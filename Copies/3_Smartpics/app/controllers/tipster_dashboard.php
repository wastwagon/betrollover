<?php
/**
 * Tipster Dashboard - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/TipsterPerformanceService.php';
require_once __DIR__ . '/../models/TipsterQualificationService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and tipster role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'tipster') {
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

// Get tipster info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Get tipster statistics
$stats = [];
$performanceService = TipsterPerformanceService::getInstance();

try {
    // Direct DB aggregation to ensure real values (avoids stale service cache/discrepancies)
$counts = $db->fetch("SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'decline' THEN 1 ELSE 0 END) as declined,
            SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won,
            SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost
        FROM accumulator_tickets WHERE user_id = ?", [$userId]);

    $stats['total_picks'] = isset($counts['total']) ? (int)$counts['total'] : 0;
    $stats['active_picks'] = isset($counts['active']) ? (int)$counts['active'] : 0;
    $stats['pending_picks'] = isset($counts['pending']) ? (int)$counts['pending'] : 0;
    $stats['won_picks'] = isset($counts['won']) ? (int)$counts['won'] : 0;
    $stats['lost_picks'] = isset($counts['lost']) ? (int)$counts['lost'] : 0;

    // Win rate and ROI computed from same source
    $settled = $stats['won_picks'] + $stats['lost_picks'];
    $stats['win_rate'] = $settled > 0 ? round(($stats['won_picks'] / $settled) * 100, 1) : 0.0;
    $sumOdds = $db->fetch("SELECT COALESCE(SUM(total_odds),0) as winnings FROM accumulator_tickets WHERE user_id = ? AND status = 'won'", [$userId]);
    $winnings = (float)($sumOdds['winnings'] ?? 0);
    $stakes = $settled; // using unit stake per ticket
    $stats['roi'] = $stakes > 0 ? round((($winnings - $stakes) / $stakes) * 100, 1) : 0.0;

    // Qualification using same logic as admin dashboard
    $qualificationService = TipsterQualificationService::getInstance();
    $qualification = $qualificationService->isTipsterQualified($userId);
    $stats['qualified'] = (bool)$qualification['qualified'];

// Optional debug: append raw stats when debug=1
if (isset($_GET['debug']) && $_GET['debug'] == '1') {
    echo "<div style=\"background:#fff3cd;border-left:4px solid #ff9800;padding:8px;margin:10px 0;color:#856404;font-size:12px;\">";
    echo "<strong>Debug</strong> — user_id: " . htmlspecialchars((string)$userId) . " | counts: " . htmlspecialchars(json_encode($counts)) . ", settled: " . htmlspecialchars((string)$settled) . ", roi: " . htmlspecialchars((string)$stats['roi']) . ", win_rate: " . htmlspecialchars((string)$stats['win_rate']);
    echo "</div>";
}
    
    // Total sales (from marketplace picks)
    $salesResult = $db->fetch("SELECT SUM(purchase_price) as total FROM user_purchased_picks upp JOIN accumulator_tickets at ON upp.accumulator_id = at.id WHERE at.user_id = ?", [$userId]);
    $stats['total_sales'] = $salesResult ? $salesResult['total'] : 0;
    
    // Recent picks
    $stats['recent_picks'] = $db->fetchAll("
        SELECT * FROM accumulator_tickets 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 5
    ", [$userId]);
    
    // Recent sales
    $stats['recent_sales'] = $db->fetchAll("
        SELECT upp.*, at.title, u.username as buyer_name 
        FROM user_purchased_picks upp
        JOIN accumulator_tickets at ON upp.accumulator_id = at.id
        JOIN users u ON upp.user_id = u.id 
        WHERE at.user_id = ? 
        ORDER BY upp.purchase_date DESC 
        LIMIT 5
    ", [$userId]);
    
} catch (Exception $e) {
    // Preserve any stats we already computed, and safely default missing ones
    $stats = array_merge([
        'total_picks' => 0,
        'active_picks' => 0,
        'pending_picks' => 0,
        'won_picks' => 0,
        'lost_picks' => 0,
        'roi' => 0,
        'qualified' => false,
        'total_sales' => 0,
        'recent_picks' => [],
        'recent_sales' => []
    ], $stats);
}

// Set page variables
$pageTitle = "Tipster Dashboard";

// Start content buffer
ob_start();
?>

<div class="tipster-dashboard-content">
    <div class="card">
        <h2><i class="fas fa-star"></i> Tipster Dashboard</h2>
        <p style="color: #666; margin-top: 10px;">Welcome back, <?php echo htmlspecialchars($user['username']); ?>! Here's your tipster overview.</p>
    </div>
    
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card stat-card">
            <p class="stat-label">Total Picks</p>
            <p class="stat-value" style="color: #d32f2f;"><?php echo number_format($stats['total_picks']); ?></p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Active Picks</p>
            <p class="stat-value" style="color: #2e7d32;"><?php echo number_format($stats['active_picks']); ?></p>
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
            <p class="stat-label">Win Rate</p>
            <p class="stat-value" style="color: <?php echo $stats['win_rate'] >= 50 ? '#2e7d32' : '#d32f2f'; ?>;">
                <?php echo number_format($stats['win_rate'], 1); ?>%
            </p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">ROI</p>
            <p class="stat-value" style="color: <?php echo $stats['roi'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>;">
                <?php echo number_format($stats['roi'], 1); ?>%
            </p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Qualification</p>
            <p class="number-small" style="color: <?php echo $stats['qualified'] ? '#2e7d32' : '#d32f2f'; ?>;">
                <?php echo $stats['qualified'] ? 'Qualified' : 'Not Qualified'; ?>
            </p>
        </div>
        
        <div class="card stat-card">
            <p class="stat-label">Total Sales</p>
            <p class="stat-value" style="color: #2e7d32;">GHS <?php echo number_format($stats['total_sales'], 2); ?></p>
        </div>
    </div>
    
    <!-- Wallet Balance -->
    <div class="card">
        <h3><i class="fas fa-wallet"></i> Wallet Balance</h3>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 15px;">
            <div>
                <p class="stat-label">Available Balance</p>
                <p class="number-large" style="color: #2e7d32; margin-top: 4px;">
                    GHS <?php echo number_format($walletBalance, 2); ?>
                </p>
            </div>
            <a href="/SmartPicksPro-Local/payout_request" class="btn btn-primary">
                <i class="fas fa-money-bill-wave"></i> Request Payout
            </a>
        </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="card">
        <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
            <a href="<?= $baseUrl ?>/create_pick" class="btn btn-success" style="text-align: center; padding: 20px;">
                <i class="fas fa-plus-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Create New Pick
            </a>
            
            <a href="<?= $baseUrl ?>/my_picks" class="btn btn-primary" style="text-align: center; padding: 20px;">
                <i class="fas fa-list" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Manage Picks
            </a>
            
            <a href="<?= $baseUrl ?>/marketplace" class="btn btn-secondary" style="text-align: center; padding: 20px;">
                <i class="fas fa-store" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Browse Marketplace
            </a>
            
            <a href="<?= $baseUrl ?>/wallet" class="btn btn-primary" style="text-align: center; padding: 20px;">
                <i class="fas fa-wallet" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                Manage Wallet
            </a>
        </div>
    </div>
    
    <!-- Recent Activity -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="card">
            <h3><i class="fas fa-list"></i> Recent Picks</h3>
            <?php if (empty($stats['recent_picks'])): ?>
                <p style="color: #666; margin-top: 15px;">No picks created yet. <a href="<?= $baseUrl ?>/create_pick">Create your first pick</a>!</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($stats['recent_picks'] as $pick): ?>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                    <div>
                        <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($pick['title']); ?></p>
                        <p style="font-size: 12px; color: #666;"><?php echo date('M j, Y', strtotime($pick['created_at'])); ?></p>
                    </div>
                    <?php 
                        $statusColor = '#ff9800';
                        if ($pick['status'] === 'active' || $pick['status'] === 'won') { $statusColor = '#2e7d32'; }
                        if ($pick['status'] === 'decline' || $pick['status'] === 'lost') { $statusColor = '#d32f2f'; }
                    ?>
                    <span style="background-color: <?php echo $statusColor; ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                        <?php echo ucfirst(str_replace('_', ' ', $pick['status'])); ?>
                    </span>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-shopping-cart"></i> Recent Sales</h3>
            <?php if (empty($stats['recent_sales'])): ?>
            <p style="color: #666; margin-top: 15px;">No sales yet. Create approved picks to start earning!</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($stats['recent_sales'] as $sale): ?>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                    <div>
                        <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($sale['title']); ?></p>
                        <p style="font-size: 12px; color: #666;">Sold to <?php echo htmlspecialchars($sale['buyer_name']); ?></p>
                    </div>
                    <div style="text-align: right;">
                        <?php $saleAmount = isset($sale['purchase_price']) ? $sale['purchase_price'] : ($sale['price'] ?? 0); ?>
                        <p style="font-weight: bold; color: #2e7d32;">
                            GHS <?php echo number_format($saleAmount, 2); ?>
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

// Include tipster layout
include __DIR__ . '/../views/layouts/tipster_layout.php';
?>
