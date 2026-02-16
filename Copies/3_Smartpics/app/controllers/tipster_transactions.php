<?php
/**
 * Tipster Transactions Report
 * Shows earnings from sales, wallet transactions, and commission breakdown for tipsters
 */

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/Wallet.php';
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

if ($_SESSION['role'] !== 'tipster') {
    header('Location: ' . $baseUrl . '/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$wallet = Wallet::getInstance();

// Get user info
$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
    header('Location: ' . $baseUrl . '/login');
    exit;
}

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? (float)$result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Get filter parameters
$timeframe = $_GET['timeframe'] ?? 'all';
$startDate = $_GET['start_date'] ?? '';
$endDate = $_GET['end_date'] ?? '';
$transactionType = $_GET['type'] ?? 'all';

// Build date condition
$dateCondition = '';
$dateParams = [];
if ($startDate && $endDate) {
    $dateCondition = "AND DATE(created_at) BETWEEN ? AND ?";
    $dateParams = [$startDate, $endDate];
} else {
    switch ($timeframe) {
        case 'today':
            $dateCondition = "AND DATE(created_at) = CURDATE()";
            break;
        case 'week':
            $dateCondition = "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
        case 'month':
            $dateCondition = "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            break;
        case 'year':
            $dateCondition = "AND created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)";
            break;
        default:
            $dateCondition = '';
    }
}

// Initialize variables
$earnings = [];
$walletTransactions = [];
$sales = [];
$error = '';

try {
    // Get earnings from tipster_earnings table
    $typeCondition = '';
    $earningsParams = array_merge([$userId], $dateParams);
    if ($transactionType !== 'all') {
        if ($transactionType === 'earnings') {
            $typeCondition = "AND type IN ('commission', 'bonus')";
        } elseif ($transactionType === 'payout') {
            $typeCondition = "AND type = 'payout'";
        }
    }
    
    $earnings = $db->fetchAll("
        SELECT 
            te.*,
            at.title as pick_title,
            at.id as pick_id
        FROM tipster_earnings te
        LEFT JOIN accumulator_tickets at ON te.pick_id = at.id
        WHERE te.tipster_id = ? 
        {$dateCondition}
        {$typeCondition}
        ORDER BY te.created_at DESC
        LIMIT 100
    ", $earningsParams);
    
    // Get wallet transactions
    $walletTypeCondition = '';
    $walletParams = array_merge([$userId], $dateParams);
    if ($transactionType !== 'all') {
        if ($transactionType === 'deposit') {
            $walletTypeCondition = "AND type = 'deposit'";
        } elseif ($transactionType === 'withdrawal') {
            $walletTypeCondition = "AND type = 'withdrawal'";
        } elseif ($transactionType === 'payout') {
            $walletTypeCondition = "AND type = 'payout'";
        }
    }
    
    $walletTransactions = $db->fetchAll("
        SELECT 
            wt.*
        FROM wallet_transactions wt
        WHERE wt.user_id = ? 
        {$dateCondition}
        {$walletTypeCondition}
        ORDER BY wt.created_at DESC
        LIMIT 100
    ", $walletParams);
    
    // Get sales history (picks sold)
    $sales = $db->fetchAll("
        SELECT 
            upp.id,
            upp.purchase_price,
            upp.purchase_date,
            upp.settlement_status,
            at.id as pick_id,
            at.title as pick_title,
            u.username as buyer_username,
            u.display_name as buyer_name
        FROM user_purchased_picks upp
        JOIN accumulator_tickets at ON upp.accumulator_id = at.id
        JOIN users u ON upp.user_id = u.id
        WHERE at.user_id = ? 
        {$dateCondition}
        ORDER BY upp.purchase_date DESC
        LIMIT 100
    ", array_merge([$userId], $dateParams));
    
    // Calculate summary statistics
    $totalEarnings = 0;
    foreach ($earnings as $earning) {
        if ($earning['type'] === 'commission' || $earning['type'] === 'bonus') {
            $totalEarnings += (float)$earning['amount'];
        }
    }
    
    $totalSales = 0;
    foreach ($sales as $sale) {
        $totalSales += (float)$sale['purchase_price'];
    }
    
    $totalCommission = 0;
    foreach ($sales as $sale) {
        // Calculate commission (10% platform fee)
        $totalCommission += (float)$sale['purchase_price'] * 0.10;
    }
    
    $netEarnings = $totalEarnings; // Already after commission
    
} catch (Exception $e) {
    $error = 'Error loading transactions: ' . $e->getMessage();
    $logger->error('Tipster transactions loading failed', ['error' => $e->getMessage()]);
}

// Set page variables
$pageTitle = "My Transactions";

// Start content buffer
ob_start();
?>

<div class="transactions-content">
    <?php if (isset($error) && $error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-history"></i> My Transactions</h2>
        <p style="color: #666; margin-top: 10px;">View your earnings from sales, wallet transactions, and commission breakdown.</p>
    </div>
    
    <!-- Wallet Balance Card -->
    <div class="card" style="background: #dc3545; color: white; border: 2px solid #dc3545;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
                <p style="font-size: 14px; margin-bottom: 5px; opacity: 0.9;">Current Wallet Balance</p>
                <p style="font-size: 36px; font-weight: bold; margin: 0;">
                    GHS <?php echo number_format($walletBalance, 2); ?>
                </p>
            </div>
            <i class="fas fa-wallet" style="font-size: 48px; opacity: 0.8;"></i>
        </div>
    </div>
    
    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
        <div class="card" style="text-align: center;">
            <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Earnings</p>
            <p style="font-size: 24px; font-weight: bold; color: #2e7d32; margin: 0;">
                GHS <?php echo number_format($totalEarnings, 2); ?>
            </p>
            <p style="font-size: 11px; color: #999; margin-top: 5px;">After commission</p>
        </div>
        <div class="card" style="text-align: center;">
            <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Sales</p>
            <p style="font-size: 24px; font-weight: bold; color: #d32f2f; margin: 0;">
                GHS <?php echo number_format($totalSales, 2); ?>
            </p>
            <p style="font-size: 11px; color: #999; margin-top: 5px;">Gross revenue</p>
        </div>
        <div class="card" style="text-align: center;">
            <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Commission Paid</p>
            <p style="font-size: 24px; font-weight: bold; color: #ff9800; margin: 0;">
                GHS <?php echo number_format($totalCommission, 2); ?>
            </p>
            <p style="font-size: 11px; color: #999; margin-top: 5px;">10% platform fee</p>
        </div>
        <div class="card" style="text-align: center;">
            <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Net Earnings</p>
            <p style="font-size: 24px; font-weight: bold; color: #2e7d32; margin: 0;">
                GHS <?php echo number_format($netEarnings, 2); ?>
            </p>
            <p style="font-size: 11px; color: #999; margin-top: 5px;">Your share (90%)</p>
        </div>
    </div>
    
    <!-- Filters -->
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3><i class="fas fa-filter"></i> Filters</h3>
            <button onclick="toggleFilters()" style="background: none; border: none; cursor: pointer; color: #d32f2f;">
                <i class="fas fa-chevron-down" id="filterIcon"></i>
            </button>
        </div>
        <div id="filtersSection" style="display: none;">
            <form method="GET" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Timeframe</label>
                    <select name="timeframe" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                        <option value="all" <?php echo $timeframe === 'all' ? 'selected' : ''; ?>>All Time</option>
                        <option value="today" <?php echo $timeframe === 'today' ? 'selected' : ''; ?>>Today</option>
                        <option value="week" <?php echo $timeframe === 'week' ? 'selected' : ''; ?>>Last 7 Days</option>
                        <option value="month" <?php echo $timeframe === 'month' ? 'selected' : ''; ?>>Last 30 Days</option>
                        <option value="year" <?php echo $timeframe === 'year' ? 'selected' : ''; ?>>Last Year</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Transaction Type</label>
                    <select name="type" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                        <option value="all" <?php echo $transactionType === 'all' ? 'selected' : ''; ?>>All Types</option>
                        <option value="earnings" <?php echo $transactionType === 'earnings' ? 'selected' : ''; ?>>Earnings</option>
                        <option value="sales" <?php echo $transactionType === 'sales' ? 'selected' : ''; ?>>Sales</option>
                        <option value="deposit" <?php echo $transactionType === 'deposit' ? 'selected' : ''; ?>>Deposits</option>
                        <option value="payout" <?php echo $transactionType === 'payout' ? 'selected' : ''; ?>>Payouts</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Start Date</label>
                    <input type="date" name="start_date" value="<?php echo htmlspecialchars($startDate); ?>" 
                           style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">End Date</label>
                    <input type="date" name="end_date" value="<?php echo htmlspecialchars($endDate); ?>" 
                           style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                </div>
                <div style="display: flex; gap: 10px; align-items: flex-end;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-filter"></i> Apply Filters
                    </button>
                    <a href="<?= $baseUrl ?>/tipster_transactions" class="btn btn-secondary" style="flex: 1; text-align: center;">
                        <i class="fas fa-times"></i> Clear
                    </a>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Earnings Section -->
    <div class="card">
        <h3><i class="fas fa-money-bill-wave"></i> Earnings from Sales</h3>
        <p style="color: #666; margin-top: 5px; margin-bottom: 15px;">Commission earned from successful pick sales</p>
        <?php if (empty($earnings)): ?>
            <p style="color: #666; text-align: center; padding: 20px;">No earnings recorded yet.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Pick</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Type</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($earnings as $earning): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y g:i A', strtotime($earning['created_at'])); ?></td>
                            <td style="padding: 10px;">
                                <?php if ($earning['pick_title']): ?>
                                    <a href="<?= $baseUrl ?>/marketplace?view=<?php echo $earning['pick_id']; ?>" style="color: #d32f2f;">
                                        <?php echo htmlspecialchars($earning['pick_title']); ?>
                                    </a>
                                <?php else: ?>
                                    <span style="color: #999;">N/A</span>
                                <?php endif; ?>
                            </td>
                            <td style="padding: 10px;">
                                <span style="background: <?php echo $earning['type'] === 'commission' ? '#2e7d32' : '#ff9800'; ?>; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    <?php echo strtoupper($earning['type']); ?>
                                </span>
                            </td>
                            <td style="padding: 10px; color: #666;"><?php echo htmlspecialchars($earning['description'] ?? 'N/A'); ?></td>
                            <td style="padding: 10px; text-align: right; color: #2e7d32; font-weight: bold;">
                                +GHS <?php echo number_format((float)$earning['amount'], 2); ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Sales History Section -->
    <div class="card">
        <h3><i class="fas fa-shopping-cart"></i> Sales History</h3>
        <p style="color: #666; margin-top: 5px; margin-bottom: 15px;">All picks sold to users</p>
        <?php if (empty($sales)): ?>
            <p style="color: #666; text-align: center; padding: 20px;">No sales recorded yet.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Pick</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Buyer</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Sale Price</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Your Share (90%)</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Commission (10%)</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($sales as $sale): ?>
                        <?php
                        $salePrice = (float)$sale['purchase_price'];
                        $commission = $salePrice * 0.10;
                        $tipsterShare = $salePrice * 0.90;
                        $statusColor = $sale['settlement_status'] === 'won' ? '#2e7d32' : ($sale['settlement_status'] === 'lost' ? '#d32f2f' : '#ff9800');
                        ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y g:i A', strtotime($sale['purchase_date'])); ?></td>
                            <td style="padding: 10px;">
                                <a href="<?= $baseUrl ?>/marketplace?view=<?php echo $sale['pick_id']; ?>" style="color: #d32f2f;">
                                    <?php echo htmlspecialchars($sale['pick_title']); ?>
                                </a>
                            </td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($sale['buyer_name'] ?? $sale['buyer_username'] ?? 'N/A'); ?></td>
                            <td style="padding: 10px; text-align: right; font-weight: bold;">GHS <?php echo number_format($salePrice, 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #2e7d32; font-weight: bold;">GHS <?php echo number_format($tipsterShare, 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #ff9800;">GHS <?php echo number_format($commission, 2); ?></td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="background: <?php echo $statusColor; ?>; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    <?php echo strtoupper($sale['settlement_status'] ?? 'PENDING'); ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Wallet Transactions Section -->
    <div class="card">
        <h3><i class="fas fa-wallet"></i> Wallet Transactions</h3>
        <p style="color: #666; margin-top: 5px; margin-bottom: 15px;">All wallet deposits, withdrawals, and payouts</p>
        <?php if (empty($walletTransactions)): ?>
            <p style="color: #666; text-align: center; padding: 20px;">No wallet transactions recorded yet.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Type</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($walletTransactions as $transaction): ?>
                        <?php
                        $amount = (float)$transaction['amount'];
                        $isPositive = in_array($transaction['type'], ['deposit', 'commission', 'refund']);
                        $typeColors = [
                            'deposit' => '#2e7d32',
                            'withdrawal' => '#d32f2f',
                            'payout' => '#ff9800',
                            'commission' => '#2e7d32',
                            'refund' => '#17a2b8'
                        ];
                        $typeColor = $typeColors[$transaction['type']] ?? '#666';
                        ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y g:i A', strtotime($transaction['created_at'])); ?></td>
                            <td style="padding: 10px;">
                                <span style="background: <?php echo $typeColor; ?>; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                                    <?php echo htmlspecialchars($transaction['type']); ?>
                                </span>
                            </td>
                            <td style="padding: 10px; color: #666;"><?php echo htmlspecialchars($transaction['description'] ?? 'N/A'); ?></td>
                            <td style="padding: 10px; text-align: right; color: <?php echo $isPositive ? '#2e7d32' : '#d32f2f'; ?>; font-weight: bold;">
                                <?php echo $isPositive ? '+' : '-'; ?>GHS <?php echo number_format($amount, 2); ?>
                            </td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="background: <?php echo $transaction['status'] === 'completed' ? '#2e7d32' : '#ff9800'; ?>; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                                    <?php echo strtoupper($transaction['status'] ?? 'PENDING'); ?>
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

<script>
function toggleFilters() {
    const section = document.getElementById('filtersSection');
    const icon = document.getElementById('filterIcon');
    if (section.style.display === 'none') {
        section.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        section.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include the appropriate layout based on user role
include __DIR__ . '/../views/layouts/tipster_layout.php';
?>

