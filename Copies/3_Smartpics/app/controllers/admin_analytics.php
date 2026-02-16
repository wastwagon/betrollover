<?php
/**
 * Admin Analytics - Clean, Simple Version
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

// Get analytics data
$analytics = [];

try {
    // User statistics
    $analytics['total_users'] = $db->fetch("SELECT COUNT(*) as count FROM users WHERE role = 'user'")['count'];
    $analytics['total_tipsters'] = $db->fetch("SELECT COUNT(*) as count FROM users WHERE role = 'tipster'")['count'];
    $analytics['total_admins'] = $db->fetch("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")['count'];
    
    // Pick statistics from accumulator_tickets table
    $analytics['total_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets")['count'];
    $analytics['approved_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'active'")['count'];
    $analytics['pending_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'pending_approval'")['count'];
    $analytics['sold_picks'] = $db->fetch("SELECT COUNT(*) as count FROM user_purchased_picks")['count'];
    
    // Financial statistics
    $analytics['total_sales'] = $db->fetch("SELECT COALESCE(SUM(purchase_price), 0) as total FROM user_purchased_picks")['total'] ?? 0;
    $analytics['total_escrow'] = $db->fetch("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_transactions WHERE status = 'held'")['total'] ?? 0;
    
    // Recent activity
    $analytics['recent_users'] = $db->fetchAll("
        SELECT username, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
    ");
    
    $analytics['recent_picks'] = $db->fetchAll("
        SELECT 
            at.title, 
            at.price, 
            at.status, 
            u.username as tipster_name, 
            at.created_at,
            COALESCE(at.is_marketplace, 0) as is_approved
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        ORDER BY at.created_at DESC
        LIMIT 5
    ");
    
    $analytics['recent_transactions'] = $db->fetchAll("
        SELECT wt.amount, wt.description, u.username, wt.created_at
        FROM wallet_transactions wt
        JOIN users u ON wt.user_id = u.id
        ORDER BY wt.created_at DESC
        LIMIT 5
    ");
    
    // Top performing tipsters
    $analytics['top_tipsters'] = $db->fetchAll("
        SELECT 
            u.username,
            COUNT(at.id) as total_picks,
            COUNT(CASE WHEN at.status = 'active' THEN 1 END) as approved_picks,
            COALESCE(SUM(at.price), 0) as total_revenue
        FROM users u
        LEFT JOIN accumulator_tickets at ON at.user_id = u.id
        WHERE u.role = 'tipster'
        GROUP BY u.id, u.username
        HAVING total_picks > 0
        ORDER BY total_revenue DESC
        LIMIT 5
    ");
    
} catch (Exception $e) {
    $analytics = [
        'total_users' => 0, 'total_tipsters' => 0, 'total_admins' => 0,
        'total_picks' => 0, 'approved_picks' => 0, 'pending_picks' => 0, 'sold_picks' => 0,
        'total_sales' => 0, 'total_escrow' => 0,
        'recent_users' => [], 'recent_picks' => [], 'recent_transactions' => [], 'top_tipsters' => []
    ];
}

// Set page variables
$pageTitle = "Analytics";

// Start content buffer
ob_start();
?>

<div class="admin-analytics-content">
    <div class="card">
        <h2><i class="fas fa-chart-bar"></i> Platform Analytics</h2>
        <p style="color: #666; margin-top: 10px;">Comprehensive overview of platform performance and user activity.</p>
    </div>
    
    <!-- Key Metrics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $analytics['total_users']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Users</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $analytics['total_tipsters']; ?></p>
                <p style="font-size: 14px; color: #666;">Active Tipsters</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $analytics['total_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Picks</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $analytics['sold_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Sold Picks</p>
            </div>
        </div>
    </div>
    
    <!-- Financial Overview -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <h3><i class="fas fa-dollar-sign"></i> Total Sales</h3>
            <div style="margin-top: 15px;">
                <p style="font-size: 28px; font-weight: bold; color: #2e7d32;">
                    $<?php echo number_format($analytics['total_sales'], 2); ?>
                </p>
                <p style="font-size: 12px; color: #666;">All-time marketplace sales</p>
            </div>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-shield-alt"></i> Escrow Funds</h3>
            <div style="margin-top: 15px;">
                <p style="font-size: 28px; font-weight: bold; color: #d32f2f;">
                    $<?php echo number_format($analytics['total_escrow'], 2); ?>
                </p>
                <p style="font-size: 12px; color: #666;">Currently held in escrow</p>
            </div>
        </div>
    </div>
    
    <!-- Pick Statistics -->
    <div class="card">
        <h3><i class="fas fa-chart-pie"></i> Pick Statistics</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 15px;">
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #2e7d32;"><?php echo $analytics['approved_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Approved</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #d32f2f;"><?php echo $analytics['pending_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Pending</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #2e7d32;"><?php echo $analytics['sold_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Sold</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #666;"><?php echo $analytics['total_picks'] - $analytics['approved_picks'] - $analytics['pending_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Rejected</p>
            </div>
        </div>
    </div>
    
    <!-- Top Performers -->
    <div class="card">
        <h3><i class="fas fa-trophy"></i> Top Performing Tipsters</h3>
        <?php if (empty($analytics['top_tipsters'])): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-trophy" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No tipster performance data available yet.</p>
        </div>
        <?php else: ?>
        <div style="margin-top: 15px;">
            <?php foreach ($analytics['top_tipsters'] as $index => $tipster): ?>
            <div style="display: flex; align-items: center; padding: 15px; border: 1px solid #f0f0f0; border-radius: 5px; margin-bottom: 10px;">
                <div style="width: 40px; text-align: center; margin-right: 15px;">
                    <?php if ($index < 3): ?>
                        <i class="fas fa-medal" style="font-size: 24px; color: <?php echo $index === 0 ? '#ffd700' : ($index === 1 ? '#c0c0c0' : '#cd7f32'); ?>;"></i>
                    <?php else: ?>
                        <span style="font-size: 18px; font-weight: bold; color: #666;"><?php echo $index + 1; ?></span>
                    <?php endif; ?>
                </div>
                
                <div style="flex: 1;">
                    <h4 style="margin-bottom: 5px; color: #d32f2f;">
                        <?php echo htmlspecialchars($tipster['username']); ?>
                    </h4>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #d32f2f;"><?php echo $tipster['total_picks']; ?></p>
                        <p style="font-size: 10px; color: #666;">Picks</p>
                    </div>
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #2e7d32;"><?php echo $tipster['approved_picks']; ?></p>
                        <p style="font-size: 10px; color: #666;">Approved</p>
                    </div>
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #2e7d32;">$<?php echo number_format($tipster['total_sales'], 0); ?></p>
                        <p style="font-size: 10px; color: #666;">Sales</p>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    
    <!-- Recent Activity -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
        <div class="card">
            <h3><i class="fas fa-user-plus"></i> Recent Users</h3>
            <?php if (empty($analytics['recent_users'])): ?>
            <p style="color: #666; margin-top: 15px;">No recent users.</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($analytics['recent_users'] as $recentUser): ?>
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
            <h3><i class="fas fa-list"></i> Recent Picks</h3>
            <?php if (empty($analytics['recent_picks'])): ?>
            <p style="color: #666; margin-top: 15px;">No recent picks.</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($analytics['recent_picks'] as $recentPick): ?>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                    <div>
                        <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($recentPick['title'] ?? 'N/A'); ?></p>
                        <p style="font-size: 12px; color: #666;">by <?php echo htmlspecialchars($recentPick['tipster_name'] ?? 'Unknown'); ?></p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-weight: bold; color: #2e7d32;">$<?php 
                            try {
                                $price = array_key_exists('price', $recentPick) ? (float)$recentPick['price'] : 0;
                                echo number_format($price, 2);
                            } catch (Exception $e) {
                                echo '0.00';
                            }
                        ?></p>
                        <?php 
                        // BULLETPROOF: Safely get is_approved value with all possible fallbacks
                        $isApproved = false;
                        try {
                            if (array_key_exists('is_approved', $recentPick) && $recentPick['is_approved'] !== null) {
                                $isApproved = (bool)$recentPick['is_approved'];
                            } elseif (array_key_exists('status', $recentPick) && $recentPick['status'] === 'active') {
                                $isApproved = true;
                            } elseif (array_key_exists('is_marketplace', $recentPick) && $recentPick['is_marketplace'] !== null) {
                                $isApproved = (bool)$recentPick['is_marketplace'];
                            }
                        } catch (Exception $e) {
                            $isApproved = false;
                        }
                        ?>
                        <span style="background-color: <?php echo $isApproved ? '#2e7d32' : '#d32f2f'; ?>; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                            <?php echo $isApproved ? 'Approved' : 'Pending'; ?>
                        </span>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-exchange-alt"></i> Recent Transactions</h3>
            <?php if (empty($analytics['recent_transactions'])): ?>
            <p style="color: #666; margin-top: 15px;">No recent transactions.</p>
            <?php else: ?>
            <div style="margin-top: 15px;">
                <?php foreach ($analytics['recent_transactions'] as $transaction): ?>
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
