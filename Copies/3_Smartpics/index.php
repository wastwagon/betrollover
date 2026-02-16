<?php
/**
 * SmartPicks Pro - Entry Point for public_html/
 * Optimized for hosting providers that use public_html/ as document root
 * CLEAN VERSION - All self-contained pages only
 */

// Define application paths (all files in same directory)
define('ROOT_PATH', __DIR__);
define('APP_PATH', ROOT_PATH . '/app');
define('CONFIG_PATH', ROOT_PATH . '/config');
define('PUBLIC_PATH', __DIR__);
define('STORAGE_PATH', ROOT_PATH . '/storage');

// Set timezone
date_default_timezone_set('Africa/Accra');

// Start session (only if not already started)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Check if required files exist
if (!file_exists(CONFIG_PATH . '/config.php')) {
    die('<h1>Configuration Error</h1><p>Configuration file not found. Please ensure all project files are uploaded correctly.</p>');
}

// Load configuration
require_once CONFIG_PATH . '/config.php';

// Check if Database class exists
if (!file_exists(APP_PATH . '/models/Database.php')) {
    die('<h1>Database Error</h1><p>Database class not found. Please ensure all project files are uploaded correctly.</p>');
}

// Load core classes
require_once APP_PATH . '/models/Database.php';
require_once APP_PATH . '/models/Logger.php';
require_once APP_PATH . '/views/helpers/ViewHelper.php';
require_once APP_PATH . '/middleware/AuthMiddleware.php';

// Simple routing
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

// Remove base paths
// Always remove /SmartPicksPro-Local if present (shouldn't be in production URLs)
$basePath = '/SmartPicksPro-Local';
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}

// Remove leading slash and get the route
$route = trim($path, '/');

// If no route, default to home
if (empty($route)) {
    $route = 'home';
}

// Route handling
switch ($route) {
    case '':
    case 'home':
        // Check if user is logged in and redirect to appropriate dashboard
        if (isset($_SESSION['user_id'])) {
            if ($_SESSION['role'] === 'admin') {
                require_once APP_PATH . '/controllers/admin_dashboard.php';
            } elseif ($_SESSION['role'] === 'tipster') {
                require_once APP_PATH . '/controllers/tipster_dashboard.php';
            } else {
                require_once APP_PATH . '/controllers/user_dashboard.php';
            }
        } else {
            require_once APP_PATH . '/views/pages/optimized_entry.php';
        }
        break;
        
    case 'login':
        require_once APP_PATH . '/controllers/login.php';
        break;
        
    case 'logout':
        require_once APP_PATH . '/controllers/logout.php';
        break;
        
    case 'edit_pick':
        require_once APP_PATH . '/controllers/edit_pick.php';
        break;
        
    case 'register':
        require_once APP_PATH . '/controllers/register.php';
        break;
        
    // Admin Routes
    case 'admin_dashboard':
        require_once APP_PATH . '/controllers/admin_dashboard.php';
        break;
        
    case 'admin_settings':
        require_once APP_PATH . '/controllers/admin_settings.php';
        break;
        
    case 'admin_growth_settings':
        require_once APP_PATH . '/controllers/admin_growth_settings.php';
        break;
        
    case 'admin_tipster_applications':
        require_once APP_PATH . '/controllers/admin_tipster_applications.php';
        break;
        
    case 'admin_support':
        require_once APP_PATH . '/controllers/admin_support.php';
        break;
        
    case 'admin_verification':
        require_once APP_PATH . '/controllers/admin_verification.php';
        break;
        
    case 'admin_contests':
        require_once APP_PATH . '/controllers/admin_contests.php';
        break;
        
    case 'admin_approve_pick':
        require_once APP_PATH . '/controllers/admin_approve_pick.php';
        break;
        
    case 'admin_mentorship':
        require_once APP_PATH . '/controllers/admin_mentorship.php';
        break;
        
    case 'admin_users':
        require_once APP_PATH . '/controllers/admin_users.php';
        break;
        
    case 'admin_analytics':
        require_once APP_PATH . '/controllers/admin_analytics.php';
        break;
        
    case 'admin_picks':
        require_once APP_PATH . '/controllers/admin_picks.php';
        break;
        
    case 'admin_chat':
        require_once APP_PATH . '/controllers/admin_chat.php';
        break;
        
    case 'admin_escrow':
        require_once APP_PATH . '/controllers/admin_escrow.php';
        break;
        
    case 'admin_wallet':
        require_once APP_PATH . '/controllers/admin_wallet.php';
        break;
        
    case 'admin_payouts':
        require_once APP_PATH . '/controllers/admin_payouts.php';
        break;
        
    case 'admin_settlement':
        require_once APP_PATH . '/controllers/admin_settlement.php';
        break;
        
    case 'admin_financial_reports':
        require_once APP_PATH . '/controllers/admin_financial_reports.php';
        break;
        
    // Tipster Routes
    case 'tipster_financial_review':
        require_once APP_PATH . '/controllers/tipster_financial_review.php';
        break;
        
    case 'tipster_transactions':
        require_once APP_PATH . '/controllers/tipster_transactions.php';
        break;
        
    // User Routes
    case 'user_transactions':
        require_once APP_PATH . '/controllers/user_transactions.php';
        break;
        
    case 'admin_qualification':
        require_once APP_PATH . '/controllers/admin_qualification.php';
        break;
        
    case 'admin_leaderboard':
        require_once APP_PATH . '/controllers/admin_leaderboard.php';
        break;
        
    case 'admin_marketplace':
        require_once APP_PATH . '/controllers/admin_marketplace.php';
        break;
        
    case 'payout_requests':
        require_once APP_PATH . '/controllers/self_contained_user_payout_requests.php';
        break;
        
    case 'admin_payouts':
        require_once APP_PATH . '/controllers/self_contained_admin_payouts.php';
        break;
    case 'admin_settlement':
        require_once APP_PATH . '/controllers/self_contained_admin_settlement.php';
        break;
        
    case 'admin_escrow':
        require_once APP_PATH . '/controllers/self_contained_admin_escrow.php';
        break;
        
    case 'public_chat':
        require_once APP_PATH . '/controllers/public_chat.php';
        break;
        
    // API Routes
    case 'api/get_pick_details':
        require_once ROOT_PATH . '/api/get_pick_details.php';
        break;
        
    // User Routes
    case 'dashboard':
        // Check if user is logged in and redirect to appropriate dashboard
        if (isset($_SESSION['user_id'])) {
            if ($_SESSION['role'] === 'admin') {
                require_once APP_PATH . '/controllers/admin_dashboard.php';
            } elseif ($_SESSION['role'] === 'tipster') {
                require_once APP_PATH . '/controllers/tipster_dashboard.php';
            } else {
                require_once APP_PATH . '/controllers/user_dashboard.php';
            }
        } else {
            // Determine login URL based on environment
            $loginUrl = (strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) ? '/SmartPicksPro-Local/login' : '/login';
            header('Location: ' . $loginUrl);
            exit;
        }
        break;
        
    // User Routes
    case 'user_dashboard':
        require_once APP_PATH . '/controllers/user_dashboard.php';
        break;
        
    // Tipster Routes
    case 'tipster_dashboard':
        require_once APP_PATH . '/controllers/tipster_dashboard.php';
        break;
        
    case 'marketplace':
        require_once APP_PATH . '/controllers/marketplace.php';
        break;
        
    case 'public_chat':
        require_once APP_PATH . '/controllers/public_chat.php';
        break;
        
    case 'wallet':
        require_once APP_PATH . '/controllers/wallet.php';
        break;
        
    case 'referrals':
        require_once APP_PATH . '/controllers/referrals.php';
        break;
        
    case 'profile':
        require_once APP_PATH . '/controllers/profile.php';
        break;
        
    case 'support':
        require_once APP_PATH . '/controllers/support.php';
        break;
        
    case 'settings':
        require_once APP_PATH . '/controllers/settings.php';
        break;
        
    case 'notifications':
        require_once APP_PATH . '/controllers/view_notifications.php';
        break;
        
    case 'notification_preferences':
        require_once APP_PATH . '/controllers/notification_preferences.php';
        break;
        
    case 'become_tipster':
        require_once APP_PATH . '/controllers/become_tipster.php';
        break;
        
    case 'my_purchases':
        require_once APP_PATH . '/controllers/my_purchases.php';
        break;
        
    case 'user_chat':
        require_once APP_PATH . '/controllers/user_chat.php';
        break;
        
    case 'create_pick':
        require_once APP_PATH . '/controllers/create_pick.php';
        break;
        
    case 'my_picks':
        require_once APP_PATH . '/controllers/my_picks.php';
        break;
        
    case 'payout_request':
        require_once APP_PATH . '/controllers/payout_request.php';
        break;
        
    case 'leaderboard':
        require_once APP_PATH . '/controllers/leaderboard.php';
        break;
        
    // Legacy/Additional Routes
    case 'rankings':
        require_once APP_PATH . '/controllers/rankings.php';
        break;
        
    case 'accumulator':
        require_once APP_PATH . '/controllers/accumulator.php';
        break;

    case 'pick_management':
        require_once APP_PATH . '/controllers/pick_management.php';
        break;
        
    case 'pick_marketplace':
        require_once APP_PATH . '/controllers/pick_marketplace.php';
        break;
        
    case 'resource_center':
        require_once APP_PATH . '/controllers/resource_center.php';
        break;
        
    default:
        // Check if it's a static file
        if (file_exists(PUBLIC_PATH . $path)) {
            return false; // Let the web server handle it
        }
        
        // Debug info (remove in production)
        $debug = "Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'N/A') . "<br>";
        $debug .= "Parsed path: " . ($path ?? 'N/A') . "<br>";
        $debug .= "Extracted route: '{$route}'<br>";
        $debug .= "Base path: /SmartPicksPro-Local<br>";
        
        // 404 - Page not found
        http_response_code(404);
        echo "<h1>404 - Page Not Found</h1>";
        echo "<p>The requested page '{$route}' was not found.</p>";
        echo "<div style='background: #f0f0f0; padding: 10px; margin: 10px 0; font-family: monospace; font-size: 12px;'>";
        echo "<strong>Debug Info:</strong><br>" . $debug;
        echo "</div>";
        echo "<p><a href='/SmartPicksPro-Local/'>Go Home</a> | <a href='/SmartPicksPro-Local/login'>Login</a></p>";
        break;
}
?>