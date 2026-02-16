<?php
/**
 * Admin Leaderboard - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/TipsterPerformanceService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get leaderboard data
$leaderboardData = [];
$stats = [];
$performanceService = TipsterPerformanceService::getInstance();

try {
    // Get comprehensive leaderboard data using the performance service
    $leaderboardData = $performanceService->getLeaderboard(20);
    
    // Get platform statistics
    $stats['total_tipsters'] = count($leaderboardData);
    $stats['total_picks'] = array_sum(array_column($leaderboardData, 'total_picks'));
    $stats['total_won'] = array_sum(array_column($leaderboardData, 'won_picks'));
    $stats['total_lost'] = array_sum(array_column($leaderboardData, 'lost_picks'));
    $stats['total_sales'] = array_sum(array_column($leaderboardData, 'total_sales'));
    
    // Calculate platform ROI
    $totalSettledPicks = $stats['total_won'] + $stats['total_lost'];
    $stats['platform_roi'] = $totalSettledPicks > 0 ? (($stats['total_won'] - $stats['total_lost']) / $totalSettledPicks) * 100 : 0;
    $stats['platform_roi'] = round($stats['platform_roi'], 2);
    
    $stats['active_tipsters'] = count(array_filter($leaderboardData, function($tipster) { return $tipster['total_picks'] > 0; }));
    $stats['top_performer'] = !empty($leaderboardData) ? $leaderboardData[0]['username'] : 'N/A';
    
} catch (Exception $e) {
    $leaderboardData = [];
    $stats = [
        'total_tipsters' => 0,
        'total_picks' => 0,
        'total_won' => 0,
        'total_lost' => 0,
        'total_sales' => 0,
        'platform_roi' => 0,
        'active_tipsters' => 0,
        'top_performer' => 'N/A'
    ];
}

// Set page variables
$pageTitle = "Leaderboard Management";

// Start content buffer
ob_start();
?>

<div class="admin-leaderboard-content">
    <div class="card">
        <h2><i class="fas fa-trophy"></i> Leaderboard Management</h2>
        <p style="color: #666; margin-top: 10px;">Monitor tipster performance and manage leaderboard rankings.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['total_tipsters']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Tipsters</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['active_tipsters']; ?></p>
                <p style="font-size: 14px; color: #666;">Active Tipsters</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo htmlspecialchars($stats['top_performer']); ?></p>
                <p style="font-size: 14px; color: #666;">Top Performer</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;">$<?php echo number_format($stats['total_sales'], 2); ?></p>
                <p style="font-size: 14px; color: #666;">Total Sales</p>
            </div>
        </div>
    </div>
    
    <!-- Leaderboard -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Tipster Leaderboard</h3>
        
        <?php if (empty($leaderboardData)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-trophy" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No tipster data available yet.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Rank</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Tipster</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Total Picks</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Won</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Lost</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Win Rate</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">ROI</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Total Sales</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($leaderboardData as $index => $tipster): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <?php if ($index < 3): ?>
                                    <i class="fas fa-medal" style="font-size: 20px; color: <?php echo $index === 0 ? '#ffd700' : ($index === 1 ? '#c0c0c0' : '#cd7f32'); ?>;"></i>
                                <?php else: ?>
                                    <span style="font-size: 16px; font-weight: bold; color: #666;"><?php echo $index + 1; ?></span>
                                <?php endif; ?>
                            </div>
                        </td>
                        <td style="padding: 12px;">
                            <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($tipster['display_name'] ?: $tipster['username']); ?></p>
                            <p style="font-size: 12px; color: #666;">@<?php echo htmlspecialchars($tipster['username']); ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: #666;">
                                <?php echo $tipster['total_picks']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: #2e7d32;">
                                <?php echo $tipster['won_picks']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: #d32f2f;">
                                <?php echo $tipster['lost_picks']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: <?php echo $tipster['win_rate'] >= 60 ? '#2e7d32' : ($tipster['win_rate'] >= 40 ? '#d32f2f' : '#666'); ?>;">
                                <?php echo $tipster['win_rate']; ?>%
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: <?php echo $tipster['roi'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>;">
                                <?php echo $tipster['roi']; ?>%
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: #2e7d32;">
                                GHS <?php echo number_format($tipster['total_sales'], 2); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <button type="button" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="viewTipsterProfile(<?php echo $tipster['id']; ?>)">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Performance Insights -->
    <div class="card">
        <h3><i class="fas fa-chart-bar"></i> Performance Insights</h3>
        <div style="margin-top: 15px;">
            <?php if (!empty($leaderboardData)): ?>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Top Performers</h5>
                    <ul style="color: #666; font-size: 14px;">
                        <?php for ($i = 0; $i < min(3, count($leaderboardData)); $i++): ?>
                        <li style="margin-bottom: 5px;">
                            <?php echo ($i + 1); ?>. <?php echo htmlspecialchars($leaderboardData[$i]['username']); ?> 
                            (<?php echo $leaderboardData[$i]['win_rate']; ?>% win rate)
                        </li>
                        <?php endfor; ?>
                    </ul>
                </div>
                
                <div>
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Sales Leaders</h5>
                    <ul style="color: #666; font-size: 14px;">
                        <?php 
                        $salesLeaders = $leaderboardData;
                        usort($salesLeaders, function($a, $b) { return $b['total_sales'] <=> $a['total_sales']; });
                        for ($i = 0; $i < min(3, count($salesLeaders)); $i++): ?>
                        <li style="margin-bottom: 5px;">
                            <?php echo ($i + 1); ?>. <?php echo htmlspecialchars($salesLeaders[$i]['username']); ?> 
                            ($<?php echo number_format($salesLeaders[$i]['total_sales'], 2); ?>)
                        </li>
                        <?php endfor; ?>
                    </ul>
                </div>
            </div>
            <?php else: ?>
            <p style="color: #666;">No performance data available yet.</p>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Leaderboard Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Leaderboard Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-trophy"></i> 
                Rankings are based on win rate and total sales performance.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-chart-line"></i> 
                Monitor tipster performance to identify top performers and areas for improvement.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-star"></i> 
                Top performers may be eligible for special recognition or rewards.
            </p>
            <p style="color: #666;">
                <i class="fas fa-shield-alt"></i> 
                Ensure fair competition by monitoring for any suspicious activity.
            </p>
        </div>
    </div>
</div>

<script>
function viewTipsterProfile(tipsterId) {
    // Simple implementation - can be enhanced with modal or new page
    alert('Tipster profile view will be implemented for tipster ID: ' + tipsterId);
}
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
