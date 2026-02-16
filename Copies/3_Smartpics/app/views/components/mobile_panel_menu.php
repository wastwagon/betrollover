<?php
/**
 * Mobile Bottom Panel Menu Component
 * Fixed bottom navigation for mobile devices
 */

require_once __DIR__ . '/../../models/Database.php';

$db = Database::getInstance();
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

// Get mobile panel settings from database
$mobilePanelSettings = [];
try {
    $settings = $db->fetchAll("
        SELECT setting_key, value 
        FROM platform_settings 
        WHERE setting_key LIKE 'mobile_panel_%'
    ");
    
    foreach ($settings as $setting) {
        $mobilePanelSettings[$setting['setting_key']] = $setting['value'];
    }
} catch (Exception $e) {
    // Default settings if table doesn't exist
}

// Default menu items for each role
$allMenuItems = [];

if ($userRole === 'admin') {
    $allMenuItems = [
        ['key' => 'dashboard', 'url' => "$baseUrl/admin_dashboard", 'icon' => 'fas fa-home', 'text' => 'Home'],
        ['key' => 'approve', 'url' => "$baseUrl/admin_approve_pick", 'icon' => 'fas fa-clock', 'text' => 'Approvals'],
        ['key' => 'picks', 'url' => "$baseUrl/admin_picks", 'icon' => 'fas fa-list', 'text' => 'Picks'],
        ['key' => 'users', 'url' => "$baseUrl/admin_users", 'icon' => 'fas fa-users', 'text' => 'Users'],
        ['key' => 'settings', 'url' => "$baseUrl/admin_settings", 'icon' => 'fas fa-cog', 'text' => 'Settings']
    ];
} elseif ($userRole === 'tipster') {
    $allMenuItems = [
        ['key' => 'dashboard', 'url' => "$baseUrl/tipster_dashboard", 'icon' => 'fas fa-home', 'text' => 'Home'],
        ['key' => 'create_pick', 'url' => "$baseUrl/create_pick", 'icon' => 'fas fa-plus-circle', 'text' => 'Create'],
        ['key' => 'my_picks', 'url' => "$baseUrl/my_picks", 'icon' => 'fas fa-list', 'text' => 'Picks'],
        ['key' => 'wallet', 'url' => "$baseUrl/wallet", 'icon' => 'fas fa-wallet', 'text' => 'Wallet'],
        ['key' => 'profile', 'url' => "$baseUrl/profile", 'icon' => 'fas fa-user', 'text' => 'Profile']
    ];
} else {
    $allMenuItems = [
        ['key' => 'dashboard', 'url' => "$baseUrl/user_dashboard", 'icon' => 'fas fa-home', 'text' => 'Home'],
        ['key' => 'marketplace', 'url' => "$baseUrl/marketplace", 'icon' => 'fas fa-store', 'text' => 'Market'],
        ['key' => 'wallet', 'url' => "$baseUrl/wallet", 'icon' => 'fas fa-wallet', 'text' => 'Wallet'],
        ['key' => 'chat', 'url' => "$baseUrl/public_chat", 'icon' => 'fas fa-comments', 'text' => 'Chat'],
        ['key' => 'profile', 'url' => "$baseUrl/profile", 'icon' => 'fas fa-user', 'text' => 'Profile']
    ];
}

// Get enabled items from settings (JSON array)
$enabledItemsJson = $mobilePanelSettings['mobile_panel_items_' . $userRole] ?? '';
if (!empty($enabledItemsJson)) {
    $enabledKeys = json_decode($enabledItemsJson, true);
    if (is_array($enabledKeys) && !empty($enabledKeys)) {
        // Filter menu items to only show enabled ones
        $filteredItems = [];
        foreach ($enabledKeys as $key) {
            foreach ($allMenuItems as $item) {
                if ($item['key'] === $key) {
                    $filteredItems[] = $item;
                    break;
                }
            }
        }
        if (!empty($filteredItems)) {
            $allMenuItems = $filteredItems;
        }
    }
} else {
    // Default: use first 5 items if no settings
    $allMenuItems = array_slice($allMenuItems, 0, 5);
}

// Check if mobile panel is enabled for this role
$isEnabled = $mobilePanelSettings['mobile_panel_enabled_' . $userRole] ?? '1';
if ($isEnabled === '0' || $isEnabled === 'false') {
    return; // Don't show mobile panel if disabled
}

// Get theme colors and fonts from settings
$primaryColor = $mobilePanelSettings['theme_color_primary'] ?? '#d32f2f';
$secondaryColor = $mobilePanelSettings['theme_color_secondary'] ?? '#2e7d32';
$backgroundColor = $mobilePanelSettings['mobile_panel_bg_color'] ?? '#1a1a1a';
$fontFamily = $mobilePanelSettings['mobile_font_family'] ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
$baseFontSize = $mobilePanelSettings['mobile_base_font_size'] ?? '14';
?>

<style>
/* Mobile Bottom Panel Menu */
.mobile-bottom-panel {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: <?php echo htmlspecialchars($backgroundColor); ?>;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 0;
    z-index: 9999;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    font-family: <?php echo htmlspecialchars($fontFamily); ?>;
}

.mobile-bottom-panel-nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    max-width: 100%;
    margin: 0 auto;
}

.mobile-panel-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 8px 4px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s ease;
    min-height: 60px;
    border-radius: 8px;
    margin: 0 4px;
}

.mobile-panel-item:active {
    background-color: rgba(255, 255, 255, 0.1);
}

.mobile-panel-item.active {
    color: <?php echo htmlspecialchars($primaryColor); ?>;
}

.mobile-panel-item i {
    font-size: 20px;
    margin-bottom: 4px;
    display: block;
}

.mobile-panel-item span {
    font-size: <?php echo max(10, (int)$baseFontSize - 3); ?>px;
    font-weight: 500;
    text-align: center;
    letter-spacing: 0.3px;
    line-height: 1.2;
}

.mobile-panel-item.active i,
.mobile-panel-item.active span {
    color: <?php echo htmlspecialchars($primaryColor); ?>;
}

/* Add bottom padding to content area on mobile to prevent overlap */
@media (max-width: 768px) {
    .mobile-bottom-panel {
        display: block;
    }
    
    .main-content {
        padding-bottom: 80px !important;
    }
    
    .content-area {
        padding-bottom: 80px !important;
    }
}
</style>

<div class="mobile-bottom-panel">
    <nav class="mobile-bottom-panel-nav">
        <?php foreach ($allMenuItems as $item): 
            $isActive = false;
            if (strpos($item['url'], $currentPage) !== false) {
                $isActive = true;
            } elseif ($currentPage === 'self_contained_user_dashboard' && strpos($item['url'], 'user_dashboard') !== false) {
                $isActive = true;
            } elseif ($currentPage === 'self_contained_tipster_dashboard' && strpos($item['url'], 'tipster_dashboard') !== false) {
                $isActive = true;
            }
        ?>
        <a href="<?php echo htmlspecialchars($item['url']); ?>" 
           class="mobile-panel-item <?php echo $isActive ? 'active' : ''; ?>">
            <i class="<?php echo htmlspecialchars($item['icon']); ?>"></i>
            <span><?php echo htmlspecialchars($item['text']); ?></span>
        </a>
        <?php endforeach; ?>
    </nav>
</div>

