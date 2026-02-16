<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="login-wrapper">
        <div class="login-container">
            
            <!-- Login Form -->
            <div class="login-right">
                <div class="form-header">
                    <h3>Sign In to Your Account</h3>
                    <p>Enter your credentials to access your dashboard</p>
    </div>
    
    <?php if (isset($error) && $error): ?>
        <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <?= ViewHelper::e($error) ?>
        </div>
    <?php endif; ?>
    
    <?php if (isset($success) && $success): ?>
        <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        <?= ViewHelper::e($success) ?>
        </div>
    <?php endif; ?>
    
                <form method="POST" class="login-form">
                    <div class="form-group">
                        <label for="username">
                            <i class="fas fa-user"></i>
                            Username
                        </label>
                        <input type="text" id="username" name="username" 
                               value="<?= htmlspecialchars($_POST['username'] ?? '') ?>" 
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
                    <p>New to our platform?</p>
                    <a href="/register" class="register-btn">
                        <i class="fas fa-user-plus"></i>
                        Create Free Account
                    </a>
                    <p class="register-benefits">
                        Join thousands of tipsters and get access to premium football betting insights
                    </p>
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
    background: #ffffff;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 20px;
}

.login-wrapper {
    position: relative;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
}

.login-background {
    display: none;
}

.login-container {
    background: #ffffff;
    border: 2px solid #e5e5e5;
    border-radius: 8px;
    width: 100%;
    max-width: 500px;
    position: relative;
    z-index: 1;
    display: flex;
    min-height: auto;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-right {
    flex: 1;
    padding: 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.form-header {
    text-align: center;
    margin-bottom: 30px;
}

.form-header h3 {
    font-size: 24px;
    color: #333333;
    margin-bottom: 8px;
    font-weight: 600;
}

.form-header p {
    color: #666666;
    font-size: 14px;
}

.alert {
    padding: 15px 20px;
    border-radius: 6px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
}

.alert-error {
    background: #ffebee;
    color: #d32f2f;
    border: 1px solid #ffcdd2;
}

.alert-success {
    background: #e8f5e8;
    color: #2e7d32;
    border: 1px solid #c8e6c9;
}

.login-form {
    margin-bottom: 30px;
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
    color: #333333;
    font-size: 14px;
}

.form-group label i {
    color: #d32f2f;
    width: 16px;
}

.form-group input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e5e5;
    border-radius: 6px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: #ffffff;
}

.form-group input:focus {
    outline: none;
    border-color: #d32f2f;
    box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
}

.form-group input::placeholder {
    color: #999999;
}

.login-btn {
    width: 100%;
    padding: 14px;
    background: #d32f2f;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.login-btn:hover {
    background: #b71c1c;
    transform: translateY(-1px);
}

.login-btn:active {
    transform: translateY(0);
}

.login-footer {
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    padding-top: 25px;
}


.register-link {
    text-align: center;
    margin-top: 20px;
}

.register-link p {
    color: #666666;
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: 600;
}

.register-benefits {
    color: #999999;
    font-size: 12px;
    margin-top: 10px;
    font-style: italic;
    line-height: 1.4;
}

.register-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #2e7d32;
    color: white;
    border: none;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
    transition: all 0.3s ease;
    margin-bottom: 10px;
}

.register-btn:hover {
    background: #1b5e20;
    transform: translateY(-1px);
    color: white;
}

/* Mobile-first responsive design */
@media (max-width: 480px) {
    body {
        padding: 10px;
    }
    
    .login-container {
        margin: 0;
        border-radius: 6px;
    }
    
    .login-right {
        padding: 20px;
    }
    
    .form-header h3 {
        font-size: 20px;
    }
    
    .form-group input {
        padding: 12px 14px;
        font-size: 16px;
    }
    
    .login-btn {
        padding: 14px;
        font-size: 16px;
    }
}

@media (min-width: 481px) and (max-width: 768px) {
    .login-right {
        padding: 25px;
    }
    
    .form-header h3 {
        font-size: 22px;
    }
}

@media (min-width: 769px) {
    .login-container {
        max-width: 500px;
    }
    
    .login-right {
        padding: 30px;
    }
}

/* Clean, professional styling */
.login-container {
    transition: all 0.3s ease;
}
</style>
