<?php
/**
 * Admin Growth Settings - Complete Feature Version
 * Uses the new layout system with full functionality from old system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAuth();
if ($_SESSION['role'] !== 'admin') {
    header('Location: /SmartPicksPro-Local/login');
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();

// Get admin info
$userId = $_SESSION['user_id'];
$user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);

$error = '';
$success = '';
$settings = [];

try {
    // Handle form submission
    if ($_POST) {
        $updatedCount = 0;
        
        // First, handle boolean settings (checkboxes) that might be unchecked
        $booleanSettings = ['referral_enabled', 'gamification_enabled', 'tipster_qualification_enabled'];
        foreach ($booleanSettings as $boolKey) {
            $formKey = 'setting_' . $boolKey;
            if (!isset($_POST[$formKey])) {
                $_POST[$formKey] = '0'; // Set to 0 if unchecked
            }
        }
        
        // Process each setting from the form
        foreach ($_POST as $key => $value) {
            if (strpos($key, 'setting_') === 0) {
                $settingKey = substr($key, 8); // Remove 'setting_' prefix
                
                // Update the setting in database
                $db->query("
                    UPDATE growth_settings 
                    SET setting_value = ?, updated_by = ?, updated_at = NOW() 
                    WHERE setting_key = ?
                ", [$value, $_SESSION['user_id'], $settingKey]);
                
                $updatedCount++;
            }
        }
        
        if ($updatedCount > 0) {
            $success = "Settings updated successfully! {$updatedCount} settings saved.";
            
            // Re-fetch settings to display the updated values
            $settings = $db->fetchAll("SELECT * FROM growth_settings ORDER BY category, setting_key");
            $groupedSettings = [];
            foreach ($settings as $setting) {
                $groupedSettings[$setting['category']][] = $setting;
            }
        } else {
            $error = "No settings were updated.";
        }
    }
    
    // Fetch all settings from database
    $settings = $db->fetchAll("SELECT * FROM growth_settings ORDER BY category, setting_key");
    
    // Group settings by category
    $groupedSettings = [];
    foreach ($settings as $setting) {
        $groupedSettings[$setting['category']][] = $setting;
    }
    
    // Helper function to get setting value
    function getSettingValue($settings, $key, $default = '') {
        foreach ($settings as $setting) {
            if ($setting['setting_key'] === $key) {
                return $setting['setting_value'];
            }
        }
        return $default;
    }
    
} catch (Exception $e) {
    $error = 'Error: ' . $e->getMessage();
    $logger->error("Growth settings error", [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}

// Set page variables
$pageTitle = "Growth Settings";

// Start content buffer
ob_start();
?>

<div class="admin-growth-content">
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
        <h2><i class="fas fa-rocket"></i> Growth Settings</h2>
        <p style="color: #666; margin-top: 10px;">Configure referral system and gamification features to drive platform growth.</p>
    </div>
    
    <form method="POST">
        <!-- Referral System Settings -->
        <div class="card">
            <h3><i class="fas fa-share-alt"></i> Referral System Settings</h3>
            
            <div style="margin-top: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Enable Referral System</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="simple-toggle <?= getSettingValue($settings, 'referral_enabled') == '1' ? 'active' : '' ?>" 
                                 onclick="toggleSwitch(this, 'referral_enabled')"></div>
                            <input type="hidden" name="setting_referral_enabled" id="referral_enabled" 
                                   value="<?= getSettingValue($settings, 'referral_enabled', '1') ?>">
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Referral Bonus Type</label>
                        <select name="setting_referral_bonus_type" 
                                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="exact" <?= getSettingValue($settings, 'referral_bonus_type', 'exact') === 'exact' ? 'selected' : '' ?>>Exact Amount (Same as deposit)</option>
                            <option value="percentage" <?= getSettingValue($settings, 'referral_bonus_type', 'exact') === 'percentage' ? 'selected' : '' ?>>Percentage of Deposit</option>
                            <option value="fixed" <?= getSettingValue($settings, 'referral_bonus_type', 'exact') === 'fixed' ? 'selected' : '' ?>>Fixed Amount</option>
                        </select>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">How the referrer bonus is calculated when a referral makes their first deposit</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Referral Bonus Percentage (%)</label>
                        <input type="number" name="setting_referral_bonus_percentage" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="1" min="0" max="100"
                               value="<?= getSettingValue($settings, 'referral_bonus_percentage', '100') ?>">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Percentage of deposit given as bonus (if type is percentage). 100% = exact deposit amount</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Fixed Bonus Amount (GHS)</label>
                        <input type="number" name="setting_referral_bonus_amount" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'referral_bonus_amount', '0') ?>">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Fixed bonus amount (if type is fixed)</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Minimum Deposit Amount (GHS)</label>
                        <input type="number" name="setting_referral_min_deposit" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'referral_min_deposit', '0') ?>">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Minimum deposit amount required to trigger referral bonus (0 = no minimum)</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Max Uses Per Referral Code</label>
                        <input type="number" name="setting_referral_max_uses_per_code" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="1" min="1"
                               value="<?= getSettingValue($settings, 'referral_max_uses_per_code', '10') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Referral Bonus Expiry (Days)</label>
                        <input type="number" name="setting_referral_bonus_expiry_days" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="1" min="1"
                               value="<?= getSettingValue($settings, 'referral_bonus_expiry_days', '30') ?>">
                    </div>
                </div>
            </div>
        </div>
    
        <!-- Gamification Rewards Settings -->
        <div class="card">
            <h3><i class="fas fa-trophy"></i> Gamification Rewards Settings</h3>
            
            <div style="margin-top: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Enable Gamification Rewards</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="simple-toggle <?= getSettingValue($settings, 'gamification_enabled') == '1' ? 'active' : '' ?>" 
                                 onclick="toggleSwitch(this, 'gamification_enabled')"></div>
                            <input type="hidden" name="setting_gamification_enabled" id="gamification_enabled" 
                                   value="<?= getSettingValue($settings, 'gamification_enabled', '1') ?>">
                        </div>
                    </div>
                </div>
                
                <h5 style="margin-top: 20px; margin-bottom: 15px; color: #d32f2f;">Achievement Rewards (GHS)</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">First Purchase Bonus</label>
                        <input type="number" name="setting_achievement_first_purchase_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'achievement_first_purchase_bonus', '10.00') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Loyal Customer Bonus</label>
                        <input type="number" name="setting_achievement_loyal_customer_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'achievement_loyal_customer_bonus', '25.00') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Social Butterfly Bonus</label>
                        <input type="number" name="setting_achievement_social_butterfly_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'achievement_social_butterfly_bonus', '30.00') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Referral Champion Bonus</label>
                        <input type="number" name="setting_achievement_referral_champion_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'achievement_referral_champion_bonus', '40.00') ?>">
                    </div>
                </div>
                
                <h5 style="margin-top: 20px; margin-bottom: 15px; color: #d32f2f;">Level Rewards (GHS)</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Bronze Level Bonus</label>
                        <input type="number" name="setting_level_bronze_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'level_bronze_bonus', '15.00') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Silver Level Bonus</label>
                        <input type="number" name="setting_level_silver_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'level_silver_bonus', '25.00') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Gold Level Bonus</label>
                        <input type="number" name="setting_level_gold_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'level_gold_bonus', '50.00') ?>">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Platinum Level Bonus</label>
                        <input type="number" name="setting_level_platinum_bonus" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="0.01" min="0"
                               value="<?= getSettingValue($settings, 'level_platinum_bonus', '100.00') ?>">
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Tipster Qualification Settings -->
        <div class="card">
            <h3><i class="fas fa-user-check"></i> Tipster Qualification Settings</h3>
            <p style="color: #666; margin-top: 10px;">Configure requirements for tipsters to access marketplace</p>
            
            <div style="margin-top: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Enable Tipster Qualification</label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="simple-toggle <?= getSettingValue($settings, 'tipster_qualification_enabled') == '1' ? 'active' : '' ?>" 
                                 onclick="toggleSwitch(this, 'tipster_qualification_enabled')"></div>
                            <input type="hidden" name="setting_tipster_qualification_enabled" id="tipster_qualification_enabled" 
                                   value="<?= getSettingValue($settings, 'tipster_qualification_enabled', '1') ?>">
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Require tipsters to meet qualification criteria before marketplace access</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Minimum Free Picks Required</label>
                        <input type="number" name="setting_tipster_min_free_picks" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="1" min="1"
                               value="<?= getSettingValue($settings, 'tipster_min_free_picks', '20') ?>">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Minimum number of free picks tipster must share</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Minimum ROI Percentage (%)</label>
                        <input type="number" name="setting_tipster_min_roi_percentage" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="1" min="0" max="100"
                               value="<?= getSettingValue($settings, 'tipster_min_roi_percentage', '20') ?>">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Minimum ROI percentage required on free picks</p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Qualification Period (Days)</label>
                        <input type="number" name="setting_tipster_qualification_period_days" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" step="1" min="1"
                               value="<?= getSettingValue($settings, 'tipster_qualification_period_days', '90') ?>">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Period to calculate ROI and free picks</p>
                    </div>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                    <h5 style="color: #856404; margin-bottom: 10px;"><i class="fas fa-exclamation-triangle"></i> Qualification Requirements:</h5>
                    <ul style="color: #856404; margin: 0; padding-left: 20px;">
                        <li><strong>Free Picks:</strong> Tipster must share minimum number of free picks</li>
                        <li><strong>ROI Requirement:</strong> Must achieve minimum ROI percentage on free picks</li>
                        <li><strong>Period:</strong> Calculations based on specified number of days</li>
                        <li><strong>Marketplace Access:</strong> Only qualified tipsters can sell picks</li>
                        <li><strong>Ongoing Monitoring:</strong> ROI is monitored continuously - if it falls below minimum, marketplace access is revoked</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Achievement Settings -->
        <div style="margin-top: 30px;">
            <h3><i class="fas fa-medal"></i> Achievement Settings</h3>
            <p style="color: #666; margin-top: 10px;">Configure achievement badges and rewards for user engagement.</p>
            
            <div style="margin-top: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">First Purchase Badge</label>
                        <input type="text" name="setting_first_purchase_badge"
                               value="<?php echo htmlspecialchars($settings['first_purchase_badge']['value'] ?? 'First Buyer'); ?>"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            <?php echo htmlspecialchars($settings['first_purchase_badge']['description'] ?? 'Badge name for first purchase'); ?>
                        </p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Streak Master Badge</label>
                        <input type="text" name="setting_streak_master_badge"
                               value="<?php echo htmlspecialchars($settings['streak_master_badge']['value'] ?? 'Streak Master'); ?>"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            <?php echo htmlspecialchars($settings['streak_master_badge']['description'] ?? 'Badge name for winning streaks'); ?>
                        </p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">High Roller Badge</label>
                        <input type="text" name="setting_high_roller_badge"
                               value="<?php echo htmlspecialchars($settings['high_roller_badge']['value'] ?? 'High Roller'); ?>"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            <?php echo htmlspecialchars($settings['high_roller_badge']['description'] ?? 'Badge name for high-value purchases'); ?>
                        </p>
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Social Butterfly Badge</label>
                        <input type="text" name="setting_social_butterfly_badge"
                               value="<?php echo htmlspecialchars($settings['social_butterfly_badge']['value'] ?? 'Social Butterfly'); ?>"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            <?php echo htmlspecialchars($settings['social_butterfly_badge']['description'] ?? 'Badge name for active referrers'); ?>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Submit Button -->
        <div style="margin-top: 30px; text-align: center;">
            <button type="submit" class="btn btn-primary" style="padding: 12px 30px; font-size: 16px;">
                <i class="fas fa-save"></i> Update Growth Settings
            </button>
        </div>
    </form>
    
    <!-- Growth Analytics -->
    <div class="card">
        <h3><i class="fas fa-chart-line"></i> Growth Analytics</h3>
        <div style="margin-top: 15px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; color: #2e7d32;">0</p>
                    <p style="font-size: 12px; color: #666;">Total Referrals</p>
                </div>
                <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; color: #d32f2f;">0</p>
                    <p style="font-size: 12px; color: #666;">Active Users</p>
                </div>
                <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; color: #666;">0</p>
                    <p style="font-size: 12px; color: #666;">Points Earned</p>
                </div>
                <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; color: #2e7d32;">0</p>
                    <p style="font-size: 12px; color: #666;">Badges Awarded</p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Growth Guidelines -->
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Growth Guidelines</h3>
        <div style="margin-top: 15px;">
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-rocket"></i> 
                Growth features help increase user engagement and platform adoption.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-share-alt"></i> 
                Referral rewards should be balanced to encourage sharing without excessive costs.
            </p>
            <p style="color: #666; margin-bottom: 10px;">
                <i class="fas fa-trophy"></i> 
                Gamification elements make the platform more engaging and fun to use.
            </p>
            <p style="color: #666;">
                <i class="fas fa-chart-line"></i> 
                Monitor growth metrics to optimize settings for maximum impact.
            </p>
        </div>
    </div>
</div>

<style>
.simple-toggle {
    display: inline-block;
    position: relative;
    width: 60px;
    height: 30px;
    background-color: #ccc;
    border-radius: 15px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.simple-toggle.active {
    background-color: #d32f2f;
}

.simple-toggle::after {
    content: '';
    position: absolute;
    width: 26px;
    height: 26px;
    background-color: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.3s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.simple-toggle.active::after {
    transform: translateX(30px);
}
</style>

<script>
function toggleSwitch(element, settingName) {
    element.classList.toggle('active');
    const hiddenInput = document.getElementById(settingName);
    hiddenInput.value = element.classList.contains('active') ? '1' : '0';
}
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include admin layout
include __DIR__ . '/../views/layouts/admin_layout.php';
?>
