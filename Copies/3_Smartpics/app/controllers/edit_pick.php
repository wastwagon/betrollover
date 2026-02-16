<?php
/**
 * Edit Pick - Admin can edit pick details
 */

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    // Detect base URL dynamically
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
    $baseUrl = '';
    if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
        $baseUrl = '/SmartPicksPro-Local';
    }
    header('Location: ' . $baseUrl . '/login');
    exit;
}

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

$db = Database::getInstance();

// Get pick ID from query parameter
$pickId = $_GET['id'] ?? null;

if (!$pickId) {
    header('Location: ' . $baseUrl . '/admin_approve_pick');
    exit;
}

// Get pick details
$pick = $db->fetch("
    SELECT 
        at.id,
        at.title,
        at.description,
        at.sport,
        at.price,
        at.confidence_level,
        at.status,
        at.created_at,
        u.username,
        u.display_name
    FROM accumulator_tickets at
    JOIN users u ON at.user_id = u.id
    WHERE at.id = ?
", [$pickId]);

if (!$pick) {
    header('Location: ' . $baseUrl . '/admin_approve_pick');
    exit;
}

// Get individual picks
$individualPicks = $db->fetchAll("
    SELECT 
        ap.id,
        ap.match_description,
        ap.prediction,
        ap.odds,
        ap.match_date,
        ap.match_time
    FROM accumulator_picks ap
    WHERE ap.accumulator_id = ?
    ORDER BY ap.id
", [$pickId]);

$error = '';
$success = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $sport = trim($_POST['sport'] ?? '');
    $price = floatval($_POST['price'] ?? 0);
    $confidence_level = intval($_POST['confidence_level'] ?? 75);
    
    if ($title && $description && $sport) {
        try {
            $db->query("
                UPDATE accumulator_tickets 
                SET title = ?, description = ?, sport = ?, price = ?, confidence_level = ?, updated_at = NOW()
                WHERE id = ?
            ", [$title, $description, $sport, $price, $confidence_level, $pickId]);
            
            $success = "Pick updated successfully!";
            
            // Refresh pick data
            $pick = $db->fetch("
                SELECT 
                    at.id,
                    at.title,
                    at.description,
                    at.sport,
                    at.price,
                    at.confidence_level,
                    at.status,
                    at.created_at,
                    u.username,
                    u.display_name
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                WHERE at.id = ?
            ", [$pickId]);
            
        } catch (Exception $e) {
            $error = "Error updating pick: " . $e->getMessage();
        }
    } else {
        $error = "Please fill in all required fields.";
    }
}

// Set page variables
$pageTitle = "Edit Pick";
$pageSubtitle = "Edit pick details";

// Start content buffer
ob_start();
?>

<div class="edit-pick-content">
    <?php if ($success): ?>
        <div class="alert alert-success" style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
            <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
        </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
        <div class="alert alert-danger" style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #f5c6cb;">
            <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
        </div>
    <?php endif; ?>

    <div class="card">
        <h2><i class="fas fa-edit"></i> Edit Pick</h2>
        <p style="color: #666; margin-top: 10px;">Edit pick details before approval.</p>
        
        <form method="POST" style="margin-top: 20px;">
            <div class="form-group">
                <label for="title">Pick Title:</label>
                <input type="text" name="title" id="title" class="form-control" required 
                       value="<?php echo htmlspecialchars($pick['title']); ?>">
            </div>
            
            <div class="form-group">
                <label for="description">Description:</label>
                <textarea name="description" id="description" class="form-control" required rows="4"><?php echo htmlspecialchars($pick['description']); ?></textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label for="sport">Sport:</label>
                    <select name="sport" id="sport" class="form-control" required>
                        <option value="">Select Sport</option>
                        <option value="Football" <?php echo $pick['sport'] === 'Football' ? 'selected' : ''; ?>>Football</option>
                        <option value="Basketball" <?php echo $pick['sport'] === 'Basketball' ? 'selected' : ''; ?>>Basketball</option>
                        <option value="Tennis" <?php echo $pick['sport'] === 'Tennis' ? 'selected' : ''; ?>>Tennis</option>
                        <option value="Baseball" <?php echo $pick['sport'] === 'Baseball' ? 'selected' : ''; ?>>Baseball</option>
                        <option value="Hockey" <?php echo $pick['sport'] === 'Hockey' ? 'selected' : ''; ?>>Hockey</option>
                        <option value="Soccer" <?php echo $pick['sport'] === 'Soccer' ? 'selected' : ''; ?>>Soccer</option>
                        <option value="Cricket" <?php echo $pick['sport'] === 'Cricket' ? 'selected' : ''; ?>>Cricket</option>
                        <option value="Rugby" <?php echo $pick['sport'] === 'Rugby' ? 'selected' : ''; ?>>Rugby</option>
                        <option value="Boxing" <?php echo $pick['sport'] === 'Boxing' ? 'selected' : ''; ?>>Boxing</option>
                        <option value="MMA" <?php echo $pick['sport'] === 'MMA' ? 'selected' : ''; ?>>MMA</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="price">Price (GHS):</label>
                    <input type="number" name="price" id="price" class="form-control" min="0" step="0.01" required 
                           value="<?php echo $pick['price']; ?>">
                </div>
                
                <div class="form-group">
                    <label for="confidence_level">Confidence (%):</label>
                    <input type="number" name="confidence_level" id="confidence_level" class="form-control" min="1" max="100" required 
                           value="<?php echo $pick['confidence_level']; ?>">
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px;">
                <a href="<?php echo $baseUrl; ?>/admin_approve_pick" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Back to Approvals
                </a>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Update Pick
                </button>
            </div>
        </form>
    </div>

    <!-- Individual Picks Display -->
    <?php if (!empty($individualPicks)): ?>
    <div class="card">
        <h3><i class="fas fa-list"></i> Individual Picks</h3>
        <div style="margin-top: 15px;">
            <?php foreach ($individualPicks as $index => $individualPick): ?>
            <div style="border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 10px; border-radius: 5px; background: #f8f9fa;">
                <h5 style="color: #d32f2f; margin-bottom: 10px;">Pick <?php echo $index + 1; ?></h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Match:</strong><br>
                        <span style="color: #666;"><?php echo htmlspecialchars($individualPick['match_description']); ?></span>
                    </div>
                    <div>
                        <strong>Prediction:</strong><br>
                        <span style="color: #2e7d32; font-weight: 500;"><?php echo htmlspecialchars($individualPick['prediction']); ?></span>
                    </div>
                    <div>
                        <strong>Odds:</strong><br>
                        <span style="color: #666;"><?php echo $individualPick['odds']; ?></span>
                    </div>
                    <div>
                        <strong>Date/Time:</strong><br>
                        <span style="color: #666;"><?php echo $individualPick['match_date'] . ' ' . $individualPick['match_time']; ?></span>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- Pick Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Pick Information</h3>
        <div style="margin-top: 15px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <strong>Pick ID:</strong><br>
                    <span style="color: #666;"><?php echo $pick['id']; ?></span>
                </div>
                <div>
                    <strong>Tipster:</strong><br>
                    <span style="color: #666;"><?php echo htmlspecialchars($pick['display_name'] ?: $pick['username']); ?></span>
                </div>
                <div>
                    <strong>Status:</strong><br>
                    <span style="color: #ffc107; font-weight: bold;"><?php echo strtoupper($pick['status']); ?></span>
                </div>
                <div>
                    <strong>Created:</strong><br>
                    <span style="color: #666;"><?php echo $pick['created_at']; ?></span>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #333;
}

.form-control {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.3s ease;
}

.form-control:focus {
    outline: none;
    border-color: #d32f2f;
    box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.btn-primary {
    background: #d32f2f;
    color: white;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

.card {
    background: white;
    border-radius: 12px;
    padding: 25px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    border: 1px solid #e0e0e0;
    margin-bottom: 20px;
}

.card h2, .card h3 {
    color: #d32f2f;
    margin-bottom: 10px;
}

.alert {
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    border-left: 4px solid;
}

.alert-success {
    background-color: #d4edda;
    color: #155724;
    border-left-color: #28a745;
}

.alert-danger {
    background-color: #f8d7da;
    color: #721c24;
    border-left-color: #dc3545;
}
</style>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

