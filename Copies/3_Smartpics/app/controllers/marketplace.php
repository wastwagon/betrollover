<?php
/**
 * Marketplace - Complete Feature Version
 * Uses the new layout system with full escrow and wallet integration
 */

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/EscrowManager.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../models/TipsterQualificationService.php';
require_once __DIR__ . '/../models/TipsterPerformanceService.php';
require_once __DIR__ . '/../models/NotificationService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Ensure session and authentication
if (session_status() === PHP_SESSION_NONE) { session_start(); }
AuthMiddleware::requireAuth();

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$escrowManager = EscrowManager::getInstance();
$wallet = Wallet::getInstance();
$qualificationService = TipsterQualificationService::getInstance();
$performanceService = TipsterPerformanceService::getInstance();

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

$message = '';
$error = '';

// Read flash success message (from redirect after purchase)
if (!empty($_SESSION['flash_success'])) {
    $message = $_SESSION['flash_success'];
    unset($_SESSION['flash_success']);
}

// Get filter parameters
$tipsterSearch = $_GET['tipster'] ?? '';
$roiFilter = $_GET['roi_filter'] ?? '';
$sortBy = $_GET['sort'] ?? 'roi_high';

// Handle purchase action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'purchase_pick') {
    $pickId = intval($_POST['pick_id'] ?? 0);
    
    if ($pickId) {
        try {
            // Get pick details from marketplace
            $pick = $db->fetch("
                SELECT 
                    pm.*,
                    at.title,
                    at.description,
                    at.total_odds,
                    at.total_picks,
                    u.username as tipster_name,
                    u.id as tipster_id
                FROM pick_marketplace pm
                JOIN accumulator_tickets at ON pm.accumulator_id = at.id
                JOIN users u ON pm.seller_id = u.id
                WHERE pm.id = ? AND pm.status = 'active'
            ", [$pickId]);
            
            if (!$pick) {
                throw new Exception('Pick not found or not available');
            }
            
            // Check if user is trying to buy their own pick
            if ($pick['tipster_id'] == $userId) {
                throw new Exception('Cannot purchase your own pick');
            }
            
            // Check if already purchased
            $existing = $db->fetch("
                SELECT id FROM user_purchased_picks 
                WHERE user_id = ? AND accumulator_id = ?
            ", [$userId, $pick['accumulator_id']]);
            
            if ($existing) {
                throw new Exception('Already purchased this pick');
            }
            
            // Check tipster qualification
            $qualificationStatus = $qualificationService->getTipsterQualificationStatus($pick['tipster_id']);
            if (!$qualificationStatus['can_sell']) {
                throw new Exception('Tipster is not qualified to sell picks');
            }
            
            // Check wallet balance
            $balance = $wallet->getBalance($userId);
            if (!$balance || !isset($balance['balance']) || (float)$balance['balance'] < (float)$pick['price']) {
                throw new Exception('Insufficient balance. Please top up your wallet.');
            }
            
            // Hold funds in escrow
            $escrowResult = $escrowManager->holdFunds(
                $userId, 
                $pick['accumulator_id'], 
                $pick['price'], 
                'PURCHASE_' . $pickId . '_' . time()
            );
            
            if (!$escrowResult['success']) {
                throw new Exception($escrowResult['error']);
            }
            
            // Record purchase
            $purchaseId = $db->insert('user_purchased_picks', [
                'user_id' => $userId,
                'accumulator_id' => $pick['accumulator_id'],
                'purchase_price' => $pick['price'],
                'purchase_date' => date('Y-m-d H:i:s'),
                'settlement_status' => 'pending'
            ]);
            
            // Update marketplace purchase count
            $db->query("
                UPDATE pick_marketplace 
                SET purchase_count = purchase_count + 1, updated_at = NOW()
                WHERE id = ?
            ", [$pickId]);
            
            // Mark as sold if max purchases reached
            if ($pick['purchase_count'] + 1 >= $pick['max_purchases']) {
                $db->query("
                    UPDATE pick_marketplace 
                    SET status = 'sold', updated_at = NOW()
                    WHERE id = ?
                ", [$pickId]);
            }
            
            // Send notifications
            try {
                $notificationService = NotificationService::getInstance();
                $buyerName = $user['display_name'] ?? $user['username'] ?? 'User';
                $pickTitle = $pick['title'] ?? 'Pick #' . $pick['accumulator_id'];
                
                // Notify buyer
                $notificationService->notify(
                    $userId,
                    'pick_purchased',
                    'Pick Purchased! 🛒',
                    "You purchased '{$pickTitle}' for GHS " . number_format($pick['price'], 2) . ". Funds are held in escrow until settlement.",
                    '/my_purchases',
                    ['pick_id' => $pick['accumulator_id'], 'purchase_id' => $purchaseId]
                );
                
                // Notify tipster (seller)
                $notificationService->notify(
                    $pick['tipster_id'],
                    'pick_purchased',
                    'Your Pick Was Purchased! 💰',
                    "{$buyerName} purchased your pick '{$pickTitle}' for GHS " . number_format($pick['price'], 2) . ".",
                    '/tipster_dashboard',
                    ['pick_id' => $pick['accumulator_id'], 'buyer_id' => $userId, 'purchase_id' => $purchaseId]
                );
            } catch (Exception $e) {
                // Don't fail purchase if notification fails
                $logger->warning('Failed to send purchase notifications', ['error' => $e->getMessage()]);
            }
            
            // Redirect (PRG pattern) to avoid resubmission/blank states
            $_SESSION['flash_success'] = 'Pick purchased successfully! Funds are held in escrow until settlement.';
            // Detect base URL dynamically
            $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
            $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
            $baseUrl = '';
            if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
                $baseUrl = '/SmartPicksPro-Local';
            }
            header('Location: ' . $baseUrl . '/marketplace');
            exit;
            
        } catch (Exception $e) {
            $error = $e->getMessage();
            $logger->error('Marketplace purchase error', [
                'user_id' => $userId,
                'pick_id' => $pickId ?? 0,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}

// Get marketplace picks with tipster performance metrics
$picks = [];
try {
    // Build the base query with tipster performance data
    $query = "
        SELECT 
            pm.*,
            pm.view_count,
            at.title,
            at.description,
            at.total_odds,
            at.total_picks,
            at.created_at as acca_created,
            u.display_name as seller_name,
            u.username as tipster_name,
            u.id as tipster_id,
            uw.balance as tipster_balance,
            CASE 
                WHEN upp.user_id IS NOT NULL THEN 'purchased'
                ELSE 'available'
            END as purchase_status,
            upp.purchase_date,
            -- Tipster performance metrics
            COALESCE(tp_stats.total_picks, 0) as tipster_total_picks,
            COALESCE(tp_stats.won_picks, 0) as tipster_won_picks,
            COALESCE(tp_stats.lost_picks, 0) as tipster_lost_picks,
            CASE 
                WHEN (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0)) > 0 
                THEN ROUND((COALESCE(tp_stats.won_picks, 0) / (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0))) * 100, 1)
                ELSE 0 
            END as tipster_win_rate,
            CASE 
                WHEN (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0)) > 0 
                THEN ROUND(((COALESCE(tp_stats.won_picks, 0) - COALESCE(tp_stats.lost_picks, 0)) / (COALESCE(tp_stats.won_picks, 0) + COALESCE(tp_stats.lost_picks, 0))) * 100, 1)
                ELSE 0 
            END as tipster_roi,
            -- Tipster ranking (simplified)
            1 as tipster_rank
        FROM pick_marketplace pm
        JOIN accumulator_tickets at ON pm.accumulator_id = at.id
        JOIN users u ON pm.seller_id = u.id
        LEFT JOIN user_wallets uw ON u.id = uw.user_id
        LEFT JOIN user_purchased_picks upp ON upp.user_id = ? AND upp.accumulator_id = pm.accumulator_id
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_picks,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_picks,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_picks
            FROM accumulator_tickets 
            WHERE status IN ('won', 'lost')
            GROUP BY user_id
        ) tp_stats ON u.id = tp_stats.user_id
        WHERE pm.status = 'active'
        AND at.status = 'active'
        AND at.is_marketplace = 1
        -- Exclude coupons where ANY event has already started
        -- This ensures users can only buy coupons where ALL events are in the future
        AND NOT EXISTS (
            SELECT 1 
            FROM accumulator_picks ap
            WHERE ap.accumulator_id = at.id
            AND ap.match_date IS NOT NULL
            AND ap.match_date <= NOW()
        )
        -- Ensure the coupon has at least one match scheduled
        AND EXISTS (
            SELECT 1 
            FROM accumulator_picks ap
            WHERE ap.accumulator_id = at.id
            AND ap.match_date IS NOT NULL
        )
    ";
    
    $params = [$userId];
    
    // Add tipster search filter
    if (!empty($tipsterSearch)) {
        $query .= " AND (u.username LIKE ? OR u.display_name LIKE ?)";
        $searchTerm = '%' . $tipsterSearch . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Add sorting
    switch ($sortBy) {
        case 'roi_high':
            $query .= " ORDER BY tipster_roi DESC, pm.created_at DESC";
            break;
        case 'roi_low':
            $query .= " ORDER BY tipster_roi ASC, pm.created_at DESC";
            break;
        case 'win_rate_high':
            $query .= " ORDER BY tipster_win_rate DESC, pm.created_at DESC";
            break;
        case 'win_rate_low':
            $query .= " ORDER BY tipster_win_rate ASC, pm.created_at DESC";
            break;
        default: // default to ROI high
            $query .= " ORDER BY tipster_roi DESC, pm.created_at DESC";
            break;
    }
    
    $query .= " LIMIT 20";
    
    $picks = $db->fetchAll($query, $params);
    
    // Add qualification status to each pick
    foreach ($picks as &$pick) {
        // Check tipster qualification status
        $qualificationStatus = $qualificationService->getTipsterQualificationStatus($pick['tipster_id']);
        
        // Qualification only affects PAID picks (price > 0)
        // Free picks (price = 0) are always available regardless of qualification
        if ($pick['price'] > 0) {
            // This is a paid pick - check qualification
            $pick['tipster_can_sell'] = $qualificationStatus['can_sell'];
            $pick['qualification_status'] = $qualificationStatus['can_sell'] ? 'qualified' : 'not_qualified';
        } else {
            // This is a free pick - always allow
            $pick['tipster_can_sell'] = true;
            $pick['qualification_status'] = 'free_pick';
        }
        
        // Purchase status is already determined by the query
        $pick['already_purchased'] = ($pick['purchase_status'] === 'purchased');
    }
    
} catch (Exception $e) {
    $picks = [];
    $error = 'Error loading picks: ' . $e->getMessage();
}

// Get user's wallet balance
$userBalance = $wallet->getBalance($userId);
$walletBalance = $userBalance ? ($userBalance['balance'] ?? 0.00) : 0.00;

// Set page variables
$pageTitle = "Marketplace";

// Start content buffer
ob_start();
?>

<div class="marketplace-content">
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
        <h2><i class="fas fa-store"></i> Marketplace</h2>
        <p style="color: #666; margin-top: 10px;">Browse and purchase picks from verified tipsters. Your wallet balance: <strong>GHS <?php echo number_format($userBalance['balance'], 2); ?></strong></p>
    </div>
    
    <!-- Filters -->
    <div class="card">
        <h3><i class="fas fa-filter"></i> Filters</h3>
        <form method="GET" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666;">Search Tipster:</label>
                <input type="text" name="tipster" value="<?php echo htmlspecialchars($tipsterSearch); ?>" 
                       placeholder="Type tipster username..." 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                       onkeyup="searchTipsters(this.value)">
            </div>
            
            <div style="min-width: 150px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666;">Sort By:</label>
                <select name="sort" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                    <option value="roi_high" <?php echo $sortBy === 'roi_high' ? 'selected' : ''; ?>>ROI: High to Low</option>
                    <option value="roi_low" <?php echo $sortBy === 'roi_low' ? 'selected' : ''; ?>>ROI: Low to High</option>
                    <option value="win_rate_high" <?php echo $sortBy === 'win_rate_high' ? 'selected' : ''; ?>>Win Rate: High to Low</option>
                    <option value="win_rate_low" <?php echo $sortBy === 'win_rate_low' ? 'selected' : ''; ?>>Win Rate: Low to High</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; align-items: end;">
                <button type="submit" class="btn btn-primary" style="padding: 8px 16px;">
                    <i class="fas fa-search"></i> Filter
                </button>
                <a href="<?= $baseUrl ?>/marketplace" class="btn btn-secondary" style="padding: 8px 16px;">
                    <i class="fas fa-times"></i> Clear
                </a>
            </div>
        </form>
        
        <!-- Tipster suggestions -->
        <div id="tipster-suggestions" style="margin-top: 10px; display: none;">
            <div style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                <div id="suggestions-list"></div>
            </div>
        </div>
    </div>
    
    <?php if (empty($picks)): ?>
    <div class="card">
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-store" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h3>No picks available</h3>
            <p style="color: #666;">Check back later for new picks from our tipsters.</p>
        </div>
    </div>
    <?php else: ?>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
        <?php foreach ($picks as $pick): ?>
        <?php
        // Get individual picks for this accumulator
        $individualPicks = $db->fetchAll("
            SELECT * FROM accumulator_picks 
            WHERE accumulator_id = ? 
            ORDER BY match_date ASC
        ", [$pick['accumulator_id']]);
        
        $pickCount = count($individualPicks);
        $nextMatchTime = null;
        $hasInternational = false;
        $hasLeague = false;
        if (!empty($individualPicks)) {
            $nextMatchTime = $individualPicks[0]['match_date'];
            // Check for match types
            foreach ($individualPicks as $ip) {
                if (($ip['match_type'] ?? 'league') === 'international') {
                    $hasInternational = true;
                } else {
                    $hasLeague = true;
                }
            }
        }
        ?>
        <div class="card" style="border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; transition: all 0.3s ease; overflow: hidden;">
            <div style="background: #d32f2f; color: white; padding: 16px; margin: -20px -20px 16px -20px;">
                <h4 style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3;">
                    <?php echo htmlspecialchars($pick['title']); ?>
                </h4>
                <?php if (!empty($pick['description'])): ?>
                <p style="margin: 6px 0 0 0; opacity: 0.95; font-size: 13px; line-height: 1.4;">
                    <?php echo htmlspecialchars($pick['description']); ?>
                </p>
                <?php endif; ?>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 12px; color: #666; flex-wrap: wrap; gap: 8px;">
                <span><i class="fas fa-user" style="color: #d32f2f; margin-right: 4px;"></i> <?php echo htmlspecialchars($pick['seller_name'] ?: $pick['tipster_name']); ?></span>
                <span><i class="fas fa-calendar" style="color: #d32f2f; margin-right: 4px;"></i> <?php echo date('M j, Y', strtotime($pick['created_at'])); ?></span>
                <?php if ($hasInternational || $hasLeague): ?>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <?php if ($hasLeague): ?>
                    <span style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                        <i class="fas fa-futbol"></i> League
                    </span>
                    <?php endif; ?>
                    <?php if ($hasInternational): ?>
                    <span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                        <i class="fas fa-globe"></i> International
                    </span>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
            
            <?php if ($nextMatchTime): ?>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; color: #666; font-size: 13px;">
                    <i class="fas fa-clock" style="color: #d32f2f; margin-right: 6px;"></i>
                    <span style="font-weight: 500;">Next Match:</span>
                    <span style="margin-left: 6px;"><?php echo date('M j, Y H:i', strtotime($nextMatchTime)); ?></span>
                </div>
            </div>
            <?php endif; ?>
            
            <div style="margin-bottom: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <span class="label"><i class="fas fa-chart-line" style="margin-right: 4px;"></i> Odds</span>
                        <p class="value" style="color: #2e7d32; margin: 0;"><?php echo number_format($pick['total_odds'], 2); ?></p>
                    </div>
                    <div>
                        <span class="label"><i class="fas fa-list" style="margin-right: 4px;"></i> Picks</span>
                        <p class="value" style="color: #d32f2f; margin: 0;"><?php echo $pickCount; ?></p>
                    </div>
                    <div>
                        <span class="label"><i class="fas fa-shopping-cart" style="margin-right: 4px;"></i> Purchases</span>
                        <p class="value" style="margin: 0;"><?php echo $pick['purchase_count']; ?></p>
                    </div>
                    <div>
                        <span class="label"><i class="fas fa-eye" style="margin-right: 4px;"></i> Views</span>
                        <p class="value" style="margin: 0;"><?php echo $pick['view_count'] ?? 0; ?></p>
                    </div>
                    <div>
                        <span class="label"><i class="fas fa-percentage" style="margin-right: 4px;"></i> Win Rate</span>
                        <p class="value" style="color: <?php echo $pick['tipster_win_rate'] >= 60 ? '#2e7d32' : ($pick['tipster_win_rate'] >= 40 ? '#d32f2f' : '#666'); ?>; margin: 0;">
                            <?php echo $pick['tipster_win_rate']; ?>%
                        </p>
                    </div>
                    <div>
                        <span class="label"><i class="fas fa-chart-line" style="margin-right: 4px;"></i> ROI</span>
                        <p class="value" style="color: <?php echo $pick['tipster_roi'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>; margin: 0;">
                            <?php echo $pick['tipster_roi']; ?>%
                        </p>
                    </div>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                    <span class="label"><i class="fas fa-tag" style="margin-right: 4px;"></i> Price</span>
                    <p class="value-large" style="color: <?php echo ($pick['price'] == 0 ? '#17a2b8' : '#2e7d32'); ?>; margin: 0;">
                        <?php echo ($pick['price'] == 0) ? 'FREE' : 'GHS ' . number_format($pick['price'], 2); ?>
                    </p>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                <div style="font-size: 12px; color: #666;">
                    <i class="fas fa-trophy" style="color: #d32f2f; margin-right: 4px;"></i> 
                    <span style="font-weight: 500;">Rank #<?php echo $pick['tipster_rank'] ?? 'N/A'; ?></span>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <?php if ($pick['purchase_status'] === 'purchased'): ?>
                    <!-- Already purchased - allow viewing coupon -->
                    <button class="btn btn-primary" onclick="viewCoupon(<?php echo $pick['accumulator_id']; ?>)">
                        <i class="fas fa-eye"></i> View Coupon
                    </button>
                    <?php elseif ($pick['price'] == 0): ?>
                    <!-- Free pick - show View Coupon only -->
                    <button class="btn btn-primary" onclick="viewCoupon(<?php echo $pick['accumulator_id']; ?>)">
                        <i class="fas fa-eye"></i> View Coupon
                    </button>
                    <?php elseif (!$pick['tipster_can_sell']): ?>
                    <!-- Not qualified tipster -->
                    <button class="btn btn-secondary" disabled>
                        <i class="fas fa-ban"></i> Not Qualified
                    </button>
                    <?php elseif ($userBalance['balance'] < $pick['price']): ?>
                    <!-- Insufficient funds -->
                    <button class="btn btn-warning" onclick="topUpWallet()">
                        <i class="fas fa-wallet"></i> Insufficient Funds
                    </button>
                    <?php else: ?>
                    <!-- Paid pick - show Purchase button only -->
                    <form method="POST" style="display: inline;">
                        <input type="hidden" name="action" value="purchase_pick">
                        <input type="hidden" name="pick_id" value="<?php echo $pick['id']; ?>">
                        <button type="submit" class="btn btn-success" onclick="return confirm('Purchase this pick for GHS <?php echo number_format($pick['price'], 2); ?>?')">
                            <i class="fas fa-shopping-cart"></i> Purchase
                        </button>
                    </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    
    <?php endif; ?>
</div>

<script>
// Tipster search functionality
let searchTimeout;
function searchTipsters(query) {
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        document.getElementById('tipster-suggestions').style.display = 'none';
        return;
    }
    
    const baseUrl = '<?php echo $baseUrl; ?>';
    searchTimeout = setTimeout(() => {
        fetch(`${baseUrl}/api/search_tipsters.php?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                const suggestionsDiv = document.getElementById('tipster-suggestions');
                const suggestionsList = document.getElementById('suggestions-list');
                
                if (data.success && data.tipsters.length > 0) {
                    suggestionsList.innerHTML = data.tipsters.map(tipster => `
                        <div style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;" 
                             onclick="selectTipster('${tipster.username}', '${tipster.display_name || tipster.username}')"
                             onmouseover="this.style.backgroundColor='#f0f0f0'" 
                             onmouseout="this.style.backgroundColor='transparent'">
                            <strong>${tipster.display_name || tipster.username}</strong>
                            <span style="color: #666; margin-left: 10px;">@${tipster.username}</span>
                            <div style="font-size: 12px; color: #999;">
                                Win Rate: ${tipster.win_rate}% | ROI: ${tipster.roi}%
                            </div>
                        </div>
                    `).join('');
                    suggestionsDiv.style.display = 'block';
                } else {
                    suggestionsDiv.style.display = 'none';
                }
            })
            .catch(error => {
                console.log('Search error:', error);
                document.getElementById('tipster-suggestions').style.display = 'none';
            });
    }, 300);
}

function selectTipster(username, displayName) {
    document.querySelector('input[name="tipster"]').value = username;
    document.getElementById('tipster-suggestions').style.display = 'none';
    // Auto-submit the form
    document.querySelector('form').submit();
}

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#tipster-suggestions') && !e.target.closest('input[name="tipster"]')) {
        document.getElementById('tipster-suggestions').style.display = 'none';
    }
});

function topUpWallet() {
    const baseUrl = '<?php echo $baseUrl; ?>';
    window.location.href = baseUrl + '/wallet';
}

function viewCoupon(accumulatorId) {
    // Get base URL dynamically
    const baseUrl = '<?php echo $baseUrl; ?>';
    
    // Increment view count
    fetch(`${baseUrl}/api/increment_view_count.php?accumulator_id=${accumulatorId}`, {
        method: 'POST'
    }).catch(error => console.log('View count update failed:', error));
    
    // Create modal for viewing coupon details
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; max-height: 80vh; overflow-y: auto; margin: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #d32f2f; margin: 0;">Coupon Details</h3>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div id="coupon-content" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #d32f2f;"></i>
                <p>Loading coupon details...</p>
            </div>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Fetch coupon details
    fetch(`${baseUrl}/api/get_coupon_details.php?accumulator_id=${accumulatorId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const coupon = data.coupon;
                const picks = data.picks;
                
                // Helper function to escape HTML
                function escapeHtml(text) {
                    if (!text) return '';
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                }
                
                const couponTitle = escapeHtml(coupon.title || 'Untitled Coupon');
                const couponDesc = escapeHtml(coupon.description || 'No description');
                const totalOdds = coupon.total_odds ? parseFloat(coupon.total_odds).toFixed(2) : 'N/A';
                const couponPrice = coupon.price || 0;
                const priceText = couponPrice == 0 ? 'FREE' : 'GHS ' + parseFloat(couponPrice).toFixed(2);
                const priceColor = couponPrice == 0 ? '#17a2b8' : '#2e7d32';
                
                let content = `
                    <div style="text-align: left;">
                        <div style="background: linear-gradient(135deg, #d32f2f, #f44336); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0;">${couponTitle}</h4>
                            <p style="margin: 0; opacity: 0.9;">${couponDesc}</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Total Odds:</strong><br>
                                <span style="color: #2e7d32; font-size: 18px; font-weight: bold;">${totalOdds}</span>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Number of Picks:</strong><br>
                                <span style="color: #d32f2f; font-size: 18px; font-weight: bold;">${picks.length}</span>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Price:</strong><br>
                                <span style="color: ${priceColor}; font-size: 18px; font-weight: bold;">
                                    ${priceText}
                                </span>
                            </div>
                        </div>
                        
                        <h4 style="color: #d32f2f; margin-bottom: 15px;">Individual Picks:</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                `;
                
                picks.forEach((pick, index) => {
                    const odds = pick.odds ? parseFloat(pick.odds).toFixed(2) : 'N/A';
                    const matchDesc = pick.match_description || 'Not specified';
                    const prediction = pick.prediction || 'Not specified';
                    const matchDate = pick.match_date ? new Date(pick.match_date).toLocaleString() : 'Not specified';
                    const result = pick.result || 'pending';
                    const resultColor = result === 'pending' ? '#ff9800' : result === 'won' ? '#2e7d32' : '#d32f2f';
                    const resultText = result.charAt(0).toUpperCase() + result.slice(1);
                    
                    content += `
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong style="color: #d32f2f;">Pick ${index + 1}</strong>
                                <span style="background: #2e7d32; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                    ${odds}
                                </span>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Match:</strong> ${escapeHtml(matchDesc)}
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Prediction:</strong> ${escapeHtml(prediction)}
                            </div>
                            <div style="margin-bottom: 8px;">
                                <strong>Match Time:</strong> ${matchDate}
                            </div>
                            <div>
                                <strong>Status:</strong> 
                                <span style="color: ${resultColor}; font-weight: bold;">
                                    ${resultText}
                                </span>
                            </div>
                        </div>
                    `;
                });
                
                content += `
                        </div>
                    </div>
                `;
                
                document.getElementById('coupon-content').innerHTML = content;
            } else {
                document.getElementById('coupon-content').innerHTML = `
                    <div style="color: #d32f2f;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p>Error loading coupon details: ${data.message}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading coupon details:', error);
            document.getElementById('coupon-content').innerHTML = `
                <div style="color: #d32f2f; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px; opacity: 0.7;"></i>
                    <p style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">Error loading coupon details</p>
                    <p style="font-size: 14px; color: #666;">Please try again. If the problem persists, contact support.</p>
                    <button onclick="this.closest('.modal').remove()" class="btn btn-primary" style="margin-top: 20px;">
                        Close
                    </button>
                </div>
            `;
        });
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
