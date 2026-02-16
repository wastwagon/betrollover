<?php
/**
 * Support - User and Tipster Support Ticket Management
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/SupportService.php';
require_once __DIR__ . '/../models/MailService.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::requireAuth();

// Detect base URL dynamically
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
$baseUrl = '';
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $baseUrl = '/SmartPicksPro-Local';
}

$db = Database::getInstance();
$supportService = SupportService::getInstance();
$logger = Logger::getInstance();
$mailService = MailService::getInstance();

// Get user info
$userId = $_SESSION['user_id'];
$userRole = $_SESSION['role'] ?? 'user';
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get wallet balance
$walletBalance = 0.00;
try {
    $result = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $result ? $result['balance'] : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Handle ticket creation and responses
$message = '';
$error = '';
$tickets = [];
$selectedTicket = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'create_ticket') {
        $subject = trim($_POST['subject'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $priority = $_POST['priority'] ?? 'medium';
        
        if (empty($subject) || empty($description)) {
            $error = "Please fill in all required fields.";
        } else {
            try {
                $ticketId = $supportService->createTicket($userId, $subject, $description, $priority);
                if ($ticketId) {
                    $message = "Support ticket created successfully! Ticket ID: #{$ticketId}. Admin will respond shortly.";
                    
                    // Send email notification to admin
                    try {
                        $mailResult = $mailService->sendEmail(
                            'admin@betrollover.com',
                            "New Support Ticket #{$ticketId} - {$subject}",
                            "
                            <html>
                            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                                    <h2 style='color: #d32f2f;'>New Support Ticket</h2>
                                    <p>A new support ticket has been created and requires your attention.</p>
                                    
                                    <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                                        <p><strong>Ticket ID:</strong> #{$ticketId}</p>
                                        <p><strong>Subject:</strong> {$subject}</p>
                                        <p><strong>Priority:</strong> " . ucfirst($priority) . "</p>
                                        <p><strong>User:</strong> " . htmlspecialchars($user['display_name'] ?? $user['username'] ?? 'Unknown') . "</p>
                                        <p><strong>Created:</strong> " . date('Y-m-d H:i:s') . "</p>
                                        <p><strong>Description:</strong></p>
                                        <p>" . nl2br(htmlspecialchars($description)) . "</p>
                                    </div>
                                    
                                    <p>
                                        <a href='" . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . "://" . $_SERVER['HTTP_HOST'] . $baseUrl . "/admin_support' 
                                           style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                                  text-decoration: none; border-radius: 5px; display: inline-block;'>
                                            View Ticket
                                        </a>
                                    </p>
                                    
                                    <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                                    <p style='font-size: 12px; color: #666;'>
                                        This is an automated notification from SmartPicks Pro.
                                    </p>
                                </div>
                            </body>
                            </html>
                            "
                        );
                        if (!$mailResult['success']) {
                            $logger->warning('Failed to send admin support ticket email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                        }
                    } catch (Exception $e) {
                        $logger->error('Error sending admin support ticket email', ['error' => $e->getMessage()]);
                    }
                } else {
                    $error = "Failed to create support ticket. Please try again.";
                }
            } catch (Exception $e) {
                $error = "Error creating ticket: " . $e->getMessage();
                $logger->error('Error creating support ticket', ['error' => $e->getMessage(), 'user_id' => $userId]);
            }
        }
    } elseif ($action === 'add_response') {
        $ticketId = (int)($_POST['ticket_id'] ?? 0);
        $responseMessage = trim($_POST['message'] ?? '');
        
        if ($ticketId && !empty($responseMessage)) {
            try {
                // Verify ticket belongs to user
                $ticket = $db->fetch("SELECT user_id FROM support_tickets WHERE id = ?", [$ticketId]);
                if ($ticket && $ticket['user_id'] == $userId) {
                    $result = $supportService->addResponse($ticketId, $userId, $responseMessage, false);
                    if ($result) {
                        $message = "Response added successfully.";
                    } else {
                        $error = "Failed to add response.";
                    }
                } else {
                    $error = "Ticket not found or access denied.";
                }
            } catch (Exception $e) {
                $error = "Error adding response: " . $e->getMessage();
            }
        } else {
            $error = "Please provide a message.";
        }
    }
}

// Get user's tickets
try {
    $tickets = $supportService->getTickets(['user_id' => $userId]);
} catch (Exception $e) {
    $logger->error('Error fetching support tickets', ['error' => $e->getMessage(), 'user_id' => $userId]);
    $tickets = [];
}

// Get selected ticket details if viewing
$viewTicketId = $_GET['ticket_id'] ?? null;
if ($viewTicketId) {
    $selectedTicket = $supportService->getTicket((int)$viewTicketId);
    // Verify ticket belongs to user
    if ($selectedTicket && $selectedTicket['user_id'] != $userId) {
        $selectedTicket = null;
        $error = "Ticket not found or access denied.";
    }
}

// Determine which layout to use
$layoutFile = $userRole === 'tipster' ? 'tipster_layout.php' : 'user_layout.php';
$layoutPath = __DIR__ . '/../views/layouts/' . $layoutFile;

// Set page variables
$pageTitle = "Support";
$walletBalance = 0.00;
try {
    $walletRow = $db->fetch("SELECT balance FROM user_wallets WHERE user_id = ?", [$userId]);
    $walletBalance = $walletRow ? floatval($walletRow['balance']) : 0.00;
} catch (Exception $e) {
    $walletBalance = 0.00;
}

// Start content buffer
ob_start();
?>

<div class="<?php echo $userRole === 'tipster' ? 'tipster-dashboard-content' : 'user-dashboard-content'; ?>">
    <?php if ($error): ?>
    <div class="card" style="background-color: #ffebee; border-left: 4px solid #d32f2f; margin-bottom: 20px;">
        <p style="color: #d32f2f; margin: 0;"><i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if ($message): ?>
    <div class="card" style="background-color: #e8f5e8; border-left: 4px solid #2e7d32; margin-bottom: 20px;">
        <p style="color: #2e7d32; margin: 0;"><i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($message); ?></p>
    </div>
    <?php endif; ?>
    
    <?php if (!$viewTicketId): ?>
    <!-- Support Dashboard -->
    <div class="card">
        <h2><i class="fas fa-headset"></i> Support Center</h2>
        <p style="color: #666; margin-top: 10px;">Create a support ticket or view your existing tickets.</p>
    </div>
    
    <!-- Create New Ticket -->
    <div class="card">
        <h3><i class="fas fa-plus-circle"></i> Create New Support Ticket</h3>
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="create_ticket">
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Subject *</label>
                <input type="text" name="subject" required
                       placeholder="Brief description of your issue"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"
                       value="<?php echo htmlspecialchars($_POST['subject'] ?? ''); ?>">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Priority</label>
                <select name="priority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <option value="low" <?php echo ($_POST['priority'] ?? 'medium') === 'low' ? 'selected' : ''; ?>>Low</option>
                    <option value="medium" <?php echo ($_POST['priority'] ?? 'medium') === 'medium' ? 'selected' : ''; ?>>Medium</option>
                    <option value="high" <?php echo ($_POST['priority'] ?? 'medium') === 'high' ? 'selected' : ''; ?>>High</option>
                    <option value="urgent" <?php echo ($_POST['priority'] ?? 'medium') === 'urgent' ? 'selected' : ''; ?>>Urgent</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Description *</label>
                <textarea name="description" required rows="6"
                          placeholder="Please provide detailed information about your issue..."
                          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"><?php echo htmlspecialchars($_POST['description'] ?? ''); ?></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i> Submit Ticket
            </button>
        </form>
    </div>
    
    <!-- My Tickets -->
    <div class="card">
        <h3><i class="fas fa-ticket-alt"></i> My Support Tickets</h3>
        
        <?php if (empty($tickets)): ?>
        <p style="color: #666; margin-top: 20px; text-align: center; padding: 40px;">
            <i class="fas fa-inbox" style="font-size: 48px; color: #ddd; margin-bottom: 15px; display: block;"></i>
            No support tickets yet. Create your first ticket above.
        </p>
        <?php else: ?>
        <div style="margin-top: 20px; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Ticket ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Subject</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Priority</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Created</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($tickets as $ticket): 
                        $priorityColors = [
                            'urgent' => '#d32f2f',
                            'high' => '#f57c00',
                            'medium' => '#fbc02d',
                            'low' => '#388e3c'
                        ];
                        $statusColors = [
                            'open' => '#1976d2',
                            'in_progress' => '#f57c00',
                            'resolved' => '#388e3c',
                            'closed' => '#616161'
                        ];
                        $priorityColor = $priorityColors[$ticket['priority'] ?? 'medium'] ?? '#666';
                        $statusColor = $statusColors[$ticket['status'] ?? 'open'] ?? '#666';
                    ?>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">#<?php echo $ticket['id']; ?></td>
                        <td style="padding: 12px;">
                            <strong><?php echo htmlspecialchars($ticket['subject']); ?></strong>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $priorityColor; ?>; color: white; padding: 4px 10px; border-radius: 3px; font-size: 12px; font-weight: 500;">
                                <?php echo ucfirst($ticket['priority'] ?? 'medium'); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $statusColor; ?>; color: white; padding: 4px 10px; border-radius: 3px; font-size: 12px; font-weight: 500;">
                                <?php echo ucfirst(str_replace('_', ' ', $ticket['status'] ?? 'open')); ?>
                            </span>
                        </td>
                        <td style="padding: 12px; color: #666;">
                            <?php echo date('M d, Y H:i', strtotime($ticket['created_at'])); ?>
                        </td>
                        <td style="padding: 12px;">
                            <a href="?ticket_id=<?php echo $ticket['id']; ?>" class="btn btn-primary" style="padding: 6px 12px; font-size: 14px;">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>
    
    <?php else: ?>
    <!-- View Ticket Details -->
    <?php if ($selectedTicket): ?>
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
                <h2 style="margin: 0;">Ticket #<?php echo $selectedTicket['id']; ?></h2>
                <p style="color: #666; margin-top: 5px;"><?php echo htmlspecialchars($selectedTicket['subject']); ?></p>
            </div>
            <a href="<?= $baseUrl ?>/support" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Back to Tickets
            </a>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
            <div>
                <strong>Priority:</strong>
                <?php
                $priorityColors = [
                    'urgent' => '#d32f2f',
                    'high' => '#f57c00',
                    'medium' => '#fbc02d',
                    'low' => '#388e3c'
                ];
                $priorityColor = $priorityColors[$selectedTicket['priority'] ?? 'medium'] ?? '#666';
                ?>
                <span style="background-color: <?php echo $priorityColor; ?>; color: white; padding: 4px 10px; border-radius: 3px; font-size: 12px; font-weight: 500;">
                    <?php echo ucfirst($selectedTicket['priority'] ?? 'medium'); ?>
                </span>
            </div>
            <div>
                <strong>Status:</strong>
                <?php
                $statusColors = [
                    'open' => '#1976d2',
                    'in_progress' => '#f57c00',
                    'resolved' => '#388e3c',
                    'closed' => '#616161'
                ];
                $statusColor = $statusColors[$selectedTicket['status'] ?? 'open'] ?? '#666';
                ?>
                <span style="background-color: <?php echo $statusColor; ?>; color: white; padding: 4px 10px; border-radius: 3px; font-size: 12px; font-weight: 500;">
                    <?php echo ucfirst(str_replace('_', ' ', $selectedTicket['status'] ?? 'open')); ?>
                </span>
            </div>
            <div>
                <strong>Created:</strong> <?php echo date('M d, Y H:i', strtotime($selectedTicket['created_at'])); ?>
            </div>
            <?php if ($selectedTicket['resolved_at']): ?>
            <div>
                <strong>Resolved:</strong> <?php echo date('M d, Y H:i', strtotime($selectedTicket['resolved_at'])); ?>
            </div>
            <?php endif; ?>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin-top: 0;">Description</h4>
            <p style="white-space: pre-wrap;"><?php echo nl2br(htmlspecialchars($selectedTicket['description'])); ?></p>
        </div>
        
        <!-- Responses -->
        <div style="margin-bottom: 30px;">
            <h3><i class="fas fa-comments"></i> Conversation</h3>
            
            <?php if (!empty($selectedTicket['responses'])): ?>
                <?php foreach ($selectedTicket['responses'] as $response): 
                    $isAdmin = $db->fetch("SELECT role FROM users WHERE id = ?", [$response['user_id']])['role'] ?? '' === 'admin';
                ?>
                <div style="background-color: <?php echo $isAdmin ? '#e3f2fd' : '#f5f5f5'; ?>; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid <?php echo $isAdmin ? '#1976d2' : '#666'; ?>;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong><?php echo htmlspecialchars($response['display_name'] ?? $response['username'] ?? 'User'); ?></strong>
                        <?php if ($isAdmin): ?>
                        <span style="background-color: #1976d2; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">Admin</span>
                        <?php endif; ?>
                        <span style="color: #666; font-size: 12px;"><?php echo date('M d, Y H:i', strtotime($response['created_at'])); ?></span>
                    </div>
                    <p style="margin: 0; white-space: pre-wrap;"><?php echo nl2br(htmlspecialchars($response['message'])); ?></p>
                </div>
                <?php endforeach; ?>
            <?php else: ?>
            <p style="color: #666; text-align: center; padding: 20px;">
                No responses yet. Admin will respond shortly.
            </p>
            <?php endif; ?>
        </div>
        
        <!-- Add Response -->
        <?php if ($selectedTicket['status'] !== 'closed'): ?>
        <div class="card">
            <h3><i class="fas fa-reply"></i> Add Response</h3>
            <form method="POST" style="margin-top: 20px;">
                <input type="hidden" name="action" value="add_response">
                <input type="hidden" name="ticket_id" value="<?php echo $selectedTicket['id']; ?>">
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Your Message</label>
                    <textarea name="message" required rows="4"
                              placeholder="Add additional information or ask a question..."
                              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-paper-plane"></i> Send Response
                </button>
            </form>
        </div>
        <?php endif; ?>
    </div>
    <?php else: ?>
    <div class="card">
        <p style="color: #d32f2f;"><i class="fas fa-exclamation-circle"></i> Ticket not found or access denied.</p>
        <a href="/SmartPicksPro-Local/support" class="btn btn-secondary" style="margin-top: 15px;">
            <i class="fas fa-arrow-left"></i> Back to Tickets
        </a>
    </div>
    <?php endif; ?>
    <?php endif; ?>
</div>

<?php
// Get the content
$content = ob_get_clean();

// Include appropriate layout
include $layoutPath;
?>

