<?php
/**
 * SmartPicks Pro - Enhanced Pick Management
 * Integrates with imported matches and filters ended matches
 */

// Session is already started in index.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../models/TipsterQualificationService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::checkAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();
$wallet = Wallet::getInstance();
$qualificationService = TipsterQualificationService::getInstance();

$error = '';
$success = '';
$picks = [];
$availableMatches = [];
$leagues = [];
$teams = [];
$userStats = [];

try {
    // Get user's wallet balance
    $walletBalance = $wallet->getBalance($_SESSION['user_id']);
    
    // Get user's pick statistics
    $userStats = $db->fetch("
        SELECT 
            COUNT(*) as total_picks,
            SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_picks,
            SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_picks,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_picks,
            SUM(views) as total_views,
            SUM(likes) as total_likes,
            ROUND(AVG(CASE WHEN status = 'won' THEN 1 WHEN status = 'lost' THEN 0 END) * 100, 2) as win_rate
        FROM picks 
        WHERE user_id = ?
    ", [$_SESSION['user_id']]);

    // Get user's picks with match information
    $picks = $db->fetchAll("
        SELECT p.*, 
               fm.home_team_id,
               fm.away_team_id,
               fm.match_date,
               fm.status as match_status,
               fm.home_score,
               fm.away_score,
               ht.name as home_team_name,
               at.name as away_team_name,
               fl.name as league_name,
               fl.country as league_country,
               COUNT(ps.id) as selections_count
        FROM picks p 
        LEFT JOIN football_matches fm ON p.match_id = fm.id
        LEFT JOIN football_teams ht ON fm.home_team_id = ht.id
        LEFT JOIN football_teams at ON fm.away_team_id = at.id
        LEFT JOIN football_leagues fl ON fm.league_id = fl.id
        LEFT JOIN pick_selections ps ON p.id = ps.pick_id 
        WHERE p.tipster_id = ? 
        GROUP BY p.id 
        ORDER BY p.created_at DESC
    ", [$_SESSION['user_id']]);

    // Get available upcoming matches (not ended)
    $availableMatches = $db->fetchAll("
        SELECT fm.*,
               ht.name as home_team_name,
               ht.logo as home_team_logo,
               at.name as away_team_name,
               at.logo as away_team_logo,
               fl.name as league_name,
               fl.logo as league_logo,
               fl.country as league_country
        FROM football_matches fm
        JOIN football_teams ht ON fm.home_team_id = ht.id
        JOIN football_teams at ON fm.away_team_id = at.id
        JOIN football_leagues fl ON fm.league_id = fl.id
        WHERE fm.match_date >= CURDATE()
        AND fm.status IN ('scheduled', 'live')
        ORDER BY fm.match_date ASC
        LIMIT 50
    ");

    // Get major leagues for filtering (smart sync focused)
    $leagues = $db->fetchAll("
        SELECT DISTINCT fl.*, COUNT(fm.id) as match_count
        FROM football_leagues fl
        JOIN football_matches fm ON fl.id = fm.league_id
        WHERE fl.id IN (39, 140, 78, 135, 61, 2, 3, 848, 203, 88, 94, 564, 169, 45, 48, 81)
        AND fm.match_date >= CURDATE()
        AND fm.status IN ('scheduled', 'live')
        GROUP BY fl.id
        ORDER BY fl.country, fl.name
    ");

    // Handle form submissions
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
        switch ($action) {
            case 'create_pick':
                $title = trim($_POST['title'] ?? '');
                $description = trim($_POST['description'] ?? '');
                $price = (float)($_POST['price'] ?? 0);
                $matchId = (int)($_POST['match_id'] ?? 0);
                $selections = $_POST['selections'] ?? [];
                $distributionType = $_POST['distribution_type'] ?? 'both';
                
                // Validation
                if (empty($title) || empty($description) || $matchId <= 0 || empty($selections)) {
                    throw new Exception('All fields are required');
                }
                
                if ($price < 0 || $price > 1000) {
                    throw new Exception('Price must be between 0 and 1000');
                }
                
                // Check tipster qualification for marketplace picks (price > 0)
                if ($price > 0) {
                    $qualificationStatus = $qualificationService->getTipsterQualificationStatus($_SESSION['user_id']);
                    
                    if (!$qualificationStatus['can_sell']) {
                        $errorMessage = "You are not qualified to sell picks yet. " . $qualificationStatus['message'];
                        
                        // Add specific requirements if available
                        if (isset($qualificationStatus['deficits'])) {
                            $deficits = $qualificationStatus['deficits'];
                            if ($deficits['free_picks_needed'] > 0) {
                                $errorMessage .= " You need " . $deficits['free_picks_needed'] . " more free picks.";
                            }
                            if ($deficits['roi_needed'] > 0) {
                                $errorMessage .= " You need " . $deficits['roi_needed'] . "% more ROI.";
                            }
                        }
                        
                        throw new Exception($errorMessage);
                    }
                }
                
                // Verify match exists and is upcoming
                $match = $db->fetch("
                    SELECT fm.*, ht.name as home_team, at.name as away_team
                    FROM football_matches fm
                    JOIN football_teams ht ON fm.home_team_id = ht.id
                    JOIN football_teams at ON fm.away_team_id = at.id
                    WHERE fm.id = ? AND fm.match_date > NOW()
                ", [$matchId]);
                
                if (!$match) {
                    throw new Exception('Selected match is not available or has already ended');
                }
                
                // Create pick (using new accumulator_tickets table)
                $pickId = $db->insert('accumulator_tickets', [
                    'tipster_id' => $_SESSION['user_id'],
                    'title' => $title,
                    'description' => $description,
                    'price' => $price,
                    'match_id' => $matchId,
                    'status' => 'pending',
                    'distribution_type' => $distributionType,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                
                // Add selections
                foreach ($selections as $selection) {
                    if (!empty($selection['market']) && !empty($selection['selection'])) {
                        $db->insert('pick_selections', [
                            'pick_id' => $pickId,
                            'team' => $selection['team'] ?? '',
                            'market' => $selection['market'],
                            'selection' => $selection['selection'],
                            'odds' => (float)($selection['odds'] ?? 0)
                        ]);
                    }
                }
                
                $success = 'Pick created successfully! It will be reviewed before going live.';
                $logger->info("Pick created", ['pick_id' => $pickId, 'user_id' => $_SESSION['user_id']]);
                break;
                
            case 'delete_pick':
                $pickId = (int)($_POST['pick_id'] ?? 0);
                if ($pickId > 0) {
                    $pick = $db->fetch("SELECT * FROM picks WHERE id = ? AND tipster_id = ?", [$pickId, $_SESSION['user_id']]);
                    if ($pick && $pick['status'] === 'pending') {
                        $db->query("DELETE FROM pick_selections WHERE pick_id = ?", [$pickId]);
                        $db->query("DELETE FROM picks WHERE id = ?", [$pickId]);
                        $success = 'Pick deleted successfully.';
                    } else {
                        $error = 'Cannot delete this pick.';
                    }
                }
                break;
        }
        
        // Refresh data after form submission
        if ($action === 'create_pick' || $action === 'delete_pick') {
            $picks = $db->fetchAll("
                SELECT p.*, 
                       fm.home_team_id,
                       fm.away_team_id,
                       fm.match_date,
                       fm.status as match_status,
                       fm.home_score,
                       fm.away_score,
                       ht.name as home_team_name,
                       at.name as away_team_name,
                       fl.name as league_name,
                       fl.country as league_country,
                       COUNT(ps.id) as selections_count
                FROM picks p 
                LEFT JOIN football_matches fm ON p.match_id = fm.id
                LEFT JOIN football_teams ht ON fm.home_team_id = ht.id
                LEFT JOIN football_teams at ON fm.away_team_id = at.id
                LEFT JOIN football_leagues fl ON fm.league_id = fl.id
                LEFT JOIN pick_selections ps ON p.id = ps.pick_id 
                WHERE p.tipster_id = ? 
                GROUP BY p.id 
                ORDER BY p.created_at DESC
            ", [$_SESSION['user_id']]);
        }
        
        if ($action === 'sync_matches') {
            $availableMatches = $db->fetchAll("
                SELECT fm.*,
                       ht.name as home_team_name,
                       ht.logo as home_team_logo,
                       at.name as away_team_name,
                       at.logo as away_team_logo,
                       fl.name as league_name,
                       fl.logo as league_logo,
                       fl.country as league_country
                FROM football_matches fm
                JOIN football_teams ht ON fm.home_team_id = ht.id
                JOIN football_teams at ON fm.away_team_id = at.id
                JOIN football_leagues fl ON fm.league_id = fl.id
                WHERE fm.match_date > NOW()
                AND fm.status IN ('scheduled', 'live')
                ORDER BY fm.match_date ASC
                LIMIT 50
            ");
        }
    }

} catch (Exception $e) {
    $error = $e->getMessage();
    $logger->error("Pick management error", ['error' => $e->getMessage(), 'user_id' => $_SESSION['user_id']]);
}

// Prepare data for view
$pageTitle = 'Pick Management - SmartPicks Pro';
$header = [
    'title' => 'Pick Management',
    'subtitle' => 'Create and manage your football predictions'
];

$navigation = [
    ['label' => 'Dashboard', 'url' => '/dashboard', 'icon' => 'fas fa-tachometer-alt'],
    ['label' => 'My Picks', 'url' => '/pick-management', 'icon' => 'fas fa-chart-line', 'active' => true],
    ['label' => 'Marketplace', 'url' => '/pick-marketplace', 'icon' => 'fas fa-store'],
    ['label' => 'Wallet', 'url' => '/wallet', 'icon' => 'fas fa-wallet'],
    ['label' => 'Profile', 'url' => '/profile', 'icon' => 'fas fa-user']
];

$alerts = [];
if ($error) {
    $alerts[] = ['type' => 'error', 'message' => $error];
}
if ($success) {
    $alerts[] = ['type' => 'success', 'message' => $success];
}

// Render the view
ob_start();
?>

<div class="grid grid-2">
    <!-- User Stats -->
    <div class="card">
        <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-bar"></i> Your Performance</h3>
        </div>
        <div class="grid grid-4">
            <div class="text-center">
                <h4 class="text-primary"><?= $userStats['total_picks'] ?? 0 ?></h4>
                <small class="text-muted">Total Picks</small>
            </div>
            <div class="text-center">
                <h4 class="text-success"><?= $userStats['won_picks'] ?? 0 ?></h4>
                <small class="text-muted">Won</small>
            </div>
            <div class="text-center">
                <h4 class="text-danger"><?= $userStats['lost_picks'] ?? 0 ?></h4>
                <small class="text-muted">Lost</small>
            </div>
            <div class="text-center">
                <h4 class="text-info"><?= $userStats['win_rate'] ?? 0 ?>%</h4>
                <small class="text-muted">Win Rate</small>
            </div>
        </div>
        <div class="mt-3">
            <div class="text-center">
                <h5 class="text-success">₵<?= number_format($walletBalance['balance'] ?? 0, 2) ?></h5>
                <small class="text-muted">Wallet Balance</small>
            </div>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="card">
        <div class="card-header">
            <h3 class="card-title"><i class="fas fa-bolt"></i> Quick Actions</h3>
        </div>
        <div class="grid grid-3">
            <a href="/create_pick" class="btn btn-primary">
                <i class="fas fa-plus"></i> Create New Pick
            </a>
            <a href="/pick_marketplace" class="btn btn-outline-primary">
                <i class="fas fa-store"></i> Browse Marketplace
            </a>
            <a href="/my_purchases" class="btn btn-outline-success">
                <i class="fas fa-shopping-bag"></i> My Purchases
            </a>
        </div>
        <div class="mt-3">
            <p class="text-muted">
                <i class="fas fa-info-circle"></i> 
                Available matches: <strong><?= count($availableMatches) ?></strong>
            </p>
        </div>
    </div>
</div>

<!-- Available Matches -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title"><i class="fas fa-futbol"></i> Available Matches</h3>
    </div>
    <div class="grid grid-3">
        <?php if (empty($availableMatches)): ?>
            <div class="text-center p-4">
                <i class="fas fa-futbol fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No upcoming matches available</h5>
                <p class="text-muted">Contact admin to sync matches for picks</p>
            </div>
        <?php else: ?>
            <?php foreach ($availableMatches as $match): ?>
                <div class="card" style="margin-bottom: 15px;">
                    <div class="text-center">
                        <div class="mb-2">
                            <img src="<?= htmlspecialchars($match['league_logo'] ?? '') ?>" 
                                 alt="<?= htmlspecialchars($match['league_name']) ?>" 
                                 style="width: 30px; height: 30px; object-fit: contain;">
                            <span class="text-muted"><?= htmlspecialchars($match['league_name']) ?></span>
                        </div>
                        <div class="mb-2">
                            <strong><?= htmlspecialchars($match['home_team_name']) ?></strong>
                            <span class="text-muted"> vs </span>
                            <strong><?= htmlspecialchars($match['away_team_name']) ?></strong>
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="fas fa-calendar"></i> 
                                <?= date('M j, Y', strtotime($match['match_date'])) ?>
                                <i class="fas fa-clock"></i> 
                                <?= date('H:i', strtotime($match['match_date'])) ?>
                            </small>
                        </div>
                        <a href="/create_pick?match_id=<?= $match['id'] ?>" class="btn btn-sm btn-primary">
                            <i class="fas fa-plus"></i> Create Pick
                        </a>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<!-- My Picks -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title"><i class="fas fa-list"></i> My Picks</h3>
    </div>
    <?php if (empty($picks)): ?>
        <div class="text-center p-4">
            <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">No picks created yet</h5>
            <p class="text-muted">Create your first pick to start earning</p>
            <button class="btn btn-primary" onclick="showCreatePickModal()">
                <i class="fas fa-plus"></i> Create Your First Pick
            </button>
        </div>
    <?php else: ?>
        <div class="grid grid-2">
            <?php foreach ($picks as $pick): ?>
                <div class="card" style="margin-bottom: 15px;">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><?= htmlspecialchars($pick['title']) ?></h5>
                            <span class="badge badge-<?= $pick['status'] === 'approved' ? 'success' : ($pick['status'] === 'pending' ? 'warning' : 'secondary') ?>">
                                <?= ucfirst($pick['status']) ?>
                            </span>
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <p class="text-muted"><?= htmlspecialchars(substr($pick['description'], 0, 100)) ?>...</p>
                    </div>
                    
                    <?php if ($pick['home_team_name'] && $pick['away_team_name']): ?>
                        <div class="mb-2">
                            <strong><?= htmlspecialchars($pick['home_team_name']) ?></strong>
                            <span class="text-muted"> vs </span>
                            <strong><?= htmlspecialchars($pick['away_team_name']) ?></strong>
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="fas fa-calendar"></i> 
                                <?= date('M j, Y H:i', strtotime($pick['match_date'])) ?>
                            </small>
                        </div>
                    <?php endif; ?>
                    
                    <div class="grid grid-3">
                        <div class="text-center">
                            <h6 class="text-primary">₵<?= number_format($pick['price'], 2) ?></h6>
                            <small class="text-muted">Price</small>
                        </div>
                        <div class="text-center">
                            <h6 class="text-info"><?= $pick['selections_count'] ?></h6>
                            <small class="text-muted">Selections</small>
                        </div>
                        <div class="text-center">
                            <h6 class="text-success"><?= $pick['purchases'] ?? 0 ?></h6>
                            <small class="text-muted">Purchases</small>
                        </div>
                    </div>
                    
                    <?php if ($pick['status'] === 'pending'): ?>
                        <div class="mt-3">
                            <form method="POST" style="display: inline;">
                                <input type="hidden" name="action" value="delete_pick">
                                <input type="hidden" name="pick_id" value="<?= $pick['id'] ?>">
                                <button type="submit" class="btn btn-sm btn-danger" 
                                        onclick="return confirm('Are you sure you want to delete this pick?')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </form>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<style>
.modal {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 0;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 20px;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
}

.close {
    font-size: 24px;
    cursor: pointer;
    opacity: 0.8;
}

.close:hover {
    opacity: 1;
}

.selection-item {
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    background: #f8f9fa;
}

.badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
}

.badge-success { background: #4caf50; color: white; }
.badge-warning { background: #ff9800; color: white; }
.badge-secondary { background: #6c757d; color: white; }
</style>

<script>
let selectionCount = 1;

function addSelection() {
    const container = document.getElementById('selectionsContainer');
    const newSelection = document.createElement('div');
    newSelection.className = 'selection-item';
    newSelection.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Team</label>
                <select name="selections[${selectionCount}][team]">
                    <option value="">Select Team</option>
                    <option value="home">Home Team</option>
                    <option value="away">Away Team</option>
                    <option value="draw">Draw</option>
                </select>
            </div>
            <div class="form-group">
                <label>Market</label>
                <select name="selections[${selectionCount}][market]">
                    <option value="">Select Market</option>
                    <option value="match_winner">Match Winner</option>
                    <option value="over_under">Over/Under</option>
                    <option value="both_teams_score">Both Teams Score</option>
                    <option value="correct_score">Correct Score</option>
                </select>
            </div>
            <div class="form-group">
                <label>Selection</label>
                <input type="text" name="selections[${selectionCount}][selection]" 
                       placeholder="e.g., Over 2.5, Yes, 2-1">
            </div>
            <div class="form-group">
                <label>Odds</label>
                <input type="number" name="selections[${selectionCount}][odds]" step="0.01" 
                       placeholder="1.85">
            </div>
            <div class="form-group">
                <label>&nbsp;</label>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeSelection(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(newSelection);
    selectionCount++;
}

function removeSelection(button) {
    button.closest('.selection-item').remove();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('createPickModal');
    if (event.target === modal) {
        hideCreatePickModal();
    }
}
</script>

<?php
$content = ob_get_clean();

// Include the base layout
require_once __DIR__ . '/../views/layouts/base.php';
?>