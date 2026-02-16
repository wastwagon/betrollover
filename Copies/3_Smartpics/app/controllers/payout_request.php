<?php
/**
 * Payout Request - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$wallet = Wallet::getInstance();

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

// Get payout requests
$payoutRequests = [];
try {
    $payoutRequests = $db->fetchAll("
        SELECT * FROM payout_requests 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ", [$userId]);
} catch (Exception $e) {
    $payoutRequests = [];
}

// Handle payout request
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'request_payout') {
        $amount = floatval($_POST['amount'] ?? 0);
        $paymentMethod = trim($_POST['payment_method'] ?? '');
        $accountDetails = trim($_POST['account_details'] ?? '');
        
        if ($amount <= 0) {
            $error = "Please enter a valid amount.";
        } elseif ($amount > $walletBalance) {
            $error = "Insufficient balance. Available balance: $" . number_format($walletBalance, 2);
        } elseif (empty($paymentMethod) || empty($accountDetails)) {
            $error = "Please fill in all required fields.";
        } else {
            try {
                // Check if user has a pending payout request
                $pendingRequest = $db->fetch("SELECT id FROM payout_requests WHERE user_id = ? AND status = 'pending'", [$userId]);
                if ($pendingRequest) {
                    $error = "You already have a pending payout request.";
                } else {
                    // Create payout request
                    $db->execute("
                        INSERT INTO payout_requests 
                        (user_id, amount, payment_method, account_details, status, created_at) 
                        VALUES (?, ?, ?, ?, 'pending', NOW())
                    ", [$userId, $amount, $paymentMethod, $accountDetails]);
                    
                    $message = "Payout request submitted successfully! Admin will process it within 24-48 hours.";
                    
                    // Refresh payout requests
                    $payoutRequests = $db->fetchAll("
                        SELECT * FROM payout_requests 
                        WHERE user_id = ? 
                        ORDER BY created_at DESC
                    ", [$userId]);
                }
            } catch (Exception $e) {
                $error = "Error submitting payout request: " . $e->getMessage();
            }
        }
    }
}

// Set page variables
$pageTitle = "Payout Request";

// Start content buffer
ob_start();
?>

<div class="payout-request-content">
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
        <h2><i class="fas fa-money-bill-wave"></i> Payout Request</h2>
        <p style="color: #666; margin-top: 10px;">Request a payout from your wallet balance.</p>
    </div>
    
    <!-- Wallet Balance -->
    <div class="card">
        <h3><i class="fas fa-wallet"></i> Available Balance</h3>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 15px;">
            <div>
                <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Current Balance</p>
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;">
                    $<?php echo number_format($walletBalance, 2); ?>
                </p>
            </div>
            <div style="text-align: right;">
                <a href="/SmartPicksPro-Local/wallet" class="btn btn-secondary">
                    <i class="fas fa-wallet"></i> Manage Wallet
                </a>
            </div>
        </div>
    </div>
    
    <!-- Request Payout Form -->
    <div class="card">
        <h3><i class="fas fa-plus"></i> Request Payout</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="request_payout">
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Amount ($) *</label>
                <input type="number" name="amount" step="0.01" min="0.01" max="<?php echo $walletBalance; ?>" required
                       placeholder="Enter amount to withdraw"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    Maximum: $<?php echo number_format($walletBalance, 2); ?>
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Payment Method *</label>
                <select name="payment_method" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <option value="">Select Payment Method</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="paypal">PayPal</option>
                    <option value="skrill">Skrill</option>
                    <option value="neteller">Neteller</option>
                    <option value="crypto">Cryptocurrency</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Account Details *</label>
                <textarea name="account_details" rows="4" required
                          placeholder="Provide your account details (account number, email, wallet address, etc.)"
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
            </div>
            
            <button type="submit" class="btn btn-success">
                <i class="fas fa-paper-plane"></i> Submit Request
            </button>
        </form>
    </div>
    
    <!-- Payout History -->
    <?php if (!empty($payoutRequests)): ?>
    <div class="card">
        <h3><i class="fas fa-history"></i> Payout History</h3>
        <div style="margin-top: 15px;">
            <?php foreach ($payoutRequests as $request): ?>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #f0f0f0; border-radius: 5px; margin-bottom: 10px;">
                <div>
                    <p style="font-weight: 500; margin-bottom: 5px;">
                        $<?php echo number_format($request['amount'], 2); ?> - <?php echo ucfirst($request['payment_method']); ?>
                    </p>
                    <p style="font-size: 12px; color: #666;">
                        <?php echo date('M j, Y g:i A', strtotime($request['created_at'])); ?>
                    </p>
                </div>
                <span style="background-color: <?php echo $request['status'] === 'completed' ? '#2e7d32' : ($request['status'] === 'rejected' ? '#d32f2f' : '#d32f2f'); ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                    <?php echo $request['status']; ?>
                </span>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>
    
    <!-- Payout Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Payout Information</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-clock"></i> 
                Payout requests are processed within 24-48 hours during business days.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                All payouts are subject to verification and compliance checks.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-dollar-sign"></i> 
                Minimum payout amount is $10.00.
            </p>
            <p style="color: #666;">
                <i class="fas fa-question-circle"></i> 
                Contact support if you have any questions about your payout.
            </p>
        </div>
    </div>
</div>

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

