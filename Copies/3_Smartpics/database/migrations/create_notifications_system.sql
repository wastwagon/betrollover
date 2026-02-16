-- =====================================================
-- BetRollover - Comprehensive Notification System
-- =====================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `type` ENUM(
        'pick_approved',
        'pick_rejected',
        'pick_purchased',
        'pick_settled',
        'pick_won',
        'pick_lost',
        'wallet_deposit',
        'wallet_withdrawal',
        'wallet_topup',
        'wallet_payout',
        'tipster_verified',
        'tipster_application_approved',
        'tipster_application_rejected',
        'admin_action',
        'system_announcement',
        'pick_comment',
        'pick_like',
        'marketplace_new_pick',
        'contest_started',
        'contest_ended',
        'contest_won',
        'mentorship_request',
        'mentorship_accepted',
        'support_ticket_created',
        'support_ticket_replied',
        'support_ticket_resolved',
        'referral_signup',
        'referral_reward',
        'account_verified',
        'password_changed',
        'profile_updated',
        'pick_expiring_soon',
        'low_balance',
        'payout_requested',
        'payout_approved',
        'payout_rejected'
    ) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `link` VARCHAR(500) DEFAULT NULL,
    `icon` VARCHAR(50) DEFAULT 'bell',
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    `is_read` TINYINT(1) DEFAULT 0,
    `read_at` DATETIME DEFAULT NULL,
    `metadata` JSON DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_type` (`type`),
    INDEX `idx_is_read` (`is_read`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_user_unread` (`user_id`, `is_read`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create user notification preferences table
CREATE TABLE IF NOT EXISTS `user_notification_preferences` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `notification_type` VARCHAR(50) NOT NULL,
    `email_enabled` TINYINT(1) DEFAULT 1,
    `in_app_enabled` TINYINT(1) DEFAULT 1,
    `push_enabled` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_user_type` (`user_id`, `notification_type`),
    INDEX `idx_user_id` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Insert default notification preferences for existing users
INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'pick_approved',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'pick_rejected',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'pick_purchased',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'pick_settled',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'wallet_transaction',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'tipster_verified',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `user_notification_preferences` (`user_id`, `notification_type`, `email_enabled`, `in_app_enabled`, `push_enabled`)
SELECT 
    `id`,
    'system_announcement',
    1, 1, 0
FROM `users`
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 4. Create notification read tracking (for performance)
CREATE TABLE IF NOT EXISTS `notification_reads` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `user_id` INT(11) NOT NULL,
    `notification_id` INT(11) NOT NULL,
    `read_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_user_notification` (`user_id`, `notification_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_notification_id` (`notification_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

