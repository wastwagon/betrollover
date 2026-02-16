<?php
/**
 * Admin Menu Component
 * Clean menu for admin dashboard
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
    ["url" => "$baseUrl/admin_dashboard", "icon" => "fas fa-tachometer-alt", "text" => "Dashboard"],
    ["url" => "$baseUrl/admin_approve_pick", "icon" => "fas fa-clock", "text" => "Pending Approvals"],
    ["url" => "$baseUrl/admin_picks", "icon" => "fas fa-chart-line", "text" => "All Picks"],
    ["url" => "$baseUrl/marketplace", "icon" => "fas fa-store", "text" => "Marketplace"],
    ["url" => "$baseUrl/admin_users", "icon" => "fas fa-users", "text" => "Users"],
    ["url" => "$baseUrl/admin_analytics", "icon" => "fas fa-chart-bar", "text" => "Analytics"],
    ["url" => "$baseUrl/admin_leaderboard", "icon" => "fas fa-trophy", "text" => "Leaderboard"],
    ["url" => "$baseUrl/admin_escrow", "icon" => "fas fa-lock", "text" => "Escrow Funds"],
    ["url" => "$baseUrl/admin_wallet", "icon" => "fas fa-wallet", "text" => "Wallet Management"],
    ["url" => "$baseUrl/admin_payouts", "icon" => "fas fa-money-bill-wave", "text" => "Payout Management"],
    ["url" => "$baseUrl/admin_settlement", "icon" => "fas fa-gavel", "text" => "Pick Settlement"],
    ["url" => "$baseUrl/admin_financial_reports", "icon" => "fas fa-chart-line", "text" => "Financial Reports"],
    ["url" => "$baseUrl/admin_chat", "icon" => "fas fa-comments", "text" => "Chat Moderation"],
    ["url" => "$baseUrl/admin_verification", "icon" => "fas fa-check-circle", "text" => "Verification"],
    ["url" => "$baseUrl/admin_qualification", "icon" => "fas fa-user-check", "text" => "Qualification"],
    ["url" => "$baseUrl/admin_contests", "icon" => "fas fa-trophy", "text" => "Contests"],
    ["url" => "$baseUrl/admin_mentorship", "icon" => "fas fa-graduation-cap", "text" => "Mentorship"],
    ["url" => "$baseUrl/admin_support", "icon" => "fas fa-headset", "text" => "Support"],
    ["url" => "$baseUrl/admin_settings", "icon" => "fas fa-cog", "text" => "Settings"],
    ["url" => "$baseUrl/admin_growth_settings", "icon" => "fas fa-rocket", "text" => "Growth Settings"],
    ["url" => "$baseUrl/logout", "icon" => "fas fa-sign-out-alt", "text" => "Logout"]
];

foreach ($menuItems as $item) {
    $activeClass = '';
    if (strpos($item['url'], $currentPage) !== false ||
        ($currentPage === 'self_contained_admin_dashboard' && strpos($item['url'], 'admin_dashboard') !== false) ||
        ($currentPage === 'marketplace' && strpos($item['url'], 'marketplace') !== false)) {
        $activeClass = 'active';
    }

    echo '<a href="' . $item['url'] . '" class="' . $activeClass . '">';
    echo '<i class="' . $item['icon'] . '"></i>';
    echo $item['text'];
    echo '</a>';
}
?>
