<?php
/**
 * Admin Tipster Applications - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/NotificationService.php';
require_once __DIR__ . '/../models/Logger.php';

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

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get tipster applications
$applications = [];
$stats = [];

try {
    // First, let's check if there are any applications at all (for debugging)
    $totalCount = $db->fetch("SELECT COUNT(*) as count FROM tipster_verification_applications");
    
    $applications = $db->fetchAll("
        SELECT 
            tva.id,
            tva.user_id,
            tva.experience,
            tva.specialties,
            tva.portfolio_url,
            tva.status,
            tva.created_at,
            tva.reviewed_at,
            tva.reviewed_by,
            tva.review_notes,
            u.username, 
            u.email, 
            COALESCE(u.display_name, u.username) as full_name, 
            u.created_at as user_created_at
        FROM tipster_verification_applications tva
        LEFT JOIN users u ON tva.user_id = u.id
        ORDER BY tva.created_at DESC
    ");
    
    // Get statistics
    $stats['total_applications'] = count($applications);
    $stats['pending_applications'] = count(array_filter($applications, function($app) { return $app['status'] === 'pending'; }));
    $stats['approved_applications'] = count(array_filter($applications, function($app) { return $app['status'] === 'approved'; }));
    $stats['rejected_applications'] = count(array_filter($applications, function($app) { return $app['status'] === 'rejected'; }));
    
    // Log for debugging if count doesn't match
    if ($totalCount && $totalCount['count'] > 0 && count($applications) === 0) {
        require_once __DIR__ . '/../models/Logger.php';
        $logger = Logger::getInstance();
        $logger->warning('Admin tipster applications query returned 0 results but table has ' . $totalCount['count'] . ' applications');
    }
    
} catch (Exception $e) {
    $applications = [];
    $stats = ['total_applications' => 0, 'pending_applications' => 0, 'approved_applications' => 0, 'rejected_applications' => 0];
    
    // Log the error
    require_once __DIR__ . '/../models/Logger.php';
    $logger = Logger::getInstance();
    $logger->error('Error fetching tipster applications', ['error' => $e->getMessage()]);
}

// Handle application actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'review_application') {
        $applicationId = intval($_POST['application_id'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        $adminNotes = trim($_POST['admin_notes'] ?? '');
        
        if ($applicationId && in_array($status, ['approved', 'rejected'])) {
            try {
                // Update application status
                $db->query("
                    UPDATE tipster_verification_applications 
                    SET status = ?, review_notes = ?, reviewed_at = NOW(), reviewed_by = ?
                    WHERE id = ?
                ", [$status, $adminNotes, $userId, $applicationId]);
                
                // Get application details for notifications
                $application = $db->fetch("
                    SELECT tva.user_id, u.username, u.email 
                    FROM tipster_verification_applications tva
                    JOIN users u ON tva.user_id = u.id
                    WHERE tva.id = ?
                ", [$applicationId]);
                
                // If approved, update user role
                if ($status === 'approved') {
                    $db->query("UPDATE users SET role = 'tipster', updated_at = NOW() WHERE id = ?", [$application['user_id']]);
                    
                    // Create tipster profile if it doesn't exist
                    $profileExists = $db->fetch("SELECT id FROM tipster_profiles WHERE user_id = ?", [$application['user_id']]);
                    if (!$profileExists) {
                        $db->query("
                            INSERT INTO tipster_profiles (user_id, is_verified, created_at, updated_at) 
                            VALUES (?, 1, NOW(), NOW())
                        ", [$application['user_id']]);
                    }
                }
                
                // Send notifications to user and admin
                try {
                    $notificationService = NotificationService::getInstance();
                    $logger = Logger::getInstance();
                    
                    if ($status === 'approved') {
                        // Notify the user
                        $notificationService->notify(
                            $application['user_id'],
                            'tipster_application_approved',
                            'Tipster Application Approved! 🎉',
                            'Congratulations! Your tipster application has been approved. You can now create and sell picks on the platform. Please log out and log back in to access your tipster dashboard.',
                            '/become_tipster',
                            [
                                'application_id' => $applicationId,
                                'admin_notes' => $adminNotes
                            ]
                        );
                        
                        // Notify the admin who approved
                        try {
                            $notifyResult = $notificationService->notify(
                                $userId,
                                'admin_action',
                                'Application Approved',
                                'You have successfully approved the tipster application from ' . ($application['username'] ?? 'user') . '.',
                                '/admin_tipster_applications',
                                [
                                    'application_id' => $applicationId,
                                    'user_id' => $application['user_id'],
                                    'username' => $application['username'] ?? 'Unknown',
                                    'action' => 'approved'
                                ]
                            );
                            if (!$notifyResult['success']) {
                                $logger->warning('Failed to send admin notification', ['error' => $notifyResult['message'] ?? 'Unknown error']);
                            }
                        } catch (Exception $e) {
                            $logger->error('Error sending admin notification', ['error' => $e->getMessage()]);
                        }
                    } else {
                        // Notify the user
                        $notificationService->notify(
                            $application['user_id'],
                            'tipster_application_rejected',
                            'Tipster Application Update',
                            'Your tipster application has been reviewed. Unfortunately, it was not approved at this time.' . (!empty($adminNotes) ? ' Admin notes: ' . $adminNotes : ''),
                            '/become_tipster',
                            [
                                'application_id' => $applicationId,
                                'admin_notes' => $adminNotes
                            ]
                        );
                        
                        // Notify the admin who rejected
                        try {
                            $notifyResult = $notificationService->notify(
                                $userId,
                                'admin_action',
                                'Application Rejected',
                                'You have rejected the tipster application from ' . ($application['username'] ?? 'user') . '.',
                                '/admin_tipster_applications',
                                [
                                    'application_id' => $applicationId,
                                    'user_id' => $application['user_id'],
                                    'username' => $application['username'] ?? 'Unknown',
                                    'action' => 'rejected',
                                    'admin_notes' => $adminNotes
                                ]
                            );
                            if (!$notifyResult['success']) {
                                $logger->warning('Failed to send admin notification', ['error' => $notifyResult['message'] ?? 'Unknown error']);
                            }
                        } catch (Exception $e) {
                            $logger->error('Error sending admin notification', ['error' => $e->getMessage()]);
                        }
                    }
                } catch (Exception $e) {
                    // Don't fail the review if notification fails
                    $logger = Logger::getInstance();
                    $logger->error('Error sending tipster application review notification', [
                        'error' => $e->getMessage(),
                        'application_id' => $applicationId,
                        'status' => $status
                    ]);
                }
                
                $message = "Application " . $status . " successfully. The user has been notified.";
                
                // Refresh applications
                $applications = $db->fetchAll("
                    SELECT 
                        tva.id,
                        tva.user_id,
                        tva.experience,
                        tva.specialties,
                        tva.portfolio_url,
                        tva.status,
                        tva.created_at,
                        tva.reviewed_at,
                        tva.reviewed_by,
                        tva.review_notes,
                        u.username, 
                        u.email, 
                        COALESCE(u.display_name, u.username) as full_name, 
                        u.created_at as user_created_at
                    FROM tipster_verification_applications tva
                    LEFT JOIN users u ON tva.user_id = u.id
                    ORDER BY tva.created_at DESC
                ");
                
            } catch (Exception $e) {
                $error = "Error reviewing application: " . $e->getMessage();
            }
        } else {
            $error = "Invalid application or status selected.";
        }
    }
}

// Set page variables
$pageTitle = "Tipster Applications";

// Start content buffer
ob_start();
?>

<div class="admin-applications-content">
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
        <h2><i class="fas fa-user-check"></i> Tipster Applications</h2>
        <p style="color: #666; margin-top: 10px;">Review and approve tipster applications from users.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['total_applications']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Applications</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['pending_applications']; ?></p>
                <p style="font-size: 14px; color: #666;">Pending Review</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['approved_applications']; ?></p>
                <p style="font-size: 14px; color: #666;">Approved</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['rejected_applications']; ?></p>
                <p style="font-size: 14px; color: #666;">Rejected</p>
            </div>
        </div>
    </div>
    
    <!-- Applications List -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Applications</h3>
        
        <?php if (empty($applications)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-user-check" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No tipster applications found.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($applications as $application): ?>
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: #d32f2f; margin-bottom: 5px;">
                            <?php echo htmlspecialchars($application['username']); ?>
                        </h4>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo htmlspecialchars($application['email']); ?> • 
                            Member since <?php echo date('M j, Y', strtotime($application['user_created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background-color: <?php echo $application['status'] === 'approved' ? '#2e7d32' : ($application['status'] === 'rejected' ? '#d32f2f' : '#d32f2f'); ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                            <?php echo $application['status']; ?>
                        </span>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            Applied: <?php echo date('M j, Y g:i A', strtotime($application['created_at'])); ?>
                        </p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Experience</h5>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            <?php echo htmlspecialchars($application['experience']); ?>
                        </p>
                    </div>
                    
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Specialties</h5>
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            <?php 
                            // Handle specialties (may be JSON or plain text)
                            $specialties = $application['specialties'] ?? '';
                            if (!empty($specialties)) {
                                $specialtiesData = json_decode($specialties, true);
                                if (json_last_error() === JSON_ERROR_NONE && isset($specialtiesData['specialties'])) {
                                    echo htmlspecialchars($specialtiesData['specialties']);
                                } else {
                                    echo htmlspecialchars($specialties);
                                }
                            } else {
                                echo 'Not provided';
                            }
                            ?>
                        </p>
                    </div>
                </div>
                
                <?php if (!empty($application['portfolio_url'])): ?>
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Portfolio URL</h5>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <a href="<?php echo htmlspecialchars($application['portfolio_url']); ?>" target="_blank" style="color: #d32f2f;">
                            <?php echo htmlspecialchars($application['portfolio_url']); ?>
                        </a>
                    </p>
                </div>
                <?php endif; ?>
                
                <?php if (!empty($application['review_notes'])): ?>
                <div style="margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Admin Notes</h5>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <?php echo htmlspecialchars($application['review_notes']); ?>
                    </p>
                </div>
                <?php endif; ?>
                
                <?php if ($application['status'] === 'pending'): ?>
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Review Application</h5>
                    <form method="POST">
                        <input type="hidden" name="action" value="review_application">
                        <input type="hidden" name="application_id" value="<?php echo $application['id']; ?>">
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Decision</label>
                            <select name="status" required style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                <option value="">Select Decision</option>
                                <option value="approved">Approve</option>
                                <option value="rejected">Reject</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Admin Notes</label>
                            <textarea name="admin_notes" rows="3" 
                                      placeholder="Add notes about your decision..."
                                      style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-check"></i> Submit Review
                        </button>
                    </form>
                </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Review Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Review Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Consider the applicant's experience and expertise in sports betting.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-star"></i> 
                Look for detailed analysis and reasoning in their application.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Ensure they understand responsible gambling practices.
            </p>
            <p style="color: #666;">
                <i class="fas fa-comment"></i> 
                Provide constructive feedback in admin notes for rejected applications.
            </p>
        </div>
    </div>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

