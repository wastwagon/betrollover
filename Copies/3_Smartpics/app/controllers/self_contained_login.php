<?php
/**
 * SmartPicks Pro - Self-Contained Login Page
 * Standalone login page with all dependencies included
 */

// Start session
session_start();

// Define paths (from app/controllers directory)
define('ROOT_PATH', __DIR__ . '/../..');
define('APP_PATH', ROOT_PATH . '/app');
define('CONFIG_PATH', ROOT_PATH . '/config');

$error = '';
$success = '';

// Load configuration and database
try {
    require_once CONFIG_PATH . '/config.php';
    require_once APP_PATH . '/models/Database.php';
    
    // Initialize database
    $db = Database::getInstance();
    
    // Handle login form submission
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = $_POST['username'] ?? '';
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
                    
                    // Redirect to dashboard
                    header('Location: /dashboard');
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
        <div class="login-background">
            <div class="background-overlay"></div>
        </div>
        
        <div class="login-container">
            <!-- Left Section: Branding & Welcome -->
            <div class="login-left">
                <div class="brand-section">
                    <div class="logo">
                        <div class="logo-icon">
                            <i class="fas fa-futbol"></i>
                        </div>
                        <h1>SmartPicks Pro</h1>
                        <p>Professional Football Betting Platform</p>
                    </div>
                </div>
                
                <div class="welcome-section">
                    <h2>Welcome Back!</h2>
                    <p>Access your personalized dashboard and continue your winning streak with our expert football tips.</p>
                    
                    <div class="features">
                        <div class="feature-item">
                            <i class="fas fa-chart-line"></i>
                            <span>Live Performance Tracking</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-users"></i>
                            <span>Expert Tipster Community</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-trophy"></i>
                            <span>Proven Win Rates</span>
                        </div>
                    </div>
                </div>
                
                <div class="disclaimer">
                    <h4><i class="fas fa-exclamation-triangle"></i> Important Disclaimer</h4>
                    <p class="disclaimer-text">
                        <strong>Betting Tips Disclaimer:</strong> All tips and predictions provided on this platform are for informational purposes only. 
                        Past performance does not guarantee future results. Betting involves financial risk and may result in losses. 
                        <strong>SmartPicks Pro is not liable for any financial losses</strong> incurred as a result of following our tips or using our platform. 
                        Please bet responsibly and only with money you can afford to lose.
                    </p>
                </div>
            </div>
            
            <!-- Right Section: Login Form -->
            <div class="login-right">
                <div class="form-header">
                    <h3>Sign In to Your Account</h3>
                    <p>Enter your credentials to access your dashboard</p>
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
                               placeholder="Enter your username" required>
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
                    <p>New to SmartPicks Pro?</p>
                    <a href="/register" class="register-btn">
                        <i class="fas fa-user-plus"></i>
                        Create Free Account
                    </a>
                    <p class="register-benefits">
                        Join thousands of tipsters and get access to premium football betting insights
                    </p>
                </div>
                
                <div class="test-info">
                    <h4><i class="fas fa-info-circle"></i> Test Credentials</h4>
                    <p><strong>Admin:</strong> admin / admin123</p>
                    <p><strong>User:</strong> user / user123</p>
                    <p><strong>Tipster:</strong> tipster / tipster123</p>
                </div>
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-wrapper {
    position: relative;
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    z-index: 0;
}

.background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
}

.login-container {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 1200px;
    position: relative;
    z-index: 1;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    min-height: 600px;
    overflow: hidden;
}

.login-left {
    flex: 1;
    padding: 40px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.login-right {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.brand-section {
    text-align: center;
    margin-bottom: 40px;
}

.logo {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.logo-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.logo-icon i {
    font-size: 36px;
    color: white;
}

.logo h1 {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
}

.logo p {
    color: #666;
    font-size: 16px;
    font-weight: 400;
}

.welcome-section {
    margin-bottom: 40px;
}

.welcome-section h2 {
    font-size: 28px;
    color: #333;
    margin-bottom: 15px;
    font-weight: 600;
}

.welcome-section p {
    color: #666;
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 30px;
}

.features {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    transition: all 0.3s ease;
}

.feature-item:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateX(5px);
}

.feature-item i {
    color: #667eea;
    font-size: 18px;
    width: 20px;
}

.feature-item span {
    color: #333;
    font-weight: 500;
}

.form-header {
    text-align: center;
    margin-bottom: 30px;
}

.form-header h3 {
    font-size: 24px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 600;
}

.form-header p {
    color: #666;
    font-size: 14px;
}

.alert {
    padding: 15px 20px;
    border-radius: 10px;
    margin-bottom: 25px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
}

.alert-error {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
    border: 1px solid rgba(220, 53, 69, 0.2);
}

.alert-success {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
    border: 1px solid rgba(40, 167, 69, 0.2);
}

.login-form {
    margin-bottom: 30px;
}

.form-group {
    margin-bottom: 25px;
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
    color: #667eea;
    width: 16px;
}

.form-group input {
    width: 100%;
    padding: 15px 20px;
    border: 2px solid #e1e5e9;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: rgba(255, 255, 255, 0.8);
}

.form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    background: white;
}

.form-group input::placeholder {
    color: #999;
}

.login-btn {
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
}

.login-btn:active {
    transform: translateY(0);
}

.disclaimer {
    background: rgba(255, 193, 7, 0.05);
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 25px;
    border: 1px solid rgba(255, 193, 7, 0.2);
}

.disclaimer h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
    color: #856404;
    font-size: 16px;
    font-weight: 600;
}

.disclaimer h4 i {
    color: #ffc107;
}

.disclaimer-text {
    color: #856404;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
}

.disclaimer-text strong {
    color: #6c5ce7;
    font-weight: 600;
}

.register-link {
    text-align: center;
    margin-bottom: 20px;
}

.register-link p {
    color: #666;
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: 600;
}

.register-benefits {
    color: #888;
    font-size: 12px;
    margin-top: 10px;
    font-style: italic;
    line-height: 1.4;
}

.register-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 15px 30px;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border: none;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    transition: all 0.3s ease;
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
    margin-bottom: 10px;
}

.register-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(40, 167, 69, 0.4);
    color: white;
}

.test-info {
    background: rgba(0, 123, 255, 0.05);
    padding: 15px;
    border-radius: 10px;
    border: 1px solid rgba(0, 123, 255, 0.2);
    text-align: center;
}

.test-info h4 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 10px;
    color: #0056b3;
    font-size: 14px;
    font-weight: 600;
}

.test-info h4 i {
    color: #007bff;
}

.test-info p {
    color: #0056b3;
    font-size: 12px;
    margin: 5px 0;
    font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
    .login-container {
        flex-direction: column;
        max-width: 100%;
        margin: 20px;
        min-height: auto;
    }
    
    .login-left {
        padding: 30px 25px;
        order: 2;
    }
    
    .login-right {
        padding: 30px 25px;
        order: 1;
    }
    
    .welcome-section {
        margin-bottom: 30px;
    }
    
    .welcome-section h2 {
        font-size: 24px;
    }
    
    .features {
        gap: 10px;
    }
    
    .feature-item {
        padding: 10px;
    }
    
    .logo h1 {
        font-size: 28px;
    }
    
    .logo-icon {
        width: 70px;
        height: 70px;
    }
    
    .logo-icon i {
        font-size: 32px;
    }
    
    .form-header h3 {
        font-size: 22px;
    }
    
    .form-group input {
        padding: 14px 18px;
        font-size: 15px;
    }
    
    .login-btn {
        padding: 16px;
        font-size: 15px;
    }
}

@media (max-width: 480px) {
    .login-container {
        margin: 10px;
        border-radius: 15px;
    }
    
    .login-left,
    .login-right {
        padding: 25px 20px;
    }
    
    .welcome-section h2 {
        font-size: 22px;
    }
    
    .welcome-section p {
        font-size: 14px;
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
    
    .form-header h3 {
        font-size: 20px;
    }
    
    .form-group input {
        padding: 12px 16px;
        font-size: 14px;
    }
    
    .login-btn {
        padding: 14px;
        font-size: 14px;
    }
    
    .feature-item span {
        font-size: 14px;
    }
    
    .disclaimer-text {
        font-size: 12px;
    }
}

/* Animation */
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

.login-container {
    animation: fadeInUp 0.6s ease-out;
}
</style>
