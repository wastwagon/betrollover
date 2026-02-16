<?php
/**
 * BetRollover - Production Configuration
 * File: /config/config.php
 * 
 * Production configuration for BetRollover platform
 * DO NOT commit credentials to version control
 */

// Database configuration - PRODUCTION
$config = [
    'app_name' => 'BetRollover',
    'app_version' => '2.0.0',
    'country' => 'Ghana',
    'currency' => 'GHS',
    'timezone' => 'Africa/Accra',
    
    // Database settings - PRODUCTION
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'betrollover_workingdata',
        'user' => 'betrollover_workinguser',
        'pass' => 'x3MwB%^UuUPh',
        'charset' => 'utf8mb4'
    ],
    
    // Logging settings - Single Central Log File
    'logging' => [
        'enabled' => true,
        'level' => 'error', // error, warning, info, debug
        'file' => 'error.log',
        'path' => __DIR__ . '/../storage/logs/',
        'max_size' => 10485760, // 10MB
        'rotate' => true
    ],
    
    // Error handling - PRODUCTION (errors hidden from users)
    'error_handling' => [
        'display_errors' => false, // NEVER show errors in production
        'log_errors' => true,
        'error_reporting' => E_ALL & ~E_DEPRECATED & ~E_STRICT
    ],
    
    // Paystack Configuration - Update with your live keys
    'paystack' => [
        'secret_key' => 'sk_live_7a5d6a4b0d156dd5a9ebb790296a096120b43cdf', // Your live secret key
        'public_key' => 'pk_live_31ec7e4d0ed96a9169e7dfbd6265ce4f67dd0721', // Your live public key
        'base_url' => 'https://api.paystack.co',
        'webhook_secret' => 'your_webhook_secret_here' // For webhook verification
    ],
    
    // Commission rates
    'commissions' => [
        'tipster_rate' => 70.0, // Tipster gets 70%
        'platform_rate' => 30.0, // Platform gets 30%
        'payout_fee' => 10.0 // 10% fee on payouts
    ],
    
    // GeoIP Configuration
    'geoip' => [
        'api_key' => '', // Optional API key for premium services
        'service' => 'ipapi', // ipapi, ip-api, geojs
        'timeout' => 5,
        'cache_duration' => 3600 // Cache results for 1 hour
    ],
    
    // Chat Configuration
    'chat' => [
        'enabled' => true,
        'max_message_length' => 500,
        'auto_refresh_interval' => 2000,
        'online_timeout' => 5
    ],
    
    // Support Configuration
    'support' => [
        'enabled' => true,
        'auto_assign' => false,
        'response_timeout' => 24
    ],
    
    // Production URLs
    'base_url' => 'https://www.betrollover.com',
    'assets_url' => 'https://www.betrollover.com/public'
];

// Function to get config value
function config($key, $default = null) {
    global $config;
    
    $keys = explode('.', $key);
    $value = $config;
    
    foreach ($keys as $k) {
        if (isset($value[$k])) {
            $value = $value[$k];
        } else {
            return $default;
        }
    }
    
    return $value;
}

// Set timezone
date_default_timezone_set($config['timezone']);

// Configure error handling for PRODUCTION
if (isset($config['error_handling'])) {
    $errorConfig = $config['error_handling'];
    
    // Set error reporting level
    error_reporting($errorConfig['error_reporting']);
    
    // Set display errors (OFF for production)
    ini_set('display_errors', $errorConfig['display_errors'] ? '1' : '0');
    
    // Set log errors
    ini_set('log_errors', $errorConfig['log_errors'] ? '1' : '0');
    
    // Set custom error log path
    if (isset($config['logging']['path'])) {
        $logDir = $config['logging']['path'];
        if (!file_exists($logDir)) {
            mkdir($logDir, 0755, true);
        }
        ini_set('error_log', $logDir . 'error.log');
    }
}

// Custom error handler
set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    
    $logMessage = "PHP Error: {$message} in {$file} on line {$line}";
    
    // Try to log using our Logger class if available
    if (class_exists('Logger')) {
        $logger = Logger::getInstance();
        $logger->error($logMessage, [
            'severity' => $severity,
            'file' => $file,
            'line' => $line
        ]);
    } else {
        // Fallback to PHP error_log
        error_log($logMessage);
    }
    
    return true;
});

// Production constants
define('LOCAL_MODE', false);
define('DEBUG_MODE', false);
define('DB_HOST', $config['database']['host']);
define('DB_NAME', $config['database']['name']);
define('DB_USER', $config['database']['user']);
define('DB_PASS', $config['database']['pass']);
define('DB_CHARSET', $config['database']['charset']);

// Security: Prevent direct access to config file
if (basename($_SERVER['PHP_SELF']) == 'config.php') {
    die('Direct access not allowed');
}
?>

