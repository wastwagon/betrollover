<?php
/**
 * SmartPicks Pro - Advanced Chat Manager
 * 
 * Handles real-time public chat, user identification, and social features
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class ChatManager {
    
    private static $instance = null;
    private $db;
    private $logger;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Send a chat message
     */
    public function sendMessage($userId, $message, $type = 'text', $metadata = null) {
        try {
            // Validate message
            if (empty(trim($message)) && $type === 'text') {
                throw new Exception('Message cannot be empty');
            }
            
            // Check if user is muted or banned
            $user = $this->db->fetch("SELECT status FROM users WHERE id = ?", [$userId]);
            if ($user['status'] === 'suspended') {
                throw new Exception('Your account is suspended');
            }
            
            // Insert message
            $messageId = $this->db->insert("
                INSERT INTO chat_messages (user_id, message, type, metadata, is_public, created_at) 
                VALUES (?, ?, ?, ?, 1, NOW())
            ", [$userId, $message, $type, $metadata ? json_encode($metadata) : null]);
            
            // Update user's last activity
            $this->updateUserActivity($userId);
            
            // Log the message
            $this->logger->info("Chat message sent", [
                'user_id' => $userId,
                'message_id' => $messageId,
                'type' => $type
            ]);
            
            return $messageId;
            
        } catch (Exception $e) {
            $this->logger->error("Error sending chat message", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            throw $e;
        }
    }
    
    /**
     * Get recent chat messages
     */
    public function getRecentMessages($limit = 50, $offset = 0) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    cm.id,
                    cm.user_id,
                    cm.message,
                    cm.type,
                    cm.metadata,
                    cm.created_at,
                    u.username,
                    u.display_name,
                    u.country,
                    u.avatar,
                    u.role,
                    tp.is_verified,
                    tp.is_featured
                FROM chat_messages cm
                JOIN users u ON cm.user_id = u.id
                LEFT JOIN tipster_profiles tp ON u.id = tp.user_id
                WHERE cm.is_public = 1 AND u.status = 'active'
                ORDER BY cm.created_at DESC
                LIMIT ? OFFSET ?
            ", [$limit, $offset]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting chat messages", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get online users
     */
    public function getOnlineUsers() {
        try {
            // Get users active in last 5 minutes
            return $this->db->fetchAll("
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.country,
                    u.avatar,
                    u.role,
                    tp.is_verified,
                    tp.is_featured,
                    u.last_login
                FROM users u
                LEFT JOIN tipster_profiles tp ON u.id = tp.user_id
                WHERE u.status = 'active' 
                AND u.last_login >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY u.last_login DESC
            ");
            
        } catch (Exception $e) {
            $this->logger->error("Error getting online users", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Update user activity
     */
    public function updateUserActivity($userId) {
        try {
            $this->db->execute("
                UPDATE users 
                SET last_login = NOW() 
                WHERE id = ?
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error updating user activity", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
        }
    }
    
    /**
     * Get country flag emoji
     */
    public function getCountryFlag($country) {
        $flags = [
            'Ghana' => '🇬🇭',
            'Nigeria' => '🇳🇬',
            'Kenya' => '🇰🇪',
            'South Africa' => '🇿🇦',
            'Egypt' => '🇪🇬',
            'Morocco' => '🇲🇦',
            'Tunisia' => '🇹🇳',
            'Algeria' => '🇩🇿',
            'Senegal' => '🇸🇳',
            'Ivory Coast' => '🇨🇮',
            'Cameroon' => '🇨🇲',
            'Uganda' => '🇺🇬',
            'Tanzania' => '🇹🇿',
            'Ethiopia' => '🇪🇹',
            'Zimbabwe' => '🇿🇼',
            'Botswana' => '🇧🇼',
            'Namibia' => '🇳🇦',
            'Zambia' => '🇿🇲',
            'Malawi' => '🇲🇼',
            'Mozambique' => '🇲🇿',
            'Angola' => '🇦🇴',
            'Congo' => '🇨🇬',
            'DRC' => '🇨🇩',
            'Rwanda' => '🇷🇼',
            'Burundi' => '🇧🇮',
            'Somalia' => '🇸🇴',
            'Djibouti' => '🇩🇯',
            'Eritrea' => '🇪🇷',
            'Sudan' => '🇸🇩',
            'South Sudan' => '🇸🇸',
            'Central African Republic' => '🇨🇫',
            'Chad' => '🇹🇩',
            'Niger' => '🇳🇪',
            'Mali' => '🇲🇱',
            'Burkina Faso' => '🇧🇫',
            'Guinea' => '🇬🇳',
            'Sierra Leone' => '🇸🇱',
            'Liberia' => '🇱🇷',
            'Guinea-Bissau' => '🇬🇼',
            'Cape Verde' => '🇨🇻',
            'São Tomé and Príncipe' => '🇸🇹',
            'Equatorial Guinea' => '🇬🇶',
            'Gabon' => '🇬🇦',
            'Congo' => '🇨🇬',
            'DRC' => '🇨🇩',
            'Rwanda' => '🇷🇼',
            'Burundi' => '🇧🇮',
            'Somalia' => '🇸🇴',
            'Djibouti' => '🇩🇯',
            'Eritrea' => '🇪🇷',
            'Sudan' => '🇸🇩',
            'South Sudan' => '🇸🇸',
            'Central African Republic' => '🇨🇫',
            'Chad' => '🇹🇩',
            'Niger' => '🇳🇪',
            'Mali' => '🇲🇱',
            'Burkina Faso' => '🇧🇫',
            'Guinea' => '🇬🇳',
            'Sierra Leone' => '🇸🇱',
            'Liberia' => '🇱🇷',
            'Guinea-Bissau' => '🇬🇼',
            'Cape Verde' => '🇨🇻',
            'São Tomé and Príncipe' => '🇸🇹',
            'Equatorial Guinea' => '🇬🇶',
            'Gabon' => '🇬🇦',
            'Mauritania' => '🇲🇷',
            'Western Sahara' => '🇪🇭',
            'Madagascar' => '🇲🇬',
            'Mauritius' => '🇲🇺',
            'Seychelles' => '🇸🇨',
            'Comoros' => '🇰🇲',
            'Mayotte' => '🇾🇹',
            'Réunion' => '🇷🇪',
            'Saint Helena' => '🇸🇭',
            'Ascension Island' => '🇦🇨',
            'Tristan da Cunha' => '🇹🇦',
            'British Indian Ocean Territory' => '🇮🇴',
            'French Southern Territories' => '🇹🇫',
            'Heard Island and McDonald Islands' => '🇭🇲',
            'Bouvet Island' => '🇧🇻',
            'South Georgia and the South Sandwich Islands' => '🇬🇸',
            'Falkland Islands' => '🇫🇰',
            'Antarctica' => '🇦🇶',
            'United States' => '🇺🇸',
            'Canada' => '🇨🇦',
            'United Kingdom' => '🇬🇧',
            'France' => '🇫🇷',
            'Germany' => '🇩🇪',
            'Italy' => '🇮🇹',
            'Spain' => '🇪🇸',
            'Portugal' => '🇵🇹',
            'Netherlands' => '🇳🇱',
            'Belgium' => '🇧🇪',
            'Switzerland' => '🇨🇭',
            'Austria' => '🇦🇹',
            'Sweden' => '🇸🇪',
            'Norway' => '🇳🇴',
            'Denmark' => '🇩🇰',
            'Finland' => '🇫🇮',
            'Iceland' => '🇮🇸',
            'Ireland' => '🇮🇪',
            'Poland' => '🇵🇱',
            'Czech Republic' => '🇨🇿',
            'Slovakia' => '🇸🇰',
            'Hungary' => '🇭🇺',
            'Romania' => '🇷🇴',
            'Bulgaria' => '🇧🇬',
            'Croatia' => '🇭🇷',
            'Slovenia' => '🇸🇮',
            'Slovakia' => '🇸🇰',
            'Czech Republic' => '🇨🇿',
            'Poland' => '🇵🇱',
            'Lithuania' => '🇱🇹',
            'Latvia' => '🇱🇻',
            'Estonia' => '🇪🇪',
            'Russia' => '🇷🇺',
            'Ukraine' => '🇺🇦',
            'Belarus' => '🇧🇾',
            'Moldova' => '🇲🇩',
            'Georgia' => '🇬🇪',
            'Armenia' => '🇦🇲',
            'Azerbaijan' => '🇦🇿',
            'Kazakhstan' => '🇰🇿',
            'Uzbekistan' => '🇺🇿',
            'Turkmenistan' => '🇹🇲',
            'Tajikistan' => '🇹🇯',
            'Kyrgyzstan' => '🇰🇬',
            'Mongolia' => '🇲🇳',
            'China' => '🇨🇳',
            'Japan' => '🇯🇵',
            'South Korea' => '🇰🇷',
            'North Korea' => '🇰🇵',
            'Taiwan' => '🇹🇼',
            'Hong Kong' => '🇭🇰',
            'Macau' => '🇲🇴',
            'Vietnam' => '🇻🇳',
            'Thailand' => '🇹🇭',
            'Cambodia' => '🇰🇭',
            'Laos' => '🇱🇦',
            'Myanmar' => '🇲🇲',
            'Malaysia' => '🇲🇾',
            'Singapore' => '🇸🇬',
            'Indonesia' => '🇮🇩',
            'Philippines' => '🇵🇭',
            'Brunei' => '🇧🇳',
            'East Timor' => '🇹🇱',
            'Papua New Guinea' => '🇵🇬',
            'Fiji' => '🇫🇯',
            'Solomon Islands' => '🇸🇧',
            'Vanuatu' => '🇻🇺',
            'New Caledonia' => '🇳🇨',
            'French Polynesia' => '🇵🇫',
            'Samoa' => '🇼🇸',
            'Tonga' => '🇹🇴',
            'Kiribati' => '🇰🇮',
            'Tuvalu' => '🇹🇻',
            'Nauru' => '🇳🇷',
            'Palau' => '🇵🇼',
            'Marshall Islands' => '🇲🇭',
            'Micronesia' => '🇫🇲',
            'Cook Islands' => '🇨🇰',
            'Niue' => '🇳🇺',
            'Tokelau' => '🇹🇰',
            'Pitcairn Islands' => '🇵🇳',
            'Wallis and Futuna' => '🇼🇫',
            'American Samoa' => '🇦🇸',
            'Guam' => '🇬🇺',
            'Northern Mariana Islands' => '🇲🇵',
            'Virgin Islands' => '🇻🇮',
            'Puerto Rico' => '🇵🇷',
            'Cuba' => '🇨🇺',
            'Jamaica' => '🇯🇲',
            'Haiti' => '🇭🇹',
            'Dominican Republic' => '🇩🇴',
            'Trinidad and Tobago' => '🇹🇹',
            'Barbados' => '🇧🇧',
            'Saint Lucia' => '🇱🇨',
            'Saint Vincent and the Grenadines' => '🇻🇨',
            'Grenada' => '🇬🇩',
            'Saint Kitts and Nevis' => '🇰🇳',
            'Antigua and Barbuda' => '🇦🇬',
            'Dominica' => '🇩🇲',
            'Montserrat' => '🇲🇸',
            'Anguilla' => '🇦🇮',
            'British Virgin Islands' => '🇻🇬',
            'US Virgin Islands' => '🇻🇮',
            'Turks and Caicos Islands' => '🇹🇨',
            'Cayman Islands' => '🇰🇾',
            'Bermuda' => '🇧🇲',
            'Bahamas' => '🇧🇸',
            'Belize' => '🇧🇿',
            'Guatemala' => '🇬🇹',
            'Honduras' => '🇭🇳',
            'El Salvador' => '🇸🇻',
            'Nicaragua' => '🇳🇮',
            'Costa Rica' => '🇨🇷',
            'Panama' => '🇵🇦',
            'Mexico' => '🇲🇽',
            'Brazil' => '🇧🇷',
            'Argentina' => '🇦🇷',
            'Chile' => '🇨🇱',
            'Peru' => '🇵🇪',
            'Colombia' => '🇨🇴',
            'Venezuela' => '🇻🇪',
            'Ecuador' => '🇪🇨',
            'Bolivia' => '🇧🇴',
            'Paraguay' => '🇵🇾',
            'Uruguay' => '🇺🇾',
            'Guyana' => '🇬🇾',
            'Suriname' => '🇸🇷',
            'French Guiana' => '🇬🇫',
            'Falkland Islands' => '🇫🇰',
            'South Georgia and the South Sandwich Islands' => '🇬🇸',
            'Antarctica' => '🇦🇶',
            'Australia' => '🇦🇺',
            'New Zealand' => '🇳🇿',
            'India' => '🇮🇳',
            'Pakistan' => '🇵🇰',
            'Bangladesh' => '🇧🇩',
            'Sri Lanka' => '🇱🇰',
            'Nepal' => '🇳🇵',
            'Bhutan' => '🇧🇹',
            'Maldives' => '🇲🇻',
            'Afghanistan' => '🇦🇫',
            'Iran' => '🇮🇷',
            'Iraq' => '🇮🇶',
            'Syria' => '🇸🇾',
            'Lebanon' => '🇱🇧',
            'Jordan' => '🇯🇴',
            'Israel' => '🇮🇱',
            'Palestine' => '🇵🇸',
            'Saudi Arabia' => '🇸🇦',
            'United Arab Emirates' => '🇦🇪',
            'Qatar' => '🇶🇦',
            'Bahrain' => '🇧🇭',
            'Kuwait' => '🇰🇼',
            'Oman' => '🇴🇲',
            'Yemen' => '🇾🇪',
            'Turkey' => '🇹🇷',
            'Cyprus' => '🇨🇾',
            'Greece' => '🇬🇷',
            'Albania' => '🇦🇱',
            'North Macedonia' => '🇲🇰',
            'Montenegro' => '🇲🇪',
            'Bosnia and Herzegovina' => '🇧🇦',
            'Serbia' => '🇷🇸',
            'Kosovo' => '🇽🇰',
            'Croatia' => '🇭🇷',
            'Slovenia' => '🇸🇮',
            'Slovakia' => '🇸🇰',
            'Czech Republic' => '🇨🇿',
            'Poland' => '🇵🇱',
            'Lithuania' => '🇱🇹',
            'Latvia' => '🇱🇻',
            'Estonia' => '🇪🇪',
            'Russia' => '🇷🇺',
            'Ukraine' => '🇺🇦',
            'Belarus' => '🇧🇾',
            'Moldova' => '🇲🇩',
            'Georgia' => '🇬🇪',
            'Armenia' => '🇦🇲',
            'Azerbaijan' => '🇦🇿',
            'Kazakhstan' => '🇰🇿',
            'Uzbekistan' => '🇺🇿',
            'Turkmenistan' => '🇹🇲',
            'Tajikistan' => '🇹🇯',
            'Kyrgyzstan' => '🇰🇬',
            'Mongolia' => '🇲🇳',
            'China' => '🇨🇳',
            'Japan' => '🇯🇵',
            'South Korea' => '🇰🇷',
            'North Korea' => '🇰🇵',
            'Taiwan' => '🇹🇼',
            'Hong Kong' => '🇭🇰',
            'Macau' => '🇲🇴',
            'Vietnam' => '🇻🇳',
            'Thailand' => '🇹🇭',
            'Cambodia' => '🇰🇭',
            'Laos' => '🇱🇦',
            'Myanmar' => '🇲🇲',
            'Malaysia' => '🇲🇾',
            'Singapore' => '🇸🇬',
            'Indonesia' => '🇮🇩',
            'Philippines' => '🇵🇭',
            'Brunei' => '🇧🇳',
            'East Timor' => '🇹🇱',
            'Papua New Guinea' => '🇵🇬',
            'Fiji' => '🇫🇯',
            'Solomon Islands' => '🇸🇧',
            'Vanuatu' => '🇻🇺',
            'New Caledonia' => '🇳🇨',
            'French Polynesia' => '🇵🇫',
            'Samoa' => '🇼🇸',
            'Tonga' => '🇹🇴',
            'Kiribati' => '🇰🇮',
            'Tuvalu' => '🇹🇻',
            'Nauru' => '🇳🇷',
            'Palau' => '🇵🇼',
            'Marshall Islands' => '🇲🇭',
            'Micronesia' => '🇫🇲',
            'Cook Islands' => '🇨🇰',
            'Niue' => '🇳🇺',
            'Tokelau' => '🇹🇰',
            'Pitcairn Islands' => '🇵🇳',
            'Wallis and Futuna' => '🇼🇫',
            'American Samoa' => '🇦🇸',
            'Guam' => '🇬🇺',
            'Northern Mariana Islands' => '🇲🇵',
            'Virgin Islands' => '🇻🇮',
            'Puerto Rico' => '🇵🇷',
            'Cuba' => '🇨🇺',
            'Jamaica' => '🇯🇲',
            'Haiti' => '🇭🇹',
            'Dominican Republic' => '🇩🇴',
            'Trinidad and Tobago' => '🇹🇹',
            'Barbados' => '🇧🇧',
            'Saint Lucia' => '🇱🇨',
            'Saint Vincent and the Grenadines' => '🇻🇨',
            'Grenada' => '🇬🇩',
            'Saint Kitts and Nevis' => '🇰🇳',
            'Antigua and Barbuda' => '🇦🇬',
            'Dominica' => '🇩🇲',
            'Montserrat' => '🇲🇸',
            'Anguilla' => '🇦🇮',
            'British Virgin Islands' => '🇻🇬',
            'US Virgin Islands' => '🇻🇮',
            'Turks and Caicos Islands' => '🇹🇨',
            'Cayman Islands' => '🇰🇾',
            'Bermuda' => '🇧🇲',
            'Bahamas' => '🇧🇸',
            'Belize' => '🇧🇿',
            'Guatemala' => '🇬🇹',
            'Honduras' => '🇭🇳',
            'El Salvador' => '🇸🇻',
            'Nicaragua' => '🇳🇮',
            'Costa Rica' => '🇨🇷',
            'Panama' => '🇵🇦',
            'Mexico' => '🇲🇽',
            'Brazil' => '🇧🇷',
            'Argentina' => '🇦🇷',
            'Chile' => '🇨🇱',
            'Peru' => '🇵🇪',
            'Colombia' => '🇨🇴',
            'Venezuela' => '🇻🇪',
            'Ecuador' => '🇪🇨',
            'Bolivia' => '🇧🇴',
            'Paraguay' => '🇵🇾',
            'Uruguay' => '🇺🇾',
            'Guyana' => '🇬🇾',
            'Suriname' => '🇸🇷',
            'French Guiana' => '🇬🇫',
            'Falkland Islands' => '🇫🇰',
            'South Georgia and the South Sandwich Islands' => '🇬🇸',
            'Antarctica' => '🇦🇶',
            'Australia' => '🇦🇺',
            'New Zealand' => '🇳🇿',
            'India' => '🇮🇳',
            'Pakistan' => '🇵🇰',
            'Bangladesh' => '🇧🇩',
            'Sri Lanka' => '🇱🇰',
            'Nepal' => '🇳🇵',
            'Bhutan' => '🇧🇹',
            'Maldives' => '🇲🇻',
            'Afghanistan' => '🇦🇫',
            'Iran' => '🇮🇷',
            'Iraq' => '🇮🇶',
            'Syria' => '🇸🇾',
            'Lebanon' => '🇱🇧',
            'Jordan' => '🇯🇴',
            'Israel' => '🇮🇱',
            'Palestine' => '🇵🇸',
            'Saudi Arabia' => '🇸🇦',
            'United Arab Emirates' => '🇦🇪',
            'Qatar' => '🇶🇦',
            'Bahrain' => '🇧🇭',
            'Kuwait' => '🇰🇼',
            'Oman' => '🇴🇲',
            'Yemen' => '🇾🇪',
            'Turkey' => '🇹🇷',
            'Cyprus' => '🇨🇾',
            'Greece' => '🇬🇷',
            'Albania' => '🇦🇱',
            'North Macedonia' => '🇲🇰',
            'Montenegro' => '🇲🇪',
            'Bosnia and Herzegovina' => '🇧🇦',
            'Serbia' => '🇷🇸',
            'Kosovo' => '🇽🇰'
        ];
        
        return $flags[$country] ?? '🌍';
    }
    
    /**
     * Get user badge HTML
     */
    public function getUserBadge($user) {
        $badges = [];
        
        // Country flag
        $badges[] = $this->getCountryFlag($user['country']);
        
        // Role badge
        if ($user['role'] === 'admin') {
            $badges[] = '<span class="badge bg-danger">Admin</span>';
        }
        
        // Verification badge
        if ($user['is_verified']) {
            $badges[] = '<span class="badge bg-success"><i class="fas fa-check"></i> Verified</span>';
        }
        
        // Featured badge
        if ($user['is_featured']) {
            $badges[] = '<span class="badge bg-warning"><i class="fas fa-star"></i> Featured</span>';
        }
        
        return implode(' ', $badges);
    }
    
    /**
     * Delete a message (admin only)
     */
    public function deleteMessage($messageId, $adminId) {
        try {
            // Check if user is admin
            $admin = $this->db->fetch("SELECT role FROM users WHERE id = ?", [$adminId]);
            if ($admin['role'] !== 'admin') {
                throw new Exception('Unauthorized');
            }
            
            // Delete message
            $this->db->execute("DELETE FROM chat_messages WHERE id = ?", [$messageId]);
            
            $this->logger->info("Chat message deleted", [
                'message_id' => $messageId,
                'admin_id' => $adminId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error deleting chat message", [
                'error' => $e->getMessage(),
                'message_id' => $messageId,
                'admin_id' => $adminId
            ]);
            throw $e;
        }
    }
    
    /**
     * Mute a user (admin only)
     */
    public function muteUser($userId, $adminId, $duration = 3600) {
        try {
            // Check if user is admin
            $admin = $this->db->fetch("SELECT role FROM users WHERE id = ?", [$adminId]);
            if ($admin['role'] !== 'admin') {
                throw new Exception('Unauthorized');
            }
            
            // Update user status
            $this->db->execute("
                UPDATE users 
                SET status = 'suspended', updated_at = NOW() 
                WHERE id = ?
            ", [$userId]);
            
            $this->logger->info("User muted", [
                'user_id' => $userId,
                'admin_id' => $adminId,
                'duration' => $duration
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error muting user", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'admin_id' => $adminId
            ]);
            throw $e;
        }
    }
}
?>
