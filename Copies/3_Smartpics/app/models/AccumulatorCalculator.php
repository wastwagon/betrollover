<?php
/**
 * SmartPicks Pro - Accumulator Calculator
 * Handles odds calculations and accumulator logic
 */

class AccumulatorCalculator {
    
    /**
     * Calculate combined odds for accumulator
     */
    public static function calculateCombinedOdds($selections) {
        if (empty($selections) || !is_array($selections)) {
            return 1.0;
        }
        
        $combinedOdds = 1.0;
        
        foreach ($selections as $selection) {
            $odds = (float)($selection['odds'] ?? 0);
            
            if ($odds <= 0) {
                return 0; // Invalid odds
            }
            
            $combinedOdds *= $odds;
        }
        
        return $combinedOdds;
    }
    
    /**
     * Calculate potential returns
     */
    public static function calculateReturns($stake, $combinedOdds) {
        $stake = (float)$stake;
        $combinedOdds = (float)$combinedOdds;
        
        $totalReturn = $stake * $combinedOdds;
        $profit = $totalReturn - $stake;
        
        return [
            'stake' => $stake,
            'odds' => $combinedOdds,
            'total_return' => $totalReturn,
            'profit' => $profit,
            'roi' => $stake > 0 ? ($profit / $stake) * 100 : 0
        ];
    }
    
    /**
     * Validate accumulator selections
     */
    public static function validateSelections($selections) {
        $errors = [];
        
        if (count($selections) < 2) {
            $errors[] = 'Accumulator must have at least 2 selections';
        }
        
        if (count($selections) > 20) {
            $errors[] = 'Accumulator cannot have more than 20 selections';
        }
        
        foreach ($selections as $index => $selection) {
            if (empty($selection['team'])) {
                $errors[] = "Selection " . ($index + 1) . ": Team name is required";
            }
            
            if (empty($selection['market'])) {
                $errors[] = "Selection " . ($index + 1) . ": Market is required";
            }
            
            if (empty($selection['selection'])) {
                $errors[] = "Selection " . ($index + 1) . ": Selection is required";
            }
            
            $odds = (float)($selection['odds'] ?? 0);
            if ($odds <= 1.0) {
                $errors[] = "Selection " . ($index + 1) . ": Odds must be greater than 1.0";
            }
            
            if ($odds > 1000) {
                $errors[] = "Selection " . ($index + 1) . ": Odds cannot exceed 1000";
            }
        }
        
        return $errors;
    }
    
    /**
     * Get risk level based on selections
     */
    public static function getRiskLevel($selections, $combinedOdds) {
        $selectionCount = count($selections);
        $avgOdds = $combinedOdds > 0 ? pow($combinedOdds, 1/$selectionCount) : 1;
        
        if ($selectionCount <= 2 && $avgOdds <= 2.0) {
            return 'Low';
        } elseif ($selectionCount <= 4 && $avgOdds <= 3.0) {
            return 'Medium';
        } elseif ($selectionCount <= 6 && $avgOdds <= 5.0) {
            return 'High';
        } else {
            return 'Very High';
        }
    }
    
    /**
     * Calculate confidence score
     */
    public static function calculateConfidence($selections, $tipsterStats = []) {
        $baseConfidence = 50; // Start with 50%
        
        // Factor in number of selections (fewer = higher confidence)
        $selectionCount = count($selections);
        if ($selectionCount <= 2) {
            $baseConfidence += 20;
        } elseif ($selectionCount <= 4) {
            $baseConfidence += 10;
        } elseif ($selectionCount > 8) {
            $baseConfidence -= 20;
        }
        
        // Factor in average odds (lower odds = higher confidence)
        $combinedOdds = self::calculateCombinedOdds($selections);
        $avgOdds = $combinedOdds > 0 ? pow($combinedOdds, 1/$selectionCount) : 1;
        
        if ($avgOdds <= 1.5) {
            $baseConfidence += 15;
        } elseif ($avgOdds <= 2.0) {
            $baseConfidence += 10;
        } elseif ($avgOdds <= 3.0) {
            $baseConfidence += 5;
        } elseif ($avgOdds > 5.0) {
            $baseConfidence -= 15;
        }
        
        // Factor in tipster stats if available
        if (!empty($tipsterStats)) {
            $winRate = (float)($tipsterStats['win_rate'] ?? 0);
            if ($winRate > 70) {
                $baseConfidence += 15;
            } elseif ($winRate > 60) {
                $baseConfidence += 10;
            } elseif ($winRate > 50) {
                $baseConfidence += 5;
            } elseif ($winRate < 30) {
                $baseConfidence -= 20;
            }
        }
        
        // Ensure confidence is between 0 and 100
        return max(0, min(100, $baseConfidence));
    }
    
    /**
     * Generate accumulator summary
     */
    public static function generateSummary($selections, $stake = 0) {
        $combinedOdds = self::calculateCombinedOdds($selections);
        $returns = self::calculateReturns($stake, $combinedOdds);
        $riskLevel = self::getRiskLevel($selections, $combinedOdds);
        $confidence = self::calculateConfidence($selections);
        
        return [
            'selections_count' => count($selections),
            'combined_odds' => $combinedOdds,
            'risk_level' => $riskLevel,
            'confidence' => $confidence,
            'returns' => $returns,
            'summary' => sprintf(
                "%d-fold accumulator with combined odds of %.2f. Risk level: %s. Confidence: %d%%",
                count($selections),
                $combinedOdds,
                $riskLevel,
                $confidence
            )
        ];
    }
    
    /**
     * Get market categories
     */
    public static function getMarketCategories() {
        return [
            'Match Result' => [
                'Match Winner',
                'Double Chance',
                'Draw No Bet',
                'Asian Handicap'
            ],
            'Goals' => [
                'Over/Under Goals',
                'Both Teams to Score',
                'Total Goals',
                'First Team to Score'
            ],
            'Time' => [
                'Half Time Result',
                'Half Time/Full Time',
                'First Half Goals',
                'Second Half Goals'
            ],
            'Scoring' => [
                'Correct Score',
                'Any Time Goalscorer',
                'First Goalscorer',
                'Last Goalscorer'
            ],
            'Cards' => [
                'Total Cards',
                'Player Cards',
                'Team Cards'
            ],
            'Corners' => [
                'Total Corners',
                'Team Corners',
                'First Half Corners'
            ]
        ];
    }
    
    /**
     * Get popular leagues for Ghana
     */
    public static function getPopularLeagues() {
        return [
            'Ghana Premier League' => 'Ghana',
            'English Premier League' => 'England',
            'Spanish La Liga' => 'Spain',
            'German Bundesliga' => 'Germany',
            'Italian Serie A' => 'Italy',
            'French Ligue 1' => 'France',
            'Champions League' => 'Europe',
            'Europa League' => 'Europe',
            'Nigerian Premier League' => 'Nigeria',
            'South African Premier League' => 'South Africa'
        ];
    }
}
?>
