<?php
/**
 * Create Pick - Comprehensive Version
 * Based on the original self-contained file structure
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    // Set session cookie parameters BEFORE starting session
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
    $cookiePath = $isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false ? '/SmartPicksPro-Local/' : '/';
    $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    
    session_set_cookie_params([
        'path' => $cookiePath,
        'httponly' => true,
        'secure' => $isSecure,
        'samesite' => 'Lax'
    ]);
    
    session_start();
}

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/TipsterQualificationService.php';

// Check authentication
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
AuthMiddleware::requireAuth();

// Ensure user is a tipster
if ($_SESSION['role'] !== 'tipster') {
    // Detect base URL
    $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
    $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
    $baseUrl = '';
    if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
        $baseUrl = '/SmartPicksPro-Local';
    }
    header('Location: ' . $baseUrl . '/user_dashboard');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$qualificationService = TipsterQualificationService::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'];

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

$error = '';
$success = '';

// Check for success message from session (after redirect back)
if (isset($_SESSION['pick_creation_success'])) {
    $success = $_SESSION['pick_creation_success'];
    unset($_SESSION['pick_creation_success']);
}

// Also check for success in URL parameter
if (isset($_GET['success']) && $_GET['success'] == '1' && empty($success)) {
    $success = "Pick created successfully! It will be reviewed by admin before going live.";
}
$sports = ['Football', 'Basketball', 'Tennis', 'Baseball', 'Hockey', 'Soccer', 'Cricket', 'Rugby', 'Boxing', 'MMA'];

// Get countries and teams data
$countries = [];
$teams = [];
$nationalTeams = [];

try {
    $countries = $db->fetchAll("SELECT * FROM countries ORDER BY name");
    $teams = $db->fetchAll("
        SELECT t.*, c.name as country_name 
        FROM teams t 
        LEFT JOIN countries c ON t.country_id = c.id 
        ORDER BY c.name, t.name
    ");
    // Get national teams sorted by FIFA ranking
    $nationalTeams = $db->fetchAll("
        SELECT * FROM national_teams 
        WHERE is_active = 1 
        ORDER BY fifa_ranking ASC, team_name ASC
    ");
} catch (Exception $e) {
    $logger->error('Failed to load countries/teams data', ['error' => $e->getMessage()]);
}

// Handle pick creation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_pick') {
    // Enable error reporting for debugging
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $sport = $_POST['sport'] ?? '';
    $price = floatval($_POST['price'] ?? 0);
    $confidence_level = intval($_POST['confidence_level'] ?? 50);
    $picks = $_POST['picks'] ?? [];
    
    // Debug logging
    $logger->info('Form submitted', [
        'title' => $title,
        'sport' => $sport,
        'picks_count' => count($picks),
        'post_data' => array_keys($_POST)
    ]);
    
    if ($title && $description && $sport && $confidence_level >= 1 && $confidence_level <= 100 && !empty($picks)) {
        try {
            $db->beginTransaction();
            
            // Calculate total odds from all picks BEFORE inserting
            $totalOdds = 1.0;
            $validPicks = [];
            $pickCount = 0;
            
            foreach ($picks as $pickData) {
                $matchType = $pickData['match_type'] ?? 'league';
                $isValid = false;
                
                // Validate based on match type
                if ($matchType === 'international') {
                    // International match: require national team names
                    if (!empty($pickData['home_national_team']) && !empty($pickData['away_national_team']) && 
                        !empty($pickData['prediction']) && !empty($pickData['odds']) && 
                        is_numeric($pickData['odds']) && floatval($pickData['odds']) > 0) {
                        $isValid = true;
                    }
                } else {
                    // League match: require team IDs
                    if (!empty($pickData['home_team_id']) && !empty($pickData['away_team_id']) && 
                        !empty($pickData['prediction']) && !empty($pickData['odds']) && 
                        is_numeric($pickData['odds']) && floatval($pickData['odds']) > 0) {
                        $isValid = true;
                    }
                }
                
                if ($isValid) {
                    $odds = floatval($pickData['odds']);
                    $totalOdds *= $odds;
                    $validPicks[] = $pickData;
                    $pickCount++;
                }
            }
            
            // Ensure we have valid picks and valid odds
            if ($pickCount === 0 || $totalOdds <= 1.0) {
                throw new Exception('Please add at least one valid pick with odds greater than 1.0');
            }
            
            // Determine first pick details for accumulator_tickets (for display purposes)
            // Use first league match if available, otherwise use first pick
            $firstPick = null;
            foreach ($validPicks as $pick) {
                if (($pick['match_type'] ?? 'league') === 'league' && !empty($pick['home_team_id'])) {
                    $firstPick = $pick;
                    break;
                }
            }
            if (!$firstPick) {
                $firstPick = $validPicks[0] ?? [];
            }
            
            // Extract country/team IDs, ensuring they're integers or null (not empty strings)
            $homeCountryId = !empty($firstPick['home_country_id']) ? intval($firstPick['home_country_id']) : null;
            $homeTeamId = !empty($firstPick['home_team_id']) ? intval($firstPick['home_team_id']) : null;
            $awayCountryId = !empty($firstPick['away_country_id']) ? intval($firstPick['away_country_id']) : null;
            $awayTeamId = !empty($firstPick['away_team_id']) ? intval($firstPick['away_team_id']) : null;
            
            // Create accumulator ticket with calculated total odds
            $result = $db->query("
                INSERT INTO accumulator_tickets (
                    user_id, title, description, sport, total_odds, total_picks, price, confidence_level,
                    home_country_id, home_team_id, away_country_id, away_team_id,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', NOW(), NOW())
            ", [
                $userId, $title, $description, $sport, $totalOdds, $pickCount, $price, $confidence_level,
                $homeCountryId,
                $homeTeamId,
                $awayCountryId,
                $awayTeamId
            ]);
            
            if ($result) {
                $ticketId = $db->lastInsertId();
                
                // Add individual picks
                foreach ($validPicks as $pickData) {
                    $matchType = $pickData['match_type'] ?? 'league';
                    
                    // Validate and format match date/time
                    $matchDate = $pickData['match_date'] ?? '';
                    $matchTime = $pickData['match_time'] ?? '00:00:00';
                    
                    // Validate that match date is not in the past
                    if (!empty($matchDate)) {
                        $matchDateObj = new DateTime($matchDate);
                        $today = new DateTime();
                        $today->setTime(0, 0, 0); // Set to start of day for comparison
                        
                        if ($matchDateObj < $today) {
                            throw new Exception("Match date cannot be in the past. Please select today's date or a future date.");
                        }
                    }
                    
                    // Ensure match_time is in correct format (HH:MM:SS)
                    if (!empty($matchTime) && strlen($matchTime) == 5) {
                        $matchTime = $matchTime . ':00'; // Add seconds if missing
                    }
                    
                    // Combine date and time
                    $matchDateTime = null;
                    if (!empty($matchDate)) {
                        $matchDateTime = $matchDate . ' ' . $matchTime;
                    }
                    
                    // Determine team names and types based on match type
                    if ($matchType === 'international') {
                        $homeTeam = $pickData['home_national_team'] ?? '';
                        $awayTeam = $pickData['away_national_team'] ?? '';
                        $homeTeamType = 'national';
                        $awayTeamType = 'national';
                    } else {
                        $homeTeam = $pickData['home_team_name'] ?? '';
                        $awayTeam = $pickData['away_team_name'] ?? '';
                        $homeTeamType = 'club';
                        $awayTeamType = 'club';
                    }
                    
                    $matchDescription = $homeTeam . ' vs ' . $awayTeam;
                    
                    $db->query("
                        INSERT INTO accumulator_picks (
                            accumulator_id, match_type, home_team_type, away_team_type,
                            match_description, prediction, odds, 
                            match_date, match_time, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ", [
                        $ticketId,
                        $matchType,
                        $homeTeamType,
                        $awayTeamType,
                        $matchDescription,
                        $pickData['prediction'],
                        floatval($pickData['odds']),
                        $matchDateTime,
                        $matchTime
                    ]);
                }
                
                // Recalculate total odds as a safety measure (in case of rounding issues)
                $finalOdds = 1.0;
                $allPicks = $db->fetchAll("SELECT odds FROM accumulator_picks WHERE accumulator_id = ?", [$ticketId]);
                foreach ($allPicks as $pick) {
                    $finalOdds *= floatval($pick['odds']);
                }
                
                // Update with final calculated odds
                $db->query("UPDATE accumulator_tickets SET total_odds = ? WHERE id = ?", [$finalOdds, $ticketId]);
                
                $db->commit();
                $success = "Pick created successfully! Total odds: " . number_format($finalOdds, 2) . ". It will be reviewed by admin before going live.";
                
                $logger->info("Pick created successfully", [
                    'ticket_id' => $ticketId,
                    'user_id' => $userId,
                    'total_odds' => $finalOdds,
                    'pick_count' => $pickCount
                ]);
                
                // Send notifications BEFORE redirect
                try {
                    require_once __DIR__ . '/../models/MailService.php';
                    require_once __DIR__ . '/../models/NotificationService.php';
                    
                    $mailService = MailService::getInstance();
                    $notificationService = NotificationService::getInstance();
                    
                    // Send in-app notification to user
                    $notificationService->notify(
                        $userId,
                        'pick_created',
                        'Pick Created Successfully! ✅',
                        "Your pick '{$title}' has been created and is pending admin approval.",
                        '/my_picks',
                        ['pick_id' => $ticketId, 'pick_title' => $title]
                    );
                    
                    // Send email notification to all admins
                    $mailResult = $mailService->notifyAdminPickPending($ticketId, $userId, $title);
                    if (!$mailResult['success']) {
                        $logger->warning('Failed to send admin notification email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                    }
                    
                    // Also send email to all admin users (not just the config email)
                    try {
                        $admins = $db->fetchAll("SELECT id, email FROM users WHERE role = 'admin'");
                        $baseUrl = $mailService->getBaseUrl();
                        $tipsterName = $user['display_name'] ?? $user['username'] ?? 'Unknown';
                        foreach ($admins as $admin) {
                            if (!empty($admin['email'])) {
                                $emailMessage = "
                                    <html>
                                    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                                        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                                            <h2 style='color: #d32f2f;'>New Pick Pending Approval</h2>
                                            <p>A new pick has been created by a tipster and is awaiting your approval.</p>
                                            <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                                                <p><strong>Pick ID:</strong> #{$ticketId}</p>
                                                <p><strong>Pick Title:</strong> {$title}</p>
                                                <p><strong>Tipster:</strong> {$tipsterName}</p>
                                                <p><strong>Created:</strong> " . date('Y-m-d H:i:s') . "</p>
                                            </div>
                                            <p>
                                                <a href='{$baseUrl}/admin_approve_pick' 
                                                   style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                                          text-decoration: none; border-radius: 5px; display: inline-block;'>
                                                    Review Pick
                                                </a>
                                            </p>
                                        </div>
                                    </body>
                                    </html>
                                ";
                                $mailService->sendEmail(
                                    $admin['email'],
                                    "New Pick Pending Approval - {$title}",
                                    $emailMessage
                                );
                            }
                        }
                    } catch (Exception $e) {
                        $logger->warning('Failed to send email to all admins', ['error' => $e->getMessage()]);
                    }
                    
                    // Send in-app notification to all admins
                    $notificationService->notifyAllAdmins(
                        'pick_pending_approval',
                        'New Pick Pending Approval',
                        "A new pick '{$title}' has been created by " . ($user['display_name'] ?? $user['username'] ?? 'a tipster') . " and is awaiting approval.",
                        '/admin_approve_pick',
                        ['pick_id' => $ticketId, 'tipster_id' => $userId, 'pick_title' => $title]
                    );
                    
                } catch (Exception $e) {
                    // Don't fail pick creation if notifications fail
                    $logger->error('Error sending notifications', ['error' => $e->getMessage()]);
                }
                
                // Set success message in session for display on redirect page
                $_SESSION['pick_creation_success'] = $success;
                
                // Detect base URL for redirect
                $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
                $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
                $baseUrl = '';
                if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
                    $baseUrl = '/SmartPicksPro-Local';
                }
                
                // Redirect to my_picks page after successful creation
                header('Location: ' . $baseUrl . '/my_picks?success=1');
                exit;
            } else {
                $error = "Failed to create pick.";
            }
        } catch (Exception $e) {
            if ($db->getConnection()->inTransaction()) {
                $db->rollBack();
            }
            $error = "Error creating pick: " . $e->getMessage();
            $logger->error('Pick creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'post_data' => $_POST
            ]);
        }
    } else {
        // More detailed error message
        $missingFields = [];
        if (empty($title)) $missingFields[] = 'Title';
        if (empty($description)) $missingFields[] = 'Description';
        if (empty($sport)) $missingFields[] = 'Sport';
        if (empty($confidence_level) || $confidence_level < 1 || $confidence_level > 100) {
            $missingFields[] = 'Valid Confidence Level';
        }
        if (empty($picks) || !is_array($picks) || count($picks) === 0) {
            $missingFields[] = 'At least one pick';
        }
        
        $error = "Please fill in all required fields: " . implode(', ', $missingFields);
        $logger->warning('Form validation failed', [
            'missing_fields' => $missingFields,
            'post_data' => $_POST
        ]);
    }
}

// Start output buffering
ob_start();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Pick - SmartPicks Pro</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 15px;
        }
        
        .header {
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            margin: 0;
        }
        
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        
        .form-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        input[type="time"],
        input[type="date"] {
            padding: 12px;
            font-size: 16px;
            cursor: pointer;
            background-color: white;
            min-height: 44px;
            width: 100%;
            display: block;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="date"]::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 1;
            width: 20px;
            height: 20px;
            padding: 0;
            margin-left: 8px;
        }
        
        input[type="time"]::-moz-calendar-picker-indicator,
        input[type="date"]::-moz-calendar-picker-indicator {
            cursor: pointer;
        }
        
        .form-group {
            position: relative;
        }
        
        .match-datetime-fields .form-group {
            position: relative;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #dc3545;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
        }
        
        input[type="time"]:focus, input[type="date"]:focus {
            border-color: #dc3545;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
        }
        
        input[type="time"]:hover, input[type="date"]:hover {
            border-color: #dc3545;
        }
        
        .btn {
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .btn:hover {
            background: #c82333;
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(220, 53, 69, 0.3);
        }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .pick-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background: #fafafa;
            transition: all 0.2s;
        }
        
        .pick-item:hover {
            border-color: #dc3545;
            box-shadow: 0 2px 8px rgba(220, 53, 69, 0.1);
        }
        
        .pick-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .pick-item-title {
            font-weight: 600;
            color: #dc3545;
            font-size: 16px;
        }
        
        .remove-pick-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .remove-pick-btn:hover {
            background: #c82333;
        }
        
        .team-selection {
            margin-bottom: 15px;
        }
        
        .team-selection h4 {
            margin-bottom: 10px;
            color: #333;
            font-size: 14px;
            font-weight: 600;
        }
        
        .team-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .team-field {
            margin-bottom: 0;
        }
        
        .team-field label {
            font-size: 13px;
            margin-bottom: 5px;
        }
        
        .match-datetime-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .match-datetime-fields .form-group {
            margin-bottom: 0;
        }
        
        .pick-item-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .match-type-selection {
            margin-bottom: 15px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }
        
        .match-type-selection label {
            font-size: 13px;
            margin-bottom: 8px;
        }
        
        .odds-calculator {
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 15px 0;
        }
        
        .odds-calculator h4 {
            margin-bottom: 8px;
            color: white;
            font-size: 14px;
            font-weight: 600;
        }
        
        .total-odds {
            font-size: 32px;
            font-weight: bold;
            color: white;
            margin: 5px 0;
        }
        
        .odds-calculator p {
            margin: 0;
            font-size: 12px;
            opacity: 0.9;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        small {
            color: #666;
            font-size: 11px;
            display: block;
            margin-top: 4px;
        }
        
        textarea {
            resize: vertical;
            min-height: 80px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-plus-circle"></i> Create New Pick</h1>
            <p>Create a comprehensive sports pick with multiple selections</p>
        </div>
        
        <div class="form-container">
            <?php if ($success): ?>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
                </div>
            <?php endif; ?>
            
            <?php if ($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" id="createPickForm" action="" onsubmit="return validateForm()">
                <input type="hidden" name="action" value="create_pick">
                
                <div class="form-group">
                    <label for="title">Pick Title:</label>
                    <input type="text" name="title" id="title" required placeholder="e.g., Premier League Accumulator">
                </div>
                
                <div class="form-group">
                    <label for="description">Description:</label>
                    <textarea name="description" id="description" rows="3" required placeholder="Describe your pick strategy and reasoning..."></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="sport">Sport:</label>
                        <select name="sport" id="sport" required>
                            <option value="">Select Sport</option>
                            <?php foreach ($sports as $sport): ?>
                                <option value="<?php echo htmlspecialchars($sport); ?>"><?php echo htmlspecialchars($sport); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="price">Price (GHS):</label>
                        <input type="number" name="price" id="price" min="0" step="0.01" required placeholder="10.00" value="0">
                        <small>Set to 0 for free picks</small>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="confidence_level">Confidence Level (%):</label>
                    <input type="number" name="confidence_level" id="confidence_level" min="1" max="100" value="75" required placeholder="75" step="1">
                    <small>Your confidence level (1-100%)</small>
                </div>
                
                <div class="form-group">
                    <label>Individual Picks:</label>
                    <div class="pick-items" id="pickItems">
                        <!-- Pick items will be added here dynamically -->
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="addPickItem()">
                        <i class="fas fa-plus"></i> Add Pick
                    </button>
                </div>
                
                <div class="odds-calculator">
                    <h4>Total Odds Calculator</h4>
                    <div class="total-odds" id="totalOdds">1.00</div>
                    <p>Combined odds of all picks</p>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <button type="button" class="btn btn-secondary" onclick="resetForm()">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                    <button type="submit" class="btn">
                        <i class="fas fa-save"></i> Create Pick
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Add real-time validation for confidence level input
        document.addEventListener('DOMContentLoaded', function() {
            const confidenceInput = document.getElementById('confidence_level');
            if (confidenceInput) {
                // Prevent typing non-numeric characters
                confidenceInput.addEventListener('keypress', function(e) {
                    // Allow: backspace, delete, tab, escape, enter, and decimal point
                    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                        (e.keyCode === 65 && e.ctrlKey === true) ||
                        (e.keyCode === 67 && e.ctrlKey === true) ||
                        (e.keyCode === 86 && e.ctrlKey === true) ||
                        (e.keyCode === 88 && e.ctrlKey === true) ||
                        // Allow: home, end, left, right
                        (e.keyCode >= 35 && e.keyCode <= 39)) {
                        return;
                    }
                    // Ensure that it is a number and stop the keypress
                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                        e.preventDefault();
                    }
                });
                
                // Remove any non-numeric characters that might slip through
                confidenceInput.addEventListener('input', function(e) {
                    // Remove any non-numeric characters
                    this.value = this.value.replace(/[^0-9]/g, '');
                    
                    // Now validate the numeric value
                    let value = parseInt(this.value);
                    if (isNaN(value)) {
                        // Allow empty value while typing
                        if (this.value === '') {
                            return;
                        }
                        this.value = '';
                        return;
                    }
                    // Clamp value between 1 and 100
                    if (value < 1) {
                        this.value = 1;
                    } else if (value > 100) {
                        this.value = 100;
                    }
                });
                
                // Validate on blur (when user leaves the field)
                confidenceInput.addEventListener('blur', function(e) {
                    let value = parseInt(this.value);
                    if (isNaN(value) || value < 1) {
                        this.value = 1;
                    } else if (value > 100) {
                        this.value = 100;
                    }
                });
                
                // Prevent pasting invalid values
                confidenceInput.addEventListener('paste', function(e) {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text');
                    // Extract only numbers from pasted text
                    const numbersOnly = paste.replace(/[^0-9]/g, '');
                    if (numbersOnly) {
                        const value = parseInt(numbersOnly);
                        if (!isNaN(value) && value >= 1 && value <= 100) {
                            this.value = value;
                        } else if (!isNaN(value) && value > 100) {
                            this.value = 100;
                        } else if (!isNaN(value) && value < 1) {
                            this.value = 1;
                        } else {
                            this.value = 75; // Reset to default
                        }
                    }
                });
            }
        });
        
        let pickCounter = 0;
        const countries = <?php echo json_encode($countries); ?>;
        const teams = <?php echo json_encode($teams); ?>;
        const nationalTeams = <?php echo json_encode($nationalTeams); ?>;
        
        function addPickItem() {
            pickCounter++;
            const pickItems = document.getElementById('pickItems');
            const pickItem = document.createElement('div');
            pickItem.className = 'pick-item';
            pickItem.id = 'pick-' + pickCounter;
            
            pickItem.innerHTML = `
                <div class="pick-item-header">
                    <div class="pick-item-title">Pick ${pickCounter}</div>
                    <button type="button" class="remove-pick-btn" onclick="removePickItem(${pickCounter})">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
                
                <div class="match-type-selection">
                    <label>Match Type:</label>
                    <select name="picks[${pickCounter}][match_type]" onchange="toggleMatchType(${pickCounter}, this.value)" class="match-type-select">
                        <option value="league" selected>League Match</option>
                        <option value="international">International Match</option>
                    </select>
                </div>
                
                <!-- League Match Selection (default, shown) -->
                <div class="team-selection league-selection" id="league-selection-${pickCounter}">
                    <h4><i class="fas fa-futbol"></i> Team Selection</h4>
                    <div class="team-fields">
                        <div class="team-field">
                            <label>Home Country:</label>
                            <select name="picks[${pickCounter}][home_country_id]" class="home-country-select" onchange="updateHomeTeams(${pickCounter})">
                                <option value="">Select Country</option>
                                ${countries.map(country => `<option value="${country.id}">${country.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="team-field">
                            <label>Away Country:</label>
                            <select name="picks[${pickCounter}][away_country_id]" class="away-country-select" onchange="updateAwayTeams(${pickCounter})">
                                <option value="">Select Country</option>
                                ${countries.map(country => `<option value="${country.id}">${country.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="team-field">
                            <label>Home Team:</label>
                            <select name="picks[${pickCounter}][home_team_id]" class="home-team-select" onchange="updateHomeTeamName(${pickCounter})">
                                <option value="">Select Home Team</option>
                            </select>
                            <input type="hidden" name="picks[${pickCounter}][home_team_name]" class="home-team-name">
                        </div>
                        <div class="team-field">
                            <label>Away Team:</label>
                            <select name="picks[${pickCounter}][away_team_id]" class="away-team-select" onchange="updateAwayTeamName(${pickCounter})">
                                <option value="">Select Away Team</option>
                            </select>
                            <input type="hidden" name="picks[${pickCounter}][away_team_name]" class="away-team-name">
                        </div>
                    </div>
                </div>
                
                <!-- International Match Selection (hidden by default) -->
                <div class="team-selection international-selection" id="international-selection-${pickCounter}" style="display: none;">
                    <h4><i class="fas fa-globe"></i> National Team Selection</h4>
                    <div class="team-fields">
                        <div class="team-field">
                            <label>Home National Team:</label>
                            <select name="picks[${pickCounter}][home_national_team]" class="home-national-team-select">
                                <option value="">Select Home National Team</option>
                                ${nationalTeams.map(team => `<option value="${team.team_name}">${team.team_name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="team-field">
                            <label>Away National Team:</label>
                            <select name="picks[${pickCounter}][away_national_team]" class="away-national-team-select">
                                <option value="">Select Away National Team</option>
                                ${nationalTeams.map(team => `<option value="${team.team_name}">${team.team_name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="match-datetime-fields">
                    <div class="form-group">
                        <label>Match Date:</label>
                        <input type="date" name="picks[${pickCounter}][match_date]" class="match-date" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Match Time:</label>
                        <input type="time" name="picks[${pickCounter}][match_time]" class="match-time" required step="60" value="">
                    </div>
                </div>
                
                <div class="pick-item-fields">
                    <div class="form-group">
                        <label>Prediction:</label>
                        <select name="picks[${pickCounter}][prediction]" class="prediction-select" required onchange="updatePredictionText(${pickCounter})">
                            <option value="">Select Prediction Type</option>
                            <optgroup label="Match Result (1X2)">
                                <option value="1">1 (Home Win)</option>
                                <option value="X">X (Draw)</option>
                                <option value="2">2 (Away Win)</option>
                            </optgroup>
                            <optgroup label="Double Chance">
                                <option value="1X">1X (Home Win or Draw)</option>
                                <option value="12">12 (Home Win or Away Win)</option>
                                <option value="X2">X2 (Draw or Away Win)</option>
                            </optgroup>
                            <optgroup label="Draw No Bet">
                                <option value="Home">Home</option>
                                <option value="Away">Away</option>
                            </optgroup>
                            <optgroup label="Over/Under Total Goals">
                                <option value="Over 0.5">Over 0.5</option>
                                <option value="Under 0.5">Under 0.5</option>
                                <option value="Over 1.5">Over 1.5</option>
                                <option value="Under 1.5">Under 1.5</option>
                                <option value="Over 2.5">Over 2.5</option>
                                <option value="Under 2.5">Under 2.5</option>
                                <option value="Over 3.5">Over 3.5</option>
                                <option value="Under 3.5">Under 3.5</option>
                            </optgroup>
                            <optgroup label="Both Teams To Score">
                                <option value="BTTS Yes">Yes</option>
                                <option value="BTTS No">No</option>
                            </optgroup>
                            <optgroup label="Half-Time Result">
                                <option value="HT 1">1 (Home Win)</option>
                                <option value="HT X">X (Draw)</option>
                                <option value="HT 2">2 (Away Win)</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Odds:</label>
                        <input type="number" name="picks[${pickCounter}][odds]" class="odds-input" min="1.01" step="0.01" required placeholder="1.50" onchange="calculateTotalOdds()">
                    </div>
                </div>
            `;
            
            pickItems.appendChild(pickItem);
            calculateTotalOdds();
            
            // Time inputs will work natively - no need for showPicker()
        }
        
        function removePickItem(pickId) {
            const pickItem = document.getElementById('pick-' + pickId);
            if (pickItem) {
                pickItem.remove();
                calculateTotalOdds();
            }
        }
        
        function updateHomeTeams(pickId) {
            const countrySelect = document.querySelector(`#pick-${pickId} .home-country-select`);
            const teamSelect = document.querySelector(`#pick-${pickId} .home-team-select`);
            const countryId = countrySelect.value;
            
            teamSelect.innerHTML = '<option value="">Select Home Team</option>';
            
            if (countryId) {
                const countryTeams = teams.filter(team => team.country_id == countryId);
                countryTeams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    teamSelect.appendChild(option);
                });
            }
        }
        
        function updateAwayTeams(pickId) {
            const countrySelect = document.querySelector(`#pick-${pickId} .away-country-select`);
            const teamSelect = document.querySelector(`#pick-${pickId} .away-team-select`);
            const countryId = countrySelect.value;
            
            teamSelect.innerHTML = '<option value="">Select Away Team</option>';
            
            if (countryId) {
                const countryTeams = teams.filter(team => team.country_id == countryId);
                countryTeams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    teamSelect.appendChild(option);
                });
            }
        }
        
        function updateHomeTeamName(pickId) {
            const teamSelect = document.querySelector(`#pick-${pickId} .home-team-select`);
            const teamNameInput = document.querySelector(`#pick-${pickId} .home-team-name`);
            const selectedOption = teamSelect.options[teamSelect.selectedIndex];
            teamNameInput.value = selectedOption.textContent;
        }
        
        function updateAwayTeamName(pickId) {
            const teamSelect = document.querySelector(`#pick-${pickId} .away-team-select`);
            const teamNameInput = document.querySelector(`#pick-${pickId} .away-team-name`);
            const selectedOption = teamSelect.options[teamSelect.selectedIndex];
            teamNameInput.value = selectedOption.textContent;
        }
        
        function updatePredictionText(pickId) {
            // This function can be expanded to show prediction text
        }
        
        function toggleMatchType(pickId, matchType) {
            const leagueSelection = document.getElementById(`league-selection-${pickId}`);
            const internationalSelection = document.getElementById(`international-selection-${pickId}`);
            
            if (matchType === 'league') {
                leagueSelection.style.display = 'block';
                internationalSelection.style.display = 'none';
                // Clear and remove required from international team selections
                const homeNational = internationalSelection.querySelector('.home-national-team-select');
                const awayNational = internationalSelection.querySelector('.away-national-team-select');
                if (homeNational) {
                    homeNational.value = '';
                    homeNational.removeAttribute('required');
                }
                if (awayNational) {
                    awayNational.value = '';
                    awayNational.removeAttribute('required');
                }
            } else {
                leagueSelection.style.display = 'none';
                internationalSelection.style.display = 'block';
                // Clear and remove required from league team selections
                const homeCountry = leagueSelection.querySelector('.home-country-select');
                const awayCountry = leagueSelection.querySelector('.away-country-select');
                const homeTeam = leagueSelection.querySelector('.home-team-select');
                const awayTeam = leagueSelection.querySelector('.away-team-select');
                if (homeCountry) {
                    homeCountry.value = '';
                    homeCountry.removeAttribute('required');
                }
                if (awayCountry) {
                    awayCountry.value = '';
                    awayCountry.removeAttribute('required');
                }
                if (homeTeam) {
                    homeTeam.innerHTML = '<option value="">Select Home Team</option>';
                    homeTeam.removeAttribute('required');
                }
                if (awayTeam) {
                    awayTeam.innerHTML = '<option value="">Select Away Team</option>';
                    awayTeam.removeAttribute('required');
                }
                // Add required to international team selections
                if (homeNational) homeNational.setAttribute('required', 'required');
                if (awayNational) awayNational.setAttribute('required', 'required');
            }
        }
        
        function calculateTotalOdds() {
            const oddsInputs = document.querySelectorAll('.odds-input');
            let totalOdds = 1;
            
            oddsInputs.forEach(input => {
                const odds = parseFloat(input.value) || 1;
                totalOdds *= odds;
            });
            
            document.getElementById('totalOdds').textContent = totalOdds.toFixed(2);
        }
        
        function resetForm() {
            document.getElementById('createPickForm').reset();
            document.getElementById('pickItems').innerHTML = '';
            pickCounter = 0;
            calculateTotalOdds();
        }
        
        function validateForm() {
            console.log('validateForm() called');
            const form = document.getElementById('createPickForm');
            if (!form) {
                console.error('Form not found!');
                alert('Form not found. Please refresh the page.');
                return false;
            }
            
            console.log('Form found, starting validation...');
            
            const title = form.querySelector('[name="title"]')?.value.trim();
            const description = form.querySelector('[name="description"]')?.value.trim();
            const sport = form.querySelector('[name="sport"]')?.value;
            const price = form.querySelector('[name="price"]')?.value;
            const confidence = form.querySelector('[name="confidence_level"]')?.value;
            
            console.log('Form values:', { title, description, sport, price, confidence });
            
            // Basic validation
            if (!title) {
                alert('Please enter a pick title.');
                return false;
            }
            
            if (!description) {
                alert('Please enter a description.');
                return false;
            }
            
            if (!sport) {
                alert('Please select a sport.');
                return false;
            }
            
            if (!price || parseFloat(price) < 0) {
                alert('Please enter a valid price (0 or greater).');
                return false;
            }
            
            if (!confidence || parseInt(confidence) < 1 || parseInt(confidence) > 100) {
                alert('Please enter a confidence level between 1 and 100.');
                return false;
            }
            
            // Validate match dates - ensure they are not in the past
            const matchDateInputs = form.querySelectorAll('.match-date');
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for comparison
            
            for (let dateInput of matchDateInputs) {
                if (dateInput.value) {
                    const selectedDate = new Date(dateInput.value);
                    selectedDate.setHours(0, 0, 0, 0);
                    
                    if (selectedDate < today) {
                        alert('Match date cannot be in the past. Please select today\'s date or a future date.');
                        dateInput.focus();
                        return false;
                    }
                }
            }
            
            // Check if there are any picks
            const pickItems = document.querySelectorAll('.pick-item');
            console.log('Pick items found:', pickItems.length);
            
            if (pickItems.length === 0) {
                alert('Please add at least one pick.');
                return false;
            }
            
            // Validate each pick
            let hasValidPick = false;
            pickItems.forEach((item, index) => {
                const matchTypeSelect = item.querySelector('[name*="[match_type]"]');
                const matchType = matchTypeSelect ? matchTypeSelect.value : 'league';
                let isValid = false;
                
                if (matchType === 'international') {
                    const homeNational = item.querySelector('.home-national-team-select')?.value;
                    const awayNational = item.querySelector('.away-national-team-select')?.value;
                    const prediction = item.querySelector('[name*="[prediction]"]')?.value;
                    const odds = item.querySelector('[name*="[odds]"]')?.value;
                    
                    console.log(`Pick ${index + 1} (international):`, { homeNational, awayNational, prediction, odds });
                    
                    if (homeNational && awayNational && prediction && odds && parseFloat(odds) > 1.0) {
                        isValid = true;
                    }
                } else {
                    const homeTeam = item.querySelector('.home-team-select')?.value;
                    const awayTeam = item.querySelector('.away-team-select')?.value;
                    const prediction = item.querySelector('[name*="[prediction]"]')?.value;
                    const odds = item.querySelector('[name*="[odds]"]')?.value;
                    
                    console.log(`Pick ${index + 1} (league):`, { homeTeam, awayTeam, prediction, odds });
                    
                    if (homeTeam && awayTeam && prediction && odds && parseFloat(odds) > 1.0) {
                        isValid = true;
                    }
                }
                
                if (isValid) {
                    hasValidPick = true;
                }
            });
            
            if (!hasValidPick) {
                alert('Please add at least one valid pick with odds greater than 1.0.');
                return false;
            }
            
            console.log('Validation passed! Form will submit...');
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            }
            
            return true;
        }
        
        // Add initial pick item
        document.addEventListener('DOMContentLoaded', function() {
            addPickItem();
            
            // Ensure time inputs are clickable (removed showPicker - causes errors)
            // The native browser picker will work fine without showPicker()
            
            // Debug: Log form submission
            const form = document.getElementById('createPickForm');
            if (form) {
                form.addEventListener('submit', function(e) {
                    console.log('Form submitting...');
                    console.log('Form action:', this.action);
                    console.log('Form method:', this.method);
                    console.log('Form data:', new FormData(this));
                    
                    // Don't prevent default - let it submit
                    // The onsubmit="return validateForm()" will handle validation
                });
            } else {
                console.error('createPickForm not found in DOM!');
            }
            
            // Also add a click handler to the submit button for debugging
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.addEventListener('click', function(e) {
                    console.log('Submit button clicked');
                    console.log('Form validation will run...');
                });
            }
        });
    </script>
</body>
</html>

<?php
// Get the content
$content = ob_get_clean();

// Include tipster layout
include __DIR__ . '/../views/layouts/tipster_layout.php';
?>