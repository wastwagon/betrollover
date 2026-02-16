<?php
/**
 * Admin Settings - Clean, Simple Version
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

$db = Database::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

// Get platform settings
$settings = [];

try {
    $settings = $db->fetchAll("
        SELECT setting_key, value, description 
        FROM platform_settings 
        ORDER BY setting_key
    ");
    
    // Convert to associative array
    $settingsArray = [];
    foreach ($settings as $setting) {
        $settingsArray[$setting['setting_key']] = [
            'value' => $setting['value'],
            'description' => $setting['description']
        ];
    }
    $settings = $settingsArray;
    
} catch (Exception $e) {
    $settings = [];
}

// Handle settings updates
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_settings') {
        try {
            // Handle mobile panel items (JSON arrays)
            foreach (['user', 'tipster', 'admin'] as $role) {
                if (isset($_POST['mobile_panel_items_' . $role]) && is_array($_POST['mobile_panel_items_' . $role])) {
                    $itemsJson = json_encode($_POST['mobile_panel_items_' . $role]);
                    $db->query("
                        INSERT INTO platform_settings (setting_key, value, updated_at) 
                        VALUES (?, ?, NOW())
                        ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
                    ", ['mobile_panel_items_' . $role, $itemsJson]);
                }
            }
            
            // Handle color pickers - sync text inputs with color inputs
            if (isset($_POST['setting_theme_color_primary'])) {
                $colorValue = $_POST['setting_theme_color_primary'];
                // Also update if text input exists
                if (isset($_POST['setting_theme_color_primary_text'])) {
                    $colorValue = $_POST['setting_theme_color_primary_text'];
                }
                $db->query("
                    INSERT INTO platform_settings (setting_key, value, updated_at) 
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
                ", ['theme_color_primary', $colorValue]);
            }
            
            if (isset($_POST['setting_theme_color_secondary'])) {
                $colorValue = $_POST['setting_theme_color_secondary'];
                if (isset($_POST['setting_theme_color_secondary_text'])) {
                    $colorValue = $_POST['setting_theme_color_secondary_text'];
                }
                $db->query("
                    INSERT INTO platform_settings (setting_key, value, updated_at) 
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
                ", ['theme_color_secondary', $colorValue]);
            }
            
            if (isset($_POST['setting_mobile_panel_bg_color'])) {
                $colorValue = $_POST['setting_mobile_panel_bg_color'];
                if (isset($_POST['setting_mobile_panel_bg_color_text'])) {
                    $colorValue = $_POST['setting_mobile_panel_bg_color_text'];
                }
                $db->query("
                    INSERT INTO platform_settings (setting_key, value, updated_at) 
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
                ", ['mobile_panel_bg_color', $colorValue]);
            }
            
            if (isset($_POST['setting_mobile_header_bg_color'])) {
                $colorValue = $_POST['setting_mobile_header_bg_color'];
                if (isset($_POST['setting_mobile_header_bg_color_text'])) {
                    $colorValue = $_POST['setting_mobile_header_bg_color_text'];
                }
                $db->query("
                    INSERT INTO platform_settings (setting_key, value, updated_at) 
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
                ", ['mobile_header_bg_color', $colorValue]);
            }
            
            // Update each setting
            foreach ($_POST as $key => $value) {
                if (strpos($key, 'setting_') === 0) {
                    // Skip color text inputs (handled above)
                    if (strpos($key, '_text') !== false) {
                        continue;
                    }
                    
                    // Skip mobile panel items (handled above)
                    if (strpos($key, 'mobile_panel_items_') === 8) {
                        continue;
                    }
                    
                    $settingKey = substr($key, 8); // Remove 'setting_' prefix
                    $settingValue = trim($value);
                    
                    // Update or insert setting
                    $db->query("
                        INSERT INTO platform_settings (setting_key, value, updated_at) 
                        VALUES (?, ?, NOW())
                        ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()
                    ", [$settingKey, $settingValue]);
                }
            }
            
            $message = "Settings updated successfully.";
            
            // Refresh settings
            $settings = $db->fetchAll("
                SELECT setting_key, value, description 
                FROM platform_settings 
                ORDER BY setting_key
            ");
            
            $settingsArray = [];
            foreach ($settings as $setting) {
                $settingsArray[$setting['setting_key']] = [
                    'value' => $setting['value'],
                    'description' => $setting['description']
                ];
            }
            $settings = $settingsArray;
            
        } catch (Exception $e) {
            $error = "Error updating settings: " . $e->getMessage();
        }
    }
}

// Set page variables
$pageTitle = "Platform Settings";

// Start content buffer
ob_start();
?>

<div class="admin-settings-content">
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
        <h2><i class="fas fa-cog"></i> Platform Settings</h2>
        <p style="color: #666; margin-top: 10px;">Configure platform-wide settings and parameters.</p>
    </div>
    
    <!-- General Settings -->
    <div class="card">
        <h3><i class="fas fa-sliders-h"></i> General Settings</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_settings">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Platform Name</label>
                    <input type="text" name="setting_platform_name" 
                           value="<?php echo htmlspecialchars($settings['platform_name']['value'] ?? 'SmartPicks Pro'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        <?php echo htmlspecialchars($settings['platform_name']['description'] ?? 'Name displayed throughout the platform'); ?>
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Platform Commission (%)</label>
                    <input type="number" name="setting_platform_commission" step="0.1" min="0" max="50"
                           value="<?php echo htmlspecialchars($settings['platform_commission']['value'] ?? '10'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        <?php echo htmlspecialchars($settings['platform_commission']['description'] ?? 'Percentage taken by platform on successful picks'); ?>
                    </p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Minimum Pick Price ($)</label>
                    <input type="number" name="setting_min_pick_price" step="0.01" min="0"
                           value="<?php echo htmlspecialchars($settings['min_pick_price']['value'] ?? '1.00'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        <?php echo htmlspecialchars($settings['min_pick_price']['description'] ?? 'Minimum price for marketplace picks'); ?>
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Maximum Pick Price ($)</label>
                    <input type="number" name="setting_max_pick_price" step="0.01" min="0"
                           value="<?php echo htmlspecialchars($settings['max_pick_price']['value'] ?? '1000.00'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        <?php echo htmlspecialchars($settings['max_pick_price']['description'] ?? 'Maximum price for marketplace picks'); ?>
                    </p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Minimum Payout Amount ($)</label>
                    <input type="number" name="setting_min_payout" step="0.01" min="0"
                           value="<?php echo htmlspecialchars($settings['min_payout']['value'] ?? '10.00'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        <?php echo htmlspecialchars($settings['min_payout']['description'] ?? 'Minimum amount for payout requests'); ?>
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Tipster Qualification ROI (%)</label>
                    <input type="number" name="setting_tipster_roi" step="0.1" min="0" max="100"
                           value="<?php echo htmlspecialchars($settings['tipster_roi']['value'] ?? '20'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        <?php echo htmlspecialchars($settings['tipster_roi']['description'] ?? 'Minimum ROI required for tipster qualification'); ?>
                    </p>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Update Settings
            </button>
        </form>
    </div>
    
    <!-- Feature Settings -->
    <div class="card">
        <h3><i class="fas fa-toggle-on"></i> Feature Settings</h3>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_settings">
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="setting_enable_referrals" value="1" 
                           <?php echo ($settings['enable_referrals']['value'] ?? '1') ? 'checked' : ''; ?>>
                    <span>Enable Referral System</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    <?php echo htmlspecialchars($settings['enable_referrals']['description'] ?? 'Allow users to refer others and earn rewards'); ?>
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="setting_enable_gamification" value="1" 
                           <?php echo ($settings['enable_gamification']['value'] ?? '1') ? 'checked' : ''; ?>>
                    <span>Enable Gamification</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    <?php echo htmlspecialchars($settings['enable_gamification']['description'] ?? 'Enable points, badges, and achievement system'); ?>
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="setting_enable_chat" value="1" 
                           <?php echo ($settings['enable_chat']['value'] ?? '1') ? 'checked' : ''; ?>>
                    <span>Enable Community Chat</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    <?php echo htmlspecialchars($settings['enable_chat']['description'] ?? 'Allow users to chat in community forums'); ?>
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="setting_auto_approve_picks" value="1" 
                           <?php echo ($settings['auto_approve_picks']['value'] ?? '0') ? 'checked' : ''; ?>>
                    <span>Auto-Approve Picks</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    <?php echo htmlspecialchars($settings['auto_approve_picks']['description'] ?? 'Automatically approve picks from verified tipsters'); ?>
                </p>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Update Feature Settings
            </button>
        </form>
    </div>
    
    <!-- Paystack Payment Settings -->
    <div class="card">
        <h3><i class="fas fa-credit-card"></i> Paystack Payment Gateway Settings</h3>
        <p style="color: #666; margin-top: 10px;">Configure Paystack API credentials for Ghana mobile money and card payments.</p>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_settings">
            
            <!-- Payment Mode -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Payment Mode</label>
                <select name="setting_paystack_mode" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <option value="live" <?php echo ($settings['paystack_mode']['value'] ?? 'live') === 'live' ? 'selected' : ''; ?>>Live Mode</option>
                    <option value="test" <?php echo ($settings['paystack_mode']['value'] ?? 'live') === 'test' ? 'selected' : ''; ?>>Test Mode</option>
                </select>
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    Select Live Mode for production or Test Mode for testing with test cards
                </p>
            </div>
            
            <!-- Live API Keys -->
            <div style="margin-bottom: 20px;">
                <h4 style="color: #d32f2f; margin-bottom: 15px;">Live Mode API Keys</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Live Secret Key</label>
                    <input type="password" name="setting_paystack_secret_key" 
                           value="<?php echo htmlspecialchars($settings['paystack_secret_key']['value'] ?? ''); ?>"
                           placeholder="sk_live_..."
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Your Paystack Live Secret Key (starts with sk_live_)
                    </p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Live Public Key</label>
                    <input type="text" name="setting_paystack_public_key" 
                           value="<?php echo htmlspecialchars($settings['paystack_public_key']['value'] ?? ''); ?>"
                           placeholder="pk_live_..."
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Your Paystack Live Public Key (starts with pk_live_)
                    </p>
                </div>
            </div>
            
            <!-- Test API Keys -->
            <div style="margin-bottom: 20px;">
                <h4 style="color: #666; margin-bottom: 15px;">Test Mode API Keys (Optional)</h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Test Secret Key</label>
                    <input type="password" name="setting_paystack_test_secret_key" 
                           value="<?php echo htmlspecialchars($settings['paystack_test_secret_key']['value'] ?? ''); ?>"
                           placeholder="sk_test_..."
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Your Paystack Test Secret Key (for testing purposes)
                    </p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Test Public Key</label>
                    <input type="text" name="setting_paystack_test_public_key" 
                           value="<?php echo htmlspecialchars($settings['paystack_test_public_key']['value'] ?? ''); ?>"
                           placeholder="pk_test_..."
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Your Paystack Test Public Key (for testing purposes)
                    </p>
                </div>
            </div>
            
            <!-- Payment Info -->
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: #d32f2f;">
                    <i class="fas fa-info-circle"></i> Payment Gateway Information
                </h4>
                <ul style="color: #666; line-height: 1.8; margin-left: 20px;">
                    <li><strong>Currency:</strong> GHS (Ghana Cedis)</li>
                    <li><strong>Supported Methods:</strong> Mobile Money (MTN, Vodafone, AirtelTigo) & Card Payments</li>
                    <li><strong>Webhook URL:</strong> <code><?php echo rtrim((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'], '/'); ?>/SmartPicksPro-Local/paystack_webhook</code></li>
                    <li><strong>API Status:</strong> 
                        <?php
                        try {
                            require_once __DIR__ . '/../models/PaystackService.php';
                            $paystack = PaystackService::getInstance();
                            $testResult = $paystack->testConnection();
                            if ($testResult['success']) {
                                echo '<span style="color: #2e7d32;">✓ Connected</span>';
                            } else {
                                echo '<span style="color: #d32f2f;">✗ Connection Failed</span>';
                            }
                        } catch (Exception $e) {
                            echo '<span style="color: #d32f2f;">✗ Error</span>';
                        }
                        ?>
                    </li>
                </ul>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Paystack Settings
            </button>
        </form>
    </div>
    
    <!-- System Information -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> System Information</h3>
        <div style="margin-top: 15px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <p style="color: #666; margin-bottom: 10px;">
                        <i class="fas fa-server"></i> 
                        <strong>Platform Version:</strong> 1.0.0
                    </p>
                    <p style="color: #666; margin-bottom: 10px;">
                        <i class="fas fa-database"></i> 
                        <strong>Database:</strong> MySQL
                    </p>
                    <p style="color: #666;">
                        <i class="fas fa-code"></i> 
                        <strong>Framework:</strong> PHP
                    </p>
                </div>
                
                <div>
                    <p style="color: #666; margin-bottom: 10px;">
                        <i class="fas fa-calendar"></i> 
                        <strong>Last Updated:</strong> <?php echo date('M j, Y'); ?>
                    </p>
                    <p style="color: #666; margin-bottom: 10px;">
                        <i class="fas fa-user"></i> 
                        <strong>Admin:</strong> <?php echo htmlspecialchars($user['username']); ?>
                    </p>
                    <p style="color: #666;">
                        <i class="fas fa-shield-alt"></i> 
                        <strong>Status:</strong> <span style="color: #2e7d32;">Active</span>
                    </p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Email Settings -->
    <div class="card">
        <h3><i class="fas fa-envelope"></i> Email Notification Settings</h3>
        <p style="color: #666; margin-top: 10px;">Configure email notifications for the platform.</p>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_settings">
            
            <!-- Enable Email -->
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" name="setting_email_enabled" value="true" 
                           <?php echo ($settings['email_enabled']['value'] ?? 'false') === 'true' ? 'checked' : ''; ?>>
                    <span>Enable Email Notifications</span>
                </label>
                <p style="font-size: 12px; color: #666; margin-left: 30px; margin-top: 5px;">
                    Enable or disable email notifications for pick approvals and other events
                </p>
            </div>
            
            <!-- Email Method -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email Sending Method</label>
                <select name="setting_email_method" id="email_method"
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"
                        onchange="toggleSMTPFields()">
                    <option value="mail" <?php echo ($settings['email_method']['value'] ?? 'mail') === 'mail' ? 'selected' : ''; ?>>PHP mail() function</option>
                    <option value="smtp" <?php echo ($settings['email_method']['value'] ?? 'mail') === 'smtp' ? 'selected' : ''; ?>>SMTP</option>
                </select>
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    Use PHP mail() for basic email or SMTP for more reliable delivery
                </p>
            </div>
            
            <!-- SMTP Configuration Fields (shown only when SMTP is selected) -->
            <div id="smtp_fields" style="display: <?php echo ($settings['email_method']['value'] ?? 'mail') === 'smtp' ? 'block' : 'none'; ?>; margin-bottom: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #d32f2f;">
                <h4 style="color: #d32f2f; margin-bottom: 15px;"><i class="fas fa-server"></i> SMTP Configuration</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">SMTP Host</label>
                        <input type="text" name="setting_email_smtp_host" 
                               value="<?php echo htmlspecialchars($settings['email_smtp_host']['value'] ?? 'smtp.gmail.com'); ?>"
                               placeholder="smtp.gmail.com"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            SMTP server hostname
                        </p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">SMTP Port</label>
                        <input type="number" name="setting_email_smtp_port" 
                               value="<?php echo htmlspecialchars($settings['email_smtp_port']['value'] ?? '587'); ?>"
                               placeholder="587"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            SMTP port (587 for TLS, 465 for SSL)
                        </p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">SMTP Username</label>
                        <input type="text" name="setting_email_smtp_username" 
                               value="<?php echo htmlspecialchars($settings['email_smtp_username']['value'] ?? ''); ?>"
                               placeholder="your-email@gmail.com"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            SMTP authentication username
                        </p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">SMTP Password</label>
                        <input type="password" name="setting_email_smtp_password" 
                               value="<?php echo htmlspecialchars($settings['email_smtp_password']['value'] ?? ''); ?>"
                               placeholder="Your SMTP password"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            SMTP authentication password (app password for Gmail)
                        </p>
                    </div>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">SMTP Encryption</label>
                    <select name="setting_email_smtp_encryption" 
                            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="tls" <?php echo ($settings['email_smtp_encryption']['value'] ?? 'tls') === 'tls' ? 'selected' : ''; ?>>TLS (Recommended)</option>
                        <option value="ssl" <?php echo ($settings['email_smtp_encryption']['value'] ?? 'tls') === 'ssl' ? 'selected' : ''; ?>>SSL</option>
                    </select>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Use TLS for port 587, SSL for port 465
                    </p>
                </div>
            </div>
            
            <!-- Admin Email -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Admin Email (for notifications)</label>
                <input type="email" name="setting_email_admin_email" 
                       value="<?php echo htmlspecialchars($settings['email_admin_email']['value'] ?? 'admin@betrollover.com'); ?>"
                       placeholder="admin@betrollover.com"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    Email address to receive notifications when tipsters create picks
                </p>
            </div>
            
            <!-- From Email -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">From Email Address</label>
                <input type="email" name="setting_email_from_email" 
                       value="<?php echo htmlspecialchars($settings['email_from_email']['value'] ?? 'noreply@betrollover.com'); ?>"
                       placeholder="noreply@betrollover.com"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    Email address that appears as the sender
                </p>
            </div>
            
            <!-- From Name -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">From Name</label>
                <input type="text" name="setting_email_from_name" 
                       value="<?php echo htmlspecialchars($settings['email_from_name']['value'] ?? 'SmartPicks Pro'); ?>"
                       placeholder="SmartPicks Pro"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <p style="font-size: 12px; color: #666; margin-top: 5px;">
                    Display name that appears as the sender
                </p>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Update Email Settings
            </button>
        </form>
    </div>
    
    <!-- Mobile Panel Menu Settings -->
    <div class="card">
        <h3><i class="fas fa-mobile-alt"></i> Mobile Panel Menu Settings</h3>
        <p style="color: #666; margin-top: 10px;">Configure mobile bottom panel menu items for each user role. Only selected items will appear on the mobile bottom panel.</p>
        
        <?php
        // Get available menu items for each role
        $roleMenus = [
            'user' => [
                ['key' => 'dashboard', 'text' => 'Dashboard (Home)', 'icon' => 'fas fa-home'],
                ['key' => 'marketplace', 'text' => 'Marketplace', 'icon' => 'fas fa-store'],
                ['key' => 'wallet', 'text' => 'Wallet', 'icon' => 'fas fa-wallet'],
                ['key' => 'chat', 'text' => 'Public Chat', 'icon' => 'fas fa-comments'],
                ['key' => 'profile', 'text' => 'Profile', 'icon' => 'fas fa-user'],
                ['key' => 'referrals', 'text' => 'Referrals', 'icon' => 'fas fa-user-friends'],
                ['key' => 'my_purchases', 'text' => 'My Purchases', 'icon' => 'fas fa-shopping-bag']
            ],
            'tipster' => [
                ['key' => 'dashboard', 'text' => 'Dashboard (Home)', 'icon' => 'fas fa-home'],
                ['key' => 'create_pick', 'text' => 'Create Pick', 'icon' => 'fas fa-plus-circle'],
                ['key' => 'my_picks', 'text' => 'My Picks', 'icon' => 'fas fa-list'],
                ['key' => 'wallet', 'text' => 'Wallet', 'icon' => 'fas fa-wallet'],
                ['key' => 'profile', 'text' => 'Profile', 'icon' => 'fas fa-user'],
                ['key' => 'marketplace', 'text' => 'Marketplace', 'icon' => 'fas fa-store'],
                ['key' => 'financial_review', 'text' => 'Financial Review', 'icon' => 'fas fa-chart-line']
            ],
            'admin' => [
                ['key' => 'dashboard', 'text' => 'Dashboard (Home)', 'icon' => 'fas fa-home'],
                ['key' => 'approve', 'text' => 'Pending Approvals', 'icon' => 'fas fa-clock'],
                ['key' => 'picks', 'text' => 'All Picks', 'icon' => 'fas fa-list'],
                ['key' => 'users', 'text' => 'Users', 'icon' => 'fas fa-users'],
                ['key' => 'settings', 'text' => 'Settings', 'icon' => 'fas fa-cog'],
                ['key' => 'marketplace', 'text' => 'Marketplace', 'icon' => 'fas fa-store'],
                ['key' => 'escrow', 'text' => 'Escrow Funds', 'icon' => 'fas fa-lock']
            ]
        ];
        
        // Get selected items for each role
        $selectedItems = [];
        foreach (['user', 'tipster', 'admin'] as $role) {
            $json = $settings['mobile_panel_items_' . $role]['value'] ?? '';
            $selectedItems[$role] = !empty($json) ? json_decode($json, true) : [];
            if (!is_array($selectedItems[$role])) {
                $selectedItems[$role] = [];
            }
        }
        ?>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_settings">
            
            <?php foreach (['user' => 'User', 'tipster' => 'Tipster', 'admin' => 'Admin'] as $roleKey => $roleLabel): ?>
            <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <h4 style="color: #d32f2f; margin-bottom: 15px;">
                    <i class="fas fa-user-<?php echo $roleKey === 'admin' ? 'shield' : ($roleKey === 'tipster' ? 'star' : 'circle'); ?>"></i> 
                    <?php echo $roleLabel; ?> Role
                </h4>
                
                <!-- Enable/Disable Mobile Panel -->
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" name="setting_mobile_panel_enabled_<?php echo $roleKey; ?>" value="1" 
                               <?php echo ($settings['mobile_panel_enabled_' . $roleKey]['value'] ?? '1') === '1' ? 'checked' : ''; ?>>
                        <span>Enable Mobile Panel for <?php echo $roleLabel; ?>s</span>
                    </label>
                </div>
                
                <!-- Menu Items Selection -->
                <div style="margin-top: 15px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Select Menu Items (4-5 recommended):</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        <?php foreach ($roleMenus[$roleKey] as $item): ?>
                        <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border-radius: 5px; cursor: pointer; border: 2px solid <?php echo in_array($item['key'], $selectedItems[$roleKey]) ? '#d32f2f' : '#ddd'; ?>;">
                            <input type="checkbox" 
                                   name="mobile_panel_items_<?php echo $roleKey; ?>[]" 
                                   value="<?php echo htmlspecialchars($item['key']); ?>"
                                   <?php echo in_array($item['key'], $selectedItems[$roleKey]) ? 'checked' : ''; ?>>
                            <i class="<?php echo htmlspecialchars($item['icon']); ?>" style="color: #666;"></i>
                            <span style="font-size: 13px;"><?php echo htmlspecialchars($item['text']); ?></span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Mobile Panel Settings
            </button>
        </form>
    </div>
    
    <!-- Theme Colors & Fonts Settings -->
    <div class="card">
        <h3><i class="fas fa-palette"></i> Theme Colors & Fonts Settings</h3>
        <p style="color: #666; margin-top: 10px;">Customize platform colors and fonts for a consistent mobile app experience.</p>
        
        <form method="POST" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_settings">
            
            <!-- Font Settings -->
            <h4 style="color: #d32f2f; margin: 30px 0 15px 0;"><i class="fas fa-font"></i> Font Settings</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Font Family (Mobile)</label>
                    <select name="setting_mobile_font_family" 
                            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
                                <?php echo ($settings['mobile_font_family']['value'] ?? '') === '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif' ? 'selected' : ''; ?>>
                            System Font (Recommended)
                        </option>
                        <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" 
                                <?php echo ($settings['mobile_font_family']['value'] ?? '') === "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" ? 'selected' : ''; ?>>
                            Segoe UI
                        </option>
                        <option value="Roboto, 'Helvetica Neue', Arial, sans-serif" 
                                <?php echo ($settings['mobile_font_family']['value'] ?? '') === "Roboto, 'Helvetica Neue', Arial, sans-serif" ? 'selected' : ''; ?>>
                            Roboto
                        </option>
                        <option value="'Open Sans', sans-serif" 
                                <?php echo ($settings['mobile_font_family']['value'] ?? '') === "'Open Sans', sans-serif" ? 'selected' : ''; ?>>
                            Open Sans
                        </option>
                        <option value="Arial, Helvetica, sans-serif" 
                                <?php echo ($settings['mobile_font_family']['value'] ?? '') === 'Arial, Helvetica, sans-serif' ? 'selected' : ''; ?>>
                            Arial
                        </option>
                    </select>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Font family for mobile app interface (System Font recommended for native feel)
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Base Font Size (px)</label>
                    <input type="number" name="setting_mobile_base_font_size" step="1" min="12" max="18"
                           value="<?php echo htmlspecialchars($settings['mobile_base_font_size']['value'] ?? '14'); ?>"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Base font size for mobile interface (14px recommended)
                    </p>
                </div>
            </div>
            
            <!-- Color Settings -->
            <h4 style="color: #d32f2f; margin: 30px 0 15px 0;"><i class="fas fa-fill-drip"></i> Color Settings</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Primary Color</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" name="setting_theme_color_primary" 
                               value="<?php echo htmlspecialchars($settings['theme_color_primary']['value'] ?? '#d32f2f'); ?>"
                               style="width: 80px; height: 40px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
                        <input type="text" name="setting_theme_color_primary_text" 
                               value="<?php echo htmlspecialchars($settings['theme_color_primary']['value'] ?? '#d32f2f'); ?>"
                               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Main brand color (buttons, links, active states)
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Secondary Color</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" name="setting_theme_color_secondary" 
                               value="<?php echo htmlspecialchars($settings['theme_color_secondary']['value'] ?? '#2e7d32'); ?>"
                               style="width: 80px; height: 40px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
                        <input type="text" name="setting_theme_color_secondary_text" 
                               value="<?php echo htmlspecialchars($settings['theme_color_secondary']['value'] ?? '#2e7d32'); ?>"
                               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Success color (wallets, positive indicators)
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Mobile Panel Background</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" name="setting_mobile_panel_bg_color" 
                               value="<?php echo htmlspecialchars($settings['mobile_panel_bg_color']['value'] ?? '#1a1a1a'); ?>"
                               style="width: 80px; height: 40px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
                        <input type="text" name="setting_mobile_panel_bg_color_text" 
                               value="<?php echo htmlspecialchars($settings['mobile_panel_bg_color']['value'] ?? '#1a1a1a'); ?>"
                               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Background color for mobile bottom panel
                    </p>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Mobile Header Background</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" name="setting_mobile_header_bg_color" 
                               value="<?php echo htmlspecialchars($settings['mobile_header_bg_color']['value'] ?? '#ffffff'); ?>"
                               style="width: 80px; height: 40px; border: 1px solid #ddd; border-radius: 5px; cursor: pointer;">
                        <input type="text" name="setting_mobile_header_bg_color_text" 
                               value="<?php echo htmlspecialchars($settings['mobile_header_bg_color']['value'] ?? '#ffffff'); ?>"
                               style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        Background color for mobile top header
                    </p>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Theme Settings
            </button>
        </form>
        
        <script>
        // Toggle SMTP fields visibility
        function toggleSMTPFields() {
            const method = document.getElementById('email_method').value;
            const smtpFields = document.getElementById('smtp_fields');
            if (method === 'smtp') {
                smtpFields.style.display = 'block';
            } else {
                smtpFields.style.display = 'none';
            }
        }
        
        // Sync color pickers with text inputs
        document.addEventListener('DOMContentLoaded', function() {
            const colorSyncs = [
                {picker: 'setting_theme_color_primary', text: 'setting_theme_color_primary_text'},
                {picker: 'setting_theme_color_secondary', text: 'setting_theme_color_secondary_text'},
                {picker: 'setting_mobile_panel_bg_color', text: 'setting_mobile_panel_bg_color_text'},
                {picker: 'setting_mobile_header_bg_color', text: 'setting_mobile_header_bg_color_text'}
            ];
            
            colorSyncs.forEach(function(sync) {
                const picker = document.querySelector('input[name="' + sync.picker + '"]');
                const text = document.querySelector('input[name="' + sync.text + '"]');
                
                if (picker && text) {
                    picker.addEventListener('input', function() {
                        text.value = this.value;
                    });
                    
                    text.addEventListener('input', function() {
                        if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                            picker.value = this.value;
                        }
                    });
                }
            });
        });
        </script>
    </div>
    
    <!-- Settings Guidelines -->
    <div class="card">
        <h3><i class="fas fa-exclamation-triangle"></i> Settings Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-shield-alt"></i> 
                Changes to settings take effect immediately across the platform.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-chart-line"></i> 
                Monitor platform performance after making changes to financial settings.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-users"></i> 
                Consider user impact when modifying feature settings.
            </p>
            <p style="color: #666;">
                <i class="fas fa-file-alt"></i> 
                All setting changes are logged for audit purposes.
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
