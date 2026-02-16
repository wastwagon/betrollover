<?php
/**
 * Test Tipster Applications Query
 * Run this on production to diagnose the issue
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/app/models/Database.php';

header('Content-Type: text/plain');

echo "Tipster Applications Diagnostic\n";
echo "================================\n\n";

try {
    $db = Database::getInstance();
    
    // 1. Check if table exists
    echo "1. Checking table existence:\n";
    $tables = $db->fetchAll("SHOW TABLES LIKE 'tipster%'");
    echo "   Tables found: ";
    foreach ($tables as $table) {
        $tableName = array_values($table)[0];
        echo $tableName . " ";
    }
    echo "\n\n";
    
    // 2. Check tipster_verification_applications structure
    echo "2. Checking tipster_verification_applications structure:\n";
    $columns = $db->fetchAll("SHOW COLUMNS FROM tipster_verification_applications");
    echo "   Columns: ";
    foreach ($columns as $col) {
        echo $col['Field'] . " ";
    }
    echo "\n\n";
    
    // 3. Count total applications
    echo "3. Counting applications:\n";
    $count = $db->fetch("SELECT COUNT(*) as count FROM tipster_verification_applications");
    echo "   Total applications: " . $count['count'] . "\n";
    
    $pendingCount = $db->fetch("SELECT COUNT(*) as count FROM tipster_verification_applications WHERE status = 'pending'");
    echo "   Pending applications: " . $pendingCount['count'] . "\n\n";
    
    // 4. Get all applications
    echo "4. Fetching all applications:\n";
    $applications = $db->fetchAll("
        SELECT 
            tva.id,
            tva.user_id,
            tva.experience,
            tva.specialties,
            tva.portfolio_url,
            tva.status,
            tva.created_at,
            u.username, 
            u.email
        FROM tipster_verification_applications tva
        LEFT JOIN users u ON tva.user_id = u.id
        ORDER BY tva.created_at DESC
    ");
    
    echo "   Applications found: " . count($applications) . "\n";
    foreach ($applications as $app) {
        echo "   - ID: {$app['id']}, User: {$app['username']}, Status: {$app['status']}, Created: {$app['created_at']}\n";
    }
    
    // 5. Test the exact query from admin_tipster_applications.php
    echo "\n5. Testing exact admin query:\n";
    $adminQuery = "
        SELECT 
            tva.id,
            tva.user_id,
            tva.experience,
            tva.specialties,
            tva.portfolio_url,
            tva.status,
            tva.created_at,
            tva.reviewed_at,
            tva.reviewed_by,
            tva.review_notes,
            u.username, 
            u.email, 
            u.full_name, 
            u.created_at as user_created_at
        FROM tipster_verification_applications tva
        JOIN users u ON tva.user_id = u.id
        ORDER BY tva.created_at DESC
    ";
    
    $testApps = $db->fetchAll($adminQuery);
    echo "   Query result count: " . count($testApps) . "\n";
    if (count($testApps) > 0) {
        echo "   First application: " . json_encode($testApps[0], JSON_PRETTY_PRINT) . "\n";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n\n✅ Diagnostic complete!\n";
?>

