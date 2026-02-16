<?php
/**
 * My Picks - Clean, Simple Version
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

// Check for success message from session (after redirect from create_pick)
$success = '';
if (isset($_SESSION['pick_creation_success'])) {
    $success = $_SESSION['pick_creation_success'];
    unset($_SESSION['pick_creation_success']);
}

// Also check for success in URL parameter
if (isset($_GET['success']) && $_GET['success'] == '1' && empty($success)) {
    $success = "Pick created successfully! It will be reviewed by admin before going live.";
}

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Get user's picks (for tipsters) or purchased picks (for users)
$picks = [];

if ($userRole === 'tipster') {
    // Get tipster's created picks from accumulator_tickets
    try {
        $picks = $db->fetchAll("
            SELECT 
                at.*,
                pm.purchase_count,
                pm.view_count,
                pm.status as marketplace_status,
                COUNT(upp.id) as total_purchases
            FROM accumulator_tickets at
            LEFT JOIN pick_marketplace pm ON at.id = pm.accumulator_id
            LEFT JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
            WHERE at.user_id = ? 
            GROUP BY at.id
            ORDER BY at.created_at DESC
        ", [$userId]);
    } catch (Exception $e) {
        $picks = [];
    }
} else {
    // Get user's purchased picks from user_purchased_picks
    try {
        $picks = $db->fetchAll("
            SELECT 
                upp.*,
                at.title,
                at.description,
                at.total_odds,
                at.price,
                at.status as pick_status,
                u.username as tipster_name,
                u.display_name as tipster_display_name
            FROM user_purchased_picks upp
            JOIN accumulator_tickets at ON upp.accumulator_id = at.id
            JOIN users u ON at.user_id = u.id
            WHERE upp.user_id = ? 
            ORDER BY upp.purchase_date DESC
        ", [$userId]);
    } catch (Exception $e) {
        $picks = [];
    }
}

// Set page variables
$pageTitle = $userRole === 'tipster' ? "My Picks" : "My Purchases";

// Start content buffer
ob_start();
?>

<div class="my-picks-content">
    <?php if ($success): ?>
        <div class="alert alert-success" style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
            <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
        </div>
    <?php endif; ?>
    
    <div class="card">
        <h2>
            <i class="fas fa-<?php echo $userRole === 'tipster' ? 'list' : 'shopping-bag'; ?>"></i> 
            <?php echo $userRole === 'tipster' ? 'My Picks' : 'My Purchases'; ?>
        </h2>
        <p style="color: #666; margin-top: 10px;">
            <?php if ($userRole === 'tipster'): ?>
                Manage all the picks you've created and track their performance.
            <?php else: ?>
                View all the picks you've purchased from tipsters.
            <?php endif; ?>
        </p>
    </div>
    
    <?php if (empty($picks)): ?>
    <div class="card">
        <div style="text-align: center; padding: 40px;">
            <?php if ($userRole === 'tipster'): ?>
                <i class="fas fa-list" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No picks created yet</h3>
                <p style="color: #666; margin-bottom: 20px;">Start creating picks to share your expertise and earn money.</p>
                <a href="<?= $baseUrl ?>/create_pick" class="btn btn-success">
                    <i class="fas fa-plus-circle"></i> Create First Pick
                </a>
            <?php else: ?>
                <i class="fas fa-shopping-bag" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No purchases yet</h3>
                <p style="color: #666; margin-bottom: 20px;">Start by browsing the marketplace and purchasing picks from verified tipsters.</p>
                <a href="<?= $baseUrl ?>/marketplace" class="btn btn-primary">
                    <i class="fas fa-store"></i> Browse Marketplace
                </a>
            <?php endif; ?>
        </div>
    </div>
    <?php else: ?>
    
    <!-- Statistics Section - Modern KPI Dashboard -->
    <?php if ($userRole === 'tipster'): ?>
    <?php 
    $activeCount = count(array_filter($picks, function($pick) { return $pick['status'] === 'active'; }));
    $pendingCount = count(array_filter($picks, function($pick) { return $pick['status'] === 'pending_approval'; }));
    $declinedCount = count(array_filter($picks, function($pick) { return $pick['status'] === 'decline'; }));
    $wonCount = count(array_filter($picks, function($pick) { return $pick['status'] === 'won'; }));
    $lostCount = count(array_filter($picks, function($pick) { return $pick['status'] === 'lost'; }));
    $totalPurchases = array_sum(array_column($picks, 'total_purchases'));
    $totalViews = array_sum(array_column($picks, 'view_count'));
    
    // Use the same service as the main dashboard
    require_once __DIR__ . '/../models/TipsterPerformanceService.php';
    $performanceService = TipsterPerformanceService::getInstance();
    $tipsterStats = $performanceService->getTipsterStats($userId);
    $roi = $performanceService->calculateROI($userId);
    $winRate = $performanceService->calculateWinRate($userId);
    ?>
    
    <div class="card">
        <h3><i class="fas fa-chart-bar"></i> Statistics</h3>
        <p style="color: #666; margin-top: 5px; margin-bottom: 20px;">Performance overview of your picks</p>
    </div>
    
    <div class="stats-grid" style="margin-bottom: 30px;">
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-list" style="font-size: 24px; color: #d32f2f; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #d32f2f; margin-bottom: 5px;"><?php echo number_format($tipsterStats['total_picks'] ?? count($picks)); ?></p>
            <p class="stat-label">Total Picks</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-check-circle" style="font-size: 24px; color: #2e7d32; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #2e7d32; margin-bottom: 5px;"><?php echo $tipsterStats['active'] ?? $activeCount; ?></p>
            <p class="stat-label">Active</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-clock" style="font-size: 24px; color: #ff9800; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #ff9800; margin-bottom: 5px;"><?php echo $tipsterStats['pending'] ?? $pendingCount; ?></p>
            <p class="stat-label">Pending</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-times-circle" style="font-size: 24px; color: #d32f2f; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #d32f2f; margin-bottom: 5px;"><?php echo $tipsterStats['decline'] ?? $declinedCount; ?></p>
            <p class="stat-label">Declined</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-trophy" style="font-size: 24px; color: #2e7d32; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #2e7d32; margin-bottom: 5px;"><?php echo $tipsterStats['won'] ?? $wonCount; ?></p>
            <p class="stat-label">Won</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-times" style="font-size: 24px; color: #d32f2f; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #d32f2f; margin-bottom: 5px;"><?php echo $tipsterStats['lost'] ?? $lostCount; ?></p>
            <p class="stat-label">Lost</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-shopping-cart" style="font-size: 24px; color: #17a2b8; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #17a2b8; margin-bottom: 5px;"><?php echo $totalPurchases; ?></p>
            <p class="stat-label">Total Sales</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-eye" style="font-size: 24px; color: #6f42c1; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: #6f42c1; margin-bottom: 5px;"><?php echo $totalViews; ?></p>
            <p class="stat-label">Total Views</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-percentage" style="font-size: 24px; color: <?php echo $winRate >= 50 ? '#2e7d32' : '#d32f2f'; ?>; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: <?php echo $winRate >= 50 ? '#2e7d32' : '#d32f2f'; ?>; margin-bottom: 5px;">
                <?php echo number_format($winRate, 1); ?>%
            </p>
            <p class="stat-label">Win Rate</p>
        </div>
        
        <div class="card stat-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <i class="fas fa-chart-line" style="font-size: 24px; color: <?php echo $roi >= 0 ? '#2e7d32' : '#d32f2f'; ?>; opacity: 0.7;"></i>
            </div>
            <p class="stat-value" style="color: <?php echo $roi >= 0 ? '#2e7d32' : '#d32f2f'; ?>; margin-bottom: 5px;">
                <?php echo number_format($roi, 1); ?>%
            </p>
            <p class="stat-label">ROI</p>
        </div>
    </div>
    <?php else: ?>
    <div class="card">
        <h3><i class="fas fa-chart-bar"></i> Statistics</h3>
        <div class="stats-grid" style="margin-top: 15px;">
            <div class="card stat-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <i class="fas fa-shopping-bag" style="font-size: 24px; color: #d32f2f; opacity: 0.7;"></i>
                </div>
                <p class="stat-value" style="color: #d32f2f; margin-bottom: 5px;"><?php echo count($picks); ?></p>
                <p class="stat-label">Total Purchases</p>
            </div>
        </div>
    </div>
    <?php endif; ?>
    
    <div style="display: grid; gap: 20px;">
        <?php foreach ($picks as $pick): ?>
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <h4 style="color: #d32f2f; margin-bottom: 10px;">
                        <?php echo htmlspecialchars($pick['title']); ?>
                    </h4>
                    <p style="color: #666; margin-bottom: 10px;">
                        <?php echo htmlspecialchars($pick['description']); ?>
                    </p>
                </div>
                <div style="text-align: right; margin-left: 20px;">
                    <p class="value-large" style="color: <?php echo $pick['price'] == 0 ? '#17a2b8' : '#2e7d32'; ?>;">
                        <?php echo $pick['price'] == 0 ? 'FREE' : 'GHS ' . number_format($pick['price'], 2); ?>
                    </p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 15px;">
                <?php if ($userRole === 'tipster'): ?>
                <div>
                    <span class="label"><i class="fas fa-shopping-cart" style="margin-right: 4px;"></i> Sales</span>
                    <p class="value" style="margin: 0;"><?php echo $pick['total_purchases'] ?? 0; ?></p>
                </div>
                <div>
                    <span class="label"><i class="fas fa-eye" style="margin-right: 4px;"></i> Views</span>
                    <p class="value" style="margin: 0;"><?php echo $pick['view_count'] ?? 0; ?></p>
                </div>
                <?php else: ?>
                <div>
                    <span class="label"><i class="fas fa-user" style="margin-right: 4px;"></i> Tipster</span>
                    <p class="value" style="margin: 0;"><?php echo htmlspecialchars($pick['tipster_display_name'] ?: $pick['tipster_name']); ?></p>
                </div>
                <?php endif; ?>
                
                <div>
                    <span class="label"><i class="fas fa-chart-line" style="margin-right: 4px;"></i> Odds</span>
                    <p class="value" style="margin: 0;"><?php echo number_format($pick['total_odds'], 2); ?></p>
                </div>
                
                <div>
                    <span class="label"><i class="fas fa-calendar" style="margin-right: 4px;"></i> Created</span>
                    <p class="value" style="margin: 0;"><?php echo date('M j, Y', strtotime($pick['created_at'])); ?></p>
                </div>
                
                <div>
                    <span class="label">Status</span>
                    <span style="background-color: <?php 
                        if ($pick['status'] === 'active') {
                            echo '#2e7d32'; // Green for active
                        } elseif ($pick['status'] === 'pending_approval') {
                            echo '#ff9800'; // Orange for pending
                        } elseif ($pick['status'] === 'won') {
                            echo '#2e7d32'; // Green for won
                        } elseif ($pick['status'] === 'lost') {
                            echo '#d32f2f'; // Red for lost
                        } else {
                            echo '#d32f2f'; // Red for declined/other
                        }
                    ?>; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; display: inline-block; margin-top: 4px;">
                        <?php echo ucfirst(str_replace('_', ' ', $pick['status'])); ?>
                    </span>
                </div>
            </div>
            
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="viewPickDetails(<?php echo $pick['id']; ?>)">
                    <i class="fas fa-eye"></i> View Details
                </button>
                
                <?php if ($userRole === 'tipster'): ?>
                    <?php if ($pick['status'] === 'pending_approval'): ?>
                    <button class="btn btn-primary" onclick="editPick(<?php echo $pick['id']; ?>)">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <?php endif; ?>
                    
                    <?php if ($pick['status'] === 'active'): ?>
                    <button class="btn btn-success" onclick="trackPerformance(<?php echo $pick['id']; ?>)">
                        <i class="fas fa-chart-line"></i> Track
                    </button>
                    <?php endif; ?>
                <?php else: ?>
                    <?php if ($pick['pick_status'] === 'active'): ?>
                    <button class="btn btn-primary" onclick="ratePick(<?php echo $pick['id']; ?>)">
                        <i class="fas fa-star"></i> Rate
                    </button>
                    <?php endif; ?>
                <?php endif; ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    
    <?php endif; ?>
</div>

<script>
function viewPickDetails(pickId) {
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 20px; max-width: 600px; max-height: 80vh; overflow-y: auto; margin: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #d32f2f; margin: 0;">Pick Details</h3>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div id="pick-details-content">
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #d32f2f;"></i>
                    <p>Loading pick details...</p>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    // Fetch pick details
    fetch(`/SmartPicksPro-Local/api/get_pick_details.php?pick_id=${pickId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const pick = data.pick;
                const individualPicks = data.individual_picks;
                const marketplace = data.marketplace;
                
                let content = `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #d32f2f; margin-bottom: 10px;">${pick.title}</h4>
                        <p style="color: #666; margin-bottom: 15px;">${pick.description}</p>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <p style="font-size: 12px; color: #666; margin: 0;">Total Odds</p>
                                <p style="font-size: 18px; font-weight: bold; color: #2e7d32; margin: 5px 0 0 0;">${parseFloat(pick.total_odds).toFixed(2)}</p>
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <p style="font-size: 12px; color: #666; margin: 0;">Price</p>
                                <p style="font-size: 18px; font-weight: bold; color: ${pick.price == 0 ? '#17a2b8' : '#2e7d32'}; margin: 5px 0 0 0;">
                                    ${pick.price == 0 ? 'FREE' : 'GHS ' + parseFloat(pick.price).toFixed(2)}
                                </p>
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <p style="font-size: 12px; color: #666; margin: 0;">Status</p>
                                <span style="background-color: ${pick.status === 'won' ? '#2e7d32' : pick.status === 'lost' ? '#d32f2f' : pick.status === 'active' ? '#2e7d32' : '#ff9800'}; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                                    ${pick.status.charAt(0).toUpperCase() + pick.status.slice(1)}
                                </span>
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <p style="font-size: 12px; color: #666; margin: 0;">Created</p>
                                <p style="font-size: 14px; font-weight: bold; color: #666; margin: 5px 0 0 0;">${new Date(pick.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        ${marketplace ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px;">
                            <div style="text-align: center; padding: 8px; background: #e8f5e8; border-radius: 5px;">
                                <p style="font-size: 12px; color: #666; margin: 0;">Sales</p>
                                <p style="font-size: 16px; font-weight: bold; color: #2e7d32; margin: 3px 0 0 0;">${marketplace.purchase_count || 0}</p>
                            </div>
                            <div style="text-align: center; padding: 8px; background: #e8f5e8; border-radius: 5px;">
                                <p style="font-size: 12px; color: #666; margin: 0;">Views</p>
                                <p style="font-size: 16px; font-weight: bold; color: #2e7d32; margin: 3px 0 0 0;">${marketplace.view_count || 0}</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <h4 style="color: #d32f2f; margin-bottom: 15px;">Individual Picks:</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
                `;
                
                individualPicks.forEach((individualPick, index) => {
                    content += `
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong style="color: #d32f2f;">Pick ${index + 1}</strong>
                                <span style="background: #2e7d32; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                    ${parseFloat(individualPick.odds).toFixed(2)}
                                </span>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Match:</strong> ${individualPick.match_description}
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Prediction:</strong> ${individualPick.prediction}
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Match Time:</strong> ${individualPick.match_date ? new Date(individualPick.match_date).toLocaleString() : 'Not specified'}
                            </div>
                            <div>
                                <strong>Status:</strong> 
                                <span style="color: ${individualPick.result === 'pending' ? '#ff9800' : individualPick.result === 'won' ? '#2e7d32' : '#d32f2f'}; font-weight: bold;">
                                    ${individualPick.result.charAt(0).toUpperCase() + individualPick.result.slice(1)}
                                </span>
                            </div>
                        </div>
                    `;
                });
                
                content += `
                    </div>
                `;
                
                document.getElementById('pick-details-content').innerHTML = content;
            } else {
                document.getElementById('pick-details-content').innerHTML = `
                    <div style="color: #d32f2f; text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p>Error loading pick details: ${data.message}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            document.getElementById('pick-details-content').innerHTML = `
                <div style="color: #d32f2f; text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p>Error loading pick details. Please try again.</p>
                </div>
            `;
        });
}

function editPick(pickId) {
    alert('Pick editing will be implemented');
}

function trackPerformance(pickId) {
    alert('Performance tracking will be implemented');
}

function ratePick(pickId) {
    alert('Pick rating system will be implemented');
}
</script>

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
