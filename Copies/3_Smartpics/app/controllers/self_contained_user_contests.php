<?php
/**
 * SmartPicks Pro - Self-Contained User Contests
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
$contests = [];
$userParticipations = [];
$filter = $_GET['filter'] ?? 'active';

try {
    // Build query based on filter
    $whereClause = '';
    switch ($filter) {
        case 'active':
            $whereClause = "WHERE c.status = 'active' AND c.start_date <= NOW() AND c.end_date >= NOW()";
            break;
        case 'upcoming':
            $whereClause = "WHERE c.status = 'active' AND c.start_date > NOW()";
            break;
        case 'completed':
            $whereClause = "WHERE c.status = 'completed' OR c.end_date < NOW()";
            break;
        default:
            $whereClause = "WHERE c.status = 'active'";
    }
    
    // Get contests
    $contests = $db->fetchAll("
        SELECT 
            c.id,
            c.title,
            c.description,
            c.prize_pool,
            c.entry_fee,
            c.start_date,
            c.end_date,
            c.status,
            c.created_at,
            COUNT(cp.id) as participant_count
        FROM contests c
        LEFT JOIN contest_participants cp ON c.id = cp.contest_id
        {$whereClause}
        GROUP BY c.id
        ORDER BY c.start_date ASC
        LIMIT 20
    ");
    
    // Get user's contest participations
    $userParticipations = $db->fetchAll("
        SELECT 
            cp.id,
            cp.contest_id,
            cp.participation_date,
            cp.status,
            c.title,
            c.prize_pool,
            c.end_date
        FROM contest_participants cp
        LEFT JOIN contests c ON cp.contest_id = c.id
        WHERE cp.user_id = ?
        ORDER BY cp.participation_date DESC
        LIMIT 10
    ", [$_SESSION['user_id']]);
    
} catch (Exception $e) {
    $error = 'Error loading contests data: ' . $e->getMessage();
    $logger->error('Contests data loading failed', ['error' => $e->getMessage()]);
}

// Handle contest participation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'join_contest') {
    $contestId = $_POST['contest_id'] ?? '';
    
    if ($contestId) {
        try {
            // Check if user already participated
            $existingParticipation = $db->fetch("
                SELECT id FROM contest_participants 
                WHERE user_id = ? AND contest_id = ?
            ", [$_SESSION['user_id'], $contestId]);
            
            if ($existingParticipation) {
                $error = 'You have already joined this contest.';
            } else {
                // Check user wallet balance
                $entryFee = $db->fetch("SELECT entry_fee FROM contests WHERE id = ?", [$contestId])['entry_fee'] ?? 0;
                $userBalance = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$_SESSION['user_id']])['balance'] ?? 0;
                
                if ($userBalance >= $entryFee) {
                    // Deduct entry fee
                    $db->query("
                        UPDATE user_wallets 
                        SET balance = balance - ? 
                        WHERE user_id = ?
                    ", [$entryFee, $_SESSION['user_id']]);
                    
                    // Add transaction record
                    $db->query("
                        INSERT INTO wallet_transactions (user_id, type, amount, description, status, created_at) 
                        VALUES (?, 'contest_entry', ?, 'Contest entry fee', 'completed', NOW())
                    ", [$_SESSION['user_id'], $entryFee]);
                    
                    // Join contest
                    $result = $db->query("
                        INSERT INTO contest_participants (user_id, contest_id, participation_date, status) 
                        VALUES (?, ?, NOW(), 'active')
                    ", [$_SESSION['user_id'], $contestId]);
                    
                    if ($result) {
                        $success = 'Successfully joined the contest!';
                        // Refresh participations
                        $userParticipations = $db->fetchAll("
                            SELECT 
                                cp.id,
                                cp.contest_id,
                                cp.participation_date,
                                cp.status,
                                c.title,
                                c.prize_pool,
                                c.end_date
                            FROM contest_participants cp
                            LEFT JOIN contests c ON cp.contest_id = c.id
                            WHERE cp.user_id = ?
                            ORDER BY cp.participation_date DESC
                            LIMIT 10
                        ", [$_SESSION['user_id']]);
                    } else {
                        $error = 'Failed to join contest.';
                    }
                } else {
                    $error = 'Insufficient wallet balance to join this contest.';
                }
            }
        } catch (Exception $e) {
            $error = 'Error joining contest: ' . $e->getMessage();
        }
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
    <title>Contests - SmartPicks Pro</title>
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

        /* Contest Cards */
        .contests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .contest-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            border-left: 4px solid #2E7D32;
        }

        .contest-card h4 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
            font-size: 18px;
        }

        .contest-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .contest-meta-item {
            text-align: center;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }

        .contest-meta-item .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }

        .contest-meta-item .value {
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

            .contests-grid {
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
            <li><a href="/my_picks"><i class="fas fa-chart-line"></i> My Picks</a></li>
            <li><a href="/user_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/marketplace"><i class="fas fa-shopping-bag"></i> Marketplace</a></li>
            <li><a href="/my_purchases"><i class="fas fa-shopping-cart"></i> My Purchases</a></li>
            <li><a href="/chat"><i class="fas fa-comments"></i> Chat</a></li>
            <li><a href="/contests" class="active"><i class="fas fa-trophy"></i> Contests</a></li>
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
                <div class="page-title">Contests</div>
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
                    <div class="card-title">Available Contests</div>
                    <div class="card-value">
                        <?= count($contests) ?>
                        <i class="fas fa-trophy"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">My Participations</div>
                    <div class="card-value">
                        <?= count($userParticipations) ?>
                        <i class="fas fa-user-check"></i>
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
                    <div class="card-title">Wallet Balance</div>
                    <div class="card-value">
                        GHS <?= number_format($walletBalance, 2) ?>
                        <i class="fas fa-wallet"></i>
                    </div>
                </div>
            </div>

            <div class="filter-bar">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Filter Contests</h3>
                <div class="filter-buttons">
                    <a href="?filter=active" class="filter-btn <?= $filter === 'active' ? 'active' : '' ?>">
                        <i class="fas fa-play-circle"></i> Active
                    </a>
                    <a href="?filter=upcoming" class="filter-btn <?= $filter === 'upcoming' ? 'active' : '' ?>">
                        <i class="fas fa-clock"></i> Upcoming
                    </a>
                    <a href="?filter=completed" class="filter-btn <?= $filter === 'completed' ? 'active' : '' ?>">
                        <i class="fas fa-check-circle"></i> Completed
                    </a>
                </div>
            </div>

            <div class="contests-grid">
                <?php if (!empty($contests)): ?>
                    <?php foreach ($contests as $contest): ?>
                        <div class="contest-card">
                            <h4><?= htmlspecialchars($contest['title']) ?></h4>
                            <p style="color: #666; margin-bottom: 15px;"><?= htmlspecialchars($contest['description']) ?></p>
                            
                            <div class="contest-meta">
                                <div class="contest-meta-item">
                                    <div class="label">Prize Pool</div>
                                    <div class="value">GHS <?= number_format($contest['prize_pool'], 2) ?></div>
                                </div>
                                <div class="contest-meta-item">
                                    <div class="label">Entry Fee</div>
                                    <div class="value">GHS <?= number_format($contest['entry_fee'], 2) ?></div>
                                </div>
                                <div class="contest-meta-item">
                                    <div class="label">Participants</div>
                                    <div class="value"><?= $contest['participant_count'] ?></div>
                                </div>
                                <div class="contest-meta-item">
                                    <div class="label">Ends</div>
                                    <div class="value"><?= date('M j', strtotime($contest['end_date'])) ?></div>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; margin-top: 15px;">
                                <button class="btn btn-info" onclick="viewContest(<?= $contest['id'] ?>)">
                                    <i class="fas fa-eye"></i> View Details
                                </button>
                                <?php if ($filter === 'active' && $contest['entry_fee'] <= $walletBalance): ?>
                                    <form method="post" style="display: inline;">
                                        <input type="hidden" name="action" value="join_contest">
                                        <input type="hidden" name="contest_id" value="<?= $contest['id'] ?>">
                                        <button type="submit" class="btn btn-success" onclick="return confirm('Join this contest for GHS <?= number_format($contest['entry_fee'], 2) ?>?')">
                                            <i class="fas fa-plus"></i> Join Contest
                                        </button>
                                    </form>
                                <?php elseif ($filter === 'active' && $contest['entry_fee'] > $walletBalance): ?>
                                    <button class="btn btn-secondary" disabled>
                                        <i class="fas fa-wallet"></i> Insufficient Funds
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">
                        <i class="fas fa-trophy" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Contests Available</h4>
                        <p>No contests match your current filter criteria.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div class="table-container">
                <h3><i class="fas fa-user-check"></i> My Contest Participations</h3>
                <?php if (!empty($userParticipations)): ?>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Contest</th>
                                <th>Prize Pool</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Ends</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($userParticipations as $participation): ?>
                                <tr>
                                    <td>
                                        <strong><?= htmlspecialchars($participation['title']) ?></strong><br>
                                        <small style="color: #666;">ID: <?= $participation['contest_id'] ?></small>
                                    </td>
                                    <td style="color: #28a745; font-weight: bold;">GHS <?= number_format($participation['prize_pool'], 2) ?></td>
                                    <td>
                                        <span class="badge <?= $participation['status'] === 'active' ? 'badge-success' : ($participation['status'] === 'completed' ? 'badge-info' : 'badge-warning') ?>">
                                            <?= ucfirst($participation['status']) ?>
                                        </span>
                                    </td>
                                    <td><?= date('M j, Y', strtotime($participation['participation_date'])) ?></td>
                                    <td><?= date('M j, Y', strtotime($participation['end_date'])) ?></td>
                                    <td>
                                        <button class="btn btn-info" onclick="viewContest(<?= $participation['contest_id'] ?>)">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-user-times" style="font-size: 48px; color: #2E7D32; margin-bottom: 15px;"></i>
                        <h4>No Contest Participations</h4>
                        <p>You haven't joined any contests yet.</p>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🏆 Contest Participation</h4>
                <p>Join exciting prediction contests and compete with other tipsters for amazing prizes.</p>
                <p><strong>Current Status:</strong> <?= count($contests) ?> available contests | <?= count($userParticipations) ?> participations | GHS <?= number_format(array_sum(array_column($contests, 'prize_pool')), 2) ?> total prize pool</p>
            </div>
        </div>
    </div>

    <script>
        function viewContest(contestId) {
            alert('View contest details feature coming soon! Contest ID: ' + contestId);
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
