<?php
/**
 * Admin Analytics Diagnostic Script
 * Run this on production server to diagnose the issue
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Admin Analytics Diagnostic</h2>";
echo "<pre>";

// 1. Check file location
$filePath = __DIR__ . '/app/controllers/admin_analytics.php';
echo "1. File Path: " . $filePath . "\n";
echo "   Exists: " . (file_exists($filePath) ? "YES ✅" : "NO ❌") . "\n";
echo "   Size: " . (file_exists($filePath) ? filesize($filePath) . " bytes" : "N/A") . "\n";
echo "\n";

// 2. Check if file has the fix
if (file_exists($filePath)) {
    $content = file_get_contents($filePath);
    
    echo "2. Code Checks:\n";
    echo "   Has 'COALESCE(at.is_marketplace, 0) as is_approved': " . 
         (strpos($content, "COALESCE(at.is_marketplace, 0) as is_approved") !== false ? "YES ✅" : "NO ❌") . "\n";
    echo "   Has 'isset(\$recentPick['is_approved'])': " . 
         (strpos($content, "isset(\$recentPick['is_approved'])") !== false ? "YES ✅" : "NO ❌") . "\n";
    echo "   Has 'Safely get is_approved value': " . 
         (strpos($content, "Safely get is_approved value") !== false ? "YES ✅" : "NO ❌") . "\n";
    echo "\n";
    
    // 3. Check for old problematic code
    echo "3. Old Code Check (should be NO):\n";
    echo "   Has direct access '\$recentPick['is_approved']' (without isset): " . 
         (preg_match('/\$recentPick\[\'is_approved\'\]\s*\?/', $content) ? "YES ❌" : "NO ✅") . "\n";
    echo "\n";
    
    // 4. Show relevant lines
    echo "4. Relevant Code Snippet (lines around 265-290):\n";
    $lines = explode("\n", $content);
    for ($i = 260; $i < min(295, count($lines)); $i++) {
        if (isset($lines[$i])) {
            $lineNum = $i + 1;
            $line = $lines[$i];
            if (stripos($line, 'is_approved') !== false || 
                stripos($line, 'Safely get') !== false ||
                stripos($line, 'isset') !== false) {
                echo sprintf("   Line %3d: %s\n", $lineNum, htmlspecialchars(substr($line, 0, 100)));
            }
        }
    }
    echo "\n";
}

// 5. Check database connection
echo "5. Database Check:\n";
try {
    require_once __DIR__ . '/config/config.php';
    require_once __DIR__ . '/app/models/Database.php';
    
    $db = Database::getInstance();
    echo "   Connection: OK ✅\n";
    
    // Check if is_marketplace column exists
    $result = $db->fetch("SHOW COLUMNS FROM accumulator_tickets LIKE 'is_marketplace'");
    echo "   Column 'is_marketplace' exists: " . ($result ? "YES ✅" : "NO ❌") . "\n";
    
    // Test the actual query
    echo "\n6. Testing SQL Query:\n";
    $testQuery = "
        SELECT 
            at.title, 
            at.price, 
            at.status, 
            u.username as tipster_name, 
            at.created_at,
            COALESCE(at.is_marketplace, 0) as is_approved
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        ORDER BY at.created_at DESC
        LIMIT 1
    ";
    
    $testResult = $db->fetch($testQuery);
    if ($testResult) {
        echo "   Query executed: SUCCESS ✅\n";
        echo "   Result keys: " . implode(', ', array_keys($testResult)) . "\n";
        echo "   Has 'is_approved' key: " . (isset($testResult['is_approved']) ? "YES ✅" : "NO ❌") . "\n";
    } else {
        echo "   Query executed: NO RESULTS ⚠️\n";
    }
    
} catch (Exception $e) {
    echo "   Error: " . $e->getMessage() . " ❌\n";
}

// 7. Check PHP version
echo "\n7. PHP Version: " . phpversion() . "\n";

// 8. Check if opcache is enabled
echo "8. OPcache Status:\n";
if (function_exists('opcache_get_status')) {
    $opcache = opcache_get_status();
    echo "   Enabled: " . ($opcache['opcache_enabled'] ? "YES ⚠️ (may need to clear)" : "NO ✅") . "\n";
} else {
    echo "   OPcache: Not available\n";
}

echo "\n</pre>";
echo "<p><strong>If fixes are present but still not working:</strong></p>";
echo "<ol>";
echo "<li>Clear PHP OPcache: <code>opcache_reset();</code> or restart PHP-FPM</li>";
echo "<li>Check if there's a different admin_analytics.php file being loaded</li>";
echo "<li>Check server error logs for actual error message</li>";
echo "<li>Verify file permissions (should be 644)</li>";
echo "</ol>";
?>

