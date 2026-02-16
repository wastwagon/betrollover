<?php
/**
 * Clear PHP OPcache
 * Run this once, then delete it for security
 */

header('Content-Type: text/plain');

echo "Clearing PHP OPcache...\n\n";

if (function_exists('opcache_reset')) {
    if (opcache_reset()) {
        echo "✅ OPcache cleared successfully!\n\n";
        echo "Next steps:\n";
        echo "1. Delete this file (clear_opcache.php) for security\n";
        echo "2. Test your admin_analytics page\n";
        echo "3. The error should now be resolved!\n";
    } else {
        echo "⚠️ OPcache reset returned false (may need server restart)\n";
    }
} else {
    echo "⚠️ OPcache functions not available\n";
    echo "You may need to restart PHP-FPM or contact your hosting provider\n";
}

// Also try to invalidate the specific file
if (function_exists('opcache_invalidate')) {
    $file = __DIR__ . '/app/controllers/admin_analytics.php';
    if (file_exists($file)) {
        opcache_invalidate($file, true);
        echo "\n✅ Invalidated admin_analytics.php cache\n";
    }
}

echo "\n";
echo "File last modified: " . date('Y-m-d H:i:s', filemtime(__DIR__ . '/app/controllers/admin_analytics.php')) . "\n";
?>

