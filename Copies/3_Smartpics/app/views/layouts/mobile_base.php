<?php
/**
 * SmartPicks Pro - Mobile-First Base Layout
 * 
 * Red, White, Green theme with mobile-first design
 */

require_once __DIR__ . '/../../models/LogoManager.php';
require_once __DIR__ . '/../components/logo_display.php';

$logoManager = LogoManager::getInstance();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'SmartPicks Pro') ?></title>
    
    <!-- Favicon -->
    <?= favicon() ?>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- Custom CSS -->
    <style>
        :root {
            --primary-red: #DC2626;
            --secondary-red: #EF4444;
            --accent-red: #B91C1C;
            --primary-white: #FFFFFF;
            --secondary-white: #F9FAFB;
            --text-white: #F3F4F6;
            --primary-green: #059669;
            --secondary-green: #10B981;
            --accent-green: #047857;
            --neutral-gray: #6B7280;
            --light-gray: #E5E7EB;
            --dark-gray: #374151;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--secondary-white);
            color: var(--dark-gray);
            line-height: 1.6;
        }
        
        /* Mobile Navigation */
        .mobile-nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: var(--primary-red);
            color: white;
            padding: 15px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .mobile-nav .navbar-brand {
            color: white;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.2rem;
        }
        
        .mobile-nav .navbar-brand:hover {
            color: var(--text-white);
        }
        
        .mobile-nav .logo {
            max-width: 120px;
            height: auto;
        }
        
        .mobile-nav .hamburger {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
        }
        
        .mobile-nav .hamburger:hover {
            color: var(--text-white);
        }
        
        /* Sidebar */
        .sidebar {
            position: fixed;
            top: 0;
            left: -300px;
            width: 300px;
            height: 100vh;
            background: white;
            z-index: 1001;
            transition: left 0.3s ease;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            overflow-y: auto;
        }
        
        .sidebar.open {
            left: 0;
        }
        
        .sidebar-header {
            background: var(--primary-red);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .sidebar-header .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
        }
        
        .sidebar-header h4 {
            margin: 0;
            font-size: 1.1rem;
        }
        
        .sidebar-nav {
            padding: 20px 0;
        }
        
        .sidebar-nav .nav-item {
            margin-bottom: 5px;
        }
        
        .sidebar-nav .nav-link {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            color: var(--dark-gray);
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
        }
        
        .sidebar-nav .nav-link:hover {
            background: var(--secondary-white);
            color: var(--primary-red);
            border-left-color: var(--primary-red);
        }
        
        .sidebar-nav .nav-link.active {
            background: var(--secondary-white);
            color: var(--primary-red);
            border-left-color: var(--primary-red);
            font-weight: 600;
        }
        
        .sidebar-nav .nav-link i {
            margin-right: 12px;
            width: 20px;
            text-align: center;
        }
        
        .sidebar-nav .nav-link .badge {
            margin-left: auto;
            background: var(--primary-red);
            color: white;
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 10px;
        }
        
        /* Overlay */
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .sidebar-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        
        /* Main Content */
        .main-content {
            margin-top: 70px;
            padding: 20px;
            min-height: calc(100vh - 70px);
        }
        
        /* Cards */
        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            background: white;
        }
        
        .card-header {
            background: var(--primary-red);
            color: white;
            border-radius: 15px 15px 0 0;
            padding: 20px;
            border: none;
        }
        
        .card-header h3 {
            margin: 0;
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .card-body {
            padding: 20px;
        }
        
        /* Buttons */
        .btn {
            border-radius: 8px;
            font-weight: 600;
            padding: 12px 24px;
            transition: all 0.3s ease;
            border: none;
        }
        
        .btn-primary {
            background: var(--primary-red);
            color: white;
        }
        
        .btn-primary:hover {
            background: var(--accent-red);
            transform: translateY(-2px);
        }
        
        .btn-success {
            background: var(--primary-green);
            color: white;
        }
        
        .btn-success:hover {
            background: var(--accent-green);
            transform: translateY(-2px);
        }
        
        .btn-outline-primary {
            border: 2px solid var(--primary-red);
            color: var(--primary-red);
            background: transparent;
        }
        
        .btn-outline-primary:hover {
            background: var(--primary-red);
            color: white;
        }
        
        /* Forms */
        .form-control, .form-select {
            border: 2px solid var(--light-gray);
            border-radius: 8px;
            padding: 12px 15px;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--primary-red);
            box-shadow: 0 0 0 0.2rem rgba(220, 38, 38, 0.25);
        }
        
        .form-label {
            font-weight: 600;
            color: var(--dark-gray);
            margin-bottom: 8px;
        }
        
        /* Alerts */
        .alert {
            border-radius: 10px;
            border: none;
            padding: 15px 20px;
        }
        
        .alert-success {
            background: var(--secondary-green);
            color: white;
        }
        
        .alert-danger {
            background: var(--secondary-red);
            color: white;
        }
        
        .alert-info {
            background: #3B82F6;
            color: white;
        }
        
        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 1px solid var(--light-gray);
        }
        
        .stat-card .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-red);
            margin-bottom: 5px;
        }
        
        .stat-card .stat-label {
            color: var(--neutral-gray);
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        /* Wallet Display */
        .wallet-display {
            background: linear-gradient(135deg, var(--primary-red) 0%, var(--accent-red) 100%);
            color: white;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .wallet-display .wallet-amount {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .wallet-display .wallet-label {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        /* Responsive Design */
        @media (min-width: 768px) {
            .main-content {
                margin-top: 0;
                padding: 30px;
            }
            
            .stats-grid {
                grid-template-columns: repeat(4, 1fr);
            }
        }
        
        @media (min-width: 992px) {
            .sidebar {
                position: static;
                width: 250px;
                height: auto;
                box-shadow: none;
                border-right: 1px solid var(--light-gray);
            }
            
            .main-content {
                margin-left: 250px;
                margin-top: 0;
            }
        }
        
        /* Utility Classes */
        .text-primary { color: var(--primary-red) !important; }
        .text-success { color: var(--primary-green) !important; }
        .text-muted { color: var(--neutral-gray) !important; }
        .bg-primary { background-color: var(--primary-red) !important; }
        .bg-success { background-color: var(--primary-green) !important; }
        .border-primary { border-color: var(--primary-red) !important; }
    </style>
</head>
<body>
    <!-- Mobile Navigation -->
    <nav class="mobile-nav d-md-none">
        <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <button class="hamburger" onclick="toggleSidebar()">
                    <i class="fas fa-bars"></i>
                </button>
                <a href="/" class="navbar-brand ms-3">
                    <?= logo('main', 'small', 'me-2') ?>
                    SmartPicks Pro
                </a>
            </div>
            <div class="d-flex align-items-center">
                <span class="me-3"><?= htmlspecialchars($_SESSION['display_name'] ?? 'User') ?></span>
                <a href="/logout" class="text-white">
                    <i class="fas fa-sign-out-alt"></i>
                </a>
            </div>
        </div>
    </nav>
    
    <!-- Sidebar -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <?= logo('main', 'medium', 'mb-3') ?>
            <h4>SmartPicks Pro</h4>
        </div>
        
        <nav class="sidebar-nav">
            <?php if (isset($navigation) && is_array($navigation)): ?>
                <?php foreach ($navigation as $item): ?>
                    <div class="nav-item">
                        <a href="<?= htmlspecialchars($item['url']) ?>" 
                           class="nav-link <?= $item['active'] ?? false ? 'active' : '' ?>">
                            <i class="<?= htmlspecialchars($item['icon'] ?? 'fas fa-circle') ?>"></i>
                            <?= htmlspecialchars($item['label']) ?>
                            <?php if (isset($item['badge'])): ?>
                                <span class="badge"><?= htmlspecialchars($item['badge']) ?></span>
                            <?php endif; ?>
                        </a>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </nav>
    </div>
    
    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
    
    <!-- Main Content -->
    <div class="main-content">
        <?php if (isset($header) && is_array($header)): ?>
            <div class="mb-4">
                <h1 class="h2 text-primary"><?= htmlspecialchars($header['title']) ?></h1>
                <?php if (isset($header['subtitle'])): ?>
                    <p class="text-muted"><?= htmlspecialchars($header['subtitle']) ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <!-- Messages -->
        <?php if (isset($success) && $success): ?>
            <div class="alert alert-success alert-dismissible fade show">
                <i class="fas fa-check-circle"></i> <?= htmlspecialchars($success) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if (isset($error) && $error): ?>
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-triangle"></i> <?= htmlspecialchars($error) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <!-- Page Content -->
        <?= $content ?? '' ?>
    </div>
    
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JS -->
    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        }
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(e) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const hamburger = document.querySelector('.hamburger');
            
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        });
        
        // Auto-close sidebar on mobile after navigation
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth < 768) {
                    setTimeout(() => {
                        document.getElementById('sidebar').classList.remove('open');
                        document.getElementById('sidebarOverlay').classList.remove('show');
                    }, 300);
                }
            });
        });
    </script>
</body>
</html>
