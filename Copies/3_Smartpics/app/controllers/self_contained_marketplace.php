<?php
/**
 * SmartPicks Pro - Self-Contained Marketplace
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();
$wallet = Wallet::getInstance();

$error = '';
$success = '';
$marketplacePicks = [];
$filter = $_GET['filter'] ?? 'all';
$search = $_GET['search'] ?? '';

try {
    $userId = $_SESSION['user_id'];
    
    // Build query based on filter and search
    $whereClause = "WHERE at.status = 'active'";
    $params = [];
    
    if ($search) {
        $whereClause .= " AND (at.title LIKE ? OR at.description LIKE ? OR u.username LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
    }
    
    switch ($filter) {
        case 'high_odds':
            $whereClause .= " AND at.total_odds >= 3.0";
            break;
        case 'low_price':
            $whereClause .= " AND at.price <= 10.00";
            break;
        case 'recent':
            $whereClause .= " AND at.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            break;
    }
    
    // Get marketplace picks
    $marketplacePicks = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.description,
            at.total_odds,
            at.price,
            at.created_at,
            u.username,
            u.display_name,
            COUNT(upp.id) as purchase_count
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        LEFT JOIN user_purchased_picks upp ON upp.accumulator_id = at.id
        {$whereClause}
        GROUP BY at.id
        ORDER BY at.created_at DESC
        LIMIT 50
    ", $params);
    
} catch (Exception $e) {
    $error = 'Error loading marketplace picks: ' . $e->getMessage();
    $logger->error('Marketplace loading failed', ['error' => $e->getMessage()]);
}

// Handle purchase action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'purchase_pick') {
    $pickId = $_POST['pick_id'] ?? '';
    if ($pickId) {
        try {
            // Get pick details
            $pick = $db->fetch("SELECT * FROM accumulator_tickets WHERE id = ? AND status = 'active'", [$pickId]);
            if (!$pick) {
                throw new Exception('Pick not found or not available.');
            }
            
            // Check if user already purchased this pick
            $existingPurchase = $db->fetch("
                SELECT upp.id FROM user_purchased_picks upp 
                WHERE upp.user_id = ? AND upp.accumulator_id = ?
            ", [$userId, $pickId]);
            
            if ($existingPurchase) {
                throw new Exception('You have already purchased this pick.');
            }
            
            // Check wallet balance
            $walletBalance = $wallet->getBalance($userId);
            if ($walletBalance < $pick['price']) {
                throw new Exception('Insufficient wallet balance.');
            }
            
            // Process purchase
            $result = $wallet->deductFunds($userId, $pick['price'], 'purchase', "Purchase of pick: {$pickId}");
            if ($result) {
                // Record purchase
                $db->query("
                    INSERT INTO user_purchased_picks (user_id, accumulator_id, purchase_price, purchased_at) 
                    VALUES (?, ?, ?, NOW())
                ", [$userId, $pickId, $pick['price']]);
                
                $success = 'Pick purchased successfully!';
                // Refresh the list
                $marketplacePicks = $db->fetchAll("
                    SELECT 
                        at.id,
                        at.title,
                        at.description,
                        at.total_odds,
                        at.price,
                        at.created_at,
                        u.username,
                        u.display_name,
                        COUNT(upp.id) as purchase_count
                    FROM accumulator_tickets at
                    LEFT JOIN users u ON at.user_id = u.id
                    LEFT JOIN user_purchased_picks upp ON upp.accumulator_id = at.id
                    {$whereClause}
                    GROUP BY at.id
                    ORDER BY at.created_at DESC
                    LIMIT 50
                ", $params);
            } else {
                $error = 'Failed to process purchase.';
            }
        } catch (Exception $e) {
            $error = 'Purchase error: ' . $e->getMessage();
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
    <title>Marketplace - SmartPicks Pro</title>
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
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }

        /* Pick Cards */
        .picks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .pick-card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .pick-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }

        .pick-card-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
        }

        .pick-card-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }

        .pick-card-description {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 15px;
        }

        .pick-card-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #666;
        }

        .pick-card-body {
            padding: 20px;
        }

        .pick-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat-item {
            text-align: center;
        }

        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #28a745;
        }

        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }

        .pick-card-footer {
            padding: 20px;
            background-color: #f8f9fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .tipster-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .tipster-avatar {
            width: 30px;
            height: 30px;
            background-color: #28a745;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
        }

        .tipster-name {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }

        .purchase-btn {
            padding: 8px 16px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 0.2s;
        }

        .purchase-btn:hover {
            background-color: #218838;
        }

        .purchase-btn:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
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

            .picks-grid {
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
            <div class="logo-text">Tipster Dashboard</div>
            <div class="app-name">SmartPicks Pro</div>
        </div>
        <ul class="sidebar-menu">
            <li><a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a></li>
            <li><a href="/create_pick"><i class="fas fa-plus-circle"></i> Create Pick</a></li>
            <li><a href="/my_picks"><i class="fas fa-chart-line"></i> My Picks</a></li>
            <li><a href="/user_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
            <li><a href="/marketplace" class="active"><i class="fas fa-store"></i> Marketplace</a></li>
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
                <div class="page-title">Marketplace</div>
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

            <?php if (!empty($success)): ?>
                <div class="alert alert-success">
                    <h4>✅ Success</h4>
                    <p><?= htmlspecialchars($success) ?></p>
                </div>
            <?php endif; ?>

            <div class="search-filter-bar">
                <form method="GET" style="display: flex; gap: 15px; align-items: center; flex: 1;">
                    <input type="text" name="search" placeholder="Search picks..." value="<?= htmlspecialchars($search) ?>" class="search-input">
                    <select name="filter" class="filter-select">
                        <option value="all" <?= $filter === 'all' ? 'selected' : '' ?>>All Picks</option>
                        <option value="high_odds" <?= $filter === 'high_odds' ? 'selected' : '' ?>>High Odds (3.0+)</option>
                        <option value="low_price" <?= $filter === 'low_price' ? 'selected' : '' ?>>Low Price (≤GHS 10)</option>
                        <option value="recent" <?= $filter === 'recent' ? 'selected' : '' ?>>Recent (7 days)</option>
                    </select>
                    <button type="submit" class="search-btn">
                        <i class="fas fa-search"></i> Search
                    </button>
                </form>
            </div>

            <div class="picks-grid">
                <?php if (!empty($marketplacePicks)): ?>
                    <?php foreach ($marketplacePicks as $pick): ?>
                        <div class="pick-card">
                            <div class="pick-card-header">
                                <div class="pick-card-title"><?= htmlspecialchars($pick['title']) ?></div>
                                <div class="pick-card-description"><?= htmlspecialchars(substr($pick['description'], 0, 150)) ?>...</div>
                                <div class="pick-card-meta">
                                    <span><i class="fas fa-calendar"></i> <?= date('M j, Y', strtotime($pick['created_at'])) ?></span>
                                    <span><i class="fas fa-users"></i> <?= $pick['purchase_count'] ?> purchases</span>
                                </div>
                            </div>
                            
                            <div class="pick-card-body">
                                <div class="pick-stats">
                                    <div class="stat-item">
                                        <div class="stat-value"><?= number_format($pick['total_odds'], 2) ?></div>
                                        <div class="stat-label">Total Odds</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">GHS <?= number_format($pick['price'], 2) ?></div>
                                        <div class="stat-label">Price</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="pick-card-footer">
                                <div class="tipster-info">
                                    <div class="tipster-avatar">
                                        <?= strtoupper(substr($pick['username'], 0, 1)) ?>
                                    </div>
                                    <div class="tipster-name"><?= htmlspecialchars($pick['display_name'] ?? $pick['username']) ?></div>
                                </div>
                                
                                <form method="POST" style="display: inline;">
                                    <input type="hidden" name="action" value="purchase_pick">
                                    <input type="hidden" name="pick_id" value="<?= $pick['id'] ?>">
                                    <button type="submit" class="purchase-btn" <?= $walletBalance < $pick['price'] ? 'disabled' : '' ?>>
                                        <i class="fas fa-shopping-cart"></i> 
                                        <?= $walletBalance < $pick['price'] ? 'Insufficient Funds' : 'Purchase' ?>
                                    </button>
                                </form>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-store" style="font-size: 48px; color: #28a745; margin-bottom: 15px;"></i>
                        <h4>No Picks Available</h4>
                        <p>No picks match your current search criteria.</p>
                        <?php if ($search || $filter !== 'all'): ?>
                            <a href="/marketplace" style="color: #28a745; text-decoration: none;">Clear filters and view all picks</a>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>🛒 Marketplace</h4>
                <p>Browse and purchase picks from verified tipsters. All picks are quality-checked and ready to use.</p>
                <p><strong>Current Results:</strong> <?= count($marketplacePicks) ?> picks available | Wallet Balance: GHS <?= number_format($walletBalance, 2) ?></p>
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

        // Confirm purchase
        document.querySelectorAll('form[method="POST"]').forEach(form => {
            form.addEventListener('submit', function(e) {
                const pickTitle = this.closest('.pick-card').querySelector('.pick-card-title').textContent;
                const pickPrice = this.closest('.pick-card').querySelector('.stat-value').textContent;
                
                if (!confirm(`Are you sure you want to purchase "${pickTitle}" for ${pickPrice}?`)) {
                    e.preventDefault();
                }
            });
        });
    </script>
</body>
</html>
