<?php
/**
 * SmartPicks Pro - Self-Contained Admin Contests
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/ContestSystem.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAdmin();

$db = Database::getInstance();
$logger = Logger::getInstance();
$contestSystem = ContestSystem::getInstance();

$error = '';
$success = '';
$contests = [];

try {
    // Get active contests
    $contests = $contestSystem->getActiveContests();
    
} catch (Exception $e) {
    $error = 'Error loading contests data: ' . $e->getMessage();
    $logger->error('Contests data loading failed', ['error' => $e->getMessage()]);
}

// Handle contest actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'create_contest') {
        $title = $_POST['title'] ?? '';
        $description = $_POST['description'] ?? '';
        $startDate = $_POST['start_date'] ?? '';
        $endDate = $_POST['end_date'] ?? '';
        $prizePool = $_POST['prize_pool'] ?? 0;
        
        if ($title && $description && $startDate && $endDate) {
            try {
                $result = $db->query("
                    INSERT INTO contests (title, description, start_date, end_date, prize_pool, status, created_by) 
                    VALUES (?, ?, ?, ?, ?, 'upcoming', ?)
                ", [$title, $description, $startDate, $endDate, $prizePool, $_SESSION['user_id']]);
                
                if ($result) {
                    $success = 'Contest created successfully!';
                    // Refresh the list
                    $contests = $contestSystem->getActiveContests();
                } else {
                    $error = 'Failed to create contest.';
                }
            } catch (Exception $e) {
                $error = 'Error creating contest: ' . $e->getMessage();
            }
        } else {
            $error = 'Please fill in all required fields.';
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
    <title>Contest Management - SmartPicks Pro</title>
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
            border-color: #D32F2F;
            outline: none;
            box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
        }

        textarea.form-control {
            resize: vertical;
            min-height: 80px;
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
            <li><a href="/admin_escrow"><i class="fas fa-lock"></i> Escrow Funds</a></li>
            <li><a href="/public_chat"><i class="fas fa-comments"></i> Chat Moderation</a></li>
            <li><a href="/admin_verification"><i class="fas fa-check-circle"></i> Verification</a></li>
            <li><a href="/admin_contests" class="active"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/admin_mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/admin_support"><i class="fas fa-headset"></i> Support</a></li>
            <li><a href="/admin_settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Contest Management</div>
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
                    <div class="card-title">Active Contests</div>
                    <div class="card-value">
                        <?= count(array_filter($contests, function($contest) { return $contest['status'] === 'active'; })) ?>
                        <i class="fas fa-play-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Upcoming Contests</div>
                    <div class="card-value">
                        <?= count(array_filter($contests, function($contest) { return $contest['status'] === 'upcoming'; })) ?>
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Prize Pool</div>
                    <div class="card-value">
                        GHS <?= number_format(array_sum(array_column($contests, 'prize_pool')), 2) ?>
                        <i class="fas fa-coins"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Total Contests</div>
                    <div class="card-value">
                        <?= count($contests) ?>
                        <i class="fas fa-trophy"></i>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0;">
                <h2 style="margin: 0; color: #333;">Contest Management</h2>
                <button class="btn btn-primary" onclick="showCreateContestModal()">
                    <i class="fas fa-plus"></i> Create New Contest
                </button>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-trophy"></i> Active Contests</h3>
                <?php if (!empty($contests)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Prize Pool</th>
                                <th>Status</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($contests as $contest): ?>
                                <tr>
                                    <td><?= $contest['id'] ?></td>
                                    <td><strong><?= htmlspecialchars($contest['title']) ?></strong></td>
                                    <td><?= htmlspecialchars(substr($contest['description'], 0, 100)) ?>...</td>
                                    <td>GHS <?= number_format($contest['prize_pool'], 2) ?></td>
                                    <td>
                                        <span class="badge <?= $contest['status'] === 'active' ? 'badge-success' : ($contest['status'] === 'upcoming' ? 'badge-warning' : 'badge-info') ?>">
                                            <?= ucfirst($contest['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y', strtotime($contest['start_date'])) ?></td>
                                    <td><?= date('M j, Y', strtotime($contest['end_date'])) ?></td>
                                    <td>
                                        <div style="display: flex; gap: 5px;">
                                            <button class="btn btn-info btn-sm" onclick="viewContest(<?= $contest['id'] ?>)">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <button class="btn btn-primary btn-sm" onclick="editContest(<?= $contest['id'] ?>)">
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
                        <i class="fas fa-trophy" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Contests Found</h4>
                        <p>No contests have been created yet. Create your first contest to get started!</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="alert alert-info" style="margin-top: 30px;">
                <h4>🏆 Contest Management</h4>
                <p>Create and manage prediction contests to engage users and increase platform activity.</p>
                <p><strong>Current Status:</strong> <?= count($contests) ?> total contests | <?= count(array_filter($contests, function($contest) { return $contest['status'] === 'active'; })) ?> active | GHS <?= number_format(array_sum(array_column($contests, 'prize_pool')), 2) ?> total prize pool</p>
            </div>
        </div>
    </div>

    <!-- Create Contest Modal -->
    <div id="createContestModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 500px;">
            <h3>Create New Contest</h3>
            <form method="post" id="createContestForm">
                <input type="hidden" name="action" value="create_contest">
                
                <div class="form-group">
                    <label for="title">Contest Title:</label>
                    <input type="text" name="title" id="title" class="form-control" required>
                </div>
                
                <div class="form-group">
                    <label for="description">Description:</label>
                    <textarea name="description" id="description" rows="4" class="form-control" required></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label for="start_date">Start Date:</label>
                        <input type="datetime-local" name="start_date" id="start_date" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="end_date">End Date:</label>
                        <input type="datetime-local" name="end_date" id="end_date" class="form-control" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="prize_pool">Prize Pool (GHS):</label>
                    <input type="number" name="prize_pool" id="prize_pool" class="form-control" min="0" step="0.01" value="0">
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideCreateContestModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Contest</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function showCreateContestModal() {
            document.getElementById('createContestModal').style.display = 'block';
        }

        function hideCreateContestModal() {
            document.getElementById('createContestModal').style.display = 'none';
        }

        function viewContest(contestId) {
            alert('View contest feature coming soon! Contest ID: ' + contestId);
        }

        function editContest(contestId) {
            alert('Edit contest feature coming soon! Contest ID: ' + contestId);
        }

        // Close modal when clicking outside
        document.getElementById('createContestModal').onclick = function(e) {
            if (e.target === this) {
                hideCreateContestModal();
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
