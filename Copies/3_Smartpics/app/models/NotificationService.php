<?php
/**
 * BetRollover - Comprehensive Notification Service
 * Handles in-app notifications, email notifications, and real-time updates
 */

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';
require_once __DIR__ . '/MailService.php';

class NotificationService {
    private static $instance = null;
    private $db;
    private $logger;
    private $mailService;
    
    // Notification type configurations
    private $notificationConfigs = [
        'pick_approved' => [
            'icon' => 'check-circle',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'pick_rejected' => [
            'icon' => 'times-circle',
            'color' => '#d32f2f',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'pick_purchased' => [
            'icon' => 'shopping-cart',
            'color' => '#1976d2',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'pick_settled' => [
            'icon' => 'trophy',
            'color' => '#f57c00',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'pick_won' => [
            'icon' => 'trophy',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'pick_lost' => [
            'icon' => 'times',
            'color' => '#d32f2f',
            'priority' => 'medium',
            'default_email' => true,
            'default_in_app' => true
        ],
        'wallet_deposit' => [
            'icon' => 'arrow-down',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'wallet_withdrawal' => [
            'icon' => 'arrow-up',
            'color' => '#1976d2',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'wallet_topup' => [
            'icon' => 'plus-circle',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'wallet_payout' => [
            'icon' => 'money-bill-wave',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'tipster_verified' => [
            'icon' => 'check-circle',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'tipster_application_submitted' => [
            'icon' => 'file-alt',
            'color' => '#1976d2',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'tipster_application_approved' => [
            'icon' => 'check-circle',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'tipster_application_rejected' => [
            'icon' => 'times-circle',
            'color' => '#d32f2f',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'system_announcement' => [
            'icon' => 'bullhorn',
            'color' => '#1976d2',
            'priority' => 'medium',
            'default_email' => false,
            'default_in_app' => true
        ],
        'admin_action' => [
            'icon' => 'user-shield',
            'color' => '#d32f2f',
            'priority' => 'medium',
            'default_email' => false,
            'default_in_app' => true
        ],
        'pick_created' => [
            'icon' => 'check-circle',
            'color' => '#2e7d32',
            'priority' => 'medium',
            'default_email' => false,
            'default_in_app' => true
        ],
        'pick_pending_approval' => [
            'icon' => 'clock',
            'color' => '#ff9800',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'low_balance' => [
            'icon' => 'exclamation-triangle',
            'color' => '#f57c00',
            'priority' => 'medium',
            'default_email' => true,
            'default_in_app' => true
        ],
        'payout_requested' => [
            'icon' => 'hand-holding-usd',
            'color' => '#1976d2',
            'priority' => 'medium',
            'default_email' => true,
            'default_in_app' => true
        ],
        'payout_approved' => [
            'icon' => 'check-circle',
            'color' => '#2e7d32',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ],
        'payout_rejected' => [
            'icon' => 'times-circle',
            'color' => '#d32f2f',
            'priority' => 'high',
            'default_email' => true,
            'default_in_app' => true
        ]
    ];
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->mailService = MailService::getInstance();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Create and send notification
     * @param int $userId User ID
     * @param string $type Notification type
     * @param string $title Notification title
     * @param string $message Notification message
     * @param string|null $link Optional link
     * @param array|null $metadata Optional metadata
     * @return array ['success' => bool, 'notification_id' => int|null, 'message' => string]
     */
    public function notify($userId, $type, $title, $message, $link = null, $metadata = null) {
        try {
            // Get notification config
            $config = $this->notificationConfigs[$type] ?? [
                'icon' => 'bell',
                'color' => '#1976d2',
                'priority' => 'medium',
                'default_email' => true,
                'default_in_app' => true
            ];
            
            // Check user preferences
            $preferences = $this->getUserPreferences($userId, $type);
            
            // Create in-app notification if enabled
            $notificationId = null;
            if ($preferences['in_app_enabled']) {
                try {
                    $notificationId = $this->createInAppNotification(
                        $userId,
                        $type,
                        $title,
                        $message,
                        $link,
                        $config,
                        $metadata
                    );
                    $this->logger->info('In-app notification created', [
                        'user_id' => $userId,
                        'type' => $type,
                        'notification_id' => $notificationId
                    ]);
                } catch (Exception $e) {
                    $this->logger->error('Failed to create in-app notification', [
                        'user_id' => $userId,
                        'type' => $type,
                        'error' => $e->getMessage()
                    ]);
                }
            } else {
                $this->logger->info('In-app notification disabled by user preference', [
                    'user_id' => $userId,
                    'type' => $type
                ]);
            }
            
            // Send email notification if enabled
            if ($preferences['email_enabled']) {
                try {
                    $this->sendEmailNotification($userId, $type, $title, $message, $link);
                } catch (Exception $e) {
                    $this->logger->error('Failed to send email notification', [
                        'user_id' => $userId,
                        'type' => $type,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Send push notification if enabled (future implementation)
            if ($preferences['push_enabled']) {
                // TODO: Implement push notifications
            }
            
            return [
                'success' => true,
                'notification_id' => $notificationId,
                'message' => 'Notification sent successfully'
            ];
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send notification', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'notification_id' => null,
                'message' => 'Failed to send notification: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Create in-app notification
     */
    private function createInAppNotification($userId, $type, $title, $message, $link, $config, $metadata) {
        $metadataJson = $metadata ? json_encode($metadata) : null;
        
        // Use PHP's date with configured timezone instead of MySQL NOW() to ensure timezone consistency
        $timezone = config('timezone', 'Africa/Accra');
        $dateTime = new DateTime('now', new DateTimeZone($timezone));
        $createdAt = $dateTime->format('Y-m-d H:i:s');
        
        $this->db->query("
            INSERT INTO notifications (
                user_id, type, title, message, link, icon, priority, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ", [
            $userId,
            $type,
            $title,
            $message,
            $link,
            $config['icon'],
            $config['priority'],
            $metadataJson,
            $createdAt
        ]);
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Send email notification
     */
    private function sendEmailNotification($userId, $type, $title, $message, $link) {
        try {
            $user = $this->db->fetch("
                SELECT email, display_name, username, email_notifications 
                FROM users 
                WHERE id = ?
            ", [$userId]);
            
            if (!$user || empty($user['email']) || !$user['email_notifications']) {
                return;
            }
            
            $userName = $user['display_name'] ?? $user['username'] ?? 'User';
            
            $emailMessage = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>{$title}</h2>
                        <p>Hello {$userName},</p>
                        <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            {$message}
                        </div>";
            
            if ($link) {
                $baseUrl = $this->getBaseUrl();
                $emailMessage .= "
                        <p>
                            <a href='{$baseUrl}{$link}' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                View Details
                            </a>
                        </p>";
            }
            
            $emailMessage .= "
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from BetRollover. 
                            You can manage your notification preferences in your account settings.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            $this->mailService->sendEmail(
                $user['email'],
                $title . ' - BetRollover',
                $emailMessage
            );
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send email notification', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Get user notification preferences
     */
    private function getUserPreferences($userId, $type) {
        $pref = $this->db->fetch("
            SELECT email_enabled, in_app_enabled, push_enabled
            FROM user_notification_preferences
            WHERE user_id = ? AND notification_type = ?
        ", [$userId, $type]);
        
        if ($pref) {
            return [
                'email_enabled' => (bool)$pref['email_enabled'],
                'in_app_enabled' => (bool)$pref['in_app_enabled'],
                'push_enabled' => (bool)$pref['push_enabled']
            ];
        }
        
        // Return defaults if no preference found
        $config = $this->notificationConfigs[$type] ?? [];
        return [
            'email_enabled' => $config['default_email'] ?? true,
            'in_app_enabled' => $config['default_in_app'] ?? true,
            'push_enabled' => false
        ];
    }
    
    /**
     * Get user notifications
     * @param int $userId User ID
     * @param int $limit Number of notifications to fetch
     * @param bool $unreadOnly Only fetch unread notifications
     * @return array
     */
    public function getUserNotifications($userId, $limit = 50, $unreadOnly = false) {
        $where = "user_id = ?";
        $params = [$userId];
        
        if ($unreadOnly) {
            $where .= " AND is_read = 0";
        }
        
        $notifications = $this->db->fetchAll("
            SELECT 
                id, type, title, message, link, COALESCE(icon, 'bell') as icon, 
                COALESCE(priority, 'medium') as priority, is_read, 
                created_at, metadata
            FROM notifications
            WHERE {$where}
            ORDER BY created_at DESC
            LIMIT ?
        ", array_merge($params, [$limit]));
        
        // Add icon from config if not in database
        foreach ($notifications as &$notification) {
            if (empty($notification['icon']) || $notification['icon'] === 'bell') {
                $type = $notification['type'];
                if (isset($this->notificationConfigs[$type])) {
                    $notification['icon'] = $this->notificationConfigs[$type]['icon'];
                }
            }
        }
        unset($notification);
        
        return $notifications;
    }
    
    /**
     * Get unread notification count
     */
    public function getUnreadCount($userId) {
        $result = $this->db->fetch("
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = ? AND is_read = 0
        ", [$userId]);
        
        return (int)($result['count'] ?? 0);
    }
    
    /**
     * Mark notification as read
     */
    public function markAsRead($userId, $notificationId) {
        $this->db->query("
            UPDATE notifications
            SET is_read = 1, read_at = NOW()
            WHERE id = ? AND user_id = ?
        ", [$notificationId, $userId]);
    }
    
    /**
     * Mark all notifications as read
     */
    public function markAllAsRead($userId) {
        $this->db->query("
            UPDATE notifications
            SET is_read = 1, read_at = NOW()
            WHERE user_id = ? AND is_read = 0
        ", [$userId]);
    }
    
    /**
     * Delete notification
     */
    public function deleteNotification($userId, $notificationId) {
        $this->db->query("
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
        ", [$notificationId, $userId]);
    }
    
    /**
     * Notify all admin users
     * @param string $type Notification type
     * @param string $title Notification title
     * @param string $message Notification message
     * @param string|null $link Optional link
     * @param array|null $metadata Optional metadata
     * @return array ['success' => bool, 'notified_count' => int]
     */
    public function notifyAllAdmins($type, $title, $message, $link = null, $metadata = null) {
        try {
            $admins = $this->db->fetchAll("
                SELECT id FROM users WHERE role = 'admin'
            ");
            
            $notifiedCount = 0;
            foreach ($admins as $admin) {
                $result = $this->notify($admin['id'], $type, $title, $message, $link, $metadata);
                if ($result['success']) {
                    $notifiedCount++;
                }
            }
            
            return [
                'success' => true,
                'notified_count' => $notifiedCount
            ];
        } catch (Exception $e) {
            $this->logger->error('Failed to notify all admins', [
                'type' => $type,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'notified_count' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get base URL
     */
    private function getBaseUrl() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $path = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME'] ?? '');
        $path = str_replace('/app/models', '', $path);
        return $protocol . '://' . $host . $path;
    }
    
    /**
     * Update user notification preferences
     */
    public function updatePreferences($userId, $type, $emailEnabled, $inAppEnabled, $pushEnabled = false) {
        $this->db->query("
            INSERT INTO user_notification_preferences 
                (user_id, notification_type, email_enabled, in_app_enabled, push_enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                email_enabled = VALUES(email_enabled),
                in_app_enabled = VALUES(in_app_enabled),
                push_enabled = VALUES(push_enabled),
                updated_at = NOW()
        ", [$userId, $type, $emailEnabled ? 1 : 0, $inAppEnabled ? 1 : 0, $pushEnabled ? 1 : 0]);
    }
    
    /**
     * Get all notification preferences for a user
     */
    public function getAllPreferences($userId) {
        return $this->db->fetchAll("
            SELECT notification_type, email_enabled, in_app_enabled, push_enabled
            FROM user_notification_preferences
            WHERE user_id = ?
            ORDER BY notification_type
        ", [$userId]);
    }
}

