<?php
/**
 * SmartPicks Pro - Wallet Management System
 * Handles user wallet operations and transactions
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class Wallet {
    
    private static $instance = null;
    private $db;
    private $logger;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get user wallet balance
     */
    public function getBalance($userId) {
        try {
            // Check if currency column exists
            $columns = $this->db->fetchAll("SHOW COLUMNS FROM user_wallets");
            $hasCurrency = false;
            foreach ($columns as $column) {
                if ($column['Field'] === 'currency') {
                    $hasCurrency = true;
                    break;
                }
            }
            
            $selectFields = "balance";
            if ($hasCurrency) {
                $selectFields .= ", currency, status";
            }
            
            $wallet = $this->db->fetch("
                SELECT {$selectFields}
                FROM user_wallets 
                WHERE user_id = ?
            ", [$userId]);
            
            if (!$wallet) {
                // Create wallet if doesn't exist
                $this->createWallet($userId);
                return $this->getBalance($userId);
            }
            
            $result = [
                'balance' => (float)$wallet['balance']
            ];
            
            // Add currency and status if columns exist
            if ($hasCurrency) {
                $result['currency'] = $wallet['currency'] ?? 'GHS';
                $result['status'] = $wallet['status'] ?? 'active';
            } else {
                // Default to GHS if no currency column
                $result['currency'] = 'GHS';
                $result['status'] = 'active';
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting wallet balance", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Create user wallet
     */
    public function createWallet($userId) {
        try {
            // Check if currency column exists
            $columns = $this->db->fetchAll("SHOW COLUMNS FROM user_wallets");
            $hasCurrency = false;
            foreach ($columns as $column) {
                if ($column['Field'] === 'currency') {
                    $hasCurrency = true;
                    break;
                }
            }
            
            $walletData = [
                'user_id' => $userId,
                'balance' => 0.00,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            // Only add currency if column exists
            if ($hasCurrency) {
                $walletData['currency'] = 'GHS';
                $walletData['status'] = 'active';
            }
            
            $this->db->insert('user_wallets', $walletData);
            
            $this->logger->info("Wallet created for user", ['user_id' => $userId]);
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error creating wallet", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Add funds to wallet
     * @param int $userId
     * @param float $amount
     * @param string $reference
     * @param string $description
     * @param bool $useTransaction - If false, assumes caller manages transaction
     */
    public function addFunds($userId, $amount, $reference, $description = '', $useTransaction = true) {
        try {
            $transactionStarted = false;
            if ($useTransaction && !$this->db->inTransaction()) {
                $this->db->beginTransaction();
                $transactionStarted = true;
            }
            
            // Get current balance
            $wallet = $this->getBalance($userId);
            if (!$wallet) {
                throw new Exception("Wallet not found");
            }
            
            $newBalance = $wallet['balance'] + $amount;
            
            // Update wallet balance
            $this->db->query("
                UPDATE user_wallets 
                SET balance = ?, updated_at = NOW() 
                WHERE user_id = ?
            ", [$newBalance, $userId]);
            
            // Record transaction
            $transactionData = [
                'user_id' => $userId,
                'type' => 'deposit',
                'amount' => $amount,
                'status' => 'completed',
                'description' => $description ?: 'Wallet top-up',
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            // Check if currency column exists in wallet_transactions table
            $columns = $this->db->fetchAll("SHOW COLUMNS FROM wallet_transactions");
            $hasCurrency = false;
            $hasReference = false;
            foreach ($columns as $column) {
                if ($column['Field'] === 'currency') {
                    $hasCurrency = true;
                }
                if ($column['Field'] === 'reference') {
                    $hasReference = true;
                }
            }
            
            // Only add currency and reference if columns exist
            if ($hasCurrency) {
                $transactionData['currency'] = 'GHS';
            }
            if ($hasReference) {
                $transactionData['reference'] = $reference;
            }
            
            $this->db->insert('wallet_transactions', $transactionData);
            
            if ($transactionStarted) {
                $this->db->commit();
            }
            
            $this->logger->info("Funds added to wallet", [
                'user_id' => $userId,
                'amount' => $amount,
                'reference' => $reference,
                'new_balance' => $newBalance
            ]);
            
            return [
                'success' => true,
                'new_balance' => $newBalance,
                'amount_added' => $amount
            ];
            
        } catch (Exception $e) {
            if ($transactionStarted) {
                $this->db->rollback();
            }
            
            $this->logger->error("Error adding funds to wallet", [
                'user_id' => $userId,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Deduct funds from wallet
     */
    public function deductFunds($userId, $amount, $reference, $description = '') {
        try {
            $this->db->beginTransaction();
            
            // Get current balance
            $wallet = $this->getBalance($userId);
            if (!$wallet) {
                throw new Exception("Wallet not found");
            }
            
            if ($wallet['balance'] < $amount) {
                throw new Exception("Insufficient funds");
            }
            
            $newBalance = $wallet['balance'] - $amount;
            
            // Update wallet balance
            $this->db->query("
                UPDATE user_wallets 
                SET balance = ?, updated_at = NOW() 
                WHERE user_id = ?
            ", [$newBalance, $userId]);
            
            // Record transaction
            $transactionData = [
                'user_id' => $userId,
                'type' => 'purchase',
                'amount' => -$amount, // Negative for deduction
                'status' => 'completed',
                'description' => $description ?: 'Purchase',
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            // Check if currency and reference columns exist in wallet_transactions table
            $columns = $this->db->fetchAll("SHOW COLUMNS FROM wallet_transactions");
            $hasCurrency = false;
            $hasReference = false;
            foreach ($columns as $column) {
                if ($column['Field'] === 'currency') {
                    $hasCurrency = true;
                }
                if ($column['Field'] === 'reference') {
                    $hasReference = true;
                }
            }
            
            // Only add currency and reference if columns exist
            if ($hasCurrency) {
                $transactionData['currency'] = 'GHS';
            }
            if ($hasReference) {
                $transactionData['reference'] = $reference;
            }
            
            $this->db->insert('wallet_transactions', $transactionData);
            
            $this->db->commit();
            
            $this->logger->info("Funds deducted from wallet", [
                'user_id' => $userId,
                'amount' => $amount,
                'reference' => $reference,
                'new_balance' => $newBalance
            ]);
            
            return [
                'success' => true,
                'new_balance' => $newBalance,
                'amount_deducted' => $amount
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error deducting funds from wallet", [
                'user_id' => $userId,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Refund funds to wallet
     */
    public function refundFunds($userId, $amount, $reference, $description = '') {
        try {
            $this->db->beginTransaction();
            
            // Get current balance
            $wallet = $this->getBalance($userId);
            if (!$wallet) {
                throw new Exception("Wallet not found");
            }
            
            $newBalance = $wallet['balance'] + $amount;
            
            // Update wallet balance
            $this->db->query("
                UPDATE user_wallets 
                SET balance = ?, updated_at = NOW() 
                WHERE user_id = ?
            ", [$newBalance, $userId]);
            
            // Record transaction
            $transactionData = [
                'user_id' => $userId,
                'type' => 'refund',
                'amount' => $amount,
                'status' => 'completed',
                'description' => $description ?: 'Refund',
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            // Check if currency and reference columns exist in wallet_transactions table
            $columns = $this->db->fetchAll("SHOW COLUMNS FROM wallet_transactions");
            $hasCurrency = false;
            $hasReference = false;
            foreach ($columns as $column) {
                if ($column['Field'] === 'currency') {
                    $hasCurrency = true;
                }
                if ($column['Field'] === 'reference') {
                    $hasReference = true;
                }
            }
            
            // Only add currency and reference if columns exist
            if ($hasCurrency) {
                $transactionData['currency'] = 'GHS';
            }
            if ($hasReference) {
                $transactionData['reference'] = $reference;
            }
            
            $this->db->insert('wallet_transactions', $transactionData);
            
            $this->db->commit();
            
            $this->logger->info("Funds refunded to wallet", [
                'user_id' => $userId,
                'amount' => $amount,
                'reference' => $reference,
                'new_balance' => $newBalance
            ]);
            
            return [
                'success' => true,
                'new_balance' => $newBalance,
                'amount_refunded' => $amount
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error refunding funds to wallet", [
                'user_id' => $userId,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get wallet transaction history
     */
    public function getTransactionHistory($userId, $limit = 50, $offset = 0) {
        try {
            $transactions = $this->db->fetchAll("
                SELECT * FROM wallet_transactions 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            ", [$userId, $limit, $offset]);
            
            return $transactions ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting transaction history", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Check if user has sufficient balance
     */
    public function hasSufficientBalance($userId, $amount) {
        $wallet = $this->getBalance($userId);
        return $wallet && $wallet['balance'] >= $amount;
    }
    
    /**
     * Freeze wallet (for security)
     */
    public function freezeWallet($userId, $reason = '') {
        try {
            $this->db->query("
                UPDATE user_wallets 
                SET status = 'frozen', updated_at = NOW() 
                WHERE user_id = ?
            ", [$userId]);
            
            $this->logger->warning("Wallet frozen", [
                'user_id' => $userId,
                'reason' => $reason
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error freezing wallet", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Unfreeze wallet
     */
    public function unfreezeWallet($userId) {
        try {
            $this->db->query("
                UPDATE user_wallets 
                SET status = 'active', updated_at = NOW() 
                WHERE user_id = ?
            ", [$userId]);
            
            $this->logger->info("Wallet unfrozen", ['user_id' => $userId]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error unfreezing wallet", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
?>
