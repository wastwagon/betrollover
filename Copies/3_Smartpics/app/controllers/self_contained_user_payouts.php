<?php
/**
 * SmartPicks Pro - Self-Contained User Payouts
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();

$error = '';
$success = '';
$payoutRequests = [];
$walletTransactions = [];

try {
    // Get user's payout requests
    $payoutRequests = $db->fetchAll("
        SELECT 
            tp.id,
            tp.amount,
            tp.status,
            tp.request_date,
            tp.processed_date,
            tp.payment_method,
            tp.account_details,
            tp.admin_notes
        FROM tipster_payouts tp
        WHERE tp.user_id = ?
        ORDER BY tp.request_date DESC
        LIMIT 20
    ", [$_SESSION['user_id']]);
    
    // Get recent wallet transactions
    $walletTransactions = $db->fetchAll("
        SELECT 
            wt.id,
            wt.type,
            wt.amount,
            wt.description,
            wt.status,
            wt.created_at
        FROM wallet_transactions wt
        WHERE wt.user_id = ?
        ORDER BY wt.created_at DESC
        LIMIT 10
    ", [$_SESSION['user_id']]);
    
} catch (Exception $e) {
    $error = 'Error loading payout data: ' . $e->getMessage();
    $logger->error('Payout data loading failed', ['error' => $e->getMessage()]);
}

// Handle payout request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'request_payout') {
    $amount = floatval($_POST['amount'] ?? 0);
    $paymentMethod = $_POST['payment_method'] ?? '';
    $accountDetails = trim($_POST['account_details'] ?? '');
    
    if ($amount > 0 && $paymentMethod && $accountDetails) {
        try {
            // Check user wallet balance
            $userBalance = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$_SESSION['user_id']])['balance'] ?? 0;
            
            if ($userBalance >= $amount) {
                // Check minimum payout amount (assuming GHS 10 minimum)
                $minPayout = 10.00;
                if ($amount >= $minPayout) {
                    // Create payout request
                    $result = $db->query("
                        INSERT INTO tipster_payouts (user_id, amount, status, request_date, payment_method, account_details) 
                        VALUES (?, ?, 'pending', NOW(), ?, ?)
                    ", [$_SESSION['user_id'], $amount, $paymentMethod, $accountDetails]);
                    
                    if ($result) {
                        // Deduct amount from wallet (hold in escrow)
                        $db->query("
                            UPDATE user_wallets 
                            SET balance = balance - ? 
                            WHERE user_id = ?
                        ", [$amount, $_SESSION['user_id']]);
                        
                        // Add transaction record
                        $db->query("
                            INSERT INTO wallet_transactions (user_id, type, amount, description, status, created_at) 
                            VALUES (?, 'payout_request', ?, 'Payout request - pending approval', 'pending', NOW())
                        ", [$_SESSION['user_id'], $amount]);
                        
                        $success = 'Payout request submitted successfully! Amount will be processed within 24-48 hours.';
                        
                        // Refresh data
                        $payoutRequests = $db->fetchAll("
                            SELECT 
                                tp.id,
                                tp.amount,
                                tp.status,
                                tp.request_date,
                                tp.processed_date,
                                tp.payment_method,
                                tp.account_details,
                                tp.admin_notes
                            FROM tipster_payouts tp
                            WHERE tp.user_id = ?
                            ORDER BY tp.request_date DESC
                            LIMIT 20
                        ", [$_SESSION['user_id']]);
                        
                        $walletTransactions = $db->fetchAll("
                            SELECT 
                                wt.id,
                                wt.type,
                                wt.amount,
                                wt.description,
                                wt.status,
                                wt.created_at
                            FROM wallet_transactions wt
                            WHERE wt.user_id = ?
                            ORDER BY wt.created_at DESC
                            LIMIT 10
                        ", [$_SESSION['user_id']]);
                    } else {
                        $error = 'Failed to submit payout request.';
                    }
                } else {
                    $error = "Minimum payout amount is GHS {$minPayout}.00";
                }
            } else {
                $error = 'Insufficient wallet balance for this payout request.';
            }
        } catch (Exception $e) {
            $error = 'Error submitting payout request: ' . $e->getMessage();
        }
    } else {
        $error = 'Please fill in all required fields.';
    }
}

// Safely get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$_SESSION['user_id']]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payouts - SmartPicks Pro</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        /* Basic Reset & Body */
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f7f6;
            color: #333;
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: 250px;
            background-color: #2E7D32; /* Green */
            color: white;
            padding: 20px 0;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease-in-out;
            position: fixed;
            height: 100%;
            z-index: 1000;
        }

        .sidebar-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 0 20px;
        }

        .sidebar-header .logo-text {
            font-size: 24px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 5px;
        }

        .sidebar-header .app-name {
            font-size: 14px;
            color: rgba(255,255,255,0.8);
        }

        .sidebar-menu {
            list-style: none;
            padding: 0;
            margin: 0;
            flex-grow: 1;
        }

        .sidebar-menu li a {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            color: white;
            text-decoration: none;
            font-size: 16px;
            transition: background-color 0.2s, padding-left 0.2s;
        }

        .sidebar-menu li a i {
            margin-right: 15px;
            font-size: 18px;
        }

        .sidebar-menu li a:hover,
        .sidebar-menu li a.active {
            background-color: #1B5E20; /* Darker Green */
            padding-left: 25px;
        }

        /* Main Content Wrapper */
        .main-content-wrapper {
            margin-left: 250px; /* Adjust for sidebar width */
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            background-color: #f4f7f6;
        }

        /* Top Bar */
        .top-bar {
            background-color: #fff;
            padding: 15px 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 999;
        }

        .top-bar .page-title-section {
            display: flex;
            flex-direction: column;
        }

        .top-bar .page-title {
            font-size: 22px;
            font-weight: bold;
            color: #333;
        }

        .top-bar .page-subtitle {
            font-size: 14px;
            color: #666;
        }

        .top-bar .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .top-bar .user-info .wallet-display {
            background-color: #E8F5E9; /* Light Green */
            color: #2E7D32; /* Dark Green */
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .top-bar .user-info .user-avatar {
            width: 40px;
            height: 40px;
            background-color: #2E7D32; /* Green */
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
        }

        /* Content Area */
        .content-area {
            padding: 25px;
            flex-grow: 1;
        }

        /* KPI Cards */
        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .kpi-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 100px;
        }

        .kpi-card .card-title {
            font-size: 15px;
            color: #666;
            margin-bottom: 10px;
        }

        .kpi-card .card-value {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kpi-card .card-value i {
            font-size: 24px;
            color: #2E7D32; /* Green */
        }

        /* Payout Request Form */
        .payout-form {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }

        .payout-form h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }

        .form-control {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
        }

        .form-control:focus {
            border-color: #2E7D32;
            outline: none;
            box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
        }

        /* Table Styles */
        .table-container {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }

        .table-container h3 {
            font-size: 18px;
            color: #333;
            margin-top: 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .data-table th, .data-table td {
            border: 1px solid #eee;
            padding: 12px 15px;
            text-align: left;
            font-size: 14px;
        }

        .data-table th {
            background-color: #f8f8f8;
            font-weight: 600;
            color: #555;
        }

        .data-table tr:nth-child(even) {
            background-color: #fdfdfd;
        }

        .data-table tr:hover {
            background-color: #f0f0f0;
        }

        /* Alerts */
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .alert.alert-success {
            background-color: #E8F5E9; /* Light Green */
            color: #2E7D32; /* Dark Green */
            border: 1px solid #A5D6A7;
        }

        .alert.alert-error {
            background-color: #FFEBEE; /* Light Red */
            color: #C62828; /* Dark Red */
            border: 1px solid #EF9A9A;
        }

        /* Buttons */
        .btn {
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }

        .btn-primary {
            background-color: #2E7D32; /* Green */
            color: white;
        }

        .btn-primary:hover {
            background-color: #1B5E20; /* Darker Green */
        }

        .btn-success {
            background-color: #4CAF50; /* Green */
            color: white;
        }

        .btn-success:hover {
            background-color: #388E3C; /* Darker Green */
        }

        .btn-info {
            background-color: #2196F3; /* Blue */
            color: white;
        }

        .btn-info:hover {
            background-color: #1976D2; /* Darker Blue */
        }

        /* Badges */
        .badge {
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            display: inline-block;
        }

        .badge-success { background-color: #4CAF50; } /* Green */
        .badge-warning { background-color: #FFC107; } /* Amber */
        .badge-danger { background-color: #F44336; } /* Red */
        .badge-info { background-color: #2196F3; } /* Blue */
        .badge-secondary { background-color: #9E9E9E; } /* Gray */

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-250px);
                position: fixed;
                height: 100%;
                top: 0;
                left: 0;
            }

            .sidebar.open {
                transform: translateX(0);
            }

            .main-content-wrapper {
                margin-left: 0;
            }

            .top-bar {
                padding: 10px 15px;
            }

            .top-bar .page-title {
                font-size: 18px;
            }

            .top-bar .page-subtitle {
                font-size: 12px;
            }

            .top-bar .user-info {
                gap: 5px;
            }

            .top-bar .user-info .wallet-display {
                padding: 5px 8px;
                font-size: 12px;
            }

            .top-bar .user-info .user-avatar {
                width: 35px;
                height: 35px;
                font-size: 16px;
            }

            .content-area {
                padding: 15px;
            }

            .kpi-cards {
                grid-template-columns: 1fr;
            }

            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="logo-text">Tipster Dashboard</div>
            <div class="app-name">SmartPicks Pro</div>
        </div>
        <ul class="sidebar-menu">
            <li><a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="/create_pick"><i class="fas fa-plus-circle"></i> Create Pick</a></li>
            <li><a href="/my_picks"><i class="fas fa-chart-line"></i> My Picks</a></li>
            <li><a href="/user_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/marketplace"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
            <li><a href="/my_purchases"><i class="fas fa-shopping-cart"></i> My Purchases</a></li>
            <li><a href="/chat"><i class="fas fa-comments"></i> Chat</a></li>
            <li><a href="/contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/wallet"><i class="fas fa-wallet"></i> Wallet</a></li>
            <li><a href="/payouts" class="active"><i class="fas fa-money-bill-wave"></i> Payouts</a></li>
            <li><a href="/profile"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Payout Requests</div>
                <div class="page-subtitle">SmartPicks Pro Tipster Dashboard</div>
            </div>
            <div class="user-info">
                <div class="wallet-display">
                    <i class="fas fa-wallet"></i> GHS <?= number_format($walletBalance, 2) ?>
                </div>
                <div class="user-avatar">
                    <?= strtoupper(substr($_SESSION['username'] ?? 'U', 0, 1)) ?>
                </div>
                <div>
                    <div style="font-weight: 600;"><?= htmlspecialchars($_SESSION['display_name'] ?? $_SESSION['username'] ?? 'User') ?></div>
                    <div style="font-size: 12px; color: #666;">Tipster</div>
                </div>
            </div>
        </div>

        <div class="content-area">
            <?php if (!empty($error)): ?>
                <div class="alert alert-error">
                    <h4>❌ Error</h4>
                    <p><?= htmlspecialchars($error) ?></p>
                </div>
            <?php endif; ?>

            <?php if (!empty($success)): ?>
                <div class="alert alert-success">
                    <h4>✅ Success</h4>
                    <p><?= htmlspecialchars($success) ?></p>
                </div>
            <?php endif; ?>

            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="card-title">Available Balance</div>
                    <div class="card-value">
                        GHS <?= number_format($walletBalance, 2) ?>
                        <i class="fas fa-wallet"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Pending Requests</div>
                    <div class="card-value">
                        <?= count(array_filter($payoutRequests, function($req) { return $req['status'] === 'pending'; })) ?>
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Paid Out</div>
                    <div class="card-value">
                        GHS <?= number_format(array_sum(array_column(array_filter($payoutRequests, function($req) { return $req['status'] === 'completed'; }), 'amount')), 2) ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Requests</div>
                    <div class="card-value">
                        <?= count($payoutRequests) ?>
                        <i class="fas fa-file-alt"></i>
                    </div>
                </div>
            </div>

            <div class="payout-form">
                <h3><i class="fas fa-plus-circle"></i> Request Payout</h3>
                <form method="post">
                    <input type="hidden" name="action" value="request_payout">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="amount">Amount (GHS)</label>
                            <input type="number" name="amount" id="amount" class="form-control" min="10" max="<?= $walletBalance ?>" step="0.01" required>
                            <small style="color: #666;">Minimum: GHS 10.00 | Available: GHS <?= number_format($walletBalance, 2) ?></small>
                        </div>
                        
                        <div class="form-group">
                            <label for="payment_method">Payment Method</label>
                            <select name="payment_method" id="payment_method" class="form-control" required>
                                <option value="">Select payment method</option>
                                <option value="mobile_money">Mobile Money</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="paypal">PayPal</option>
                                <option value="crypto">Cryptocurrency</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="account_details">Account Details</label>
                        <textarea name="account_details" id="account_details" rows="3" class="form-control" placeholder="Provide your account details (phone number, account number, email, etc.)" required></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" <?= $walletBalance < 10 ? 'disabled' : '' ?>>
                        <i class="fas fa-paper-plane"></i> Submit Payout Request
                    </button>
                </form>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-file-alt"></i> Payout History</h3>
                <?php if (!empty($payoutRequests)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Status</th>
                                <th>Requested</th>
                                <th>Processed</th>
                                <th>Admin Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($payoutRequests as $request): ?>
                                <tr>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($request['amount'], 2) ?></td>
                                    <td><?= ucfirst(str_replace('_', ' ', $request['payment_method'])) ?></td>
                                    <td>
                                        <span class="badge <?= $request['status'] === 'completed' ? 'badge-success' : ($request['status'] === 'pending' ? 'badge-warning' : ($request['status'] === 'rejected' ? 'badge-danger' : 'badge-info')) ?>">
                                            <?= ucfirst($request['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y H:i', strtotime($request['request_date'])) ?></td>
                                    <td><?= $request['processed_date'] ? date('M j, Y H:i', strtotime($request['processed_date'])) : '-' ?></td>
                                    <td><?= $request['admin_notes'] ? htmlspecialchars($request['admin_notes']) : '-' ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-file-alt" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Payout Requests</h4>
                        <p>You haven't made any payout requests yet.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-history"></i> Recent Wallet Transactions</h3>
                <?php if (!empty($walletTransactions)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($walletTransactions as $transaction): ?>
                                <tr>
                                    <td><?= ucfirst(str_replace('_', ' ', $transaction['type'])) ?></td>
                                    <td style="color: <?= $transaction['amount'] > 0 ? '#28a745' : '#dc3545' ?>; font-weight: bold;">
                                        <?= $transaction['amount'] > 0 ? '+' : '' ?>GHS <?= number_format($transaction['amount'], 2) ?>
                                    </td>
                                    <td><?= htmlspecialchars($transaction['description']) ?></td>
                                    <td>
                                        <span class="badge <?= $transaction['status'] === 'completed' ? 'badge-success' : ($transaction['status'] === 'pending' ? 'badge-warning' : 'badge-info') ?>">
                                            <?= ucfirst($transaction['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y H:i', strtotime($transaction['created_at'])) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-history" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Transactions</h4>
                        <p>No wallet transactions found.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>💰 Payout Management</h4>
                <p>Request payouts from your earnings. All requests are processed within 24-48 hours.</p>
                <p><strong>Current Status:</strong> GHS <?= number_format($walletBalance, 2) ?> available | <?= count(array_filter($payoutRequests, function($req) { return $req['status'] === 'pending'; })) ?> pending requests | GHS <?= number_format(array_sum(array_column(array_filter($payoutRequests, function($req) { return $req['status'] === 'completed'; }), 'amount')), 2) ?> total paid out</p>
            </div>
        </div>
    </div>

    <script>
        // Mobile menu toggle
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        // Add mobile menu button if needed
        if (window.innerWidth <= 768) {
            const topBar = document.querySelector('.top-bar');
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            menuBtn.onclick = toggleSidebar;
            topBar.insertBefore(menuBtn, topBar.firstChild);
        }

        // Update max amount when wallet balance changes
        document.addEventListener('DOMContentLoaded', function() {
            const amountInput = document.getElementById('amount');
            const maxAmount = <?= $walletBalance ?>;
            amountInput.max = maxAmount;
        });
    </script>
</body>
</html>
