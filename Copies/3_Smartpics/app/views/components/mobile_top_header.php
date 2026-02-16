<?php
/**
 * Mobile Top Header with Hamburger Menu
 * Shows logo and expandable menu button for mobile
 */

// Detect base URL - only use /SmartPicksPro-Local for local development
$baseUrl = '';
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
    // Only use base path on localhost
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
        $baseUrl = '/SmartPicksPro-Local';
    }
}
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
$userRole = $_SESSION['role'] ?? 'user';

// Determine dashboard title
$dashboardTitle = 'SmartPicks Pro';
if ($userRole === 'admin') {
    $dashboardTitle = 'Admin Dashboard';
} elseif ($userRole === 'tipster') {
    $dashboardTitle = 'Tipster Dashboard';
} else {
    $dashboardTitle = 'User Dashboard';
}

// Get theme colors from settings
require_once __DIR__ . '/../../models/Database.php';
$db = Database::getInstance();
$themeColors = [];
try {
    $settings = $db->fetchAll("
        SELECT setting_key, value 
        FROM platform_settings 
        WHERE setting_key LIKE 'theme_%' OR setting_key LIKE 'mobile_%'
    ");
    
    foreach ($settings as $setting) {
        $themeColors[$setting['setting_key']] = $setting['value'];
    }
} catch (Exception $e) {
    // Default colors
}

$primaryColor = $themeColors['theme_color_primary'] ?? '#d32f2f';
$headerBgColor = $themeColors['mobile_header_bg_color'] ?? '#ffffff';
$headerTextColor = $themeColors['mobile_header_text_color'] ?? '#333333';
$fontFamily = $themeColors['mobile_font_family'] ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
$baseFontSize = $themeColors['mobile_base_font_size'] ?? '14';

?>

<style>
/* Mobile Top Header */
.mobile-top-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: <?php echo htmlspecialchars($headerBgColor); ?>;
    color: <?php echo htmlspecialchars($headerTextColor); ?>;
    padding: 12px 16px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-family: <?php echo htmlspecialchars($fontFamily); ?>;
}

.mobile-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mobile-header-logo {
    font-size: 18px;
    font-weight: 600;
    color: <?php echo htmlspecialchars($primaryColor); ?>;
    display: flex;
    align-items: center;
    gap: 8px;
}

.mobile-header-logo i {
    font-size: 20px;
}

.mobile-menu-toggle-btn {
    background: none;
    border: none;
    color: <?php echo htmlspecialchars($headerTextColor); ?>;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.3s;
}

.mobile-menu-toggle-btn:active {
    color: <?php echo htmlspecialchars($primaryColor); ?>;
}

/* Mobile Sidebar Overlay */
.mobile-sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9998;
    opacity: 0;
    transition: opacity 0.3s;
}

.mobile-sidebar-overlay.active {
    opacity: 1;
}

.mobile-sidebar-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100%;
    background-color: <?php echo htmlspecialchars($primaryColor); ?>;
    z-index: 9999;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
    padding-top: 60px;
    padding-bottom: 80px; /* Space for mobile bottom panel */
    box-sizing: border-box;
}

.mobile-sidebar-menu.open {
    transform: translateX(0);
}

.mobile-sidebar-header {
    padding: 20px;
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 10px;
}

.mobile-sidebar-header h3 {
    color: white;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
}

.mobile-sidebar-menu .sidebar-menu a {
    display: block;
    padding: 16px 20px;
    color: white;
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: background-color 0.3s;
    font-size: <?php echo $baseFontSize; ?>px;
    font-family: <?php echo htmlspecialchars($fontFamily); ?>;
}

.mobile-sidebar-menu .sidebar-menu a:hover,
.mobile-sidebar-menu .sidebar-menu a:active {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
}

.mobile-sidebar-menu .sidebar-menu a.active {
    background-color: rgba(255, 255, 255, 0.2);
}

.mobile-sidebar-menu .sidebar-menu i {
    width: 24px;
    margin-right: 12px;
    font-size: 18px;
}

@media (max-width: 768px) {
    .mobile-top-header {
        display: block;
    }
    
    .main-content {
        padding-top: 60px !important;
    }
    
    .page-header {
        padding-top: 60px !important;
    }
}
</style>

<div class="mobile-top-header">
    <div class="mobile-header-content">
        <div class="mobile-header-logo">
            <i class="fas fa-star"></i>
            <span><?php echo htmlspecialchars($dashboardTitle); ?></span>
        </div>
        <button class="mobile-menu-toggle-btn" onclick="toggleMobileSidebar()" aria-label="Toggle Menu">
            <i class="fas fa-bars" id="mobile-menu-icon"></i>
        </button>
    </div>
</div>

<!-- Mobile Sidebar Overlay -->
<div class="mobile-sidebar-overlay" id="mobile-sidebar-overlay" onclick="closeMobileSidebar()"></div>

<!-- Mobile Sidebar Menu -->
<div class="mobile-sidebar-menu" id="mobile-sidebar-menu">
    <div class="mobile-sidebar-header">
        <h3><i class="fas fa-star"></i> <?php echo htmlspecialchars($dashboardTitle); ?></h3>
    </div>
    <nav class="sidebar-menu">
        <?php
        // Include the appropriate menu component
        if ($userRole === 'admin') {
            include __DIR__ . '/admin_menu.php';
        } elseif ($userRole === 'tipster') {
            include __DIR__ . '/tipster_menu.php';
        } else {
            include __DIR__ . '/user_menu.php';
        }
        ?>
    </nav>
</div>

<script>
function toggleMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar-menu');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const icon = document.getElementById('mobile-menu-icon');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    
    // Change icon
    if (sidebar.classList.contains('open')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('mobile-sidebar-menu');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    const icon = document.getElementById('mobile-menu-icon');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    overlay.style.display = 'none';
    
    icon.classList.remove('fa-times');
    icon.classList.add('fa-bars');
}

// Close sidebar when clicking a menu link
document.addEventListener('DOMContentLoaded', function() {
    const menuLinks = document.querySelectorAll('.mobile-sidebar-menu .sidebar-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            setTimeout(closeMobileSidebar, 300); // Small delay for better UX
        });
    });
});

// Close sidebar on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMobileSidebar();
    }
});
</script>

