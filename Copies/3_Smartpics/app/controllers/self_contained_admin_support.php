<?php
/**
 * SmartPicks Pro - Self-Contained Admin Support
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/SupportService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAdmin();

$db = Database::getInstance();
$logger = Logger::getInstance();
$supportService = SupportService::getInstance();

$error = '';
$success = '';
$supportTickets = [];
$filter = $_GET['filter'] ?? 'all';

try {
    // Build query based on filter
    $whereClause = '';
    $params = [];
    
    switch ($filter) {
        case 'open':
            $whereClause = "WHERE status = 'open'";
            break;
        case 'in_progress':
            $whereClause = "WHERE status = 'in_progress'";
            break;
        case 'resolved':
            $whereClause = "WHERE status = 'resolved'";
            break;
        case 'closed':
            $whereClause = "WHERE status = 'closed'";
            break;
        case 'urgent':
            $whereClause = "WHERE priority = 'urgent'";
            break;
        case 'today':
            $whereClause = "WHERE DATE(created_at) = CURDATE()";
            break;
        default:
            $whereClause = "";
    }
    
    // Get support tickets
    $supportTickets = $db->fetchAll("
        SELECT 
            st.id,
            st.subject,
            st.description,
            st.priority,
            st.status,
            st.created_at,
            st.updated_at,
            u.username,
            u.display_name,
            u.email
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        {$whereClause}
        ORDER BY 
            CASE st.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
            END,
            st.created_at DESC
        LIMIT 50
    ", $params);
    
} catch (Exception $e) {
    $error = 'Error loading support tickets: ' . $e->getMessage();
    $logger->error('Support tickets loading failed', ['error' => $e->getMessage()]);
}

// Handle support actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $ticketId = $_POST['ticket_id'] ?? '';
    
    if ($action === 'update_status' && $ticketId) {
        $newStatus = $_POST['new_status'] ?? '';
        try {
            $result = $db->query("UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?", [$newStatus, $ticketId]);
            if ($result) {
                $success = 'Ticket status updated successfully!';
                // Refresh the list
                $supportTickets = $db->fetchAll("
                    SELECT 
                        st.id,
                        st.subject,
                        st.description,
                        st.priority,
                        st.status,
                        st.created_at,
                        st.updated_at,
                        u.username,
                        u.display_name,
                        u.email
                    FROM support_tickets st
                    LEFT JOIN users u ON st.user_id = u.id
                    {$whereClause}
                    ORDER BY 
                        CASE st.priority 
                            WHEN 'urgent' THEN 1 
                            WHEN 'high' THEN 2 
                            WHEN 'medium' THEN 3 
                            WHEN 'low' THEN 4 
                        END,
                        st.created_at DESC
                    LIMIT 50
                ", $params);
            } else {
                $error = 'Failed to update ticket status.';
            }
        } catch (Exception $e) {
            $error = 'Error updating ticket status: ' . $e->getMessage();
        }
    } elseif ($action === 'add_response' && $ticketId) {
        $response = $_POST['response'] ?? '';
        if ($response) {
            try {
                $result = $db->query("
                    INSERT INTO ticket_responses (ticket_id, user_id, message, is_internal) 
                    VALUES (?, ?, ?, 0)
                ", [$ticketId, $_SESSION['user_id'], $response]);
                
                if ($result) {
                    $success = 'Response added successfully!';
                } else {
                    $error = 'Failed to add response.';
                }
            } catch (Exception $e) {
                $error = 'Error adding response: ' . $e->getMessage();
            }
        } else {
            $error = 'Please enter a response.';
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
    <title>Support Management - SmartPicks Pro</title>
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

        .btn-warning {
            background-color: #FFC107; /* Amber */
            color: #212529;
        }

        .btn-warning:hover {
            background-color: #E0A800; /* Darker Amber */
        }

        .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
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

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
        }

        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 8px;
            min-width: 400px;
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
            <li><a href="/admin_contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/admin_mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/admin_support" class="active"><i class="fas fa-headset"></i> Support</a></li>
            <li><a href="/admin_settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Support Management</div>
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
                    <div class="card-title">Open Tickets</div>
                    <div class="card-value">
                        <?php
                        $openTickets = $db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'")['count'] ?? 0;
                        echo $openTickets;
                        ?>
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Urgent Tickets</div>
                    <div class="card-value">
                        <?php
                        $urgentTickets = $db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE priority = 'urgent' AND status != 'closed'")['count'] ?? 0;
                        echo $urgentTickets;
                        ?>
                        <i class="fas fa-fire"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Resolved Today</div>
                    <div class="card-value">
                        <?php
                        $resolvedToday = $db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE DATE(updated_at) = CURDATE() AND status = 'resolved'")['count'] ?? 0;
                        echo $resolvedToday;
                        ?>
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Avg Response Time</div>
                    <div class="card-value">
                        <?php
                        $avgResponseTime = $db->fetch("SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_time FROM support_tickets WHERE status = 'resolved'")['avg_time'] ?? 0;
                        echo round($avgResponseTime) . 'h';
                        ?>
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin: 30px 0;">
                <h2 style="margin: 0; color: #333;">Support Ticket Management</h2>
                <div style="display: flex; gap: 10px;">
                    <select onchange="filterTickets(this.value)" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="all" <?= $filter === 'all' ? 'selected' : '' ?>>All Tickets</option>
                        <option value="open" <?= $filter === 'open' ? 'selected' : '' ?>>Open</option>
                        <option value="in_progress" <?= $filter === 'in_progress' ? 'selected' : '' ?>>In Progress</option>
                        <option value="resolved" <?= $filter === 'resolved' ? 'selected' : '' ?>>Resolved</option>
                        <option value="closed" <?= $filter === 'closed' ? 'selected' : '' ?>>Closed</option>
                        <option value="urgent" <?= $filter === 'urgent' ? 'selected' : '' ?>>Urgent</option>
                        <option value="today" <?= $filter === 'today' ? 'selected' : '' ?>>Today</option>
                    </select>
                    <button class="btn btn-success" onclick="exportTickets()">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>

            <div class="table-container">
                <?php if (!empty($supportTickets)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Subject</th>
                                <th>User</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($supportTickets as $ticket): ?>
                                <tr>
                                    <td><?= $ticket['id'] ?></td>
                                    <td>
                                        <strong><?= htmlspecialchars($ticket['subject']) ?></strong>
                                        <?php if (!empty($ticket['description'])): ?>
                                            <br><small style="color: #666;"><?= htmlspecialchars(substr($ticket['description'], 0, 100)) ?>...</small>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?= htmlspecialchars($ticket['display_name'] ?? $ticket['username']) ?><br>
                                        <small style="color: #666;"><?= htmlspecialchars($ticket['email']) ?></small>
                                    </td>
                                    <td>
                                        <span class="badge <?= $ticket['priority'] === 'urgent' ? 'badge-danger' : ($ticket['priority'] === 'high' ? 'badge-warning' : 'badge-info') ?>">
                                            <?= ucfirst($ticket['priority']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $ticket['status'] === 'open' ? 'badge-warning' : ($ticket['status'] === 'resolved' ? 'badge-success' : ($ticket['status'] === 'closed' ? 'badge-danger' : 'badge-info')) ?>">
                                            <?= ucfirst(str_replace('_', ' ', $ticket['status'])) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y H:i', strtotime($ticket['created_at'])) ?></td>
                                    <td><?= date('M j, Y H:i', strtotime($ticket['updated_at'])) ?></td>
                                    <td>
                                        <div style="display: flex; gap: 5px;">
                                            <button class="btn btn-primary btn-sm" onclick="viewTicket(<?= $ticket['id'] ?>)">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <button class="btn btn-warning btn-sm" onclick="showStatusModal(<?= $ticket['id'] ?>, '<?= $ticket['status'] ?>')">
                                                <i class="fas fa-edit"></i> Status
                                            </button>
                                            <button class="btn btn-info btn-sm" onclick="showResponseModal(<?= $ticket['id'] ?>)">
                                                <i class="fas fa-reply"></i> Reply
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-headset" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                        <h4>No Support Tickets</h4>
                        <p>No support tickets match the current filter criteria.</p>
                    </div>
                <?php endif; ?>
            </div>

            <!-- Status Update Modal -->
            <div id="statusModal" class="modal">
                <div class="modal-content">
                    <h3 style="margin-bottom: 20px;">Update Ticket Status</h3>
                    <form method="post" id="statusForm">
                        <input type="hidden" name="action" value="update_status">
                        <input type="hidden" name="ticket_id" id="statusTicketId">
                        
                        <div class="form-group">
                            <label for="new_status">New Status:</label>
                            <select name="new_status" id="new_status" class="form-control">
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="hideStatusModal()">Cancel</button>
                            <button type="submit" class="btn btn-warning">Update Status</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Response Modal -->
            <div id="responseModal" class="modal">
                <div class="modal-content">
                    <h3 style="margin-bottom: 20px;">Add Response</h3>
                    <form method="post" id="responseForm">
                        <input type="hidden" name="action" value="add_response">
                        <input type="hidden" name="ticket_id" id="responseTicketId">
                        
                        <div class="form-group">
                            <label for="response">Response:</label>
                            <textarea name="response" id="response" rows="6" class="form-control" placeholder="Enter your response to the user..."></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="hideResponseModal()">Cancel</button>
                            <button type="submit" class="btn btn-info">Send Response</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="alert alert-info" style="margin-top: 30px;">
                <h4>🎧 Support Management</h4>
                <p>Manage user support tickets and provide timely assistance to maintain high user satisfaction.</p>
                <p><strong>Current Filter:</strong> <?= ucfirst(str_replace('_', ' ', $filter)) ?> | <strong>Showing:</strong> <?= count($supportTickets) ?> tickets</p>
            </div>
        </div>
    </div>

    <script>
    function filterTickets(filter) {
        window.location.href = '?filter=' + filter;
    }

    function exportTickets() {
        alert('Ticket export feature coming soon!');
    }

    function viewTicket(ticketId) {
        alert('Ticket viewer coming soon! Ticket ID: ' + ticketId);
    }

    function showStatusModal(ticketId, currentStatus) {
        document.getElementById('statusTicketId').value = ticketId;
        document.getElementById('new_status').value = currentStatus;
        document.getElementById('statusModal').style.display = 'block';
    }

    function hideStatusModal() {
        document.getElementById('statusModal').style.display = 'none';
    }

    function showResponseModal(ticketId) {
        document.getElementById('responseTicketId').value = ticketId;
        document.getElementById('response').value = '';
        document.getElementById('responseModal').style.display = 'block';
    }

    function hideResponseModal() {
        document.getElementById('responseModal').style.display = 'none';
    }

    // Close modals when clicking outside
    document.getElementById('statusModal').onclick = function(e) {
        if (e.target === this) {
            hideStatusModal();
        }
    };

    document.getElementById('responseModal').onclick = function(e) {
        if (e.target === this) {
            hideResponseModal();
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
