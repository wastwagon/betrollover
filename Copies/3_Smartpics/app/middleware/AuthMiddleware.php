<?php
/**
 * SmartPicks Pro - Authentication Middleware
 */

class AuthMiddleware {
    
    /**
     * Require user to be authenticated
     */
    public static function requireAuth() {
        if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
            header('Location: /SmartPicksPro-Local/login');
            exit;
        }
    }
    
    /**
     * Require user to be admin
     */
    public static function requireAdmin() {
        self::requireAuth();
        if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            header('Location: /SmartPicksPro-Local/dashboard');
            exit;
        }
    }
    
    /**
     * Check if user is authenticated
     */
    public static function isAuthenticated() {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }
    
    /**
     * Check if user is admin
     */
    public static function isAdmin() {
        return self::isAuthenticated() && isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
    }
    
    /**
     * Get current user ID
     */
    public static function getUserId() {
        return $_SESSION['user_id'] ?? null;
    }
    
    /**
     * Get current user role
     */
    public static function getUserRole() {
        return $_SESSION['role'] ?? 'user';
    }
}