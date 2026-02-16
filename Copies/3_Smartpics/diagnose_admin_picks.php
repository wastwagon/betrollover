<?php
/**
 * Diagnostic script for admin_picks.php errors
 * Run this on production to check database structure and query results
 */

require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/app/models/Database.php';

header('Content-Type: text/plain');

$db = Database::getInstance();

echo "=== ADMIN PICKS DIAGNOSTIC ===\n\n";

// 1. Check database structure
echo "1. Checking accumulator_tickets table structure:\n";
echo "-----------------------------------------------\n";
try {
    $columns = $db->fetchAll("SHOW COLUMNS FROM accumulator_tickets");
    echo "Columns found:\n";
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    
    // Check for specific columns
    $hasIsMarketplace = false;
    $hasIsApproved = false;
    foreach ($columns as $col) {
        if ($col['Field'] === 'is_marketplace') $hasIsMarketplace = true;
        if ($col['Field'] === 'is_approved') $hasIsApproved = true;
    }
    
    echo "\nHas is_marketplace: " . ($hasIsMarketplace ? 'YES' : 'NO') . "\n";
    echo "Has is_approved: " . ($hasIsApproved ? 'YES' : 'NO') . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

// 2. Test the actual query
echo "\n\n2. Testing the actual query:\n";
echo "----------------------------\n";
try {
    $testQuery = "
        SELECT 
            at.id,
            at.title,
            at.description,
            at.sport,
            at.total_odds,
            at.price,
            at.status,
            at.created_at,
            at.updated_at,
            COALESCE(u.username, 'Unknown') as tipster_name,
            u.username,
            u.display_name,
            COALESCE(at.is_marketplace, 0) as is_approved,
            COUNT(upp.id) as purchase_count
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        LEFT JOIN user_purchased_picks upp ON upp.accumulator_id = at.id
        GROUP BY at.id
        ORDER BY at.created_at DESC
        LIMIT 5
    ";
    
    $results = $db->fetchAll($testQuery);
    
    echo "Query executed successfully. Found " . count($results) . " records.\n\n";
    
    if (count($results) > 0) {
        echo "First record keys:\n";
        $firstRecord = $results[0];
        foreach (array_keys($firstRecord) as $key) {
            echo "  - $key\n";
        }
        
        echo "\nFirst record values:\n";
        echo "  - id: " . ($firstRecord['id'] ?? 'MISSING') . "\n";
        echo "  - title: " . ($firstRecord['title'] ?? 'MISSING') . "\n";
        echo "  - tipster_name: " . (isset($firstRecord['tipster_name']) ? $firstRecord['tipster_name'] : 'MISSING') . "\n";
        echo "  - is_approved: " . (isset($firstRecord['is_approved']) ? $firstRecord['is_approved'] : 'MISSING') . "\n";
        echo "  - is_marketplace: " . (isset($firstRecord['is_marketplace']) ? $firstRecord['is_marketplace'] : 'MISSING') . "\n";
        echo "  - status: " . ($firstRecord['status'] ?? 'MISSING') . "\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "SQL Error Code: " . $e->getCode() . "\n";
}

// 3. Check PHP version
echo "\n\n3. PHP Version and Settings:\n";
echo "----------------------------\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Error Reporting: " . (ini_get('error_reporting') ?: 'Not set') . "\n";
echo "Display Errors: " . (ini_get('display_errors') ?: 'Not set') . "\n";

// 4. Check if GROUP BY is causing issues
echo "\n\n4. Testing without GROUP BY:\n";
echo "----------------------------\n";
try {
    $simpleQuery = "
        SELECT 
            at.id,
            at.title,
            COALESCE(u.username, 'Unknown') as tipster_name,
            COALESCE(at.is_marketplace, 0) as is_approved
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        LIMIT 1
    ";
    
    $simpleResult = $db->fetch($simpleQuery);
    
    if ($simpleResult) {
        echo "Simple query works. Keys found:\n";
        foreach (array_keys($simpleResult) as $key) {
            echo "  - $key: " . (isset($simpleResult[$key]) ? 'EXISTS' : 'MISSING') . "\n";
        }
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n\n=== END DIAGNOSTIC ===\n";

