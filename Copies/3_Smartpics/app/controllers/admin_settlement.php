<?php
/**
 * Admin Settlement - Complete Feature Version
 * Uses the new layout system with full functionality from old system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/AccumulatorSettlement.php';
require_once __DIR__ . '/../models/EscrowManager.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/MailService.php';
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
$settlement = new AccumulatorSettlement();
$escrowManager = EscrowManager::getInstance();
$logger = Logger::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get unsettled accumulator tickets (grouped picks)
$unsettledTickets = [];
$stats = [];

try {
    // Get unsettled accumulator tickets with their individual picks
    $unsettledTickets = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.description,
            at.total_odds,
            at.price,
            at.status,
            at.created_at,
            u.username as tipster_name,
            u.display_name as tipster_display_name,
            COUNT(ap.id) as picks_count
        FROM accumulator_tickets at
        JOIN users u ON at.user_id = u.id
        LEFT JOIN accumulator_picks ap ON at.id = ap.accumulator_id
        WHERE at.status = 'active'
        GROUP BY at.id
        ORDER BY at.created_at DESC
    ");
    
    // Get statistics from accumulator_tickets table
    $stats['total_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets")['count'];
    $stats['unsettled_picks'] = count($unsettledTickets);
    $stats['won_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE result = 'won'")['count'];
    $stats['lost_picks'] = $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE result = 'lost'")['count'];
    
} catch (Exception $e) {
    $unsettledTickets = [];
    $stats = ['total_picks' => 0, 'unsettled_picks' => 0, 'won_picks' => 0, 'lost_picks' => 0];
}

// Handle settlement actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['action'])) {
        try {
            switch ($_POST['action']) {
                case 'settle_selection':
                    $selectionId = (int)$_POST['selection_id'];
                    $result = $_POST['result'];
                    $notes = $_POST['notes'] ?? '';
                    
                    // Simple settlement - just update the accumulator_tickets table
                    $db->query("
                        UPDATE accumulator_tickets 
                        SET status = ?, 
                            result = ?,
                            settled_at = NOW()
                        WHERE id = ?
                    ", [$result, $result, $selectionId]);
                    
                    // Automatically settle escrow for this pick (if result is won or lost)
                    if (in_array($result, ['won', 'lost'])) {
                        $escrowResult = $escrowManager->autoSettleEscrow($selectionId, $result, $_SESSION['user_id'], $notes);
                        if ($escrowResult['success']) {
                            $message = "Pick settled successfully as {$result}. Escrow automatically settled.";
                        } else {
                            $message = "Pick settled successfully as {$result}. Escrow settlement: {$escrowResult['message']}";
                        }
                    } else {
                        $message = "Pick settled successfully as {$result}";
                    }
                    break;
                    
                case 'settle_accumulator':
                    $pickId = (int)$_POST['pick_id'];
                    $result = $_POST['result'];
                    $notes = $_POST['notes'] ?? '';
                    
                    // Settle the accumulator
                    $settlement->settleAccumulator($pickId, $result, $_SESSION['user_id'], $notes);
                    
                    // Automatically settle escrow for this pick
                    $escrowResult = $escrowManager->autoSettleEscrow($pickId, $result, $_SESSION['user_id'], $notes);
                    
                    if ($escrowResult['success']) {
                        $escrowMessage = "Escrow automatically settled: ";
                        foreach ($escrowResult['settlements'] as $settlement) {
                            if ($settlement['type'] === 'won') {
                                $escrowMessage .= "Tipster earned GHS {$settlement['net_amount']} (Commission: GHS {$settlement['commission']}). ";
                            } else {
                                $escrowMessage .= "Buyer refunded GHS {$settlement['refund_amount']}. ";
                            }
                        }
                        $message = "Accumulator settled successfully as {$result}. {$escrowMessage}";
                    } else {
                        $message = "Accumulator settled successfully as {$result}. Escrow settlement: {$escrowResult['message']}";
                    }
                    break;
                    
                case 'settle_ticket':
                    $ticketId = (int)$_POST['ticket_id'];
                    $notes = $_POST['notes'] ?? '';
                    
                    // Get all pick results from the form
                    $pickResults = [];
                    foreach ($_POST as $key => $value) {
                        if (strpos($key, 'pick_result_') === 0) {
                            $pickId = str_replace('pick_result_', '', $key);
                            $pickResults[$pickId] = $value;
                        }
                    }
                    
                    if (empty($pickResults)) {
                        throw new Exception('No pick results provided');
                    }
                    
                    // Determine overall ticket result
                    $overallResult = 'won';
                    foreach ($pickResults as $pickId => $result) {
                        if ($result === 'lost') {
                            $overallResult = 'lost';
                            break; // If any pick is lost, entire ticket is lost
                        } elseif ($result === 'void') {
                            $overallResult = 'void';
                        }
                    }
                    
                    // Update individual picks
                    foreach ($pickResults as $pickId => $result) {
                        $db->query("
                            UPDATE accumulator_picks 
                            SET result = ?, updated_at = NOW()
                            WHERE id = ?
                        ", [$result, $pickId]);
                    }
                    
                    // Update accumulator ticket
                    $db->query("
                        UPDATE accumulator_tickets 
                        SET status = ?, 
                            result = ?,
                            settled_at = NOW(),
                            updated_at = NOW()
                        WHERE id = ?
                    ", [$overallResult, $overallResult, $ticketId]);
                    
                    // Handle escrow settlement
                    $escrowResult = $escrowManager->autoSettleEscrow($ticketId, $overallResult, $_SESSION['user_id'], $notes);
                    
                    $earnings = 0;
                    if ($escrowResult['success']) {
                        $escrowMessage = "Escrow automatically settled: ";
                        foreach ($escrowResult['settlements'] as $settlement) {
                            if ($settlement['type'] === 'won') {
                                $earnings += $settlement['net_amount'] ?? 0;
                                $escrowMessage .= "Tipster earned GHS {$settlement['net_amount']} (Commission: GHS {$settlement['commission']}). ";
                            } else {
                                $escrowMessage .= "Buyer refunded GHS {$settlement['refund_amount']}. ";
                            }
                        }
                        $message = "Ticket settled successfully as {$overallResult}. {$escrowMessage}";
                    } else {
                        $message = "Ticket settled successfully as {$overallResult}. Escrow settlement: {$escrowResult['message']}";
                    }
                    
                    // Send email notification to tipster when pick is settled
                    if (in_array($overallResult, ['won', 'lost'])) {
                        try {
                            $pickInfo = $db->fetch("SELECT title, user_id FROM accumulator_tickets WHERE id = ?", [$ticketId]);
                            if ($pickInfo) {
                                $mailService = MailService::getInstance();
                                $mailResult = $mailService->notifyTipsterPickSettled(
                                    (int)$pickInfo['user_id'],
                                    $ticketId,
                                    $pickInfo['title'],
                                    $overallResult,
                                    $earnings
                                );
                                if (!$mailResult['success']) {
                                    $logger->warning('Failed to send tipster pick settled email', ['error' => $mailResult['message'] ?? 'Unknown error']);
                                }
                            }
                        } catch (Exception $e) {
                            // Don't fail settlement if email fails
                            $logger->error('Error sending tipster pick settled email', ['error' => $e->getMessage()]);
                        }
                    }
                    
                    $logger->info('Ticket settled', [
                        'admin_id' => $_SESSION['user_id'],
                        'ticket_id' => $ticketId,
                        'result' => $overallResult,
                        'pick_results' => $pickResults,
                        'notes' => $notes
                    ]);
                    break;
            }
            
            // Refresh unsettled tickets after settlement
            $unsettledTickets = $db->fetchAll("
                SELECT 
                    at.id,
                    at.title,
                    at.description,
                    at.total_odds,
                    at.price,
                    at.status,
                    at.created_at,
                    u.username as tipster_name,
                    u.display_name as tipster_display_name,
                    COUNT(ap.id) as picks_count
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                LEFT JOIN accumulator_picks ap ON at.id = ap.accumulator_id
                WHERE at.status = 'active'
                GROUP BY at.id
                ORDER BY at.created_at DESC
            ");
            
        } catch (Exception $e) {
            $error = "Error: " . $e->getMessage();
        }
    }
}

// Set page variables
$pageTitle = "Pick Settlement";

// Start content buffer
ob_start();
?>

<div class="admin-settlement-content">
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
        <h2><i class="fas fa-gavel"></i> Pick Settlement</h2>
        <p style="color: #666; margin-top: 10px;">Settle picks as won or lost and manage escrow funds accordingly.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['unsettled_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Unsettled Picks</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['won_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Won Picks</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['lost_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Lost Picks</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_picks']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Picks</p>
            </div>
        </div>
    </div>
    
    <!-- Unsettled Picks -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Unsettled Picks</h3>
        
        <?php if (empty($unsettledTickets)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-gavel" style="font-size: 48px; color: #2e7d32; margin-bottom: 20px;"></i>
            <h3>No unsettled picks found</h3>
            <p>All picks have been settled or no picks are ready for settlement.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Ticket ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Title</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Tipster</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Picks Count</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Total Odds</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Created</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($unsettledTickets as $ticket): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px; font-weight: bold;"><?php echo $ticket['id']; ?></td>
                        <td style="padding: 12px;"><?php echo htmlspecialchars($ticket['title']); ?></td>
                        <td style="padding: 12px;"><?php echo htmlspecialchars($ticket['tipster_display_name'] ?: $ticket['tipster_name']); ?></td>
                        <td style="padding: 12px; text-align: center;">
                            <span style="background-color: #17a2b8; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                                <?php echo $ticket['picks_count']; ?> picks
                            </span>
                        </td>
                        <td style="padding: 12px; font-weight: bold; color: #d32f2f;"><?php echo number_format($ticket['total_odds'], 2); ?></td>
                        <td style="padding: 12px; font-weight: bold; color: #2e7d32;">
                            <?php echo $ticket['price'] == 0 ? 'FREE' : 'GHS ' . number_format($ticket['price'], 2); ?>
                        </td>
                        <td style="padding: 12px;"><?php echo date('M j, Y H:i', strtotime($ticket['created_at'])); ?></td>
                        <td style="padding: 12px;">
                            <span style="background-color: #666; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                                <?php echo ucfirst($ticket['status']); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <button class="btn btn-info" style="padding: 4px 8px; font-size: 12px; margin: 2px;" onclick="viewTicketPicks(<?php echo $ticket['id']; ?>)">
                                <i class="fas fa-eye"></i> View Picks
                            </button>
                            <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin: 2px;" onclick="settleTicket(<?php echo $ticket['id']; ?>)">
                                <i class="fas fa-gavel"></i> Settle Pick
                            </button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Settlement Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Settlement Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Settle picks based on actual match results and outcomes.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-dollar-sign"></i> 
                Won picks: Tipster receives 90% of price, platform keeps 10% commission.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-undo"></i> 
                Lost picks: Buyer receives full refund of purchase price.
            </p>
            <p style="color: #666;">
                <i class="fas fa-file-alt"></i> 
                Always provide clear settlement notes for audit purposes.
            </p>
        </div>
    </div>
</div>

    <!-- Settlement Modal -->
    <div id="settlementModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
        <div style="background-color: white; margin: 5% auto; padding: 20px; border-radius: 8px; width: 80%; max-width: 500px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e9ecef;">
                <h3>Settle Pick</h3>
                <span style="color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="closeSettlementModal()">&times;</span>
            </div>
            <form method="POST">
                <input type="hidden" name="action" value="settle_selection">
                <input type="hidden" name="selection_id" id="modal_selection_id">
                <input type="hidden" name="result" id="modal_result">
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Result:</label>
                    <input type="text" id="modal_result_display" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" readonly>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">Notes (Optional):</label>
                    <textarea name="notes" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" rows="3" placeholder="Add any notes about this settlement..."></textarea>
                </div>
                
                <div style="text-align: right;">
                    <button type="button" class="btn btn-secondary" onclick="closeSettlementModal()" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #007bff; color: white;">Confirm Settlement</button>
                </div>
            </form>
        </div>
    </div>

    <!-- View Picks Modal -->
    <div id="viewPicksModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
        <div style="background-color: white; margin: 2% auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e9ecef;">
                <h3>View Ticket Picks</h3>
                <span style="color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="closeViewPicksModal()">&times;</span>
            </div>
            <div id="picksContent">
                <!-- Picks will be loaded here -->
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeViewPicksModal()" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Close</button>
            </div>
        </div>
    </div>

    <!-- Settle Ticket Modal -->
    <div id="settleTicketModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
        <div style="background-color: white; margin: 2% auto; padding: 20px; border-radius: 8px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e9ecef;">
                <h3>Settle Ticket</h3>
                <span style="color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer;" onclick="closeSettleTicketModal()">&times;</span>
            </div>
            <div id="settleTicketContent">
                <!-- Settlement form will be loaded here -->
            </div>
        </div>
    </div>

<script>
const baseUrl = '<?php echo $baseUrl; ?>';

function openSettlementModal(selectionId, result) {
    document.getElementById('modal_selection_id').value = selectionId;
    document.getElementById('modal_result').value = result;
    document.getElementById('modal_result_display').value = result.charAt(0).toUpperCase() + result.slice(1);
    document.getElementById('settlementModal').style.display = 'block';
}

function closeSettlementModal() {
    document.getElementById('settlementModal').style.display = 'none';
}

// View Ticket Picks functions
function viewTicketPicks(ticketId) {
    // Load picks for this ticket
    fetch(`${baseUrl}/api/get_ticket_picks.php?ticket_id=${ticketId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayTicketPicks(data.picks, data.ticket);
                document.getElementById('viewPicksModal').style.display = 'block';
            } else {
                alert('Error loading picks: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading picks');
        });
}

function displayTicketPicks(picks, ticket) {
    const content = document.getElementById('picksContent');
    
    let html = `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <h4>Ticket Information</h4>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Tipster:</strong> ${ticket.tipster_name}</p>
            <p><strong>Total Odds:</strong> ${parseFloat(ticket.total_odds).toFixed(2)}</p>
            <p><strong>Price:</strong> ${ticket.price == 0 ? 'FREE' : 'GHS ' + parseFloat(ticket.price).toFixed(2)}</p>
            <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        
        <h4>Individual Picks</h4>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Match</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Prediction</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Odds</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Date/Time</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    picks.forEach((pick, index) => {
        const matchDateTime = pick.match_date ? new Date(pick.match_date).toLocaleString() : 'N/A';
        html += `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px;">${pick.match_description}</td>
                <td style="padding: 10px; font-weight: bold;">${pick.prediction}</td>
                <td style="padding: 10px; color: #d32f2f; font-weight: bold;">${parseFloat(pick.odds).toFixed(2)}</td>
                <td style="padding: 10px;">${matchDateTime}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    content.innerHTML = html;
}

function closeViewPicksModal() {
    document.getElementById('viewPicksModal').style.display = 'none';
}

// Settle Ticket functions
function settleTicket(ticketId) {
    // Load ticket and picks for settlement
    fetch(`${baseUrl}/api/get_ticket_picks.php?ticket_id=${ticketId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displaySettleTicketForm(data.picks, data.ticket);
                document.getElementById('settleTicketModal').style.display = 'block';
            } else {
                alert('Error loading ticket: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading ticket');
        });
}

function displaySettleTicketForm(picks, ticket) {
    const content = document.getElementById('settleTicketContent');
    
    let html = `
        <form method="POST" id="settleTicketForm">
            <input type="hidden" name="action" value="settle_ticket">
            <input type="hidden" name="ticket_id" value="${ticket.id}">
            
            <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                <h4>Ticket Information</h4>
                <p><strong>Title:</strong> ${ticket.title}</p>
                <p><strong>Tipster:</strong> ${ticket.tipster_name}</p>
                <p><strong>Total Odds:</strong> ${parseFloat(ticket.total_odds).toFixed(2)}</p>
                <p><strong>Price:</strong> ${ticket.price == 0 ? 'FREE' : 'GHS ' + parseFloat(ticket.price).toFixed(2)}</p>
            </div>
            
            <h4>Settle Individual Picks</h4>
            <p style="color: #666; margin-bottom: 15px;">
                <strong>Note:</strong> If any pick is marked as "Lost", the entire ticket will be settled as lost.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Match</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Prediction</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Odds</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Result</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    picks.forEach((pick, index) => {
        html += `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px;">${pick.match_description}</td>
                <td style="padding: 10px; font-weight: bold;">${pick.prediction}</td>
                <td style="padding: 10px; color: #d32f2f; font-weight: bold;">${parseFloat(pick.odds).toFixed(2)}</td>
                <td style="padding: 10px;">
                    <select name="pick_result_${pick.id}" required style="padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
                        <option value="">Select Result</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="void">Void</option>
                    </select>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div style="margin-top: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Settlement Notes (Optional):</label>
                <textarea name="notes" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;" rows="3" placeholder="Add any notes about this settlement..."></textarea>
            </div>
            
            <div style="text-align: right; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="closeSettleTicketModal()" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #6c757d; color: white;">Cancel</button>
                <button type="submit" class="btn btn-primary" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; margin: 2px; background-color: #007bff; color: white;">Settle Ticket</button>
            </div>
        </form>
    `;
    
    content.innerHTML = html;
}

function closeSettleTicketModal() {
    document.getElementById('settleTicketModal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const settlementModal = document.getElementById('settlementModal');
    const viewPicksModal = document.getElementById('viewPicksModal');
    const settleTicketModal = document.getElementById('settleTicketModal');
    
    if (event.target === settlementModal) {
        closeSettlementModal();
    }
    if (event.target === viewPicksModal) {
        closeViewPicksModal();
    }
    if (event.target === settleTicketModal) {
        closeSettleTicketModal();
    }
}

// Ensure DOM is loaded before executing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, View Picks functionality ready');
});
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
