<?php
/**
 * Profile - Clean, Simple Version
 * Uses the new layout system
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
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

// Handle profile updates
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'update_profile') {
        $username = trim($_POST['username'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $fullName = trim($_POST['full_name'] ?? '');
        $bio = trim($_POST['bio'] ?? '');
        
        if (empty($username) || empty($email)) {
            $error = "Username and email are required.";
        } else {
            try {
                // Check if username is already taken by another user
                $existingUser = $db->fetch("SELECT id FROM users WHERE username = ? AND id != ?", [$username, $userId]);
                if ($existingUser) {
                    $error = "Username is already taken.";
                } else {
                    // Handle profile image upload
                    $avatarPath = $user['avatar']; // Keep existing avatar by default
                    
                    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
                        $uploadDir = __DIR__ . '/../../storage/uploads/avatars/';
                        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                        $maxSize = 5 * 1024 * 1024; // 5MB
                        
                        $fileInfo = $_FILES['avatar'];
                        
                        // Validate file type
                        if (!in_array($fileInfo['type'], $allowedTypes)) {
                            $error = "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.";
                        } elseif ($fileInfo['size'] > $maxSize) {
                            $error = "File size too large. Maximum size is 5MB.";
                        } else {
                            // Generate unique filename
                            $extension = pathinfo($fileInfo['name'], PATHINFO_EXTENSION);
                            $filename = 'avatar_' . $userId . '_' . time() . '.' . $extension;
                            $filePath = $uploadDir . $filename;
                            
                            if (move_uploaded_file($fileInfo['tmp_name'], $filePath)) {
                                // Delete old avatar if it exists
                                if ($user['avatar'] && file_exists(__DIR__ . '/../../' . $user['avatar'])) {
                                    unlink(__DIR__ . '/../../' . $user['avatar']);
                                }
                                
                                $avatarPath = 'storage/uploads/avatars/' . $filename;
                            } else {
                                $error = "Failed to upload image. Please try again.";
                            }
                        }
                    }
                    
                    if (empty($error)) {
                        // Update user profile
                        $db->query("
                            UPDATE users 
                            SET username = ?, email = ?, display_name = ?, bio = ?, avatar = ?, updated_at = NOW()
                            WHERE id = ?
                        ", [$username, $email, $fullName, $bio, $avatarPath, $userId]);
                        
                        $message = "Profile updated successfully.";
                        
                        // Refresh user data
                        $user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);
                    }
                }
            } catch (Exception $e) {
                $error = "Error updating profile: " . $e->getMessage();
            }
        }
    }
    
    if ($action === 'remove_avatar') {
        try {
            // Delete current avatar file
            if ($user['avatar'] && file_exists(__DIR__ . '/../../' . $user['avatar'])) {
                unlink(__DIR__ . '/../../' . $user['avatar']);
            }
            
            // Update database
            $db->query("UPDATE users SET avatar = NULL, updated_at = NOW() WHERE id = ?", [$userId]);
            
            $message = "Profile image removed successfully.";
            
            // Refresh user data
            $user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);
        } catch (Exception $e) {
            $error = "Error removing profile image: " . $e->getMessage();
        }
    }
}

// Set page variables
$pageTitle = "Profile";

// Start content buffer
ob_start();
?>

<div class="profile-content">
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
        <h2><i class="fas fa-user"></i> Profile Information</h2>
        
        <!-- Profile Image Section -->
        <div style="margin-bottom: 30px; text-align: center;">
            <div style="position: relative; display: inline-block;">
                <?php if ($user['avatar']): ?>
                <img src="/SmartPicksPro-Local/<?php echo htmlspecialchars($user['avatar']); ?>" 
                     alt="Profile Image" 
                     style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #d32f2f; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <?php else: ?>
                <div style="width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #d32f2f, #f44336); display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 3px solid #d32f2f; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <i class="fas fa-user" style="font-size: 48px; color: white;"></i>
                </div>
                <?php endif; ?>
                
                <div style="margin-top: 15px;">
                    <label for="avatar" class="btn btn-secondary" style="margin-right: 10px; cursor: pointer;">
                        <i class="fas fa-camera"></i> Change Photo
                    </label>
                    <?php if ($user['avatar']): ?>
                    <button type="button" onclick="removeAvatar()" class="btn btn-danger" style="cursor: pointer;">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <form method="POST" enctype="multipart/form-data" style="margin-top: 20px;">
            <input type="hidden" name="action" value="update_profile">
            <input type="file" id="avatar" name="avatar" accept="image/*" style="display: none;" onchange="previewImage(this)">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Username</label>
                    <input type="text" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email</label>
                    <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Full Name</label>
                <input type="text" name="full_name" value="<?php echo htmlspecialchars($user['display_name'] ?? ''); ?>"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Bio</label>
                <textarea name="bio" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;"><?php echo htmlspecialchars($user['bio'] ?? ''); ?></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Update Profile
            </button>
        </form>
        
        <!-- Remove Avatar Form -->
        <?php if ($user['avatar']): ?>
        <form id="removeAvatarForm" method="POST" style="display: none;">
            <input type="hidden" name="action" value="remove_avatar">
        </form>
        <?php endif; ?>
    </div>
    
    <div class="card">
        <h3><i class="fas fa-info-circle"></i> Account Information</h3>
        <div style="margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Role:</span>
                <span style="color: #d32f2f; text-transform: capitalize;"><?php echo $userRole; ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Member Since:</span>
                <span style="color: #666;"><?php echo date('M j, Y', strtotime($user['created_at'])); ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500;">Last Updated:</span>
                <span style="color: #666;"><?php echo isset($user['updated_at']) ? date('M j, Y g:i A', strtotime($user['updated_at'])) : 'Never'; ?></span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                <span style="font-weight: 500;">Status:</span>
                <span style="color: #2e7d32; font-weight: 500;">
                    <i class="fas fa-check-circle"></i> Active
                </span>
            </div>
        </div>
    </div>
    
    <?php if ($userRole === 'user'): ?>
    <div class="card">
        <h3><i class="fas fa-star"></i> Become a Tipster</h3>
        <p style="color: #666; margin-top: 10px;">
            Ready to share your expertise and earn money? Apply to become a verified tipster and start selling your picks.
        </p>
        <a href="<?= $baseUrl ?>/become_tipster" class="btn btn-primary" style="margin-top: 15px;">
            <i class="fas fa-star"></i> Apply Now
        </a>
    </div>
    <?php endif; ?>
</div>

<script>
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create a preview of the selected image
            const preview = document.createElement('div');
            preview.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 2000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            preview.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; max-width: 400px;">
                    <h3 style="margin-bottom: 15px;">Image Preview</h3>
                    <img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;">
                    <div>
                        <button onclick="this.closest('.preview').remove()" class="btn btn-secondary" style="margin-right: 10px;">Cancel</button>
                        <button onclick="submitForm()" class="btn btn-primary">Use This Image</button>
                    </div>
                </div>
            `;
            
            preview.className = 'preview';
            document.body.appendChild(preview);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function submitForm() {
    // Remove preview
    document.querySelector('.preview').remove();
    // Submit the form
    document.querySelector('form[enctype="multipart/form-data"]').submit();
}

function removeAvatar() {
    if (confirm('Are you sure you want to remove your profile image?')) {
        document.getElementById('removeAvatarForm').submit();
    }
}

// File size validation
document.getElementById('avatar').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('File size too large. Maximum size is 5MB.');
            e.target.value = '';
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
            e.target.value = '';
            return;
        }
    }
});
</script>

<?php
// Get the content
$content = ob_get_clean();

// Include the appropriate layout based on user role
if ($userRole === 'admin') {
    include __DIR__ . '/../views/layouts/admin_layout.php';
} elseif ($userRole === 'tipster') {
    include __DIR__ . '/../views/layouts/tipster_layout.php';
} else {
    include __DIR__ . '/../views/layouts/user_layout.php';
}
?>
