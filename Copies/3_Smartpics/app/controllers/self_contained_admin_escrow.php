<?php
/**
 * SmartPicks Pro - Self-Contained Admin Escrow Funds
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAdmin();

$db = Database::getInstance();
$logger = Logger::getInstance();

$error = '';
$success = '';
$escrowTransactions = [];
$filter = $_GET['filter'] ?? 'all';

// Initialize variables with default values
$totalEscrow = 0.00;
$pendingCount = 0;
$totalSettled = 0.00;
$totalRefunded = 0.00;

try {
    // Build query based on filter
    $whereClause = '';
    switch ($filter) {
        case 'pending':
            $whereClause = "WHERE status = 'pending'";
            break;
        case 'settled':
            $whereClause = "WHERE status = 'settled'";
            break;
        case 'refunded':
            $whereClause = "WHERE status = 'refunded'";
            break;
        case 'today':
            $whereClause = "WHERE DATE(created_at) = CURDATE()";
            break;
        case 'week':
            $whereClause = "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
        default:
            $whereClause = "";
    }
    
    // Get escrow transactions
    $escrowTransactions = $db->fetchAll("
        SELECT 
            et.id,
            et.user_id,
            et.accumulator_id,
            et.amount,
            et.status,
            et.created_at,
            et.settled_at,
            u.username,
            u.display_name,
            at.title as pick_title,
            at.status as pick_status
        FROM escrow_transactions et
        LEFT JOIN users u ON et.user_id = u.id
        LEFT JOIN accumulator_tickets at ON et.accumulator_id = at.id
        {$whereClause}
        ORDER BY et.created_at DESC
        LIMIT 100
    ");
    
    // Get escrow statistics
    $totalEscrow = $db->fetch("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_transactions WHERE status = 'pending'")['total'] ?? 0;
    $totalSettled = $db->fetch("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_transactions WHERE status = 'settled'")['total'] ?? 0;
    $totalRefunded = $db->fetch("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_transactions WHERE status = 'refunded'")['total'] ?? 0;
    $pendingCount = $db->fetch("SELECT COUNT(*) as count FROM escrow_transactions WHERE status = 'pending'")['count'] ?? 0;
    
    // Ensure variables are properly initialized
    $totalEscrow = floatval($totalEscrow);
    $totalSettled = floatval($totalSettled);
    $totalRefunded = floatval($totalRefunded);
    $pendingCount = intval($pendingCount);
    
} catch (Exception $e) {
    $error = 'Error loading escrow data: ' . $e->getMessage();
    $logger->error('Escrow data loading failed', ['error' => $e->getMessage()]);
}

// Handle escrow actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $transactionId = $_POST['transaction_id'] ?? '';
    
    if ($action === 'settle_transaction' && $transactionId) {
        try {
            // Get transaction details
            $transaction = $db->fetch("SELECT * FROM escrow_transactions WHERE id = ?", [$transactionId]);
            if (!$transaction) {
                throw new Exception('Transaction not found.');
            }
            
            // Update transaction status
            $result = $db->query("UPDATE escrow_transactions SET status = 'settled', settled_at = NOW() WHERE id = ?", [$transactionId]);
            if ($result) {
                // Transfer funds to tipster
                $tipsterId = $db->fetch("SELECT user_id FROM accumulator_tickets WHERE id = ?", [$transaction['accumulator_id']])['user_id'];
                $db->query("
                    INSERT INTO wallet_transactions (user_id, type, amount, description, status, created_at) 
                    VALUES (?, 'earnings', ?, 'Escrow settlement for pick', 'completed', NOW())
                ", [$tipsterId, $transaction['amount']]);
                
                // Update tipster wallet balance
                $db->query("
                    INSERT INTO user_wallets (user_id, balance) VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE balance = balance + ?
                ", [$tipsterId, $transaction['amount'], $transaction['amount']]);
                
                $success = 'Transaction settled successfully! Funds transferred to tipster.';
                // Refresh the list
                $escrowTransactions = $db->fetchAll("
                    SELECT 
                        et.id,
                        et.user_id,
                        et.accumulator_id,
                        et.amount,
                        et.status,
                        et.created_at,
                        et.settled_at,
                        u.username,
                        u.display_name,
                        at.title as pick_title,
                        at.status as pick_status
                    FROM escrow_transactions et
                    LEFT JOIN users u ON et.user_id = u.id
                    LEFT JOIN accumulator_tickets at ON et.accumulator_id = at.id
                    {$whereClause}
                    ORDER BY et.created_at DESC
                    LIMIT 100
                ");
            } else {
                $error = 'Failed to settle transaction.';
            }
        } catch (Exception $e) {
            $error = 'Error settling transaction: ' . $e->getMessage();
        }
    } elseif ($action === 'refund_transaction' && $transactionId) {
        try {
            // Get transaction details
            $transaction = $db->fetch("SELECT * FROM escrow_transactions WHERE id = ?", [$transactionId]);
            if (!$transaction) {
                throw new Exception('Transaction not found.');
            }
            
            // Update transaction status
            $result = $db->query("UPDATE escrow_transactions SET status = 'refunded', settled_at = NOW() WHERE id = ?", [$transactionId]);
            if ($result) {
                // Refund funds to buyer
                $db->query("
                    INSERT INTO wallet_transactions (user_id, type, amount, description, status, created_at) 
                    VALUES (?, 'refund', ?, 'Escrow refund for pick', 'completed', NOW())
                ", [$transaction['user_id'], $transaction['amount']]);
                
                // Update buyer wallet balance
                $db->query("
                    INSERT INTO user_wallets (user_id, balance) VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE balance = balance + ?
                ", [$transaction['user_id'], $transaction['amount'], $transaction['amount']]);
                
                $success = 'Transaction refunded successfully! Funds returned to buyer.';
                // Refresh the list
                $escrowTransactions = $db->fetchAll("
                    SELECT 
                        et.id,
                        et.user_id,
                        et.accumulator_id,
                        et.amount,
                        et.status,
                        et.created_at,
                        et.settled_at,
                        u.username,
                        u.display_name,
                        at.title as pick_title,
                        at.status as pick_status
                    FROM escrow_transactions et
                    LEFT JOIN users u ON et.user_id = u.id
                    LEFT JOIN accumulator_tickets at ON et.accumulator_id = at.id
                    {$whereClause}
                    ORDER BY et.created_at DESC
                    LIMIT 100
                ");
            } else {
                $error = 'Failed to refund transaction.';
            }
        } catch (Exception $e) {
            $error = 'Error refunding transaction: ' . $e->getMessage();
        }
    }
}

// Safely get wallet balance
$walletBalance = 0.00;
try {
    if (isset($_SESSION['user_id'])) {
        $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$_SESSION['user_id']]);
        $walletBalance = $result ? $result['balance'] : 0.00;
    }
} catch (Exception $e) {
    $walletBalance = 0.00;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Escrow Funds - SmartPicks Pro</title>
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
            background-color: #D32F2F; /* Red */
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
            background-color: #B71C1C; /* Darker Red */
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
            background-color: #D32F2F; /* Red */
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
            color: #D32F2F; /* Red */
        }

        /* Filter Bar */
        .filter-bar {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
            text-align: center;
        }

        .filter-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .filter-btn {
            padding: 10px 20px;
            border: 2px solid #D32F2F;
            background-color: white;
            color: #D32F2F;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            text-decoration: none;
        }

        .filter-btn:hover,
        .filter-btn.active {
            background-color: #D32F2F;
            color: white;
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
            padding: 6px 12px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }

        .btn-primary {
            background-color: #D32F2F; /* Red */
            color: white;
        }

        .btn-primary:hover {
            background-color: #B71C1C; /* Darker Red */
        }

        .btn-success {
            background-color: #4CAF50; /* Green */
            color: white;
        }

        .btn-success:hover {
            background-color: #388E3C; /* Darker Green */
        }

        .btn-danger {
            background-color: #F44336; /* Red */
            color: white;
        }

        .btn-danger:hover {
            background-color: #D32F2F; /* Darker Red */
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

            .filter-buttons {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="logo-text">Admin Panel</div>
            <div class="app-name">SmartPicks Pro</div>
        </div>
        <ul class="sidebar-menu">
            <li><a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="/admin_approve_pick"><i class="fas fa-clock"></i> Pending Approvals</a></li>
            <li><a href="/admin_picks"><i class="fas fa-chart-line"></i> All Picks</a></li>
            <li><a href="/admin_users"><i class="fas fa-users"></i> Users</a></li>
            <li><a href="/admin_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/admin_escrow" class="active"><i class="fas fa-lock"></i> Escrow Funds</a></li>
            <li><a href="/public_chat"><i class="fas fa-comments"></i> Chat Moderation</a></li>
            <li><a href="/admin_verification"><i class="fas fa-check-circle"></i> Verification</a></li>
            <li><a href="/admin_contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/admin_mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/admin_support"><i class="fas fa-headset"></i> Support</a></li>
            <li><a href="/admin_settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Escrow Funds</div>
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
                    <div style="font-size: 12px; color: #666;">Administrator</div>
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
                    <div class="card-title">Pending Escrow</div>
                    <div class="card-value">
                        GHS <?= number_format($totalEscrow, 2) ?>
                        <i class="fas fa-lock"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Pending Transactions</div>
                    <div class="card-value">
                        <?= $pendingCount ?>
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Settled</div>
                    <div class="card-value">
                        GHS <?= number_format($totalSettled, 2) ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Refunded</div>
                    <div class="card-value">
                        GHS <?= number_format($totalRefunded, 2) ?>
                        <i class="fas fa-undo"></i>
                    </div>
                </div>
            </div>

            <div class="filter-bar">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Filter Transactions</h3>
                <div class="filter-buttons">
                    <a href="?filter=all" class="filter-btn <?= $filter === 'all' ? 'active' : '' ?>">
                        <i class="fas fa-list"></i> All
                    </a>
                    <a href="?filter=pending" class="filter-btn <?= $filter === 'pending' ? 'active' : '' ?>">
                        <i class="fas fa-clock"></i> Pending
                    </a>
                    <a href="?filter=settled" class="filter-btn <?= $filter === 'settled' ? 'active' : '' ?>">
                        <i class="fas fa-check-circle"></i> Settled
                    </a>
                    <a href="?filter=refunded" class="filter-btn <?= $filter === 'refunded' ? 'active' : '' ?>">
                        <i class="fas fa-undo"></i> Refunded
                    </a>
                    <a href="?filter=today" class="filter-btn <?= $filter === 'today' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-day"></i> Today
                    </a>
                    <a href="?filter=week" class="filter-btn <?= $filter === 'week' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-week"></i> This Week
                    </a>
                </div>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-lock"></i> Escrow Transactions</h3>
                <?php if (!empty($escrowTransactions)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Buyer</th>
                                <th>Pick</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Settled</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($escrowTransactions as $transaction): ?>
                                <tr>
                                    <td><?= $transaction['id'] ?></td>
                                    <td>
                                        <strong><?= htmlspecialchars($transaction['display_name'] ?? $transaction['username']) ?></strong><br>
                                        <small style="color: #666;">@<?= htmlspecialchars($transaction['username']) ?></small>
                                    </td>
                                    <td>
                                        <strong><?= htmlspecialchars($transaction['pick_title']) ?></strong><br>
                                        <small style="color: #666;">ID: <?= $transaction['accumulator_id'] ?></small>
                                    </td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($transaction['amount'], 2) ?></td>
                                    <td>
                                        <span class="badge <?= $transaction['status'] === 'settled' ? 'badge-success' : ($transaction['status'] === 'pending' ? 'badge-warning' : 'badge-info') ?>">
                                            <?= ucfirst($transaction['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y H:i', strtotime($transaction['created_at'])) ?></td>
                                    <td><?= $transaction['settled_at'] ? date('M j, Y H:i', strtotime($transaction['settled_at'])) : '-' ?></td>
                                    <td>
                                        <?php if ($transaction['status'] === 'pending'): ?>
                                            <div style="display: flex; gap: 5px;">
                                                <button class="btn btn-success" onclick="settleTransaction(<?= $transaction['id'] ?>)">
                                                    <i class="fas fa-check"></i> Settle
                                                </button>
                                                <button class="btn btn-danger" onclick="refundTransaction(<?= $transaction['id'] ?>)">
                                                    <i class="fas fa-undo"></i> Refund
                                                </button>
                                            </div>
                                        <?php else: ?>
                                            <span style="color: #666;">Processed</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-lock" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Escrow Transactions</h4>
                        <p>No escrow transactions match your current filter criteria.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🔒 Escrow Funds Management</h4>
                <p>Manage escrow transactions and ensure proper fund settlement between buyers and tipsters.</p>
                <p><strong>Current Status:</strong> GHS <?= number_format($totalEscrow, 2) ?> pending | <?= $pendingCount ?> transactions | GHS <?= number_format($totalSettled, 2) ?> settled | GHS <?= number_format($totalRefunded, 2) ?> refunded</p>
            </div>
        </div>
    </div>

    <!-- Settlement Modal -->
    <div id="settlementModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Settle Transaction</h3>
            <p>Are you sure you want to settle this transaction? Funds will be transferred to the tipster.</p>
            <form method="post" id="settlementForm">
                <input type="hidden" name="action" value="settle_transaction">
                <input type="hidden" name="transaction_id" id="settlementTransactionId">
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideSettlementModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-success">Settle Transaction</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Refund Modal -->
    <div id="refundModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Refund Transaction</h3>
            <p>Are you sure you want to refund this transaction? Funds will be returned to the buyer.</p>
            <form method="post" id="refundForm">
                <input type="hidden" name="action" value="refund_transaction">
                <input type="hidden" name="transaction_id" id="refundTransactionId">
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideRefundModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-danger">Refund Transaction</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function settleTransaction(transactionId) {
            document.getElementById('settlementTransactionId').value = transactionId;
            document.getElementById('settlementModal').style.display = 'block';
        }

        function hideSettlementModal() {
            document.getElementById('settlementModal').style.display = 'none';
        }

        function refundTransaction(transactionId) {
            document.getElementById('refundTransactionId').value = transactionId;
            document.getElementById('refundModal').style.display = 'block';
        }

        function hideRefundModal() {
            document.getElementById('refundModal').style.display = 'none';
        }

        // Close modals when clicking outside
        document.getElementById('settlementModal').onclick = function(e) {
            if (e.target === this) {
                hideSettlementModal();
            }
        };

        document.getElementById('refundModal').onclick = function(e) {
            if (e.target === this) {
                hideRefundModal();
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
