<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'SmartPicks Pro' ?></title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
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
            color: #333;
        }
        
        .main-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        /* Enhanced Header */
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .header-top {
            background: rgba(0,0,0,0.1);
            padding: 8px 0;
            font-size: 12px;
            text-align: center;
        }
        
        .header-main {
            padding: 15px 0;
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-icon {
            width: 45px;
            height: 45px;
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: white;
            box-shadow: 0 4px 15px rgba(255,107,107,0.3);
        }
        
        .logo-text {
            display: flex;
            flex-direction: column;
        }
        
        .logo-title {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(45deg, #fff, #e0e0e0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .logo-subtitle {
            font-size: 12px;
            opacity: 0.8;
            margin-top: -2px;
        }
        
        .header-actions {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255,255,255,0.1);
            padding: 8px 15px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
        }
        
        .user-avatar {
            width: 35px;
            height: 35px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
        }
        
        .user-details {
            display: flex;
            flex-direction: column;
        }
        
        .user-name {
            font-weight: 600;
            font-size: 14px;
        }
        
        .user-role {
            font-size: 11px;
            opacity: 0.8;
        }
        
        .header-btn {
            background: rgba(255,255,255,0.15);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .header-btn:hover {
            background: rgba(255,255,255,0.25);
            transform: translateY(-1px);
            color: white;
            text-decoration: none;
        }
        
        .header-btn.primary {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            border: none;
        }
        
        .header-btn.primary:hover {
            background: linear-gradient(45deg, #ff5252, #ffb74d);
        }
        
        /* Navigation */
        .nav-container {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        
        .nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            gap: 5px;
            overflow-x: auto;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            color: #555;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            border-radius: 8px;
            transition: all 0.3s ease;
            white-space: nowrap;
            position: relative;
        }
        
        .nav-item:hover {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            text-decoration: none;
        }
        
        .nav-item.active {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
        }
        
        .nav-item i {
            font-size: 16px;
        }
        
        /* Main Content */
        .content-container {
            flex: 1;
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px 20px;
            width: 100%;
        }
        
        .content-wrapper {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            min-height: calc(100vh - 200px);
        }
        
        /* Alerts */
        .alert {
            padding: 16px 20px;
            margin-bottom: 20px;
            border-radius: 12px;
            border: none;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        }
        
        .alert-error {
            background: linear-gradient(45deg, #ff6b6b, #ff8a80);
            color: white;
        }
        
        .alert-success {
            background: linear-gradient(45deg, #4caf50, #66bb6a);
            color: white;
        }
        
        .alert-warning {
            background: linear-gradient(45deg, #ff9800, #ffb74d);
            color: white;
        }
        
        .alert-info {
            background: linear-gradient(45deg, #2196f3, #42a5f5);
            color: white;
        }
        
        /* Buttons */
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-right: 10px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            text-decoration: none;
        }
        
        .btn-primary {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-success {
            background: linear-gradient(45deg, #4caf50, #66bb6a);
            color: white;
        }
        
        .btn-danger {
            background: linear-gradient(45deg, #f44336, #ef5350);
            color: white;
        }
        
        .btn-warning {
            background: linear-gradient(45deg, #ff9800, #ffb74d);
            color: white;
        }
        
        .btn-info {
            background: linear-gradient(45deg, #2196f3, #42a5f5);
            color: white;
        }
        
        .btn-secondary {
            background: linear-gradient(45deg, #6c757d, #868e96);
            color: white;
        }
        
        .btn-sm {
            padding: 8px 16px;
            font-size: 12px;
        }
        
        .btn-lg {
            padding: 16px 32px;
            font-size: 16px;
        }
        
        /* Forms */
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        /* Cards */
        .card {
            background: white;
            border: none;
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        
        .card-header {
            border-bottom: 2px solid #f1f3f4;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        
        .card-title {
            margin: 0;
            color: #333;
            font-size: 1.4em;
            font-weight: 700;
        }
        
        /* Grid System */
        .grid {
            display: grid;
            gap: 25px;
        }
        
        .grid-2 {
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        }
        
        .grid-3 {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        
        .grid-4 {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        
        /* Utility Classes */
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-muted { color: #6c757d; }
        .text-success { color: #4caf50; }
        .text-danger { color: #f44336; }
        .text-warning { color: #ff9800; }
        .text-info { color: #2196f3; }
        
        .mt-1 { margin-top: 5px; }
        .mt-2 { margin-top: 10px; }
        .mt-3 { margin-top: 15px; }
        .mt-4 { margin-top: 20px; }
        .mt-5 { margin-top: 30px; }
        
        .mb-1 { margin-bottom: 5px; }
        .mb-2 { margin-bottom: 10px; }
        .mb-3 { margin-bottom: 15px; }
        .mb-4 { margin-bottom: 20px; }
        .mb-5 { margin-bottom: 30px; }
        
        /* Footer */
        .footer {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            padding: 20px 0;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid rgba(0,0,0,0.1);
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .header-actions {
                flex-direction: column;
                gap: 10px;
            }
            
            .nav {
                flex-direction: column;
                gap: 5px;
            }
            
            .nav-item {
                justify-content: center;
            }
            
            .content-wrapper {
                padding: 20px;
                margin: 10px;
            }
            
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .grid-2,
            .grid-3,
            .grid-4 {
                grid-template-columns: 1fr;
            }
        }
        
        /* Loading Animation */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(45deg, #667eea, #764ba2);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(45deg, #5a6fd8, #6a4190);
        }
    </style>
    <?= $additionalCSS ?? '' ?>
</head>
<body>
    <div class="main-container">
        <?php if (isset($header)): ?>
            <header class="header">
                <div class="header-top">
                    <span><i class="fas fa-graduation-cap"></i> Ghana's Premier Educational Tipster Platform</span>
                </div>
                <div class="header-main">
                    <div class="header-content">
                        <div class="logo">
                            <div class="logo-icon">
                                <i class="fas fa-futbol"></i>
                            </div>
                        <div class="logo-text">
                            <h1 class="logo-title">SmartPicks Pro</h1>
                            <span class="logo-subtitle">Educational Tipster Platform</span>
                        </div>
                        </div>
                        
                        <div class="header-actions">
                            <?php if (isset($_SESSION['user_id'])): ?>
                                <div class="user-info">
                                    <div class="user-avatar">
                                        <?= strtoupper(substr($_SESSION['display_name'] ?? $_SESSION['username'] ?? 'U', 0, 1)) ?>
                                    </div>
                                    <div class="user-details">
                                        <div class="user-name"><?= htmlspecialchars($_SESSION['display_name'] ?? $_SESSION['username'] ?? 'User') ?></div>
                                        <div class="user-role"><?= ucfirst($_SESSION['role'] ?? 'user') ?></div>
                                    </div>
                                </div>
                                <a href="/logout" class="header-btn">
                                    <i class="fas fa-sign-out-alt"></i> Logout
                                </a>
                            <?php else: ?>
                                <a href="/login" class="header-btn">
                                    <i class="fas fa-sign-in-alt"></i> Login
                                </a>
                                <a href="/register" class="header-btn primary">
                                    <i class="fas fa-user-plus"></i> Sign Up
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </header>
        <?php endif; ?>
        
        <?php if (isset($navigation)): ?>
            <div class="nav-container">
                <nav class="nav">
                    <?php foreach ($navigation as $item): ?>
                        <a href="<?= htmlspecialchars($item['url']) ?>" 
                           class="nav-item <?= $item['active'] ?? false ? 'active' : '' ?>">
                            <?php if (isset($item['icon'])): ?>
                                <i class="<?= $item['icon'] ?>"></i>
                            <?php endif; ?>
                            <?= htmlspecialchars($item['label']) ?>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </div>
        <?php endif; ?>
        
        <div class="content-container">
            <div class="content-wrapper">
                <?php if (isset($alerts)): ?>
                    <?php foreach ($alerts as $alert): ?>
                        <div class="alert alert-<?= $alert['type'] ?>">
                            <i class="fas fa-<?= $alert['type'] === 'error' ? 'exclamation-triangle' : ($alert['type'] === 'success' ? 'check-circle' : ($alert['type'] === 'warning' ? 'exclamation-circle' : 'info-circle')) ?>"></i>
                            <?= htmlspecialchars($alert['message']) ?>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
                
                <main>
                    <?= $content ?? '' ?>
                </main>
            </div>
        </div>
        
        <?php if (isset($footer)): ?>
            <footer class="footer">
                <p>&copy; 2024 SmartPicks Pro - Educational Tipster Platform | Built with ❤️ for Ghana | For Educational Purposes Only</p>
            </footer>
        <?php endif; ?>
    </div>
    
    <?= $additionalJS ?? '' ?>
</body>
</html>