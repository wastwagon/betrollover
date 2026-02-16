<?php
/**
 * SmartPicks Pro - Enhanced Unified Registration Page
 * Single, self-contained registration page with all features
 * Works via routing (/register) and direct access (register.php)
 * Branding: Red and White (no gradients)
 */

// Start session (only if not already started)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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
    
    // Handle registration form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = trim($_POST['username'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';
        $display_name = trim($_POST['display_name'] ?? '');
        
        // Validation
        if (empty($username) || empty($email) || empty($password) || empty($display_name)) {
            $error = 'Please fill in all required fields.';
        } elseif (strlen($username) < 3) {
            $error = 'Username must be at least 3 characters long.';
        } elseif (strlen($username) > 30) {
            $error = 'Username must be less than 30 characters.';
        } elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            $error = 'Username can only contain letters, numbers, and underscores.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Please enter a valid email address.';
        } elseif (strlen($password) < 6) {
            $error = 'Password must be at least 6 characters long.';
        } elseif (strlen($password) > 100) {
            $error = 'Password must be less than 100 characters.';
        } elseif ($password !== $confirm_password) {
            $error = 'Passwords do not match.';
        } elseif (strlen($display_name) < 2) {
            $error = 'Display name must be at least 2 characters long.';
        } elseif (strlen($display_name) > 50) {
            $error = 'Display name must be less than 50 characters.';
        } else {
            try {
                // Check if username already exists
                $existingUser = $db->fetch("SELECT id FROM users WHERE username = ?", [$username]);
                if ($existingUser) {
                    $error = 'Username already exists. Please choose a different username.';
                } else {
                    // Check if email already exists
                    $existingEmail = $db->fetch("SELECT id FROM users WHERE email = ?", [$email]);
                    if ($existingEmail) {
                        $error = 'Email already exists. Please use a different email address.';
                    } else {
                        // Create user
                        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                        $db->query("
                            INSERT INTO users (username, email, password, display_name, role, status, created_at) 
                            VALUES (?, ?, ?, ?, 'user', 'active', NOW())
                        ", [$username, $email, $hashedPassword, $display_name]);
                        $userId = $db->lastInsertId();
                        
                        // Create wallet for new user
                        try {
                            $db->query("INSERT INTO user_wallets (user_id, balance, created_at) VALUES (?, 0.00, NOW())", [$userId]);
                        } catch (Exception $e) {
                            // Wallet might already exist or table structure different, continue anyway
                        }
                        
                        // Automatically log the user in
                        $_SESSION['user_id'] = $userId;
                        $_SESSION['username'] = $username;
                        $_SESSION['role'] = 'user';
                        
                        // Redirect to user dashboard immediately
                        $baseUrl = (strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) ? '/SmartPicksPro-Local' : '';
                        header('Location: ' . $baseUrl . '/user_dashboard');
                        exit;
                    }
                }
            } catch (Exception $e) {
                $error = 'Registration failed. Please try again.';
                if ($isLocal) {
                    $error .= ' Error: ' . $e->getMessage();
                }
            }
        }
    }
} catch (Exception $e) {
    $error = 'System error. Please try again later.';
    if ($isLocal) {
        $error .= ' Error: ' . $e->getMessage();
    }
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
    <title>SmartPicks Pro - Register</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="register-wrapper">
        <div class="register-container">
            <div class="logo">
                <div class="logo-icon">
                    <i class="fas fa-futbol"></i>
                </div>
                <h1>SmartPicks Pro</h1>
                <p>Create your account</p>
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
            
            <form method="POST" class="register-form" id="registerForm">
                <div class="form-group">
                    <label for="username">
                        <i class="fas fa-user"></i>
                        Username
                    </label>
                    <input type="text" id="username" name="username" 
                           value="<?= e($_POST['username'] ?? '') ?>" 
                           placeholder="Choose a username"
                           required 
                           minlength="3"
                           maxlength="30"
                           pattern="[a-zA-Z0-9_]+"
                           autofocus>
                </div>
                
                <div class="form-group">
                    <label for="email">
                        <i class="fas fa-envelope"></i>
                        Email
                    </label>
                    <input type="email" id="email" name="email" 
                           value="<?= e($_POST['email'] ?? '') ?>" 
                           placeholder="your@email.com"
                           required>
                </div>
                
                <div class="form-group">
                    <label for="display_name">
                        <i class="fas fa-id-card"></i>
                        Display Name
                    </label>
                    <input type="text" id="display_name" name="display_name" 
                           value="<?= e($_POST['display_name'] ?? '') ?>" 
                           placeholder="Your public name"
                           required
                           minlength="2"
                           maxlength="50">
                </div>
                
                <div class="form-group">
                    <label for="password">
                        <i class="fas fa-lock"></i>
                        Password
                    </label>
                    <input type="password" id="password" name="password" 
                           placeholder="At least 6 characters"
                           required
                           minlength="6"
                           maxlength="100">
                </div>
                
                <div class="form-group">
                    <label for="confirm_password">
                        <i class="fas fa-lock"></i>
                        Confirm Password
                    </label>
                    <input type="password" id="confirm_password" name="confirm_password" 
                           placeholder="Repeat your password"
                           required
                           minlength="6"
                           maxlength="100">
                </div>
                
                <button type="submit" class="register-btn">
                    <i class="fas fa-user-plus"></i>
                    Create Account
                </button>
            </form>
            
            <div class="login-link">
                <p>Already have an account? <a href="/login">Sign in here</a></p>
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

.register-wrapper {
    width: 100%;
    max-width: 500px;
    animation: fadeInUp 0.6s ease-out;
}

.register-container {
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

.register-form {
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

.register-btn {
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

.register-btn:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 53, 69, 0.4);
}

.register-btn:active {
    transform: translateY(0);
}

.login-link {
    text-align: center;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e1e5e9;
}

.login-link p {
    color: #666;
    font-size: 14px;
}

.login-link a {
    color: #dc3545;
    text-decoration: none;
    font-weight: 600;
}

.login-link a:hover {
    text-decoration: underline;
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
    .register-container {
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
    
    .register-btn {
        padding: 16px;
        font-size: 15px;
    }
}
</style>

<script>
// Client-side password match validation
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    function validatePasswordMatch() {
        if (confirmPassword.value && password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Passwords do not match');
        } else {
            confirmPassword.setCustomValidity('');
        }
    }
    
    password.addEventListener('input', validatePasswordMatch);
    confirmPassword.addEventListener('input', validatePasswordMatch);
});
</script>
