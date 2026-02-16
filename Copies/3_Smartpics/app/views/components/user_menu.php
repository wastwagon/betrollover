<?php
/**
 * User Menu Component
 * Clean menu for user dashboard
 */
// Detect base URL - only use /SmartPicksPro-Local for local development
$baseUrl = '';
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
    // Only use base path on localhost
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
        $baseUrl = '/SmartPicksPro-Local';
    }
}
$currentPage = basename($_SERVER['PHP_SELF'], '.php');

$menuItems = [
    ["url" => "$baseUrl/user_dashboard", "icon" => "fas fa-tachometer-alt", "text" => "Dashboard"],
    ["url" => "$baseUrl/marketplace", "icon" => "fas fa-store", "text" => "Marketplace"],
    ["url" => "$baseUrl/public_chat", "icon" => "fas fa-comments", "text" => "Public Chat"],
    ["url" => "$baseUrl/wallet", "icon" => "fas fa-wallet", "text" => "Wallet"],
    ["url" => "$baseUrl/referrals", "icon" => "fas fa-user-friends", "text" => "Referrals"],
    ["url" => "$baseUrl/user_transactions", "icon" => "fas fa-history", "text" => "Transactions"],
    ["url" => "$baseUrl/my_purchases", "icon" => "fas fa-shopping-bag", "text" => "My Purchases"],
    ["url" => "$baseUrl/support", "icon" => "fas fa-headset", "text" => "Support"],
    ["url" => "$baseUrl/profile", "icon" => "fas fa-user", "text" => "Profile"],
    ["url" => "$baseUrl/become_tipster", "icon" => "fas fa-star", "text" => "Become Tipster"],
    ["url" => "$baseUrl/settings", "icon" => "fas fa-cog", "text" => "Settings"],
    ["url" => "$baseUrl/logout", "icon" => "fas fa-sign-out-alt", "text" => "Logout"]
];

foreach ($menuItems as $item) {
    $activeClass = '';
    if (strpos($item['url'], $currentPage) !== false || 
        ($currentPage === 'self_contained_user_dashboard' && strpos($item['url'], 'user_dashboard') !== false)) {
        $activeClass = 'active';
    }
    
    echo '<a href="' . $item['url'] . '" class="' . $activeClass . '">';
    echo '<i class="' . $item['icon'] . '"></i>';
    echo $item['text'];
    echo '</a>';
}
?>
