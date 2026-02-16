<?php
/**
 * SmartPicks Pro - Payout Service
 * Handles tipster payout requests and processing
 */

// Include required dependencies
require_once __DIR__ . '/Wallet.php';
require_once __DIR__ . '/PaystackService.php';
require_once __DIR__ . '/MailService.php';

class PayoutService {
    
    private static $instance = null;
    private $db;
    private $logger;
    private $wallet;
    private $paystack;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->wallet = Wallet::getInstance();
        $this->paystack = PaystackService::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Request payout
     */
    public function requestPayout($userId, $amount, $paymentMethod, $accountDetails) {
        try {
            // Check if user has sufficient earnings
            $earnings = $this->getAvailableEarnings($userId);
            
            if ($earnings['available'] < $amount) {
                return [
                    'success' => false,
                    'error' => 'Insufficient earnings. Available: GHS ' . number_format($earnings['available'], 2)
                ];
            }
            
            if ($amount < 50) {
                return [
                    'success' => false,
                    'error' => 'Minimum payout amount is GHS 50.00'
                ];
            }
            
            // Calculate platform fee (10%)
            $platformFee = $amount * 0.1;
            $netAmount = $amount - $platformFee;
            
            $this->db->beginTransaction();
            
            // Create payout request
            $payoutId = $this->db->insert('payout_requests', [
                'user_id' => $userId,
                'amount' => $amount,
                'platform_fee' => $platformFee,
                'net_amount' => $netAmount,
                'payment_method' => $paymentMethod,
                'account_details' => json_encode($accountDetails),
                'status' => 'pending',
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // Deduct from available earnings
            $this->db->insert('tipster_payouts', [
                'tipster_id' => $userId,
                'amount' => $amount,
                'currency' => 'GHS',
                'period_start' => date('Y-m-01'), // Current month start
                'period_end' => date('Y-m-t'), // Current month end
                'status' => 'pending',
                'payment_method' => $paymentMethod,
                'payment_reference' => 'PAYOUT_' . $payoutId,
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            $this->db->commit();
            
            $this->logger->info("Payout request created", [
                'user_id' => $userId,
                'payout_id' => $payoutId,
                'amount' => $amount,
                'net_amount' => $netAmount
            ]);
            
            // Send email notification to admin
            try {
                $mailService = MailService::getInstance();
                $mailResult = $mailService->notifyAdminPayoutRequest($payoutId, $userId, $amount);
                if (!$mailResult['success']) {
                    $this->logger->warning('Failed to send admin payout request email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                }
            } catch (Exception $e) {
                // Don't fail payout request if email fails
                $this->logger->error('Error sending admin payout request email', ['error' => $e->getMessage()]);
            }
            
            return [
                'success' => true,
                'payout_id' => $payoutId,
                'net_amount' => $netAmount,
                'platform_fee' => $platformFee
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error creating payout request", [
                'user_id' => $userId,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => 'Failed to create payout request: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get available earnings for payout
     */
    public function getAvailableEarnings($userId) {
        try {
            // Get total earnings
            $totalEarnings = $this->db->fetch("
                SELECT COALESCE(SUM(amount), 0) as total_earnings
                FROM tipster_earnings 
                WHERE tipster_id = ?
            ", [$userId]);
            
            // Get total paid out
            $totalPaid = $this->db->fetch("
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM tipster_payouts 
                WHERE tipster_id = ? AND status IN ('paid', 'pending')
            ", [$userId]);
            
            // Get pending payout requests
            $pendingPayouts = $this->db->fetch("
                SELECT COALESCE(SUM(amount), 0) as pending_amount
                FROM payout_requests 
                WHERE user_id = ? AND status = 'pending'
            ", [$userId]);
            
            $totalEarningsAmount = (float)$totalEarnings['total_earnings'];
            $totalPaidAmount = (float)$totalPaid['total_paid'];
            $pendingAmount = (float)$pendingPayouts['pending_amount'];
            
            $available = $totalEarningsAmount - $totalPaidAmount - $pendingAmount;
            
            return [
                'total_earnings' => $totalEarningsAmount,
                'total_paid' => $totalPaidAmount,
                'pending_payouts' => $pendingAmount,
                'available' => max(0, $available)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting available earnings", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'total_earnings' => 0,
                'total_paid' => 0,
                'pending_payouts' => 0,
                'available' => 0
            ];
        }
    }
    
    /**
     * Get payout requests (admin view)
     */
    public function getPayoutRequests($status = 'pending', $limit = 50) {
        try {
            $whereClause = $status === 'all' ? '' : "WHERE pr.status = ?";
            $params = $status === 'all' ? [$limit] : [$status, $limit];
            
            return $this->db->fetchAll("
                SELECT 
                    pr.*,
                    u.username,
                    u.display_name,
                    u.email,
                    pr.account_details
                FROM payout_requests pr
                INNER JOIN users u ON pr.user_id = u.id
                {$whereClause}
                ORDER BY pr.created_at DESC
                LIMIT ?
            ", $params);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting payout requests", [
                'status' => $status,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Approve payout request (admin only)
     */
    public function approvePayout($payoutId, $adminId, $notes = '') {
        try {
            $this->db->beginTransaction();
            
            // Get payout request
            $payout = $this->db->fetch("
                SELECT * FROM payout_requests 
                WHERE id = ? AND status = 'pending'
            ", [$payoutId]);
            
            if (!$payout) {
                throw new Exception('Payout request not found or already processed');
            }
            
            // Update payout request
            $this->db->query("
                UPDATE payout_requests 
                SET status = 'approved', 
                    processed_by = ?, 
                    processed_at = NOW(),
                    admin_notes = ?
                WHERE id = ?
            ", [$adminId, $notes, $payoutId]);
            
            // Update tipster payout record
            $this->db->query("
                UPDATE tipster_payouts 
                SET status = 'paid', 
                    processed_by = ?, 
                    processed_at = NOW()
                WHERE tipster_id = ? AND payment_reference = ?
            ", [$adminId, $payout['user_id'], 'PAYOUT_' . $payoutId]);
            
            // Process payment (if using Paystack for transfers)
            $accountDetails = json_decode($payout['account_details'], true);
            
            if ($payout['payment_method'] === 'bank_transfer' && !empty($accountDetails['bank_code'])) {
                // Create transfer recipient if needed
                $recipientResult = $this->paystack->createTransferRecipient(
                    'nuban',
                    $accountDetails['account_name'],
                    $accountDetails['account_number'],
                    $accountDetails['bank_code'],
                    $payout['user_email'] ?? ''
                );
                
                if ($recipientResult['success']) {
                    // Initiate transfer
                    $transferResult = $this->paystack->initiateTransfer(
                        $payout['net_amount'],
                        $recipientResult['recipient_code'],
                        'PAYOUT_' . $payoutId,
                        'Tipster payout - SmartPicks Pro'
                    );
                    
                    if ($transferResult['success']) {
                        // Update with transfer reference
                        $this->db->query("
                            UPDATE payout_requests 
                            SET gateway_reference = ?
                            WHERE id = ?
                        ", [$transferResult['transfer_code'], $payoutId]);
                    }
                }
            }
            
            $this->db->commit();
            
            $this->logger->info("Payout approved", [
                'payout_id' => $payoutId,
                'admin_id' => $adminId,
                'user_id' => $payout['user_id'],
                'amount' => $payout['amount'],
                'net_amount' => $payout['net_amount']
            ]);
            
            // Send email notification to tipster
            try {
                $mailService = MailService::getInstance();
                $mailResult = $mailService->notifyTipsterPayoutApproved(
                    (int)$payout['user_id'],
                    $payoutId,
                    (float)$payout['amount'],
                    (float)$payout['net_amount'],
                    $payout['payment_method'] ?? 'bank_transfer'
                );
                if (!$mailResult['success']) {
                    $this->logger->warning('Failed to send tipster payout approved email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                }
            } catch (Exception $e) {
                // Don't fail approval if email fails
                $this->logger->error('Error sending tipster payout approved email', ['error' => $e->getMessage()]);
            }
            
            return [
                'success' => true,
                'message' => 'Payout approved successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error approving payout", [
                'payout_id' => $payoutId,
                'admin_id' => $adminId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Reject payout request (admin only)
     */
    public function rejectPayout($payoutId, $adminId, $reason = '') {
        try {
            $this->db->beginTransaction();
            
            // Get payout request
            $payout = $this->db->fetch("
                SELECT * FROM payout_requests 
                WHERE id = ? AND status = 'pending'
            ", [$payoutId]);
            
            if (!$payout) {
                throw new Exception('Payout request not found or already processed');
            }
            
            // Update payout request
            $this->db->query("
                UPDATE payout_requests 
                SET status = 'rejected', 
                    processed_by = ?, 
                    processed_at = NOW(),
                    admin_notes = ?
                WHERE id = ?
            ", [$adminId, $reason, $payoutId]);
            
            // Update tipster payout record
            $this->db->query("
                UPDATE tipster_payouts 
                SET status = 'cancelled', 
                    processed_by = ?, 
                    processed_at = NOW()
                WHERE tipster_id = ? AND payment_reference = ?
            ", [$adminId, $payout['user_id'], 'PAYOUT_' . $payoutId]);
            
            $this->db->commit();
            
            $this->logger->info("Payout rejected", [
                'payout_id' => $payoutId,
                'admin_id' => $adminId,
                'user_id' => $payout['user_id'],
                'reason' => $reason
            ]);
            
            // Send email notification to tipster
            try {
                $mailService = MailService::getInstance();
                $mailResult = $mailService->notifyTipsterPayoutRejected(
                    (int)$payout['user_id'],
                    $payoutId,
                    (float)$payout['amount'],
                    $reason
                );
                if (!$mailResult['success']) {
                    $this->logger->warning('Failed to send tipster payout rejected email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                }
            } catch (Exception $e) {
                // Don't fail rejection if email fails
                $this->logger->error('Error sending tipster payout rejected email', ['error' => $e->getMessage()]);
            }
            
            return [
                'success' => true,
                'message' => 'Payout rejected successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error rejecting payout", [
                'payout_id' => $payoutId,
                'admin_id' => $adminId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get user's payout history
     */
    public function getUserPayoutHistory($userId, $limit = 20) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    pr.*,
                    u.display_name as processed_by_name
                FROM payout_requests pr
                LEFT JOIN users u ON pr.processed_by = u.id
                WHERE pr.user_id = ?
                ORDER BY pr.created_at DESC
                LIMIT ?
            ", [$userId, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user payout history", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get payout statistics
     */
    public function getPayoutStats() {
        try {
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_paid_out,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN platform_fee ELSE 0 END), 0) as total_platform_fees
                FROM payout_requests
            ");
            
            return $stats ?: [
                'total_requests' => 0,
                'pending_requests' => 0,
                'approved_requests' => 0,
                'rejected_requests' => 0,
                'total_paid_out' => 0,
                'total_platform_fees' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting payout stats", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}
?>
