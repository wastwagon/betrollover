<?php
/**
 * Tipster Layout - Clean, Simple Layout for Tipster Dashboard
 * Theme: Red (#d32f2f), White (#ffffff), Green (#2e7d32)
 * Design: Clean, professional, mobile-first, no gradients
 */

// Detect base URL
$baseUrl = '';
if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($pageTitle) ? $pageTitle . ' - SmartPicks Pro Tipster' : 'SmartPicks Pro Tipster'; ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333333;
            display: flex;
            min-height: 100vh;
            font-size: 14px;
            line-height: 1.5;
        }
        
        /* Premium Typography System */
        h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.2;
            margin: 0 0 0.5em 0;
        }
        
        h1 { font-size: 24px; }
        h2 { font-size: 20px; }
        h3 { font-size: 18px; }
        h4 { font-size: 16px; }
        h5 { font-size: 14px; }
        h6 { font-size: 12px; }
        
        p {
            font-size: 14px;
            line-height: 1.6;
            margin: 0 0 1em 0;
        }
        
        .text-sm { font-size: 12px; }
        .text-base { font-size: 14px; }
        .text-lg { font-size: 16px; }
        .text-xl { font-size: 18px; }
        .text-2xl { font-size: 20px; }
        .text-3xl { font-size: 24px; }
        
        /* Sidebar */
        .sidebar {
            width: 250px;
            background-color: #d32f2f;
            color: white;
            padding: 0;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
        }
        
        .sidebar-header {
            padding: 20px;
            background-color: #b71c1c;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .sidebar-header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        
        .sidebar-menu {
            padding: 0;
        }
        
        .sidebar-menu a {
            display: block;
            padding: 15px 20px;
            color: white;
            text-decoration: none;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            transition: background-color 0.3s;
        }
        
        .sidebar-menu a:hover {
            background-color: rgba(255,255,255,0.1);
            color: white;
            text-decoration: none;
        }
        
        .sidebar-menu a.active {
            background-color: rgba(255,255,255,0.2);
        }
        
        .sidebar-menu i {
            width: 20px;
            margin-right: 10px;
        }
        
        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: 250px;
            padding: 0;
            background-color: #f5f5f5;
        }
        
        .page-header {
            background-color: white;
            padding: 20px 30px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .page-title {
            font-size: 20px;
            font-weight: 600;
            color: #d32f2f;
        }
        
        .tipster-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .tipster-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #d32f2f;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            overflow: hidden;
            border: 2px solid #d32f2f;
        }
        
        .tipster-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }
        
        .wallet-info {
            background-color: #e8f5e8;
            padding: 10px 15px;
            border-radius: 5px;
            color: #2e7d32;
            font-weight: 600;
        }
        
        .content-area {
            padding: 30px;
        }
        
        /* Mobile Menu */
        .mobile-menu-toggle {
            display: none;
            background-color: #d32f2f;
            color: white;
            border: none;
            padding: 10px;
            font-size: 18px;
            cursor: pointer;
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1001;
        }
        
        /* Footer */
        .footer {
            background-color: #f5f5f5;
            padding: 20px 30px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            margin-top: auto;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s;
                padding-bottom: 80px; /* Space for mobile bottom panel */
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
            
            .main-content {
                margin-left: 0;
            }
            
            .mobile-menu-toggle {
                display: none; /* Hide old toggle, use mobile header instead */
            }
            
            .page-header {
                padding: 15px 20px;
            }
            
            .content-area {
                padding: 20px;
            }
        }
        
        /* Cards */
        .card {
            background-color: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.05);
            transition: box-shadow 0.3s ease;
        }
        
        .card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        
        .card h2 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 12px;
        }
        
        .card h3 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 12px;
        }
        
        /* Statistics Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            text-align: left;
            padding: 20px;
            position: relative;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            margin: 8px 0 4px 0;
            line-height: 1.2;
        }
        
        .stat-label {
            font-size: 13px;
            color: #666;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Premium Number Display */
        .number-large {
            font-size: 32px;
            font-weight: 700;
            line-height: 1.2;
        }
        
        .number-medium {
            font-size: 24px;
            font-weight: 600;
            line-height: 1.2;
        }
        
        .number-small {
            font-size: 18px;
            font-weight: 600;
            line-height: 1.2;
        }
        
        /* Consistent Label Styles */
        .label {
            font-size: 13px;
            color: #666;
            font-weight: 500;
            margin-bottom: 4px;
            display: block;
        }
        
        .value {
            font-size: 16px;
            color: #333;
            font-weight: 500;
        }
        
        .value-large {
            font-size: 20px;
            color: #333;
            font-weight: 600;
        }
        
        /* Buttons */
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            transition: background-color 0.3s;
        }
        
        .btn-primary {
            background-color: #d32f2f;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #b71c1c;
            color: white;
            text-decoration: none;
        }
        
        .btn-success {
            background-color: #2e7d32;
            color: white;
        }
        
        .btn-success:hover {
            background-color: #1b5e20;
            color: white;
            text-decoration: none;
        }
        
        .btn-secondary {
            background-color: #666;
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #555;
            color: white;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <!-- Mobile Top Header with Hamburger Menu -->
    <?php include __DIR__ . '/../components/mobile_top_header.php'; ?>
    
    <!-- Mobile Menu Toggle (for desktop sidebar on mobile) -->
    <button class="mobile-menu-toggle" onclick="toggleSidebar()">
        <i class="fas fa-bars"></i>
    </button>
    
    <!-- Sidebar -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h2><i class="fas fa-star"></i> Tipster Dashboard</h2>
        </div>
        <nav class="sidebar-menu">
            <?php include __DIR__ . '/../components/tipster_menu.php'; ?>
        </nav>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <div class="page-header">
            <h1 class="page-title"><?php echo isset($pageTitle) ? $pageTitle : 'Tipster Dashboard'; ?></h1>
            <div class="tipster-info">
                <div class="wallet-info">
                    <i class="fas fa-wallet"></i> GHS <?php echo isset($walletBalance) ? number_format($walletBalance, 2) : '0.00'; ?>
                </div>
                <!-- Notification Bell -->
                <div class="notification-container">
                    <div class="notification-bell" id="notificationBell" onclick="toggleNotificationDropdown()">
                        <i class="fas fa-bell"></i>
                        <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
                    </div>
                    <div class="notification-dropdown" id="notificationDropdown" style="display: none;">
                        <div class="notification-header">
                            <h3>Notifications</h3>
                            <div class="notification-actions">
                                <button onclick="markAllNotificationsRead()" class="btn-mark-all">Mark all as read</button>
                                <a href="<?php echo $baseUrl; ?>/notifications" class="btn-view-all">View all</a>
                            </div>
                        </div>
                        <div class="notification-list" id="notificationList">
                            <div class="notification-loading">Loading notifications...</div>
                        </div>
                        <div class="notification-footer">
                            <a href="<?php echo $baseUrl; ?>/notifications">View all notifications</a>
                        </div>
                    </div>
                </div>
                <div class="tipster-avatar">
                    <?php 
                    $avatarPath = '';
                    $usernameInitial = 'T';
                    
                    if (isset($user)) {
                        $usernameInitial = strtoupper(substr($user['username'] ?? 'T', 0, 1));
                        
                        // Check for avatar in different possible column names
                        if (!empty($user['avatar'])) {
                            $avatarPath = $user['avatar'];
                        } elseif (!empty($user['profile_image'])) {
                            $avatarPath = $user['profile_image'];
                        } elseif (!empty($user['avatar_url'])) {
                            $avatarPath = $user['avatar_url'];
                        }
                        
                        // If avatar exists, show image
                        if (!empty($avatarPath)) {
                            // Handle different path formats
                            if (strpos($avatarPath, '/SmartPicksPro-Local/') === 0 || strpos($avatarPath, 'http') === 0) {
                                // Already full URL or absolute path
                                $avatarUrl = $avatarPath;
                            } elseif (strpos($avatarPath, 'storage/') === 0 || strpos($avatarPath, '/storage/') === 0) {
                                // Path starts with storage/ - add base path
                                $avatarUrl = '/SmartPicksPro-Local/' . ltrim($avatarPath, '/');
                            } elseif (strpos($avatarPath, '/') === 0) {
                                // Absolute path from root
                                $avatarUrl = '/SmartPicksPro-Local' . $avatarPath;
                            } else {
                                // Relative path - assume it's in storage/uploads/
                                $avatarUrl = '/SmartPicksPro-Local/storage/uploads/' . $avatarPath;
                            }
                            echo '<img src="' . htmlspecialchars($avatarUrl) . '" alt="Profile Image" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';"><span style="display: none;">' . $usernameInitial . '</span>';
                        } else {
                            // Show initial letter
                            echo htmlspecialchars($usernameInitial);
                        }
                    } else {
                        echo htmlspecialchars($usernameInitial);
                    }
                    ?>
                </div>
            </div>
        </div>
        
        <div class="content-area">
            <?php echo isset($content) ? $content : ''; ?>
        </div>
        
        <div class="footer">
            <p>&copy; <?php echo date('Y'); ?> SmartPicks Pro Tipster. All rights reserved.</p>
        </div>
    </div>
    
    <!-- Mobile Bottom Panel Menu -->
    <?php include __DIR__ . '/../components/mobile_panel_menu.php'; ?>
    
    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.querySelector('.mobile-menu-toggle');
            
            if (window.innerWidth <= 768 && 
                !sidebar.contains(event.target) && 
                !toggle.contains(event.target)) {
                sidebar.classList.remove('open');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            const sidebar = document.getElementById('sidebar');
            if (window.innerWidth > 768) {
                sidebar.classList.remove('open');
            }
        });
    </script>
</body>
</html>
