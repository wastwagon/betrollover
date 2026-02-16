<?php
/**
 * Admin Escrow - Clean, Simple Version
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

// Get escrow data
$escrowData = [];
$stats = [];

try {
    // Get escrow transactions from escrow_funds table
    // Show actual status based on pick settlement (if pick is won/lost, show released/refunded even if escrow status is still held)
    $escrowData = $db->fetchAll("
        SELECT 
            ef.id,
            ef.user_id,
            ef.pick_id as accumulator_id,
            ef.amount,
            CASE 
                WHEN ef.status = 'held' AND (at.status = 'won' OR at.result = 'won') THEN 'released'
                WHEN ef.status = 'held' AND (at.status = 'lost' OR at.result = 'lost') THEN 'refunded'
                ELSE ef.status
            END as status,
            ef.reference,
            ef.created_at,
            ef.updated_at,
            u.username,
            u.display_name,
            at.title as pick_title,
            at.status as pick_status,
            at.result as pick_result
        FROM escrow_funds ef
        LEFT JOIN users u ON ef.user_id = u.id
        LEFT JOIN accumulator_tickets at ON ef.pick_id = at.id
        ORDER BY ef.created_at DESC
        LIMIT 100
    ");
    
    // Get comprehensive statistics from escrow_funds
    // Calculate held escrow only for picks that are still active (not won/lost)
    $stats['total_escrow'] = $db->fetch("
        SELECT COALESCE(SUM(ef.amount), 0) as total 
        FROM escrow_funds ef
        LEFT JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE ef.status = 'held' AND (at.status = 'active' OR at.status IS NULL OR (at.status NOT IN ('won', 'lost') AND at.result NOT IN ('won', 'lost')))
    ")['total'] ?? 0;
    $stats['total_transactions'] = $db->fetch("SELECT COUNT(*) as count FROM escrow_funds")['count'] ?? 0;
    $stats['held_transactions'] = $db->fetch("
        SELECT COUNT(*) as count 
        FROM escrow_funds ef
        LEFT JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE ef.status = 'held' AND (at.status = 'active' OR at.status IS NULL OR (at.status NOT IN ('won', 'lost') AND at.result NOT IN ('won', 'lost')))
    ")['count'] ?? 0;
    $stats['released_transactions'] = $db->fetch("
        SELECT COUNT(*) as count 
        FROM escrow_funds ef
        LEFT JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE (ef.status = 'released' OR (ef.status = 'held' AND (at.status = 'won' OR at.result = 'won')))
    ")['count'] ?? 0;
    $stats['refunded_transactions'] = $db->fetch("
        SELECT COUNT(*) as count 
        FROM escrow_funds ef
        LEFT JOIN accumulator_tickets at ON ef.pick_id = at.id
        WHERE (ef.status = 'refunded' OR (ef.status = 'held' AND (at.status = 'lost' OR at.result = 'lost')))
    ")['count'] ?? 0;
    
} catch (Exception $e) {
    $escrowData = [];
    $stats = ['total_escrow' => 0, 'total_transactions' => 0, 'held_transactions' => 0, 'released_transactions' => 0];
}

// Handle escrow actions
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'release_escrow') {
        $escrowId = intval($_POST['escrow_id'] ?? 0);
        
        if ($escrowId) {
            try {
                // Get escrow details
                $escrow = $db->fetch("SELECT * FROM escrow_funds WHERE id = ?", [$escrowId]);
                if (!$escrow) {
                    throw new Exception("Escrow record not found");
                }
                
                // Get pick settlement status
                $pick = $db->fetch("SELECT status, result FROM accumulator_tickets WHERE id = ?", [$escrow['pick_id']]);
                
                $newStatus = 'released';
                if ($pick && ($pick['status'] === 'lost' || $pick['result'] === 'lost')) {
                    $newStatus = 'refunded';
                }
                
                $db->query("UPDATE escrow_funds SET status = ?, updated_at = NOW() WHERE id = ?", [$newStatus, $escrowId]);
                $message = "Escrow funds marked as " . $newStatus . ".";
                
                // Refresh escrow data
                $escrowData = $db->fetchAll("
                    SELECT 
                        ef.id,
                        ef.user_id,
                        ef.pick_id as accumulator_id,
                        ef.amount,
                        ef.status,
                        ef.reference,
                        ef.created_at,
                        ef.updated_at,
                        u.username,
                        u.display_name,
                        at.title as pick_title,
                        at.status as pick_status,
                        at.result as pick_result
                    FROM escrow_funds ef
                    LEFT JOIN users u ON ef.user_id = u.id
                    LEFT JOIN accumulator_tickets at ON ef.pick_id = at.id
                    ORDER BY ef.created_at DESC
                    LIMIT 100
                ");
            } catch (Exception $e) {
                $error = "Error releasing escrow: " . $e->getMessage();
            }
        }
    }
}

// Set page variables
$pageTitle = "Escrow Management";

// Start content buffer
ob_start();
?>

<div class="admin-escrow-content">
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
        <h2><i class="fas fa-shield-alt"></i> Escrow Management</h2>
        <p style="color: #666; margin-top: 10px;">Manage escrow funds and transactions for marketplace purchases.</p>
    </div>
    
    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;">$<?php echo number_format($stats['total_escrow'], 2); ?></p>
                <p style="font-size: 14px; color: #666;">Total Escrow</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #666;"><?php echo $stats['total_transactions']; ?></p>
                <p style="font-size: 14px; color: #666;">Total Transactions</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #d32f2f;"><?php echo $stats['held_transactions']; ?></p>
                <p style="font-size: 14px; color: #666;">Held Funds</p>
            </div>
        </div>
        
        <div class="card">
            <div style="text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #2e7d32;"><?php echo $stats['released_transactions']; ?></p>
                <p style="font-size: 14px; color: #666;">Released</p>
            </div>
        </div>
    </div>
    
    <!-- Escrow Transactions -->
    <div class="card">
        <h3><i class="fas fa-list"></i> Escrow Transactions</h3>
        
        <?php if (empty($escrowData)): ?>
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-shield-alt" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <p>No escrow transactions found.</p>
        </div>
        <?php else: ?>
        
        <div style="overflow-x: auto; margin-top: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">User</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Pick</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Amount</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Created</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($escrowData as $transaction): ?>
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px;">
                            <p style="font-weight: 500; margin-bottom: 5px;"><?php echo htmlspecialchars($transaction['username'] ?? 'N/A'); ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <p style="font-size: 14px;"><?php echo htmlspecialchars($transaction['pick_title'] ?? 'N/A'); ?></p>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-weight: bold; color: #2e7d32;">
                                $<?php echo number_format($transaction['amount'], 2); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="background-color: <?php echo $transaction['status'] === 'held' ? '#d32f2f' : '#2e7d32'; ?>; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; text-transform: capitalize;">
                                <?php echo $transaction['status']; ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <span style="font-size: 12px; color: #666;">
                                <?php echo date('M j, Y g:i A', strtotime($transaction['created_at'])); ?>
                            </span>
                        </td>
                        <td style="padding: 12px;">
                            <?php if ($transaction['status'] === 'held'): ?>
                            <form method="POST" style="display: inline;">
                                <input type="hidden" name="action" value="release_escrow">
                                <input type="hidden" name="escrow_id" value="<?php echo $transaction['id']; ?>">
                                <button type="submit" class="btn btn-success" style="padding: 4px 8px; font-size: 12px;">
                                    <i class="fas fa-unlock"></i> Release
                                </button>
                            </form>
                            <?php else: ?>
                            <span style="color: #666; font-size: 12px;">Released</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <?php endif; ?>
    </div>
    
    <!-- Escrow Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Escrow Information</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Escrow funds are held securely until picks are settled or disputes are resolved.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-clock"></i> 
                Funds are automatically released when picks are settled as won or lost.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-handshake"></i> 
                Manual release is available for dispute resolution or special circumstances.
            </p>
            <p style="color: #666;">
                <i class="fas fa-chart-line"></i> 
                All escrow transactions are tracked and auditable for transparency.
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
