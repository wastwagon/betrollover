<?php
/**
 * Leaderboard - Clean, Simple Version
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

// Get leaderboard data
$leaderboard = [];
$userStats = null;

try {
    // Get tipster leaderboard (based on sales and success rate)
    $leaderboard = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.full_name,
            COUNT(mp.id) as total_picks,
            SUM(CASE WHEN mp.is_approved = 1 THEN 1 ELSE 0 END) as approved_picks,
            SUM(CASE WHEN mp.buyer_id IS NOT NULL THEN mp.price ELSE 0 END) as total_sales,
            AVG(CASE WHEN mp.buyer_id IS NOT NULL THEN mp.price ELSE NULL END) as avg_price,
            COUNT(CASE WHEN mp.buyer_id IS NOT NULL THEN 1 ELSE NULL END) as sold_picks
        FROM users u
        LEFT JOIN marketplace_picks mp ON u.id = mp.tipster_id
        WHERE u.role = 'tipster'
        GROUP BY u.id, u.username, u.full_name
        HAVING total_picks > 0
        ORDER BY total_sales DESC, approved_picks DESC
        LIMIT 20
    ");
    
    // Get current user's stats if they're a tipster
    if ($userRole === 'tipster') {
        $userStats = $db->fetch("
            SELECT 
                COUNT(mp.id) as total_picks,
                SUM(CASE WHEN mp.is_approved = 1 THEN 1 ELSE 0 END) as approved_picks,
                SUM(CASE WHEN mp.buyer_id IS NOT NULL THEN mp.price ELSE 0 END) as total_sales,
                AVG(CASE WHEN mp.buyer_id IS NOT NULL THEN mp.price ELSE NULL END) as avg_price,
                COUNT(CASE WHEN mp.buyer_id IS NOT NULL THEN 1 ELSE NULL END) as sold_picks
            FROM marketplace_picks mp
            WHERE mp.tipster_id = ?
        ", [$userId]);
    }
} catch (Exception $e) {
    $leaderboard = [];
    $userStats = null;
}

// Set page variables
$pageTitle = "Leaderboard";

// Start content buffer
ob_start();
?>

<div class="leaderboard-content">
    <div class="card">
        <h2><i class="fas fa-trophy"></i> Tipster Leaderboard</h2>
        <p style="color: #666; margin-top: 10px;">Top performing tipsters based on sales and success rate.</p>
    </div>
    
    <?php if ($userRole === 'tipster' && $userStats): ?>
    <div class="card">
        <h3><i class="fas fa-user"></i> Your Performance</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 15px;">
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #d32f2f;"><?php echo $userStats['total_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Total Picks</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #2e7d32;"><?php echo $userStats['approved_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Approved</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #2e7d32;"><?php echo $userStats['sold_picks']; ?></p>
                <p style="font-size: 12px; color: #666;">Sold</p>
            </div>
            <div style="text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #2e7d32;">$<?php echo number_format($userStats['total_sales'], 2); ?></p>
                <p style="font-size: 12px; color: #666;">Total Sales</p>
            </div>
        </div>
    </div>
    <?php endif; ?>
    
    <?php if (empty($leaderboard)): ?>
    <div class="card">
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-trophy" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h3>No tipsters yet</h3>
            <p style="color: #666;">The leaderboard will populate as tipsters start creating and selling picks.</p>
        </div>
    </div>
    <?php else: ?>
    
    <div class="card">
        <h3><i class="fas fa-medal"></i> Top Tipsters</h3>
        <div style="margin-top: 15px;">
            <?php foreach ($leaderboard as $index => $tipster): ?>
            <div style="display: flex; align-items: center; padding: 15px; border: 1px solid #f0f0f0; border-radius: 5px; margin-bottom: 10px; background-color: <?php echo $index < 3 ? '#f8f9fa' : 'white'; ?>;">
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
                        <?php if ($tipster['id'] === $userId): ?>
                            <span style="background-color: #d32f2f; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">YOU</span>
                        <?php endif; ?>
                    </h4>
                    <p style="font-size: 12px; color: #666; margin-bottom: 5px;">
                        <?php echo htmlspecialchars($tipster['full_name'] ?? ''); ?>
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center;">
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #d32f2f;"><?php echo $tipster['total_picks']; ?></p>
                        <p style="font-size: 10px; color: #666;">Picks</p>
                    </div>
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #2e7d32;"><?php echo $tipster['approved_picks']; ?></p>
                        <p style="font-size: 10px; color: #666;">Approved</p>
                    </div>
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #2e7d32;"><?php echo $tipster['sold_picks']; ?></p>
                        <p style="font-size: 10px; color: #666;">Sold</p>
                    </div>
                    <div>
                        <p style="font-size: 14px; font-weight: bold; color: #2e7d32;">$<?php echo number_format($tipster['total_sales'], 0); ?></p>
                        <p style="font-size: 10px; color: #666;">Sales</p>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    
    <?php endif; ?>
    
    <!-- Leaderboard Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> How Rankings Work</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-trophy"></i> 
                Rankings are based on total sales volume and number of approved picks.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-chart-line"></i> 
                Success rate and user ratings also influence rankings.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-clock"></i> 
                Rankings are updated in real-time as new sales occur.
            </p>
            <p style="color: #666;">
                <i class="fas fa-star"></i> 
                Top performers get featured placement and increased visibility.
            </p>
        </div>
    </div>
    
    <?php if ($userRole === 'user'): ?>
    <div class="card">
        <h3><i class="fas fa-lightbulb"></i> Want to Join the Leaderboard?</h3>
        <p style="color: #666; margin-top: 10px;">
            Become a verified tipster and start earning money by sharing your sports predictions.
        </p>
        <a href="<?= $baseUrl ?>/become_tipster" class="btn btn-primary" style="margin-top: 15px;">
            <i class="fas fa-star"></i> Apply to Become Tipster
        </a>
    </div>
    <?php endif; ?>
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
