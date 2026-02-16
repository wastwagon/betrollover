<?php
/**
 * SmartPicks Pro - Self-Contained User Mentorship
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
$mentorshipApplications = [];
$availableMentors = [];
$filter = $_GET['filter'] ?? 'all';

try {
    // Get user's mentorship applications
    $mentorshipApplications = $db->fetchAll("
        SELECT 
            ma.id,
            ma.application_text,
            ma.status,
            ma.created_at,
            ma.reviewed_at,
            ma.rejection_reason,
            u.username as mentor_username,
            u.display_name as mentor_display_name
        FROM mentorship_applications ma
        LEFT JOIN users u ON ma.mentor_id = u.id
        WHERE ma.user_id = ?
        ORDER BY ma.created_at DESC
        LIMIT 20
    ", [$_SESSION['user_id']]);
    
    // Get available mentors
    $availableMentors = $db->fetchAll("
        SELECT 
            u.id,
            u.username,
            u.display_name,
            u.email,
            COUNT(ma.id) as total_mentorships,
            COUNT(CASE WHEN ma.status = 'active' THEN 1 END) as active_mentorships
        FROM users u
        LEFT JOIN mentorship_applications ma ON u.id = ma.mentor_id
        WHERE u.role = 'admin' OR (u.role = 'user' AND u.id != ?)
        GROUP BY u.id
        HAVING total_mentorships > 0 OR u.role = 'admin'
        ORDER BY total_mentorships DESC
        LIMIT 10
    ", [$_SESSION['user_id']]);
    
} catch (Exception $e) {
    $error = 'Error loading mentorship data: ' . $e->getMessage();
    $logger->error('Mentorship data loading failed', ['error' => $e->getMessage()]);
}

// Handle mentorship application
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'apply_mentorship') {
    $mentorId = $_POST['mentor_id'] ?? '';
    $applicationText = trim($_POST['application_text'] ?? '');
    
    if ($mentorId && $applicationText) {
        try {
            // Check if user already has a pending application
            $existingApplication = $db->fetch("
                SELECT id FROM mentorship_applications 
                WHERE user_id = ? AND status = 'pending'
            ", [$_SESSION['user_id']]);
            
            if ($existingApplication) {
                $error = 'You already have a pending mentorship application.';
            } else {
                $result = $db->query("
                    INSERT INTO mentorship_applications (user_id, mentor_id, application_text, status, created_at) 
                    VALUES (?, ?, ?, 'pending', NOW())
                ", [$_SESSION['user_id'], $mentorId, $applicationText]);
                
                if ($result) {
                    $success = 'Mentorship application submitted successfully!';
                    // Refresh applications
                    $mentorshipApplications = $db->fetchAll("
                        SELECT 
                            ma.id,
                            ma.application_text,
                            ma.status,
                            ma.created_at,
                            ma.reviewed_at,
                            ma.rejection_reason,
                            u.username as mentor_username,
                            u.display_name as mentor_display_name
                        FROM mentorship_applications ma
                        LEFT JOIN users u ON ma.mentor_id = u.id
                        WHERE ma.user_id = ?
                        ORDER BY ma.created_at DESC
                        LIMIT 20
                    ", [$_SESSION['user_id']]);
                } else {
                    $error = 'Failed to submit mentorship application.';
                }
            }
        } catch (Exception $e) {
            $error = 'Error submitting application: ' . $e->getMessage();
        }
    } else {
        $error = 'Please select a mentor and provide application text.';
    }
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
    <title>Mentorship - SmartPicks Pro</title>
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

        /* Mentor Cards */
        .mentors-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .mentor-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            border-left: 4px solid #2E7D32;
        }

        .mentor-card h4 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
            font-size: 18px;
        }

        .mentor-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .mentor-stat-item {
            text-align: center;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }

        .mentor-stat-item .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }

        .mentor-stat-item .value {
            font-size: 16px;
            font-weight: bold;
            color: #2E7D32;
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
            border-color: #2E7D32;
            outline: none;
            box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.2);
        }

        textarea.form-control {
            resize: vertical;
            min-height: 100px;
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

            .mentors-grid {
                grid-template-columns: 1fr;
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
            <li><a href="/my_purchases"><i class="fas fa-shopping-cart"></i> My Purchases</a></li>
            <li><a href="/chat"><i class="fas fa-comments"></i> Chat</a></li>
            <li><a href="/contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/mentorship" class="active"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/wallet"><i class="fas fa-wallet"></i> Wallet</a></li>
            <li><a href="/payouts"><i class="fas fa-money-bill-wave"></i> Payouts</a></li>
            <li><a href="/profile"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Mentorship Program</div>
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

            <?php if (!empty($success)): ?>
                <div class="alert alert-success">
                    <h4>✅ Success</h4>
                    <p><?= htmlspecialchars($success) ?></p>
                </div>
            <?php endif; ?>

            <div class="kpi-cards">
                <div class="kpi-card">
                    <div class="card-title">Available Mentors</div>
                    <div class="card-value">
                        <?= count($availableMentors) ?>
                        <i class="fas fa-user-graduate"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">My Applications</div>
                    <div class="card-value">
                        <?= count($mentorshipApplications) ?>
                        <i class="fas fa-file-alt"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Active Mentorships</div>
                    <div class="card-value">
                        <?= count(array_filter($mentorshipApplications, function($app) { return $app['status'] === 'active'; })) ?>
                        <i class="fas fa-user-check"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Completed</div>
                    <div class="card-value">
                        <?= count(array_filter($mentorshipApplications, function($app) { return $app['status'] === 'completed'; })) ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
            </div>

            <div class="mentors-grid">
                <?php if (!empty($availableMentors)): ?>
                    <?php foreach ($availableMentors as $mentor): ?>
                        <div class="mentor-card">
                            <h4><?= htmlspecialchars($mentor['display_name'] ?? $mentor['username']) ?></h4>
                            <p style="color: #666; margin-bottom: 15px;">@<?= htmlspecialchars($mentor['username']) ?></p>
                            
                            <div class="mentor-stats">
                                <div class="mentor-stat-item">
                                    <div class="label">Total Mentorships</div>
                                    <div class="value"><?= $mentor['total_mentorships'] ?></div>
                                </div>
                                <div class="mentor-stat-item">
                                    <div class="label">Active</div>
                                    <div class="value"><?= $mentor['active_mentorships'] ?></div>
                                </div>
                            </div>
                            
                            <button class="btn btn-primary" onclick="applyMentorship(<?= $mentor['id'] ?>, '<?= htmlspecialchars($mentor['display_name'] ?? $mentor['username']) ?>')">
                                <i class="fas fa-plus"></i> Apply for Mentorship
                            </button>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                        <i class="fas fa-user-graduate" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Mentors Available</h4>
                        <p>No mentors are currently available for mentorship applications.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-file-alt"></i> My Mentorship Applications</h3>
                <?php if (!empty($mentorshipApplications)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
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
                                        <?php if ($application['rejection_reason']): ?>
                                            <br><small style="color: #666;"><?= htmlspecialchars($application['rejection_reason']) ?></small>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= date('M j, Y', strtotime($application['created_at'])) ?></td>
                                    <td><?= $application['reviewed_at'] ? date('M j, Y', strtotime($application['reviewed_at'])) : '-' ?></td>
                                    <td>
                                        <button class="btn btn-info" onclick="viewApplication(<?= $application['id'] ?>)">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-file-alt" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Mentorship Applications</h4>
                        <p>You haven't applied for any mentorship programs yet.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🎓 Mentorship Program</h4>
                <p>Connect with experienced tipsters and learn from the best to improve your prediction skills.</p>
                <p><strong>Current Status:</strong> <?= count($availableMentors) ?> available mentors | <?= count($mentorshipApplications) ?> applications | <?= count(array_filter($mentorshipApplications, function($app) { return $app['status'] === 'active'; })) ?> active mentorships</p>
            </div>
        </div>
    </div>

    <!-- Application Modal -->
    <div id="applicationModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 500px;">
            <h3>Apply for Mentorship</h3>
            <form method="post" id="applicationForm">
                <input type="hidden" name="action" value="apply_mentorship">
                <input type="hidden" name="mentor_id" id="mentorId">
                
                <div class="form-group">
                    <label for="mentor_name">Selected Mentor:</label>
                    <input type="text" id="mentorName" class="form-control" readonly>
                </div>
                
                <div class="form-group">
                    <label for="application_text">Application Text:</label>
                    <textarea name="application_text" id="application_text" rows="6" class="form-control" placeholder="Tell us why you want mentorship from this mentor and what you hope to learn..." required></textarea>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="hideApplicationModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-primary">Submit Application</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function applyMentorship(mentorId, mentorName) {
            document.getElementById('mentorId').value = mentorId;
            document.getElementById('mentorName').value = mentorName;
            document.getElementById('application_text').value = '';
            document.getElementById('applicationModal').style.display = 'block';
        }

        function hideApplicationModal() {
            document.getElementById('applicationModal').style.display = 'none';
        }

        function viewApplication(applicationId) {
            alert('View application feature coming soon! Application ID: ' + applicationId);
        }

        // Close modal when clicking outside
        document.getElementById('applicationModal').onclick = function(e) {
            if (e.target === this) {
                hideApplicationModal();
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
