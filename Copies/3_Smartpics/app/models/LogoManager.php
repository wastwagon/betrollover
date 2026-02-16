<?php
/**
 * SmartPicks Pro - Logo Management System
 * 
 * Handles logo upload, management, and display across the platform
 */

class LogoManager {
    
    private static $instance = null;
    private $db;
    private $logger;
    private $uploadPath;
    private $allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    private $maxSize = 2 * 1024 * 1024; // 2MB
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->uploadPath = __DIR__ . '/../../public/images/logos/';
        
        // Create upload directory if it doesn't exist
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Upload and set new logo
     */
    public function uploadLogo($file, $type = 'main') {
        try {
            // Validate file
            $this->validateFile($file);
            
            // Generate unique filename
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = 'logo_' . $type . '_' . time() . '.' . $extension;
            $filepath = $this->uploadPath . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                throw new Exception('Failed to upload logo file');
            }
            
            // Get old logo path for cleanup
            $oldLogo = $this->getLogoPath($type);
            
            // Update database
            $this->updateLogoSetting($type, $filename);
            
            // Clean up old logo
            if ($oldLogo && file_exists($oldLogo)) {
                unlink($oldLogo);
            }
            
            $this->logger->info("Logo uploaded successfully", [
                'type' => $type,
                'filename' => $filename,
                'user_id' => $_SESSION['user_id'] ?? null
            ]);
            
            return [
                'success' => true,
                'message' => 'Logo uploaded successfully',
                'filename' => $filename,
                'url' => $this->getLogoUrl($filename)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Logo upload failed", [
                'error' => $e->getMessage(),
                'type' => $type,
                'user_id' => $_SESSION['user_id'] ?? null
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get logo URL for display
     */
    public function getLogoUrl($type = 'main', $size = 'default') {
        try {
            $logoSetting = $this->getLogoSetting($type);
            
            if ($logoSetting && $logoSetting['value']) {
                $filename = $logoSetting['value'];
                $filepath = $this->uploadPath . $filename;
                
                if (file_exists($filepath)) {
                    return '/public/images/logos/' . $filename;
                }
            }
            
            // Return default logo
            return $this->getDefaultLogo($type, $size);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting logo URL", [
                'error' => $e->getMessage(),
                'type' => $type
            ]);
            
            return $this->getDefaultLogo($type, $size);
        }
    }
    
    /**
     * Get logo HTML for display
     */
    public function getLogoHtml($type = 'main', $size = 'default', $class = '') {
        $url = $this->getLogoUrl($type, $size);
        $alt = $this->getLogoAlt($type);
        
        $sizeClasses = [
            'small' => 'height="30"',
            'medium' => 'height="50"',
            'large' => 'height="80"',
            'default' => 'height="50"'
        ];
        
        $sizeAttr = $sizeClasses[$size] ?? $sizeClasses['default'];
        
        return sprintf(
            '<img src="%s" alt="%s" %s class="logo %s" style="max-width: 100%%; height: auto;">',
            htmlspecialchars($url),
            htmlspecialchars($alt),
            $sizeAttr,
            htmlspecialchars($class)
        );
    }
    
    /**
     * Get all logo settings
     */
    public function getAllLogos() {
        try {
            $logos = $this->db->fetchAll("
                SELECT * FROM settings 
                WHERE `key` LIKE 'logo_%' 
                ORDER BY `key`
            ");
            
            $result = [];
            foreach ($logos as $logo) {
                $type = str_replace('logo_', '', $logo['key']);
                $result[$type] = [
                    'key' => $logo['key'],
                    'value' => $logo['value'],
                    'url' => $this->getLogoUrl($type),
                    'exists' => $this->logoFileExists($logo['value'])
                ];
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("Error getting all logos", [
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }
    
    /**
     * Delete logo
     */
    public function deleteLogo($type) {
        try {
            $logoSetting = $this->getLogoSetting($type);
            
            if ($logoSetting && $logoSetting['value']) {
                $filepath = $this->uploadPath . $logoSetting['value'];
                
                // Delete file if exists
                if (file_exists($filepath)) {
                    unlink($filepath);
                }
                
                // Update database
                $this->updateLogoSetting($type, '');
                
                $this->logger->info("Logo deleted", [
                    'type' => $type,
                    'user_id' => $_SESSION['user_id'] ?? null
                ]);
                
                return [
                    'success' => true,
                    'message' => 'Logo deleted successfully'
                ];
            }
            
            return [
                'success' => false,
                'error' => 'No logo found to delete'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("Error deleting logo", [
                'error' => $e->getMessage(),
                'type' => $type
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Validate uploaded file
     */
    private function validateFile($file) {
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new Exception('Invalid file upload');
        }
        
        if ($file['size'] > $this->maxSize) {
            throw new Exception('File size exceeds maximum allowed size (2MB)');
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedTypes)) {
            throw new Exception('Invalid file type. Allowed types: ' . implode(', ', $this->allowedTypes));
        }
        
        // Check MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        $allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/svg+xml'
        ];
        
        if (!in_array($mimeType, $allowedMimes)) {
            throw new Exception('Invalid file type detected');
        }
    }
    
    /**
     * Get logo setting from database
     */
    private function getLogoSetting($type) {
        return $this->db->fetch("
            SELECT * FROM settings 
            WHERE `key` = ?
        ", ['logo_' . $type]);
    }
    
    /**
     * Update logo setting in database
     */
    private function updateLogoSetting($type, $filename) {
        $key = 'logo_' . $type;
        
        // Check if setting exists
        $existing = $this->db->fetch("SELECT id FROM settings WHERE `key` = ?", [$key]);
        
        if ($existing) {
            // Update existing setting
            $this->db->query("
                UPDATE settings 
                SET value = ?, updated_at = NOW() 
                WHERE `key` = ?
            ", [$filename, $key]);
        } else {
            // Insert new setting
            $this->db->insert('settings', [
                'key' => $key,
                'value' => $filename,
                'type' => 'string',
                'description' => ucfirst($type) . ' logo filename'
            ]);
        }
    }
    
    /**
     * Get default logo URL
     */
    private function getDefaultLogo($type, $size) {
        $defaultLogos = [
            'main' => '/public/images/default-logo.png',
            'admin' => '/public/images/default-admin-logo.png',
            'favicon' => '/public/images/default-favicon.ico'
        ];
        
        return $defaultLogos[$type] ?? $defaultLogos['main'];
    }
    
    /**
     * Get logo alt text
     */
    private function getLogoAlt($type) {
        $altTexts = [
            'main' => 'SmartPicks Pro Logo',
            'admin' => 'SmartPicks Pro Admin',
            'favicon' => 'SmartPicks Pro'
        ];
        
        return $altTexts[$type] ?? 'SmartPicks Pro';
    }
    
    /**
     * Check if logo file exists
     */
    private function logoFileExists($filename) {
        if (!$filename) return false;
        
        $filepath = $this->uploadPath . $filename;
        return file_exists($filepath);
    }
    
    /**
     * Get logo dimensions
     */
    public function getLogoDimensions($type = 'main') {
        try {
            $logoSetting = $this->getLogoSetting($type);
            
            if ($logoSetting && $logoSetting['value']) {
                $filepath = $this->uploadPath . $logoSetting['value'];
                
                if (file_exists($filepath)) {
                    $imageInfo = getimagesize($filepath);
                    return [
                        'width' => $imageInfo[0],
                        'height' => $imageInfo[1]
                    ];
                }
            }
            
            return null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Resize logo if needed
     */
    public function resizeLogo($filename, $maxWidth = 200, $maxHeight = 100) {
        try {
            $filepath = $this->uploadPath . $filename;
            
            if (!file_exists($filepath)) {
                return false;
            }
            
            $imageInfo = getimagesize($filepath);
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            
            // Check if resize is needed
            if ($width <= $maxWidth && $height <= $maxHeight) {
                return true;
            }
            
            // Calculate new dimensions
            $ratio = min($maxWidth / $width, $maxHeight / $height);
            $newWidth = (int)($width * $ratio);
            $newHeight = (int)($height * $ratio);
            
            // Create new image
            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    $source = imagecreatefromjpeg($filepath);
                    break;
                case 'png':
                    $source = imagecreatefrompng($filepath);
                    break;
                case 'gif':
                    $source = imagecreatefromgif($filepath);
                    break;
                default:
                    return false;
            }
            
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            
            // Preserve transparency for PNG
            if ($extension === 'png') {
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
            }
            
            imagecopyresampled($resized, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            
            // Save resized image
            switch ($extension) {
                case 'jpg':
                case 'jpeg':
                    imagejpeg($resized, $filepath, 90);
                    break;
                case 'png':
                    imagepng($resized, $filepath);
                    break;
                case 'gif':
                    imagegif($resized, $filepath);
                    break;
            }
            
            imagedestroy($source);
            imagedestroy($resized);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error resizing logo", [
                'error' => $e->getMessage(),
                'filename' => $filename
            ]);
            
            return false;
        }
    }
}
?>
