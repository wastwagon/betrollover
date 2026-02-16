<?php
/**
 * Admin Payouts - Clean, Simple Version
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

// Get payout data
$payoutRequests = [];
$stats = [];

try {
    $payoutRequests = $db->fetchAll("
        SELECT pr.*, u.username, u.email
        FROM payout_requests pr
        JOIN users u ON pr.user_id = u.id
        ORDER BY pr.created_at DESC
    ");
    
    // Get statistics
    $stats['total_requests'] = count($payoutRequests);
    $stats['pending_requests'] = count(array_filter($payoutRequests, function($req) { return $req['status'] === 'pending'; }));
    $stats['approved_requests'] = count(array_filter($payoutRequests, function($req) { return $req['status'] === 'approved'; }));
    $stats['rejected_requests'] = count(array_filter($payoutRequests, function($req) { return $req['status'] === 'rejected'; }));
    $stats['total_amount'] = array_sum(array_column($payoutRequests, 'amount'));
    
} catch (Exception $e) {
    $payoutRequests = [];
    $stats = ['total_requests' => 0, 'pending_requests' => 0, 'approved_requests' => 0, 'rejected_requests' => 0, 'total_amount' => 0];
}

// Handle payout actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'process_payout') {
        $requestId = intval($_POST['request_id'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        $adminNotes = trim($_POST['admin_notes'] ?? '');
        
        if ($requestId && in_array($status, ['approved', 'rejected'])) {
            try {
                // Update payout request
                $db->execute("
                    UPDATE payout_requests 
                    SET status = ?, admin_notes = ?, processed_at = NOW(), processed_by = ?
                    WHERE id = ?
                ", [$status, $adminNotes, $userId, $requestId]);
                
                // If approved, deduct from user's wallet
                if ($status === 'approved') {
                    $request = $db->fetch("SELECT user_id, amount FROM payout_requests WHERE id = ?", [$requestId]);
                    
                    // Deduct from wallet
                    $db->execute("
                        UPDATE user_wallets 
                        SET balance = balance - ? 
                        WHERE user_id = ?
                    ", [$request['amount'], $request['user_id']]);
                    
                    // Add transaction record
                    $db->execute("
                        INSERT INTO wallet_transactions (user_id, amount, description, created_at) 
                        VALUES (?, ?, ?, NOW())
                    ", [$request['user_id'], -$request['amount'], 'Payout processed']);
                }
                
                $message = "Payout request " . $status . " successfully.";
                
                // Refresh payout requests
                $payoutRequests = $db->fetchAll("
                    SELECT pr.*, u.username, u.email
                    FROM payout_requests pr
                    JOIN users u ON pr.user_id = u.id
                    ORDER BY pr.created_at DESC
                ");
                
            } catch (Exception $e) {
                $error = "Error processing payout: " . $e->getMessage();
            }
        } else {
            $error = "Invalid request or status selected.";
        }
    }
}

// Set page variables
$pageTitle = "Payout Management";

// Start content buffer
ob_start();
?>

<div class="admin-payouts-content">
    <?php if ($message): ?>
    <div class="card" style="background-color: #e8f5e8; border-left: 4px solid #2e7d32;">
        <p style="color: #2e7d32; margin: 0;"><i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($message); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-money-bill-wave"></i> Payout Management</h2>
        <p style="color: #666; margin-top: 10px;">Review and process payout requests from users and tipsters.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['pending_requests']; ?></p>
                <p style="font-size: 14px; color: #666;">Pending Requests</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['approved_requests']; ?></p>
                <p style="font-size: 14px; color: #666;">Approved</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['rejected_requests']; ?></p>
                <p style="font-size: 14px; color: #666;">Rejected</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;">$<?php echo number_format($stats['total_amount'], 2); ?></p>
                <p style="font-size: 14px; color: #666;">Total Amount</p>
            </div>
        </div>
    </div>
    
    <!-- Payout Requests -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Payout Requests</h3>
        
        <?php if (empty($payoutRequests)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-money-bill-wave" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No payout requests found.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($payoutRequests as $request): ?>
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: #d32f2f; margin-bottom: 5px;">
                            <?php echo htmlspecialchars($request['username']); ?>
                        </h4>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo htmlspecialchars($request['email']); ?> • 
                            Requested: <?php echo date('M j, Y g:i A', strtotime($request['created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 24px; font-weight: bold; color: #2e7d32;">
                            $<?php echo number_format($request['amount'], 2); ?>
                        </p>
                        <span style="background-color: <?php echo $request['status'] === 'approved' ? '#2e7d32' : ($request['status'] === 'rejected' ? '#d32f2f' : '#d32f2f'); ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                            <?php echo $request['status']; ?>
                        </span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Payment Method</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo ucfirst($request['payment_method']); ?>
                        </p>
                    </div>
                    
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Account Details</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo htmlspecialchars($request['account_details']); ?>
                        </p>
                    </div>
                </div>
                
                <?php if (!empty($request['admin_notes'])): ?>
                <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Admin Notes</h5>
                    <p style="color: #666; font-size: 14px;">
                        <?php echo htmlspecialchars($request['admin_notes']); ?>
                    </p>
                </div>
                <?php endif; ?>
                
                <?php if ($request['status'] === 'pending'): ?>
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Process Request</h5>
                    <form method="POST">
                        <input type="hidden" name="action" value="process_payout">
                        <input type="hidden" name="request_id" value="<?php echo $request['id']; ?>">
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Decision</label>
                            <select name="status" required style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                <option value="">Select Decision</option>
                                <option value="approved">Approve</option>
                                <option value="rejected">Reject</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Admin Notes</label>
                            <textarea name="admin_notes" rows="3" 
                                      placeholder="Add notes about your decision..."
                                      style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-check"></i> Process Request
                        </button>
                    </form>
                </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Payout Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Payout Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Verify user identity and account details before approving payouts.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Ensure sufficient wallet balance before processing approved payouts.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-clock"></i> 
                Process payouts within 24-48 hours during business days.
            </p>
            <p style="color: #666;">
                <i class="fas fa-file-alt"></i> 
                Keep detailed records of all payout decisions for audit purposes.
            </p>
        </div>
    </div>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

