<?php
/**
 * SmartPicks Pro - Pick Marketplace Model
 * Handles marketplace operations for buying and selling accumulator picks
 */

// Include required dependencies
require_once __DIR__ . '/Wallet.php';

class PickMarketplace {
    
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
     * List accumulator on marketplace
     */
    public function listAccumulator($accumulatorId, $sellerId, $price, $maxPurchases = 1) {
        try {
            $this->db->beginTransaction();
            
            // Verify accumulator exists and belongs to seller
            $accumulator = $this->db->fetch("
                SELECT * FROM accumulator_tickets 
                WHERE id = ? AND user_id = ? AND status = 'active'
            ", [$accumulatorId, $sellerId]);
            
            if (!$accumulator) {
                throw new Exception("Accumulator not found or not eligible for marketplace");
            }
            
            // Check if already listed
            $existing = $this->db->fetch("
                SELECT id FROM pick_marketplace 
                WHERE accumulator_id = ?
            ", [$accumulatorId]);
            
            if ($existing) {
                throw new Exception("Accumulator already listed on marketplace");
            }
            
            // Create marketplace listing
            $marketplaceId = $this->db->insert('pick_marketplace', [
                'accumulator_id' => $accumulatorId,
                'seller_id' => $sellerId,
                'price' => $price,
                'status' => 'active',
                'purchase_count' => 0,
                'max_purchases' => $maxPurchases,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
            // Update accumulator as marketplace item
            $this->db->update('accumulator_tickets', [
                'is_marketplace' => 1,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$accumulatorId]);
            
            $this->db->commit();
            
            $this->logger->info("Accumulator listed on marketplace", [
                'marketplace_id' => $marketplaceId,
                'accumulator_id' => $accumulatorId,
                'seller_id' => $sellerId,
                'price' => $price
            ]);
            
            return [
                'success' => true,
                'marketplace_id' => $marketplaceId
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error listing accumulator on marketplace", [
                'accumulator_id' => $accumulatorId,
                'seller_id' => $sellerId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Purchase accumulator from marketplace
     */
    public function purchaseAccumulator($marketplaceId, $buyerId) {
        try {
            $this->db->beginTransaction();
            
            // Get marketplace listing
            $listing = $this->db->fetch("
                SELECT 
                    pm.*,
                    at.title,
                    at.total_odds,
                    at.total_picks,
                    at.status as acca_status
                FROM pick_marketplace pm
                JOIN accumulator_tickets at ON pm.accumulator_id = at.id
                WHERE pm.id = ? AND pm.status = 'active'
            ", [$marketplaceId]);
            
            if (!$listing) {
                throw new Exception("Marketplace listing not found or not active");
            }
            
            // Check if buyer already purchased this accumulator
            $existingPurchase = $this->db->fetch("
                SELECT id FROM user_purchased_picks 
                WHERE user_id = ? AND accumulator_id = ?
            ", [$buyerId, $listing['accumulator_id']]);
            
            if ($existingPurchase) {
                throw new Exception("You have already purchased this accumulator");
            }
            
            // Check if seller is trying to buy their own pick
            if ($listing['seller_id'] == $buyerId) {
                throw new Exception("You cannot purchase your own accumulator");
            }
            
            // Check if max purchases reached
            if ($listing['purchase_count'] >= $listing['max_purchases']) {
                throw new Exception("This accumulator is no longer available for purchase");
            }
            
            // Check buyer's wallet balance
            $walletBalance = $this->wallet->getBalance($buyerId);
            if (!$walletBalance || $walletBalance['balance'] < $listing['price']) {
                throw new Exception("Insufficient wallet balance");
            }
            
            // Deduct funds from buyer's wallet
            $deductResult = $this->wallet->deductFunds(
                $buyerId, 
                $listing['price'], 
                'marketplace_purchase_' . $marketplaceId,
                "Purchased accumulator: {$listing['title']}"
            );
            
            if (!$deductResult['success']) {
                throw new Exception("Failed to deduct funds: " . $deductResult['error']);
            }
            
            // Record purchase
            $purchaseId = $this->db->insert('user_purchased_picks', [
                'user_id' => $buyerId,
                'accumulator_id' => $listing['accumulator_id'],
                'purchase_price' => $listing['price'],
                'purchase_date' => date('Y-m-d H:i:s'),
                'settlement_status' => 'pending'
            ]);
            
            // Update marketplace purchase count
            $this->db->update('pick_marketplace', [
                'purchase_count' => $listing['purchase_count'] + 1,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$marketplaceId]);
            
            // Mark as sold if max purchases reached
            if ($listing['purchase_count'] + 1 >= $listing['max_purchases']) {
                $this->db->update('pick_marketplace', [
                    'status' => 'sold',
                    'updated_at' => date('Y-m-d H:i:s')
                ], 'id = ?', [$marketplaceId]);
            }
            
            $this->db->commit();
            
            $this->logger->info("Accumulator purchased from marketplace", [
                'purchase_id' => $purchaseId,
                'marketplace_id' => $marketplaceId,
                'buyer_id' => $buyerId,
                'seller_id' => $listing['seller_id'],
                'price' => $listing['price']
            ]);
            
            return [
                'success' => true,
                'purchase_id' => $purchaseId,
                'new_balance' => $deductResult['new_balance']
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error purchasing accumulator from marketplace", [
                'marketplace_id' => $marketplaceId,
                'buyer_id' => $buyerId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get marketplace listings
     */
    public function getMarketplaceListings($userId = null, $limit = 20, $offset = 0) {
        try {
            $whereClause = "WHERE pm.status = 'active'";
            $params = [];
            
            // Add user's purchase status if user provided
            $selectClause = "
                SELECT 
                    pm.*,
                    at.title,
                    at.description,
                    at.total_odds,
                    at.total_picks,
                    at.created_at as acca_created,
                    u.display_name as seller_name,
                    u.id as seller_id
            ";
            
            if ($userId) {
                $selectClause .= ", 
                    CASE 
                        WHEN upp.user_id IS NOT NULL THEN 'purchased'
                        WHEN pm.purchase_count >= pm.max_purchases THEN 'sold_out'
                        ELSE 'available'
                    END as purchase_status,
                    upp.purchase_date
                ";
                
                $fromClause = "
                    FROM pick_marketplace pm
                    JOIN accumulator_tickets at ON pm.accumulator_id = at.id
                    JOIN users u ON pm.seller_id = u.id
                    LEFT JOIN user_purchased_picks upp ON upp.user_id = ? AND upp.accumulator_id = pm.accumulator_id
                ";
                $params[] = $userId;
            } else {
                $selectClause .= ", 
                    CASE 
                        WHEN pm.purchase_count >= pm.max_purchases THEN 'sold_out'
                        ELSE 'available'
                    END as purchase_status
                ";
                
                $fromClause = "
                    FROM pick_marketplace pm
                    JOIN accumulator_tickets at ON pm.accumulator_id = at.id
                    JOIN users u ON pm.seller_id = u.id
                ";
            }
            
            $listings = $this->db->fetchAll("
                {$selectClause}
                {$fromClause}
                {$whereClause}
                ORDER BY pm.created_at DESC
                LIMIT ? OFFSET ?
            ", array_merge($params, [$limit, $offset]));
            
            return $listings ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting marketplace listings", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get user's purchased picks
     */
    public function getUserPurchasedPicks($userId, $status = null, $limit = 50, $offset = 0) {
        try {
            $whereClause = "WHERE upp.user_id = ?";
            $params = [$userId];
            
            if ($status) {
                $whereClause .= " AND upp.settlement_status = ?";
                $params[] = $status;
            }
            
            $purchases = $this->db->fetchAll("
                SELECT 
                    upp.*,
                    at.title,
                    at.description,
                    at.total_odds,
                    at.total_picks,
                    at.status as acca_status,
                    u.display_name as seller_name,
                    u.id as seller_id,
                    pm.price as original_price
                FROM user_purchased_picks upp
                JOIN accumulator_tickets at ON upp.accumulator_id = at.id
                JOIN users u ON at.user_id = u.id
                LEFT JOIN pick_marketplace pm ON upp.accumulator_id = pm.accumulator_id
                {$whereClause}
                ORDER BY upp.purchase_date DESC
                LIMIT ? OFFSET ?
            ", array_merge($params, [$limit, $offset]));
            
            return $purchases ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user purchased picks", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get user's marketplace listings (as seller)
     */
    public function getUserListings($userId, $status = null, $limit = 50, $offset = 0) {
        try {
            $whereClause = "WHERE pm.seller_id = ?";
            $params = [$userId];
            
            if ($status) {
                $whereClause .= " AND pm.status = ?";
                $params[] = $status;
            }
            
            $listings = $this->db->fetchAll("
                SELECT 
                    pm.*,
                    at.title,
                    at.description,
                    at.total_odds,
                    at.total_picks,
                    at.created_at as acca_created,
                    COUNT(upp.id) as total_purchases,
                    SUM(pm.price) as total_earned
                FROM pick_marketplace pm
                JOIN accumulator_tickets at ON pm.accumulator_id = at.id
                LEFT JOIN user_purchased_picks upp ON upp.accumulator_id = pm.accumulator_id
                {$whereClause}
                GROUP BY pm.id
                ORDER BY pm.created_at DESC
                LIMIT ? OFFSET ?
            ", array_merge($params, [$limit, $offset]));
            
            return $listings ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user listings", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Remove listing from marketplace
     */
    public function removeListing($marketplaceId, $userId) {
        try {
            $this->db->beginTransaction();
            
            // Verify listing belongs to user
            $listing = $this->db->fetch("
                SELECT * FROM pick_marketplace 
                WHERE id = ? AND seller_id = ?
            ", [$marketplaceId, $userId]);
            
            if (!$listing) {
                throw new Exception("Listing not found or not authorized");
            }
            
            // Update marketplace status
            $this->db->update('pick_marketplace', [
                'status' => 'removed',
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$marketplaceId]);
            
            // Update accumulator marketplace flag
            $this->db->update('accumulator_tickets', [
                'is_marketplace' => 0,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$listing['accumulator_id']]);
            
            $this->db->commit();
            
            $this->logger->info("Marketplace listing removed", [
                'marketplace_id' => $marketplaceId,
                'user_id' => $userId
            ]);
            
            return [
                'success' => true
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            
            $this->logger->error("Error removing marketplace listing", [
                'marketplace_id' => $marketplaceId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get marketplace statistics
     */
    public function getMarketplaceStats($userId = null) {
        try {
            $whereClause = "";
            $params = [];
            
            if ($userId) {
                $whereClause = "WHERE pm.seller_id = ?";
                $params = [$userId];
            }
            
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_listings,
                    SUM(CASE WHEN pm.status = 'active' THEN 1 ELSE 0 END) as active_listings,
                    SUM(CASE WHEN pm.status = 'sold' THEN 1 ELSE 0 END) as sold_listings,
                    SUM(pm.purchase_count) as total_purchases,
                    SUM(pm.price * pm.purchase_count) as total_earnings,
                    AVG(pm.price) as average_price
                FROM pick_marketplace pm
                {$whereClause}
            ", $params);
            
            return $stats ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting marketplace stats", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}
?>

