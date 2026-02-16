<?php
/**
 * SmartPicks Pro - Root User Dashboard
 * Self-contained user dashboard for root-level access
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    // Set session cookie parameters BEFORE starting session
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
    $cookiePath = $isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false ? '/SmartPicksPro-Local/' : '/';
    $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    
    session_set_cookie_params([
        'path' => $cookiePath,
        'httponly' => true,
        'secure' => $isSecure,
        'samesite' => 'Lax'
    ]);
    
    session_start();
}

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    header('Location: /SmartPicksPro-Local/login.php');
    exit;
}

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();

$userId = AuthMiddleware::getUserId();

// Initialize variables
$error = '';
$success = '';
$stats = [];

try {
    // Get user statistics
    $stats = [
        'total_picks' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE user_id = ?", [$userId])['count'] ?? 0,
        'won_picks' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE user_id = ? AND result = 'won'", [$userId])['count'] ?? 0,
        'pending_picks' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE user_id = ? AND status = 'pending'", [$userId])['count'] ?? 0,
        'total_earnings' => $db->fetch("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_transactions WHERE user_id = ? AND status = 'settled'", [$userId])['total'] ?? 0,
        'wallet_balance' => $db->fetch("SELECT COALESCE(balance, 0) as balance FROM user_wallets WHERE user_id = ?", [$userId])['balance'] ?? 0,
        'total_purchases' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE buyer_id = ?", [$userId])['count'] ?? 0
    ];
    
    // Calculate win rate
    $stats['win_rate'] = $stats['total_picks'] > 0 ? round(($stats['won_picks'] / $stats['total_picks']) * 100, 1) : 0;
    
} catch (Exception $e) {
    $error = 'Error loading dashboard data: ' . $e->getMessage();
    $logger->error('User dashboard data loading failed', ['error' => $e->getMessage()]);
}

// Get user info
$user = $db->fetch("SELECT username, display_name, email, role FROM users WHERE id = ?", [$userId]);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Dashboard - SmartPicks Pro</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
            color: #333;
        }
        
        .user-layout {
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 250px;
            background: linear-gradient(135deg, #28a745, #218838);
            color: white;
            padding: 20px 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 0 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }
        
        .sidebar-header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .sidebar-header p {
            font-size: 14px;
            opacity: 0.8;
        }
        
        .nav-menu {
            list-style: none;
        }
        
        .nav-item {
            margin-bottom: 5px;
        }
        
        .nav-link {
            display: block;
            padding: 12px 20px;
            color: white;
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }
        
        .nav-link:hover {
            background-color: rgba(255,255,255,0.1);
            border-left-color: white;
        }
        
        .nav-link.active {
            background-color: rgba(255,255,255,0.2);
            border-left-color: white;
        }
        
        .main-content {
            flex: 1;
            margin-left: 250px;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-left h1 {
            color: #28a745;
            margin-bottom: 5px;
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .balance-badge {
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            background: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            border: 1px solid transparent;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
        }
        
        .alert-success {
            background-color: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        
        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 4px solid #28a745;
        }
        
        .kpi-icon {
            font-size: 32px;
            margin-bottom: 10px;
            color: #28a745;
        }
        
        .kpi-value {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .kpi-label {
            color: #666;
            font-size: 14px;
        }
        
        .quick-actions {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .quick-actions h3 {
            color: #28a745;
            margin-bottom: 15px;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: #28a745;
            color: white;
        }
        
        .btn-primary:hover {
            background: #218838;
        }
        
        .btn-success {
            background: #17a2b8;
            color: white;
        }
        
        .btn-success:hover {
            background: #138496;
        }
        
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .btn-warning:hover {
            background: #e0a800;
        }
        
        .recent-activity {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .recent-activity h3 {
            color: #28a745;
            margin-bottom: 15px;
        }
        
        .activity-item {
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-time {
            font-size: 12px;
            color: #666;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                height: auto;
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .kpi-cards {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .action-buttons {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="user-layout">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>User Panel</h1>
                <p>SmartPicks Pro</p>
            </div>
            <nav>
                <ul class="nav-menu">
                    <li class="nav-item"><a href="/SmartPicksPro-Local/dashboard" class="nav-link active">Dashboard</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/marketplace" class="nav-link">Marketplace</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/create_pick" class="nav-link">Create Pick</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/my_picks" class="nav-link">My Picks</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/wallet" class="nav-link">Wallet</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/leaderboard" class="nav-link">Leaderboard</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/my_purchases" class="nav-link">My Purchases</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/chat" class="nav-link">Chat</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/contests" class="nav-link">Contests</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/mentorship" class="nav-link">Mentorship</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/payouts" class="nav-link">Payouts</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/profile" class="nav-link">Profile</a></li>
                    <li class="nav-item"><a href="/settings" class="nav-link">Settings</a></li>
                </ul>
            </nav>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Header -->
            <div class="header">
                <div class="header-left">
                    <h1>User Dashboard</h1>
                    <p>Welcome back, <?= htmlspecialchars($user['display_name'] ?: $user['username']) ?>!</p>
                </div>
                <div class="header-right">
                    <div class="balance-badge">GHS <?= number_format($stats['wallet_balance'], 2) ?></div>
                    <div class="user-info">
                        <div class="user-avatar"><?= strtoupper(substr($user['username'], 0, 1)) ?></div>
                        <div>
                            <div><?= htmlspecialchars($user['username']) ?></div>
                            <div style="font-size: 12px; color: #666;"><?= ucfirst($user['role']) ?></div>
                        </div>
                    </div>
                    <a href="?action=logout" class="btn btn-primary" style="margin-left: 15px;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>

            <!-- Error/Success Messages -->
            <?php if ($error): ?>
                <div class="alert alert-danger">
                    <strong>Error</strong> <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <strong>Success</strong> <?= htmlspecialchars($success) ?>
                </div>
            <?php endif; ?>

            <!-- KPI Cards -->
            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-value"><?= number_format($stats['total_picks']) ?></div>
                    <div class="kpi-label">Total Picks</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🏆</div>
                    <div class="kpi-value"><?= number_format($stats['won_picks']) ?></div>
                    <div class="kpi-label">Won Picks</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-value"><?= $stats['win_rate'] ?>%</div>
                    <div class="kpi-label">Win Rate</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-value">GHS <?= number_format($stats['total_earnings'], 2) ?></div>
                    <div class="kpi-label">Total Earnings</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">⏳</div>
                    <div class="kpi-value"><?= number_format($stats['pending_picks']) ?></div>
                    <div class="kpi-label">Pending Picks</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🛒</div>
                    <div class="kpi-value"><?= number_format($stats['total_purchases']) ?></div>
                    <div class="kpi-label">Purchases</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <a href="/SmartPicksPro-Local/create_pick" class="btn btn-primary">Create New Pick</a>
                    <a href="/SmartPicksPro-Local/marketplace" class="btn btn-success">Browse Marketplace</a>
                    <a href="/SmartPicksPro-Local/wallet" class="btn btn-warning">Manage Wallet</a>
                    <a href="/SmartPicksPro-Local/profile" class="btn btn-primary">Update Profile</a>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="recent-activity">
                <h3>Recent Activity</h3>
                <div class="activity-item">
                    <div>
                        <strong>Dashboard Loaded</strong>
                        <div>Welcome to your SmartPicks Pro dashboard</div>
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
                <div class="activity-item">
                    <div>
                        <strong>Statistics Updated</strong>
                        <div>Your performance metrics are current</div>
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
                <div class="activity-item">
                    <div>
                        <strong>Account Status</strong>
                        <div>Account active and verified</div>
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>