<?php
/**
 * Admin Settings - Enhanced Version
 * Comprehensive platform settings management
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

// Initialize variables
$error = '';
$success = '';
$settings = [];

try {
    // Get all settings from database
    $settings = $db->fetchAll("SELECT * FROM settings ORDER BY `key` ASC");
    
    // Convert settings array to key-value pairs for easy access
    $settingsArray = [];
    foreach ($settings as $setting) {
        $settingsArray[$setting['key']] = $setting;
    }
    
} catch (Exception $e) {
    $error = 'Error loading settings: ' . $e->getMessage();
    $settingsArray = [];
}

// Handle settings update
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_settings') {
        try {
            $updatedCount = 0;
            foreach ($_POST as $key => $value) {
                if (strpos($key, 'setting_') === 0) {
                    $settingKey = substr($key, 8); // Remove 'setting_' prefix
                    $result = $db->query("UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = ?", [$value, $settingKey]);
                    if ($result) {
                        $updatedCount++;
                    }
                }
            }
            
            if ($updatedCount > 0) {
                $success = "Successfully updated {$updatedCount} settings!";
                // Refresh settings
                $settings = $db->fetchAll("SELECT * FROM settings ORDER BY `key` ASC");
                $settingsArray = [];
                foreach ($settings as $setting) {
                    $settingsArray[$setting['key']] = $setting;
                }
            } else {
                $error = 'No settings were updated.';
            }
        } catch (Exception $e) {
            $error = 'Error updating settings: ' . $e->getMessage();
        }
    } elseif ($action === 'upload_logo') {
        try {
            if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../public/images/';
                $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
                $maxSize = 2 * 1024 * 1024; // 2MB
                
                if (!in_array($_FILES['logo']['type'], $allowedTypes)) {
                    throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and SVG are allowed.');
                }
                
                if ($_FILES['logo']['size'] > $maxSize) {
                    throw new Exception('File size too large. Maximum 2MB allowed.');
                }
                
                $fileExtension = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
                $fileName = 'platform-logo.' . $fileExtension;
                $filePath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['logo']['tmp_name'], $filePath)) {
                    // Update logo setting
                    $db->query("UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = 'platform_logo'", [$fileName]);
                    $success = 'Logo uploaded successfully!';
                } else {
                    throw new Exception('Failed to upload logo file.');
                }
            } else {
                throw new Exception('No logo file uploaded or upload error occurred.');
            }
        } catch (Exception $e) {
            $error = 'Error uploading logo: ' . $e->getMessage();
        }
    } elseif ($action === 'reset_logo') {
        try {
            $db->query("UPDATE settings SET value = 'default-logo.png', updated_at = NOW() WHERE `key` = 'platform_logo'");
            $success = 'Logo reset to default successfully!';
        } catch (Exception $e) {
            $error = 'Error resetting logo: ' . $e->getMessage();
        }
    }
}

// Set page variables
$pageTitle = "Platform Settings";
$pageSubtitle = "Configure platform-wide settings and parameters";

// Start content buffer
ob_start();
?>

<div class="admin-settings-content">
    <!-- Success/Error Messages -->
    <?php if ($success): ?>
        <div class="alert alert-success" style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
            <i class="fas fa-check-circle"></i> <?php echo htmlspecialchars($success); ?>
        </div>
    <?php endif; ?>
    
    <?php if ($error): ?>
        <div class="alert alert-danger" style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #f5c6cb;">
            <i class="fas fa-exclamation-circle"></i> <?php echo htmlspecialchars($error); ?>
        </div>
    <?php endif; ?>

    <!-- Platform Settings Form -->
    <div class="card">
        <h2><i class="fas fa-cog"></i> Platform Settings</h2>
        <p style="color: #666; margin-top: 10px;">Configure platform-wide settings and parameters.</p>
        
        <form method="post" id="settingsForm">
            <input type="hidden" name="action" value="update_settings">
            
            <?php if (!empty($settings)): ?>
                <div style="overflow-x: auto; margin-top: 20px;">
                    <table style="width: 100%; border-collapse: collapse; background-color: white;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">Setting</th>
                                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">Value</th>
                                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">Type</th>
                                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600;">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($settings as $setting): ?>
                                <tr style="border-bottom: 1px solid #dee2e6;">
                                    <td style="padding: 15px;">
                                        <strong><?php echo htmlspecialchars(ucwords(str_replace('_', ' ', $setting['key']))); ?></strong>
                                    </td>
                                    <td style="padding: 15px;">
                                        <?php if ($setting['type'] === 'boolean'): ?>
                                            <select name="setting_<?php echo htmlspecialchars($setting['key']); ?>" 
                                                    style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; background-color: white;">
                                                <option value="true" <?php echo $setting['value'] === 'true' ? 'selected' : ''; ?>>Enabled</option>
                                                <option value="false" <?php echo $setting['value'] === 'false' ? 'selected' : ''; ?>>Disabled</option>
                                            </select>
                                        <?php elseif ($setting['type'] === 'number'): ?>
                                            <input type="number" name="setting_<?php echo htmlspecialchars($setting['key']); ?>" 
                                                   value="<?php echo htmlspecialchars($setting['value']); ?>" 
                                                   step="0.01" 
                                                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 120px;">
                                        <?php else: ?>
                                            <input type="text" name="setting_<?php echo htmlspecialchars($setting['key']); ?>" 
                                                   value="<?php echo htmlspecialchars($setting['value']); ?>" 
                                                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-width: 200px;">
                                        <?php endif; ?>
                                    </td>
                                    <td style="padding: 15px;">
                                        <span style="background-color: #e9ecef; color: #495057; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: 500;">
                                            <?php echo ucfirst($setting['type']); ?>
                                        </span>
                                    </td>
                                    <td style="padding: 15px;">
                                        <small style="color: #666;"><?php echo htmlspecialchars($setting['description'] ?? 'No description'); ?></small>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-cog" style="font-size: 48px; color: #d32f2f; margin-bottom: 15px;"></i>
                    <h4>No Settings Found</h4>
                    <p>System settings will appear here once configured.</p>
                </div>
            <?php endif; ?>
            
            <div style="margin-top: 30px; text-align: center;">
                <button type="submit" class="btn btn-primary" style="padding: 12px 30px; font-size: 16px;">
                    <i class="fas fa-save"></i> Update All Settings
                </button>
            </div>
        </form>
    </div>

    <!-- Logo Management Section -->
    <div class="card" style="margin-top: 30px;">
        <h3><i class="fas fa-image"></i> Logo Management</h3>
        
        <?php
        // Get current logo setting
        $currentLogo = 'default-logo.png';
        if (isset($settingsArray['platform_logo'])) {
            $currentLogo = $settingsArray['platform_logo']['value'];
        }
        ?>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">
            <div>
                <h4 style="margin-bottom: 15px; color: #333;">Current Logo</h4>
                <div style="text-align: center; padding: 20px; border: 2px dashed #ddd; border-radius: 8px;">
                    <img src="/SmartPicksPro-Local/public/images/<?php echo htmlspecialchars($currentLogo); ?>" 
                         alt="Current Logo" 
                         id="current-logo"
                         style="max-width: 200px; max-height: 100px; object-fit: contain;">
                    <img id="logo-preview" 
                         alt="Logo Preview" 
                         style="max-width: 200px; max-height: 100px; object-fit: contain; display: none;">
                    <p style="margin-top: 10px; color: #666; font-size: 14px;">
                        Current Logo: <?php echo htmlspecialchars($currentLogo); ?>
                    </p>
                </div>
            </div>
            
            <div>
                <h4 style="margin-bottom: 15px; color: #333;">Upload New Logo</h4>
                <form method="post" enctype="multipart/form-data" style="margin-bottom: 15px;">
                    <input type="hidden" name="action" value="upload_logo">
                    <div style="margin-bottom: 15px;">
                        <label for="logo" style="display: block; margin-bottom: 5px; font-weight: 600;">Select Logo File:</label>
                        <input type="file" id="logo" name="logo" accept="image/*" required 
                               onchange="previewLogo(this)"
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <small style="color: #666; font-size: 12px;">
                            Supported formats: JPEG, PNG, GIF, SVG. Max size: 2MB
                        </small>
                    </div>
                    <button type="submit" class="btn btn-success" style="margin-right: 10px;">
                        <i class="fas fa-upload"></i> Upload Logo
                    </button>
                </form>
                
                <form method="post" style="display: inline;">
                    <input type="hidden" name="action" value="reset_logo">
                    <button type="submit" class="btn btn-secondary" onclick="return confirm('Reset logo to default?')">
                        <i class="fas fa-undo"></i> Reset to Default
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- System Information -->
    <div class="card" style="margin-top: 30px;">
        <h3><i class="fas fa-info-circle"></i> System Information</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
            <div>
                <p><strong>Platform Version:</strong> <?php echo htmlspecialchars($settingsArray['app_version']['value'] ?? '1.0.0'); ?></p>
                <p><strong>Database:</strong> MySQL</p>
                <p><strong>Framework:</strong> PHP</p>
            </div>
            <div>
                <p><strong>Last Updated:</strong> <?php echo date('M j, Y'); ?></p>
                <p><strong>Admin:</strong> <?php echo htmlspecialchars($user['username']); ?></p>
                <p><strong>Status:</strong> <span style="color: #2e7d32; font-weight: bold;">Active</span></p>
            </div>
        </div>
    </div>

    <!-- Settings Guidelines -->
    <div class="card" style="margin-top: 30px;">
        <h3><i class="fas fa-exclamation-triangle"></i> Settings Guidelines</h3>
        <ul style="margin-top: 15px; padding-left: 20px;">
            <li>Changes to settings take effect immediately across the platform.</li>
            <li>Monitor platform performance after making changes to financial settings.</li>
            <li>Consider user impact when modifying feature settings.</li>
            <li>Test critical changes in a staging environment first.</li>
            <li>Backup your database before making major configuration changes.</li>
        </ul>
    </div>
</div>

<script>
// Logo preview functionality
function previewLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('logo-preview');
            const current = document.getElementById('current-logo');
            if (preview && current) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                current.style.display = 'none';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Form validation
document.getElementById('settingsForm').addEventListener('submit', function(e) {
    if (!confirm('Save all setting changes? This will update the system configuration.')) {
        e.preventDefault();
    }
});
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>

