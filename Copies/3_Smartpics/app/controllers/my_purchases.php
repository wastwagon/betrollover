<?php
/**
 * My Purchases - Clean, Simple Version
 * Uses the new layout system
 */

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

$db = Database::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'user';

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Get purchased picks from user_purchased_picks table
$purchases = [];
try {
    $purchases = $db->fetchAll("
        SELECT 
            upp.id,
            upp.purchase_price,
            upp.purchase_date,
            upp.settlement_status,
            at.id as pick_id,
            at.title,
            at.description,
            at.sport,
            at.total_odds,
            at.status as pick_status,
            u.username as tipster_name,
            u.display_name as tipster_display_name
        FROM user_purchased_picks upp
        JOIN accumulator_tickets at ON upp.accumulator_id = at.id
        JOIN users u ON at.user_id = u.id
        WHERE upp.user_id = ? 
        ORDER BY upp.purchase_date DESC
    ", [$userId]);
} catch (Exception $e) {
    $purchases = [];
    $error = 'Error loading purchases: ' . $e->getMessage();
}

// Set page variables
$pageTitle = "My Purchases";

// Start content buffer
ob_start();
?>

<div class="my-purchases-content">
    <?php if (isset($error) && $error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-shopping-bag"></i> My Purchases</h2>
        <p style="color: #666; margin-top: 10px;">View all the picks you've purchased from tipsters.</p>
    </div>
    
    <?php if (empty($purchases)): ?>
    <div class="card">
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-shopping-bag" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h3>No purchases yet</h3>
            <p style="color: #666; margin-bottom: 20px;">Start by browsing the marketplace and purchasing picks from verified tipsters.</p>
            <a href="<?= $baseUrl ?>/marketplace" class="btn btn-primary">
                <i class="fas fa-store"></i> Browse Marketplace
            </a>
        </div>
    </div>
    <?php else: ?>
    
    <div class="card">
        <h3><i class="fas fa-list"></i> Purchase History</h3>
        <p style="color: #666; margin-top: 10px;">Total purchases: <?php echo count($purchases); ?></p>
    </div>
    
    <div style="display: grid; gap: 20px;">
        <?php foreach ($purchases as $purchase): ?>
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <h4 style="color: #d32f2f; margin-bottom: 10px;">
                        <?php echo htmlspecialchars($purchase['title'] ?? 'N/A'); ?>
                    </h4>
                    <?php if (!empty($purchase['description'])): ?>
                    <p style="color: #666; margin-bottom: 10px;">
                        <?php echo htmlspecialchars($purchase['description']); ?>
                    </p>
                    <?php endif; ?>
                </div>
                <div style="text-align: right; margin-left: 20px;">
                    <p style="font-size: 20px; font-weight: bold; color: #2e7d32;">
                        GHS <?php echo number_format((float)($purchase['purchase_price'] ?? 0), 2); ?>
                    </p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div>
                    <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Tipster</p>
                    <p style="font-weight: 500;"><i class="fas fa-user"></i> <?php echo htmlspecialchars($purchase['tipster_display_name'] ?? $purchase['tipster_name'] ?? 'N/A'); ?></p>
                </div>
                
                <div>
                    <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Sport</p>
                    <p style="font-weight: 500;"><i class="fas fa-tag"></i> <?php echo ucfirst($purchase['sport'] ?? 'N/A'); ?></p>
                </div>
                
                <div>
                    <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Purchased</p>
                    <p style="font-weight: 500;"><i class="fas fa-calendar"></i> <?php echo isset($purchase['purchase_date']) ? date('M j, Y g:i A', strtotime($purchase['purchase_date'])) : 'N/A'; ?></p>
                </div>
                
                <div>
                    <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Settlement Status</p>
                    <?php 
                    $status = $purchase['settlement_status'] ?? 'pending';
                    $statusColor = $status === 'won' ? '#2e7d32' : ($status === 'lost' ? '#d32f2f' : '#856404');
                    ?>
                    <span style="background-color: <?php echo $statusColor; ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;">
                        <?php echo strtoupper($status); ?>
                    </span>
                </div>
            </div>
            
            <?php if (!empty($purchase['total_odds'])): ?>
            <div style="margin-bottom: 15px;">
                <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Total Odds</p>
                <p style="font-weight: 500;"><?php echo number_format((float)$purchase['total_odds'], 2); ?></p>
            </div>
            <?php endif; ?>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="viewCoupon(<?php echo $purchase['pick_id']; ?>)">
                    <i class="fas fa-eye"></i> View Coupon Details
                </button>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    
    <?php endif; ?>
</div>

<!-- Coupon Details Modal -->
<div id="couponModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; overflow-y: auto;">
    <div style="position: relative; background: white; margin: 50px auto; max-width: 800px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); padding: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;">
            <h3 style="color: #d32f2f; margin: 0;">Coupon Details</h3>
            <button onclick="closeCouponModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
        </div>
        <div id="coupon-content">
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #d32f2f; margin-bottom: 15px;"></i>
                <p>Loading coupon details...</p>
            </div>
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: right;">
            <button onclick="closeCouponModal()" class="btn btn-secondary" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                Close
            </button>
        </div>
    </div>
</div>

<script>
function viewCoupon(accumulatorId) {
    // Get base URL dynamically
    const baseUrl = '<?php echo $baseUrl; ?>';
    
    // Show modal
    document.getElementById('couponModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Reset content
    document.getElementById('coupon-content').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #d32f2f; margin-bottom: 15px;"></i>
            <p>Loading coupon details...</p>
        </div>
    `;
    
    // Fetch coupon details
    fetch(`${baseUrl}/api/get_coupon_details.php?accumulator_id=${accumulatorId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const coupon = data.coupon;
                const picks = data.picks;
                
                let content = `
                    <div style="text-align: left;">
                        <div style="background: #d32f2f; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0;">${coupon.title || 'N/A'}</h4>
                            ${coupon.description ? `<p style="margin: 0; opacity: 0.9;">${coupon.description}</p>` : ''}
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Total Odds:</strong><br>
                                <span style="color: #2e7d32; font-size: 18px; font-weight: bold;">${parseFloat(coupon.total_odds || 0).toFixed(2)}</span>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Number of Picks:</strong><br>
                                <span style="color: #d32f2f; font-size: 18px; font-weight: bold;">${picks.length}</span>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Price:</strong><br>
                                <span style="color: ${coupon.price == 0 ? '#17a2b8' : '#2e7d32'}; font-size: 18px; font-weight: bold;">
                                    ${coupon.price == 0 ? 'FREE' : 'GHS ' + parseFloat(coupon.price || 0).toFixed(2)}
                                </span>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <strong>Status:</strong><br>
                                <span style="color: ${coupon.status === 'active' ? '#2e7d32' : coupon.status === 'settled' ? '#17a2b8' : '#ff9800'}; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                                    ${coupon.status || 'N/A'}
                                </span>
                            </div>
                        </div>
                        
                        <h4 style="color: #d32f2f; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Individual Picks:</h4>
                        <div style="max-height: 400px; overflow-y: auto;">
                `;
                
                if (picks.length === 0) {
                    content += `
                        <div style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                            <p>No picks found for this coupon.</p>
                        </div>
                    `;
                } else {
                    picks.forEach((pick, index) => {
                        const matchDate = pick.match_date ? new Date(pick.match_date).toLocaleString() : 'Not specified';
                        const statusColor = pick.result === 'pending' ? '#ff9800' : pick.result === 'won' ? '#2e7d32' : pick.result === 'lost' ? '#d32f2f' : '#666';
                        const statusText = pick.result ? pick.result.charAt(0).toUpperCase() + pick.result.slice(1) : 'Pending';
                        
                        content += `
                            <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #fafafa;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <strong style="color: #d32f2f; font-size: 16px;">Pick ${index + 1}</strong>
                                    <span style="background: #2e7d32; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;">
                                        ${parseFloat(pick.odds || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                                    <strong style="color: #666;">Match:</strong> 
                                    <span style="color: #333;">${pick.match_description || 'N/A'}</span>
                                </div>
                                <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                                    <strong style="color: #666;">Prediction:</strong> 
                                    <span style="color: #d32f2f; font-weight: 600;">${pick.prediction || 'N/A'}</span>
                                </div>
                                <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px;">
                                    <strong style="color: #666;">Match Time:</strong> 
                                    <span style="color: #333;">${matchDate}</span>
                                </div>
                                <div style="padding: 8px; background: white; border-radius: 4px;">
                                    <strong style="color: #666;">Status:</strong> 
                                    <span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase;">
                                        ${statusText}
                                    </span>
                                </div>
                            </div>
                        `;
                    });
                }
                
                content += `
                        </div>
                    </div>
                `;
                
                document.getElementById('coupon-content').innerHTML = content;
            } else {
                document.getElementById('coupon-content').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #d32f2f;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 15px;"></i>
                        <p style="font-size: 16px; font-weight: 600;">Error loading coupon details</p>
                        <p style="color: #666; margin-top: 10px;">${data.message || 'Please try again later.'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading coupon details:', error);
            document.getElementById('coupon-content').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #d32f2f;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px; opacity: 0.7;"></i>
                    <p style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">Error loading coupon details</p>
                    <p style="color: #666; margin-top: 10px;">Please try again. If the problem persists, contact support.</p>
                </div>
            `;
        });
}

function closeCouponModal() {
    document.getElementById('couponModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Initialize modal event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Close modal when clicking outside
    var couponModal = document.getElementById('couponModal');
    if (couponModal) {
        couponModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCouponModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCouponModal();
        }
    });
});
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include the appropriate layout based on user role
if ($userRole === 'admin') {
    include __DIR__ . '/../views/layouts/admin_layout.php';
} elseif ($userRole === 'tipster') {
    include __DIR__ . '/../views/layouts/tipster_layout.php';
} else {
    include __DIR__ . '/../views/layouts/user_layout.php';
}
?>
