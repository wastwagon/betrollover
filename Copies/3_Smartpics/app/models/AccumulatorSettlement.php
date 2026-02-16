<?php
/**
 * Accumulator Settlement Logic
 * Handles the logic where if any pick in an accumulator is lost, the entire coupon is lost
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/EscrowManager.php';
require_once __DIR__ . '/MailService.php';

class AccumulatorSettlement {
    private $db;
    private $logger;
    private $escrowManager;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->escrowManager = EscrowManager::getInstance();
    }
    
    /**
     * Settle a pick selection (individual pick within an accumulator)
     * @param int $pickSelectionId
     * @param string $result ('won', 'lost', 'void')
     * @param int $adminId
     * @param string $notes
     */
    public function settlePickSelection($pickSelectionId, $result, $adminId, $notes = '') {
        try {
            // Update the accumulator pick (individual pick within accumulator)
            $this->db->execute("
                UPDATE accumulator_picks 
                SET result = ?, 
                    settled_by = ?, 
                    settled_at = NOW(),
                    settlement_notes = ?
                WHERE id = ?
            ", [$result, $adminId, $notes, $pickSelectionId]);
            
            // Get the accumulator_id for this pick
            $pickSelection = $this->db->fetch("
                SELECT accumulator_id FROM accumulator_picks WHERE id = ?
            ", [$pickSelectionId]);
            
            if (!$pickSelection) {
                throw new Exception("Pick selection not found");
            }
            
            $accumulatorId = $pickSelection['accumulator_id'];
            
            // Check if any pick in this accumulator is lost
            $lostPicks = $this->db->fetch("
                SELECT COUNT(*) as lost_count 
                FROM accumulator_picks 
                WHERE accumulator_id = ? AND result = 'lost'
            ", [$accumulatorId]);
            
            if ($lostPicks['lost_count'] > 0) {
                // Mark entire accumulator as lost
                $this->settleAccumulator($accumulatorId, 'lost', $adminId, 'Accumulator lost due to individual pick loss');
            } else {
                // Check if all picks are settled
                $allSettled = $this->db->fetch("
                    SELECT COUNT(*) as total, 
                           SUM(CASE WHEN result = 'won' THEN 1 ELSE 0 END) as won_count,
                           SUM(CASE WHEN result = 'lost' THEN 1 ELSE 0 END) as lost_count,
                           SUM(CASE WHEN result = 'void' THEN 1 ELSE 0 END) as void_count,
                           SUM(CASE WHEN result = 'pending' THEN 1 ELSE 0 END) as pending_count
                    FROM accumulator_picks 
                    WHERE accumulator_id = ?
                ", [$accumulatorId]);
                
                if ($allSettled['pending_count'] == 0) {
                    // All picks are settled, determine accumulator result
                    if ($allSettled['won_count'] > 0 && $allSettled['lost_count'] == 0) {
                        $this->settleAccumulator($accumulatorId, 'won', $adminId, 'All picks won');
                    } elseif ($allSettled['lost_count'] > 0) {
                        $this->settleAccumulator($accumulatorId, 'lost', $adminId, 'One or more picks lost');
                    } else {
                        $this->settleAccumulator($accumulatorId, 'void', $adminId, 'All picks voided');
                    }
                }
            }
            
            $this->logger->info('Pick selection settled', [
                'pick_selection_id' => $pickSelectionId,
                'accumulator_id' => $accumulatorId,
                'result' => $result,
                'admin_id' => $adminId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to settle pick selection', [
                'pick_selection_id' => $pickSelectionId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Settle an entire accumulator
     * @param int $pickId
     * @param string $result ('won', 'lost', 'void')
     * @param int $adminId
     * @param string $notes
     */
    public function settleAccumulator($accumulatorId, $result, $adminId, $notes = '') {
        try {
            // Update the accumulator ticket
            $this->db->execute("
                UPDATE accumulator_tickets 
                SET status = ?, 
                    result = ?,
                    settled_by = ?, 
                    settled_at = NOW(),
                    settlement_notes = ?
                WHERE id = ?
            ", [$result, $result, $adminId, $notes, $accumulatorId]);
            
            // If accumulator is lost, remove from marketplace
            if ($result === 'lost') {
                $this->db->execute("
                    DELETE FROM pick_marketplace 
                    WHERE accumulator_id = ?
                ", [$accumulatorId]);
            }
            
            // Automatically settle escrow for this pick (if result is won or lost)
            if (in_array($result, ['won', 'lost'])) {
                try {
                    $escrowResult = $this->escrowManager->autoSettleEscrow($accumulatorId, $result, $adminId, $notes);
                    if ($escrowResult['success']) {
                        $this->logger->info('Escrow automatically settled after accumulator settlement', [
                            'accumulator_id' => $accumulatorId,
                            'result' => $result,
                            'settlements_count' => count($escrowResult['settlements'] ?? [])
                        ]);
                    } else {
                        $this->logger->warning('Escrow settlement failed after accumulator settlement', [
                            'accumulator_id' => $accumulatorId,
                            'result' => $result,
                            'error' => $escrowResult['message'] ?? 'Unknown error'
                        ]);
                    }
                } catch (Exception $e) {
                    // Log error but don't fail the settlement
                    $this->logger->error('Exception during escrow settlement', [
                        'accumulator_id' => $accumulatorId,
                        'result' => $result,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $this->logger->info('Accumulator settled', [
                'accumulator_id' => $accumulatorId,
                'result' => $result,
                'admin_id' => $adminId
            ]);
            
            // Send email notification to tipster when pick is settled
            if (in_array($result, ['won', 'lost'])) {
                try {
                    $pickInfo = $this->db->fetch("SELECT title, user_id FROM accumulator_tickets WHERE id = ?", [$accumulatorId]);
                    if ($pickInfo) {
                        $mailService = MailService::getInstance();
                        
                        // Calculate earnings if won (read from escrow_funds)
                        $earnings = 0;
                        if ($result === 'won') {
                            // Get total earnings from escrow_funds for this pick (90% of escrow amount)
                            $escrowData = $this->db->fetch("
                                SELECT COALESCE(SUM(amount * 0.90), 0) as total_earnings
                                FROM escrow_funds
                                WHERE pick_id = ? AND status = 'released'
                            ", [$accumulatorId]);
                            $earnings = floatval($escrowData['total_earnings'] ?? 0);
                        }
                        
                        $mailResult = $mailService->notifyTipsterPickSettled(
                            (int)$pickInfo['user_id'],
                            $accumulatorId,
                            $pickInfo['title'],
                            $result,
                            $earnings
                        );
                        if (!$mailResult['success']) {
                            $this->logger->warning('Failed to send tipster pick settled email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                        }
                    }
                } catch (Exception $e) {
                    // Don't fail settlement if email fails
                    $this->logger->error('Error sending tipster pick settled email', ['error' => $e->getMessage()]);
                }
            }
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to settle accumulator', [
                'accumulator_id' => $accumulatorId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Get unsettled picks for admin review
     */
    public function getUnsettledPicks() {
        return $this->db->fetchAll("
            SELECT 
                ap.id as selection_id,
                ap.accumulator_id as pick_id,
                ap.match_description as home_team,
                '' as away_team,
                ap.match_date,
                ap.prediction as market,
                ap.prediction as selection,
                ap.odds,
                'pending' as result,
                at.title as pick_title,
                at.description,
                at.created_at,
                u.username as tipster_username
            FROM accumulator_picks ap
            JOIN accumulator_tickets at ON ap.accumulator_id = at.id
            JOIN users u ON at.user_id = u.id
            WHERE at.result = 'pending'
            AND at.status IN ('active', 'pending_approval')
            ORDER BY ap.match_date ASC
        ");
    }
    
    /**
     * Get accumulator details with all picks
     */
    public function getAccumulatorDetails($pickId) {
        $accumulator = $this->db->fetch("
            SELECT p.*, u.username as tipster_username
            FROM picks p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        ", [$pickId]);
        
        if ($accumulator) {
            $accumulator['selections'] = $this->db->fetchAll("
                SELECT * FROM pick_selections 
                WHERE pick_id = ? 
                ORDER BY match_date, match_time
            ", [$pickId]);
        }
        
        return $accumulator;
    }
}
