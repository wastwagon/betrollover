<?php
/**
 * SmartPicks Pro - Self-Contained User Settings
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
$userSettings = [];

try {
    // Get user settings (assuming a user_settings table exists)
    $userSettings = $db->fetch("
        SELECT 
            u.id,
            u.username,
            u.email,
            u.display_name,
            u.role,
            u.created_at,
            u.last_login,
            COALESCE(u.is_verified, 0) as is_verified,
            uw.balance
        FROM users u
        LEFT JOIN user_wallets uw ON u.id = uw.user_id
        WHERE u.id = ?
    ", [$_SESSION['user_id']]);
    
    if (!$userSettings) {
        $error = 'User settings not found.';
    }
    
} catch (Exception $e) {
    $error = 'Error loading settings data: ' . $e->getMessage();
    $logger->error('Settings data loading failed', ['error' => $e->getMessage()]);
}

// Handle settings update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_settings') {
    $notifications = $_POST['notifications'] ?? [];
    $privacy = $_POST['privacy'] ?? [];
    $preferences = $_POST['preferences'] ?? [];
    
    try {
        // For now, we'll just show a success message
        // In a real implementation, you'd save these to a user_settings table
        $success = 'Settings updated successfully!';
        
        // Update session with new preferences
        $_SESSION['user_notifications'] = $notifications;
        $_SESSION['user_privacy'] = $privacy;
        $_SESSION['user_preferences'] = $preferences;
        
    } catch (Exception $e) {
        $error = 'Error updating settings: ' . $e->getMessage();
    }
}

// Safely get wallet balance
$walletBalance = $userSettings['balance'] ?? 0.00;

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - SmartPicks Pro</title>
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

        /* Settings Sections */
        .settings-sections {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .settings-section {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        .settings-section h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .setting-item:last-child {
            border-bottom: none;
        }

        .setting-info {
            flex-grow: 1;
        }

        .setting-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }

        .setting-description {
            font-size: 14px;
            color: #666;
        }

        .setting-control {
            margin-left: 20px;
        }

        /* Toggle Switch */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: #2E7D32;
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }

        /* Select Dropdown */
        .setting-select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: white;
            font-size: 14px;
            min-width: 120px;
        }

        .setting-select:focus {
            border-color: #2E7D32;
            outline: none;
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
            padding: 10px 20px;
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
            background-color: #2E7D32; /* Green */
            color: white;
        }

        .btn-primary:hover {
            background-color: #1B5E20; /* Darker Green */
        }

        .btn-danger {
            background-color: #F44336; /* Red */
            color: white;
        }

        .btn-danger:hover {
            background-color: #D32F2F; /* Darker Red */
        }

        /* Account Actions */
        .account-actions {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }

        .account-actions h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
        }

        .action-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .action-item:last-child {
            border-bottom: none;
        }

        .action-info {
            flex-grow: 1;
        }

        .action-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }

        .action-description {
            font-size: 14px;
            color: #666;
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

            .settings-sections {
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
            <li><a href="/mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/wallet"><i class="fas fa-wallet"></i> Wallet</a></li>
            <li><a href="/payouts"><i class="fas fa-money-bill-wave"></i> Payouts</a></li>
            <li><a href="/profile"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings" class="active"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Settings</div>
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

            <form method="post">
                <input type="hidden" name="action" value="update_settings">
                
                <div class="settings-sections">
                    <div class="settings-section">
                        <h3><i class="fas fa-bell"></i> Notifications</h3>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Email Notifications</div>
                                <div class="setting-description">Receive email notifications for important updates</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="notifications[]" value="email" <?= isset($_SESSION['user_notifications']['email']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Pick Updates</div>
                                <div class="setting-description">Get notified when your picks are approved or rejected</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="notifications[]" value="pick_updates" <?= isset($_SESSION['user_notifications']['pick_updates']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Contest Alerts</div>
                                <div class="setting-description">Notifications about new contests and results</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="notifications[]" value="contest_alerts" <?= isset($_SESSION['user_notifications']['contest_alerts']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Mentorship Updates</div>
                                <div class="setting-description">Updates about mentorship applications and programs</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="notifications[]" value="mentorship_updates" <?= isset($_SESSION['user_notifications']['mentorship_updates']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3><i class="fas fa-shield-alt"></i> Privacy</h3>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Profile Visibility</div>
                                <div class="setting-description">Control who can see your profile information</div>
                            </div>
                            <div class="setting-control">
                                <select name="privacy[profile_visibility]" class="setting-select">
                                    <option value="public" <?= ($_SESSION['user_privacy']['profile_visibility'] ?? 'public') === 'public' ? 'selected' : '' ?>>Public</option>
                                    <option value="friends" <?= ($_SESSION['user_privacy']['profile_visibility'] ?? 'public') === 'friends' ? 'selected' : '' ?>>Friends Only</option>
                                    <option value="private" <?= ($_SESSION['user_privacy']['profile_visibility'] ?? 'public') === 'private' ? 'selected' : '' ?>>Private</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Show Online Status</div>
                                <div class="setting-description">Let others see when you're online</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="privacy[]" value="show_online_status" <?= isset($_SESSION['user_privacy']['show_online_status']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Allow Messages</div>
                                <div class="setting-description">Allow other users to send you direct messages</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="privacy[]" value="allow_messages" <?= isset($_SESSION['user_privacy']['allow_messages']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Show Earnings</div>
                                <div class="setting-description">Display your earnings on your public profile</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="privacy[]" value="show_earnings" <?= isset($_SESSION['user_privacy']['show_earnings']) ? 'checked' : '' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3><i class="fas fa-cog"></i> Preferences</h3>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Default Currency</div>
                                <div class="setting-description">Choose your preferred currency display</div>
                            </div>
                            <div class="setting-control">
                                <select name="preferences[currency]" class="setting-select">
                                    <option value="GHS" <?= ($_SESSION['user_preferences']['currency'] ?? 'GHS') === 'GHS' ? 'selected' : '' ?>>GHS (Ghana Cedi)</option>
                                    <option value="USD" <?= ($_SESSION['user_preferences']['currency'] ?? 'GHS') === 'USD' ? 'selected' : '' ?>>USD (US Dollar)</option>
                                    <option value="EUR" <?= ($_SESSION['user_preferences']['currency'] ?? 'GHS') === 'EUR' ? 'selected' : '' ?>>EUR (Euro)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Time Zone</div>
                                <div class="setting-description">Set your local time zone</div>
                            </div>
                            <div class="setting-control">
                                <select name="preferences[timezone]" class="setting-select">
                                    <option value="GMT" <?= ($_SESSION['user_preferences']['timezone'] ?? 'GMT') === 'GMT' ? 'selected' : '' ?>>GMT (Greenwich Mean Time)</option>
                                    <option value="GMT+1" <?= ($_SESSION['user_preferences']['timezone'] ?? 'GMT') === 'GMT+1' ? 'selected' : '' ?>>GMT+1 (Central European Time)</option>
                                    <option value="GMT-5" <?= ($_SESSION['user_preferences']['timezone'] ?? 'GMT') === 'GMT-5' ? 'selected' : '' ?>>GMT-5 (Eastern Time)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Language</div>
                                <div class="setting-description">Choose your preferred language</div>
                            </div>
                            <div class="setting-control">
                                <select name="preferences[language]" class="setting-select">
                                    <option value="en" <?= ($_SESSION['user_preferences']['language'] ?? 'en') === 'en' ? 'selected' : '' ?>>English</option>
                                    <option value="fr" <?= ($_SESSION['user_preferences']['language'] ?? 'en') === 'fr' ? 'selected' : '' ?>>Français</option>
                                    <option value="es" <?= ($_SESSION['user_preferences']['language'] ?? 'en') === 'es' ? 'selected' : '' ?>>Español</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <div class="setting-info">
                                <div class="setting-title">Auto-refresh</div>
                                <div class="setting-description">Automatically refresh dashboard data</div>
                            </div>
                            <div class="setting-control">
                                <label class="toggle-switch">
                                    <input type="checkbox" name="preferences[]" value="auto_refresh" <?= isset($_SESSION['user_preferences']['auto_refresh']) ? 'checked' : 'checked' ?>>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-bottom: 30px;">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                </div>
            </form>

            <div class="account-actions">
                <h3><i class="fas fa-exclamation-triangle"></i> Account Actions</h3>
                
                <div class="action-item">
                    <div class="action-info">
                        <div class="action-title">Export Data</div>
                        <div class="action-description">Download a copy of your account data</div>
                    </div>
                    <button class="btn btn-info" onclick="exportData()">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                
                <div class="action-item">
                    <div class="action-info">
                        <div class="action-title">Change Password</div>
                        <div class="action-description">Update your account password</div>
                    </div>
                    <button class="btn btn-info" onclick="changePassword()">
                        <i class="fas fa-key"></i> Change
                    </button>
                </div>
                
                <div class="action-item">
                    <div class="action-info">
                        <div class="action-title">Deactivate Account</div>
                        <div class="action-description">Temporarily disable your account</div>
                    </div>
                    <button class="btn btn-danger" onclick="deactivateAccount()">
                        <i class="fas fa-user-times"></i> Deactivate
                    </button>
                </div>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>⚙️ Account Settings</h4>
                <p>Customize your SmartPicks Pro experience with personalized settings and preferences.</p>
                <p><strong>Current Status:</strong> <?= ucfirst($userSettings['role'] ?? 'user') ?> account | <?= $userSettings['is_verified'] ? 'Verified' : 'Unverified' ?> | Last updated: <?= date('M j, Y', strtotime($userSettings['last_login'] ?? 'now')) ?></p>
            </div>
        </div>
    </div>

    <script>
        function exportData() {
            alert('Export data feature coming soon!');
        }

        function changePassword() {
            window.location.href = '/profile';
        }

        function deactivateAccount() {
            if (confirm('Are you sure you want to deactivate your account? This action can be reversed by contacting support.')) {
                alert('Account deactivation feature coming soon!');
            }
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
