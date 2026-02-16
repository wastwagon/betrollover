<?php
/**
 * SmartPicks Pro - Self-Contained Admin Users
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
$users = [];
$filter = $_GET['filter'] ?? 'all';
$search = $_GET['search'] ?? '';

try {
    // Build query based on filter and search
    $whereClause = '';
    $params = [];
    
    if ($search) {
        $whereClause = "WHERE (username LIKE ? OR email LIKE ? OR display_name LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    }
    
    switch ($filter) {
        case 'admin':
            $whereClause .= ($whereClause ? ' AND ' : 'WHERE ') . "role = 'admin'";
            break;
        case 'user':
            $whereClause .= ($whereClause ? ' AND ' : 'WHERE ') . "role = 'user'";
            break;
        case 'active':
            $whereClause .= ($whereClause ? ' AND ' : 'WHERE ') . "status = 'active'";
            break;
        case 'inactive':
            $whereClause .= ($whereClause ? ' AND ' : 'WHERE ') . "status = 'inactive'";
            break;
    }
    
    // Get users
    $users = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.email,
            u.display_name,
            u.role,
            u.status,
            u.created_at,
            u.last_login,
            COUNT(at.id) as total_picks,
            COUNT(CASE WHEN at.status = 'active' THEN 1 END) as active_picks,
            COALESCE(uw.balance, 0) as wallet_balance
        FROM users u
        LEFT JOIN accumulator_tickets at ON at.user_id = u.id
        LEFT JOIN user_wallets uw ON uw.user_id = u.id
        {$whereClause}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT 100
    ", $params);
    
} catch (Exception $e) {
    $error = 'Error loading users data: ' . $e->getMessage();
    $logger->error('Users data loading failed', ['error' => $e->getMessage()]);
}

// Handle user actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $userId = $_POST['user_id'] ?? '';
    
    if ($action === 'update_status' && $userId) {
        $newStatus = $_POST['status'] ?? '';
        try {
            $result = $db->query("UPDATE users SET status = ? WHERE id = ?", [$newStatus, $userId]);
            if ($result) {
                $success = 'User status updated successfully!';
                // Refresh the list
                $users = $db->fetchAll("
                    SELECT 
                        u.id,
                        u.username,
                        u.email,
                        u.display_name,
                        u.role,
                        u.status,
                        u.created_at,
                        u.last_login,
                        COUNT(at.id) as total_picks,
                        COUNT(CASE WHEN at.status = 'active' THEN 1 END) as active_picks,
                        COALESCE(uw.balance, 0) as wallet_balance
                    FROM users u
                    LEFT JOIN accumulator_tickets at ON at.user_id = u.id
                    LEFT JOIN user_wallets uw ON uw.user_id = u.id
                    {$whereClause}
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                    LIMIT 100
                ", $params);
            } else {
                $error = 'Failed to update user status.';
            }
        } catch (Exception $e) {
            $error = 'Error updating user: ' . $e->getMessage();
        }
    } elseif ($action === 'update_role' && $userId) {
        $newRole = $_POST['role'] ?? '';
        try {
            $result = $db->query("UPDATE users SET role = ? WHERE id = ?", [$newRole, $userId]);
            if ($result) {
                $success = 'User role updated successfully!';
                // Refresh the list
                $users = $db->fetchAll("
                    SELECT 
                        u.id,
                        u.username,
                        u.email,
                        u.display_name,
                        u.role,
                        u.status,
                        u.created_at,
                        u.last_login,
                        COUNT(at.id) as total_picks,
                        COUNT(CASE WHEN at.status = 'active' THEN 1 END) as active_picks,
                        COALESCE(uw.balance, 0) as wallet_balance
                    FROM users u
                    LEFT JOIN accumulator_tickets at ON at.user_id = u.id
                    LEFT JOIN user_wallets uw ON uw.user_id = u.id
                    {$whereClause}
                    GROUP BY u.id
                    ORDER BY u.created_at DESC
                    LIMIT 100
                ", $params);
            } else {
                $error = 'Failed to update user role.';
            }
        } catch (Exception $e) {
            $error = 'Error updating user role: ' . $e->getMessage();
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
    <title>Users Management - SmartPicks Pro</title>
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

        /* Search and Filter Bar */
        .search-filter-bar {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-input {
            flex: 1;
            min-width: 200px;
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }

        .filter-select {
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            background-color: white;
        }

        .search-btn {
            padding: 10px 20px;
            background-color: #D32F2F;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
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

        /* User Avatar */
        .user-avatar-small {
            width: 35px;
            height: 35px;
            background-color: #D32F2F;
            color: white;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 10px;
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

            .search-filter-bar {
                flex-direction: column;
                align-items: stretch;
            }

            .search-input {
                min-width: auto;
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
            <li><a href="/admin_users" class="active"><i class="fas fa-users"></i> Users</a></li>
            <li><a href="/admin_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
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
                <div class="page-title">Users Management</div>
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
                    <div class="card-title">Total Users</div>
                    <div class="card-value">
                        <?= count($users) ?>
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Admins</div>
                    <div class="card-value">
                        <?= count(array_filter($users, function($user) { return $user['role'] === 'admin'; })) ?>
                        <i class="fas fa-user-shield"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Active Users</div>
                    <div class="card-value">
                        <?= count(array_filter($users, function($user) { return $user['status'] === 'active'; })) ?>
                        <i class="fas fa-user-check"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Wallet Value</div>
                    <div class="card-value">
                        GHS <?= number_format(array_sum(array_column($users, 'wallet_balance')), 2) ?>
                        <i class="fas fa-wallet"></i>
                    </div>
                </div>
            </div>

            <div class="search-filter-bar">
                <form method="GET" style="display: flex; gap: 15px; align-items: center; flex: 1;">
                    <input type="text" name="search" placeholder="Search users..." value="<?= htmlspecialchars($search) ?>" class="search-input">
                    <select name="filter" class="filter-select">
                        <option value="all" <?= $filter === 'all' ? 'selected' : '' ?>>All Users</option>
                        <option value="admin" <?= $filter === 'admin' ? 'selected' : '' ?>>Admins</option>
                        <option value="user" <?= $filter === 'user' ? 'selected' : '' ?>>Regular Users</option>
                        <option value="active" <?= $filter === 'active' ? 'selected' : '' ?>>Active</option>
                        <option value="inactive" <?= $filter === 'inactive' ? 'selected' : '' ?>>Inactive</option>
                    </select>
                    <button type="submit" class="search-btn">
                        <i class="fas fa-search"></i> Search
                    </button>
                </form>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-users"></i> Users Management</h3>
                <?php if (!empty($users)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Picks</th>
                                <th>Wallet</th>
                                <th>Joined</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($users as $user): ?>
                                <tr>
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
                                    <td><?= htmlspecialchars($user['email']) ?></td>
                                    <td>
                                        <span class="badge <?= $user['role'] === 'admin' ? 'badge-danger' : 'badge-info' ?>">
                                            <?= ucfirst($user['role']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $user['status'] === 'active' ? 'badge-success' : 'badge-warning' ?>">
                                            <?= ucfirst($user['status']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <div style="font-size: 12px;">
                                            <div><?= $user['total_picks'] ?> total</div>
                                            <div style="color: #28a745;"><?= $user['active_picks'] ?> active</div>
                                        </div>
                                    </td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($user['wallet_balance'], 2) ?></td>
                                    <td><?= date('M j, Y', strtotime($user['created_at'])) ?></td>
                                    <td><?= $user['last_login'] ? date('M j, Y', strtotime($user['last_login'])) : 'Never' ?></td>
                                    <td>
                                        <div style="display: flex; gap: 5px;">
                                            <button class="btn btn-info" onclick="viewUser(<?= $user['id'] ?>)">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <button class="btn btn-primary" onclick="updateUser(<?= $user['id'] ?>, '<?= $user['status'] ?>', '<?= $user['role'] ?>')">
                                                <i class="fas fa-edit"></i> Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-users" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Users Found</h4>
                        <p>No users match your current search criteria.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>👥 Users Management</h4>
                <p>Manage user accounts, roles, and permissions across the platform.</p>
                <p><strong>Current Status:</strong> <?= count($users) ?> total users | <?= count(array_filter($users, function($user) { return $user['role'] === 'admin'; })) ?> admins | <?= count(array_filter($users, function($user) { return $user['status'] === 'active'; })) ?> active</p>
            </div>
        </div>
    </div>

    <!-- User Update Modal -->
    <div id="userModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Update User</h3>
            <form method="post" id="userForm">
                <input type="hidden" name="action" id="userAction">
                <input type="hidden" name="user_id" id="userId">
                
                <div style="margin-bottom: 20px;">
                    <label for="status">Status:</label>
                    <select name="status" id="status" class="form-control" required>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label for="role">Role:</label>
                    <select name="role" id="role" class="form-control" required>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideUserModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update User</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function viewUser(userId) {
            alert('View user feature coming soon! User ID: ' + userId);
        }

        function updateUser(userId, currentStatus, currentRole) {
            document.getElementById('userId').value = userId;
            document.getElementById('status').value = currentStatus;
            document.getElementById('role').value = currentRole;
            document.getElementById('userAction').value = 'update_status';
            document.getElementById('userModal').style.display = 'block';
        }

        function hideUserModal() {
            document.getElementById('userModal').style.display = 'none';
        }

        // Close modal when clicking outside
        document.getElementById('userModal').onclick = function(e) {
            if (e.target === this) {
                hideUserModal();
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
