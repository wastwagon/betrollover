<?php
/**
 * Menu Routes Verification Script
 * Verifies all menu items have corresponding routes and controller files
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/app/models/Database.php';

echo "🔍 VERIFYING MENU ROUTES AND CONTROLLERS\n";
echo str_repeat("=", 60) . "\n\n";

// Define menu items for each role
$adminMenu = [
    'admin_dashboard', 'admin_approve_pick', 'admin_picks', 'marketplace',
    'admin_users', 'admin_analytics', 'admin_leaderboard', 'admin_escrow',
    'admin_wallet', 'admin_payouts', 'admin_settlement', 'admin_financial_reports',
    'admin_chat', 'admin_verification', 'admin_qualification', 'admin_contests',
    'admin_mentorship', 'admin_support', 'admin_settings', 'admin_growth_settings',
    'logout'
];

$userMenu = [
    'user_dashboard', 'marketplace', 'public_chat', 'wallet', 'referrals',
    'user_transactions', 'my_purchases', 'support', 'profile', 'become_tipster',
    'settings', 'logout'
];

$tipsterMenu = [
    'tipster_dashboard', 'create_pick', 'my_picks', 'marketplace', 'public_chat',
    'wallet', 'referrals', 'tipster_transactions', 'tipster_financial_review',
    'payout_request', 'support', 'profile', 'settings', 'logout'
];

// Read index.php to get all routes
$indexContent = file_get_contents(__DIR__ . '/index.php');
$routes = [];

// Extract all case statements
preg_match_all("/case\s+['\"]([^'\"]+)['\"]/", $indexContent, $matches);
$routes = $matches[1];

// Remove duplicates
$routes = array_unique($routes);

// Controller file mapping
$controllerMap = [
    'admin_dashboard' => 'admin_dashboard.php',
    'admin_approve_pick' => 'admin_approve_pick.php',
    'admin_picks' => 'admin_picks.php',
    'marketplace' => 'marketplace.php',
    'admin_users' => 'admin_users.php',
    'admin_analytics' => 'admin_analytics.php',
    'admin_leaderboard' => 'admin_leaderboard.php',
    'admin_escrow' => 'admin_escrow.php',
    'admin_wallet' => 'admin_wallet.php',
    'admin_payouts' => 'admin_payouts.php',
    'admin_settlement' => 'admin_settlement.php',
    'admin_financial_reports' => 'admin_financial_reports.php',
    'admin_chat' => 'admin_chat.php',
    'admin_verification' => 'admin_verification.php',
    'admin_qualification' => 'admin_qualification.php',
    'admin_contests' => 'admin_contests.php',
    'admin_mentorship' => 'admin_mentorship.php',
    'admin_support' => 'admin_support.php',
    'admin_settings' => 'admin_settings.php',
    'admin_growth_settings' => 'admin_growth_settings.php',
    'user_dashboard' => 'user_dashboard.php',
    'public_chat' => 'public_chat.php',
    'wallet' => 'wallet.php',
    'referrals' => 'referrals.php',
    'user_transactions' => 'user_transactions.php',
    'my_purchases' => 'my_purchases.php',
    'support' => 'support.php',
    'profile' => 'profile.php',
    'become_tipster' => 'become_tipster.php',
    'settings' => 'settings.php',
    'tipster_dashboard' => 'tipster_dashboard.php',
    'create_pick' => 'create_pick.php',
    'my_picks' => 'my_picks.php',
    'tipster_transactions' => 'tipster_transactions.php',
    'tipster_financial_review' => 'tipster_financial_review.php',
    'payout_request' => 'payout_request.php',
    'logout' => 'logout.php',
    'notifications' => 'notification_preferences.php'
];

$controllerPath = __DIR__ . '/app/controllers/';

// Verify Admin Menu
echo "📋 ADMIN MENU VERIFICATION\n";
echo str_repeat("-", 60) . "\n";
$adminIssues = [];
foreach ($adminMenu as $menuItem) {
    $hasRoute = in_array($menuItem, $routes);
    $controllerFile = $controllerMap[$menuItem] ?? null;
    $fileExists = $controllerFile && file_exists($controllerPath . $controllerFile);
    
    $status = ($hasRoute && $fileExists) ? '✅' : '❌';
    echo sprintf("%s %-30s", $status, $menuItem);
    
    if (!$hasRoute) {
        echo " [MISSING ROUTE]";
        $adminIssues[] = "$menuItem: Missing route in index.php";
    }
    if (!$fileExists) {
        echo " [MISSING FILE: " . ($controllerFile ?? 'N/A') . "]";
        $adminIssues[] = "$menuItem: Missing controller file " . ($controllerFile ?? 'N/A');
    }
    echo "\n";
}
echo "\n";

// Verify User Menu
echo "📋 USER MENU VERIFICATION\n";
echo str_repeat("-", 60) . "\n";
$userIssues = [];
foreach ($userMenu as $menuItem) {
    $hasRoute = in_array($menuItem, $routes);
    $controllerFile = $controllerMap[$menuItem] ?? null;
    $fileExists = $controllerFile && file_exists($controllerPath . $controllerFile);
    
    $status = ($hasRoute && $fileExists) ? '✅' : '❌';
    echo sprintf("%s %-30s", $status, $menuItem);
    
    if (!$hasRoute) {
        echo " [MISSING ROUTE]";
        $userIssues[] = "$menuItem: Missing route in index.php";
    }
    if (!$fileExists) {
        echo " [MISSING FILE: " . ($controllerFile ?? 'N/A') . "]";
        $userIssues[] = "$menuItem: Missing controller file " . ($controllerFile ?? 'N/A');
    }
    echo "\n";
}
echo "\n";

// Verify Tipster Menu
echo "📋 TIPSTER MENU VERIFICATION\n";
echo str_repeat("-", 60) . "\n";
$tipsterIssues = [];
foreach ($tipsterMenu as $menuItem) {
    $hasRoute = in_array($menuItem, $routes);
    $controllerFile = $controllerMap[$menuItem] ?? null;
    $fileExists = $controllerFile && file_exists($controllerPath . $controllerFile);
    
    $status = ($hasRoute && $fileExists) ? '✅' : '❌';
    echo sprintf("%s %-30s", $status, $menuItem);
    
    if (!$hasRoute) {
        echo " [MISSING ROUTE]";
        $tipsterIssues[] = "$menuItem: Missing route in index.php";
    }
    if (!$fileExists) {
        echo " [MISSING FILE: " . ($controllerFile ?? 'N/A') . "]";
        $tipsterIssues[] = "$menuItem: Missing controller file " . ($controllerFile ?? 'N/A');
    }
    echo "\n";
}
echo "\n";

// Summary
echo str_repeat("=", 60) . "\n";
echo "📊 SUMMARY\n";
echo str_repeat("=", 60) . "\n";

$totalIssues = count($adminIssues) + count($userIssues) + count($tipsterIssues);

if ($totalIssues === 0) {
    echo "✅ ALL MENU ITEMS ARE CORRECTLY CONFIGURED!\n";
    echo "   - All routes exist in index.php\n";
    echo "   - All controller files exist\n";
} else {
    echo "❌ FOUND $totalIssues ISSUE(S):\n\n";
    
    if (!empty($adminIssues)) {
        echo "Admin Menu Issues:\n";
        foreach ($adminIssues as $issue) {
            echo "  - $issue\n";
        }
        echo "\n";
    }
    
    if (!empty($userIssues)) {
        echo "User Menu Issues:\n";
        foreach ($userIssues as $issue) {
            echo "  - $issue\n";
        }
        echo "\n";
    }
    
    if (!empty($tipsterIssues)) {
        echo "Tipster Menu Issues:\n";
        foreach ($tipsterIssues as $issue) {
            echo "  - $issue\n";
        }
        echo "\n";
    }
}

echo "\n✅ Verification complete!\n";
?>

