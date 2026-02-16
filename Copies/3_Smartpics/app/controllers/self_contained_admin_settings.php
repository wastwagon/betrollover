<?php
/**
 * SmartPicks Pro - Self-Contained Admin Settings
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
$settings = [];

try {
    // Get all settings
    $settings = $db->fetchAll("SELECT * FROM settings ORDER BY `key` ASC");
    
} catch (Exception $e) {
    $error = 'Error loading settings: ' . $e->getMessage();
    $logger->error('Settings loading failed', ['error' => $e->getMessage()]);
}

// Handle settings update
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_settings') {
        try {
            $updatedCount = 0;
            foreach ($_POST as $key => $value) {
                if (strpos($key, 'setting_') === 0) {
                    $settingKey = substr($key, 8); // Remove 'setting_' prefix
                    $result = $db->query("UPDATE settings SET value = ? WHERE `key` = ?", [$value, $settingKey]);
                    if ($result) {
                        $updatedCount++;
                    }
                }
            }
            
            if ($updatedCount > 0) {
                $success = "Successfully updated {$updatedCount} settings!";
                // Refresh settings
                $settings = $db->fetchAll("SELECT * FROM settings ORDER BY `key` ASC");
            } else {
                $error = 'No settings were updated.';
            }
        } catch (Exception $e) {
            $error = 'Error updating settings: ' . $e->getMessage();
        }
    } elseif ($action === 'upload_logo') {
        try {
            if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../public/images/';
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
                $maxSize = 2 * 1024 * 1024; // 2MB
                
                if (!in_array($_FILES['logo']['type'], $allowedTypes)) {
                    throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and SVG are allowed.');
                }
                
                if ($_FILES['logo']['size'] > $maxSize) {
                    throw new Exception('File size too large. Maximum 2MB allowed.');
                }
                
                $fileExtension = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
                $fileName = 'platform-logo.' . $fileExtension;
                $filePath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['logo']['tmp_name'], $filePath)) {
                    // Update logo setting
                    $db->query("INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('platform_logo', ?, 'string', 'Platform logo file path') ON DUPLICATE KEY UPDATE `value` = ?", [$fileName, $fileName]);
                    $success = 'Logo uploaded successfully!';
                } else {
                    throw new Exception('Failed to upload logo file.');
                }
            } else {
                throw new Exception('No logo file uploaded or upload error occurred.');
            }
        } catch (Exception $e) {
            $error = 'Error uploading logo: ' . $e->getMessage();
        }
    } elseif ($action === 'reset_logo') {
        try {
            $db->query("UPDATE settings SET value = 'default-logo.png' WHERE `key` = 'platform_logo'");
            $success = 'Logo reset to default successfully!';
        } catch (Exception $e) {
            $error = 'Error resetting logo: ' . $e->getMessage();
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
    <title>System Settings - SmartPicks Pro</title>
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
            <li><a href="/admin_contests"><i class="fas fa-trophy"></i> Contests</a></li>
            <li><a href="/admin_mentorship"><i class="fas fa-graduation-cap"></i> Mentorship</a></li>
            <li><a href="/admin_support"><i class="fas fa-headset"></i> Support</a></li>
            <li><a href="/admin_settings" class="active"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">System Settings</div>
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
                    <div class="card-title">Total Settings</div>
                    <div class="card-value">
                        <?= count($settings) ?>
                        <i class="fas fa-cog"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">System Status</div>
                    <div class="card-value">
                        <?php
                        $maintenanceMode = false;
                        foreach ($settings as $setting) {
                            if ($setting['key'] === 'maintenance_mode' && $setting['value'] === 'true') {
                                $maintenanceMode = true;
                                break;
                            }
                        }
                        echo $maintenanceMode ? 'Maintenance' : 'Active';
                        ?>
                        <i class="fas fa-server"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Commission Rate</div>
                    <div class="card-value">
                        <?php
                        $commissionRate = '30.0';
                        foreach ($settings as $setting) {
                            if ($setting['key'] === 'commission_rate') {
                                $commissionRate = $setting['value'];
                                break;
                            }
                        }
                        echo $commissionRate . '%';
                        ?>
                        <i class="fas fa-percentage"></i>
                    </div>
                </div>
                
                <div class="kpi-card">
                    <div class="card-title">Registration</div>
                    <div class="card-value">
                        <?php
                        $registrationEnabled = true;
                        foreach ($settings as $setting) {
                            if ($setting['key'] === 'registration_enabled' && $setting['value'] === 'false') {
                                $registrationEnabled = false;
                                break;
                            }
                        }
                        echo $registrationEnabled ? 'Enabled' : 'Disabled';
                        ?>
                        <i class="fas fa-user-plus"></i>
                    </div>
                </div>
            </div>

            <div class="table-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #333;">System Settings</h3>
                    <button class="btn btn-success" onclick="saveAllSettings()">
                        <i class="fas fa-save"></i> Save All Changes
                    </button>
                </div>

                <form method="post" id="settingsForm">
                    <input type="hidden" name="action" value="update_settings">
                    
                    <?php if (!empty($settings)): ?>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Setting</th>
                                    <th>Value</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($settings as $setting): ?>
                                    <tr>
                                        <td>
                                            <strong><?= htmlspecialchars(ucwords(str_replace('_', ' ', $setting['key']))) ?></strong>
                                        </td>
                                        <td>
                                            <?php if ($setting['type'] === 'boolean'): ?>
                                                <select name="setting_<?= htmlspecialchars($setting['key']) ?>" style="padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                                                    <option value="true" <?= $setting['value'] === 'true' ? 'selected' : '' ?>>Enabled</option>
                                                    <option value="false" <?= $setting['value'] === 'false' ? 'selected' : '' ?>>Disabled</option>
                                                </select>
                                            <?php elseif ($setting['type'] === 'number'): ?>
                                                <input type="number" name="setting_<?= htmlspecialchars($setting['key']) ?>" 
                                                       value="<?= htmlspecialchars($setting['value']) ?>" 
                                                       step="0.01" style="padding: 5px; border: 1px solid #ddd; border-radius: 4px; width: 100px;">
                                            <?php else: ?>
                                                <input type="text" name="setting_<?= htmlspecialchars($setting['key']) ?>" 
                                                       value="<?= htmlspecialchars($setting['value']) ?>" 
                                                       style="padding: 5px; border: 1px solid #ddd; border-radius: 4px; min-width: 200px;">
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <span class="badge badge-info"><?= ucfirst($setting['type']) ?></span>
                                        </td>
                                        <td>
                                            <small style="color: #666;"><?= htmlspecialchars($setting['description'] ?? 'No description') ?></small>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-cog" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                            <h4>No Settings Found</h4>
                            <p>System settings will appear here once configured.</p>
                        </div>
                    <?php endif; ?>
                </form>
            </div>

            <!-- Logo Management Section -->
            <div class="table-container" style="margin-top: 30px;">
                <h3 style="margin-bottom: 15px; color: #333;">Logo Management</h3>
                
                <?php
                // Get current logo setting
                $currentLogo = 'default-logo.png';
                foreach ($settings as $setting) {
                    if ($setting['key'] === 'platform_logo') {
                        $currentLogo = $setting['value'];
                        break;
                    }
                }
                ?>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h4 style="margin-bottom: 15px; color: #333;">Current Logo</h4>
                        <div style="text-align: center; padding: 20px; border: 2px dashed #ddd; border-radius: 8px;">
                            <img src="/public/images/<?= htmlspecialchars($currentLogo) ?>" 
                                 alt="Current Logo" 
                                 id="current-logo"
                                 style="max-width: 200px; max-height: 100px; object-fit: contain;">
                            <img id="logo-preview" 
                                 alt="Logo Preview" 
                                 style="max-width: 200px; max-height: 100px; object-fit: contain; display: none;">
                            <p style="margin-top: 10px; color: #666; font-size: 14px;">
                                Current Logo: <?= htmlspecialchars($currentLogo) ?>
                            </p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 15px; color: #333;">Upload New Logo</h4>
                        <form method="post" enctype="multipart/form-data" style="margin-bottom: 15px;">
                            <input type="hidden" name="action" value="upload_logo">
                            <div style="margin-bottom: 15px;">
                                <label for="logo" style="display: block; margin-bottom: 5px; font-weight: 600;">Select Logo File:</label>
                                <input type="file" id="logo" name="logo" accept="image/*" required 
                                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <small style="color: #666; font-size: 12px;">
                                    Supported formats: JPEG, PNG, GIF, SVG. Max size: 2MB
                                </small>
                            </div>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-upload"></i> Upload Logo
                            </button>
                        </form>
                        
                        <form method="post" style="display: inline;">
                            <input type="hidden" name="action" value="reset_logo">
                            <button type="submit" class="btn btn-warning" onclick="return confirm('Reset to default logo?')">
                                <i class="fas fa-undo"></i> Reset to Default
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
                <div class="table-container">
                    <h3 style="margin-bottom: 15px; color: #333;">Quick Actions</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button class="btn btn-warning" onclick="toggleMaintenanceMode()">
                            <i class="fas fa-tools"></i> Toggle Maintenance Mode
                        </button>
                        <button class="btn btn-info" onclick="clearCache()">
                            <i class="fas fa-trash"></i> Clear System Cache
                        </button>
                        <button class="btn btn-primary" onclick="backupDatabase()">
                            <i class="fas fa-download"></i> Backup Database
                        </button>
                        <button class="btn btn-success" onclick="optimizeDatabase()">
                            <i class="fas fa-tachometer-alt"></i> Optimize Database
                        </button>
                        <button class="btn btn-danger" onclick="resetAllSettings()">
                            <i class="fas fa-exclamation-triangle"></i> Reset All Settings
                        </button>
                    </div>
                </div>
                
                <div class="table-container">
                    <h3 style="margin-bottom: 15px; color: #333;">System Information</h3>
                    <table class="data-table">
                        <tbody>
                            <tr>
                                <td><strong>PHP Version</strong></td>
                                <td><?= PHP_VERSION ?></td>
                            </tr>
                            <tr>
                                <td><strong>Server Software</strong></td>
                                <td><?= $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown' ?></td>
                            </tr>
                            <tr>
                                <td><strong>Database Status</strong></td>
                                <td><span class="badge badge-success">Connected</span></td>
                            </tr>
                            <tr>
                                <td><strong>Platform Version</strong></td>
                                <td><?= $settings[array_search('app_version', array_column($settings, 'key'))]['value'] ?? '1.0.0' ?></td>
                            </tr>
                            <tr>
                                <td><strong>Last Updated</strong></td>
                                <td><?= date('Y-m-d H:i:s') ?></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Advanced Platform Controls -->
            <div class="table-container" style="margin-top: 30px;">
                <h3 style="margin-bottom: 15px; color: #333;">Advanced Platform Controls</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                        <h4 style="margin-bottom: 10px; color: #333;">
                            <i class="fas fa-users" style="color: #D32F2F;"></i> User Management
                        </h4>
                        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                            Control user registration, verification, and account management.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="manageUsers()">
                                <i class="fas fa-cog"></i> User Settings
                            </button>
                            <button class="btn btn-info btn-sm" onclick="manageVerification()">
                                <i class="fas fa-check-circle"></i> Verification Rules
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                        <h4 style="margin-bottom: 10px; color: #333;">
                            <i class="fas fa-chart-line" style="color: #D32F2F;"></i> Pick Management
                        </h4>
                        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                            Configure pick creation rules, approval process, and marketplace settings.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="managePicks()">
                                <i class="fas fa-cog"></i> Pick Rules
                            </button>
                            <button class="btn btn-info btn-sm" onclick="manageMarketplace()">
                                <i class="fas fa-store"></i> Marketplace
                            </button>
                        </div>
                    </div>
                    
                    <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                        <h4 style="margin-bottom: 10px; color: #333;">
                            <i class="fas fa-dollar-sign" style="color: #D32F2F;"></i> Financial Controls
                        </h4>
                        <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                            Manage commission rates, payout limits, and financial policies.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="manageFinance()">
                                <i class="fas fa-cog"></i> Finance Rules
                            </button>
                            <button class="btn btn-info btn-sm" onclick="managePayouts()">
                                <i class="fas fa-money-bill-wave"></i> Payouts
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="alert alert-info" style="margin-top: 30px;">
                <h4>⚙️ System Settings</h4>
                <p>Configure platform-wide settings including commission rates, maintenance mode, and feature toggles.</p>
                <p><strong>Warning:</strong> Changes to critical settings may affect platform functionality. Test changes in a staging environment first.</p>
            </div>
        </div>
    </div>

    <script>
    function saveAllSettings() {
        if (confirm('Save all setting changes? This will update the system configuration.')) {
            document.getElementById('settingsForm').submit();
        }
    }

    function toggleMaintenanceMode() {
        if (confirm('Toggle maintenance mode? This will affect all users.')) {
            alert('Maintenance mode toggle coming soon!');
        }
    }

    function clearCache() {
        if (confirm('Clear system cache? This may temporarily slow down the platform.')) {
            alert('Cache clearing coming soon!');
        }
    }

    function backupDatabase() {
        if (confirm('Create database backup? This may take a few minutes.')) {
            alert('Database backup coming soon!');
        }
    }

    function optimizeDatabase() {
        if (confirm('Optimize database? This may temporarily slow down the platform.')) {
            alert('Database optimization coming soon!');
        }
    }

    function resetAllSettings() {
        if (confirm('Reset all settings to default values? This action cannot be undone!')) {
            alert('Settings reset functionality coming soon!');
        }
    }

    // Advanced Platform Control Functions
    function manageUsers() {
        alert('User management settings coming soon!');
    }

    function manageVerification() {
        alert('Verification rules management coming soon!');
    }

    function managePicks() {
        alert('Pick rules management coming soon!');
    }

    function manageMarketplace() {
        alert('Marketplace settings coming soon!');
    }

    function manageFinance() {
        alert('Finance rules management coming soon!');
    }

    function managePayouts() {
        alert('Payout management coming soon!');
    }

    // Logo preview functionality
    function previewLogo(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('logo-preview');
                const current = document.getElementById('current-logo');
                if (preview && current) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    current.style.display = 'none';
                }
            };
            reader.readAsDataURL(input.files[0]);
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

    // Add logo preview to file input
    document.addEventListener('DOMContentLoaded', function() {
        const logoInput = document.getElementById('logo');
        if (logoInput) {
            logoInput.addEventListener('change', function() {
                previewLogo(this);
            });
        }
    });
    </script>
</body>
</html>
