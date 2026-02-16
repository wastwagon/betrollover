<?php
/**
 * Tipster Financial Review
 * Shows earnings, commissions, payouts, and transaction history for tipsters
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and tipster role
AuthMiddleware::requireAuth();
// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

if ($_SESSION['role'] !== 'tipster') {
    header('Location: ' . $baseUrl . '/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$wallet = Wallet::getInstance();

// Get tipster info
$tipsterId = $_SESSION['user_id'];
$tipster = $db->fetch("SELECT * FROM users WHERE id = ?", [$tipsterId]);
$user = $tipster; // Make sure $user variable is available for layout

// Get wallet balance
$walletBalance = 0.00;
try {
    $walletBalance = $wallet->getBalance($tipsterId);
    if ($walletBalance && isset($walletBalance['balance'])) {
        $walletBalance = (float)$walletBalance['balance'];
    } else {
        $walletBalance = 0.00;
    }
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Get filter parameters
$timeframe = $_GET['timeframe'] ?? 'all';
$startDate = $_GET['start_date'] ?? '';
$endDate = $_GET['end_date'] ?? '';

// Build date condition
$dateCondition = '';
$dateParams = [];
if ($startDate && $endDate) {
    $dateCondition = "AND DATE(at.updated_at) BETWEEN ? AND ?";
    $dateParams = [$startDate, $endDate];
} else {
    switch ($timeframe) {
        case 'today':
            $dateCondition = "AND DATE(at.updated_at) = CURDATE()";
            break;
        case 'week':
            $dateCondition = "AND at.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
        case 'month':
            $dateCondition = "AND at.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            break;
        case 'year':
            $dateCondition = "AND at.updated_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)";
            break;
        default:
            $dateCondition = '';
    }
}

$financialData = [];
$error = '';

try {
    // Get wallet balance - use same method as tipster_dashboard.php
    $walletBalance = 0.00;
    try {
        $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$tipsterId]);
        $walletBalance = $result ? floatval($result['balance']) : 0.00;
    } catch (Exception $e) {
        $walletBalance = 0.00;
    }
    
    // Total Earnings (90% of won picks after commission) - Use escrow_funds as primary source
    $earningsFromEscrow = $db->fetch("
        SELECT COALESCE(SUM(ef.amount * 0.90), 0) as total
        FROM escrow_funds ef
        JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE at.user_id = ?
        AND (at.status = 'won' OR at.result = 'won')
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    
    $earningsFromPurchases = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price * 0.90), 0) as total
        FROM accumulator_tickets at
        JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
        WHERE at.user_id = ?
        AND (at.status = 'won' OR at.result = 'won')
        AND upp.settlement_status = 'won'
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    
    $financialData['total_earnings'] = max(
        floatval($earningsFromEscrow['total'] ?? 0),
        floatval($earningsFromPurchases['total'] ?? 0)
    );
    
    // Total Commission Paid (10% commission to platform) - Use escrow_funds as primary source
    $commissionFromEscrow = $db->fetch("
        SELECT COALESCE(SUM(ef.amount * 0.10), 0) as total
        FROM escrow_funds ef
        JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE at.user_id = ?
        AND (at.status = 'won' OR at.result = 'won')
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    
    $commissionFromPurchases = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price * 0.10), 0) as total
        FROM accumulator_tickets at
        JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
        WHERE at.user_id = ?
        AND (at.status = 'won' OR at.result = 'won')
        AND upp.settlement_status = 'won'
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    
    $financialData['total_commission'] = max(
        floatval($commissionFromEscrow['total'] ?? 0),
        floatval($commissionFromPurchases['total'] ?? 0)
    );
    
    // Total Sales (Gross revenue before commission)
    $totalSales = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price), 0) as total
        FROM accumulator_tickets at
        JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
        WHERE at.user_id = ?
        AND upp.purchase_price > 0
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    $financialData['total_sales'] = floatval($totalSales['total'] ?? 0);
    
    // Total Picks Created
    $totalPicks = $db->fetch("
        SELECT COUNT(*) as count
        FROM accumulator_tickets
        WHERE user_id = ?
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    $financialData['total_picks'] = intval($totalPicks['count'] ?? 0);
    
    // Won Picks
    $wonPicks = $db->fetch("
        SELECT COUNT(*) as count
        FROM accumulator_tickets
        WHERE user_id = ?
        AND (status = 'won' OR result = 'won')
        " . ($dateCondition ? $dateCondition : "") . "
    ", array_merge([$tipsterId], $dateParams));
    $financialData['won_picks'] = intval($wonPicks['count'] ?? 0);
    
    // Settled Picks with Sales
    $settledSales = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.updated_at as settled_date,
            COUNT(DISTINCT upp.id) as sales_count,
            SUM(upp.purchase_price) as gross_revenue,
            SUM(upp.purchase_price * 0.10) as commission,
            SUM(upp.purchase_price * 0.90) as net_earnings,
            at.status,
            at.result
        FROM accumulator_tickets at
        LEFT JOIN user_purchased_picks upp ON at.id = upp.accumulator_id AND upp.settlement_status IN ('won', 'lost')
        WHERE at.user_id = ?
        AND (at.status IN ('won', 'lost') OR at.result IN ('won', 'lost'))
        AND upp.id IS NOT NULL
        " . ($dateCondition ? $dateCondition : "") . "
        GROUP BY at.id
        ORDER BY at.updated_at DESC
        LIMIT 50
    ", array_merge([$tipsterId], $dateParams));
    
    // Wallet Transactions
    $walletTransactions = $db->fetchAll("
        SELECT 
            wt.*,
            CASE 
                WHEN wt.type = 'pick_earnings' THEN 'Pick Earnings'
                WHEN wt.type = 'top_up' THEN 'Wallet Top-Up'
                WHEN wt.type = 'payout' THEN 'Payout Request'
                WHEN wt.type = 'payout_approved' THEN 'Payout Approved'
                ELSE wt.type
            END as type_label
        FROM wallet_transactions wt
        WHERE wt.user_id = ?
        " . ($dateCondition ? "AND wt.created_at IS NOT NULL " . str_replace('at.updated_at', 'wt.created_at', $dateCondition) : "") . "
        ORDER BY wt.created_at DESC
        LIMIT 100
    ", array_merge([$tipsterId], $dateParams));
    
    // Payout Requests
    $payoutRequests = $db->fetchAll("
        SELECT *
        FROM payout_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    ", [$tipsterId]);
    
} catch (Exception $e) {
    $error = 'Error loading financial data: ' . $e->getMessage();
    $logger->error('Tipster financial review error', ['error' => $e->getMessage(), 'tipster_id' => $tipsterId]);
    $financialData = [
        'total_earnings' => 0,
        'total_commission' => 0,
        'total_sales' => 0,
        'total_picks' => 0,
        'won_picks' => 0
    ];
    $settledSales = [];
    $walletTransactions = [];
    $payoutRequests = [];
}

// Set page variables
$pageTitle = "Financial Review";
// Ensure walletBalance is set and is a float value
if (!isset($walletBalance) || !is_numeric($walletBalance)) {
    try {
        $walletRow = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$tipsterId]);
        $walletBalance = $walletRow ? floatval($walletRow['balance']) : 0.00;
    } catch (Exception $e) {
        $walletBalance = 0.00;
    }
}
$walletBalance = floatval($walletBalance ?? 0.00);

// Start content buffer
ob_start();
?>

<div class="tipster-dashboard-content">
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-chart-line"></i> Financial Review</h2>
        <p style="color: #666; margin-top: 10px;">Track your earnings, commissions, and payout history.</p>
    </div>
    
    <!-- Filters -->
    <div class="card">
        <h3><i class="fas fa-filter"></i> Filters</h3>
        <form method="GET" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666;">Timeframe:</label>
                <select name="timeframe" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="all" <?php echo $timeframe === 'all' ? 'selected' : ''; ?>>All Time</option>
                    <option value="today" <?php echo $timeframe === 'today' ? 'selected' : ''; ?>>Today</option>
                    <option value="week" <?php echo $timeframe === 'week' ? 'selected' : ''; ?>>Last 7 Days</option>
                    <option value="month" <?php echo $timeframe === 'month' ? 'selected' : ''; ?>>Last 30 Days</option>
                    <option value="year" <?php echo $timeframe === 'year' ? 'selected' : ''; ?>>Last Year</option>
                </select>
            </div>
            
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666;">Start Date:</label>
                <input type="date" name="start_date" value="<?php echo htmlspecialchars($startDate); ?>" 
                       style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            
            <div>
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666;">End Date:</label>
                <input type="date" name="end_date" value="<?php echo htmlspecialchars($endDate); ?>" 
                       style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            
            <div style="display: flex; gap: 10px; align-items: end;">
                <button type="submit" class="btn btn-primary" style="padding: 8px 16px;">
                    <i class="fas fa-search"></i> Apply Filters
                </button>
                <a href="<?= $baseUrl ?>/tipster_financial_review" class="btn btn-secondary" style="padding: 8px 16px;">
                    <i class="fas fa-times"></i> Clear
                </a>
            </div>
        </form>
    </div>
    
    <!-- Financial Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Wallet Balance</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;">GHS <?php echo number_format($walletBalance, 2); ?></p>
                </div>
                <i class="fas fa-wallet" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Earnings</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;">GHS <?php echo number_format($financialData['total_earnings'], 2); ?></p>
                    <p style="font-size: 11px; color: #999; margin-top: 3px;">90% of won picks (commission deducted)<br><em>Credited to wallet when escrow is settled</em></p>
                </div>
                <i class="fas fa-money-bill-wave" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Sales</p>
                    <p style="font-size: 28px; font-weight: bold; color: #d32f2f;">GHS <?php echo number_format($financialData['total_sales'], 2); ?></p>
                </div>
                <i class="fas fa-dollar-sign" style="font-size: 32px; color: #d32f2f1;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Commission Paid</p>
                    <p style="font-size: 28px; font-weight: bold; color: #ff9800;">GHS <?php echo number_format($financialData['total_commission'], 2); ?></p>
                </div>
                <i class="fas fa-percentage" style="font-size: 32px; color: #ff9800;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Won Picks</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;"><?php echo number_format($financialData['won_picks']); ?></p>
                </div>
                <i class="fas fa-trophy" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Picks</p>
                    <p style="font-size: 28px; font-weight: bold; color: #666;"><?php echo number_format($financialData['total_picks']); ?></p>
                </div>
                <i class="fas fa-list" style="font-size: 32px; color: #666;"></i>
            </div>
        </div>
    </div>
    
    <!-- Settled Sales -->
    <div class="card">
        <h3><i class="fas fa-shopping-cart"></i> Settled Picks with Sales</h3>
        <?php if (empty($settledSales)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No settled picks with sales found for the selected period.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Pick Title</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Sales</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Gross Revenue</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Commission</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Net Earnings</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Settled Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($settledSales as $sale): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><strong><?php echo htmlspecialchars($sale['title']); ?></strong></td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                                      background-color: <?php echo ($sale['status'] === 'won' || $sale['result'] === 'won') ? '#e8f5e8' : '#ffebee'; ?>;
                                      color: <?php echo ($sale['status'] === 'won' || $sale['result'] === 'won') ? '#2e7d32' : '#d32f2f'; ?>;">
                                    <?php echo strtoupper($sale['status'] === 'won' || $sale['result'] === 'won' ? 'WON' : 'LOST'); ?>
                                </span>
                            </td>
                            <td style="padding: 10px; text-align: right;"><?php echo number_format($sale['sales_count']); ?></td>
                            <td style="padding: 10px; text-align: right; color: #666;">GHS <?php echo number_format($sale['gross_revenue'] ?? 0, 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #ff9800;">GHS <?php echo number_format($sale['commission'] ?? 0, 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #2e7d32; font-weight: bold;">GHS <?php echo number_format($sale['net_earnings'] ?? 0, 2); ?></td>
                            <td style="padding: 10px;"><?php echo $sale['settled_date'] ? date('M j, Y H:i', strtotime($sale['settled_date'])) : 'N/A'; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Wallet Transactions -->
    <div class="card">
        <h3><i class="fas fa-history"></i> Wallet Transactions</h3>
        <?php if (empty($walletTransactions)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No wallet transactions found.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Type</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($walletTransactions as $transaction): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y H:i', strtotime($transaction['created_at'])); ?></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($transaction['type_label']); ?></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($transaction['description'] ?? 'N/A'); ?></td>
                            <td style="padding: 10px; text-align: right; color: <?php echo $transaction['amount'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>; font-weight: bold;">
                                <?php echo $transaction['amount'] >= 0 ? '+' : ''; ?>GHS <?php echo number_format($transaction['amount'], 2); ?>
                            </td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                                      background-color: <?php echo $transaction['status'] === 'completed' ? '#e8f5e8' : '#fff3cd'; ?>;
                                      color: <?php echo $transaction['status'] === 'completed' ? '#2e7d32' : '#856404'; ?>;">
                                    <?php echo strtoupper($transaction['status']); ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Payout Requests -->
    <div class="card">
        <h3><i class="fas fa-hand-holding-usd"></i> Payout Requests</h3>
        <?php if (empty($payoutRequests)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No payout requests found.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Payment Method</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($payoutRequests as $request): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y H:i', strtotime($request['created_at'])); ?></td>
                            <td style="padding: 10px; text-align: right; font-weight: bold;">GHS <?php echo number_format($request['amount'], 2); ?></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($request['payment_method'] ?? 'N/A'); ?></td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                                      background-color: <?php 
                                          echo $request['status'] === 'approved' ? '#e8f5e8' : 
                                               ($request['status'] === 'pending' ? '#fff3cd' : '#ffebee'); ?>;
                                      color: <?php 
                                          echo $request['status'] === 'approved' ? '#2e7d32' : 
                                               ($request['status'] === 'pending' ? '#856404' : '#d32f2f'); ?>;">
                                    <?php echo strtoupper($request['status']); ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include tipster layout
include __DIR__ . '/../views/layouts/tipster_layout.php';
?>

