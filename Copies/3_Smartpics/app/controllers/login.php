<?php
/**
 * SmartPicks Pro - Enhanced Unified Login Page
 * Single, self-contained login page with all features
 * Works via routing (/login) and direct access (login.php)
 * Branding: Red and White (no gradients)
 */

// Start session (only if not already started)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Prevent caching
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Define paths (works from both app/controllers and root)
if (!defined('ROOT_PATH')) {
    define('ROOT_PATH', __DIR__ . '/../..');
}
if (!defined('APP_PATH')) {
    define('APP_PATH', ROOT_PATH . '/app');
}
if (!defined('CONFIG_PATH')) {
    define('CONFIG_PATH', ROOT_PATH . '/config');
}

$error = '';
$success = '';

// Detect base path - only use /SmartPicksPro-Local for local development
$baseUrl = '';
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;

// Only use base path on localhost AND if the path actually contains it
// Never use base path on production domains
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

// Load configuration and database
try {
    // Load local configuration for development (auto-detects)
    if (file_exists(CONFIG_PATH . '/config_local.php')) {
        require_once CONFIG_PATH . '/config_local.php';
        $isLocal = true;
    } else {
        require_once CONFIG_PATH . '/config.php';
        $isLocal = false;
    }
    
    require_once APP_PATH . '/models/Database.php';
    
    // Initialize database
    $db = Database::getInstance();
    
    // Handle login form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            $error = 'Please enter both username and password.';
        } else {
            try {
                // Get user from database
                $stmt = $db->query(
                    "SELECT id, username, password, role, status FROM users WHERE username = ? AND status = 'active'",
                    [$username]
                );
                
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user && password_verify($password, $user['password'])) {
                    // Login successful
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['role'] = $user['role'];
                    
                    // Redirect to appropriate dashboard based on role
                    // Use the already detected baseUrl (only set on localhost)
                    // baseUrl is already set above based on localhost check
                    if ($user['role'] === 'admin') {
                        header('Location: ' . $baseUrl . '/admin_dashboard');
                    } elseif ($user['role'] === 'tipster') {
                        header('Location: ' . $baseUrl . '/tipster_dashboard');
                    } else {
                        header('Location: ' . $baseUrl . '/user_dashboard');
                    }
                    exit;
                } else {
                    $error = 'Invalid username or password.';
                }
            } catch (Exception $e) {
                $error = 'Login failed. Please try again.';
            }
        }
    }
} catch (Exception $e) {
    $error = 'System error. Please try again later.';
}

// Helper function for escaping
function e($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartPicks Pro - Login</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="login-wrapper">
        <div class="login-container">
            <div class="logo">
                <div class="logo-icon">
                    <i class="fas fa-futbol"></i>
                </div>
                <h1>SmartPicks Pro</h1>
                <p>Sign in to your account</p>
            </div>
            
            <?php if (isset($error) && $error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <?= e($error) ?>
                </div>
            <?php endif; ?>
            
            <?php if (isset($success) && $success): ?>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <?= e($success) ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" class="login-form">
                <div class="form-group">
                    <label for="username">
                        <i class="fas fa-user"></i>
                        Username
                    </label>
                    <input type="text" id="username" name="username" 
                           value="<?= e($_POST['username'] ?? '') ?>" 
                           placeholder="Enter your username" required autofocus>
                </div>
                
                <div class="form-group">
                    <label for="password">
                        <i class="fas fa-lock"></i>
                        Password
                    </label>
                    <input type="password" id="password" name="password" 
                           placeholder="Enter your password" required>
                </div>
                
                <button type="submit" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </button>
            </form>
            
            <div class="register-link">
                <p>Don't have an account?</p>
                <a href="<?= $baseUrl ?>/register" class="register-btn">
                    <i class="fas fa-user-plus"></i>
                    Create Account
                </a>
            </div>
        </div>
    </div>
</body>
</html>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #ffffff;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.login-wrapper {
    width: 100%;
    max-width: 500px;
    animation: fadeInUp 0.6s ease-out;
}

.login-container {
    background: white;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: 2px solid #dc3545;
}

.logo {
    text-align: center;
    margin-bottom: 30px;
}

.logo-icon {
    width: 70px;
    height: 70px;
    background: #dc3545;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
}

.logo-icon i {
    font-size: 32px;
    color: white;
}

.logo h1 {
    font-size: 28px;
    font-weight: 700;
    color: #dc3545;
    margin-bottom: 5px;
}

.logo p {
    color: #666;
    font-size: 14px;
}

.alert {
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 25px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
}

.alert-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.alert-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.login-form {
    margin-bottom: 25px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 14px;
}

.form-group label i {
    color: #dc3545;
    width: 16px;
}

.form-group input {
    width: 100%;
    padding: 15px 20px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #f8f9fa;
}

.form-group input:focus {
    outline: none;
    border-color: #dc3545;
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    background: white;
}

.form-group input::placeholder {
    color: #999;
}

.login-btn {
    width: 100%;
    padding: 18px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
    margin-top: 10px;
}

.login-btn:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
}

.login-btn:active {
    transform: translateY(0);
}

.register-link {
    text-align: center;
    margin-top: 25px;
    padding-top: 25px;
    border-top: 1px solid #e1e5e9;
}

.register-link p {
    color: #666;
    margin-bottom: 15px;
    font-size: 15px;
}

.register-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 15px 30px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
}

.register-btn:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
    color: white;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive Design */
@media (max-width: 480px) {
    .login-container {
        padding: 30px 25px;
    }
    
    .logo h1 {
        font-size: 24px;
    }
    
    .logo-icon {
        width: 60px;
        height: 60px;
    }
    
    .logo-icon i {
        font-size: 28px;
    }
    
    .form-group input {
        padding: 12px 16px;
        font-size: 15px;
    }
    
    .login-btn {
        padding: 16px;
        font-size: 15px;
    }
}
</style>
