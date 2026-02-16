<?php
/**
 * SmartPicks Pro - Logo Display Component
 * 
 * Reusable component for displaying logos across the platform
 */

require_once __DIR__ . '/../../models/LogoManager.php';

class LogoDisplay {
    
    private static $logoManager;
    
    public static function init() {
        if (!self::$logoManager) {
            self::$logoManager = LogoManager::getInstance();
        }
    }
    
    /**
     * Display main logo
     */
    public static function main($size = 'default', $class = '') {
        self::init();
        return self::$logoManager->getLogoHtml('main', $size, $class);
    }
    
    /**
     * Display admin logo
     */
    public static function admin($size = 'default', $class = '') {
        self::init();
        return self::$logoManager->getLogoHtml('admin', $size, $class);
    }
    
    /**
     * Display favicon
     */
    public static function favicon() {
        self::init();
        $url = self::$logoManager->getLogoUrl('favicon');
        return '<link rel="icon" type="image/x-icon" href="' . htmlspecialchars($url) . '">';
    }
    
    /**
     * Display logo with custom attributes
     */
    public static function custom($type = 'main', $size = 'default', $class = '', $attributes = []) {
        self::init();
        $url = self::$logoManager->getLogoUrl($type, $size);
        $alt = ucfirst($type) . ' Logo';
        
        $sizeClasses = [
            'small' => 'height="30"',
            'medium' => 'height="50"',
            'large' => 'height="80"',
            'default' => 'height="50"'
        ];
        
        $sizeAttr = $sizeClasses[$size] ?? $sizeClasses['default'];
        
        // Build custom attributes
        $customAttrs = '';
        foreach ($attributes as $key => $value) {
            $customAttrs .= ' ' . $key . '="' . htmlspecialchars($value) . '"';
        }
        
        return sprintf(
            '<img src="%s" alt="%s" %s class="logo %s" style="max-width: 100%%; height: auto;"%s>',
            htmlspecialchars($url),
            htmlspecialchars($alt),
            $sizeAttr,
            htmlspecialchars($class),
            $customAttrs
        );
    }
    
    /**
     * Display logo with link
     */
    public static function withLink($type = 'main', $size = 'default', $class = '', $linkUrl = '/', $linkClass = '') {
        $logo = self::custom($type, $size, $class);
        
        return sprintf(
            '<a href="%s" class="logo-link %s">%s</a>',
            htmlspecialchars($linkUrl),
            htmlspecialchars($linkClass),
            $logo
        );
    }
    
    /**
     * Display logo with text
     */
    public static function withText($type = 'main', $size = 'default', $class = '', $text = 'SmartPicks Pro', $textClass = '') {
        $logo = self::custom($type, $size, $class);
        
        return sprintf(
            '<div class="logo-with-text d-flex align-items-center">
                %s
                <span class="logo-text %s">%s</span>
            </div>',
            $logo,
            htmlspecialchars($textClass),
            htmlspecialchars($text)
        );
    }
    
    /**
     * Display logo in header
     */
    public static function header($type = 'main', $class = '') {
        return self::withLink($type, 'medium', $class, '/', 'navbar-brand');
    }
    
    /**
     * Display logo in sidebar
     */
    public static function sidebar($type = 'main', $class = '') {
        return self::withText($type, 'medium', $class, 'SmartPicks Pro', 'ms-2 fw-bold');
    }
    
    /**
     * Display logo in footer
     */
    public static function footer($type = 'main', $class = '') {
        return self::custom($type, 'small', $class);
    }
    
    /**
     * Display logo in email template
     */
    public static function email($type = 'main', $class = '') {
        self::init();
        $url = self::$logoManager->getLogoUrl($type, 'medium');
        
        return sprintf(
            '<img src="%s" alt="%s" class="logo %s" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">',
            htmlspecialchars($url),
            'SmartPicks Pro Logo',
            htmlspecialchars($class)
        );
    }
    
    /**
     * Display logo in mobile header
     */
    public static function mobileHeader($type = 'main', $class = '') {
        return self::custom($type, 'small', $class, ['style' => 'max-width: 120px; height: auto;']);
    }
    
    /**
     * Display logo in admin header
     */
    public static function adminHeader($class = '') {
        return self::header('admin', $class);
    }
    
    /**
     * Display logo in admin sidebar
     */
    public static function adminSidebar($class = '') {
        return self::sidebar('admin', $class);
    }
    
    /**
     * Get logo URL only
     */
    public static function getUrl($type = 'main', $size = 'default') {
        self::init();
        return self::$logoManager->getLogoUrl($type, $size);
    }
    
    /**
     * Check if logo exists
     */
    public static function exists($type = 'main') {
        self::init();
        $url = self::$logoManager->getLogoUrl($type);
        return !strpos($url, 'default-logo');
    }
    
    /**
     * Get logo dimensions
     */
    public static function getDimensions($type = 'main') {
        self::init();
        return self::$logoManager->getLogoDimensions($type);
    }
}

// Helper functions for easy use in templates
function logo($type = 'main', $size = 'default', $class = '') {
    return LogoDisplay::custom($type, $size, $class);
}

function logo_with_link($type = 'main', $size = 'default', $class = '', $linkUrl = '/', $linkClass = '') {
    return LogoDisplay::withLink($type, $size, $class, $linkUrl, $linkClass);
}

function logo_with_text($type = 'main', $size = 'default', $class = '', $text = 'SmartPicks Pro', $textClass = '') {
    return LogoDisplay::withText($type, $size, $class, $text, $textClass);
}

function favicon() {
    return LogoDisplay::favicon();
}
?>
