<?php
/**
 * Become Tipster - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/MailService.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/NotificationService.php';

// Check authentication
AuthMiddleware::requireAuth();

$db = Database::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'user';

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

// If user is already a tipster, redirect to tipster dashboard
if ($userRole === 'tipster') {
    header('Location: ' . $baseUrl . '/tipster_dashboard');
    exit;
}

$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Handle tipster application
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'submit_application') {
        $experience = trim($_POST['experience'] ?? '');
        $specialties = trim($_POST['specialties'] ?? '');
        $portfolio = trim($_POST['portfolio'] ?? '');
        
        if (empty($experience) || empty($specialties)) {
            $error = "Please fill in all required fields.";
        } else {
            try {
                // Check if user already has a pending application
                $existingApp = $db->fetch("SELECT id FROM tipster_verification_applications WHERE user_id = ? AND status = 'pending'", [$userId]);
                if ($existingApp) {
                    $error = "You already have a pending tipster application.";
                } else {
                    // Submit application
                    $specialtiesJson = json_encode(['specialties' => $specialties]);
                    
                    // Use direct SQL query to ensure proper insertion
                    $logger = Logger::getInstance();
                    try {
                        $db->query("
                            INSERT INTO tipster_verification_applications 
                            (user_id, experience, specialties, portfolio_url, status, created_at, submitted_at, application_type) 
                            VALUES (?, ?, ?, ?, 'pending', NOW(), NOW(), 'basic')
                        ", [
                            $userId,
                            $experience,
                            $specialtiesJson,
                            !empty($portfolio) ? $portfolio : null
                        ]);
                        
                        $applicationId = $db->lastInsertId();
                        
                        // Verify the insert worked
                        if (!$applicationId) {
                            throw new Exception("Failed to get application ID after insertion");
                        }
                        
                        $logger->info('Tipster application inserted successfully', [
                            'user_id' => $userId,
                            'application_id' => $applicationId
                        ]);
                    } catch (Exception $e) {
                        // Log the error for debugging
                        $logger->error('Failed to insert tipster application', [
                            'user_id' => $userId,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        throw new Exception("Failed to submit application: " . $e->getMessage());
                    }
                    
                    $message = "Application submitted successfully! Admin will review it and get back to you soon.";
                    
                    // Send notifications
                    try {
                        $logger = Logger::getInstance();
                        $notificationService = NotificationService::getInstance();
                        
                        // Notify the user that their application was submitted
                        $notificationService->notify(
                            $userId,
                            'tipster_application_submitted',
                            'Tipster Application Submitted',
                            'Your tipster application has been submitted successfully. Our admin team will review it and get back to you soon.',
                            '/become_tipster',
                            [
                                'application_id' => $applicationId,
                                'username' => $user['username'] ?? 'Unknown'
                            ]
                        );
                        
                        // Notify all admins about the new application
                        $adminNotificationResult = $notificationService->notifyAllAdmins(
                            'tipster_application_submitted',
                            'New Tipster Application',
                            'User ' . ($user['username'] ?? 'Unknown') . ' has submitted a new tipster application. Please review it.',
                            '/admin_tipster_applications',
                            [
                                'application_id' => $applicationId,
                                'user_id' => $userId,
                                'username' => $user['username'] ?? 'Unknown'
                            ]
                        );
                        
                        if (!$adminNotificationResult['success']) {
                            $logger->warning('Failed to send admin notifications for tipster application', [
                                'error' => $adminNotificationResult['error'] ?? 'Unknown error'
                            ]);
                        }
                        
                        // Send email notification to admin (existing functionality)
                        $mailService = MailService::getInstance();
                        $mailResult = $mailService->notifyAdminTipsterApplication(
                            $applicationId,
                            $userId,
                            $user['username'] ?? 'Unknown'
                        );
                        if (!$mailResult['success']) {
                            $logger->warning('Failed to send admin tipster application email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                        }
                    } catch (Exception $e) {
                        // Don't fail application if notifications fail
                        $logger = Logger::getInstance();
                        $logger->error('Error sending tipster application notifications', ['error' => $e->getMessage()]);
                    }
                    
                    // Clear form data
                    $_POST = [];
                }
            } catch (Exception $e) {
                $error = "Error submitting application: " . $e->getMessage();
            }
        }
    }
}

// Check if user already has an application
$existingApplication = null;
try {
    $existingApplication = $db->fetch("SELECT * FROM tipster_verification_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", [$userId]);
    
    // Decode JSON fields if they exist
    if ($existingApplication && !empty($existingApplication['specialties'])) {
        $specialtiesData = json_decode($existingApplication['specialties'], true);
        if ($specialtiesData && isset($specialtiesData['specialties'])) {
            $existingApplication['specialties_display'] = $specialtiesData['specialties'];
        } else {
            $existingApplication['specialties_display'] = $existingApplication['specialties'];
        }
    }
} catch (Exception $e) {
    $existingApplication = null;
}

// Set page variables
$pageTitle = "Become Tipster";

// Start content buffer
ob_start();
?>

<div class="become-tipster-content">
    <?php if ($message): ?>
    <div class="card" style="background-color: #e8f5e8; border-left: 4px solid #2e7d32;">
        <p style="color: #2e7d32; margin: 0;"><i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($message); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-star"></i> Become a Verified Tipster</h2>
        <p style="color: #666; margin-top: 10px;">
            Join our community of expert tipsters and start earning money by sharing your sports predictions. 
            All applications are reviewed by our admin team.
        </p>
    </div>
    
    <?php if ($existingApplication): ?>
    <div class="card">
        <h3><i class="fas fa-file-alt"></i> Application Status</h3>
        <div style="margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <div>
                    <p style="font-weight: 500; margin-bottom: 5px;">Application Submitted</p>
                    <p style="font-size: 12px; color: #666;"><?php echo date('M j, Y g:i A', strtotime($existingApplication['created_at'])); ?></p>
                </div>
                <span style="background-color: <?php echo $existingApplication['status'] === 'approved' ? '#2e7d32' : ($existingApplication['status'] === 'rejected' ? '#d32f2f' : '#d32f2f'); ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                    <?php echo $existingApplication['status']; ?>
                </span>
            </div>
            
            <?php if ($existingApplication['status'] === 'approved'): ?>
            <div style="margin-top: 15px; padding: 15px; background-color: #e8f5e8; border-radius: 5px; border-left: 4px solid #2e7d32;">
                <p style="color: #2e7d32; margin-bottom: 10px; font-weight: 500;"><i class="fas fa-check-circle"></i> Congratulations!</p>
                <p style="color: #666; margin-bottom: 15px;">Your application has been approved! Please log out and log back in to access your tipster dashboard.</p>
                <a href="<?= $baseUrl ?>/logout" class="btn btn-success">
                    <i class="fas fa-sign-out-alt"></i> Logout and Login Again
                </a>
            </div>
            <?php elseif ($existingApplication['status'] === 'rejected' && !empty($existingApplication['review_notes'])): ?>
            <div style="margin-top: 15px; padding: 15px; background-color: #ffebee; border-radius: 5px;">
                <p style="color: #d32f2f; margin-bottom: 10px; font-weight: 500;">Admin Notes:</p>
                <p style="color: #666;"><?php echo htmlspecialchars($existingApplication['review_notes']); ?></p>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
    
    <?php if (!$existingApplication || $existingApplication['status'] === 'rejected'): ?>
    <div class="card">
        <h3><i class="fas fa-edit"></i> Tipster Application</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="submit_application">
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Sports Betting Experience *</label>
                <textarea name="experience" rows="4" required
                          placeholder="Describe your experience with sports betting, how long you've been doing it, and your track record..."
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"><?php echo htmlspecialchars($_POST['experience'] ?? ''); ?></textarea>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Sports Specialties *</label>
                <textarea name="specialties" rows="3" required
                          placeholder="List the sports/leagues you specialize in (e.g., Premier League, NBA, Tennis, etc.)..."
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"><?php echo htmlspecialchars($_POST['specialties'] ?? ''); ?></textarea>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Portfolio/Links (Optional)</label>
                <textarea name="portfolio" rows="2"
                          placeholder="Share any relevant links, social media profiles, or previous work that showcases your expertise..."
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"><?php echo htmlspecialchars($_POST['portfolio'] ?? ''); ?></textarea>
            </div>
            
            <button type="submit" class="btn btn-success">
                <i class="fas fa-paper-plane"></i> Submit Application
            </button>
        </form>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> What It Means to Be a Tipster</h3>
        <div style="margin-top: 15px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div>
                    <h4 style="color: #d32f2f; margin-bottom: 10px;"><i class="fas fa-dollar-sign"></i> Earn Money</h4>
                    <p style="color: #666; font-size: 14px;">Sell your picks and earn money from successful predictions. The better your track record, the more you can charge.</p>
                </div>
                
                <div>
                    <h4 style="color: #d32f2f; margin-bottom: 10px;"><i class="fas fa-users"></i> Build Reputation</h4>
                    <p style="color: #666; font-size: 14px;">Build your reputation as a trusted expert. Users will follow your picks based on your success rate.</p>
                </div>
                
                <div>
                    <h4 style="color: #d32f2f; margin-bottom: 10px;"><i class="fas fa-shield-alt"></i> Protected Platform</h4>
                    <p style="color: #666; font-size: 14px;">Our escrow system protects both you and buyers. Payments are secure and disputes are handled fairly.</p>
                </div>
                
                <div>
                    <h4 style="color: #d32f2f; margin-bottom: 10px;"><i class="fas fa-chart-line"></i> Track Performance</h4>
                    <p style="color: #666; font-size: 14px;">Detailed analytics help you track your performance and improve your predictions over time.</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-question-circle"></i> Requirements</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Minimum 6 months of sports betting experience
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Demonstrated knowledge in at least one sport/league
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Ability to provide detailed analysis and reasoning
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Commitment to maintaining high-quality predictions
            </p>
            <p style="color: #666;">
                <i class="fas fa-check"></i> 
                Understanding of responsible gambling practices
            </p>
        </div>
    </div>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include user layout
include __DIR__ . '/../views/layouts/user_layout.php';
?>
