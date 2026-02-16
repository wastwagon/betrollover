<?php
/**
 * SmartPicks Pro - Paystack Webhook Handler
 * Handles payment verification and wallet updates
 */

// Load configuration
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/app/models/Database.php';
require_once __DIR__ . '/app/models/Logger.php';
require_once __DIR__ . '/app/models/Wallet.php';
require_once __DIR__ . '/app/models/PaystackService.php';

// Set content type
header('Content-Type: application/json');

$db = Database::getInstance();
$logger = Logger::getInstance();
$wallet = Wallet::getInstance();
$paystack = PaystackService::getInstance();

try {
    // Get the raw POST data
    $input = file_get_contents('php://input');
    $payload = json_decode($input, true);
    
    // Get the signature from headers
    $signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';
    
    if (empty($signature)) {
        throw new Exception('Missing Paystack signature');
    }
    
    // Verify webhook signature
    if (!$paystack->validateWebhook($input, $signature)) {
        throw new Exception('Invalid webhook signature');
    }
    
    $logger->info("Paystack webhook received", [
        'event' => $payload['event'] ?? 'unknown',
        'reference' => $payload['data']['reference'] ?? 'unknown'
    ]);
    
    // Handle different webhook events
    switch ($payload['event']) {
        case 'charge.success':
            $transaction = $payload['data'];
            $reference = $transaction['reference'];
            
            // Find the pending transaction
            $pendingTransaction = $db->fetch("
                SELECT * FROM wallet_transactions 
                WHERE reference = ? AND status = 'pending' AND type = 'deposit'
            ", [$reference]);
            
            if ($pendingTransaction) {
                // Verify transaction with Paystack
                $verifyResult = $paystack->verifyTransaction($reference);
                
                if ($verifyResult['success'] && $verifyResult['verified']) {
                    // Add funds to wallet
                    $addResult = $wallet->addFunds(
                        $pendingTransaction['user_id'],
                        $pendingTransaction['amount'],
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
                        
                        $logger->info("Wallet top-up completed via webhook", [
                            'user_id' => $pendingTransaction['user_id'],
                            'amount' => $pendingTransaction['amount'],
                            'reference' => $reference
                        ]);
                        
                        echo json_encode(['status' => 'success', 'message' => 'Payment processed successfully']);
                    } else {
                        throw new Exception('Failed to add funds to wallet: ' . $addResult['error']);
                    }
                } else {
                    // Mark transaction as failed
                    $db->query("
                        UPDATE wallet_transactions 
                        SET status = 'failed', updated_at = NOW()
                        WHERE reference = ?
                    ", [$reference]);
                    
                    throw new Exception('Transaction verification failed');
                }
            } else {
                $logger->warning("Webhook received for unknown transaction", [
                    'reference' => $reference
                ]);
            }
            break;
            
        case 'charge.failed':
            $transaction = $payload['data'];
            $reference = $transaction['reference'];
            
            // Mark transaction as failed
            $db->query("
                UPDATE wallet_transactions 
                SET status = 'failed', updated_at = NOW()
                WHERE reference = ?
            ", [$reference]);
            
            $logger->info("Payment failed via webhook", [
                'reference' => $reference,
                'reason' => $transaction['gateway_response'] ?? 'Unknown'
            ]);
            
            echo json_encode(['status' => 'success', 'message' => 'Payment failure recorded']);
            break;
            
        default:
            $logger->info("Unhandled webhook event", [
                'event' => $payload['event']
            ]);
            echo json_encode(['status' => 'success', 'message' => 'Event received but not processed']);
    }
    
} catch (Exception $e) {
    $logger->error("Paystack webhook error", [
        'error' => $e->getMessage(),
        'payload' => $payload ?? null
    ]);
    
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
