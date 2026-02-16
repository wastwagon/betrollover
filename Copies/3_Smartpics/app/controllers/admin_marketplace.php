<?php
/**
 * Admin Marketplace - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get marketplace data
$marketplaceData = [];
$stats = [];

try {
    // Get all marketplace listings with details
    $marketplaceData = $db->fetchAll("
        SELECT 
            pm.*,
            at.title,
            at.description,
            at.total_odds,
            at.price,
            at.status as pick_status,
            u.username as seller_name,
            u.display_name as seller_display_name,
            COUNT(upp.id) as purchase_count
        FROM pick_marketplace pm
        JOIN accumulator_tickets at ON pm.accumulator_id = at.id
        JOIN users u ON pm.seller_id = u.id
        LEFT JOIN user_purchased_picks upp ON pm.accumulator_id = upp.accumulator_id
        GROUP BY pm.id
        ORDER BY pm.created_at DESC
    ");
    
    // Get marketplace statistics
    $stats['total_listings'] = count($marketplaceData);
    $stats['active_listings'] = count(array_filter($marketplaceData, function($item) { return $item['status'] === 'active'; }));
    $stats['total_sales'] = array_sum(array_column($marketplaceData, 'purchase_count'));
    $stats['total_revenue'] = array_sum(array_column($marketplaceData, function($item) { return $item['purchase_count'] * $item['price']; }));
    
} catch (Exception $e) {
    $marketplaceData = [];
    $stats = [
        'total_listings' => 0,
        'active_listings' => 0,
        'total_sales' => 0,
        'total_revenue' => 0
    ];
}

// Set page variables
$pageTitle = "Marketplace Management";
$pageSubtitle = "Manage marketplace listings and monitor sales performance.";

// Start content buffer
ob_start();
?>

<div class="container">
    <div class="card">
        <h2><i class="fas fa-store"></i> Marketplace Management</h2>
        <p style="color: #666; margin-top: 10px;"><?php echo $pageSubtitle; ?></p>
    </div>
    
    <!-- Statistics Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Listings</p>
                    <p style="font-size: 28px; font-weight: bold; color: #d32f2f;"><?php echo number_format($stats['total_listings']); ?></p>
                </div>
                <i class="fas fa-list" style="font-size: 32px; color: #d32f2f;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Active Listings</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;"><?php echo number_format($stats['active_listings']); ?></p>
                </div>
                <i class="fas fa-check-circle" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Sales</p>
                    <p style="font-size: 28px; font-weight: bold; color: #17a2b8;"><?php echo number_format($stats['total_sales']); ?></p>
                </div>
                <i class="fas fa-shopping-cart" style="font-size: 32px; color: #17a2b8;"></i>
            </div>
        </div>
        
        <div class="card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Total Revenue</p>
                    <p style="font-size: 28px; font-weight: bold; color: #2e7d32;">GHS <?php echo number_format($stats['total_revenue'], 2); ?></p>
                </div>
                <i class="fas fa-dollar-sign" style="font-size: 32px; color: #2e7d32;"></i>
            </div>
        </div>
    </div>
    
    <!-- Marketplace Listings -->
    <div class="card">
        <h3><i class="fas fa-store"></i> Marketplace Listings</h3>
        
        <?php if (empty($marketplaceData)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-store" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
            <p>No marketplace listings found.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Title</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Seller</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Price</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Odds</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Sales</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Views</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Created</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($marketplaceData as $listing): ?>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px;">
                            <div>
                                <strong style="color: #d32f2f;"><?php echo htmlspecialchars($listing['title']); ?></strong>
                                <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">
                                    <?php echo htmlspecialchars(substr($listing['description'], 0, 50)) . (strlen($listing['description']) > 50 ? '...' : ''); ?>
                                </p>
                            </div>
                        </td>
                        <td style="padding: 12px;">
                            <?php echo htmlspecialchars($listing['seller_display_name'] ?: $listing['seller_name']); ?>
                        </td>
                        <td style="padding: 12px;">
                            <span style="color: <?php echo $listing['price'] == 0 ? '#17a2b8' : '#2e7d32'; ?>; font-weight: bold;">
                                <?php echo $listing['price'] == 0 ? 'FREE' : 'GHS ' . number_format($listing['price'], 2); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background: #2e7d32; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                <?php echo number_format($listing['total_odds'], 2); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="color: #17a2b8; font-weight: bold;">
                                <?php echo $listing['purchase_count']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="color: #6f42c1; font-weight: bold;">
                                <?php echo $listing['view_count'] ?? 0; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php 
                                echo $listing['status'] === 'active' ? '#2e7d32' : 
                                    ($listing['status'] === 'sold' ? '#17a2b8' : '#d32f2f'); 
                            ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                                <?php echo ucfirst($listing['status']); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <?php echo date('M j, Y', strtotime($listing['created_at'])); ?>
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-secondary" onclick="viewListingDetails(<?php echo $listing['id']; ?>)">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <?php if ($listing['status'] === 'active'): ?>
                                <button class="btn btn-warning" onclick="deactivateListing(<?php echo $listing['id']; ?>)">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <?php else: ?>
                                <button class="btn btn-success" onclick="activateListing(<?php echo $listing['id']; ?>)">
                                    <i class="fas fa-play"></i>
                                </button>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
</div>

<script>
function viewListingDetails(listingId) {
    alert('Listing details view will be implemented');
}

function deactivateListing(listingId) {
    if (confirm('Are you sure you want to deactivate this listing?')) {
        // Implement deactivation logic
        alert('Listing deactivation will be implemented');
    }
}

function activateListing(listingId) {
    if (confirm('Are you sure you want to activate this listing?')) {
        // Implement activation logic
        alert('Listing activation will be implemented');
    }
}
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include the admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

