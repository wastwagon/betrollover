<?php
/**
 * Admin Support - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/SupportService.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();
$supportService = SupportService::getInstance();
$logger = Logger::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get message from URL if redirected
if (isset($_GET['msg'])) {
    $message = $_GET['msg'];
}

// Get filter - must be defined before use
$filter = $_GET['filter'] ?? 'all';

// Get support tickets
$supportTickets = [];
$stats = [];

try {
    // Build query based on filter
    $whereClause = '';
    $params = [];
    
    switch ($filter) {
        case 'open':
            $whereClause = "WHERE status = 'open'";
            break;
        case 'in_progress':
            $whereClause = "WHERE status = 'in_progress'";
            break;
        case 'resolved':
            $whereClause = "WHERE status = 'resolved'";
            break;
        case 'closed':
            $whereClause = "WHERE status = 'closed'";
            break;
        case 'urgent':
            $whereClause = "WHERE priority = 'urgent'";
            break;
        case 'today':
            $whereClause = "WHERE DATE(created_at) = CURDATE()";
            break;
        default:
            $whereClause = "";
    }
    
    $supportTickets = $db->fetchAll("
        SELECT st.*, u.username, u.email
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        $whereClause
        ORDER BY st.created_at DESC
    ");
    
    // Get statistics
    $stats['total_tickets'] = $db->fetch("SELECT COUNT(*) as count FROM support_tickets")['count'];
    $stats['open_tickets'] = $db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'")['count'];
    $stats['in_progress_tickets'] = $db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'in_progress'")['count'];
    $stats['resolved_tickets'] = $db->fetch("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'resolved'")['count'];
    
} catch (Exception $e) {
    $supportTickets = [];
    $stats = ['total_tickets' => 0, 'open_tickets' => 0, 'in_progress_tickets' => 0, 'resolved_tickets' => 0];
}

// Handle support actions (if not already set from redirect)
if (!isset($message)) {
    $message = '';
}
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_ticket') {
        $ticketId = intval($_POST['ticket_id'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        $priority = trim($_POST['priority'] ?? '');
        $adminResponse = trim($_POST['admin_response'] ?? '');
        
        if ($ticketId && in_array($status, ['open', 'in_progress', 'resolved', 'closed'])) {
            try {
                // Update ticket status and priority
                $db->query("
                    UPDATE support_tickets 
                    SET status = ?, priority = ?, updated_at = NOW()
                    WHERE id = ?
                ", [$status, $priority, $ticketId]);
                
                // Add admin response if provided
                if (!empty($adminResponse)) {
                    $responseResult = $supportService->addResponse($ticketId, $userId, $adminResponse, false);
                    if (!$responseResult) {
                        $logger->error('Failed to add admin response', [
                            'ticket_id' => $ticketId,
                            'admin_id' => $userId
                        ]);
                    }
                }
                
                // Update resolved_at if status is resolved
                if ($status === 'resolved') {
                    $db->query("
                        UPDATE support_tickets 
                        SET resolved_at = NOW() 
                        WHERE id = ? AND resolved_at IS NULL
                    ", [$ticketId]);
                }
                
                $message = "Support ticket updated successfully.";
                
                // Redirect to prevent blank page and resubmission
                $redirectUrl = '/SmartPicksPro-Local/admin_support';
                if ($filter !== 'all') {
                    $redirectUrl .= '?filter=' . urlencode($filter);
                } else {
                    $redirectUrl .= '?';
                }
                $redirectUrl .= '&msg=' . urlencode($message);
                header('Location: ' . $redirectUrl);
                exit;
                
            } catch (Exception $e) {
                $error = "Error updating ticket: " . $e->getMessage();
                $logger->error('Error updating support ticket', [
                    'error' => $e->getMessage(),
                    'ticket_id' => $ticketId,
                    'admin_id' => $userId
                ]);
            }
        } else {
            $error = "Invalid ticket or status selected.";
        }
    }
}

// Set page variables
$pageTitle = "Support Management";

// Start content buffer
ob_start();
?>

<div class="admin-support-content">
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
        <h2><i class="fas fa-headset"></i> Support Management</h2>
        <p style="color: #666; margin-top: 10px;">Manage user support tickets and provide customer service.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['open_tickets']; ?></p>
                <p style="font-size: 14px; color: #666;">Open Tickets</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['in_progress_tickets']; ?></p>
                <p style="font-size: 14px; color: #666;">In Progress</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['resolved_tickets']; ?></p>
                <p style="font-size: 14px; color: #666;">Resolved</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_tickets']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Tickets</p>
            </div>
        </div>
    </div>
    
    <!-- Filter Options -->
    <div class="card">
        <h3><i class="fas fa-filter"></i> Filter Tickets</h3>
        <div style="margin-top: 15px;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="?filter=all" class="btn <?php echo $filter === 'all' ? 'btn-primary' : 'btn-secondary'; ?>">All</a>
                <a href="?filter=open" class="btn <?php echo $filter === 'open' ? 'btn-primary' : 'btn-secondary'; ?>">Open</a>
                <a href="?filter=in_progress" class="btn <?php echo $filter === 'in_progress' ? 'btn-primary' : 'btn-secondary'; ?>">In Progress</a>
                <a href="?filter=resolved" class="btn <?php echo $filter === 'resolved' ? 'btn-primary' : 'btn-secondary'; ?>">Resolved</a>
                <a href="?filter=closed" class="btn <?php echo $filter === 'closed' ? 'btn-primary' : 'btn-secondary'; ?>">Closed</a>
                <a href="?filter=urgent" class="btn <?php echo $filter === 'urgent' ? 'btn-primary' : 'btn-secondary'; ?>">Urgent</a>
                <a href="?filter=today" class="btn <?php echo $filter === 'today' ? 'btn-primary' : 'btn-secondary'; ?>">Today</a>
            </div>
        </div>
    </div>
    
    <!-- Support Tickets -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Support Tickets</h3>
        
        <?php if (empty($supportTickets)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-headset" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No support tickets found for the selected filter.</p>
        </div>
        <?php else: ?>
        
        <div style="margin-top: 15px;">
            <?php foreach ($supportTickets as $ticket): ?>
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="color: #d32f2f; margin-bottom: 5px;">
                            Ticket #<?php echo $ticket['id']; ?> - <?php echo htmlspecialchars($ticket['subject']); ?>
                        </h4>
                        <p style="color: #666; font-size: 14px;">
                            By <strong><?php echo htmlspecialchars($ticket['username']); ?></strong> • 
                            Created: <?php echo date('M j, Y g:i A', strtotime($ticket['created_at'])); ?>
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background-color: <?php echo $ticket['status'] === 'resolved' ? '#2e7d32' : ($ticket['status'] === 'closed' ? '#666' : '#d32f2f'); ?>; color: white; padding: 6px 12px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                            <?php echo $ticket['status']; ?>
                        </span>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            Priority: <span style="color: <?php echo $ticket['priority'] === 'urgent' ? '#d32f2f' : '#666'; ?>;"><?php echo ucfirst($ticket['priority']); ?></span>
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Issue Description</h5>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        <?php echo htmlspecialchars($ticket['description']); ?>
                    </p>
                </div>
                
                <?php 
                // Get ticket responses - show all responses in conversation
                $ticketResponses = $supportService->getTicket($ticket['id']);
                if ($ticketResponses && !empty($ticketResponses['responses'])): 
                ?>
                <div style="margin-bottom: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;"><i class="fas fa-comments"></i> Conversation</h5>
                    <?php foreach ($ticketResponses['responses'] as $response): 
                        $responder = $db->fetch("SELECT role, username, display_name FROM users WHERE id = ?", [$response['user_id']]);
                        $isAdmin = $responder && $responder['role'] === 'admin';
                        $responderName = $responder['display_name'] ?? $responder['username'] ?? 'User';
                    ?>
                    <div style="padding: 15px; background-color: <?php echo $isAdmin ? '#e3f2fd' : '#f5f5f5'; ?>; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid <?php echo $isAdmin ? '#1976d2' : '#666'; ?>;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong><?php echo htmlspecialchars($responderName); ?></strong>
                            <?php if ($isAdmin): ?>
                            <span style="background-color: #1976d2; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">Admin</span>
                            <?php endif; ?>
                            <span style="color: #666; font-size: 12px;"><?php echo date('M j, Y g:i A', strtotime($response['created_at'])); ?></span>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 0; white-space: pre-wrap;">
                            <?php echo nl2br(htmlspecialchars($response['message'])); ?>
                        </p>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
                
                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                    <h5 style="color: #d32f2f; margin-bottom: 10px;">Update Ticket</h5>
                    <form method="POST">
                        <input type="hidden" name="action" value="update_ticket">
                        <input type="hidden" name="ticket_id" value="<?php echo $ticket['id']; ?>">
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Status</label>
                                <select name="status" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                    <option value="open" <?php echo $ticket['status'] === 'open' ? 'selected' : ''; ?>>Open</option>
                                    <option value="in_progress" <?php echo $ticket['status'] === 'in_progress' ? 'selected' : ''; ?>>In Progress</option>
                                    <option value="resolved" <?php echo $ticket['status'] === 'resolved' ? 'selected' : ''; ?>>Resolved</option>
                                    <option value="closed" <?php echo $ticket['status'] === 'closed' ? 'selected' : ''; ?>>Closed</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Priority</label>
                                <select name="priority" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                                    <option value="low" <?php echo $ticket['priority'] === 'low' ? 'selected' : ''; ?>>Low</option>
                                    <option value="medium" <?php echo $ticket['priority'] === 'medium' ? 'selected' : ''; ?>>Medium</option>
                                    <option value="high" <?php echo $ticket['priority'] === 'high' ? 'selected' : ''; ?>>High</option>
                                    <option value="urgent" <?php echo $ticket['priority'] === 'urgent' ? 'selected' : ''; ?>>Urgent</option>
                                </select>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Admin Response</label>
                            <textarea name="admin_response" rows="4" 
                                      placeholder="Add your response to the user..."
                                      style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Update Ticket
                        </button>
                    </form>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Support Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Support Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-clock"></i> 
                Respond to urgent tickets within 2 hours, others within 24 hours.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-comment"></i> 
                Provide clear, helpful responses that address the user's concerns.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Mark tickets as resolved only when the issue is fully addressed.
            </p>
            <p style="color: #666;">
                <i class="fas fa-file-alt"></i> 
                Keep detailed records of all support interactions for quality assurance.
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
