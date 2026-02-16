<?php
/**
 * SmartPicks Pro - Rankings Controller
 * Handles user rankings and leaderboard functionality
 */

// Only start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include required files
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/UserPerformanceService.php';
require_once __DIR__ . '/../models/AccumulatorTicket.php';

class RankingsController {
    
    private $performanceService;
    private $accumulatorTicket;
    private $logger;
    
    public function __construct() {
        $this->performanceService = UserPerformanceService::getInstance();
        $this->accumulatorTicket = AccumulatorTicket::getInstance();
        $this->logger = Logger::getInstance();
    }
    
    /**
     * Main entry point - route requests
     */
    public function handleRequest() {
        $action = $_GET['action'] ?? $_POST['action'] ?? 'index';
        
        try {
            switch ($action) {
                case 'index':
                case 'overall':
                    $this->showOverallRankings();
                    break;
                    
                case 'monthly':
                    $this->showMonthlyRankings();
                    break;
                    
                case 'weekly':
                    $this->showWeeklyRankings();
                    break;
                    
                case 'win_rate':
                    $this->showWinRateRankings();
                    break;
                    
                case 'most_profitable':
                    $this->showMostProfitableRankings();
                    break;
                    
                case 'by_market':
                    $this->showMarketRankings();
                    break;
                    
                case 'my_ranking':
                    $this->showMyRanking();
                    break;
                    
                case 'get_rankings':
                    $this->getRankingsData();
                    break;
                    
                case 'get_user_ranking':
                    $this->getUserRanking();
                    break;
                    
                case 'update_rankings':
                    $this->updateRankings();
                    break;
                    
                default:
                    $this->showOverallRankings();
                    break;
            }
        } catch (Exception $e) {
            $this->logger->error("Rankings controller error", [
                'action' => $action,
                'error' => $e->getMessage()
            ]);
            
            if ($this->isAjaxRequest()) {
                $this->jsonResponse(['success' => false, 'error' => 'An error occurred']);
            } else {
                $this->showError($e->getMessage());
            }
        }
    }
    
    /**
     * Show overall rankings page
     */
    private function showOverallRankings() {
        $userId = $this->isLoggedIn() ? $_SESSION['user_id'] : null;
        $rankings = $this->performanceService->getUserRankings('overall', 100);
        $myRanking = $userId ? $this->performanceService->getUserRankingPosition($userId, 'overall') : null;
        
        $this->renderRankingsPage('Overall Rankings', 'overall', $rankings, $myRanking);
    }
    
    /**
     * Show monthly rankings page
     */
    private function showMonthlyRankings() {
        $userId = $this->isLoggedIn() ? $_SESSION['user_id'] : null;
        $rankings = $this->performanceService->getUserRankings('monthly', 50);
        $myRanking = $userId ? $this->performanceService->getUserRankingPosition($userId, 'monthly') : null;
        
        $this->renderRankingsPage('Monthly Rankings', 'monthly', $rankings, $myRanking);
    }
    
    /**
     * Show weekly rankings page
     */
    private function showWeeklyRankings() {
        $userId = $this->isLoggedIn() ? $_SESSION['user_id'] : null;
        $rankings = $this->performanceService->getUserRankings('weekly', 25);
        $myRanking = $userId ? $this->performanceService->getUserRankingPosition($userId, 'weekly') : null;
        
        $this->renderRankingsPage('Weekly Rankings', 'weekly', $rankings, $myRanking);
    }
    
    /**
     * Show win rate rankings page
     */
    private function showWinRateRankings() {
        $userId = $this->isLoggedIn() ? $_SESSION['user_id'] : null;
        $rankings = $this->performanceService->getUserRankings('win_rate', 50);
        $myRanking = $userId ? $this->performanceService->getUserRankingPosition($userId, 'win_rate') : null;
        
        $this->renderRankingsPage('Win Rate Rankings', 'win_rate', $rankings, $myRanking);
    }
    
    /**
     * Show most profitable rankings page
     */
    private function showMostProfitableRankings() {
        $userId = $this->isLoggedIn() ? $_SESSION['user_id'] : null;
        $rankings = $this->performanceService->getUserRankings('most_profitable', 50);
        $myRanking = $userId ? $this->performanceService->getUserRankingPosition($userId, 'most_profitable') : null;
        
        $this->renderRankingsPage('Most Profitable Rankings', 'most_profitable', $rankings, $myRanking);
    }
    
    /**
     * Show market-specific rankings
     */
    private function showMarketRankings() {
        $market = $_GET['market'] ?? 'all';
        $userId = $this->isLoggedIn() ? $_SESSION['user_id'] : null;
        
        // Get rankings filtered by market (simplified for now)
        $rankings = $this->performanceService->getUserRankings('overall', 50);
        $myRanking = $userId ? $this->performanceService->getUserRankingPosition($userId, 'overall') : null;
        
        $this->renderRankingsPage('Market Rankings - ' . ucfirst($market), 'by_market', $rankings, $myRanking, ['market' => $market]);
    }
    
    /**
     * Show user's personal ranking page
     */
    private function showMyRanking() {
        if (!$this->isLoggedIn()) {
            header('Location: /login');
            exit;
        }
        
        $userId = $_SESSION['user_id'];
        
        // Get user's performance
        $performance = $this->performanceService->getUserPerformance($userId);
        
        // Get user's rankings in different categories
        $rankings = [];
        $categories = ['overall', 'monthly', 'weekly', 'win_rate', 'most_profitable'];
        
        foreach ($categories as $category) {
            $rankings[$category] = $this->performanceService->getUserRankingPosition($userId, $category);
        }
        
        // Get user's recent accumulators
        $recentAccumulators = $this->accumulatorTicket->getUserAccumulators($userId, null, 10);
        
        // Get user's statistics
        $stats = $this->accumulatorTicket->getStatistics($userId);
        
        include __DIR__ . '/../views/pages/rankings_my.php';
    }
    
    /**
     * Get rankings data (AJAX)
     */
    private function getRankingsData() {
        $category = $_GET['category'] ?? 'overall';
        $limit = $_GET['limit'] ?? 50;
        
        $rankings = $this->performanceService->getUserRankings($category, $limit);
        
        $this->jsonResponse([
            'success' => true,
            'rankings' => $rankings,
            'category' => $category,
            'count' => count($rankings)
        ]);
    }
    
    /**
     * Get user's ranking position (AJAX)
     */
    private function getUserRanking() {
        if (!$this->isLoggedIn()) {
            $this->jsonResponse(['success' => false, 'error' => 'Not logged in']);
            return;
        }
        
        $userId = $_SESSION['user_id'];
        $category = $_GET['category'] ?? 'overall';
        
        $ranking = $this->performanceService->getUserRankingPosition($userId, $category);
        
        $this->jsonResponse([
            'success' => true,
            'ranking' => $ranking,
            'category' => $category
        ]);
    }
    
    /**
     * Update rankings (Admin only)
     */
    private function updateRankings() {
        if (!$this->isLoggedIn() || !$this->isAdmin()) {
            $this->jsonResponse(['success' => false, 'error' => 'Unauthorized']);
            return;
        }
        
        $category = $_POST['category'] ?? 'overall';
        
        $result = $this->performanceService->updateTipsterRankings($category);
        
        if ($result['success']) {
            $this->jsonResponse([
                'success' => true,
                'message' => 'Rankings updated successfully',
                'total_rankings' => $result['total_rankings']
            ]);
        } else {
            $this->jsonResponse(['success' => false, 'error' => $result['error']]);
        }
    }
    
    /**
     * Render rankings page
     */
    private function renderRankingsPage($title, $category, $rankings, $myRanking = null, $extraData = []) {
        include __DIR__ . '/../views/pages/rankings.php';
    }
    
    /**
     * Helper: Check if user is logged in
     */
    private function isLoggedIn() {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }
    
    /**
     * Helper: Check if user is admin
     */
    private function isAdmin() {
        return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
    }
    
    /**
     * Helper: Check if request is AJAX
     */
    private function isAjaxRequest() {
        return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }
    
    /**
     * Helper: Send JSON response
     */
    private function jsonResponse($data) {
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
    
    /**
     * Helper: Show error page
     */
    private function showError($message) {
        include __DIR__ . '/../views/pages/error.php';
    }
}

// Initialize and handle request
$controller = new RankingsController();
$controller->handleRequest();
?>
