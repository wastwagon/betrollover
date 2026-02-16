<?php
/**
 * SmartPicks Pro - Accumulator Controller
 * Handles accumulator creation, management, and operations
 */

// Only start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Include required files
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/AccumulatorTicket.php';
require_once __DIR__ . '/../models/PickVerificationService.php';
require_once __DIR__ . '/../models/UserPerformanceService.php';
require_once __DIR__ . '/../models/TipsterApiService.php';

class AccumulatorController {
    
    private $db;
    private $accumulatorTicket;
    private $verificationService;
    private $performanceService;
    private $tipsterApi;
    private $logger;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->accumulatorTicket = AccumulatorTicket::getInstance();
        $this->verificationService = PickVerificationService::getInstance();
        $this->performanceService = UserPerformanceService::getInstance();
        $this->tipsterApi = TipsterApiService::getInstance();
        $this->logger = Logger::getInstance();
    }
    
    /**
     * Main entry point - route requests
     */
    public function handleRequest() {
        $action = $_GET['action'] ?? $_POST['action'] ?? 'index';
        $method = $_SERVER['REQUEST_METHOD'];
        
        try {
            switch ($action) {
                case 'create':
                    if ($method === 'GET') {
                        $this->showCreateForm();
                    } else {
                        $this->createAccumulator();
                    }
                    break;
                    
                case 'add_pick':
                    $this->addPickToAccumulator();
                    break;
                    
                case 'remove_pick':
                    $this->removePickFromAccumulator();
                    break;
                    
                case 'submit':
                    $this->submitAccumulator();
                    break;
                    
                case 'view':
                    $this->viewAccumulator();
                    break;
                    
                case 'my_accumulators':
                    $this->showUserAccumulators();
                    break;
                    
                case 'get_fixtures':
                    $this->getAvailableFixtures();
                    break;
                    
                case 'get_odds':
                    $this->getFixtureOdds();
                    break;
                    
                case 'verify_picks':
                    $this->verifyPicks();
                    break;
                    
                default:
                    $this->showCreateForm();
                    break;
            }
        } catch (Exception $e) {
            $this->logger->error("Accumulator controller error", [
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
     * Show accumulator creation form
     */
    private function showCreateForm() {
        if (!$this->isLoggedIn()) {
            header('Location: /login');
            exit;
        }
        
        $userId = $_SESSION['user_id'];
        
        // Get user's draft accumulators
        $draftAccumulators = $this->accumulatorTicket->getUserAccumulators($userId, 'draft');
        
        // Get available fixtures
        $fixtures = $this->getUpcomingFixtures();
        
        include __DIR__ . '/../views/pages/accumulator_create.php';
    }
    
    /**
     * Create new accumulator
     */
    private function createAccumulator() {
        if (!$this->isLoggedIn()) {
            $this->jsonResponse(['success' => false, 'error' => 'Not logged in']);
            return;
        }
        
        $userId = $_SESSION['user_id'];
        $title = $_POST['title'] ?? '';
        $description = $_POST['description'] ?? '';
        
        if (empty($title)) {
            $this->jsonResponse(['success' => false, 'error' => 'Title is required']);
            return;
        }
        
        $result = $this->accumulatorTicket->create($userId, $title, $description);
        
        if ($result['success']) {
            $this->jsonResponse([
                'success' => true,
                'accumulator_id' => $result['accumulator_id'],
                'message' => 'Accumulator created successfully'
            ]);
        } else {
            $this->jsonResponse(['success' => false, 'error' => $result['error']]);
        }
    }
    
    /**
     * Add pick to accumulator
     */
    private function addPickToAccumulator() {
        if (!$this->isLoggedIn()) {
            $this->jsonResponse(['success' => false, 'error' => 'Not logged in']);
            return;
        }
        
        $userId = $_SESSION['user_id'];
        $accumulatorId = $_POST['accumulator_id'] ?? null;
        $fixtureId = $_POST['fixture_id'] ?? null;
        $marketType = $_POST['market_type'] ?? null;
        $selection = $_POST['selection'] ?? null;
        $odds = $_POST['odds'] ?? null;
        $confidenceLevel = $_POST['confidence_level'] ?? 50;
        $reasoning = $_POST['reasoning'] ?? '';
        
        // Validate required fields
        if (!$accumulatorId || !$fixtureId || !$marketType || !$selection || !$odds) {
            $this->jsonResponse(['success' => false, 'error' => 'All fields are required']);
            return;
        }
        
        // Prepare pick data
        $pickData = [
            'user_id' => $userId,
            'fixture_id' => $fixtureId,
            'market_type' => $marketType,
            'selection' => $selection,
            'title' => $this->generatePickTitle($fixtureId, $marketType, $selection),
            'odds' => $odds,
            'status' => 'pending',
            'confidence_level' => $confidenceLevel,
            'reasoning' => $reasoning
        ];
        
        // Add pick to accumulator
        $result = $this->accumulatorTicket->addPick($accumulatorId, $pickData);
        
        if ($result['success']) {
            // Track performance
            $this->performanceService->trackPickCreation($userId, [
                'pick_id' => $result['pick_id'],
                'accumulator_id' => $accumulatorId,
                'market_type' => $marketType,
                'odds' => $odds
            ]);
            
            // Get updated accumulator data
            $accumulator = $this->accumulatorTicket->getById($accumulatorId);
            
            $this->jsonResponse([
                'success' => true,
                'pick_id' => $result['pick_id'],
                'accumulator' => $accumulator,
                'message' => 'Pick added successfully'
            ]);
        } else {
            $this->jsonResponse(['success' => false, 'error' => $result['error']]);
        }
    }
    
    /**
     * Remove pick from accumulator
     */
    private function removePickFromAccumulator() {
        if (!$this->isLoggedIn()) {
            $this->jsonResponse(['success' => false, 'error' => 'Not logged in']);
            return;
        }
        
        $accumulatorId = $_POST['accumulator_id'] ?? null;
        $pickId = $_POST['pick_id'] ?? null;
        
        if (!$accumulatorId || !$pickId) {
            $this->jsonResponse(['success' => false, 'error' => 'Invalid parameters']);
            return;
        }
        
        $result = $this->accumulatorTicket->removePick($accumulatorId, $pickId);
        
        if ($result['success']) {
            // Get updated accumulator data
            $accumulator = $this->accumulatorTicket->getById($accumulatorId);
            
            $this->jsonResponse([
                'success' => true,
                'accumulator' => $accumulator,
                'message' => 'Pick removed successfully'
            ]);
        } else {
            $this->jsonResponse(['success' => false, 'error' => $result['error']]);
        }
    }
    
    /**
     * Submit accumulator for verification
     */
    private function submitAccumulator() {
        if (!$this->isLoggedIn()) {
            $this->jsonResponse(['success' => false, 'error' => 'Not logged in']);
            return;
        }
        
        $userId = $_SESSION['user_id'];
        $accumulatorId = $_POST['accumulator_id'] ?? null;
        
        if (!$accumulatorId) {
            $this->jsonResponse(['success' => false, 'error' => 'Accumulator ID required']);
            return;
        }
        
        // Get accumulator with picks
        $accumulator = $this->accumulatorTicket->getById($accumulatorId);
        
        if (!$accumulator || $accumulator['user_id'] != $userId) {
            $this->jsonResponse(['success' => false, 'error' => 'Accumulator not found']);
            return;
        }
        
        if (empty($accumulator['picks'])) {
            $this->jsonResponse(['success' => false, 'error' => 'Cannot submit empty accumulator']);
            return;
        }
        
        // Verify picks for duplicates
        $verificationResult = $this->verificationService->checkUniqueness($accumulator['picks'], $accumulatorId);
        
        // Log verification attempt
        $this->verificationService->logVerification($userId, $accumulatorId, $verificationResult);
        
        // Handle verification result
        if ($verificationResult['status'] === 'blocked') {
            $this->jsonResponse([
                'success' => false,
                'error' => 'This accumulator contains duplicate picks',
                'verification' => $verificationResult
            ]);
            return;
        }
        
        // Store fingerprint
        $this->verificationService->storeFingerprint($accumulatorId, $accumulator['picks']);
        
        // Update accumulator status to active
        $updateResult = $this->accumulatorTicket->updateStatus($accumulatorId, 'active', $userId);
        
        if ($updateResult['success']) {
            $this->jsonResponse([
                'success' => true,
                'message' => 'Accumulator submitted successfully',
                'verification' => $verificationResult
            ]);
        } else {
            $this->jsonResponse(['success' => false, 'error' => 'Failed to submit accumulator']);
        }
    }
    
    /**
     * View accumulator details
     */
    private function viewAccumulator() {
        if (!$this->isLoggedIn()) {
            header('Location: /login');
            exit;
        }
        
        $accumulatorId = $_GET['id'] ?? null;
        
        if (!$accumulatorId) {
            $this->showError('Accumulator ID required');
            return;
        }
        
        $accumulator = $this->accumulatorTicket->getById($accumulatorId);
        
        if (!$accumulator) {
            $this->showError('Accumulator not found');
            return;
        }
        
        include __DIR__ . '/../views/pages/accumulator_view.php';
    }
    
    /**
     * Show user's accumulators
     */
    private function showUserAccumulators() {
        if (!$this->isLoggedIn()) {
            header('Location: /login');
            exit;
        }
        
        $userId = $_SESSION['user_id'];
        $status = $_GET['status'] ?? null;
        
        $accumulators = $this->accumulatorTicket->getUserAccumulators($userId, $status);
        $stats = $this->accumulatorTicket->getStatistics($userId);
        
        include __DIR__ . '/../views/pages/my_accumulators.php';
    }
    
    /**
     * Get available fixtures (AJAX)
     */
    private function getAvailableFixtures() {
        $fixtures = $this->getUpcomingFixtures();
        
        $this->jsonResponse([
            'success' => true,
            'fixtures' => $fixtures
        ]);
    }
    
    /**
     * Get odds for specific fixture (AJAX)
     */
    private function getFixtureOdds() {
        $fixtureId = $_GET['fixture_id'] ?? null;
        
        if (!$fixtureId) {
            $this->jsonResponse(['success' => false, 'error' => 'Fixture ID required']);
            return;
        }
        
        $odds = $this->getFixtureOddsData($fixtureId);
        
        $this->jsonResponse([
            'success' => true,
            'odds' => $odds
        ]);
    }
    
    /**
     * Verify picks (AJAX)
     */
    private function verifyPicks() {
        if (!$this->isLoggedIn()) {
            $this->jsonResponse(['success' => false, 'error' => 'Not logged in']);
            return;
        }
        
        $picks = json_decode($_POST['picks'] ?? '[]', true);
        $excludeId = $_POST['exclude_id'] ?? null;
        
        if (empty($picks)) {
            $this->jsonResponse(['success' => false, 'error' => 'No picks to verify']);
            return;
        }
        
        $verificationResult = $this->verificationService->checkUniqueness($picks, $excludeId);
        
        $this->jsonResponse([
            'success' => true,
            'verification' => $verificationResult
        ]);
    }
    
    /**
     * Helper: Get upcoming fixtures
     */
    private function getUpcomingFixtures() {
        try {
            return $this->db->fetchAll("
                SELECT 
                    f.*,
                    l.name as league_name,
                    l.country
                FROM fixtures f
                JOIN leagues l ON f.league_id = l.id
                WHERE f.match_date > NOW() 
                AND f.match_date <= DATE_ADD(NOW(), INTERVAL 14 DAY)
                AND f.status = 'NS'
                ORDER BY f.match_date ASC
                LIMIT 50
            ");
        } catch (Exception $e) {
            $this->logger->error("Error getting upcoming fixtures", ['error' => $e->getMessage()]);
            return [];
        }
    }
    
    /**
     * Helper: Get fixture odds
     */
    private function getFixtureOddsData($fixtureId) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    o.*,
                    o.market_type,
                    o.selection,
                    o.odds_value as odds
                FROM odds o
                WHERE o.fixture_id = ?
                ORDER BY o.market_type, o.selection
            ", [$fixtureId]);
        } catch (Exception $e) {
            $this->logger->error("Error getting fixture odds", [
                'fixture_id' => $fixtureId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Helper: Generate pick title
     */
    private function generatePickTitle($fixtureId, $marketType, $selection) {
        try {
            $fixture = $this->db->fetch("
                SELECT home_team, away_team FROM fixtures WHERE id = ?
            ", [$fixtureId]);
            
            if ($fixture) {
                return "{$fixture['home_team']} vs {$fixture['away_team']} - {$marketType} - {$selection}";
            }
            
            return "Pick - {$marketType} - {$selection}";
        } catch (Exception $e) {
            return "Pick - {$marketType} - {$selection}";
        }
    }
    
    /**
     * Helper: Check if user is logged in
     */
    private function isLoggedIn() {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
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
$controller = new AccumulatorController();
$controller->handleRequest();
?>
