<?php
/**
 * SmartPicks Pro - Self-Contained Leaderboard
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/LeaderboardService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();
$leaderboardService = LeaderboardService::getInstance();

$error = '';
$success = '';
$leaderboard = [];
$timeframe = $_GET['timeframe'] ?? 'all';
$userRank = 0;

try {
    $userId = $_SESSION['user_id'];
    
    // Get leaderboard data based on timeframe
    switch ($timeframe) {
        case 'week':
            $leaderboard = $leaderboardService->getWeeklyLeaderboard();
            break;
        case 'month':
            $leaderboard = $leaderboardService->getMonthlyLeaderboard();
            break;
        case 'year':
            $leaderboard = $leaderboardService->getYearlyLeaderboard();
            break;
        default:
            $leaderboard = $leaderboardService->getAllTimeLeaderboard();
            break;
    }
    
    // Find user's rank
    foreach ($leaderboard as $index => $user) {
        if ($user['user_id'] == $userId) {
            $userRank = $index + 1;
            break;
        }
    }
    
} catch (Exception $e) {
    $error = 'Error loading leaderboard data: ' . $e->getMessage();
    $logger->error('Leaderboard loading failed', ['error' => $e->getMessage()]);
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
    <title>Leaderboard - SmartPicks Pro</title>
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
            border: 2px solid #28a745;
            background-color: white;
            color: #28a745;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            text-decoration: none;
        }

        .timeframe-btn:hover,
        .timeframe-btn.active {
            background-color: #28a745;
            color: white;
        }

        /* User Rank Card */
        .user-rank-card {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 8px 16px rgba(40, 167, 69, 0.3);
        }

        .user-rank-card h2 {
            margin: 0 0 15px 0;
            font-size: 20px;
            font-weight: 600;
        }

        .user-rank-card .rank-number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .user-rank-card .rank-label {
            font-size: 16px;
            opacity: 0.9;
        }

        /* Leaderboard Table */
        .leaderboard-container {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }

        .leaderboard-container h3 {
            font-size: 18px;
            color: #333;
            margin-top: 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .leaderboard-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .leaderboard-table th, .leaderboard-table td {
            border: 1px solid #eee;
            padding: 15px;
            text-align: left;
            font-size: 14px;
        }

        .leaderboard-table th {
            background-color: #f8f8f8;
            font-weight: 600;
            color: #555;
        }

        .leaderboard-table tr:nth-child(even) {
            background-color: #fdfdfd;
        }

        .leaderboard-table tr:hover {
            background-color: #f0f0f0;
        }

        .leaderboard-table tr.current-user {
            background-color: #e8f5e9;
            border: 2px solid #28a745;
        }

        /* Rank Badges */
        .rank-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            font-weight: bold;
            font-size: 14px;
            color: white;
        }

        .rank-1 { background-color: #FFD700; } /* Gold */
        .rank-2 { background-color: #C0C0C0; } /* Silver */
        .rank-3 { background-color: #CD7F32; } /* Bronze */
        .rank-other { background-color: #6c757d; } /* Gray */

        /* User Avatar */
        .user-avatar-small {
            width: 35px;
            height: 35px;
            background-color: #28a745;
            color: white;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 10px;
        }

        /* Stats Cards */
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            text-align: center;
        }

        .stat-card .stat-icon {
            font-size: 32px;
            color: #28a745;
            margin-bottom: 10px;
        }

        .stat-card .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .stat-card .stat-label {
            font-size: 14px;
            color: #666;
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

            .stats-cards {
                grid-template-columns: 1fr;
            }

            .timeframe-buttons {
                flex-direction: column;
                align-items: center;
            }

            .leaderboard-table th, .leaderboard-table td {
                padding: 10px 8px;
                font-size: 12px;
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
            <li><a href="/leaderboard" class="active"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/marketplace"><i class="fas fa-store"></i> Marketplace</a></li>
            <li><a href="/my_purchases"><i class="fas fa-shopping-bag"></i> My Purchases</a></li>
            <li><a href="/public_chat"><i class="fas fa-comments"></i> Chat</a></li>
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
                <div class="page-title">Leaderboard</div>
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

            <div class="timeframe-filter">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Leaderboard Timeframe</h3>
                <div class="timeframe-buttons">
                    <a href="?timeframe=all" class="timeframe-btn <?= $timeframe === 'all' ? 'active' : '' ?>">
                        <i class="fas fa-trophy"></i> All Time
                    </a>
                    <a href="?timeframe=year" class="timeframe-btn <?= $timeframe === 'year' ? 'active' : '' ?>">
                        <i class="fas fa-calendar"></i> This Year
                    </a>
                    <a href="?timeframe=month" class="timeframe-btn <?= $timeframe === 'month' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-alt"></i> This Month
                    </a>
                    <a href="?timeframe=week" class="timeframe-btn <?= $timeframe === 'week' ? 'active' : '' ?>">
                        <i class="fas fa-calendar-week"></i> This Week
                    </a>
                </div>
            </div>

            <?php if ($userRank > 0): ?>
                <div class="user-rank-card">
                    <h2>Your Current Rank</h2>
                    <div class="rank-number">#<?= $userRank ?></div>
                    <div class="rank-label">
                        <?php
                        $rankLabel = '';
                        switch ($timeframe) {
                            case 'week': $rankLabel = 'This Week'; break;
                            case 'month': $rankLabel = 'This Month'; break;
                            case 'year': $rankLabel = 'This Year'; break;
                            default: $rankLabel = 'All Time'; break;
                        }
                        echo $rankLabel;
                        ?>
                    </div>
                </div>
            <?php endif; ?>

            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-value"><?= count($leaderboard) ?></div>
                    <div class="stat-label">Total Tipsters</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-value"><?= count($leaderboard) > 0 ? number_format($leaderboard[0]['win_rate'] ?? 0, 1) : '0' ?>%</div>
                    <div class="stat-label">Top Win Rate</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="stat-value"><?= count($leaderboard) > 0 ? $leaderboard[0]['total_wins'] ?? 0 : 0 ?></div>
                    <div class="stat-label">Most Wins</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-value">GHS <?= count($leaderboard) > 0 ? number_format($leaderboard[0]['total_earnings'] ?? 0, 2) : '0.00' ?></div>
                    <div class="stat-label">Top Earnings</div>
                </div>
            </div>

            <div class="leaderboard-container">
                <h3><i class="fas fa-trophy"></i> 
                    <?php
                    $title = '';
                    switch ($timeframe) {
                        case 'week': $title = 'Weekly Leaderboard'; break;
                        case 'month': $title = 'Monthly Leaderboard'; break;
                        case 'year': $title = 'Yearly Leaderboard'; break;
                        default: $title = 'All-Time Leaderboard'; break;
                    }
                    echo $title;
                    ?>
                </h3>
                <?php if (!empty($leaderboard)): ?>
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Tipster</th>
                                <th>Wins</th>
                                <th>Losses</th>
                                <th>Win Rate</th>
                                <th>Total Earnings</th>
                                <th>Avg Odds</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($leaderboard as $index => $user): ?>
                                <tr <?= $user['user_id'] == $_SESSION['user_id'] ? 'class="current-user"' : '' ?>>
                                    <td>
                                        <?php
                                        $rank = $index + 1;
                                        $rankClass = '';
                                        if ($rank <= 3) {
                                            $rankClass = "rank-{$rank}";
                                        } else {
                                            $rankClass = 'rank-other';
                                        }
                                        ?>
                                        <span class="rank-badge <?= $rankClass ?>"><?= $rank ?></span>
                                    </td>
                                    <td>
                                        <div style="display: flex; align-items: center;">
                                            <div class="user-avatar-small">
                                                <?= strtoupper(substr($user['username'], 0, 1)) ?>
                                            </div>
                                            <div>
                                                <div style="font-weight: 600;"><?= htmlspecialchars($user['display_name'] ?? $user['username']) ?></div>
                                                <div style="font-size: 12px; color: #666;">@<?= htmlspecialchars($user['username']) ?></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="color: #28a745; font-weight: bold;"><?= $user['total_wins'] ?? 0 ?></td>
                                    <td style="color: #dc3545; font-weight: bold;"><?= $user['total_losses'] ?? 0 ?></td>
                                    <td style="font-weight: bold;"><?= number_format($user['win_rate'] ?? 0, 1) ?>%</td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($user['total_earnings'] ?? 0, 2) ?></td>
                                    <td><?= number_format($user['avg_odds'] ?? 0, 2) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-trophy" style="font-size: 48px; color: #28a745; margin-bottom: 15px;"></i>
                        <h4>No Leaderboard Data</h4>
                        <p>No tipster data available for the selected timeframe.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🏆 Leaderboard</h4>
                <p>Compete with other tipsters and climb the rankings based on your performance.</p>
                <p><strong>Current Rankings:</strong> <?= count($leaderboard) ?> tipsters | <strong>Your Rank:</strong> #<?= $userRank ?: 'Unranked' ?> | <strong>Timeframe:</strong> <?= ucfirst($timeframe) ?></p>
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
    </script>
</body>
</html>
