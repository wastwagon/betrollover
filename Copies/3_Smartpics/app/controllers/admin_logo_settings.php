<?php
/**
 * SmartPicks Pro - Admin Logo Settings
 * 
 * Handles logo management in admin dashboard
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/LogoManager.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication and admin role
AuthMiddleware::requireAdmin();

$db = Database::getInstance();
$logger = Logger::getInstance();
$logoManager = LogoManager::getInstance();

$error = '';
$success = '';
$logos = [];

try {
    // Get all logo settings
    $logos = $logoManager->getAllLogos();
    
    // Handle logo upload
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['logo_file'])) {
        $logoType = $_POST['logo_type'] ?? 'main';
        $file = $_FILES['logo_file'];
        
        if ($file['error'] === UPLOAD_ERR_OK) {
            $result = $logoManager->uploadLogo($file, $logoType);
            
            if ($result['success']) {
                $success = $result['message'];
                
                // Resize logo if needed
                $logoManager->resizeLogo($result['filename']);
                
                // Refresh logos
                $logos = $logoManager->getAllLogos();
            } else {
                $error = $result['error'];
            }
        } else {
            $error = 'File upload failed. Please try again.';
        }
    }
    
    // Handle logo deletion
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_logo') {
        $logoType = $_POST['logo_type'] ?? '';
        
        if ($logoType) {
            $result = $logoManager->deleteLogo($logoType);
            
            if ($result['success']) {
                $success = $result['message'];
                $logos = $logoManager->getAllLogos();
            } else {
                $error = $result['error'];
            }
        }
    }
    
} catch (Exception $e) {
    $error = "Error: " . $e->getMessage();
    $logger->error("Admin logo settings error", ['error' => $e->getMessage()]);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logo Settings - SmartPicks Pro Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-red: #DC2626;
            --secondary-red: #EF4444;
            --accent-red: #B91C1C;
            --primary-white: #FFFFFF;
            --secondary-white: #F9FAFB;
            --primary-green: #059669;
            --secondary-green: #10B981;
            --neutral-gray: #6B7280;
            --light-gray: #E5E7EB;
        }
        
        body {
            background: var(--secondary-white);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .header {
            background: var(--primary-red);
            color: white;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        
        .logo-preview {
            border: 2px dashed var(--light-gray);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            background: white;
            margin-bottom: 20px;
        }
        
        .logo-preview img {
            max-width: 200px;
            max-height: 100px;
            object-fit: contain;
        }
        
        .upload-area {
            border: 2px dashed var(--primary-red);
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            background: white;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .upload-area:hover {
            border-color: var(--accent-red);
            background: var(--secondary-white);
        }
        
        .upload-area.dragover {
            border-color: var(--primary-green);
            background: var(--secondary-green);
            color: white;
        }
        
        .btn-primary {
            background: var(--primary-red);
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
            background: var(--accent-red);
            transform: translateY(-2px);
        }
        
        .btn-success {
            background: var(--primary-green);
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
        }
        
        .btn-danger {
            background: var(--primary-red);
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            font-weight: 600;
        }
        
        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .card-header {
            background: var(--primary-red);
            color: white;
            border-radius: 15px 15px 0 0;
            padding: 20px;
        }
        
        .logo-item {
            background: white;
            border: 1px solid var(--light-gray);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
        }
        
        .logo-item h6 {
            color: var(--primary-red);
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .logo-item img {
            max-width: 150px;
            max-height: 75px;
            object-fit: contain;
            border: 1px solid var(--light-gray);
            border-radius: 5px;
            padding: 5px;
        }
        
        .file-info {
            background: var(--secondary-white);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
        }
        
        .file-info h6 {
            color: var(--neutral-gray);
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .file-info p {
            margin: 5px 0;
            font-size: 13px;
            color: var(--neutral-gray);
        }
        
        .alert {
            border-radius: 10px;
            border: none;
            padding: 15px 20px;
        }
        
        .alert-success {
            background: var(--secondary-green);
            color: white;
        }
        
        .alert-danger {
            background: var(--secondary-red);
            color: white;
        }
        
        .form-control, .form-select {
            border: 2px solid var(--light-gray);
            border-radius: 8px;
            padding: 12px 15px;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--primary-red);
            box-shadow: 0 0 0 0.2rem rgba(220, 38, 38, 0.25);
        }
        
        .form-label {
            font-weight: 600;
            color: var(--neutral-gray);
            margin-bottom: 8px;
        }
        
        .logo-type-badge {
            background: var(--primary-red);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .logo-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .logo-status.exists {
            background: var(--secondary-green);
            color: white;
        }
        
        .logo-status.missing {
            background: var(--secondary-red);
            color: white;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.5rem;
            }
            
            .upload-area {
                padding: 20px;
            }
            
            .logo-item {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h1><i class="fas fa-image"></i> Logo Settings</h1>
                    <p class="mb-0">Manage platform logos and branding</p>
                </div>
                <div class="col-md-6 text-end">
                    <a href="/admin_dashboard" class="btn btn-light">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Messages -->
        <?php if ($success): ?>
            <div class="alert alert-success alert-dismissible fade show">
                <i class="fas fa-check-circle"></i> <?= htmlspecialchars($success) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="alert alert-danger alert-dismissible fade show">
                <i class="fas fa-exclamation-triangle"></i> <?= htmlspecialchars($error) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <div class="row">
            <!-- Upload New Logo -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="mb-0"><i class="fas fa-upload"></i> Upload New Logo</h3>
                    </div>
                    <div class="card-body">
                        <form method="POST" enctype="multipart/form-data" id="logoUploadForm">
                            <div class="mb-3">
                                <label class="form-label">Logo Type</label>
                                <select class="form-select" name="logo_type" required>
                                    <option value="main">Main Logo</option>
                                    <option value="admin">Admin Logo</option>
                                    <option value="favicon">Favicon</option>
                                </select>
                            </div>
                            
                            <div class="upload-area" id="uploadArea">
                                <i class="fas fa-cloud-upload-alt fa-3x mb-3" style="color: var(--primary-red);"></i>
                                <h5>Drop logo file here or click to browse</h5>
                                <p class="text-muted">Supported formats: JPG, PNG, GIF, SVG<br>Max size: 2MB</p>
                                <input type="file" name="logo_file" id="logoFile" accept="image/*" required style="display: none;">
                                <button type="button" class="btn btn-primary" onclick="document.getElementById('logoFile').click()">
                                    <i class="fas fa-folder-open"></i> Choose File
                                </button>
                            </div>
                            
                            <div id="filePreview" style="display: none;">
                                <div class="logo-preview">
                                    <img id="previewImage" src="" alt="Logo Preview">
                                    <div class="file-info">
                                        <h6>File Information</h6>
                                        <p id="fileName"></p>
                                        <p id="fileSize"></p>
                                        <p id="fileType"></p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="text-center mt-3">
                                <button type="submit" class="btn btn-success" id="uploadBtn" style="display: none;">
                                    <i class="fas fa-upload"></i> Upload Logo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Current Logos -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="mb-0"><i class="fas fa-images"></i> Current Logos</h3>
                    </div>
                    <div class="card-body">
                        <?php if (empty($logos)): ?>
                            <div class="text-center text-muted py-4">
                                <i class="fas fa-image fa-3x mb-3"></i>
                                <p>No logos uploaded yet</p>
                                <small>Upload your first logo to get started</small>
                            </div>
                        <?php else: ?>
                            <?php foreach ($logos as $type => $logo): ?>
                                <div class="logo-item">
                                    <div class="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h6>
                                                <span class="logo-type-badge"><?= ucfirst($type) ?></span>
                                                <?= ucfirst($type) ?> Logo
                                            </h6>
                                            <span class="logo-status <?= $logo['exists'] ? 'exists' : 'missing' ?>">
                                                <?= $logo['exists'] ? 'Active' : 'Missing' ?>
                                            </span>
                                        </div>
                                        <div>
                                            <form method="POST" style="display: inline;" onsubmit="return confirm('Delete this logo?')">
                                                <input type="hidden" name="action" value="delete_logo">
                                                <input type="hidden" name="logo_type" value="<?= $type ?>">
                                                <button type="submit" class="btn btn-danger btn-sm">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                    
                                    <?php if ($logo['exists']): ?>
                                        <img src="<?= htmlspecialchars($logo['url']) ?>" alt="<?= ucfirst($type) ?> Logo" class="img-fluid">
                                        <div class="file-info">
                                            <h6>Logo Details</h6>
                                            <p><strong>Filename:</strong> <?= htmlspecialchars($logo['value']) ?></p>
                                            <p><strong>URL:</strong> <?= htmlspecialchars($logo['url']) ?></p>
                                        </div>
                                    <?php else: ?>
                                        <div class="text-center text-muted py-3">
                                            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                                            <p>Logo file not found</p>
                                            <small>Upload a new logo to replace this one</small>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Logo Usage Instructions -->
        <div class="card mt-4">
            <div class="card-header">
                <h3 class="mb-0"><i class="fas fa-info-circle"></i> Logo Usage Instructions</h3>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <h6><i class="fas fa-home"></i> Main Logo</h6>
                        <p class="text-muted">Used on the main website, user dashboard, and public pages. Recommended size: 200x80px</p>
                    </div>
                    <div class="col-md-4">
                        <h6><i class="fas fa-cog"></i> Admin Logo</h6>
                        <p class="text-muted">Used in the admin dashboard and admin pages. Recommended size: 150x60px</p>
                    </div>
                    <div class="col-md-4">
                        <h6><i class="fas fa-star"></i> Favicon</h6>
                        <p class="text-muted">Used as the browser tab icon. Recommended size: 32x32px or 16x16px</p>
                    </div>
                </div>
                
                <div class="alert alert-info mt-3">
                    <i class="fas fa-lightbulb"></i>
                    <strong>Pro Tip:</strong> For best results, use PNG format with transparent background. SVG format is also supported for scalable logos.
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // File upload handling
        document.getElementById('logoFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                showFilePreview(file);
            }
        });
        
        // Drag and drop handling
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                document.getElementById('logoFile').files = files;
                showFilePreview(files[0]);
            }
        });
        
        // Click to upload
        uploadArea.addEventListener('click', function() {
            document.getElementById('logoFile').click();
        });
        
        function showFilePreview(file) {
            const preview = document.getElementById('filePreview');
            const previewImage = document.getElementById('previewImage');
            const fileName = document.getElementById('fileName');
            const fileSize = document.getElementById('fileSize');
            const fileType = document.getElementById('fileType');
            const uploadBtn = document.getElementById('uploadBtn');
            
            // Show preview
            preview.style.display = 'block';
            uploadBtn.style.display = 'inline-block';
            
            // Set file info
            fileName.textContent = 'Name: ' + file.name;
            fileSize.textContent = 'Size: ' + formatFileSize(file.size);
            fileType.textContent = 'Type: ' + file.type;
            
            // Show image preview
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
        
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Form submission
        document.getElementById('logoUploadForm').addEventListener('submit', function(e) {
            const fileInput = document.getElementById('logoFile');
            if (!fileInput.files.length) {
                e.preventDefault();
                alert('Please select a file to upload');
                return;
            }
            
            const file = fileInput.files[0];
            if (file.size > 2 * 1024 * 1024) {
                e.preventDefault();
                alert('File size exceeds 2MB limit');
                return;
            }
        });
    </script>
</body>
</html>
