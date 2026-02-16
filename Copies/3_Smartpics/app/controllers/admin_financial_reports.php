<?php
/**
 * Admin Financial Reports - Settlement Proceeds and Financial Summaries
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get filter parameters
$timeframe = $_GET['timeframe'] ?? 'all';
$startDate = $_GET['start_date'] ?? '';
$endDate = $_GET['end_date'] ?? '';

// Build date condition
$dateCondition = '';
$dateParams = [];
if ($startDate && $endDate) {
    $dateCondition = "AND DATE(settled_at) BETWEEN ? AND ?";
    $dateParams = [$startDate, $endDate];
} else {
    switch ($timeframe) {
        case 'today':
            $dateCondition = "AND DATE(settled_at) = CURDATE()";
            break;
        case 'week':
            $dateCondition = "AND settled_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
        case 'month':
            $dateCondition = "AND settled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            break;
        case 'year':
            $dateCondition = "AND settled_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)";
            break;
        default:
            $dateCondition = '';
    }
}

$financialData = [];
$error = '';

try {
    // Total Platform Revenue (Commissions from Won Picks) - 10% commission
    // Calculate from escrow_funds where pick is won (primary source)
    $dateConditionCommission = str_replace('settled_at', 'at.updated_at', $dateCondition);
    
    // First, try from escrow_funds (most accurate)
    $commissionFromEscrow = $db->fetch("
        SELECT COALESCE(SUM(ef.amount * 0.10), 0) as total
        FROM escrow_funds ef
        JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE (at.status = 'won' OR at.result = 'won')
        " . ($dateConditionCommission ? "AND at.updated_at IS NOT NULL $dateConditionCommission" : "") . "
    ", $dateParams);
    
    // Also calculate from user_purchased_picks as backup
    $commissionFromPurchases = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price * 0.10), 0) as total
        FROM accumulator_tickets at
        JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
        WHERE (at.status = 'won' OR at.result = 'won')
        AND upp.settlement_status = 'won'
        " . ($dateConditionCommission ? "AND at.updated_at IS NOT NULL $dateConditionCommission" : "") . "
    ", $dateParams);
    
    // Use the higher value (escrow is primary source)
    $financialData['total_commission'] = max(
        floatval($commissionFromEscrow['total'] ?? 0),
        floatval($commissionFromPurchases['total'] ?? 0)
    );
    
    // Total Sales Revenue (All Purchases)
    $totalSales = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price), 0) as total
        FROM user_purchased_picks upp
        WHERE upp.purchase_price > 0
        " . ($dateCondition ? "AND upp.purchase_date IS NOT NULL $dateCondition" : "") . "
    ", $dateParams);
    $financialData['total_sales'] = floatval($totalSales['total'] ?? 0);
    
    // Total Tipster Payouts (90% of Won Pick Sales)
    // Calculate from escrow_funds where pick is won (primary source)
    $tipsterPayoutsFromEscrow = $db->fetch("
        SELECT COALESCE(SUM(ef.amount * 0.90), 0) as total
        FROM escrow_funds ef
        JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE (at.status = 'won' OR at.result = 'won')
        " . ($dateConditionCommission ? "AND at.updated_at IS NOT NULL $dateConditionCommission" : "") . "
    ", $dateParams);
    
    // Also calculate from user_purchased_picks as backup
    $tipsterPayoutsFromPurchases = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price * 0.90), 0) as total
        FROM accumulator_tickets at
        JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
        WHERE (at.status = 'won' OR at.result = 'won')
        AND upp.settlement_status = 'won'
        " . ($dateConditionCommission ? "AND at.updated_at IS NOT NULL $dateConditionCommission" : "") . "
    ", $dateParams);
    
    // Use the higher value
    $financialData['total_tipster_payouts'] = max(
        floatval($tipsterPayoutsFromEscrow['total'] ?? 0),
        floatval($tipsterPayoutsFromPurchases['total'] ?? 0)
    );
    
    // Total Refunds (Lost Pick Refunds)
    // Calculate from escrow_funds where pick is lost (primary source)
    $dateConditionRefunds = str_replace('settled_at', 'at.updated_at', $dateCondition);
    $refundsFromEscrow = $db->fetch("
        SELECT COALESCE(SUM(ef.amount), 0) as total
        FROM escrow_funds ef
        JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE (at.status = 'lost' OR at.result = 'lost')
        " . ($dateConditionRefunds ? "AND at.updated_at IS NOT NULL $dateConditionRefunds" : "") . "
    ", $dateParams);
    
    // Also calculate from user_purchased_picks as backup
    $refundsFromPurchases = $db->fetch("
        SELECT COALESCE(SUM(upp.purchase_price), 0) as total
        FROM accumulator_tickets at
        JOIN user_purchased_picks upp ON at.id = upp.accumulator_id
        WHERE (at.status = 'lost' OR at.result = 'lost')
        AND upp.settlement_status = 'lost'
        " . ($dateConditionRefunds ? "AND at.updated_at IS NOT NULL $dateConditionRefunds" : "") . "
    ", $dateParams);
    
    // Use the higher value
    $financialData['total_refunds'] = max(
        floatval($refundsFromEscrow['total'] ?? 0),
        floatval($refundsFromPurchases['total'] ?? 0)
    );
    
    // Net Revenue (Commission - Refunds)
    $financialData['net_revenue'] = $financialData['total_commission'] - $financialData['total_refunds'];
    
    // Settlement Summary by Date (using accumulator_tickets updated_at for settlement date)
    // Combine data from escrow_funds and user_purchased_picks
    $settlementDateCondition = str_replace('settled_at', 'at.updated_at', $dateCondition);
    $settlementSummary = $db->fetchAll("
        SELECT 
            DATE(at.updated_at) as settlement_date,
            COUNT(DISTINCT COALESCE(ef.id, upp.id)) as settled_purchases,
            SUM(CASE WHEN (at.status = 'won' OR at.result = 'won') THEN COALESCE(ef.amount, upp.purchase_price, 0) ELSE 0 END) as won_amount,
            SUM(CASE WHEN (at.status = 'won' OR at.result = 'won') THEN COALESCE(ef.amount * 0.10, upp.purchase_price * 0.10, 0) ELSE 0 END) as commission_amount,
            SUM(CASE WHEN (at.status = 'lost' OR at.result = 'lost') THEN COALESCE(ef.amount, upp.purchase_price, 0) ELSE 0 END) as lost_amount
        FROM accumulator_tickets at
        LEFT JOIN escrow_funds ef ON at.id = ef.pick_id AND (at.status IN ('won', 'lost') OR at.result IN ('won', 'lost'))
        LEFT JOIN user_purchased_picks upp ON at.id = upp.accumulator_id AND upp.settlement_status IN ('won', 'lost')
        WHERE (at.status IN ('won', 'lost') OR at.result IN ('won', 'lost'))
        AND at.updated_at IS NOT NULL
        " . ($settlementDateCondition ? "AND at.updated_at IS NOT NULL $settlementDateCondition" : "") . "
        GROUP BY DATE(at.updated_at)
        ORDER BY settlement_date DESC
        LIMIT 30
    ", $dateParams);
    
    // Top Earning Tipsters
    $topEarningTipsters = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            COUNT(DISTINCT COALESCE(ef.id, upp.id)) as settled_picks,
            SUM(CASE 
                WHEN (at.status = 'won' OR at.result = 'won') THEN COALESCE(ef.amount * 0.90, upp.purchase_price * 0.90, 0) 
                ELSE 0 
            END) as total_earnings,
            SUM(CASE 
                WHEN (at.status = 'won' OR at.result = 'won') THEN COALESCE(ef.amount * 0.10, upp.purchase_price * 0.10, 0) 
                ELSE 0 
            END) as platform_commission
        FROM users u
        JOIN accumulator_tickets at ON u.id = at.user_id
        LEFT JOIN escrow_funds ef ON at.id = ef.pick_id AND (at.status IN ('won', 'lost') OR at.result IN ('won', 'lost'))
        LEFT JOIN user_purchased_picks upp ON at.id = upp.accumulator_id AND upp.settlement_status IN ('won', 'lost')
        WHERE (at.status IN ('won', 'lost') OR at.result IN ('won', 'lost'))
        AND at.updated_at IS NOT NULL
        " . ($dateConditionCommission ? "AND at.updated_at IS NOT NULL $dateConditionCommission" : "") . "
        AND u.role = 'tipster'
        AND (ef.id IS NOT NULL OR upp.id IS NOT NULL)
        GROUP BY u.id
        HAVING total_earnings > 0
        ORDER BY total_earnings DESC
        LIMIT 20
    ", $dateParams);
    
    // Recent Settlements
    $recentSettlementsDateCondition = str_replace('settled_at', 'at.updated_at', $dateCondition);
    $recentSettlements = $db->fetchAll("
        SELECT 
            upp.id,
            upp.purchase_price,
            upp.settlement_status,
            at.updated_at as settled_at,
            at.title as pick_title,
            u.username as buyer_name,
            seller.username as tipster_name,
            seller.id as tipster_id
        FROM user_purchased_picks upp
        JOIN accumulator_tickets at ON upp.accumulator_id = at.id
        JOIN users u ON upp.user_id = u.id
        JOIN users seller ON at.user_id = seller.id
        WHERE upp.settlement_status IN ('won', 'lost')
        AND at.updated_at IS NOT NULL
        " . ($recentSettlementsDateCondition ? "AND at.updated_at IS NOT NULL $recentSettlementsDateCondition" : "") . "
        ORDER BY at.updated_at DESC
        LIMIT 50
    ", $dateParams);
    
} catch (Exception $e) {
    $error = 'Error loading financial data: ' . $e->getMessage();
    $logger->error('Financial reports error', ['error' => $e->getMessage()]);
    $financialData = [
        'total_commission' => 0,
        'total_sales' => 0,
        'total_tipster_payouts' => 0,
        'total_refunds' => 0,
        'net_revenue' => 0
    ];
    $settlementSummary = [];
    $topEarningTipsters = [];
    $recentSettlements = [];
}

// Set page variables
$pageTitle = "Financial Reports";

// Start content buffer
ob_start();
?>

<div class="admin-financial-content">
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-chart-line"></i> Financial Reports</h2>
        <p style="color: #666; margin-top: 10px;">View settlement proceeds, commissions, and financial summaries.</p>
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
                <a href="/SmartPicksPro-Local/admin_financial_reports" class="btn btn-secondary" style="padding: 8px 16px;">
                    <i class="fas fa-times"></i> Clear
                </a>
            </div>
        </form>
    </div>
    
    <!-- Financial Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Sales Revenue</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;">GHS <?php echo number_format($financialData['total_sales'], 2); ?></p>
                </div>
                <i class="fas fa-dollar-sign" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Platform Commission</p>
                    <p style="font-size: 28px; font-weight: bold; color: #d32f2f;">GHS <?php echo number_format($financialData['total_commission'], 2); ?></p>
                </div>
                <i class="fas fa-percentage" style="font-size: 32px; color: #d32f2f;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Tipster Payouts</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;">GHS <?php echo number_format($financialData['total_tipster_payouts'], 2); ?></p>
                </div>
                <i class="fas fa-hand-holding-usd" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Refunds</p>
                    <p style="font-size: 28px; font-weight: bold; color: #ff9800;">GHS <?php echo number_format($financialData['total_refunds'], 2); ?></p>
                </div>
                <i class="fas fa-undo" style="font-size: 32px; color: #ff9800;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Net Revenue</p>
                    <p style="font-size: 28px; font-weight: bold; color: <?php echo $financialData['net_revenue'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>;">
                        GHS <?php echo number_format($financialData['net_revenue'], 2); ?>
                    </p>
                </div>
                <i class="fas fa-chart-line" style="font-size: 32px; color: <?php echo $financialData['net_revenue'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>;"></i>
            </div>
        </div>
    </div>
    
    <!-- Settlement Summary by Date -->
    <div class="card">
        <h3><i class="fas fa-calendar-alt"></i> Settlement Summary by Date</h3>
        <?php if (empty($settlementSummary)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No settlement data available for the selected period.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Settled Purchases</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Won Amount</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Commission</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Refunded</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($settlementSummary as $summary): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y', strtotime($summary['settlement_date'])); ?></td>
                            <td style="padding: 10px; text-align: right;"><?php echo number_format($summary['settled_purchases']); ?></td>
                            <td style="padding: 10px; text-align: right; color: #2e7d32;">GHS <?php echo number_format($summary['won_amount'], 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #d32f2f;">GHS <?php echo number_format($summary['commission_amount'], 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #ff9800;">GHS <?php echo number_format($summary['lost_amount'], 2); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Top Earning Tipsters -->
    <div class="card">
        <h3><i class="fas fa-trophy"></i> Top Earning Tipsters</h3>
        <?php if (empty($topEarningTipsters)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No tipster earnings data available for the selected period.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Tipster</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Settled Picks</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total Earnings</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Platform Commission</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($topEarningTipsters as $index => $tipster): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;">
                                <strong><?php echo htmlspecialchars($tipster['display_name'] ?: $tipster['username']); ?></strong>
                                <span style="color: #666; font-size: 12px;">(@<?php echo htmlspecialchars($tipster['username']); ?>)</span>
                            </td>
                            <td style="padding: 10px; text-align: right;"><?php echo number_format($tipster['settled_picks']); ?></td>
                            <td style="padding: 10px; text-align: right; color: #2e7d32; font-weight: bold;">GHS <?php echo number_format($tipster['total_earnings'], 2); ?></td>
                            <td style="padding: 10px; text-align: right; color: #d32f2f;">GHS <?php echo number_format($tipster['platform_commission'], 2); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Recent Settlements -->
    <div class="card">
        <h3><i class="fas fa-history"></i> Recent Settlements</h3>
        <?php if (empty($recentSettlements)): ?>
            <p style="color: #666; text-align: center; padding: 40px;">No recent settlements available.</p>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Pick</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Tipster</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Buyer</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Amount</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recentSettlements as $settlement): ?>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;"><?php echo date('M j, Y H:i', strtotime($settlement['settled_at'])); ?></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($settlement['pick_title']); ?></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($settlement['tipster_name']); ?></td>
                            <td style="padding: 10px;"><?php echo htmlspecialchars($settlement['buyer_name']); ?></td>
                            <td style="padding: 10px; text-align: right;">GHS <?php echo number_format($settlement['purchase_price'], 2); ?></td>
                            <td style="padding: 10px; text-align: center;">
                                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                                      background-color: <?php echo $settlement['settlement_status'] === 'won' ? '#e8f5e8' : '#ffebee'; ?>;
                                      color: <?php echo $settlement['settlement_status'] === 'won' ? '#2e7d32' : '#d32f2f'; ?>;">
                                    <?php echo strtoupper($settlement['settlement_status']); ?>
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

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

