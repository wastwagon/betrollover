<?php
/**
 * SmartPicks Pro - Tipster Qualification Service
 * 
 * Handles tipster qualification requirements for marketplace access
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class TipsterQualificationService {
    
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
     * Check if tipster qualification is enabled
     */
    public function isQualificationEnabled() {
        try {
            $setting = $this->db->fetch("
                SELECT setting_value FROM growth_settings 
                WHERE setting_key = 'tipster_qualification_enabled' AND is_active = 1
            ");
            
            return $setting && $setting['setting_value'] == '1';
            
        } catch (Exception $e) {
            $this->logger->error("Error checking qualification enabled", [
                'error' => $e->getMessage()
            ]);
            
            return false; // Default to disabled on error
        }
    }
    
    /**
     * Get qualification settings
     */
    public function getQualificationSettings() {
        try {
            $settings = $this->db->fetchAll("
                SELECT setting_key, setting_value 
                FROM growth_settings 
                WHERE category = 'tipster_qualification' AND is_active = 1
            ");
            
            $result = [];
            foreach ($settings as $setting) {
                $result[$setting['setting_key']] = $setting['setting_value'];
            }
            
            return [
                'enabled' => ($result['tipster_qualification_enabled'] ?? '0') == '1',
                'min_free_picks' => intval($result['tipster_min_free_picks'] ?? '20'),
                'min_roi_percentage' => intval($result['tipster_min_roi_percentage'] ?? '20'),
                'period_days' => intval($result['tipster_qualification_period_days'] ?? '90')
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting qualification settings", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'enabled' => false,
                'min_free_picks' => 20,
                'min_roi_percentage' => 20,
                'period_days' => 90
            ];
        }
    }
    
    /**
     * Check if tipster is qualified for marketplace (with ongoing monitoring)
     */
    public function isTipsterQualified($tipsterId) {
        try {
            $settings = $this->getQualificationSettings();
            
            // If qualification is disabled, all tipsters are qualified
            if (!$settings['enabled']) {
                return [
                    'qualified' => true,
                    'reason' => 'Qualification disabled'
                ];
            }
            
            // Get tipster's free picks performance
            $performance = $this->getTipsterFreePicksPerformance($tipsterId, $settings['period_days']);
            
            // Check minimum free picks requirement
            if ($performance['total_free_picks'] < $settings['min_free_picks']) {
                return [
                    'qualified' => false,
                    'reason' => "Need {$settings['min_free_picks']} free picks, have {$performance['total_free_picks']}",
                    'free_picks_needed' => $settings['min_free_picks'] - $performance['total_free_picks']
                ];
            }
            
            // Check minimum ROI requirement (ongoing monitoring)
            if ($performance['roi_percentage'] < $settings['min_roi_percentage']) {
                return [
                    'qualified' => false,
                    'reason' => "ROI fell below minimum. Need {$settings['min_roi_percentage']}% ROI, currently have {$performance['roi_percentage']}%. Share more free picks to improve ROI.",
                    'roi_needed' => $settings['min_roi_percentage'] - $performance['roi_percentage'],
                    'roi_fell_below' => true
                ];
            }
            
            return [
                'qualified' => true,
                'reason' => 'All requirements met',
                'performance' => $performance
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error checking tipster qualification", [
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'qualified' => false,
                'reason' => 'Error checking qualification'
            ];
        }
    }
    
    /**
     * Get tipster's free picks performance
     */
    public function getTipsterFreePicksPerformance($tipsterId, $periodDays = 90) {
        try {
            $startDate = date('Y-m-d H:i:s', strtotime("-{$periodDays} days"));
            
            // Get free picks (picks with price = 0, regardless of marketplace status)
            $freePicks = $this->db->fetchAll("
                SELECT 
                    at.id,
                    at.title,
                    at.price,
                    at.total_odds,
                    at.result,
                    at.created_at,
                    at.settled_at
                FROM accumulator_tickets at
                WHERE at.user_id = ? 
                AND at.created_at >= ?
                AND at.price = 0
                AND at.status IN ('active', 'settled', 'won', 'lost', 'void')
                ORDER BY at.created_at DESC
            ", [$tipsterId, $startDate]);
            
            $totalPicks = count($freePicks);
            $wonPicks = 0;
            $totalInvestment = 0;
            $totalReturns = 0;
            
            foreach ($freePicks as $pick) {
                $totalInvestment += $pick['price']; // Should be 0 for free picks
                
                if ($pick['result'] === 'won') {
                    $wonPicks++;
                    // For free picks, assume 1 GHS investment and calculate returns based on odds
                    $investment = 1.00; // Standard investment for ROI calculation
                    $returns = $investment * $pick['total_odds'];
                    $totalReturns += $returns;
                    $totalInvestment += $investment;
                } elseif ($pick['result'] === 'lost') {
                    // For lost picks, add to investment but no returns
                    $investment = 1.00;
                    $totalInvestment += $investment;
                }
            }
            
            // Calculate ROI percentage
            $roiPercentage = 0;
            if ($totalInvestment > 0) {
                $roiPercentage = (($totalReturns - $totalInvestment) / $totalInvestment) * 100;
            }
            
            return [
                'total_free_picks' => $totalPicks,
                'won_picks' => $wonPicks,
                'win_rate' => $totalPicks > 0 ? round(($wonPicks / $totalPicks) * 100, 2) : 0,
                'total_investment' => $totalInvestment,
                'total_returns' => $totalReturns,
                'roi_percentage' => round($roiPercentage, 2),
                'period_days' => $periodDays,
                'start_date' => $startDate
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error getting tipster free picks performance", [
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            
            return [
                'total_free_picks' => 0,
                'won_picks' => 0,
                'win_rate' => 0,
                'total_investment' => 0,
                'total_returns' => 0,
                'roi_percentage' => 0,
                'period_days' => $periodDays,
                'start_date' => $startDate ?? date('Y-m-d H:i:s', strtotime("-{$periodDays} days"))
            ];
        }
    }
    
    /**
     * Get tipster qualification status for display
     */
    public function getTipsterQualificationStatus($tipsterId) {
        $qualification = $this->isTipsterQualified($tipsterId);
        $settings = $this->getQualificationSettings();
        
        if (!$settings['enabled']) {
            return [
                'status' => 'disabled',
                'message' => 'Qualification requirements are disabled',
                'can_sell' => true
            ];
        }
        
        if ($qualification['qualified']) {
            return [
                'status' => 'qualified',
                'message' => 'Qualified for marketplace access',
                'can_sell' => true,
                'performance' => $qualification['performance'] ?? null
            ];
        } else {
            $status = 'not_qualified';
            $message = $qualification['reason'];
            
            // Check if ROI fell below minimum
            if (isset($qualification['roi_fell_below']) && $qualification['roi_fell_below']) {
                $status = 'roi_fell_below';
                $message = "ROI fell below minimum! " . $qualification['reason'];
            }
            
            return [
                'status' => $status,
                'message' => $message,
                'can_sell' => false,
                'requirements' => [
                    'min_free_picks' => $settings['min_free_picks'],
                    'min_roi_percentage' => $settings['min_roi_percentage'],
                    'period_days' => $settings['period_days']
                ],
                'deficits' => [
                    'free_picks_needed' => $qualification['free_picks_needed'] ?? 0,
                    'roi_needed' => $qualification['roi_needed'] ?? 0
                ],
                'roi_fell_below' => $qualification['roi_fell_below'] ?? false
            ];
        }
    }
}
?>
