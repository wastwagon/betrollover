<?php
/**
 * Admin Approve Pick - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../models/TipsterQualificationService.php';
require_once __DIR__ . '/../models/MailService.php';
require_once __DIR__ . '/../models/NotificationService.php';
require_once __DIR__ . '/../models/Logger.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get pending picks
$pendingPicks = [];
$stats = [];

try {
    // Get pending picks from accumulator_tickets (same as old system)
    $pendingPicks = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.description,
            at.sport,
            at.price,
            at.total_odds,
            at.confidence_level,
            at.created_at,
            u.username as tipster_name,
            u.email as tipster_email,
            u.display_name as tipster_display_name,
            COUNT(ap.id) as total_picks_count,
            at.total_picks
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        LEFT JOIN accumulator_picks ap ON at.id = ap.accumulator_id
        WHERE at.status = 'pending_approval'
        GROUP BY at.id
        ORDER BY at.created_at DESC
    ");
    
    // Get statistics from accumulator_tickets
    $stats['total_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets")['count'];
    $stats['pending_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'pending_approval'")['count'];
    $stats['approved_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'active'")['count'];
    $stats['rejected_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'decline'")['count'];
    $stats['total_tipsters'] = $db->fetch("SELECT COUNT(*) as count FROM users WHERE role = 'tipster'")['count'];
    
} catch (Exception $e) {
    $pendingPicks = [];
    $stats = ['total_picks' => 0, 'pending_picks' => 0, 'approved_picks' => 0, 'rejected_picks' => 0, 'total_tipsters' => 0];
}

// Handle pick approval
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'approve_pick') {
        $pickId = intval($_POST['pick_id'] ?? 0);
        $decision = trim($_POST['decision'] ?? '');
        $adminNotes = trim($_POST['admin_notes'] ?? '');
        
        if ($pickId && in_array($decision, ['approve', 'reject'])) {
            try {
                $isApproved = $decision === 'approve' ? 1 : 0;
                
                // Update pick status (using accumulator_tickets table)
                $status = $decision === 'approve' ? 'active' : 'decline';
                $isMarketplace = $decision === 'approve' ? 1 : 0;
                
                $db->query("
                    UPDATE accumulator_tickets 
                    SET status = ?, is_marketplace = ?, updated_at = NOW()
                    WHERE id = ?
                ", [$status, $isMarketplace, $pickId]);
                
                // If approved, create marketplace entry
                if ($decision === 'approve') {
                    // Get pick details
                    $pickDetails = $db->fetch("
                        SELECT user_id, price FROM accumulator_tickets WHERE id = ?
                    ", [$pickId]);
                    
                    if ($pickDetails) {
                        // Determine qualification and final price
                        $qualificationService = TipsterQualificationService::getInstance();
                        $qualification = $qualificationService->getTipsterQualificationStatus((int)$pickDetails['user_id']);

                        $finalPrice = (float)$pickDetails['price'];
                        $statusForPurchase = 'active';
                        if (!$qualification['can_sell']) {
                            // Not qualified: force free listing and block purchase button via UI logic
                            $finalPrice = 0.0;
                            $statusForPurchase = 'active';
                        }

                        // Ensure no duplicate marketplace entry
                        $existing = $db->fetch("SELECT id FROM pick_marketplace WHERE accumulator_id = ?", [$pickId]);
                        if (!$existing) {
                            $db->query("
                                INSERT INTO pick_marketplace (
                                    accumulator_id, seller_id, price, max_purchases,
                                    status, created_at, updated_at, view_count
                                ) VALUES (?, ?, ?, 999999, ?, NOW(), NOW(), 0)
                            ", [
                                $pickId,
                                $pickDetails['user_id'],
                                $finalPrice,
                                $statusForPurchase
                            ]);
                        } else {
                            // Sync price if already present
                            $db->query("UPDATE pick_marketplace SET price = ?, status = ?, updated_at = NOW() WHERE accumulator_id = ?", [$finalPrice, $statusForPurchase, $pickId]);
                        }
                    }
                }
                
                $message = "Pick " . $decision . "d successfully.";
                
                // Send notifications to tipster (email + in-app)
                try {
                    $logger = Logger::getInstance();
                    $mailService = MailService::getInstance();
                    $notificationService = NotificationService::getInstance();
                    $pickInfo = $db->fetch("SELECT title, user_id FROM accumulator_tickets WHERE id = ?", [$pickId]);
                    
                    if ($pickInfo) {
                        $tipsterId = (int)$pickInfo['user_id'];
                        $pickTitle = $pickInfo['title'];
                        
                        if ($decision === 'approve') {
                            // Send email notification
                            $mailResult = $mailService->notifyTipsterPickApproved($tipsterId, $pickId, $pickTitle);
                            if (!$mailResult['success']) {
                                $logger->warning('Failed to send tipster approval email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                            }
                            
                            // Send in-app notification
                            $notificationService->notify(
                                $tipsterId,
                                'pick_approved',
                                'Pick Approved! 🎉',
                                "Your pick '{$pickTitle}' has been approved and is now live in the marketplace.",
                                '/tipster_dashboard',
                                ['pick_id' => $pickId, 'pick_title' => $pickTitle]
                            );
                            
                        } elseif ($decision === 'reject') {
                            $rejectionReason = $_POST['admin_notes'] ?? 'No reason provided';
                            
                            // Send email notification
                            $mailResult = $mailService->notifyTipsterPickRejected($tipsterId, $pickId, $pickTitle, $rejectionReason);
                            if (!$mailResult['success']) {
                                $logger->warning('Failed to send tipster rejection email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                            }
                            
                            // Send in-app notification
                            $notificationService->notify(
                                $tipsterId,
                                'pick_rejected',
                                'Pick Rejected',
                                "Your pick '{$pickTitle}' was rejected. Reason: {$rejectionReason}",
                                '/tipster_dashboard',
                                ['pick_id' => $pickId, 'pick_title' => $pickTitle, 'reason' => $rejectionReason]
                            );
                        }
                    }
                } catch (Exception $e) {
                    // Don't fail action if notifications fail
                    $logger = Logger::getInstance();
                    $logger->error('Error sending tipster notifications', ['error' => $e->getMessage()]);
                }
                
                // Refresh pending picks (using accumulator_tickets table)
                $pendingPicks = $db->fetchAll("
                    SELECT 
                        at.id,
                        at.title,
                        at.description,
                        at.sport,
                        at.price,
                        at.total_odds,
                        at.confidence_level,
                        at.created_at,
                        u.username as tipster_name,
                        u.email as tipster_email,
                        u.display_name as tipster_display_name,
                        COUNT(ap.id) as total_picks_count,
                        at.total_picks
                    FROM accumulator_tickets at
                    JOIN users u ON at.user_id = u.id
                    LEFT JOIN accumulator_picks ap ON at.id = ap.accumulator_id
                    WHERE at.status = 'pending_approval'
                    GROUP BY at.id
                    ORDER BY at.created_at DESC
                ");
                
            } catch (Exception $e) {
                $error = "Error processing pick: " . $e->getMessage();
            }
        } else {
            $error = "Invalid pick or decision selected.";
        }
    }
}

// Set page variables
$pageTitle = "Approve Picks";

// Start content buffer
ob_start();
?>

<div class="admin-approve-content">
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
        <h2><i class="fas fa-check-circle"></i> Approve Picks</h2>
        <p style="color: #666; margin-top: 10px;">Review and approve picks before they go live on the marketplace.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['pending_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Pending Review</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['approved_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Approved</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Picks</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['total_tipsters']; ?></p>
                <p style="font-size: 14px; color: #666;">Active Tipsters</p>
            </div>
        </div>
    </div>
    
    <!-- Pending Picks -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Pending Picks</h3>
        
        <?php if (empty($pendingPicks)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-check-circle" style="font-size: 48px; color: #2e7d32; margin-bottom: 20px;"></i>
            <h3>All caught up!</h3>
            <p>No pending picks to review at the moment.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($pendingPicks as $pick): ?>
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <h4 style="color: #d32f2f; margin-bottom: 10px;">
                            <?php echo htmlspecialchars($pick['title']); ?>
                        </h4>
                        <p style="color: #666; font-size: 14px;">
                            By <strong><?php echo htmlspecialchars($pick['tipster_name']); ?></strong> • 
                            Created: <?php echo date('M j, Y g:i A', strtotime($pick['created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right; margin-left: 20px;">
                        <p style="font-size: 24px; font-weight: bold; color: #2e7d32;">
                            $<?php echo number_format($pick['price'], 2); ?>
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Description</h5>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <?php echo htmlspecialchars($pick['description']); ?>
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 15px;">
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Category</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo ucfirst($pick['category'] ?? 'N/A'); ?>
                        </p>
                    </div>
                    
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Total Odds</h5>
                        <p style="color: #2e7d32; font-size: 18px; font-weight: bold;">
                            <?php echo number_format($pick['total_odds'] ?? 1.0, 2); ?>
                        </p>
                    </div>
                    
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Number of Picks</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo $pick['total_picks'] ?? $pick['total_picks_count'] ?? 0; ?> picks
                        </p>
                    </div>
                    
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Sport</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo htmlspecialchars($pick['sport'] ?? 'N/A'); ?>
                        </p>
                    </div>
                </div>
                
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Review Pick</h5>
                    <form method="POST">
                        <input type="hidden" name="action" value="approve_pick">
                        <input type="hidden" name="pick_id" value="<?php echo $pick['id']; ?>">
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Decision</label>
                            <select name="decision" required style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                <option value="">Select Decision</option>
                                <option value="approve">Approve</option>
                                <option value="reject">Reject</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Admin Notes</label>
                            <textarea name="admin_notes" rows="3" 
                                      placeholder="Add notes about your decision..."
                                      style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                        </div>
                        
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button type="button" class="btn btn-info" onclick="viewPick(<?php echo $pick['id']; ?>)">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <button type="button" class="btn btn-warning" onclick="editPick(<?php echo $pick['id']; ?>)">
                                <i class="fas fa-edit"></i> Edit Pick
                            </button>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-check"></i> Submit Review
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="viewTipsterProfile('<?php echo $pick['tipster_name']; ?>')">
                                <i class="fas fa-user"></i> View Tipster Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Approval Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Approval Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Ensure the pick has detailed analysis and reasoning.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-dollar-sign"></i> 
                Verify the price is reasonable for the analysis provided.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Check that the prediction is not misleading or unrealistic.
            </p>
            <p style="color: #666;">
                <i class="fas fa-comment"></i> 
                Provide constructive feedback for rejected picks.
            </p>
        </div>
    </div>
</div>

<script>
function viewTipsterProfile(tipsterName) {
    // Simple implementation - can be enhanced with modal or new page
    alert('Tipster profile view will be implemented for: ' + tipsterName);
}
</script>

    <!-- View Pick Modal -->
    <div id="viewPickModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>View Pick Details</h3>
                <button onclick="hideViewPickModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            
            <div id="pickDetails">
                <!-- Pick details will be loaded here -->
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button onclick="hideViewPickModal()" class="btn btn-secondary">Close</button>
                <button onclick="editPickFromView()" class="btn btn-warning">Edit Pick</button>
                <button onclick="approveFromView()" class="btn btn-success">Approve</button>
                <button onclick="rejectFromView()" class="btn btn-danger">Reject</button>
            </div>
        </div>
    </div>

    <!-- Approval Modal -->
    <div id="approvalModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Approve Pick</h3>
            <p>Are you sure you want to approve this pick?</p>
            <form method="post" id="approvalForm">
                <input type="hidden" name="action" value="approve_pick">
                <input type="hidden" name="pick_id" id="approvalPickId">
                <input type="hidden" name="decision" value="approve">
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideApprovalModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-success">Approve</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Rejection Modal -->
    <div id="rejectionModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
            <h3>Reject Pick</h3>
            <form method="post" id="rejectionForm">
                <input type="hidden" name="action" value="approve_pick">
                <input type="hidden" name="pick_id" id="rejectionPickId">
                <input type="hidden" name="decision" value="reject">
                <div class="form-group">
                    <label for="rejection_reason">Rejection Reason:</label>
                    <textarea name="admin_notes" id="rejection_reason" rows="3" 
                              placeholder="Please provide a reason for rejection..."
                              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="hideRejectionModal()" class="btn btn-secondary">Cancel</button>
                    <button type="submit" class="btn btn-danger">Reject</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let currentPickId = null;

        function viewPick(pickId) {
            currentPickId = pickId;
            
            // Load pick details via AJAX
            fetch(`/SmartPicksPro-Local/api/get_pick_details.php?pick_id=${pickId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        displayPickDetails(data.pick);
                        document.getElementById('viewPickModal').style.display = 'block';
                    } else {
                        alert('Error loading pick details: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error loading pick details');
                });
        }

        function editPick(pickId) {
            window.location.href = `/SmartPicksPro-Local/edit_pick?id=${pickId}`;
        }

        function editPickFromView() {
            hideViewPickModal();
            editPick(currentPickId);
        }

        function approvePick(pickId) {
            currentPickId = pickId;
            document.getElementById('approvalPickId').value = pickId;
            document.getElementById('approvalModal').style.display = 'block';
        }

        function approveFromView() {
            hideViewPickModal();
            approvePick(currentPickId);
        }

        function rejectPick(pickId) {
            currentPickId = pickId;
            document.getElementById('rejectionPickId').value = pickId;
            document.getElementById('rejectionModal').style.display = 'block';
        }

        function rejectFromView() {
            hideViewPickModal();
            rejectPick(currentPickId);
        }

        function hideApprovalModal() {
            document.getElementById('approvalModal').style.display = 'none';
        }

        function hideRejectionModal() {
            document.getElementById('rejectionModal').style.display = 'none';
        }

        function hideViewPickModal() {
            document.getElementById('viewPickModal').style.display = 'none';
        }

        function displayPickDetails(pick) {
            const detailsDiv = document.getElementById('pickDetails');
            detailsDiv.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h4>Pick Information</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">ID:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${pick.id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${pick.title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${pick.description || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tipster:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${pick.display_name || pick.username}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Sport:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${pick.sport || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Total Odds:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: ${pick.total_odds > 5.0 ? '#D32F2F' : '#28a745'};">${parseFloat(pick.total_odds || 1.0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Price:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">GHS ${parseFloat(pick.price || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Confidence Level:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${pick.confidence_level || 75}%</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Created:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(pick.created_at).toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
                
                ${pick.individual_picks && pick.individual_picks.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <h4>Individual Picks</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${pick.individual_picks.map((individualPick, index) => {
                            let matchDateTime = '';
                            if (individualPick.match_date) {
                                const matchDate = new Date(individualPick.match_date);
                                matchDateTime = `<br><strong>Match Time:</strong> ${matchDate.toLocaleDateString()} at ${matchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                            }
                            return `
                            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                                <strong>Pick ${index + 1}:</strong> ${individualPick.match_description}<br>
                                <strong>Prediction:</strong> ${individualPick.prediction}<br>
                                <strong>Odds:</strong> ${parseFloat(individualPick.odds).toFixed(2)}${matchDateTime}
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
            `;
        }

        function viewTipsterProfile(username) {
            // This could be implemented to show tipster profile
            alert('View tipster profile: ' + username);
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

        document.getElementById('viewPickModal').onclick = function(e) {
            if (e.target === this) {
                hideViewPickModal();
            }
        };
    </script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
