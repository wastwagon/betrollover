<?php
/**
 * SmartPicks Pro - View Renderer
 * Handles rendering views with layouts
 */

require_once __DIR__ . '/helpers/ViewHelper.php';

class ViewRenderer {
    
    /**
     * Render a view with layout
     */
    public static function render($viewName, $data = [], $layout = 'layouts/base') {
        // Extract data for use in views
        extract($data);
        
        // Set default navigation
        if (!isset($navigation)) {
            $navigation = self::getDefaultNavigation();
        }
        
        // Set default header
        if (!isset($header)) {
            $header = [
                'title' => 'SmartPicks Pro',
                'subtitle' => 'Football Betting Platform'
            ];
        }
        
        // Start output buffering
        ob_start();
        
        // Include the view file
        $viewPath = __DIR__ . '/pages/' . $viewName . '.php';
        if (file_exists($viewPath)) {
            include $viewPath;
        } else {
            echo "View not found: {$viewName}";
        }
        
        // Get the content
        $content = ob_get_clean();
        
        // Include layout with content
        $layoutPath = __DIR__ . '/' . $layout . '.php';
        if (file_exists($layoutPath)) {
            include $layoutPath;
        } else {
            echo $content;
        }
    }
    
    /**
     * Get default navigation
     */
    private static function getDefaultNavigation() {
        $nav = [
            ['label' => '🏠 Dashboard', 'url' => '/', 'active' => ViewHelper::isActive('/')]
        ];
        
        if (isset($_SESSION['user_id'])) {
            $nav[] = ['label' => '👤 Profile', 'url' => '/profile', 'active' => ViewHelper::isActive('/profile')];
            $nav[] = ['label' => '🎯 My Picks', 'url' => '/pick_management.php', 'active' => ViewHelper::isActive('/pick_management')];
            $nav[] = ['label' => '🛒 Marketplace', 'url' => '/pick_marketplace.php', 'active' => ViewHelper::isActive('/pick_marketplace')];
            
            if ($_SESSION['role'] === 'admin') {
                $nav[] = ['label' => '👥 Users', 'url' => '/admin_users.php', 'active' => ViewHelper::isActive('/admin_users')];
                $nav[] = ['label' => '⚙️ Settings', 'url' => '/admin_settings.php', 'active' => ViewHelper::isActive('/admin_settings')];
            }
        }
        
        return $nav;
    }
    
    /**
     * Render login view
     */
    public static function login($data = []) {
        $data['header'] = [
            'title' => '🎯 SmartPicks Pro',
            'subtitle' => 'Football Betting Platform'
        ];
        $data['navigation'] = [];
        $data['footer'] = false;
        
        self::render('login', $data);
    }
    
    /**
     * Render dashboard view
     */
    public static function dashboard($data = []) {
        $data['header'] = [
            'title' => '🏠 Dashboard',
            'subtitle' => 'Welcome back, ' . ($_SESSION['display_name'] ?? 'User')
        ];
        
        self::render('dashboard', $data);
    }
    
    /**
     * Render pick management view
     */
    public static function pickManagement($data = []) {
        $data['header'] = [
            'title' => '🎯 Pick Management',
            'subtitle' => 'Create and manage your accumulator picks'
        ];
        
        self::render('pick_management', $data);
    }
    
    /**
     * Render pick marketplace view
     */
    public static function pickMarketplace($data = []) {
        $data['header'] = [
            'title' => '🛒 Pick Marketplace',
            'subtitle' => 'Browse and purchase accumulator picks'
        ];
        
        self::render('pick_marketplace', $data);
    }
    
    /**
     * Render admin users view
     */
    public static function adminUsers($data = []) {
        $data['header'] = [
            'title' => '👥 Admin - User Management',
            'subtitle' => 'Manage user accounts and permissions'
        ];
        
        self::render('admin_users', $data);
    }
    
    /**
     * Render admin settings view
     */
    public static function adminSettings($data = []) {
        $data['header'] = [
            'title' => '⚙️ Admin - System Settings',
            'subtitle' => 'Configure system settings and preferences'
        ];
        
        self::render('admin_settings', $data);
    }
    
    /**
     * Render profile view
     */
    public static function profile($data = []) {
        $data['header'] = [
            'title' => '👤 Profile',
            'subtitle' => 'Manage your account settings'
        ];
        
        self::render('profile', $data);
    }
    
    /**
     * Render register view
     */
    public static function register($data = []) {
        $data['header'] = [
            'title' => '📝 Register',
            'subtitle' => 'Create your SmartPicks Pro account'
        ];
        $data['navigation'] = [];
        $data['footer'] = false;
        
        self::render('register', $data);
    }
}
?>
