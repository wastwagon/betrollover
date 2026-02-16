<?php
/**
 * Wallet - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../models/PaystackService.php';
require_once __DIR__ . '/../models/ReferralSystem.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$wallet = Wallet::getInstance();
$paystack = PaystackService::getInstance();
$referralSystem = ReferralSystem::getInstance();
$logger = Logger::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'user';

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance and transactions
$walletBalance = 0.00;
$transactions = [];

try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
    
    $transactions = $db->fetchAll("
        SELECT * FROM wallet_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
    ", [$userId]);
} catch (Exception $e) {
    $walletBalance = 0.00;
    $transactions = [];
}

// Handle wallet actions
$message = '';
$error = '';
$pendingTransaction = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'initialize_payment') {
        // Initialize Paystack payment
        $amount = floatval($_POST['amount'] ?? 0);
        if ($amount > 0 && $amount >= 0.01) {
            try {
                // Generate unique reference
                $reference = $paystack->generateReference('WAL');
                
                // Create callback URL
                $callbackUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . 
                               '://' . $_SERVER['HTTP_HOST'] . 
                               '/SmartPicksPro-Local/wallet?payment_success=1&reference=' . $reference;
                
                // Initialize Paystack transaction
                $initResult = $paystack->initializeTransaction(
                    $user['email'] ?? 'user@example.com',
                    $amount,
                    $reference,
                    $callbackUrl
                );
                
                if ($initResult['success']) {
                    // Record pending transaction
                    $db->query("
                        INSERT INTO wallet_transactions 
                        (user_id, type, amount, status, reference, description, created_at) 
                        VALUES (?, 'deposit', ?, 'pending', ?, ?, NOW())
                    ", [
                        $userId,
                        $amount,
                        $reference,
                        'Wallet top-up via Paystack'
                    ]);
                    
                    // Redirect to Paystack payment page
                    header('Location: ' . $initResult['authorization_url']);
                    exit;
                } else {
                    $error = "Error initializing payment: " . ($initResult['error'] ?? 'Unknown error');
                }
            } catch (Exception $e) {
                $error = "Error processing payment: " . $e->getMessage();
                $logger->error("Paystack initialization error", [
                    'user_id' => $userId,
                    'amount' => $amount,
                    'error' => $e->getMessage()
                ]);
            }
        } else {
            $error = "Please enter a valid amount (minimum 0.01 GHS).";
        }
    }
}

// Handle payment verification callback
if (isset($_GET['payment_success']) && isset($_GET['reference'])) {
    $reference = $_GET['reference'];
    
    // Verify transaction
    $verifyResult = $paystack->verifyTransaction($reference);
    
    if ($verifyResult['success'] && $verifyResult['verified']) {
        // Check if transaction already processed
        $existing = $db->fetch("
            SELECT * FROM wallet_transactions 
            WHERE reference = ? AND status = 'completed'
        ", [$reference]);
        
        if (!$existing) {
            // Find pending transaction
            $pendingTransaction = $db->fetch("
                SELECT * FROM wallet_transactions 
                WHERE reference = ? AND status = 'pending' AND type = 'deposit'
            ", [$reference]);
            
            if ($pendingTransaction) {
                // Add funds to wallet
                $addResult = $wallet->addFunds(
                    $userId,
                    $verifyResult['amount'],
                    $reference,
                    'Wallet top-up via Paystack'
                );
                
                if ($addResult['success']) {
                    // Update transaction status
                    $db->query("
                        UPDATE wallet_transactions 
                        SET status = 'completed', updated_at = NOW()
                        WHERE reference = ?
                    ", [$reference]);
                    
                    // Check if this is user's first deposit and process referral bonus
                    try {
                        // Check if user has made any previous deposits
                        $previousDeposits = $db->fetch("
                            SELECT COUNT(*) as count 
                            FROM wallet_transactions 
                            WHERE user_id = ? 
                            AND type = 'deposit' 
                            AND status = 'completed'
                            AND reference != ?
                        ", [$userId, $reference]);
                        
                        // If this is the first deposit, complete referral
                        if ($previousDeposits && $previousDeposits['count'] == 0) {
                            $referralSystem->completeReferralOnFirstDeposit($userId, $verifyResult['amount']);
                        }
                    } catch (Exception $e) {
                        // Log error but don't fail the deposit
                        $logger->error("Error processing referral bonus", [
                            'user_id' => $userId,
                            'amount' => $verifyResult['amount'],
                            'error' => $e->getMessage()
                        ]);
                    }
                    
                    $message = "Payment successful! GHS " . number_format($verifyResult['amount'], 2) . " has been added to your wallet.";
                    $logger->info("Wallet top-up completed", [
                        'user_id' => $userId,
                        'amount' => $verifyResult['amount'],
                        'reference' => $reference
                    ]);
                } else {
                    $error = "Payment verified but failed to add funds. Please contact support.";
                }
            } else {
                $error = "Transaction not found. Please contact support.";
            }
        } else {
            $message = "Payment already processed. GHS " . number_format($existing['amount'], 2) . " was added to your wallet.";
        }
        
        // Refresh balance
        $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
        $walletBalance = $result ? $result['balance'] : 0.00;
    } else {
        $error = "Payment verification failed. Please try again or contact support.";
        
        // Mark transaction as failed
        $db->query("
            UPDATE wallet_transactions 
            SET status = 'failed', updated_at = NOW()
            WHERE reference = ?
        ", [$reference]);
    }
}

// Set page variables
$pageTitle = "Wallet";

// Start content buffer
ob_start();
?>

<div class="wallet-content">
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
        <h2><i class="fas fa-wallet"></i> Wallet Overview</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
            <div>
                <p style="font-size: 14px; color: #666; margin-bottom: 5px;">Available Balance</p>
                <p style="font-size: 36px; font-weight: bold; color: #2e7d32;">
                    GHS <?php echo number_format($walletBalance, 2); ?>
                </p>
            </div>
            <div style="text-align: right;">
                <button class="btn btn-primary" onclick="showAddFundsModal()">
                    <i class="fas fa-plus"></i> Add Funds
                </button>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-history"></i> Recent Transactions</h3>
        <?php if (empty($transactions)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-receipt" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No transactions yet. Start by adding funds or purchasing picks.</p>
        </div>
        <?php else: ?>
        <div style="margin-top: 20px;">
            <?php foreach ($transactions as $transaction): ?>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
                <div>
                    <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($transaction['description']); ?></p>
                    <p style="font-size: 12px; color: #666;"><?php echo date('M j, Y g:i A', strtotime($transaction['created_at'])); ?></p>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight: bold; color: <?php echo $transaction['amount'] >= 0 ? '#2e7d32' : '#d32f2f'; ?>;">
                        <?php echo ($transaction['amount'] >= 0 ? '+' : '') . 'GHS ' . number_format($transaction['amount'], 2); ?>
                    </p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Wallet Information</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Your wallet is secure and protected by our escrow system.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-clock"></i> 
                Funds are available immediately after adding.
            </p>
            <p style="color: #666;">
                <i class="fas fa-handshake"></i> 
                All purchases are protected by our guarantee system.
            </p>
        </div>
    </div>
</div>

<!-- Add Funds Modal -->
<div id="addFundsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 2000;">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; width: 400px; max-width: 90%;">
        <h3 style="margin-bottom: 20px;"><i class="fas fa-plus"></i> Add Funds</h3>
        
        <form method="POST">
            <input type="hidden" name="action" value="initialize_payment">
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Amount (GHS)</label>
                <input type="number" name="amount" step="0.01" min="0.01" required 
                       placeholder="Enter amount"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px;">
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    <i class="fas fa-info-circle"></i> Minimum amount: 0.01 GHS
                </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: #d32f2f; font-size: 14px;">
                    <i class="fas fa-credit-card"></i> Payment Methods
                </h4>
                <ul style="color: #666; line-height: 1.8; margin-left: 20px; font-size: 13px;">
                    <li>Mobile Money (MTN, Vodafone, AirtelTigo)</li>
                    <li>Debit/Credit Cards</li>
                    <li>Bank Transfer</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="hideAddFundsModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-credit-card"></i> Proceed to Payment
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function showAddFundsModal() {
    document.getElementById('addFundsModal').style.display = 'block';
}

function hideAddFundsModal() {
    document.getElementById('addFundsModal').style.display = 'none';
}

// Close modal when clicking outside
document.getElementById('addFundsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAddFundsModal();
    }
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
