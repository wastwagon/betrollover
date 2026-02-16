<?php
/**
 * SmartPicks Pro - Self-Contained Wallet
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();
$wallet = Wallet::getInstance();

$error = '';
$success = '';
$transactions = [];
$walletBalance = 0.00;

try {
    $userId = $_SESSION['user_id'];
    
    // Get wallet balance
    $walletBalance = $wallet->getBalance($userId);
    
    // Get recent transactions
    $transactions = $db->fetchAll("
        SELECT 
            id,
            type,
            amount,
            description,
            status,
            created_at
        FROM wallet_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
    ", [$userId]);
    
} catch (Exception $e) {
    $error = 'Error loading wallet data: ' . $e->getMessage();
    $logger->error('Wallet loading failed', ['error' => $e->getMessage()]);
}

// Handle deposit action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_funds') {
    $amount = floatval($_POST['amount'] ?? 0);
    $description = $_POST['description'] ?? 'Manual deposit';
    
    if ($amount > 0) {
        try {
            $result = $wallet->addFunds($userId, $amount, 'deposit', $description);
            if ($result) {
                $success = 'Funds added successfully!';
                // Refresh data
                $walletBalance = $wallet->getBalance($userId);
                $transactions = $db->fetchAll("
                    SELECT 
                        id,
                        type,
                        amount,
                        description,
                        status,
                        created_at
                    FROM wallet_transactions 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 20
                ", [$userId]);
            } else {
                $error = 'Failed to add funds.';
            }
        } catch (Exception $e) {
            $error = 'Error adding funds: ' . $e->getMessage();
        }
    } else {
        $error = 'Please enter a valid amount.';
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallet - SmartPicks Pro</title>
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
            background-color: #28a745; /* Green */
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
            background-color: #218838; /* Darker Green */
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
            background-color: #28a745; /* Green */
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

        /* Wallet Balance Card */
        .wallet-balance-card {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 8px 16px rgba(40, 167, 69, 0.3);
        }

        .wallet-balance-card h2 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
        }

        .wallet-balance-card .balance-amount {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
        }

        .wallet-balance-card .balance-label {
            font-size: 16px;
            opacity: 0.9;
        }

        /* Action Cards */
        .action-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .action-card {
            background-color: #fff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            text-align: center;
        }

        .action-card .card-icon {
            font-size: 48px;
            color: #28a745;
            margin-bottom: 15px;
        }

        .action-card h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #333;
        }

        .action-card p {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }

        /* Forms */
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
            border-color: #28a745;
            outline: none;
            box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
        }

        /* Buttons */
        .btn {
            padding: 10px 18px;
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
            background-color: #28a745; /* Green */
            color: white;
        }

        .btn-primary:hover {
            background-color: #218838; /* Darker Green */
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

            .action-cards {
                grid-template-columns: 1fr;
            }

            .wallet-balance-card .balance-amount {
                font-size: 36px;
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
            <li><a href="/marketplace"><i class="fas fa-store"></i> Marketplace</a></li>
            <li><a href="/my_purchases"><i class="fas fa-shopping-bag"></i> My Purchases</a></li>
            <li><a href="/public_chat"><i class="fas fa-comments"></i> Chat</a></li>
            <li><a href="/contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/wallet" class="active"><i class="fas fa-wallet"></i> Wallet</a></li>
            <li><a href="/payouts"><i class="fas fa-money-bill-wave"></i> Payouts</a></li>
            <li><a href="/profile"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Wallet</div>
                <div class="page-subtitle">SmartPicks Pro Management System</div>
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

            <div class="wallet-balance-card">
                <h2>Wallet Balance</h2>
                <div class="balance-amount">GHS <?= number_format($walletBalance, 2) ?></div>
                <div class="balance-label">Available for purchases and withdrawals</div>
            </div>

            <div class="action-cards">
                <div class="action-card">
                    <div class="card-icon">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                    <h3>Add Funds</h3>
                    <p>Deposit money into your wallet to purchase picks and participate in contests.</p>
                    <button class="btn btn-primary" onclick="showAddFundsModal()">
                        <i class="fas fa-plus"></i> Add Funds
                    </button>
                </div>

                <div class="action-card">
                    <div class="card-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <h3>Request Payout</h3>
                    <p>Withdraw your earnings from successful picks and contests.</p>
                    <a href="/payouts" class="btn btn-success">
                        <i class="fas fa-download"></i> Request Payout
                    </a>
                </div>

                <div class="action-card">
                    <div class="card-icon">
                        <i class="fas fa-store"></i>
                    </div>
                    <h3>Browse Marketplace</h3>
                    <p>Use your wallet balance to purchase picks from other tipsters.</p>
                    <a href="/marketplace" class="btn btn-info">
                        <i class="fas fa-shopping-cart"></i> Browse Picks
                    </a>
                </div>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-history"></i> Recent Transactions</h3>
                <?php if (!empty($transactions)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($transactions as $transaction): ?>
                                <tr>
                                    <td><?= date('M j, Y H:i', strtotime($transaction['created_at'])) ?></td>
                                    <td>
                                        <span class="badge <?= $transaction['type'] === 'deposit' ? 'badge-success' : ($transaction['type'] === 'purchase' ? 'badge-info' : 'badge-warning') ?>">
                                            <?= ucfirst($transaction['type']) ?>
                                        </span>
                                    </td>
                                    <td style="color: <?= $transaction['amount'] > 0 ? '#28a745' : '#dc3545' ?>; font-weight: bold;">
                                        <?= $transaction['amount'] > 0 ? '+' : '' ?>GHS <?= number_format($transaction['amount'], 2) ?>
                                    </td>
                                    <td><?= htmlspecialchars($transaction['description']) ?></td>
                                    <td>
                                        <span class="badge <?= $transaction['status'] === 'completed' ? 'badge-success' : 'badge-warning' ?>">
                                            <?= ucfirst($transaction['status']) ?>
                                        </span>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-wallet" style="font-size: 48px; color: #28a745; margin-bottom: 15px;"></i>
                        <h4>No Transactions Yet</h4>
                        <p>Your transaction history will appear here once you start using your wallet.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>💰 Wallet Management</h4>
                <p>Manage your funds, track transactions, and control your spending on the platform.</p>
                <p><strong>Current Balance:</strong> GHS <?= number_format($walletBalance, 2) ?> | <strong>Recent Transactions:</strong> <?= count($transactions) ?></p>
            </div>
        </div>
    </div>

    <!-- Add Funds Modal -->
    <div id="addFundsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Add Funds to Wallet</h3>
            <form method="post" id="addFundsForm">
                <input type="hidden" name="action" value="add_funds">
                
                <div class="form-group">
                    <label for="amount">Amount (GHS):</label>
                    <input type="number" name="amount" id="amount" class="form-control" min="1" step="0.01" required>
                </div>
                
                <div class="form-group">
                    <label for="description">Description (Optional):</label>
                    <input type="text" name="description" id="description" class="form-control" placeholder="e.g., Deposit for pick purchases">
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideAddFundsModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Funds</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function showAddFundsModal() {
            document.getElementById('addFundsModal').style.display = 'block';
        }

        function hideAddFundsModal() {
            document.getElementById('addFundsModal').style.display = 'none';
            document.getElementById('addFundsForm').reset();
        }

        // Close modal when clicking outside
        document.getElementById('addFundsModal').onclick = function(e) {
            if (e.target === this) {
                hideAddFundsModal();
            }
        };

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
    </script>
</body>
</html>
