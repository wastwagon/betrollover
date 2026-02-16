<?php
/**
 * SmartPicks Pro - Self-Contained Admin Analytics
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
$timeframe = $_GET['timeframe'] ?? 'week';

try {
    // Get analytics data based on timeframe
    $dateCondition = '';
    switch ($timeframe) {
        case 'day':
            $dateCondition = "DATE(created_at) = CURDATE()";
            break;
        case 'week':
            $dateCondition = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
        case 'month':
            $dateCondition = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            break;
        case 'year':
            $dateCondition = "created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)";
            break;
        default:
            $dateCondition = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    }
    
    // Platform Statistics
    $totalUsers = $db->fetch("SELECT COUNT(*) as count FROM users")['count'] ?? 0;
    $totalPicks = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets")['count'] ?? 0;
    $totalRevenue = $db->fetch("SELECT COALESCE(SUM(price), 0) as total FROM accumulator_tickets WHERE status = 'active'")['total'] ?? 0;
    $activeUsers = $db->fetch("SELECT COUNT(*) as count FROM users WHERE status = 'active'")['count'] ?? 0;
    
    // Time-based Statistics
    $newUsers = $db->fetch("SELECT COUNT(*) as count FROM users WHERE {$dateCondition}")['count'] ?? 0;
    $newPicks = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE {$dateCondition}")['count'] ?? 0;
    $recentRevenue = $db->fetch("SELECT COALESCE(SUM(price), 0) as total FROM accumulator_tickets WHERE status = 'active' AND {$dateCondition}")['total'] ?? 0;
    
    // Top Performers
    $topTipsters = $db->fetchAll("
        SELECT 
            u.username,
            u.display_name,
            COUNT(at.id) as total_picks,
            COUNT(CASE WHEN at.status = 'active' THEN 1 END) as active_picks,
            COALESCE(SUM(at.price), 0) as total_revenue
        FROM users u
        LEFT JOIN accumulator_tickets at ON at.user_id = u.id
        WHERE u.role = 'user'
        GROUP BY u.id
        ORDER BY total_revenue DESC
        LIMIT 10
    ");
    
    // Recent Activity
    $recentPicks = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.status,
            at.price,
            at.created_at,
            u.username
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        ORDER BY at.created_at DESC
        LIMIT 10
    ");
    
    // User Growth Data
    $userGrowth = $db->fetchAll("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as count
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    ");
    
    // Pick Performance Data
    $pickPerformance = $db->fetchAll("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
        FROM accumulator_tickets 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    ");
    
} catch (Exception $e) {
    $error = 'Error loading analytics data: ' . $e->getMessage();
    $logger->error('Analytics data loading failed', ['error' => $e->getMessage()]);
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
    <title>Analytics - SmartPicks Pro</title>
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

        /* Timeframe Filter */
        .timeframe-filter {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
            text-align: center;
        }

        .timeframe-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .timeframe-btn {
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

        .timeframe-btn:hover,
        .timeframe-btn.active {
            background-color: #D32F2F;
            color: white;
        }

        /* KPI Cards */
        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .kpi-card {
            background-color: #fff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 120px;
        }

        .kpi-card .card-title {
            font-size: 15px;
            color: #666;
            margin-bottom: 10px;
        }

        .kpi-card .card-value {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kpi-card .card-value i {
            font-size: 28px;
            color: #D32F2F; /* Red */
        }

        .kpi-card .card-change {
            font-size: 14px;
            color: #28a745;
            margin-top: 5px;
        }

        /* Charts Container */
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .chart-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        .chart-card h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
        }

        /* Tables */
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

        /* Simple Chart Bars */
        .chart-bar {
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            margin: 5px 0;
            position: relative;
            overflow: hidden;
        }

        .chart-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #D32F2F, #FF5722);
            border-radius: 10px;
            transition: width 0.3s ease;
        }

        .chart-bar-label {
            position: absolute;
            top: 50%;
            left: 10px;
            transform: translateY(-50%);
            font-size: 12px;
            font-weight: 600;
            color: #333;
        }

        .chart-bar-value {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            font-size: 12px;
            font-weight: bold;
            color: #333;
        }

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

            .charts-container {
                grid-template-columns: 1fr;
            }

            .timeframe-buttons {
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
            <li><a href="/admin_analytics" class="active"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/admin_escrow"><i class="fas fa-lock"></i> Escrow Funds</a></li>
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
                <div class="page-title">Analytics Dashboard</div>
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

            <div class="timeframe-filter">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Analytics Timeframe</h3>
                <div class="timeframe-buttons">
                    <a href="?timeframe=day" class="timeframe-btn <?= $timeframe === 'day' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-day"></i> Today
                    </a>
                    <a href="?timeframe=week" class="timeframe-btn <?= $timeframe === 'week' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-week"></i> This Week
                    </a>
                    <a href="?timeframe=month" class="timeframe-btn <?= $timeframe === 'month' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-alt"></i> This Month
                    </a>
                    <a href="?timeframe=year" class="timeframe-btn <?= $timeframe === 'year' ? 'active' : '' ?>">
                        <i class="fas fa-calendar"></i> This Year
                    </a>
                </div>
            </div>

            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="card-title">Total Users</div>
                    <div class="card-value">
                        <?= number_format($totalUsers) ?>
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="card-change">+<?= $newUsers ?> this <?= $timeframe ?></div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Picks</div>
                    <div class="card-value">
                        <?= number_format($totalPicks) ?>
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="card-change">+<?= $newPicks ?> this <?= $timeframe ?></div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Revenue</div>
                    <div class="card-value">
                        GHS <?= number_format($totalRevenue, 2) ?>
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="card-change">GHS <?= number_format($recentRevenue, 2) ?> this <?= $timeframe ?></div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Active Users</div>
                    <div class="card-value">
                        <?= number_format($activeUsers) ?>
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div class="card-change"><?= round(($activeUsers / max($totalUsers, 1)) * 100, 1) ?>% of total</div>
                </div>
            </div>

            <div class="charts-container">
                <div class="chart-card">
                    <h3><i class="fas fa-chart-line"></i> User Growth</h3>
                    <?php if (!empty($userGrowth)): ?>
                        <?php 
                        $maxUsers = max(array_column($userGrowth, 'count'));
                        foreach (array_slice($userGrowth, 0, 7) as $day): 
                            $percentage = ($day['count'] / max($maxUsers, 1)) * 100;
                        ?>
                            <div class="chart-bar">
                                <div class="chart-bar-fill" style="width: <?= $percentage ?>%"></div>
                                <div class="chart-bar-label"><?= date('M j', strtotime($day['date'])) ?></div>
                                <div class="chart-bar-value"><?= $day['count'] ?></div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <p style="text-align: center; color: #666; padding: 20px;">No user growth data available</p>
                    <?php endif; ?>
                </div>

                <div class="chart-card">
                    <h3><i class="fas fa-chart-bar"></i> Pick Performance</h3>
                    <?php if (!empty($pickPerformance)): ?>
                        <?php 
                        $maxPicks = max(array_column($pickPerformance, 'total'));
                        foreach (array_slice($pickPerformance, 0, 7) as $day): 
                            $percentage = ($day['total'] / max($maxPicks, 1)) * 100;
                        ?>
                            <div class="chart-bar">
                                <div class="chart-bar-fill" style="width: <?= $percentage ?>%"></div>
                                <div class="chart-bar-label"><?= date('M j', strtotime($day['date'])) ?></div>
                                <div class="chart-bar-value"><?= $day['total'] ?> (<?= $day['active'] ?> active)</div>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <p style="text-align: center; color: #666; padding: 20px;">No pick performance data available</p>
                    <?php endif; ?>
                </div>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-trophy"></i> Top Performing Tipsters</h3>
                <?php if (!empty($topTipsters)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Tipster</th>
                                <th>Total Picks</th>
                                <th>Active Picks</th>
                                <th>Total Revenue</th>
                                <th>Success Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($topTipsters as $index => $tipster): ?>
                                <tr>
                                    <td>
                                        <span class="badge <?= $index < 3 ? 'badge-danger' : 'badge-info' ?>">
                                            #<?= $index + 1 ?>
                                        </span>
                                    </td>
                                    <td>
                                        <strong><?= htmlspecialchars($tipster['display_name'] ?? $tipster['username']) ?></strong><br>
                                        <small style="color: #666;">@<?= htmlspecialchars($tipster['username']) ?></small>
                                    </td>
                                    <td><?= $tipster['total_picks'] ?></td>
                                    <td><?= $tipster['active_picks'] ?></td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($tipster['total_revenue'], 2) ?></td>
                                    <td><?= $tipster['total_picks'] > 0 ? round(($tipster['active_picks'] / $tipster['total_picks']) * 100, 1) : 0 ?>%</td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-chart-bar" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Tipster Data</h4>
                        <p>No tipster performance data available.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-clock"></i> Recent Activity</h3>
                <?php if (!empty($recentPicks)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Pick</th>
                                <th>Tipster</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recentPicks as $pick): ?>
                                <tr>
                                    <td>
                                        <strong><?= htmlspecialchars($pick['title']) ?></strong><br>
                                        <small style="color: #666;">ID: <?= $pick['id'] ?></small>
                                    </td>
                                    <td><?= htmlspecialchars($pick['username']) ?></td>
                                    <td>
                                        <span class="badge <?= $pick['status'] === 'active' ? 'badge-success' : ($pick['status'] === 'pending' ? 'badge-warning' : 'badge-info') ?>">
                                            <?= ucfirst($pick['status']) ?>
                                        </span>
                                    </td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($pick['price'], 2) ?></td>
                                    <td><?= date('M j, Y H:i', strtotime($pick['created_at'])) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-clock" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Recent Activity</h4>
                        <p>No recent pick activity to display.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>📊 Analytics Dashboard</h4>
                <p>Comprehensive platform analytics and performance metrics for data-driven decision making.</p>
                <p><strong>Current Period:</strong> <?= ucfirst($timeframe) ?> | <strong>Total Users:</strong> <?= number_format($totalUsers) ?> | <strong>Total Revenue:</strong> GHS <?= number_format($totalRevenue, 2) ?></p>
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

        // Animate chart bars on load
        document.addEventListener('DOMContentLoaded', function() {
            const chartBars = document.querySelectorAll('.chart-bar-fill');
            chartBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        });
    </script>
</body>
</html>
