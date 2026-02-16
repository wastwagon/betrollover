<?php
/**
 * SmartPicks Pro - Escrow Manager
 * 
 * Handles escrow funds for pick purchases until settlement
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/Wallet.php';

class EscrowManager {
    
    private static $instance = null;
    private $db;
    private $logger;
    private $wallet;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->wallet = Wallet::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get escrow summary for admin dashboard
     */
    public function getEscrowSummary() {
        try {
            $result = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_escrow_transactions,
                    SUM(amount) as total_escrow_amount,
                    COUNT(DISTINCT user_id) as users_with_escrow,
                    COUNT(DISTINCT pick_id) as picks_in_escrow
                FROM escrow_funds 
                WHERE status = 'held'
            ");
            
            return $result ?: [
                'total_escrow_transactions' => 0,
                'total_escrow_amount' => 0.00,
                'users_with_escrow' => 0,
                'picks_in_escrow' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting escrow summary", [
                'error' => $e->getMessage()
            ]);
            return [
                'total_escrow_transactions' => 0,
                'total_escrow_amount' => 0.00,
                'users_with_escrow' => 0,
                'picks_in_escrow' => 0
            ];
        }
    }
    
    /**
     * Get user escrow funds
     */
    public function getUserEscrow($userId) {
        try {
            $result = $this->db->fetchAll("
                SELECT 
                    ef.id,
                    ef.pick_id,
                    ef.amount,
                    ef.reference,
                    ef.status,
                    ef.created_at,
                    at.title as pick_title
                FROM escrow_funds ef
                JOIN accumulator_tickets at ON ef.pick_id = at.id
                WHERE ef.user_id = ? AND ef.status = 'held'
                ORDER BY ef.created_at DESC
            ", [$userId]);
            
            return $result ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user escrow", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Hold funds in escrow for pick purchase
     */
    public function holdFunds($userId, $pickId, $amount, $reference) {
        try {
            
            // Check if user has sufficient balance
            $balance = $this->wallet->getBalance($userId);
            if ($balance['balance'] < $amount) {
                throw new Exception('Insufficient funds');
            }
            
            // Deduct funds from user wallet
            $this->wallet->deductFunds($userId, $amount, $reference, "Pick purchase - funds held in escrow");
            
            // Create escrow record
            $escrowId = $this->db->insert('escrow_funds', [
                'user_id' => $userId,
                'pick_id' => $pickId,
                'amount' => $amount,
                'status' => 'held',
                'reference' => $reference,
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // Update pick purchase record (escrow_id column may not exist on some schemas)
            $columns = $this->db->fetchAll("SHOW COLUMNS FROM user_purchased_picks");
            $hasEscrowId = false;
            foreach ($columns as $column) {
                if (($column['Field'] ?? '') === 'escrow_id') {
                    $hasEscrowId = true;
                    break;
                }
            }

            // Check if updated_at column exists
            $hasUpdatedAt = false;
            foreach ($columns as $column) {
                if (($column['Field'] ?? '') === 'updated_at') {
                    $hasUpdatedAt = true;
                    break;
                }
            }

            if ($hasEscrowId && $hasUpdatedAt) {
                $this->db->query("
                    UPDATE user_purchased_picks 
                    SET escrow_id = ?, settlement_status = 'pending', updated_at = NOW()
                    WHERE user_id = ? AND accumulator_id = ?
                ", [$escrowId, $userId, $pickId]);
            } elseif ($hasEscrowId && !$hasUpdatedAt) {
                $this->db->query("
                    UPDATE user_purchased_picks 
                    SET escrow_id = ?, settlement_status = 'pending'
                    WHERE user_id = ? AND accumulator_id = ?
                ", [$escrowId, $userId, $pickId]);
            } elseif (!$hasEscrowId && $hasUpdatedAt) {
                $this->db->query("
                    UPDATE user_purchased_picks 
                    SET settlement_status = 'pending', updated_at = NOW()
                    WHERE user_id = ? AND accumulator_id = ?
                ", [$userId, $pickId]);
            } else {
                $this->db->query("
                    UPDATE user_purchased_picks 
                    SET settlement_status = 'pending'
                    WHERE user_id = ? AND accumulator_id = ?
                ", [$userId, $pickId]);
            }
            
            // No explicit transaction commit here; Wallet handles its own transaction
            
            $this->logger->info("Funds held in escrow", [
                'user_id' => $userId,
                'pick_id' => $pickId,
                'amount' => $amount,
                'escrow_id' => $escrowId
            ]);
            
            return [
                'success' => true,
                'message' => 'Funds held in escrow until settlement',
                'escrow_id' => $escrowId
            ];
            
        } catch (Exception $e) {
            // No explicit rollback needed here; Wallet handles its own transaction
            $this->logger->error("Error holding funds in escrow", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'pick_id' => $pickId,
                'amount' => $amount
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Release funds from escrow (pick won)
     */
    public function releaseFunds($pickId, $settlementResult) {
        try {
            $this->db->beginTransaction();
            
            // Get all escrow records for this pick
            $escrowRecords = $this->db->fetchAll("
                SELECT ef.*, upp.user_id, upp.purchase_price
                FROM escrow_funds ef
                JOIN user_purchased_picks upp ON ef.pick_id = upp.accumulator_id
                WHERE ef.pick_id = ? AND ef.status = 'held'
            ", [$pickId]);
            
            foreach ($escrowRecords as $escrow) {
                if ($settlementResult === 'won') {
                    // Pick won - release funds to tipster
                    $this->releaseToTipster($escrow);
                } else {
                    // Pick lost - refund to buyer
                    $this->refundToBuyer($escrow);
                }
            }
            
            $this->db->commit();
            
            $this->logger->info("Escrow funds released", [
                'pick_id' => $pickId,
                'settlement_result' => $settlementResult,
                'records_processed' => count($escrowRecords)
            ]);
            
            return [
                'success' => true,
                'message' => 'Escrow funds released',
                'records_processed' => count($escrowRecords)
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logger->error("Error releasing escrow funds", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId,
                'settlement_result' => $settlementResult
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Release funds to tipster (pick won)
     */
    private function releaseToTipster($escrow) {
        try {
            // Get pick details
            $pick = $this->db->fetch("
                SELECT user_id, price FROM accumulator_tickets 
                WHERE id = ?
            ", [$escrow['pick_id']]);
            
            if (!$pick) {
                throw new Exception('Pick not found');
            }
            
            $tipsterId = $pick['user_id'];
            $pickPrice = $pick['price'];
            
            // Calculate commission (70% to tipster, 30% to platform)
            $commission = $pickPrice * 0.70;
            $platformFee = $pickPrice * 0.30;
            
            // Add commission to tipster wallet
            $this->wallet->addFunds(
                $tipsterId, 
                $commission, 
                'ESCROW_' . $escrow['id'], 
                "Commission from won pick #{$escrow['pick_id']}"
            );
            
            // Record tipster earnings
            $this->db->insert('tipster_earnings', [
                'tipster_id' => $tipsterId,
                'pick_id' => $escrow['pick_id'],
                'amount' => $commission,
                'type' => 'commission',
                'description' => "Commission from won pick",
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // Update escrow status
            $this->db->query("
                UPDATE escrow_funds 
                SET status = 'released_to_tipster',
                    released_at = NOW(),
                    tipster_amount = ?,
                    platform_fee = ?
                WHERE id = ?
            ", [$commission, $platformFee, $escrow['id']]);
            
            // Update purchase settlement status
            $this->db->query("
                UPDATE user_purchased_picks 
                SET settlement_status = 'won',
                    settled_at = NOW()
                WHERE user_id = ? AND accumulator_id = ?
            ", [$escrow['user_id'], $escrow['pick_id']]);
            
        } catch (Exception $e) {
            $this->logger->error("Error releasing funds to tipster", [
                'error' => $e->getMessage(),
                'escrow_id' => $escrow['id']
            ]);
            throw $e;
        }
    }
    
    /**
     * Refund funds to buyer (pick lost)
     */
    private function refundToBuyer($escrow) {
        try {
            // Refund full amount to buyer
            $this->wallet->addFunds(
                $escrow['user_id'], 
                $escrow['amount'], 
                'REFUND_' . $escrow['id'], 
                "Refund for lost pick #{$escrow['pick_id']}"
            );
            
            // Update escrow status
            $this->db->query("
                UPDATE escrow_funds 
                SET status = 'refunded_to_buyer',
                    refunded_at = NOW()
                WHERE id = ?
            ", [$escrow['id']]);
            
            // Update purchase settlement status
            $this->db->query("
                UPDATE user_purchased_picks 
                SET settlement_status = 'lost',
                    settled_at = NOW()
                WHERE user_id = ? AND accumulator_id = ?
            ", [$escrow['user_id'], $escrow['pick_id']]);
            
        } catch (Exception $e) {
            $this->logger->error("Error refunding funds to buyer", [
                'error' => $e->getMessage(),
                'escrow_id' => $escrow['id']
            ]);
            throw $e;
        }
    }
    
    /**
     * Get escrow statistics
     */
    public function getEscrowStats() {
        try {
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_held,
                    SUM(amount) as total_amount,
                    COUNT(CASE WHEN created_at >= CURDATE() THEN 1 END) as held_today,
                    SUM(CASE WHEN created_at >= CURDATE() THEN amount ELSE 0 END) as amount_today
                FROM escrow_funds 
                WHERE status = 'held'
            ");
            
            return $stats ?: [
                'total_held' => 0,
                'total_amount' => 0,
                'held_today' => 0,
                'amount_today' => 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting escrow stats", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'total_held' => 0,
                'total_amount' => 0,
                'held_today' => 0,
                'amount_today' => 0
            ];
        }
    }
    
    /**
     * Get user's escrow funds
     */
    public function getUserEscrowFunds($userId) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    ef.*,
                    at.title,
                    at.total_odds,
                    at.status as pick_status
                FROM escrow_funds ef
                JOIN accumulator_tickets at ON ef.pick_id = at.id
                WHERE ef.user_id = ? AND ef.status = 'held'
                ORDER BY ef.created_at DESC
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user escrow funds", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            
            return [];
        }
    }
    
    /**
     * Get all held escrow funds (admin)
     */
    public function getAllHeldFunds() {
        try {
            return $this->db->fetchAll("
                SELECT 
                    ef.*,
                    at.title,
                    at.total_odds,
                    at.status as pick_status,
                    u.username,
                    u.display_name
                FROM escrow_funds ef
                JOIN accumulator_tickets at ON ef.pick_id = at.id
                JOIN users u ON ef.user_id = u.id
                WHERE ef.status = 'held'
                ORDER BY ef.created_at DESC
            ");
            
        } catch (Exception $e) {
            $this->logger->error("Error getting all held funds", [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }
    
    /**
     * Automatically settle escrow when pick is settled by admin
     */
    public function autoSettleEscrow($pickId, $result, $settledBy, $notes = '') {
        try {
            $this->db->beginTransaction();
            
            // Get all escrow funds for this pick
            $escrowFunds = $this->db->fetchAll("
                SELECT ef.*, upp.id as purchase_id, upp.user_id as buyer_id
                FROM escrow_funds ef
                LEFT JOIN user_purchased_picks upp ON ef.pick_id = upp.accumulator_id AND ef.user_id = upp.user_id
                WHERE ef.pick_id = ? AND ef.status = 'held'
            ", [$pickId]);
            
            if (empty($escrowFunds)) {
                // No held escrow funds - might already be settled or no escrow exists
                // Return success with informative message instead of error
                return [
                    'success' => true,
                    'message' => 'No escrow funds found to settle (may already be settled or no escrow exists)',
                    'settlements' => []
                ];
            }
            
            $settlementResults = [];
            
            foreach ($escrowFunds as $escrow) {
                $settlementResult = $this->processEscrowSettlement($escrow, $result, $settledBy, $notes);
                $settlementResults[] = $settlementResult;
            }
            
            $this->db->commit();
            
            $this->logger->info("Auto escrow settlement completed", [
                'pick_id' => $pickId,
                'result' => $result,
                'settled_by' => $settledBy,
                'settlements_count' => count($settlementResults)
            ]);
            
            return [
                'success' => true,
                'message' => 'Escrow settlement completed',
                'settlements' => $settlementResults
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Auto escrow settlement failed", [
                'pick_id' => $pickId,
                'result' => $result,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Process individual escrow settlement
     */
    private function processEscrowSettlement($escrow, $result, $settledBy, $notes) {
        $commissionRate = $this->getCommissionRate(); // Get platform commission rate
        $grossAmount = $escrow['amount'];
        $commission = $grossAmount * $commissionRate;
        $netAmount = $grossAmount - $commission;
        
        if ($result === 'won') {
            // Pick won - transfer funds to tipster (seller)
            $tipsterId = $this->db->fetch("SELECT user_id FROM accumulator_tickets WHERE id = ?", [$escrow['pick_id']])['user_id'];
            
            // Update escrow status (check for column existence)
            $escrowColumns = $this->db->fetchAll("SHOW COLUMNS FROM escrow_funds");
            $hasSettlementNotes = false;
            $hasUpdatedAt = false;
            foreach ($escrowColumns as $col) {
                if ($col['Field'] === 'settlement_notes') $hasSettlementNotes = true;
                if ($col['Field'] === 'updated_at') $hasUpdatedAt = true;
            }
            
            $setClause = "status = 'released'";
            $params = [];
            if ($hasUpdatedAt) {
                $setClause .= ", updated_at = NOW()";
            }
            if ($hasSettlementNotes) {
                $setClause .= ", settlement_notes = ?";
                $params[] = $notes;
            }
            $params[] = $escrow['id'];
            $this->db->query("UPDATE escrow_funds SET {$setClause} WHERE id = ?", $params);
            
            // Update purchase record (check for column existence)
            if ($escrow['purchase_id']) {
                $purchaseColumns = $this->db->fetchAll("SHOW COLUMNS FROM user_purchased_picks");
                $purchaseHasSettlementNotes = false;
                $purchaseHasUpdatedAt = false;
                $purchaseHasSettledAt = false;
                foreach ($purchaseColumns as $col) {
                    if ($col['Field'] === 'settlement_notes') $purchaseHasSettlementNotes = true;
                    if ($col['Field'] === 'updated_at') $purchaseHasUpdatedAt = true;
                    if ($col['Field'] === 'settled_at') $purchaseHasSettledAt = true;
                }
                
                $setClause = "settlement_status = 'won'";
                $params = [];
                if ($purchaseHasSettledAt) {
                    $setClause .= ", settled_at = NOW()";
                }
                if ($purchaseHasUpdatedAt) {
                    $setClause .= ", updated_at = NOW()";
                }
                if ($purchaseHasSettlementNotes) {
                    $setClause .= ", settlement_notes = ?";
                    $params[] = $notes;
                }
                $params[] = $escrow['purchase_id'];
                $this->db->query("UPDATE user_purchased_picks SET {$setClause} WHERE id = ?", $params);
            }
            
            // Add earnings to tipster wallet (with commission deducted)
            // Pass false for useTransaction since we're already in a transaction
            $this->wallet->addFunds($tipsterId, $netAmount, 'pick_earnings', "Pick settlement - Won (Commission: GHS {$commission})", false);
            
            // Record commission for platform
            $this->recordCommission($escrow['pick_id'], $commission, $grossAmount, 'tipster_earnings');
            
            return [
                'type' => 'won',
                'tipster_id' => $tipsterId,
                'gross_amount' => $grossAmount,
                'commission' => $commission,
                'net_amount' => $netAmount
            ];
            
        } elseif ($result === 'lost') {
            // Pick lost - refund buyer
            $escrowColumns = $this->db->fetchAll("SHOW COLUMNS FROM escrow_funds");
            $hasSettlementNotes = false;
            $hasUpdatedAt = false;
            foreach ($escrowColumns as $col) {
                if ($col['Field'] === 'settlement_notes') $hasSettlementNotes = true;
                if ($col['Field'] === 'updated_at') $hasUpdatedAt = true;
            }
            
            $setClause = "status = 'refunded'";
            $params = [];
            if ($hasUpdatedAt) {
                $setClause .= ", updated_at = NOW()";
            }
            if ($hasSettlementNotes) {
                $setClause .= ", settlement_notes = ?";
                $params[] = $notes;
            }
            $params[] = $escrow['id'];
            $this->db->query("UPDATE escrow_funds SET {$setClause} WHERE id = ?", $params);
            
            // Update purchase record (check for column existence)
            if ($escrow['purchase_id']) {
                $purchaseColumns = $this->db->fetchAll("SHOW COLUMNS FROM user_purchased_picks");
                $purchaseHasSettlementNotes = false;
                $purchaseHasUpdatedAt = false;
                $purchaseHasSettledAt = false;
                foreach ($purchaseColumns as $col) {
                    if ($col['Field'] === 'settlement_notes') $purchaseHasSettlementNotes = true;
                    if ($col['Field'] === 'updated_at') $purchaseHasUpdatedAt = true;
                    if ($col['Field'] === 'settled_at') $purchaseHasSettledAt = true;
                }
                
                $setClause = "settlement_status = 'lost'";
                $params = [];
                if ($purchaseHasSettledAt) {
                    $setClause .= ", settled_at = NOW()";
                }
                if ($purchaseHasUpdatedAt) {
                    $setClause .= ", updated_at = NOW()";
                }
                if ($purchaseHasSettlementNotes) {
                    $setClause .= ", settlement_notes = ?";
                    $params[] = $notes;
                }
                $params[] = $escrow['purchase_id'];
                $this->db->query("UPDATE user_purchased_picks SET {$setClause} WHERE id = ?", $params);
            }
            
            // Refund buyer
            // Pass false for useTransaction since we're already in a transaction
            $this->wallet->addFunds($escrow['buyer_id'], $grossAmount, 'pick_refund', "Pick settlement - Lost (Refund)", false);
            
            return [
                'type' => 'lost',
                'buyer_id' => $escrow['buyer_id'],
                'refund_amount' => $grossAmount
            ];
            
        } elseif ($result === 'void') {
            // Pick void - refund buyer
            $this->db->query("
                UPDATE escrow_funds 
                SET status = 'refunded', 
                    updated_at = NOW(),
                    settlement_notes = ?
                WHERE id = ?
            ", [$notes, $escrow['id']]);
            
            // Update purchase record
            if ($escrow['purchase_id']) {
                $this->db->query("
                    UPDATE user_purchased_picks 
                    SET settlement_status = 'void',
                        settled_at = NOW(),
                        settlement_notes = ?
                    WHERE id = ?
                ", [$notes, $escrow['purchase_id']]);
            }
            
            // Refund buyer
            $this->wallet->addFunds($escrow['buyer_id'], $grossAmount, 'pick_refund', "Pick settlement - Void (Refund)");
            
            return [
                'type' => 'void',
                'buyer_id' => $escrow['buyer_id'],
                'refund_amount' => $grossAmount
            ];
        }
    }
    
    /**
     * Get platform commission rate from settings
     */
    private function getCommissionRate() {
        try {
            $setting = $this->db->fetch("
                SELECT setting_value FROM growth_settings 
                WHERE setting_key = 'commission_rate' AND is_active = 1
            ");
            
            if ($setting && isset($setting['setting_value'])) {
                return floatval($setting['setting_value']);
            }
            
            // Default commission rate if setting not found
            return 0.10; // 10% commission
            
        } catch (Exception $e) {
            $this->logger->error("Error getting commission rate", [
                'error' => $e->getMessage()
            ]);
            
            // Default commission rate on error
            return 0.10; // 10% commission
        }
    }
    
    /**
     * Record platform commission
     */
    private function recordCommission($pickId, $commission, $grossAmount, $type) {
        try {
            $this->db->query("
                INSERT INTO platform_commissions 
                (pick_id, commission_amount, gross_amount, commission_type, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ", [$pickId, $commission, $grossAmount, $type]);
            
        } catch (Exception $e) {
            // If platform_commissions table doesn't exist, just log it
            $this->logger->info("Commission recorded", [
                'pick_id' => $pickId,
                'commission' => $commission,
                'gross_amount' => $grossAmount,
                'type' => $type
            ]);
        }
    }
}
?>
