<?php
/**
 * User Transactions Report
 * Shows purchase history, wallet transactions, and pick purchases for users
 */

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

if (!in_array($_SESSION['role'], ['user', 'tipster'])) {
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

// Get wallet balance - try multiple methods
$walletBalance = 0.00;
try {
    // First try direct query
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    if ($result && isset($result['balance'])) {
        $walletBalance = (float)$result['balance'];
    } else {
        // If no wallet exists, create one
        try {
            $db->query("INSERT INTO user_wallets (user_id, balance, created_at) VALUES (?, 0.00, NOW()) ON DUPLICATE KEY UPDATE user_id = user_id", [$userId]);
            $walletBalance = 0.00;
        } catch (Exception $e) {
            // Table might not exist or different structure
            $walletBalance = 0.00;
        }
    }
} catch (Exception $e) {
    $walletBalance = 0.00;
    $error = 'Error loading wallet: ' . $e->getMessage();
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
$transactions = [];
$purchases = [];
$error = '';

try {
    // Wallet balance already retrieved above, just ensure it's a float
    $walletBalance = (float)$walletBalance;
    
    // Build type filter for transactions
    $typeCondition = '';
    if ($transactionType !== 'all') {
        $typeCondition = "AND type = ?";
        $dateParams[] = $transactionType;
    }
    
    // Get wallet transactions
    $transactions = $db->fetchAll("
        SELECT 
            wt.*,
            CASE 
                WHEN wt.type = 'top_up' THEN 'Wallet Top-Up'
                WHEN wt.type = 'purchase' THEN 'Pick Purchase'
                WHEN wt.type = 'refund' THEN 'Pick Refund'
                WHEN wt.type = 'payout' THEN 'Payout Request'
                WHEN wt.type = 'payout_approved' THEN 'Payout Approved'
                WHEN wt.type = 'referral_bonus' THEN 'Referral Bonus'
                WHEN wt.type = 'reward' THEN 'Reward'
                ELSE wt.type
            END as type_label
        FROM wallet_transactions wt
        WHERE wt.user_id = ?
        " . ($dateCondition ? $dateCondition : "") . "
        " . ($typeCondition ? $typeCondition : "") . "
        ORDER BY wt.created_at DESC
        LIMIT 200
    ", array_merge([$userId], $dateParams));
    
    // Get pick purchases
    $purchases = $db->fetchAll("
        SELECT 
            upp.*,
            at.title as pick_title,
            at.status as pick_status,
            at.result as pick_result,
            seller.username as tipster_username,
            seller.display_name as tipster_name
        FROM user_purchased_picks upp
        JOIN accumulator_tickets at ON upp.accumulator_id = at.id
        JOIN users seller ON at.user_id = seller.id
        WHERE upp.user_id = ?
        " . ($dateCondition ? "AND upp.purchase_date IS NOT NULL " . str_replace('created_at', 'upp.purchase_date', $dateCondition) : "") . "
        ORDER BY upp.purchase_date DESC
        LIMIT 100
    ", array_merge([$userId], $dateParams));
    
} catch (Exception $e) {
    $error = 'Error loading transaction data: ' . $e->getMessage();
    $logger->error('User transactions error', ['error' => $e->getMessage(), 'user_id' => $userId]);
    $transactions = [];
    $purchases = [];
}

// Set page variables
$pageTitle = "My Transactions";

// Start content buffer
ob_start();
?>

<div class="user-transactions-content">
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-history"></i> My Transactions</h2>
        <p style="color: #666; margin-top: 10px;">View your wallet transactions and pick purchase history.</p>
    </div>
    
    <!-- Wallet Balance Card -->
    <div class="card" style="background: #dc3545; color: white; border: 2px solid #dc3545;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
                <p style="font-size: 14px; margin-bottom: 5px; opacity: 0.9;">Current Wallet Balance</p>
                <p style="font-size: 36px; font-weight: bold; margin: 0;">
                    GHS <?php 
                        $balance = (float)$walletBalance;
                        echo number_format($balance, 2); 
                    ?>
                </p>
            </div>
            <i class="fas fa-wallet" style="font-size: 48px; opacity: 0.8;"></i>
        </div>
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
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #666;">Transaction Type:</label>
                <select name="type" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="all" <?php echo $transactionType === 'all' ? 'selected' : ''; ?>>All Types</option>
                    <option value="top_up" <?php echo $transactionType === 'top_up' ? 'selected' : ''; ?>>Top-Ups</option>
                    <option value="purchase" <?php echo $transactionType === 'purchase' ? 'selected' : ''; ?>>Purchases</option>
                    <option value="refund" <?php echo $transactionType === 'refund' ? 'selected' : ''; ?>>Refunds</option>
                    <option value="reward" <?php echo $transactionType === 'reward' ? 'selected' : ''; ?>>Rewards</option>
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
                <a href="<?= $baseUrl ?>/user_transactions" class="btn btn-secondary" style="padding: 8px 16px;">
                    <i class="fas fa-times"></i> Clear
                </a>
            </div>
        </form>
    </div>
    
    <!-- Wallet Transactions -->
    <div class="card">
        <h3><i class="fas fa-wallet"></i> Wallet Transactions</h3>
        <?php if (empty($transactions)): ?>
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
                        <?php foreach ($transactions as $transaction): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y H:i', strtotime($transaction['created_at'])); ?></td>
                            <td style="padding: 10px;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                                      background-color: <?php 
                                          echo $transaction['type'] === 'top_up' ? '#e3f2fd' : 
                                               ($transaction['type'] === 'purchase' ? '#fff3e0' : 
                                               ($transaction['type'] === 'refund' ? '#e8f5e9' : '#f3e5f5')); ?>;
                                      color: <?php 
                                          echo $transaction['type'] === 'top_up' ? '#1976d2' : 
                                               ($transaction['type'] === 'purchase' ? '#f57c00' : 
                                               ($transaction['type'] === 'refund' ? '#388e3c' : '#7b1fa2')); ?>;">
                                    <?php echo htmlspecialchars($transaction['type_label']); ?>
                                </span>
                            </td>
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
    
    <!-- Pick Purchases -->
    <div class="card">
        <h3><i class="fas fa-shopping-cart"></i> Pick Purchases</h3>
        <?php if (empty($purchases)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No pick purchases found.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Pick Title</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Tipster</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Settlement Status</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($purchases as $purchase): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y H:i', strtotime($purchase['purchase_date'])); ?></td>
                            <td style="padding: 10px;"><strong><?php echo htmlspecialchars($purchase['pick_title']); ?></strong></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($purchase['tipster_name'] ?: $purchase['tipster_username']); ?></td>
                            <td style="padding: 10px; text-align: right; font-weight: bold;">
                                GHS <?php echo number_format($purchase['purchase_price'], 2); ?>
                            </td>
                            <td style="padding: 10px; text-align: center;">
                                <?php if ($purchase['settlement_status'] === 'won'): ?>
                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background-color: #e8f5e8; color: #2e7d32;">
                                        WON
                                    </span>
                                <?php elseif ($purchase['settlement_status'] === 'lost'): ?>
                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background-color: #ffebee; color: #d32f2f;">
                                        LOST
                                    </span>
                                <?php else: ?>
                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background-color: #fff3cd; color: #856404;">
                                        PENDING
                                    </span>
                                <?php endif; ?>
                            </td>
                            <td style="padding: 10px;">
                                <a href="<?= $baseUrl ?>/marketplace?view=<?php echo $purchase['accumulator_id']; ?>" 
                                   class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;">
                                    <i class="fas fa-eye"></i> View
                                </a>
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

// Include user layout
include __DIR__ . '/../views/layouts/user_layout.php';
?>

