<?php
/**
 * SmartPicks Pro - Self-Contained User My Picks
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
$myPicks = [];
$filter = $_GET['filter'] ?? 'all';

try {
    // Build query based on filter
    $whereClause = "WHERE at.user_id = ?";
    $params = [$_SESSION['user_id']];
    
    switch ($filter) {
        case 'pending':
            $whereClause .= " AND at.status = 'pending'";
            break;
        case 'active':
            $whereClause .= " AND at.status = 'active'";
            break;
        case 'rejected':
            $whereClause .= " AND at.status = 'rejected'";
            break;
        case 'settled':
            $whereClause .= " AND at.status = 'settled'";
            break;
    }
    
    // Get user's picks
    $myPicks = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.description,
            at.sport,
            at.total_odds,
            at.price,
            at.status,
            at.created_at,
            at.updated_at,
            COUNT(upp.id) as purchase_count,
            COALESCE(SUM(upp.purchase_price), 0) as total_revenue
        FROM accumulator_tickets at
        LEFT JOIN user_purchased_picks upp ON upp.accumulator_id = at.id
        {$whereClause}
        GROUP BY at.id
        ORDER BY at.created_at DESC
        LIMIT 50
    ", $params);
    
} catch (Exception $e) {
    $error = 'Error loading your picks: ' . $e->getMessage();
    $logger->error('User picks loading failed', ['error' => $e->getMessage()]);
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
    <title>My Picks - SmartPicks Pro</title>
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
            <li><a href="/my_picks" class="active"><i class="fas fa-chart-line"></i> My Picks</a></li>
            <li><a href="/user_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/marketplace"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
            <li><a href="/my_purchases"><i class="fas fa-shopping-cart"></i> My Purchases</a></li>
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
                <div class="page-title">My Picks</div>
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
                    <div class="card-title">Total Picks</div>
                    <div class="card-value">
                        <?= count($myPicks) ?>
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Active Picks</div>
                    <div class="card-value">
                        <?= count(array_filter($myPicks, function($pick) { return $pick['status'] === 'active'; })) ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Revenue</div>
                    <div class="card-value">
                        GHS <?= number_format(array_sum(array_column($myPicks, 'total_revenue')), 2) ?>
                        <i class="fas fa-coins"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Purchases</div>
                    <div class="card-value">
                        <?= array_sum(array_column($myPicks, 'purchase_count')) ?>
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                </div>
            </div>

            <div class="filter-bar">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Filter Your Picks</h3>
                <div class="filter-buttons">
                    <a href="?filter=all" class="filter-btn <?= $filter === 'all' ? 'active' : '' ?>">
                        <i class="fas fa-list"></i> All Picks
                    </a>
                    <a href="?filter=pending" class="filter-btn <?= $filter === 'pending' ? 'active' : '' ?>">
                        <i class="fas fa-clock"></i> Pending
                    </a>
                    <a href="?filter=active" class="filter-btn <?= $filter === 'active' ? 'active' : '' ?>">
                        <i class="fas fa-check-circle"></i> Active
                    </a>
                    <a href="?filter=settled" class="filter-btn <?= $filter === 'settled' ? 'active' : '' ?>">
                        <i class="fas fa-check"></i> Settled
                    </a>
                    <a href="?filter=rejected" class="filter-btn <?= $filter === 'rejected' ? 'active' : '' ?>">
                        <i class="fas fa-times"></i> Rejected
                    </a>
                </div>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-chart-line"></i> Your Picks</h3>
                <?php if (!empty($myPicks)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Sport</th>
                                <th>Odds</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Purchases</th>
                                <th>Revenue</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($myPicks as $pick): ?>
                                <tr>
                                    <td>
                                        <strong><?= htmlspecialchars($pick['title']) ?></strong><br>
                                        <small style="color: #666;"><?= htmlspecialchars(substr($pick['description'], 0, 50)) ?>...</small>
                                    </td>
                                    <td><?= htmlspecialchars($pick['sport']) ?></td>
                                    <td style="font-weight: bold; color: #2E7D32;"><?= number_format($pick['total_odds'], 2) ?></td>
                                    <td>GHS <?= number_format($pick['price'], 2) ?></td>
                                    <td>
                                        <span class="badge <?= $pick['status'] === 'active' ? 'badge-success' : ($pick['status'] === 'pending' ? 'badge-warning' : ($pick['status'] === 'rejected' ? 'badge-danger' : 'badge-info')) ?>">
                                            <?= ucfirst($pick['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= $pick['purchase_count'] ?></td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($pick['total_revenue'], 2) ?></td>
                                    <td><?= date('M j, Y', strtotime($pick['created_at'])) ?></td>
                                    <td>
                                        <div style="display: flex; gap: 5px;">
                                            <button class="btn btn-info" onclick="viewPick(<?= $pick['id'] ?>)">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <?php if ($pick['status'] === 'pending'): ?>
                                                <button class="btn btn-primary" onclick="editPick(<?= $pick['id'] ?>)">
                                                    <i class="fas fa-edit"></i> Edit
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
                        <i class="fas fa-chart-line" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Picks Found</h4>
                        <p>You haven't created any picks yet, or no picks match your current filter.</p>
                        <a href="/create_pick" class="btn btn-primary" style="margin-top: 15px;">
                            <i class="fas fa-plus"></i> Create Your First Pick
                        </a>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>📊 My Picks Management</h4>
                <p>Track and manage all your created picks. Monitor performance, purchases, and earnings.</p>
                <p><strong>Current Status:</strong> <?= count($myPicks) ?> total picks | <?= count(array_filter($myPicks, function($pick) { return $pick['status'] === 'active'; })) ?> active | GHS <?= number_format(array_sum(array_column($myPicks, 'total_revenue')), 2) ?> total revenue</p>
            </div>
        </div>
    </div>

    <script>
        function viewPick(pickId) {
            alert('View pick feature coming soon! Pick ID: ' + pickId);
        }

        function editPick(pickId) {
            alert('Edit pick feature coming soon! Pick ID: ' + pickId);
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
