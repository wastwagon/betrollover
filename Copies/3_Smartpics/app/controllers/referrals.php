<?php
/**
 * Referrals Dashboard - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/ReferralSystem.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();
$referralSystem = ReferralSystem::getInstance();

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

// Get referral data
$referralCode = '';
$referralLink = '';
$referralStats = [];
$referredUsers = [];

$errorMessage = '';
try {
    $referralCode = $referralSystem->getUserReferralCode($userId);
    if (!$referralCode) {
        $errorMessage = "Unable to generate referral code. Please ensure your username is valid.";
    } else {
        $referralLink = $referralSystem->getUserReferralLink($userId);
        if (!$referralLink) {
            $errorMessage = "Unable to generate referral link.";
        }
    }
    $referralStats = $referralSystem->getUserReferralStats($userId);
    $referredUsers = $referralSystem->getReferredUsers($userId, 100);
} catch (Exception $e) {
    $errorMessage = "Error: " . $e->getMessage();
    $referralCode = '';
    $referralLink = '';
    $referralStats = [
        'total_referrals' => 0,
        'completed_referrals' => 0,
        'pending_referrals' => 0,
        'total_bonus_earned' => 0,
        'total_referred_deposits' => 0
    ];
    $referredUsers = [];
    // Log the error
    if (class_exists('Logger')) {
        $logger = Logger::getInstance();
        $logger->error("Referral dashboard error", [
            'user_id' => $userId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}

// Set page variables
$pageTitle = "Referrals";

// Start content buffer
ob_start();
?>

<div class="referrals-content">
    <?php if ($errorMessage && empty($referralLink)): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($errorMessage); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-user-friends"></i> Referral Program</h2>
        <p style="color: #666; margin-top: 10px;">Invite friends to join SmartPicks Pro and earn rewards when they make their first deposit!</p>
    </div>
    
    <!-- Referral Link Section -->
    <div class="card">
        <h3><i class="fas fa-link"></i> Your Referral Link</h3>
        
        <?php if ($referralLink): ?>
        <div style="margin-top: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #666;">Copy Your Referral Link:</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="referralLinkInput" 
                           value="<?php echo htmlspecialchars($referralLink); ?>" 
                           readonly
                           style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; background-color: white;">
                    <button onclick="copyReferralLink()" class="btn btn-primary" style="padding: 12px 20px;">
                        <i class="fas fa-copy"></i> Copy Link
                    </button>
                </div>
            </div>
            
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 5px; border-left: 4px solid #1976d2;">
                <p style="margin: 0; color: #666; font-size: 13px;">
                    <strong>Your Referral Code:</strong> <code style="background-color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; color: #d32f2f;"><?php echo htmlspecialchars($referralCode); ?></code>
                </p>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
                    Share this link with friends. When they register and make their first deposit, you'll earn the same amount they deposited!
                </p>
            </div>
        </div>
        <?php else: ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <p>Unable to generate referral link. Please contact support.</p>
        </div>
        <?php endif; ?>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $referralStats['total_referrals'] ?? 0; ?></p>
                <p style="font-size: 14px; color: #666;">Total Referrals</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $referralStats['completed_referrals'] ?? 0; ?></p>
                <p style="font-size: 14px; color: #666;">Completed</p>
                <p style="font-size: 11px; color: #999; margin-top: 3px;">Made first deposit</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #f57c00;"><?php echo $referralStats['pending_referrals'] ?? 0; ?></p>
                <p style="font-size: 14px; color: #666;">Pending</p>
                <p style="font-size: 11px; color: #999; margin-top: 3px;">No deposit yet</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;">
                    GHS <?php echo number_format($referralStats['total_bonus_earned'] ?? 0, 2); ?>
                </p>
                <p style="font-size: 14px; color: #666;">Total Earnings</p>
                <p style="font-size: 11px; color: #999; margin-top: 3px;">From referrals</p>
            </div>
        </div>
    </div>
    
    <!-- Referred Users List -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Referred Users</h3>
        
        <?php if (empty($referredUsers)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-user-friends" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>You haven't referred anyone yet.</p>
            <p style="font-size: 13px; margin-top: 10px;">Start sharing your referral link to earn rewards!</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">User</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Registered</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">First Deposit</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Your Bonus</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($referredUsers as $referred): ?>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">
                            <strong><?php echo htmlspecialchars($referred['display_name'] ?? $referred['username']); ?></strong>
                            <p style="font-size: 12px; color: #666; margin: 3px 0 0 0;">
                                @<?php echo htmlspecialchars($referred['username']); ?>
                            </p>
                        </td>
                        <td style="padding: 12px; color: #666; font-size: 13px;">
                            <?php echo date('M j, Y', strtotime($referred['user_registered_at'])); ?>
                        </td>
                        <td style="padding: 12px;">
                            <?php if ($referred['status'] === 'completed'): ?>
                            <span style="background-color: #2e7d32; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px;">
                                <i class="fas fa-check"></i> Completed
                            </span>
                            <?php else: ?>
                            <span style="background-color: #f57c00; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px;">
                                <i class="fas fa-clock"></i> Pending
                            </span>
                            <?php endif; ?>
                        </td>
                        <td style="padding: 12px; color: #666; font-size: 13px;">
                            <?php if ($referred['first_deposit_amount']): ?>
                            GHS <?php echo number_format($referred['first_deposit_amount'], 2); ?>
                            <?php else: ?>
                            <span style="color: #999;">Not yet</span>
                            <?php endif; ?>
                        </td>
                        <td style="padding: 12px; color: #2e7d32; font-weight: bold; font-size: 13px;">
                            <?php if ($referred['referrer_bonus_paid']): ?>
                            GHS <?php echo number_format($referred['referrer_bonus_paid'], 2); ?>
                            <?php else: ?>
                            <span style="color: #999;">-</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>
    
    <!-- How It Works -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> How It Works</h3>
        <div style="margin-top: 15px;">
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <h4 style="color: #d32f2f; margin-bottom: 8px;">1. Share Your Link</h4>
                <p style="color: #666; font-size: 14px; margin: 0;">
                    Copy and share your unique referral link with friends, family, or on social media.
                </p>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <h4 style="color: #d32f2f; margin-bottom: 8px;">2. They Register</h4>
                <p style="color: #666; font-size: 14px; margin: 0;">
                    When someone clicks your link and creates an account, they're automatically linked to you as a referral.
                </p>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <h4 style="color: #d32f2f; margin-bottom: 8px;">3. First Deposit = Your Bonus</h4>
                <p style="color: #666; font-size: 14px; margin: 0;">
                    When your referral makes their first deposit, you automatically receive the same amount credited to your wallet!
                </p>
            </div>
            
            <div style="padding: 15px; background-color: #e8f5e8; border-radius: 5px; border-left: 4px solid #2e7d32;">
                <p style="color: #2e7d32; font-weight: 500; margin: 0;">
                    <i class="fas fa-gift"></i> 
                    <strong>Example:</strong> If someone deposits GHS 100, you get GHS 100 credited to your wallet immediately!
                </p>
            </div>
        </div>
    </div>
</div>

<script>
function copyReferralLink() {
    const input = document.getElementById('referralLinkInput');
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        
        // Show success message
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.backgroundColor = '#2e7d32';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    } catch (err) {
        alert('Failed to copy link. Please copy manually.');
    }
}
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include the appropriate layout based on user role
if ($userRole === 'tipster') {
    include __DIR__ . '/../views/layouts/tipster_layout.php';
} else {
    include __DIR__ . '/../views/layouts/user_layout.php';
}
?>

