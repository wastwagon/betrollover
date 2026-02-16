<?php
/**
 * SmartPicks Pro - Main Entry Point
 * Professional file structure entry point
 */

// Define application paths
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('CONFIG_PATH', ROOT_PATH . '/config');
define('PUBLIC_PATH', __DIR__);
define('STORAGE_PATH', ROOT_PATH . '/storage');

// Set timezone
date_default_timezone_set('Africa/Accra');

// Start session
session_start();

// Load configuration
require_once CONFIG_PATH . '/config.php';

// Load core classes
require_once APP_PATH . '/models/Database.php';

// Simple routing
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);

// Remove leading slash and get the route
$route = trim($path, '/');

// Route handling
switch ($route) {
    case '':
    case 'home':
        require_once APP_PATH . '/controllers/dashboard_simple.php';
        break;
        
    case 'login':
        require_once APP_PATH . '/controllers/login_simple.php';
        break;
        
    case 'logout':
        require_once APP_PATH . '/controllers/logout.php';
        break;
        
    case 'register':
        require_once APP_PATH . '/controllers/register.php';
        break;
        
    case 'profile':
        require_once APP_PATH . '/controllers/profile.php';
        break;
        
    default:
        // Check if it's a static file
        if (file_exists(PUBLIC_PATH . $path)) {
            return false; // Let the web server handle it
        }
        
        // 404 - Page not found
        http_response_code(404);
        echo "<h1>404 - Page Not Found</h1>";
        echo "<p>The requested page '{$route}' was not found.</p>";
        echo "<p><a href='/'>Go Home</a> | <a href='/login'>Login</a></p>";
        break;
}
?>

