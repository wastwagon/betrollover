<?php
/**
 * Admin Verification - Complete Feature Version
 * Uses the new layout system with full functionality from old system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/TipsterVerificationSystem.php';
require_once __DIR__ . '/../models/MailService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$verificationSystem = TipsterVerificationSystem::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

$error = '';
$success = '';
$verificationApplications = [];
$allBadges = [];

try {
    // Get verification applications (all statuses)
    $verificationApplications = $db->fetchAll("
        SELECT 
            tva.id,
            tva.user_id,
            tva.application_data,
            tva.experience,
            tva.specialties,
            tva.portfolio_url,
            tva.status,
            tva.created_at,
            tva.reviewed_at,
            tva.reviewed_by,
            tva.review_notes,
            u.username,
            u.display_name,
            u.email,
            u.country,
            u.role
        FROM tipster_verification_applications tva
        JOIN users u ON tva.user_id = u.id
        ORDER BY tva.created_at DESC
    ");
    
    // Get all badges
    $allBadges = $verificationSystem->getAllBadges();
    
} catch (Exception $e) {
    $error = 'Error loading verification data: ' . $e->getMessage();
    $logger->error('Verification data loading failed', ['error' => $e->getMessage()]);
}

// Handle verification actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $applicationId = $_POST['application_id'] ?? '';
    
    if ($action === 'approve_verification' && $applicationId) {
        try {
            // Use the verification system to properly approve and update user role
            $approvalResult = $verificationSystem->approveVerification($applicationId, $userId);
            
            if ($approvalResult) {
                $success = 'Verification application approved successfully! User role has been updated to tipster.';
                
                // Send email notification to user
                try {
                    $applicationData = $db->fetch("SELECT user_id FROM tipster_verification_applications WHERE id = ?", [$applicationId]);
                    if ($applicationData) {
                        $mailService = MailService::getInstance();
                        $mailResult = $mailService->notifyUserApplicationApproved(
                            (int)$applicationData['user_id'],
                            $applicationId
                        );
                        if (!$mailResult['success']) {
                            $logger->warning('Failed to send user application approved email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                        }
                    }
                } catch (Exception $e) {
                    // Don't fail approval if email fails
                    $logger->error('Error sending user application approved email', ['error' => $e->getMessage()]);
                }
                
                // Refresh the list
                $verificationApplications = $db->fetchAll("
                    SELECT 
                        tva.id,
                        tva.user_id,
                        tva.application_data,
                        tva.experience,
                        tva.specialties,
                        tva.portfolio_url,
                        tva.status,
                        tva.created_at,
                        tva.reviewed_at,
                        tva.reviewed_by,
                        tva.review_notes,
                        u.username,
                        u.display_name,
                        u.email,
                        u.country,
                        u.role
                    FROM tipster_verification_applications tva
                    JOIN users u ON tva.user_id = u.id
                    ORDER BY tva.created_at DESC
                ");
            } else {
                $error = 'Failed to approve verification application.';
            }
        } catch (Exception $e) {
            $error = 'Error approving verification: ' . $e->getMessage();
            $logger->error('Verification approval failed', ['error' => $e->getMessage(), 'application_id' => $applicationId]);
        }
    } elseif ($action === 'reject_verification' && $applicationId) {
        $rejectionReason = $_POST['rejection_reason'] ?? '';
        try {
            $result = $db->query("UPDATE tipster_verification_applications SET status = 'rejected', review_notes = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?", [$rejectionReason, $userId, $applicationId]);
            if ($result) {
                $success = 'Verification application rejected successfully!';
                
                // Send email notification to user
                try {
                    $applicationData = $db->fetch("SELECT user_id FROM tipster_verification_applications WHERE id = ?", [$applicationId]);
                    if ($applicationData) {
                        $mailService = MailService::getInstance();
                        $mailResult = $mailService->notifyUserApplicationRejected(
                            (int)$applicationData['user_id'],
                            $applicationId,
                            $rejectionReason
                        );
                        if (!$mailResult['success']) {
                            $logger->warning('Failed to send user application rejected email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                        }
                    }
                } catch (Exception $e) {
                    // Don't fail rejection if email fails
                    $logger->error('Error sending user application rejected email', ['error' => $e->getMessage()]);
                }
                
                // Refresh the list
                $verificationApplications = $db->fetchAll("
                    SELECT 
                        tva.id,
                        tva.user_id,
                        tva.application_data,
                        tva.experience,
                        tva.specialties,
                        tva.portfolio_url,
                        tva.status,
                        tva.created_at,
                        tva.reviewed_at,
                        tva.reviewed_by,
                        tva.review_notes,
                        u.username,
                        u.display_name,
                        u.email,
                        u.country,
                        u.role
                    FROM tipster_verification_applications tva
                    JOIN users u ON tva.user_id = u.id
                    ORDER BY tva.created_at DESC
                ");
            } else {
                $error = 'Failed to reject verification application.';
            }
        } catch (Exception $e) {
            $error = 'Error rejecting verification: ' . $e->getMessage();
        }
    }
}

// Safely get wallet balance
$walletBalance = 0.00;
try {
    if (isset($_SESSION['user_id'])) {
        $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$_SESSION['user_id']]);
        $walletBalance = $result ? $result['balance'] : 0.00;
    }
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Set page variables
$pageTitle = "Verification Management";

// Start content buffer
ob_start();
?>

<div class="admin-verification-content">
    <?php if ($success): ?>
    <div class="card" style="background-color: #e8f5e8; border-left: 4px solid #2e7d32;">
        <p style="color: #2e7d32; margin: 0;"><i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <div class="card">
        <h2><i class="fas fa-check-circle"></i> Verification Management</h2>
        <p style="color: #666; margin-top: 10px;">Review and approve tipster verification applications and manage user badges.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;">
                    <?php echo count(array_filter($verificationApplications, function($app) { return $app['status'] === 'pending'; })); ?>
                </p>
                <p style="font-size: 14px; color: #666;">Pending Applications</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;">
                    <?php echo count(array_filter($verificationApplications, function($app) { return $app['status'] === 'approved' && date('Y-m-d', strtotime($app['reviewed_at'] ?? '')) === date('Y-m-d'); })); ?>
                </p>
                <p style="font-size: 14px; color: #666;">Approved Today</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;">
                    <?php echo count($verificationApplications); ?>
                </p>
                <p style="font-size: 14px; color: #666;">Total Applications</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;">
                    <?php echo count($allBadges); ?>
                </p>
                <p style="font-size: 14px; color: #666;">Available Badges</p>
            </div>
        </div>
    </div>
    
    <!-- Verification Applications -->
    <div class="card">
        <h3><i class="fas fa-check-circle"></i> Verification Applications</h3>
        
        <?php if (empty($verificationApplications)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-check-circle" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h4>No Verification Applications</h4>
            <p>No tipster verification applications found.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">User</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Applied</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Reviewed</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($verificationApplications as $app): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px;"><?php echo $app['id']; ?></td>
                        <td style="padding: 12px;">
                            <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($app['username']); ?></p>
                            <p style="font-size: 12px; color: #666;"><?php echo htmlspecialchars($app['email']); ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $app['status'] === 'approved' ? '#2e7d32' : ($app['status'] === 'rejected' ? '#d32f2f' : '#d32f2f'); ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                                <?php echo ucfirst($app['status']); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-size: 12px; color: #666;">
                                <?php echo date('M j, Y', strtotime($app['created_at'])); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-size: 12px; color: #666;">
                                <?php echo $app['reviewed_at'] ? date('M j, Y', strtotime($app['reviewed_at'])) : '-'; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="viewApplication(<?php echo $app['id']; ?>)">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <?php if ($app['status'] === 'pending'): ?>
                                <button class="btn btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="approveVerification(<?php echo $app['id']; ?>)">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="rejectVerification(<?php echo $app['id']; ?>)">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                                <?php else: ?>
                                <span style="color: #666; padding: 4px 8px;">Processed</span>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Approval Modal -->
    <div id="approvalModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Approve Verification</h3>
            <p>Are you sure you want to approve this verification application?</p>
            <form method="post" id="approvalForm">
                <input type="hidden" name="action" value="approve_verification">
                <input type="hidden" name="application_id" id="approvalApplicationId">
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideApprovalModal()" class="btn btn-secondary" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Cancel</button>
                    <button type="submit" class="btn btn-success" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #28a745; color: white;">Approve</button>
                </div>
            </form>
        </div>
    </div>

    <!-- View Application Modal -->
    <div id="viewModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; overflow-y: auto; padding: 20px;">
        <div style="position: relative; background: white; padding: 30px; border-radius: 8px; min-width: 300px; max-width: 800px; max-height: 90vh; overflow-y: auto; margin: 20px auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #d32f2f;"><i class="fas fa-file-alt"></i> Application Details</h3>
                <button onclick="hideViewModal()" style="background: none; border: none; font-size: 24px; color: #666; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
            </div>
            <div id="applicationDetails" style="color: #666;">
                <!-- Application details will be loaded here -->
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" onclick="hideViewModal()" class="btn btn-secondary" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Close</button>
            </div>
        </div>
    </div>

    <!-- Rejection Modal -->
    <div id="rejectionModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Reject Verification</h3>
            <form method="post" id="rejectionForm">
                <input type="hidden" name="action" value="reject_verification">
                <input type="hidden" name="application_id" id="rejectionApplicationId">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Rejection Reason:</label>
                    <textarea name="rejection_reason" id="rejection_reason" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical;" placeholder="Please provide a reason for rejection..." required></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideRejectionModal()" class="btn btn-secondary" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Cancel</button>
                    <button type="submit" class="btn btn-danger" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #dc3545; color: white;">Reject</button>
                </div>
            </form>
        </div>
    </div>

<script>
// Application data for view modal
const applicationData = <?php echo json_encode($verificationApplications); ?>;

function viewApplication(applicationId) {
    const app = applicationData.find(a => a.id == applicationId);
    if (!app) {
        alert('Application not found');
        return;
    }
    
    // Parse JSON fields
    let specialtiesDisplay = '';
    try {
        if (app.specialties) {
            const specialtiesJson = JSON.parse(app.specialties);
            if (specialtiesJson.specialties) {
                specialtiesDisplay = specialtiesJson.specialties;
            } else {
                specialtiesDisplay = app.specialties;
            }
        }
    } catch (e) {
        specialtiesDisplay = app.specialties || 'Not specified';
    }
    
    let applicationDataDisplay = '';
    try {
        if (app.application_data) {
            const appData = JSON.parse(app.application_data);
            applicationDataDisplay = JSON.stringify(appData, null, 2);
        }
    } catch (e) {
        applicationDataDisplay = app.application_data || 'No additional data';
    }
    
    // Build HTML content
    const html = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #d32f2f; margin-bottom: 10px; border-bottom: 2px solid #d32f2f; padding-bottom: 5px;">User Information</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div>
                    <p style="margin: 5px 0;"><strong>Username:</strong> ${escapeHtml(app.username)}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(app.email)}</p>
                    <p style="margin: 5px 0;"><strong>Country:</strong> ${escapeHtml(app.country || 'Not specified')}</p>
                </div>
                <div>
                    <p style="margin: 5px 0;"><strong>Status:</strong> 
                        <span style="background-color: ${app.status === 'approved' ? '#2e7d32' : (app.status === 'rejected' ? '#d32f2f' : '#d32f2f')}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                            ${app.status}
                        </span>
                    </p>
                    <p style="margin: 5px 0;"><strong>Applied:</strong> ${new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    ${app.reviewed_at ? `<p style="margin: 5px 0;"><strong>Reviewed:</strong> ${new Date(app.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>` : ''}
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: #d32f2f; margin-bottom: 10px; border-bottom: 2px solid #d32f2f; padding-bottom: 5px;">Sports Betting Experience</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; line-height: 1.6;">
                ${escapeHtml(app.experience || 'Not provided')}
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: #d32f2f; margin-bottom: 10px; border-bottom: 2px solid #d32f2f; padding-bottom: 5px;">Sports Specialties</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; line-height: 1.6;">
                ${escapeHtml(specialtiesDisplay)}
            </div>
        </div>
        
        ${app.portfolio_url ? `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #d32f2f; margin-bottom: 10px; border-bottom: 2px solid #d32f2f; padding-bottom: 5px;">Portfolio/Links</h4>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                <a href="${escapeHtml(app.portfolio_url)}" target="_blank" style="color: #d32f2f; word-break: break-all;">
                    ${escapeHtml(app.portfolio_url)}
                </a>
            </div>
        </div>
        ` : ''}
        
        ${app.review_notes ? `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #d32f2f; margin-bottom: 10px; border-bottom: 2px solid #d32f2f; padding-bottom: 5px;">Admin Review Notes</h4>
            <div style="background-color: ${app.status === 'rejected' ? '#ffebee' : '#e8f5e8'}; padding: 15px; border-radius: 5px; white-space: pre-wrap; line-height: 1.6;">
                ${escapeHtml(app.review_notes)}
            </div>
        </div>
        ` : ''}
    `;
    
    document.getElementById('applicationDetails').innerHTML = html;
    document.getElementById('viewModal').style.display = 'block';
}

function hideViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function approveVerification(applicationId) {
    document.getElementById('approvalApplicationId').value = applicationId;
    document.getElementById('approvalModal').style.display = 'block';
}

function hideApprovalModal() {
    document.getElementById('approvalModal').style.display = 'none';
}

function rejectVerification(applicationId) {
    document.getElementById('rejectionApplicationId').value = applicationId;
    document.getElementById('rejection_reason').value = '';
    document.getElementById('rejectionModal').style.display = 'block';
}

function hideRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
}

// Close modals when clicking outside
document.getElementById('approvalModal').onclick = function(e) {
    if (e.target === this) {
        hideApprovalModal();
    }
};

document.getElementById('rejectionModal').onclick = function(e) {
    if (e.target === this) {
        hideRejectionModal();
    }
};

document.getElementById('viewModal').onclick = function(e) {
    if (e.target === this) {
        hideViewModal();
    }
};
</script>
    
    <!-- Verification Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Verification Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Verify tipster credentials and documentation thoroughly.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Approved verifications automatically award verification badges.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-medal"></i> 
                Badges help users build credibility and trust on the platform.
            </p>
            <p style="color: #666;">
                <i class="fas fa-file-alt"></i> 
                Keep detailed records of all verification decisions for audit purposes.
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
