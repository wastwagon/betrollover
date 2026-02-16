<?php
/**
 * Admin Layout - Clean, Simple Layout for Admin Dashboard
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
    <title><?php echo isset($pageTitle) ? $pageTitle . ' - SmartPicks Pro Admin' : 'SmartPicks Pro Admin'; ?></title>
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
        
        .admin-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .admin-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #d32f2f;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
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
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }
        
        .btn-warning {
            background-color: #ffc107;
            color: #212529;
        }
        
        .btn-warning:hover {
            background-color: #e0a800;
            color: #212529;
            text-decoration: none;
        }
        
        .btn-danger {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background-color: #c82333;
            color: white;
            text-decoration: none;
        }
        
        /* Success/Error Messages */
        .success-message {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        .error-message {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        
        /* Forms */
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #d32f2f;
            box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
        }
        
        /* Grid */
        .grid {
            display: grid;
            gap: 20px;
        }
        
        .grid-2 {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        .grid-3 {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        }
        
        .grid-4 {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        
        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background-color: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.05);
            transition: box-shadow 0.3s ease;
        }
        
        .stat-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        
        .stat-number {
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
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 15% auto;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .close {
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: #000;
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
            <h2><i class="fas fa-crown"></i> Admin Dashboard</h2>
        </div>
        <nav class="sidebar-menu">
            <?php include __DIR__ . '/../components/admin_menu.php'; ?>
        </nav>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
        <div class="page-header">
            <h1 class="page-title"><?php echo isset($pageTitle) ? $pageTitle : 'Admin Dashboard'; ?></h1>
            <div class="admin-info">
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
                <div class="admin-avatar">
                    <?php echo isset($user) ? strtoupper(substr($user['username'], 0, 1)) : 'A'; ?>
                </div>
            </div>
        </div>
        
        <div class="content-area">
            <?php echo isset($content) ? $content : ''; ?>
        </div>
        
        <div class="footer">
            <p>&copy; <?php echo date('Y'); ?> SmartPicks Pro Admin. All rights reserved.</p>
        </div>
    </div>
    
    <script>
        // Detect base URL
        const baseUrl = window.location.pathname.includes('/SmartPicksPro-Local') ? '/SmartPicksPro-Local' : '';
        
        // Notification System
        let notificationPollInterval = null;
        let lastNotificationCheck = null;
        
        function toggleNotificationDropdown() {
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown.style.display === 'none') {
                dropdown.style.display = 'flex';
                loadNotifications();
            } else {
                dropdown.style.display = 'none';
            }
        }
        
        function loadNotifications() {
            const list = document.getElementById('notificationList');
            list.innerHTML = '<div class="notification-loading">Loading notifications...</div>';
            
            fetch(baseUrl + '/api/get_notifications.php?limit=10')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        displayNotifications(data.notifications);
                        updateBadge(data.unread_count);
                        lastNotificationCheck = data.timestamp;
                    } else {
                        list.innerHTML = '<div class="notification-empty">Failed to load notifications</div>';
                    }
                })
                .catch(error => {
                    console.error('Error loading notifications:', error);
                    list.innerHTML = '<div class="notification-empty">Error loading notifications</div>';
                });
        }
        
        function displayNotifications(notifications) {
            const list = document.getElementById('notificationList');
            
            if (notifications.length === 0) {
                list.innerHTML = '<div class="notification-empty">No notifications</div>';
                return;
            }
            
            list.innerHTML = notifications.map(n => {
                const iconColors = {
                    'pick_approved': '#2e7d32',
                    'pick_rejected': '#d32f2f',
                    'pick_purchased': '#1976d2',
                    'pick_settled': '#f57c00',
                    'wallet_deposit': '#2e7d32',
                    'wallet_withdrawal': '#1976d2',
                    'tipster_verified': '#2e7d32',
                    'system_announcement': '#1976d2'
                };
                const iconColor = iconColors[n.type] || '#1976d2';
                const iconClass = getIconClass(n.icon);
                const unreadClass = !n.is_read ? 'unread' : '';
                const link = n.link ? (baseUrl + n.link) : '#';
                
                return `
                    <div class="notification-item ${unreadClass}" onclick="handleNotificationClick(${n.id}, '${link}')">
                        <div class="notification-icon" style="background-color: ${iconColor};">
                            <i class="fas fa-${iconClass}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${escapeHtml(n.title)}</div>
                            <div class="notification-message">${escapeHtml(n.message)}</div>
                            <div class="notification-time">${n.time_ago || 'Just now'}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function getIconClass(icon) {
            const iconMap = {
                'check-circle': 'check-circle',
                'times-circle': 'times-circle',
                'shopping-cart': 'shopping-cart',
                'trophy': 'trophy',
                'arrow-down': 'arrow-down',
                'arrow-up': 'arrow-up',
                'plus-circle': 'plus-circle',
                'money-bill-wave': 'money-bill-wave',
                'bullhorn': 'bullhorn',
                'exclamation-triangle': 'exclamation-triangle',
                'hand-holding-usd': 'hand-holding-usd',
                'bell': 'bell'
            };
            return iconMap[icon] || 'bell';
        }
        
        function handleNotificationClick(notificationId, link) {
            fetch(baseUrl + '/api/mark_notification_read.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({notification_id: notificationId})
            });
            
            if (link && link !== '#') {
                window.location.href = link;
            }
        }
        
        function markAllNotificationsRead() {
            fetch(baseUrl + '/api/mark_notification_read.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({mark_all: true})
            })
            .then(() => {
                loadNotifications();
            });
        }
        
        function updateBadge(count) {
            const badge = document.getElementById('notificationBadge');
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        function checkNewNotifications() {
            const since = lastNotificationCheck || new Date(Date.now() - 60000).toISOString();
            fetch(baseUrl + '/api/get_notifications.php?limit=1&since=' + since)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (data.notifications.length > 0) {
                            updateBadge(data.unread_count);
                            if (Notification.permission === 'granted') {
                                data.notifications.forEach(n => {
                                    new Notification(n.title, {
                                        body: n.message,
                                        icon: '/favicon.ico'
                                    });
                                });
                            }
                        }
                        lastNotificationCheck = data.timestamp;
                    }
                })
                .catch(error => console.error('Error checking notifications:', error));
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            fetch(baseUrl + '/api/get_notifications.php?limit=1')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateBadge(data.unread_count);
                        lastNotificationCheck = data.timestamp;
                    }
                });
            
            notificationPollInterval = setInterval(checkNewNotifications, 30000);
            
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
            document.addEventListener('click', function(event) {
                const container = document.querySelector('.notification-container');
                const dropdown = document.getElementById('notificationDropdown');
                if (container && dropdown && !container.contains(event.target)) {
                    dropdown.style.display = 'none';
                }
            });
        });
        
        window.addEventListener('beforeunload', function() {
            if (notificationPollInterval) {
                clearInterval(notificationPollInterval);
            }
        });
        
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
    
    <!-- Mobile Bottom Panel Menu -->
    <?php include __DIR__ . '/../components/mobile_panel_menu.php'; ?>
</body>
</html>