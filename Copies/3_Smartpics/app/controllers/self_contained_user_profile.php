<?php
/**
 * SmartPicks Pro - Self-Contained User Profile
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
$userProfile = [];

try {
    // Get user profile data
    $userProfile = $db->fetch("
        SELECT 
            u.id,
            u.username,
            u.email,
            u.display_name,
            u.role,
            u.created_at,
            u.last_login,
            u.is_verified,
            uw.balance
        FROM users u
        LEFT JOIN user_wallets uw ON u.id = uw.user_id
        WHERE u.id = ?
    ", [$_SESSION['user_id']]);
    
    if (!$userProfile) {
        $error = 'User profile not found.';
    }
    
} catch (Exception $e) {
    $error = 'Error loading profile data: ' . $e->getMessage();
    $logger->error('Profile data loading failed', ['error' => $e->getMessage()]);
}

// Handle profile update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_profile') {
    $displayName = trim($_POST['display_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    try {
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Please enter a valid email address.';
        } elseif (empty($displayName)) {
            $error = 'Display name is required.';
        } else {
            // Check if email is already taken by another user
            $existingUser = $db->fetch("
                SELECT id FROM users 
                WHERE email = ? AND id != ?
            ", [$email, $_SESSION['user_id']]);
            
            if ($existingUser) {
                $error = 'This email is already taken by another user.';
            } else {
                // Update basic profile info
                $db->query("
                    UPDATE users 
                    SET display_name = ?, email = ?, updated_at = NOW()
                    WHERE id = ?
                ", [$displayName, $email, $_SESSION['user_id']]);
                
                // Update password if provided
                if (!empty($newPassword)) {
                    if (empty($currentPassword)) {
                        $error = 'Current password is required to change password.';
                    } elseif ($newPassword !== $confirmPassword) {
                        $error = 'New password and confirmation do not match.';
                    } elseif (strlen($newPassword) < 6) {
                        $error = 'New password must be at least 6 characters long.';
                    } else {
                        // Verify current password (assuming password_hash is used)
                        $user = $db->fetch("SELECT password_hash FROM users WHERE id = ?", [$_SESSION['user_id']]);
                        if ($user && password_verify($currentPassword, $user['password_hash'])) {
                            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                            $db->query("
                                UPDATE users 
                                SET password_hash = ?, updated_at = NOW()
                                WHERE id = ?
                            ", [$hashedPassword, $_SESSION['user_id']]);
                        } else {
                            $error = 'Current password is incorrect.';
                        }
                    }
                }
                
                if (empty($error)) {
                    $success = 'Profile updated successfully!';
                    // Refresh profile data
                    $userProfile = $db->fetch("
                        SELECT 
                            u.id,
                            u.username,
                            u.email,
                            u.display_name,
                            u.role,
                            u.created_at,
                            u.last_login,
                            u.is_verified,
                            uw.balance
                        FROM users u
                        LEFT JOIN user_wallets uw ON u.id = uw.user_id
                        WHERE u.id = ?
                    ", [$_SESSION['user_id']]);
                    
                    // Update session data
                    $_SESSION['display_name'] = $displayName;
                    $_SESSION['email'] = $email;
                }
            }
        }
    } catch (Exception $e) {
        $error = 'Error updating profile: ' . $e->getMessage();
    }
}

// Safely get wallet balance
$walletBalance = $userProfile['balance'] ?? 0.00;

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - SmartPicks Pro</title>
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

        /* Profile Cards */
        .profile-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .profile-card {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        .profile-card h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .profile-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .info-item {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }

        .info-item .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }

        .info-item .value {
            font-size: 16px;
            font-weight: bold;
            color: #2E7D32;
        }

        /* Profile Form */
        .profile-form {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }

        .profile-form h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

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

        .form-control:disabled {
            background-color: #f8f9fa;
            color: #666;
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

        /* Avatar */
        .profile-avatar {
            width: 80px;
            height: 80px;
            background-color: #2E7D32;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 32px;
            margin: 0 auto 20px;
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

            .profile-cards {
                grid-template-columns: 1fr;
            }

            .profile-info {
                grid-template-columns: 1fr;
            }

            .form-row {
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
            <li><a href="/profile" class="active"><i class="fas fa-user"></i> Profile</a></li>
            <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        </ul>
    </div>

    <div class="main-content-wrapper">
        <div class="top-bar">
            <div class="page-title-section">
                <div class="page-title">Profile Management</div>
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

            <div class="profile-cards">
                <div class="profile-card">
                    <h3><i class="fas fa-user"></i> Profile Overview</h3>
                    <div class="profile-avatar">
                        <?= strtoupper(substr($userProfile['display_name'] ?? $userProfile['username'] ?? 'U', 0, 1)) ?>
                    </div>
                    
                    <div class="profile-info">
                        <div class="info-item">
                            <div class="label">Username</div>
                            <div class="value"><?= htmlspecialchars($userProfile['username'] ?? 'N/A') ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Display Name</div>
                            <div class="value"><?= htmlspecialchars($userProfile['display_name'] ?? 'N/A') ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Email</div>
                            <div class="value"><?= htmlspecialchars($userProfile['email'] ?? 'N/A') ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Role</div>
                            <div class="value">
                                <?= ucfirst($userProfile['role'] ?? 'user') ?>
                                <?php if ($userProfile['is_verified'] ?? false): ?>
                                    <span class="badge badge-success">Verified</span>
                                <?php else: ?>
                                    <span class="badge badge-warning">Unverified</span>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="label">Member Since</div>
                            <div class="value"><?= date('M j, Y', strtotime($userProfile['created_at'] ?? 'now')) ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Last Login</div>
                            <div class="value"><?= date('M j, Y H:i', strtotime($userProfile['last_login'] ?? 'now')) ?></div>
                        </div>
                    </div>
                </div>

                <div class="profile-card">
                    <h3><i class="fas fa-chart-line"></i> Account Statistics</h3>
                    <div class="profile-info">
                        <div class="info-item">
                            <div class="label">Wallet Balance</div>
                            <div class="value">GHS <?= number_format($walletBalance, 2) ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Account Status</div>
                            <div class="value">
                                <?php if ($userProfile['is_verified'] ?? false): ?>
                                    <span class="badge badge-success">Active</span>
                                <?php else: ?>
                                    <span class="badge badge-warning">Pending Verification</span>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="label">User ID</div>
                            <div class="value">#<?= $userProfile['id'] ?? 'N/A' ?></div>
                        </div>
                        <div class="info-item">
                            <div class="label">Account Type</div>
                            <div class="value"><?= ucfirst($userProfile['role'] ?? 'user') ?></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="profile-form">
                <h3><i class="fas fa-edit"></i> Update Profile</h3>
                <form method="post">
                    <input type="hidden" name="action" value="update_profile">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="display_name">Display Name</label>
                            <input type="text" name="display_name" id="display_name" class="form-control" value="<?= htmlspecialchars($userProfile['display_name'] ?? '') ?>" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" name="email" id="email" class="form-control" value="<?= htmlspecialchars($userProfile['email'] ?? '') ?>" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" name="username" id="username" class="form-control" value="<?= htmlspecialchars($userProfile['username'] ?? '') ?>" disabled>
                            <small style="color: #666;">Username cannot be changed</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="role">Account Role</label>
                            <input type="text" name="role" id="role" class="form-control" value="<?= ucfirst($userProfile['role'] ?? 'user') ?>" disabled>
                            <small style="color: #666;">Role is assigned by administrators</small>
                        </div>
                    </div>
                    
                    <h4 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Change Password (Optional)</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="current_password">Current Password</label>
                            <input type="password" name="current_password" id="current_password" class="form-control" placeholder="Enter current password">
                        </div>
                        
                        <div class="form-group">
                            <label for="new_password">New Password</label>
                            <input type="password" name="new_password" id="new_password" class="form-control" placeholder="Enter new password">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm_password">Confirm New Password</label>
                        <input type="password" name="confirm_password" id="confirm_password" class="form-control" placeholder="Confirm new password">
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Update Profile
                    </button>
                </form>
            </div>

            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; color: #2e7d32; margin-top: 30px;">
                <h4>👤 Profile Management</h4>
                <p>Keep your profile information up to date. Your display name and email are visible to other users.</p>
                <p><strong>Current Status:</strong> <?= ucfirst($userProfile['role'] ?? 'user') ?> account | <?= $userProfile['is_verified'] ? 'Verified' : 'Unverified' ?> | Member since <?= date('M j, Y', strtotime($userProfile['created_at'] ?? 'now')) ?></p>
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

        // Password confirmation validation
        document.getElementById('confirm_password').addEventListener('input', function() {
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = this.value;
            
            if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    </script>
</body>
</html>
