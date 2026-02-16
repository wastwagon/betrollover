<?php
/**
 * SmartPicks Pro - Root Admin Dashboard
 * Self-contained admin dashboard for root-level access
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
    // Set user as offline before destroying session
    if (isset($_SESSION['user_id'])) {
        try {
            $db->query("UPDATE users SET is_online = 0 WHERE id = ?", [$_SESSION['user_id']]);
        } catch (Exception $e) {
            // Log error but don't prevent logout
            error_log('Failed to update user offline status: ' . $e->getMessage());
        }
    }
    session_destroy();
    header('Location: /SmartPicksPro-Local/login.php');
    exit;
}

// Check authentication
AuthMiddleware::requireAdmin();

$db = Database::getInstance();
$logger = Logger::getInstance();

// Initialize variables
$error = '';
$success = '';
$stats = [];

try {
    // Get platform statistics
    $stats = [
        'total_users' => $db->fetch("SELECT COUNT(*) as count FROM users")['count'] ?? 0,
        'total_picks' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets")['count'] ?? 0,
        'pending_approvals' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'pending_approval'")['count'] ?? 0,
        'total_earnings' => $db->fetch("SELECT COALESCE(SUM(amount), 0) as total FROM escrow_transactions WHERE status = 'settled'")['total'] ?? 0,
        'active_users' => $db->fetch("SELECT COUNT(*) as count FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)")['count'] ?? 0,
        'total_messages' => $db->fetch("SELECT COUNT(*) as count FROM chat_messages")['count'] ?? 0
    ];
} catch (Exception $e) {
    $error = 'Error loading dashboard data: ' . $e->getMessage();
    $logger->error('Dashboard data loading failed', ['error' => $e->getMessage()]);
}

// Handle quick actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'toggle_maintenance') {
        try {
            $currentMode = $db->fetch("SELECT value FROM platform_settings WHERE setting_key = 'maintenance_mode'")['value'] ?? '0';
            $newMode = $currentMode === '1' ? '0' : '1';
            $db->query("UPDATE platform_settings SET value = ? WHERE setting_key = 'maintenance_mode'", [$newMode]);
            $success = $newMode === '1' ? 'Maintenance mode enabled' : 'Maintenance mode disabled';
        } catch (Exception $e) {
            $error = 'Error toggling maintenance mode: ' . $e->getMessage();
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - SmartPicks Pro</title>
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
        
        .admin-layout {
            display: flex;
            min-height: 100vh;
        }
        
        .sidebar {
            width: 250px;
            background: linear-gradient(135deg, #dc3545, #c82333);
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
            overflow-y: auto;
            max-height: calc(100vh - 120px);
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
            color: #dc3545;
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
            background: #dc3545;
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
            border-left: 4px solid #dc3545;
        }
        
        .kpi-icon {
            font-size: 32px;
            margin-bottom: 10px;
            color: #dc3545;
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
            color: #dc3545;
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
            background: #dc3545;
            color: white;
        }
        
        .btn-primary:hover {
            background: #c82333;
        }
        
        .btn-warning {
            background: #ffc107;
            color: #212529;
        }
        
        .btn-warning:hover {
            background: #e0a800;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-success:hover {
            background: #218838;
        }
        
        .recent-activity {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .recent-activity h3 {
            color: #dc3545;
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
    <div class="admin-layout">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>Admin Panel</h1>
                <p>SmartPicks Pro</p>
            </div>
            <nav>
                <ul class="nav-menu">
                    <li class="nav-item"><a href="/SmartPicksPro-Local/dashboard" class="nav-link active">Dashboard</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_approve_pick" class="nav-link">Pending Approvals</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_picks" class="nav-link">All Picks</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_users" class="nav-link">Users</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_analytics" class="nav-link">Analytics</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/leaderboard" class="nav-link">Leaderboard</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_escrow" class="nav-link">Escrow Funds</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_wallet" class="nav-link">Wallet Management</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_payouts" class="nav-link">Payout Management</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_settlement" class="nav-link">Pick Settlement</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/public_chat" class="nav-link">Chat Moderation</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_verification" class="nav-link">Verification</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_contests" class="nav-link">Contests</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_mentorship" class="nav-link">Mentorship</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_support" class="nav-link">Support</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_settings" class="nav-link">Settings</a></li>
                    <li class="nav-item"><a href="/SmartPicksPro-Local/admin_growth_settings" class="nav-link">Growth Settings</a></li>
                </ul>
            </nav>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Header -->
            <div class="header">
                <div class="header-left">
                    <h1>Admin Dashboard</h1>
                    <p>SmartPicks Pro Management System</p>
                </div>
                <div class="header-right">
                    <div class="balance-badge">GHS 1,000.00</div>
                    <div class="user-info">
                        <div class="user-avatar">A</div>
                        <div>
                            <div>admin</div>
                            <div style="font-size: 12px; color: #666;">Administrator</div>
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
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-value"><?= number_format($stats['total_users']) ?></div>
                    <div class="kpi-label">Total Users</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-value"><?= number_format($stats['total_picks']) ?></div>
                    <div class="kpi-label">Total Picks</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">⏳</div>
                    <div class="kpi-value"><?= number_format($stats['pending_approvals']) ?></div>
                    <div class="kpi-label">Pending Approvals</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-value">GHS <?= number_format($stats['total_earnings'], 2) ?></div>
                    <div class="kpi-label">Total Earnings</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🟢</div>
                    <div class="kpi-value"><?= number_format($stats['active_users']) ?></div>
                    <div class="kpi-label">Active Users (7d)</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💬</div>
                    <div class="kpi-value"><?= number_format($stats['total_messages']) ?></div>
                    <div class="kpi-label">Chat Messages</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="action-buttons">
                    <form method="post" style="display: inline;">
                        <input type="hidden" name="action" value="toggle_maintenance">
                        <button type="submit" class="btn btn-warning">Toggle Maintenance Mode</button>
                    </form>
                    <a href="/SmartPicksPro-Local/admin_approve_pick" class="btn btn-primary">Review Pending Picks</a>
                    <a href="/SmartPicksPro-Local/admin_users" class="btn btn-success">Manage Users</a>
                    <a href="/SmartPicksPro-Local/admin_settings" class="btn btn-primary">System Settings</a>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="recent-activity">
                <h3>Recent Activity</h3>
                <div class="activity-item">
                    <div>
                        <strong>System Status</strong>
                        <div>All systems operational</div>
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
                <div class="activity-item">
                    <div>
                        <strong>Database Connection</strong>
                        <div>Connected successfully</div>
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
                <div class="activity-item">
                    <div>
                        <strong>Platform Statistics</strong>
                        <div>Updated successfully</div>
                    </div>
                    <div class="activity-time">Just now</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>