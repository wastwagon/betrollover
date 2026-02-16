<?php
/**
 * Admin Picks - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
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

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get all picks
$allPicks = [];
$stats = [];
$filter = $_GET['filter'] ?? 'all';

try {
    // Build query based on filter
    $whereClause = '';
    switch ($filter) {
        case 'approved':
            $whereClause = "WHERE at.status = 'active'";
            break;
        case 'pending':
            $whereClause = "WHERE at.status = 'pending_approval'";
            break;
        case 'won':
            $whereClause = "WHERE at.status = 'won'";
            break;
        case 'lost':
            $whereClause = "WHERE at.status = 'lost'";
            break;
        case 'unsettled':
            $whereClause = "WHERE at.status IN ('active', 'pending_approval')";
            break;
        default:
            $whereClause = "";
    }
    
    // Get all picks from accumulator_tickets table
    // Using subquery for purchase_count to avoid GROUP BY issues
    $allPicks = $db->fetchAll("
        SELECT 
            at.id,
            at.title,
            at.description,
            at.sport,
            at.total_odds,
            at.price,
            at.status,
            at.created_at,
            at.updated_at,
            COALESCE(u.username, 'Unknown') as tipster_name,
            u.username,
            u.display_name,
            COALESCE(at.is_marketplace, 0) as is_approved,
            (SELECT COUNT(*) FROM user_purchased_picks upp WHERE upp.accumulator_id = at.id) as purchase_count
        FROM accumulator_tickets at
        LEFT JOIN users u ON at.user_id = u.id
        {$whereClause}
        ORDER BY at.created_at DESC
        LIMIT 100
    ");
    
    // Get statistics
    $stats = [
        'total' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets")['count'],
        'approved' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'active'")['count'],
        'pending' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'pending_approval'")['count'],
        'won' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'won'")['count'],
        'lost' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status = 'lost'")['count'],
        'unsettled' => $db->fetch("SELECT COUNT(*) as count FROM accumulator_tickets WHERE status IN ('active', 'pending_approval')")['count']
    ];
} catch (Exception $e) {
    $allPicks = [];
    $stats = ['total' => 0, 'approved' => 0, 'pending' => 0, 'won' => 0, 'lost' => 0, 'unsettled' => 0];
}

// Handle pick actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_pick') {
        $pickId = intval($_POST['pick_id'] ?? 0);
        $isApproved = intval($_POST['is_approved'] ?? 0);
        $status = trim($_POST['status'] ?? '');
        $adminNotes = trim($_POST['admin_notes'] ?? '');
        
        if ($pickId) {
            try {
                // Update pick
                $db->execute("
                    UPDATE marketplace_picks 
                    SET is_approved = ?, status = ?, admin_notes = ?, updated_at = NOW(), updated_by = ?
                    WHERE id = ?
                ", [$isApproved, $status, $adminNotes, $userId, $pickId]);
                
                $message = "Pick updated successfully.";
                
                // Refresh picks
                $allPicks = $db->fetchAll("
                    SELECT mp.*, u.username as tipster_name, u.email as tipster_email
                    FROM marketplace_picks mp
                    JOIN users u ON mp.tipster_id = u.id
                    $whereClause
                    ORDER BY mp.created_at DESC
                ");
                
            } catch (Exception $e) {
                $error = "Error updating pick: " . $e->getMessage();
            }
        } else {
            $error = "Invalid pick selected.";
        }
    }
}

// Set page variables
$pageTitle = "All Picks";

// Start content buffer
ob_start();
?>

<div class="admin-picks-content">
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
        <h2><i class="fas fa-chart-line"></i> All Picks</h2>
        <p style="color: #666; margin-top: 10px;">Comprehensive view of all picks across the platform with management capabilities.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #666;"><?php echo $stats['total']; ?></p>
                <p style="font-size: 12px; color: #666;">Total Picks</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #2e7d32;"><?php echo $stats['approved']; ?></p>
                <p style="font-size: 12px; color: #666;">Approved</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #d32f2f;"><?php echo $stats['pending']; ?></p>
                <p style="font-size: 12px; color: #666;">Pending</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #2e7d32;"><?php echo $stats['won']; ?></p>
                <p style="font-size: 12px; color: #666;">Won</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #d32f2f;"><?php echo $stats['lost']; ?></p>
                <p style="font-size: 12px; color: #666;">Lost</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 28px; font-weight: bold; color: #d32f2f;"><?php echo $stats['unsettled']; ?></p>
                <p style="font-size: 12px; color: #666;">Unsettled</p>
            </div>
        </div>
    </div>
    
    <!-- Filter Options -->
    <div class="card">
        <h3><i class="fas fa-filter"></i> Filter Picks</h3>
        <div style="margin-top: 15px;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="?filter=all" class="btn <?php echo $filter === 'all' ? 'btn-primary' : 'btn-secondary'; ?>">All</a>
                <a href="?filter=approved" class="btn <?php echo $filter === 'approved' ? 'btn-primary' : 'btn-secondary'; ?>">Approved</a>
                <a href="?filter=pending" class="btn <?php echo $filter === 'pending' ? 'btn-primary' : 'btn-secondary'; ?>">Pending</a>
                <a href="?filter=won" class="btn <?php echo $filter === 'won' ? 'btn-primary' : 'btn-secondary'; ?>">Won</a>
                <a href="?filter=lost" class="btn <?php echo $filter === 'lost' ? 'btn-primary' : 'btn-secondary'; ?>">Lost</a>
                <a href="?filter=unsettled" class="btn <?php echo $filter === 'unsettled' ? 'btn-primary' : 'btn-secondary'; ?>">Unsettled</a>
            </div>
        </div>
    </div>
    
    <!-- All Picks -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Picks List</h3>
        
        <?php if (empty($allPicks)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-chart-line" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No picks found for the selected filter.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Pick</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Tipster</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Approved</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Created</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($allPicks as $pick): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px;">
                            <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($pick['title']); ?></p>
                            <p style="font-size: 12px; color: #666;"><?php echo htmlspecialchars(substr($pick['description'], 0, 50)) . '...'; ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <?php 
                            $tipsterName = '';
                            if (isset($pick['tipster_name']) && !empty($pick['tipster_name'])) {
                                $tipsterName = $pick['tipster_name'];
                            } elseif (isset($pick['username']) && !empty($pick['username'])) {
                                $tipsterName = $pick['username'];
                            } else {
                                $tipsterName = 'Unknown';
                            }
                            ?>
                            <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($tipsterName); ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: #2e7d32;">
                                $<?php echo number_format($pick['price'] ?? 0, 2); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo ($pick['status'] ?? '') === 'won' ? '#2e7d32' : (($pick['status'] ?? '') === 'lost' ? '#d32f2f' : '#666'); ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                                <?php echo $pick['status'] ?? 'Unsettled'; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <?php 
                            // Safely get is_approved value
                            $isApproved = false;
                            if (isset($pick['is_approved'])) {
                                $isApproved = (bool)$pick['is_approved'];
                            } elseif (isset($pick['status']) && $pick['status'] === 'active') {
                                $isApproved = true;
                            } elseif (isset($pick['is_marketplace'])) {
                                $isApproved = (bool)$pick['is_marketplace'];
                            }
                            ?>
                            <span style="background-color: <?php echo $isApproved ? '#2e7d32' : '#d32f2f'; ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                                <?php echo $isApproved ? 'Yes' : 'No'; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-size: 12px; color: #666;">
                                <?php echo date('M j, Y', strtotime($pick['created_at'])); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <button type="button" class="btn btn-info" style="padding: 4px 8px; font-size: 12px; margin: 2px;" onclick="viewTicketPicks(<?php echo $pick['id']; ?>)">
                                <i class="fas fa-eye"></i> View Picks
                            </button>
                            <button type="button" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px; margin: 2px;" onclick="editPick(<?php echo $pick['id']; ?>)">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Pick Management Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Pick Management Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-eye"></i> 
                Monitor all picks to ensure quality and compliance with platform standards.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-check"></i> 
                Approve picks that meet quality standards and provide value to users.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-gavel"></i> 
                Settle picks promptly to maintain user trust and platform integrity.
            </p>
            <p style="color: #666;">
                <i class="fas fa-chart-line"></i> 
                Use pick data to identify top-performing tipsters and improve platform features.
            </p>
        </div>
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

<script>
// baseUrl is already declared in admin_layout.php, so we don't redeclare it
if (typeof baseUrl === 'undefined') {
    window.baseUrl = '<?php echo $baseUrl; ?>';
}

function editPick(pickId) {
    // Simple implementation - can be enhanced with modal or new page
    alert('Pick editing functionality will be implemented for pick ID: ' + pickId);
}

// View Ticket Picks functions
function viewTicketPicks(ticketId) {
    console.log('Loading ticket picks for ID:', ticketId);
    
    // Load picks for this ticket
    fetch(`${baseUrl}/api/get_ticket_picks.php?ticket_id=${ticketId}`)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (data.success) {
                displayTicketPicks(data.picks, data.ticket);
                document.getElementById('viewPicksModal').style.display = 'block';
            } else {
                alert('Error loading picks: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            alert('Error loading picks: ' + error.message);
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

// Close modal when clicking outside (but not on notification bell)
document.addEventListener('click', function(event) {
    const modal = document.getElementById('viewPicksModal');
    const notificationContainer = document.querySelector('.notification-container');
    
    // Don't interfere with notification clicks
    if (notificationContainer && notificationContainer.contains(event.target)) {
        return;
    }
    
    if (modal && event.target === modal) {
        closeViewPicksModal();
    }
});

// Ensure DOM is loaded before executing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, View Picks functionality ready');
    
    // Ensure notification bell is clickable on this page
    const notificationBell = document.getElementById('notificationBell');
    if (notificationBell) {
        notificationBell.style.pointerEvents = 'auto';
        notificationBell.style.cursor = 'pointer';
        notificationBell.style.zIndex = '10002';
        
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeof toggleNotificationDropdown === 'function') {
                toggleNotificationDropdown();
            }
        }, true);
    }
    
    const notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
        notificationContainer.style.pointerEvents = 'auto';
        notificationContainer.style.zIndex = '10001';
    }
});
</script>

<style>
    /* Ensure notification bell is clickable on this page */
    .notification-container,
    .notification-bell,
    .notification-dropdown {
        pointer-events: auto !important;
        z-index: 10001 !important;
    }
    
    .notification-bell {
        cursor: pointer !important;
        position: relative !important;
        z-index: 10002 !important;
    }
    
    .notification-dropdown {
        z-index: 10000 !important;
    }
    
    .page-header {
        position: relative;
        z-index: 100 !important;
    }
    
    .admin-info {
        position: relative;
        z-index: 10003 !important;
    }
</style>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
