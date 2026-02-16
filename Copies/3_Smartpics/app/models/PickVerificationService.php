<?php
/**
 * SmartPicks Pro - Pick Verification Service
 * Handles duplicate detection and verification for accumulator picks
 */

class PickVerificationService {
    
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
     * Generate fingerprint for accumulator picks
     */
    public function generateFingerprint($picks) {
        try {
            $fixtures = [];
            $markets = [];
            $selections = [];
            $odds = [];
            
            foreach ($picks as $pick) {
                $fixtures[] = $pick['fixture_id'];
                $markets[] = $pick['market_type'];
                $selections[] = $pick['selection'];
                $odds[] = round((float)$pick['odds'], 2); // Round to 2 decimals
            }
            
            // Sort arrays for consistent hashing
            sort($fixtures);
            sort($markets);
            sort($selections);
            sort($odds);
            
            $fixtureMarketSelection = [];
            foreach ($fixtures as $index => $fixture) {
                $fixtureMarketSelection[] = $fixture . '|' . $markets[$index] . '|' . $selections[$index];
            }
            sort($fixtureMarketSelection);
            
            return [
                'fixture_market_selection_hash' => md5(implode(',', $fixtureMarketSelection)),
                'odds_hash' => md5(implode(',', $odds)),
                'combined_hash' => md5(implode(',', $fixtureMarketSelection) . implode(',', $odds))
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error generating fingerprint", [
                'picks' => $picks,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Check if accumulator picks are unique
     */
    public function checkUniqueness($picks, $excludeAccumulatorId = null) {
        try {
            $fingerprint = $this->generateFingerprint($picks);
            if (!$fingerprint) {
                return [
                    'status' => 'error',
                    'message' => 'Failed to generate fingerprint'
                ];
            }
            
            // Check for exact duplicates
            $exactDuplicate = $this->checkExactDuplicate($fingerprint['fixture_market_selection_hash'], $excludeAccumulatorId);
            if ($exactDuplicate) {
                return [
                    'status' => 'blocked',
                    'level' => 'exact',
                    'message' => 'exact_duplicate',
                    'duplicate_info' => $exactDuplicate
                ];
            }
            
            // Check for near duplicates (same fixtures + markets + selections, different odds)
            $nearDuplicate = $this->checkNearDuplicate($fingerprint['fixture_market_selection_hash'], $excludeAccumulatorId);
            if ($nearDuplicate) {
                return [
                    'status' => 'warning',
                    'level' => 'near',
                    'message' => 'near_duplicate',
                    'similar_picks' => $nearDuplicate
                ];
            }
            
            // Check for similar strategy (same fixtures + markets)
            $similarStrategy = $this->checkSimilarStrategy($picks, $excludeAccumulatorId);
            if ($similarStrategy) {
                return [
                    'status' => 'info',
                    'level' => 'similar',
                    'message' => 'similar_strategy',
                    'similar_picks' => $similarStrategy
                ];
            }
            
            return [
                'status' => 'unique',
                'level' => 'unique',
                'message' => 'unique_pick',
                'fingerprint' => $fingerprint
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error checking uniqueness", [
                'picks' => $picks,
                'error' => $e->getMessage()
            ]);
            
            return [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Check for exact duplicates
     */
    private function checkExactDuplicate($fixtureMarketSelectionHash, $excludeAccumulatorId = null) {
        try {
            $whereClause = "WHERE pf.fixture_market_selection_hash = ?";
            $params = [$fixtureMarketSelectionHash];
            
            if ($excludeAccumulatorId) {
                $whereClause .= " AND pf.accumulator_id != ?";
                $params[] = $excludeAccumulatorId;
            }
            
            $duplicates = $this->db->fetchAll("
                SELECT 
                    pf.accumulator_id,
                    at.title,
                    at.created_at,
                    u.display_name as creator_name
                FROM pick_fingerprints pf
                JOIN accumulator_tickets at ON pf.accumulator_id = at.id
                JOIN users u ON at.user_id = u.id
                {$whereClause}
                AND at.status IN ('active', 'draft', 'won', 'lost')
                ORDER BY at.created_at DESC
                LIMIT 5
            ", $params);
            
            return count($duplicates) > 0 ? $duplicates : null;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking exact duplicate", [
                'hash' => $fixtureMarketSelectionHash,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Check for near duplicates
     */
    private function checkNearDuplicate($fixtureMarketSelectionHash, $excludeAccumulatorId = null) {
        try {
            $whereClause = "WHERE pf.fixture_market_selection_hash = ?";
            $params = [$fixtureMarketSelectionHash];
            
            if ($excludeAccumulatorId) {
                $whereClause .= " AND pf.accumulator_id != ?";
                $params[] = $excludeAccumulatorId;
            }
            
            $similar = $this->db->fetchAll("
                SELECT 
                    pf.accumulator_id,
                    at.title,
                    at.created_at,
                    u.display_name as creator_name,
                    at.total_odds
                FROM pick_fingerprints pf
                JOIN accumulator_tickets at ON pf.accumulator_id = at.id
                JOIN users u ON at.user_id = u.id
                {$whereClause}
                AND at.status IN ('active', 'draft', 'won', 'lost')
                ORDER BY at.created_at DESC
                LIMIT 3
            ", $params);
            
            return count($similar) > 0 ? $similar : null;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking near duplicate", [
                'hash' => $fixtureMarketSelectionHash,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Check for similar strategy
     */
    private function checkSimilarStrategy($picks, $excludeAccumulatorId = null) {
        try {
            $fixtures = array_unique(array_column($picks, 'fixture_id'));
            $markets = array_unique(array_column($picks, 'market_type'));
            
            if (count($fixtures) < 2) {
                return null; // Need at least 2 fixtures for similarity check
            }
            
            $placeholders = str_repeat('?,', count($fixtures) - 1) . '?';
            $whereClause = "WHERE f.id IN ({$placeholders})";
            $params = $fixtures;
            
            $placeholders = str_repeat('?,', count($markets) - 1) . '?';
            $whereClause .= " AND p.market_type IN ({$placeholders})";
            $params = array_merge($params, $markets);
            
            if ($excludeAccumulatorId) {
                $whereClause .= " AND p.accumulator_id != ?";
                $params[] = $excludeAccumulatorId;
            }
            
            $similar = $this->db->fetchAll("
                SELECT 
                    p.accumulator_id,
                    at.title,
                    at.created_at,
                    u.display_name as creator_name,
                    COUNT(*) as matching_picks,
                    at.total_picks
                FROM picks p
                JOIN accumulator_tickets at ON p.accumulator_id = at.id
                JOIN users u ON at.user_id = u.id
                JOIN fixtures f ON p.fixture_id = f.id
                {$whereClause}
                AND at.status IN ('active', 'draft', 'won', 'lost')
                GROUP BY p.accumulator_id
                HAVING matching_picks >= 2
                ORDER BY matching_picks DESC, at.created_at DESC
                LIMIT 3
            ", $params);
            
            return count($similar) > 0 ? $similar : null;
            
        } catch (Exception $e) {
            $this->logger->error("Error checking similar strategy", [
                'picks' => $picks,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Store fingerprint for accumulator
     */
    public function storeFingerprint($accumulatorId, $picks) {
        try {
            $fingerprint = $this->generateFingerprint($picks);
            if (!$fingerprint) {
                return false;
            }
            
            // Check if fingerprint already exists
            $existing = $this->db->fetch("
                SELECT id FROM pick_fingerprints 
                WHERE fixture_market_selection_hash = ?
            ", [$fingerprint['fixture_market_selection_hash']]);
            
            if ($existing) {
                // Update existing fingerprint
                $this->db->update('pick_fingerprints', [
                    'accumulator_id' => $accumulatorId,
                    'odds_hash' => $fingerprint['odds_hash']
                ], 'id = ?', [$existing['id']]);
            } else {
                // Insert new fingerprint
                $this->db->insert('pick_fingerprints', [
                    'accumulator_id' => $accumulatorId,
                    'fixture_market_selection_hash' => $fingerprint['fixture_market_selection_hash'],
                    'odds_hash' => $fingerprint['odds_hash'],
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
            
            $this->logger->info("Fingerprint stored", [
                'accumulator_id' => $accumulatorId,
                'hash' => $fingerprint['fixture_market_selection_hash']
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error storing fingerprint", [
                'accumulator_id' => $accumulatorId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Log verification attempt
     */
    public function logVerification($userId, $accumulatorId, $verificationResult) {
        try {
            $this->db->insert('pick_verification_log', [
                'user_id' => $userId,
                'accumulator_id' => $accumulatorId,
                'verification_hash' => $verificationResult['fingerprint']['fixture_market_selection_hash'] ?? '',
                'verification_status' => $verificationResult['status'],
                'similar_picks_found' => count($verificationResult['similar_picks'] ?? []),
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error logging verification", [
                'user_id' => $userId,
                'accumulator_id' => $accumulatorId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Get verification statistics
     */
    public function getVerificationStats($userId = null) {
        try {
            $whereClause = "";
            $params = [];
            
            if ($userId) {
                $whereClause = "WHERE user_id = ?";
                $params = [$userId];
            }
            
            $stats = $this->db->fetch("
                SELECT 
                    COUNT(*) as total_verifications,
                    SUM(CASE WHEN verification_status = 'unique' THEN 1 ELSE 0 END) as unique_count,
                    SUM(CASE WHEN verification_status = 'duplicate' THEN 1 ELSE 0 END) as duplicate_count,
                    SUM(CASE WHEN verification_status = 'similar' THEN 1 ELSE 0 END) as similar_count,
                    AVG(similar_picks_found) as avg_similar_picks
                FROM pick_verification_log
                {$whereClause}
            ", $params);
            
            return $stats ?: [];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting verification stats", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}
?>

