<?php
/**
 * Admin Mentorship - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

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

// Get mentorship data
$mentorshipPrograms = [];
$mentorshipRequests = [];
$stats = [];

try {
    // Get mentorship programs
    $mentorshipPrograms = $db->fetchAll("
        SELECT mp.*, u.username as mentor_name
        FROM mentorship_programs mp
        JOIN users u ON mp.mentor_id = u.id
        ORDER BY mp.created_at DESC
    ");
    
    // Get mentorship requests
    $mentorshipRequests = $db->fetchAll("
        SELECT mr.*, u1.username as mentee_name, u2.username as mentor_name
        FROM mentorship_requests mr
        JOIN users u1 ON mr.mentee_id = u1.id
        LEFT JOIN users u2 ON mr.mentor_id = u2.id
        ORDER BY mr.created_at DESC
    ");
    
    // Get statistics
    $stats['total_programs'] = count($mentorshipPrograms);
    $stats['active_programs'] = count(array_filter($mentorshipPrograms, function($program) { return $program['status'] === 'active'; }));
    $stats['total_requests'] = count($mentorshipRequests);
    $stats['pending_requests'] = count(array_filter($mentorshipRequests, function($request) { return $request['status'] === 'pending'; }));
    
} catch (Exception $e) {
    $mentorshipPrograms = [];
    $mentorshipRequests = [];
    $stats = ['total_programs' => 0, 'active_programs' => 0, 'total_requests' => 0, 'pending_requests' => 0];
}

// Handle mentorship actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'create_program') {
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $mentorId = intval($_POST['mentor_id'] ?? 0);
        $maxMentees = intval($_POST['max_mentees'] ?? 0);
        
        if ($title && $description && $mentorId && $maxMentees > 0) {
            try {
                $db->execute("
                    INSERT INTO mentorship_programs (title, description, mentor_id, max_mentees, status, created_by, created_at) 
                    VALUES (?, ?, ?, ?, 'active', ?, NOW())
                ", [$title, $description, $mentorId, $maxMentees, $userId]);
                
                $message = "Mentorship program created successfully.";
                
                // Refresh programs
                $mentorshipPrograms = $db->fetchAll("
                    SELECT mp.*, u.username as mentor_name
                    FROM mentorship_programs mp
                    JOIN users u ON mp.mentor_id = u.id
                    ORDER BY mp.created_at DESC
                ");
                
            } catch (Exception $e) {
                $error = "Error creating program: " . $e->getMessage();
            }
        } else {
            $error = "Please fill in all required fields.";
        }
    }
    
    if ($action === 'process_request') {
        $requestId = intval($_POST['request_id'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        $adminNotes = trim($_POST['admin_notes'] ?? '');
        
        if ($requestId && in_array($status, ['approved', 'rejected'])) {
            try {
                $db->execute("
                    UPDATE mentorship_requests 
                    SET status = ?, admin_notes = ?, processed_at = NOW(), processed_by = ?
                    WHERE id = ?
                ", [$status, $adminNotes, $userId, $requestId]);
                
                $message = "Mentorship request " . $status . " successfully.";
                
                // Refresh requests
                $mentorshipRequests = $db->fetchAll("
                    SELECT mr.*, u1.username as mentee_name, u2.username as mentor_name
                    FROM mentorship_requests mr
                    JOIN users u1 ON mr.mentee_id = u1.id
                    LEFT JOIN users u2 ON mr.mentor_id = u2.id
                    ORDER BY mr.created_at DESC
                ");
                
            } catch (Exception $e) {
                $error = "Error processing request: " . $e->getMessage();
            }
        } else {
            $error = "Invalid request or status selected.";
        }
    }
}

// Get tipsters for mentor selection
$tipsters = [];
try {
    $tipsters = $db->fetchAll("
        SELECT id, username, email
        FROM users 
        WHERE role = 'tipster' 
        ORDER BY username
    ");
} catch (Exception $e) {
    $tipsters = [];
}

// Set page variables
$pageTitle = "Mentorship Management";

// Start content buffer
ob_start();
?>

<div class="admin-mentorship-content">
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
        <h2><i class="fas fa-graduation-cap"></i> Mentorship Management</h2>
        <p style="color: #666; margin-top: 10px;">Manage mentorship programs and facilitate knowledge sharing between experienced and new tipsters.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_programs']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Programs</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['active_programs']; ?></p>
                <p style="font-size: 14px; color: #666;">Active Programs</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['total_requests']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Requests</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['pending_requests']; ?></p>
                <p style="font-size: 14px; color: #666;">Pending Requests</p>
            </div>
        </div>
    </div>
    
    <!-- Create Program -->
    <div class="card">
        <h3><i class="fas fa-plus"></i> Create Mentorship Program</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="create_program">
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Program Title</label>
                <input type="text" name="title" required
                       placeholder="Enter program title"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Description</label>
                <textarea name="description" rows="4" required
                          placeholder="Describe the mentorship program..."
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Mentor</label>
                    <select name="mentor_id" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="">Select Mentor</option>
                        <?php foreach ($tipsters as $tipster): ?>
                        <option value="<?php echo $tipster['id']; ?>">
                            <?php echo htmlspecialchars($tipster['username']); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Max Mentees</label>
                    <input type="number" name="max_mentees" min="1" max="10" required
                           placeholder="5"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i> Create Program
            </button>
        </form>
    </div>
    
    <!-- Mentorship Programs -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Mentorship Programs</h3>
        
        <?php if (empty($mentorshipPrograms)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-graduation-cap" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No mentorship programs found.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($mentorshipPrograms as $program): ?>
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: #d32f2f; margin-bottom: 5px;">
                            <?php echo htmlspecialchars($program['title']); ?>
                        </h4>
                        <p style="color: #666; font-size: 14px;">
                            Mentor: <strong><?php echo htmlspecialchars($program['mentor_name']); ?></strong> • 
                            Created: <?php echo date('M j, Y g:i A', strtotime($program['created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background-color: <?php echo $program['status'] === 'active' ? '#2e7d32' : '#666'; ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                            <?php echo $program['status']; ?>
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Description</h5>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <?php echo htmlspecialchars($program['description']); ?>
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 15px;">
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Max Mentees</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo $program['max_mentees']; ?>
                        </p>
                    </div>
                    
                    <div>
                        <h5 style="color: #d32f2f; margin-bottom: 10px;">Current Mentees</h5>
                        <p style="color: #666; font-size: 14px;">
                            <?php echo $program['current_mentees'] ?? 0; ?>
                        </p>
                    </div>
                </div>
                
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <button type="button" class="btn btn-secondary" onclick="viewProgramDetails(<?php echo $program['id']; ?>)">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button type="button" class="btn btn-primary" onclick="manageProgram(<?php echo $program['id']; ?>)">
                        <i class="fas fa-cog"></i> Manage
                    </button>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Mentorship Requests -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Mentorship Requests</h3>
        
        <?php if (empty($mentorshipRequests)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-graduation-cap" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No mentorship requests found.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($mentorshipRequests as $request): ?>
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: #d32f2f; margin-bottom: 5px;">
                            Request from <?php echo htmlspecialchars($request['mentee_name']); ?>
                        </h4>
                        <p style="color: #666; font-size: 14px;">
                            <?php if ($request['mentor_name']): ?>
                                Mentor: <strong><?php echo htmlspecialchars($request['mentor_name']); ?></strong> • 
                            <?php endif; ?>
                            Created: <?php echo date('M j, Y g:i A', strtotime($request['created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background-color: <?php echo $request['status'] === 'approved' ? '#2e7d32' : ($request['status'] === 'rejected' ? '#d32f2f' : '#d32f2f'); ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                            <?php echo $request['status']; ?>
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Request Details</h5>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <?php echo htmlspecialchars($request['message']); ?>
                    </p>
                </div>
                
                <?php if ($request['status'] === 'pending'): ?>
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Process Request</h5>
                    <form method="POST">
                        <input type="hidden" name="action" value="process_request">
                        <input type="hidden" name="request_id" value="<?php echo $request['id']; ?>">
                        
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
                            <i class="fas fa-check"></i> Process Request
                        </button>
                    </form>
                </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Mentorship Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Mentorship Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-graduation-cap"></i> 
                Mentorship programs help new tipsters learn from experienced professionals.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-users"></i> 
                Match mentees with appropriate mentors based on expertise and availability.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Review mentorship requests to ensure quality matches and program success.
            </p>
            <p style="color: #666;">
                <i class="fas fa-chart-line"></i> 
                Monitor program effectiveness and adjust based on participant feedback.
            </p>
        </div>
    </div>
</div>

<script>
function viewProgramDetails(programId) {
    // Simple implementation - can be enhanced with modal or new page
    alert('Program details view will be implemented for program ID: ' + programId);
}

function manageProgram(programId) {
    // Simple implementation - can be enhanced with modal or new page
    alert('Program management will be implemented for program ID: ' + programId);
}
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

