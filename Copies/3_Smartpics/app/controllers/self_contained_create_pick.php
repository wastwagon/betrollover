<?php
/**
 * SmartPicks Pro - Self-Contained Create Pick
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
$sports = ['Football', 'Basketball', 'Tennis', 'Baseball', 'Hockey', 'Soccer', 'Cricket', 'Rugby', 'Boxing', 'MMA'];

// Handle pick creation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_pick') {
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $sport = $_POST['sport'] ?? '';
    $price = floatval($_POST['price'] ?? 0);
    $picks = $_POST['picks'] ?? [];
    
    if ($title && $description && $sport && $price > 0 && !empty($picks)) {
        try {
            $userId = $_SESSION['user_id'];
            
            // Calculate total odds
            $totalOdds = 1.0;
            foreach ($picks as $pick) {
                if (isset($pick['odds']) && is_numeric($pick['odds'])) {
                    $totalOdds *= floatval($pick['odds']);
                }
            }
            
            // Insert accumulator ticket
            $result = $db->query("
                INSERT INTO accumulator_tickets (
                    user_id, title, description, sport, total_odds, price, 
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
            ", [$userId, $title, $description, $sport, $totalOdds, $price]);
            
            if ($result) {
                $ticketId = $db->lastInsertId();
                
                // Insert individual picks
                foreach ($picks as $pick) {
                    if (!empty($pick['match']) && !empty($pick['prediction']) && !empty($pick['odds'])) {
                        $db->query("
                            INSERT INTO accumulator_picks (
                                accumulator_id, match_description, prediction, odds, 
                                created_at
                            ) VALUES (?, ?, ?, ?, NOW())
                        ", [$ticketId, $pick['match'], $pick['prediction'], floatval($pick['odds'])]);
                    }
                }
                
                $success = 'Pick created successfully! It will be reviewed by admin before going live.';
            } else {
                $error = 'Failed to create pick.';
            }
        } catch (Exception $e) {
            $error = 'Error creating pick: ' . $e->getMessage();
            $logger->error('Pick creation failed', ['error' => $e->getMessage()]);
        }
    } else {
        $error = 'Please fill in all required fields.';
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
    <title>Create Pick - SmartPicks Pro</title>
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

        /* Form Container */
        .form-container {
            background-color: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }

        .form-container h2 {
            margin-top: 0;
            margin-bottom: 25px;
            color: #333;
            font-size: 24px;
        }

        /* Forms */
        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }

        .form-control {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
        }

        .form-control:focus {
            border-color: #28a745;
            outline: none;
            box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
        }

        textarea.form-control {
            resize: vertical;
            min-height: 100px;
        }

        /* Pick Items */
        .pick-items {
            margin-top: 20px;
        }

        .pick-item {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px solid #e9ecef;
        }

        .pick-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .pick-item-title {
            font-weight: 600;
            color: #333;
        }

        .remove-pick-btn {
            background-color: #dc3545;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }

        .pick-item-fields {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
        }

        /* Buttons */
        .btn {
            padding: 12px 24px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background-color: #28a745; /* Green */
            color: white;
        }

        .btn-primary:hover {
            background-color: #218838; /* Darker Green */
        }

        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }

        .btn-secondary:hover {
            background-color: #5a6268;
        }

        .btn-success {
            background-color: #4CAF50; /* Green */
            color: white;
        }

        .btn-success:hover {
            background-color: #388E3C; /* Darker Green */
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

        /* Odds Calculator */
        .odds-calculator {
            background-color: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
        }

        .odds-calculator h4 {
            margin-top: 0;
            color: #2e7d32;
        }

        .total-odds {
            font-size: 24px;
            font-weight: bold;
            color: #28a745;
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

            .form-container {
                padding: 20px;
            }

            .pick-item-fields {
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
            <li><a href="/create_pick" class="active"><i class="fas fa-plus-circle"></i> Create Pick</a></li>
            <li><a href="/my_picks"><i class="fas fa-chart-line"></i> My Picks</a></li>
            <li><a href="/user_analytics"><i class="fas fa-chart-bar"></i> Analytics</a></li>
            <li><a href="/leaderboard"><i class="fas fa-trophy"></i> Leaderboard</a></li>
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
                <div class="page-title">Create Pick</div>
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

            <div class="form-container">
                <h2><i class="fas fa-plus-circle"></i> Create New Pick</h2>
                
                <form method="POST" id="createPickForm">
                    <input type="hidden" name="action" value="create_pick">
                    
                    <div class="form-group">
                        <label for="title">Pick Title:</label>
                        <input type="text" name="title" id="title" class="form-control" required placeholder="e.g., Premier League Accumulator">
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Description:</label>
                        <textarea name="description" id="description" class="form-control" required placeholder="Describe your pick strategy and reasoning..."></textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group">
                            <label for="sport">Sport:</label>
                            <select name="sport" id="sport" class="form-control" required>
                                <option value="">Select Sport</option>
                                <?php foreach ($sports as $sport): ?>
                                    <option value="<?= $sport ?>"><?= $sport ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="price">Price (GHS):</label>
                            <input type="number" name="price" id="price" class="form-control" min="1" step="0.01" required placeholder="10.00">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Individual Picks:</label>
                        <div class="pick-items" id="pickItems">
                            <!-- Pick items will be added here dynamically -->
                        </div>
                        <button type="button" class="btn btn-secondary" onclick="addPickItem()">
                            <i class="fas fa-plus"></i> Add Pick
                        </button>
                    </div>
                    
                    <div class="odds-calculator">
                        <h4>Total Odds Calculator</h4>
                        <div class="total-odds" id="totalOdds">1.00</div>
                        <p>Combined odds of all picks</p>
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px;">
                        <button type="button" class="btn btn-secondary" onclick="resetForm()">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Create Pick
                        </button>
                    </div>
                </form>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>📝 Create Pick</h4>
                <p>Create accumulator picks with multiple selections. All picks are reviewed by admin before going live.</p>
                <p><strong>Tips:</strong> Provide clear match descriptions, realistic odds, and detailed reasoning for better approval chances.</p>
            </div>
        </div>
    </div>

    <script>
        let pickCounter = 0;

        function addPickItem() {
            pickCounter++;
            const pickItems = document.getElementById('pickItems');
            const pickItem = document.createElement('div');
            pickItem.className = 'pick-item';
            pickItem.id = 'pick-' + pickCounter;
            
            pickItem.innerHTML = `
                <div class="pick-item-header">
                    <div class="pick-item-title">Pick ${pickCounter}</div>
                    <button type="button" class="remove-pick-btn" onclick="removePickItem(${pickCounter})">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
                <div class="pick-item-fields">
                    <div class="form-group">
                        <label>Match Description:</label>
                        <input type="text" name="picks[${pickCounter}][match]" class="form-control" required placeholder="e.g., Manchester United vs Liverpool">
                    </div>
                    <div class="form-group">
                        <label>Prediction:</label>
                        <input type="text" name="picks[${pickCounter}][prediction]" class="form-control" required placeholder="e.g., Over 2.5 Goals">
                    </div>
                    <div class="form-group">
                        <label>Odds:</label>
                        <input type="number" name="picks[${pickCounter}][odds]" class="form-control odds-input" min="1.01" step="0.01" required placeholder="1.50" onchange="calculateTotalOdds()">
                    </div>
                </div>
            `;
            
            pickItems.appendChild(pickItem);
            calculateTotalOdds();
        }

        function removePickItem(id) {
            const pickItem = document.getElementById('pick-' + id);
            if (pickItem) {
                pickItem.remove();
                calculateTotalOdds();
            }
        }

        function calculateTotalOdds() {
            const oddsInputs = document.querySelectorAll('.odds-input');
            let totalOdds = 1.0;
            
            oddsInputs.forEach(input => {
                const odds = parseFloat(input.value);
                if (!isNaN(odds) && odds > 0) {
                    totalOdds *= odds;
                }
            });
            
            document.getElementById('totalOdds').textContent = totalOdds.toFixed(2);
        }

        function resetForm() {
            document.getElementById('createPickForm').reset();
            document.getElementById('pickItems').innerHTML = '';
            document.getElementById('totalOdds').textContent = '1.00';
            pickCounter = 0;
        }

        // Add initial pick item
        document.addEventListener('DOMContentLoaded', function() {
            addPickItem();
        });

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
