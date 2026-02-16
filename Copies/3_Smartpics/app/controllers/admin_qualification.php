<?php
/**
 * Admin Qualification Management - Complete Feature Version
 * Uses the new layout system with full tipster qualification management
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/TipsterQualificationService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$qualificationService = TipsterQualificationService::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

$error = '';
$success = '';
$tipsters = [];
$qualificationSettings = [];

try {
    // Get qualification settings
    $qualificationSettings = $qualificationService->getQualificationSettings();
    
    // Get all tipsters with their qualification status (fixed duplicate issue)
    $tipsters = $db->fetchAll("
        SELECT DISTINCT
            u.id,
            u.username,
            u.email,
            u.display_name,
            u.created_at,
            u.role,
            COUNT(at.id) as total_picks,
            COUNT(CASE WHEN at.price = 0 THEN 1 END) as free_picks,
            COUNT(CASE WHEN at.result = 'won' AND at.price = 0 THEN 1 END) as won_free_picks
        FROM users u
        LEFT JOIN accumulator_tickets at ON u.id = at.user_id 
            AND at.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND at.status IN ('settled', 'won', 'lost', 'void')
        WHERE u.role = 'tipster'
        GROUP BY u.id, u.username, u.email, u.display_name, u.created_at, u.role
        ORDER BY u.username ASC
    ", [$qualificationSettings['period_days']]);
    
    // Add qualification status to each tipster
    foreach ($tipsters as &$tipster) {
        $qualificationStatus = $qualificationService->getTipsterQualificationStatus($tipster['id']);
        $tipster['qualification_status'] = $qualificationStatus;
        
        // Get detailed performance data
        $performance = $qualificationService->getTipsterFreePicksPerformance($tipster['id'], $qualificationSettings['period_days']);
        $tipster['performance'] = $performance;
    }
    
} catch (Exception $e) {
    $error = 'Error loading qualification data: ' . $e->getMessage();
    $logger->error('Qualification data loading failed', ['error' => $e->getMessage()]);
}

// Handle qualification actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $tipsterId = $_POST['tipster_id'] ?? '';
    
    if ($action === 'override_qualification' && $tipsterId) {
        $overrideReason = $_POST['override_reason'] ?? '';
        try {
            // Log the override action
            $db->execute("
                INSERT INTO activity_logs (user_id, action, description, metadata) 
                VALUES (?, 'qualification_override', ?, ?)
            ", [
                $userId, 
                "Admin overrode qualification for tipster ID: $tipsterId", 
                json_encode(['tipster_id' => $tipsterId, 'reason' => $overrideReason])
            ]);
            
            $success = 'Qualification override logged successfully!';
            
        } catch (Exception $e) {
            $error = 'Error logging qualification override: ' . $e->getMessage();
        }
    }
}

// Set page variables
$pageTitle = "Tipster Qualification Management";

// Start content buffer
ob_start();
?>

<div class="admin-qualification-content">
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
        <h2><i class="fas fa-user-check"></i> Tipster Qualification Management</h2>
        <p style="color: #666; margin-top: 10px;">Monitor and manage tipster qualification status for marketplace access.</p>
    </div>
    
    <!-- Qualification Settings Overview -->
    <div class="card">
        <h3><i class="fas fa-cog"></i> Current Qualification Settings</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 15px;">
            <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="font-size: 24px; font-weight: bold; color: <?php echo $qualificationSettings['enabled'] ? '#2e7d32' : '#d32f2f'; ?>;">
                    <?php echo $qualificationSettings['enabled'] ? 'ENABLED' : 'DISABLED'; ?>
                </p>
                <p style="font-size: 14px; color: #666;">Qualification System</p>
            </div>
            
            <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="font-size: 24px; font-weight: bold; color: #d32f2f;">
                    <?php echo $qualificationSettings['min_free_picks']; ?>
                </p>
                <p style="font-size: 14px; color: #666;">Min Free Picks</p>
            </div>
            
            <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="font-size: 24px; font-weight: bold; color: #d32f2f;">
                    <?php echo $qualificationSettings['min_roi_percentage']; ?>%
                </p>
                <p style="font-size: 14px; color: #666;">Min ROI Required</p>
            </div>
            
            <div style="text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="font-size: 24px; font-weight: bold; color: #d32f2f;">
                    <?php echo $qualificationSettings['period_days']; ?>
                </p>
                <p style="font-size: 14px; color: #666;">Period (Days)</p>
            </div>
        </div>
        
        <div style="margin-top: 15px;">
            <a href="/SmartPicksPro-Local/admin_growth_settings" class="btn btn-primary" style="padding: 8px 16px; background-color: #d32f2f; color: white; border: none; border-radius: 4px; text-decoration: none;">
                <i class="fas fa-cog"></i> Manage Settings
            </a>
        </div>
    </div>
    
    <!-- Tipster Qualification Status -->
    <div class="card">
        <h3><i class="fas fa-users"></i> Tipster Qualification Status</h3>
        
        <?php if (empty($tipsters)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-users" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h4>No Tipsters Found</h4>
            <p>No tipsters registered in the system.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Tipster</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Free Picks</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">ROI %</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Win Rate</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Can Sell</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($tipsters as $tipster): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px;">
                            <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($tipster['username']); ?></p>
                            <p style="font-size: 12px; color: #666;"><?php echo htmlspecialchars($tipster['email']); ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <?php
                            $status = $tipster['qualification_status']['status'];
                            $statusColor = $status === 'qualified' ? '#2e7d32' : ($status === 'roi_fell_below' ? '#d32f2f' : '#d32f2f');
                            $statusText = $status === 'qualified' ? 'Qualified' : ($status === 'roi_fell_below' ? 'ROI Fell Below' : 'Not Qualified');
                            ?>
                            <span style="background-color: <?php echo $statusColor; ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                                <?php echo $statusText; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: 500;">
                                <?php echo $tipster['performance']['total_free_picks']; ?>
                                <?php if ($tipster['performance']['total_free_picks'] < $qualificationSettings['min_free_picks']): ?>
                                <span style="color: #d32f2f;">(Need <?php echo $qualificationSettings['min_free_picks'] - $tipster['performance']['total_free_picks']; ?> more)</span>
                                <?php endif; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: 500; color: <?php echo $tipster['performance']['roi_percentage'] >= $qualificationSettings['min_roi_percentage'] ? '#2e7d32' : '#d32f2f'; ?>;">
                                <?php echo $tipster['performance']['roi_percentage']; ?>%
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: 500;">
                                <?php echo $tipster['performance']['win_rate']; ?>%
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="color: <?php echo $tipster['qualification_status']['can_sell'] ? '#2e7d32' : '#d32f2f'; ?>;">
                                <i class="fas fa-<?php echo $tipster['qualification_status']['can_sell'] ? 'check' : 'times'; ?>"></i>
                                <?php echo $tipster['qualification_status']['can_sell'] ? 'Yes' : 'No'; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <button class="btn btn-info" style="padding: 4px 8px; font-size: 12px; margin: 2px;" onclick="viewTipsterDetails(<?php echo $tipster['id']; ?>)">
                                <i class="fas fa-eye"></i> Details
                            </button>
                            <?php if (!$tipster['qualification_status']['can_sell']): ?>
                            <button class="btn btn-warning" style="padding: 4px 8px; font-size: 12px; margin: 2px;" onclick="overrideQualification(<?php echo $tipster['id']; ?>)">
                                <i class="fas fa-unlock"></i> Override
                            </button>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Qualification Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Qualification Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-chart-line"></i> 
                <strong>ROI Monitoring:</strong> Tipster ROI is monitored continuously. If it falls below the minimum, marketplace access is automatically revoked.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-gift"></i> 
                <strong>Free Picks:</strong> Only picks with price = 0 or is_marketplace = 0 count toward qualification requirements.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-calendar"></i> 
                <strong>Period Calculation:</strong> All calculations are based on the specified qualification period in days.
            </p>
            <p style="color: #666;">
                <i class="fas fa-shield-alt"></i> 
                <strong>Admin Override:</strong> Admins can override qualification status for special circumstances, but this is logged for audit purposes.
            </p>
        </div>
    </div>
</div>

<!-- Tipster Details Modal -->
<div id="tipsterDetailsModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 500px; max-width: 80%; max-height: 80%; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Tipster Qualification Details</h3>
            <span style="color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="hideTipsterDetailsModal()">&times;</span>
        </div>
        <div id="tipsterDetailsContent">
            <!-- Content will be loaded here -->
        </div>
    </div>
</div>

<!-- Override Modal -->
<div id="overrideModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000;">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; min-width: 400px;">
        <h3>Override Qualification</h3>
        <p>Are you sure you want to override this tipster's qualification status?</p>
        <form method="POST" id="overrideForm">
            <input type="hidden" name="action" value="override_qualification">
            <input type="hidden" name="tipster_id" id="overrideTipsterId">
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Override Reason:</label>
                <textarea name="override_reason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" placeholder="Please provide a reason for this override..." required></textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" onclick="hideOverrideModal()" class="btn btn-secondary" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Cancel</button>
                <button type="submit" class="btn btn-warning" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #ffc107; color: #212529;">Override</button>
            </div>
        </form>
    </div>
</div>

<script>
function viewTipsterDetails(tipsterId) {
    // Simple implementation - can be enhanced with AJAX
    document.getElementById('tipsterDetailsContent').innerHTML = '<p>Loading tipster details for ID: ' + tipsterId + '</p>';
    document.getElementById('tipsterDetailsModal').style.display = 'block';
}

function hideTipsterDetailsModal() {
    document.getElementById('tipsterDetailsModal').style.display = 'none';
}

function overrideQualification(tipsterId) {
    document.getElementById('overrideTipsterId').value = tipsterId;
    document.getElementById('overrideModal').style.display = 'block';
}

function hideOverrideModal() {
    document.getElementById('overrideModal').style.display = 'none';
}

// Close modals when clicking outside
document.getElementById('tipsterDetailsModal').onclick = function(e) {
    if (e.target === this) {
        hideTipsterDetailsModal();
    }
};

document.getElementById('overrideModal').onclick = function(e) {
    if (e.target === this) {
        hideOverrideModal();
    }
};
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
