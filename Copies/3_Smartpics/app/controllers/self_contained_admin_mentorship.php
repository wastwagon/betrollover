<?php
/**
 * SmartPicks Pro - Self-Contained Admin Mentorship
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
$mentorshipApplications = [];
$mentors = [];
$filter = $_GET['filter'] ?? 'all';

// Initialize variables with default values
$totalApplications = 0;
$pendingApplications = 0;
$activeMentorships = 0;
$completedMentorships = 0;

try {
    // Build query based on filter
    $whereClause = '';
    switch ($filter) {
        case 'pending':
            $whereClause = "WHERE ma.status = 'pending'";
            break;
        case 'approved':
            $whereClause = "WHERE ma.status = 'approved'";
            break;
        case 'rejected':
            $whereClause = "WHERE ma.status = 'rejected'";
            break;
        case 'active':
            $whereClause = "WHERE ma.status = 'active'";
            break;
        case 'completed':
            $whereClause = "WHERE ma.status = 'completed'";
            break;
        default:
            $whereClause = "";
    }
    
    // Get mentorship applications
    $mentorshipApplications = $db->fetchAll("
        SELECT 
            ma.id,
            ma.user_id,
            ma.mentor_id,
            ma.application_text,
            ma.status,
            ma.created_at,
            ma.reviewed_at,
            u.username,
            u.display_name,
            u.email,
            m.username as mentor_username,
            m.display_name as mentor_display_name
        FROM mentorship_applications ma
        LEFT JOIN users u ON ma.user_id = u.id
        LEFT JOIN users m ON ma.mentor_id = m.id
        {$whereClause}
        ORDER BY ma.created_at DESC
        LIMIT 100
    ");
    
    // Calculate statistics
    $totalApplications = count($mentorshipApplications);
    $pendingApplications = count(array_filter($mentorshipApplications, function($app) { return $app['status'] === 'pending'; }));
    $activeMentorships = count(array_filter($mentorshipApplications, function($app) { return $app['status'] === 'active'; }));
    $completedMentorships = count(array_filter($mentorshipApplications, function($app) { return $app['status'] === 'completed'; }));
    
    // Get available mentors
    $mentors = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            u.email,
            COUNT(ma.id) as total_applications,
            COUNT(CASE WHEN ma.status = 'active' THEN 1 END) as active_mentorships
        FROM users u
        LEFT JOIN mentorship_applications ma ON u.id = ma.mentor_id
        WHERE u.role = 'admin' OR u.role = 'user'
        GROUP BY u.id
        ORDER BY total_applications DESC
    ");
    
    // Get mentorship statistics
    $totalApplications = $db->fetch("SELECT COUNT(*) as count FROM mentorship_applications")['count'] ?? 0;
    $pendingApplications = $db->fetch("SELECT COUNT(*) as count FROM mentorship_applications WHERE status = 'pending'")['count'] ?? 0;
    $activeMentorships = $db->fetch("SELECT COUNT(*) as count FROM mentorship_applications WHERE status = 'active'")['count'] ?? 0;
    $completedMentorships = $db->fetch("SELECT COUNT(*) as count FROM mentorship_applications WHERE status = 'completed'")['count'] ?? 0;
    
} catch (Exception $e) {
    $error = 'Error loading mentorship data: ' . $e->getMessage();
    $logger->error('Mentorship data loading failed', ['error' => $e->getMessage()]);
}

// Handle mentorship actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $applicationId = $_POST['application_id'] ?? '';
    
    if ($action === 'approve_application' && $applicationId) {
        $mentorId = $_POST['mentor_id'] ?? '';
        if ($mentorId) {
            try {
                $result = $db->query("UPDATE mentorship_applications SET status = 'approved', mentor_id = ?, reviewed_at = NOW() WHERE id = ?", [$mentorId, $applicationId]);
                if ($result) {
                    $success = 'Mentorship application approved successfully!';
                    // Refresh the list
                    $mentorshipApplications = $db->fetchAll("
                        SELECT 
                            ma.id,
                            ma.user_id,
                            ma.mentor_id,
                            ma.application_text,
                            ma.status,
                            ma.created_at,
                            ma.reviewed_at,
                            u.username,
                            u.display_name,
                            u.email,
                            m.username as mentor_username,
                            m.display_name as mentor_display_name
                        FROM mentorship_applications ma
                        LEFT JOIN users u ON ma.user_id = u.id
                        LEFT JOIN users m ON ma.mentor_id = m.id
                        {$whereClause}
                        ORDER BY ma.created_at DESC
                        LIMIT 100
                    ");
                } else {
                    $error = 'Failed to approve application.';
                }
            } catch (Exception $e) {
                $error = 'Error approving application: ' . $e->getMessage();
            }
        } else {
            $error = 'Please select a mentor.';
        }
    } elseif ($action === 'reject_application' && $applicationId) {
        $rejectionReason = $_POST['rejection_reason'] ?? '';
        try {
            $result = $db->query("UPDATE mentorship_applications SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW() WHERE id = ?", [$rejectionReason, $applicationId]);
            if ($result) {
                $success = 'Mentorship application rejected successfully!';
                // Refresh the list
                $mentorshipApplications = $db->fetchAll("
                    SELECT 
                        ma.id,
                        ma.user_id,
                        ma.mentor_id,
                        ma.application_text,
                        ma.status,
                        ma.created_at,
                        ma.reviewed_at,
                        u.username,
                        u.display_name,
                        u.email,
                        m.username as mentor_username,
                        m.display_name as mentor_display_name
                    FROM mentorship_applications ma
                    LEFT JOIN users u ON ma.user_id = u.id
                    LEFT JOIN users m ON ma.mentor_id = m.id
                    {$whereClause}
                    ORDER BY ma.created_at DESC
                    LIMIT 100
                ");
            } else {
                $error = 'Failed to reject application.';
            }
        } catch (Exception $e) {
            $error = 'Error rejecting application: ' . $e->getMessage();
        }
    } elseif ($action === 'update_status' && $applicationId) {
        $newStatus = $_POST['status'] ?? '';
        try {
            $result = $db->query("UPDATE mentorship_applications SET status = ? WHERE id = ?", [$newStatus, $applicationId]);
            if ($result) {
                $success = 'Mentorship status updated successfully!';
                // Refresh the list
                $mentorshipApplications = $db->fetchAll("
                    SELECT 
                        ma.id,
                        ma.user_id,
                        ma.mentor_id,
                        ma.application_text,
                        ma.status,
                        ma.created_at,
                        ma.reviewed_at,
                        u.username,
                        u.display_name,
                        u.email,
                        m.username as mentor_username,
                        m.display_name as mentor_display_name
                    FROM mentorship_applications ma
                    LEFT JOIN users u ON ma.user_id = u.id
                    LEFT JOIN users m ON ma.mentor_id = m.id
                    {$whereClause}
                    ORDER BY ma.created_at DESC
                    LIMIT 100
                ");
            } else {
                $error = 'Failed to update status.';
            }
        } catch (Exception $e) {
            $error = 'Error updating status: ' . $e->getMessage();
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
    <title>Mentorship Management - SmartPicks Pro</title>
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
            <li><a href="/admin_escrow"><i class="fas fa-lock"></i> Escrow Funds</a></li>
            <li><a href="/public_chat"><i class="fas fa-comments"></i> Chat Moderation</a></li>
            <li><a href="/admin_verification"><i class="fas fa-check-circle"></i> Verification</a></li>
            <li><a href="/admin_contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/admin_mentorship" class="active"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/admin_support"><i class="fas fa-headset"></i> Support</a></li>
            <li><a href="/admin_settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Mentorship Management</div>
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
                    <div class="card-title">Total Applications</div>
                    <div class="card-value">
                        <?= number_format($totalApplications) ?>
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Pending Review</div>
                    <div class="card-value">
                        <?= number_format($pendingApplications) ?>
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Active Mentorships</div>
                    <div class="card-value">
                        <?= number_format($activeMentorships) ?>
                        <i class="fas fa-user-check"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Completed</div>
                    <div class="card-value">
                        <?= number_format($completedMentorships) ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            </div>

            <div class="filter-bar">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Filter Applications</h3>
                <div class="filter-buttons">
                    <a href="?filter=all" class="filter-btn <?= $filter === 'all' ? 'active' : '' ?>">
                        <i class="fas fa-list"></i> All
                    </a>
                    <a href="?filter=pending" class="filter-btn <?= $filter === 'pending' ? 'active' : '' ?>">
                        <i class="fas fa-clock"></i> Pending
                    </a>
                    <a href="?filter=approved" class="filter-btn <?= $filter === 'approved' ? 'active' : '' ?>">
                        <i class="fas fa-check"></i> Approved
                    </a>
                    <a href="?filter=active" class="filter-btn <?= $filter === 'active' ? 'active' : '' ?>">
                        <i class="fas fa-user-check"></i> Active
                    </a>
                    <a href="?filter=completed" class="filter-btn <?= $filter === 'completed' ? 'active' : '' ?>">
                        <i class="fas fa-check-circle"></i> Completed
                    </a>
                    <a href="?filter=rejected" class="filter-btn <?= $filter === 'rejected' ? 'active' : '' ?>">
                        <i class="fas fa-times"></i> Rejected
                    </a>
                </div>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-graduation-cap"></i> Mentorship Applications</h3>
                <?php if (!empty($mentorshipApplications)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Applicant</th>
                                <th>Mentor</th>
                                <th>Application</th>
                                <th>Status</th>
                                <th>Applied</th>
                                <th>Reviewed</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($mentorshipApplications as $application): ?>
                                <tr>
                                    <td><?= $application['id'] ?></td>
                                    <td>
                                        <strong><?= htmlspecialchars($application['display_name'] ?? $application['username']) ?></strong><br>
                                        <small style="color: #666;"><?= htmlspecialchars($application['email']) ?></small>
                                    </td>
                                    <td>
                                        <?php if ($application['mentor_display_name']): ?>
                                            <strong><?= htmlspecialchars($application['mentor_display_name']) ?></strong><br>
                                            <small style="color: #666;">@<?= htmlspecialchars($application['mentor_username']) ?></small>
                                        <?php else: ?>
                                            <span style="color: #666;">Not assigned</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                                            <?= htmlspecialchars(substr($application['application_text'], 0, 100)) ?>...
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge <?= $application['status'] === 'approved' ? 'badge-success' : ($application['status'] === 'pending' ? 'badge-warning' : ($application['status'] === 'rejected' ? 'badge-danger' : 'badge-info')) ?>">
                                            <?= ucfirst($application['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y', strtotime($application['created_at'])) ?></td>
                                    <td><?= $application['reviewed_at'] ? date('M j, Y', strtotime($application['reviewed_at'])) : '-' ?></td>
                                    <td>
                                        <?php if ($application['status'] === 'pending'): ?>
                                            <div style="display: flex; gap: 5px;">
                                                <button class="btn btn-success" onclick="approveApplication(<?= $application['id'] ?>)">
                                                    <i class="fas fa-check"></i> Approve
                                                </button>
                                                <button class="btn btn-danger" onclick="rejectApplication(<?= $application['id'] ?>)">
                                                    <i class="fas fa-times"></i> Reject
                                                </button>
                                            </div>
                                        <?php else: ?>
                                            <button class="btn btn-info" onclick="updateStatus(<?= $application['id'] ?>, '<?= $application['status'] ?>')">
                                                <i class="fas fa-edit"></i> Update
                                            </button>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-graduation-cap" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Mentorship Applications</h4>
                        <p>No mentorship applications match your current filter criteria.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🎓 Mentorship Management</h4>
                <p>Manage mentorship applications and pair users with experienced tipsters for guidance and learning.</p>
                <p><strong>Current Status:</strong> <?= $totalApplications ?> total applications | <?= $pendingApplications ?> pending | <?= $activeMentorships ?> active mentorships | <?= $completedMentorships ?> completed</p>
            </div>
        </div>
    </div>

    <!-- Approval Modal -->
    <div id="approvalModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Approve Mentorship Application</h3>
            <form method="post" id="approvalForm">
                <input type="hidden" name="action" value="approve_application">
                <input type="hidden" name="application_id" id="approvalApplicationId">
                
                <div class="form-group">
                    <label for="mentor_id">Assign Mentor:</label>
                    <select name="mentor_id" id="mentor_id" class="form-control" required>
                        <option value="">Select a mentor</option>
                        <?php foreach ($mentors as $mentor): ?>
                            <option value="<?= $mentor['id'] ?>">
                                <?= htmlspecialchars($mentor['display_name'] ?? $mentor['username']) ?> 
                                (<?= $mentor['active_mentorships'] ?> active)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideApprovalModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-success">Approve Application</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Rejection Modal -->
    <div id="rejectionModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Reject Mentorship Application</h3>
            <form method="post" id="rejectionForm">
                <input type="hidden" name="action" value="reject_application">
                <input type="hidden" name="application_id" id="rejectionApplicationId">
                
                <div class="form-group">
                    <label for="rejection_reason">Rejection Reason:</label>
                    <textarea name="rejection_reason" id="rejection_reason" rows="4" class="form-control" placeholder="Please provide a reason for rejection..." required></textarea>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideRejectionModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-danger">Reject Application</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Status Update Modal -->
    <div id="statusModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Update Mentorship Status</h3>
            <form method="post" id="statusForm">
                <input type="hidden" name="action" value="update_status">
                <input type="hidden" name="application_id" id="statusApplicationId">
                
                <div class="form-group">
                    <label for="status">New Status:</label>
                    <select name="status" id="status" class="form-control" required>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideStatusModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Status</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function approveApplication(applicationId) {
            document.getElementById('approvalApplicationId').value = applicationId;
            document.getElementById('approvalModal').style.display = 'block';
        }

        function hideApprovalModal() {
            document.getElementById('approvalModal').style.display = 'none';
        }

        function rejectApplication(applicationId) {
            document.getElementById('rejectionApplicationId').value = applicationId;
            document.getElementById('rejection_reason').value = '';
            document.getElementById('rejectionModal').style.display = 'block';
        }

        function hideRejectionModal() {
            document.getElementById('rejectionModal').style.display = 'none';
        }

        function updateStatus(applicationId, currentStatus) {
            document.getElementById('statusApplicationId').value = applicationId;
            document.getElementById('status').value = currentStatus;
            document.getElementById('statusModal').style.display = 'block';
        }

        function hideStatusModal() {
            document.getElementById('statusModal').style.display = 'none';
        }

        // Close modals when clicking outside
        document.getElementById('approvalModal').onclick = function(e) {
            if (e.target === this) {
                hideApprovalModal();
            }
        };

        document.getElementById('rejectionModal').onclick = function(e) {
            if (e.target === this) {
                hideRejectionModal();
            }
        };

        document.getElementById('statusModal').onclick = function(e) {
            if (e.target === this) {
                hideStatusModal();
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
