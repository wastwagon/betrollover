<?php
/**
 * Tipster Menu Component
 * Clean menu for tipster dashboard
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
    ["url" => "$baseUrl/tipster_dashboard", "icon" => "fas fa-tachometer-alt", "text" => "Dashboard"],
    ["url" => "$baseUrl/create_pick", "icon" => "fas fa-plus-circle", "text" => "Create Pick"],
    ["url" => "$baseUrl/my_picks", "icon" => "fas fa-list", "text" => "My Picks"],
    ["url" => "$baseUrl/marketplace", "icon" => "fas fa-store", "text" => "Marketplace"],
    ["url" => "$baseUrl/public_chat", "icon" => "fas fa-comments", "text" => "Public Chat"],
    ["url" => "$baseUrl/wallet", "icon" => "fas fa-wallet", "text" => "Wallet"],
    ["url" => "$baseUrl/referrals", "icon" => "fas fa-user-friends", "text" => "Referrals"],
    ["url" => "$baseUrl/tipster_transactions", "icon" => "fas fa-history", "text" => "Transactions"],
    ["url" => "$baseUrl/tipster_financial_review", "icon" => "fas fa-chart-line", "text" => "Financial Review"],
    ["url" => "$baseUrl/payout_request", "icon" => "fas fa-money-bill-wave", "text" => "Payout Request"],
    ["url" => "$baseUrl/support", "icon" => "fas fa-headset", "text" => "Support"],
    ["url" => "$baseUrl/profile", "icon" => "fas fa-user", "text" => "Profile"],
    ["url" => "$baseUrl/settings", "icon" => "fas fa-cog", "text" => "Settings"],
    ["url" => "$baseUrl/logout", "icon" => "fas fa-sign-out-alt", "text" => "Logout"]
];

foreach ($menuItems as $item) {
    $activeClass = '';
    if (strpos($item['url'], $currentPage) !== false || 
        ($currentPage === 'self_contained_tipster_dashboard' && strpos($item['url'], 'tipster_dashboard') !== false)) {
        $activeClass = 'active';
    }
    
    echo '<a href="' . $item['url'] . '" class="' . $activeClass . '">';
    echo '<i class="' . $item['icon'] . '"></i>';
    echo $item['text'];
    echo '</a>';
}
?>
