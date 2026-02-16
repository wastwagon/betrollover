<?php
/**
 * SmartPicks Pro - Marketplace API
 * 
 * Handles marketplace operations: purchase, filters, etc.
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/PickMarketplace.php';
require_once __DIR__ . '/../models/EscrowManager.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Set JSON header
header('Content-Type: application/json');

// Check authentication
try {
    AuthMiddleware::checkAuth();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$marketplace = PickMarketplace::getInstance();
$escrowManager = EscrowManager::getInstance();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'purchase_pick':
            handlePurchasePick();
            break;
        case 'get_marketplace_picks':
            handleGetMarketplacePicks();
            break;
        case 'get_pick_details':
            handleGetPickDetails();
            break;
        case 'search_picks':
            handleSearchPicks();
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} catch (Exception $e) {
    $logger->error("Marketplace API error", ['error' => $e->getMessage()]);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function handlePurchasePick() {
    global $db, $escrowManager;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $pickId = $input['pick_id'] ?? 0;
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    // Get pick details
    $pick = $db->fetch("
        SELECT at.*, u.username, u.display_name 
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        WHERE at.id = ? AND at.is_marketplace = 1 AND at.status = 'active'
    ", [$pickId]);
    
    if (!$pick) {
        echo json_encode(['success' => false, 'error' => 'Pick not found or not available']);
        return;
    }
    
    // Check if user is trying to buy their own pick
    if ($pick['user_id'] == $_SESSION['user_id']) {
        echo json_encode(['success' => false, 'error' => 'Cannot purchase your own pick']);
        return;
    }
    
    // Check if already purchased
    $existing = $db->fetch("
        SELECT id FROM user_purchased_picks 
        WHERE user_id = ? AND accumulator_id = ?
    ", [$_SESSION['user_id'], $pickId]);
    
    if ($existing) {
        echo json_encode(['success' => false, 'error' => 'Already purchased this pick']);
        return;
    }
    
    // Check wallet balance
    $wallet = $db->fetch("
        SELECT balance FROM user_wallets WHERE user_id = ?
    ", [$_SESSION['user_id']]);
    
    if (!$wallet || $wallet['balance'] < $pick['price']) {
        echo json_encode(['success' => false, 'error' => 'Insufficient balance']);
        return;
    }
    
    // Deduct amount from buyer's wallet
    $db->execute("
        UPDATE user_wallets 
        SET balance = balance - ? 
        WHERE user_id = ?
    ", [$pick['price'], $_SESSION['user_id']]);
    
    // Record transaction
    $db->insert("
        INSERT INTO wallet_transactions 
        (user_id, type, amount, description, status, created_at) 
        VALUES (?, 'purchase', ?, 'Pick purchase', 'completed', NOW())
    ", [$_SESSION['user_id'], $pick['price']]);
    
    // Add to escrow
    $escrowManager->addToEscrow($pick['user_id'], $pick['price'], $pickId, 'pick_sale');
    
    // Record purchase
    $purchaseId = $db->insert("
        INSERT INTO user_purchased_picks 
        (user_id, accumulator_id, purchase_price, purchase_date) 
        VALUES (?, ?, ?, NOW())
    ", [$_SESSION['user_id'], $pickId, $pick['price']]);
    
    // Update pick stats
    $db->execute("
        UPDATE accumulator_tickets 
        SET purchases = purchases + 1 
        WHERE id = ?
    ", [$pickId]);
    
    $logger->info("Pick purchased", [
        'user_id' => $_SESSION['user_id'],
        'pick_id' => $pickId,
        'price' => $pick['price'],
        'purchase_id' => $purchaseId
    ]);
    
    echo json_encode(['success' => true, 'purchase_id' => $purchaseId]);
}

function handleGetMarketplacePicks() {
    global $marketplace;
    
    $filters = [
        'category' => $_GET['category'] ?? 'all',
        'price_range' => $_GET['price_range'] ?? 'all',
        'verified_only' => $_GET['verified'] ?? false
    ];
    
    $sortBy = $_GET['sort'] ?? 'popular';
    $limit = $_GET['limit'] ?? 20;
    $offset = $_GET['offset'] ?? 0;
    
    $picks = $marketplace->getMarketplacePicks($filters, $sortBy, $limit, $offset);
    echo json_encode(['success' => true, 'picks' => $picks]);
}

function handleGetPickDetails() {
    global $db;
    
    $pickId = $_GET['pick_id'] ?? 0;
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    $pick = $db->fetch("
        SELECT 
            at.*,
            u.username,
            u.display_name,
            u.avatar,
            u.country,
            tp.is_verified,
            tp.is_featured,
            (SELECT COUNT(*) FROM pick_likes WHERE pick_id = at.id) as like_count,
            (SELECT COUNT(*) FROM pick_shares WHERE pick_id = at.id) as share_count,
            (SELECT COUNT(*) FROM pick_comments WHERE pick_id = at.id) as comment_count
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        LEFT JOIN tipster_profiles tp ON u.id = tp.user_id
        WHERE at.id = ?
    ", [$pickId]);
    
    if (!$pick) {
        echo json_encode(['success' => false, 'error' => 'Pick not found']);
        return;
    }
    
    // Get pick selections
    $selections = $db->fetchAll("
        SELECT * FROM pick_selections WHERE pick_id = ?
        ORDER BY created_at ASC
    ", [$pickId]);
    
    $pick['selections'] = $selections;
    
    echo json_encode(['success' => true, 'pick' => $pick]);
}

function handleSearchPicks() {
    global $db;
    
    $query = $_GET['q'] ?? '';
    $limit = $_GET['limit'] ?? 20;
    
    if (empty($query)) {
        echo json_encode(['success' => false, 'error' => 'Search query required']);
        return;
    }
    
    $picks = $db->fetchAll("
        SELECT 
            at.*,
            u.username,
            u.display_name,
            u.avatar,
            u.country,
            tp.is_verified,
            tp.is_featured,
            (SELECT COUNT(*) FROM pick_likes WHERE pick_id = at.id) as like_count,
            (SELECT COUNT(*) FROM pick_shares WHERE pick_id = at.id) as share_count,
            (SELECT COUNT(*) FROM pick_comments WHERE pick_id = at.id) as comment_count
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        LEFT JOIN tipster_profiles tp ON u.id = tp.user_id
        WHERE at.is_marketplace = 1 
        AND at.status = 'active'
        AND (at.title LIKE ? OR at.description LIKE ? OR u.display_name LIKE ?)
        ORDER BY at.created_at DESC
        LIMIT ?
    ", ["%{$query}%", "%{$query}%", "%{$query}%", $limit]);
    
    echo json_encode(['success' => true, 'picks' => $picks]);
}
?>


