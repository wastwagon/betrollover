<?php
/**
 * SmartPicks Pro - Self-Contained User My Purchases
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
$myPurchases = [];
$filter = $_GET['filter'] ?? 'all';

try {
    // Build query based on filter
    $whereClause = "WHERE upp.user_id = ?";
    $params = [$_SESSION['user_id']];
    
    switch ($filter) {
        case 'active':
            $whereClause .= " AND at.status = 'active'";
            break;
        case 'settled':
            $whereClause .= " AND at.status = 'settled'";
            break;
        case 'refunded':
            $whereClause .= " AND upp.status = 'refunded'";
            break;
        case 'today':
            $whereClause .= " AND DATE(upp.created_at) = CURDATE()";
            break;
        case 'week':
            $whereClause .= " AND upp.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
    }
    
    // Get user's purchases
    $myPurchases = $db->fetchAll("
        SELECT 
            upp.id,
            upp.purchase_price,
            upp.status as purchase_status,
            upp.created_at as purchase_date,
            at.id as pick_id,
            at.title,
            at.description,
            at.sport,
            at.total_odds,
            at.price,
            at.status as pick_status,
            u.username as tipster_username,
            u.display_name as tipster_display_name
        FROM user_purchased_picks upp
        LEFT JOIN accumulator_tickets at ON upp.accumulator_id = at.id
        LEFT JOIN users u ON at.user_id = u.id
        {$whereClause}
        ORDER BY upp.created_at DESC
        LIMIT 50
    ", $params);
    
} catch (Exception $e) {
    $error = 'Error loading your purchases: ' . $e->getMessage();
    $logger->error('User purchases loading failed', ['error' => $e->getMessage()]);
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
    <title>My Purchases - SmartPicks Pro</title>
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
            border: 2px solid #2E7D32;
            background-color: white;
            color: #2E7D32;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            text-decoration: none;
        }

        .filter-btn:hover,
        .filter-btn.active {
            background-color: #2E7D32;
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

        .alert.alert-error {
            background-color: #FFEBEE; /* Light Red */
            color: #C62828; /* Dark Red */
            border: 1px solid #EF9A9A;
        }

        /* Buttons */
        .btn {
            padding: 8px 16px;
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
            background-color: #2E7D32; /* Green */
            color: white;
        }

        .btn-primary:hover {
            background-color: #1B5E20; /* Darker Green */
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
            <li><a href="/my_purchases" class="active"><i class="fas fa-shopping-cart"></i> My Purchases</a></li>
            <li><a href="/chat"><i class="fas fa-comments"></i> Chat</a></li>
            <li><a href="/contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/wallet"><i class="fas fa-wallet"></i> Wallet</a></li>
            <li><a href="/payouts"><i class="fas fa-money-bill-wave"></i> Payouts</a></li>
            <li><a href="/profile"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">My Purchases</div>
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

            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="card-title">Total Purchases</div>
                    <div class="card-value">
                        <?= count($myPurchases) ?>
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Spent</div>
                    <div class="card-value">
                        GHS <?= number_format(array_sum(array_column($myPurchases, 'amount')), 2) ?>
                        <i class="fas fa-coins"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Active Picks</div>
                    <div class="card-value">
                        <?= count(array_filter($myPurchases, function($purchase) { return $purchase['pick_status'] === 'active'; })) ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Settled Picks</div>
                    <div class="card-value">
                        <?= count(array_filter($myPurchases, function($purchase) { return $purchase['pick_status'] === 'settled'; })) ?>
                        <i class="fas fa-check"></i>
                    </div>
                </div>
            </div>

            <div class="filter-bar">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Filter Your Purchases</h3>
                <div class="filter-buttons">
                    <a href="?filter=all" class="filter-btn <?= $filter === 'all' ? 'active' : '' ?>">
                        <i class="fas fa-list"></i> All Purchases
                    </a>
                    <a href="?filter=active" class="filter-btn <?= $filter === 'active' ? 'active' : '' ?>">
                        <i class="fas fa-check-circle"></i> Active
                    </a>
                    <a href="?filter=settled" class="filter-btn <?= $filter === 'settled' ? 'active' : '' ?>">
                        <i class="fas fa-check"></i> Settled
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
                <h3><i class="fas fa-shopping-cart"></i> Your Purchases</h3>
                <?php if (!empty($myPurchases)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Pick</th>
                                <th>Tipster</th>
                                <th>Sport</th>
                                <th>Odds</th>
                                <th>Amount</th>
                                <th>Pick Status</th>
                                <th>Purchase Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($myPurchases as $purchase): ?>
                                <tr>
                                    <td>
                                        <strong><?= htmlspecialchars($purchase['title']) ?></strong><br>
                                        <small style="color: #666;"><?= htmlspecialchars(substr($purchase['description'], 0, 50)) ?>...</small>
                                    </td>
                                    <td>
                                        <strong><?= htmlspecialchars($purchase['tipster_display_name'] ?? $purchase['tipster_username']) ?></strong><br>
                                        <small style="color: #666;">@<?= htmlspecialchars($purchase['tipster_username']) ?></small>
                                    </td>
                                    <td><?= htmlspecialchars($purchase['sport']) ?></td>
                                    <td style="font-weight: bold; color: #2E7D32;"><?= number_format($purchase['total_odds'], 2) ?></td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($purchase['amount'], 2) ?></td>
                                    <td>
                                        <span class="badge <?= $purchase['pick_status'] === 'active' ? 'badge-success' : ($purchase['pick_status'] === 'settled' ? 'badge-info' : ($purchase['pick_status'] === 'pending' ? 'badge-warning' : 'badge-secondary')) ?>">
                                            <?= ucfirst($purchase['pick_status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y H:i', strtotime($purchase['purchase_date'])) ?></td>
                                    <td>
                                        <div style="display: flex; gap: 5px;">
                                            <button class="btn btn-info" onclick="viewPick(<?= $purchase['pick_id'] ?>)">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <?php if ($purchase['pick_status'] === 'settled'): ?>
                                                <button class="btn btn-primary" onclick="ratePick(<?= $purchase['pick_id'] ?>)">
                                                    <i class="fas fa-star"></i> Rate
                                                </button>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-shopping-cart" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Purchases Found</h4>
                        <p>You haven't purchased any picks yet, or no purchases match your current filter.</p>
                        <a href="/marketplace" class="btn btn-primary" style="margin-top: 15px;">
                            <i class="fas fa-shopping-bag"></i> Browse Marketplace
                        </a>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🛒 Purchase History</h4>
                <p>Track all your purchased picks and their performance. Rate successful picks to help other users.</p>
                <p><strong>Current Status:</strong> <?= count($myPurchases) ?> total purchases | GHS <?= number_format(array_sum(array_column($myPurchases, 'amount')), 2) ?> total spent | <?= count(array_filter($myPurchases, function($purchase) { return $purchase['pick_status'] === 'active'; })) ?> active picks</p>
            </div>
        </div>
    </div>

    <script>
        function viewPick(pickId) {
            alert('View pick feature coming soon! Pick ID: ' + pickId);
        }

        function ratePick(pickId) {
            alert('Rate pick feature coming soon! Pick ID: ' + pickId);
        }

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
