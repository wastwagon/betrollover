<?php
/**
 * SmartPicks Pro - Mail/Notification Service
 * Handles email notifications for the platform
 */

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class MailService {
    private static $instance = null;
    private $db;
    private $logger;
    private $config;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        $this->loadConfig();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Reload configuration (useful after settings update)
     */
    public function reloadConfig() {
        $this->loadConfig();
    }
    
    /**
     * Load email configuration from database or config file
     */
    private function loadConfig() {
        // Try to load from database (admin settings)
        try {
            // Use explicit column name to avoid any ambiguity
            $settings = $this->db->fetchAll("
                SELECT setting_key, `value` 
                FROM platform_settings 
                WHERE setting_key LIKE 'email_%'
            ");
            
            $this->config = [
                'enabled' => false,
                'method' => 'mail', // smtp or mail
                'smtp_host' => 'localhost',
                'smtp_port' => 587,
                'smtp_username' => '',
                'smtp_password' => '',
                'smtp_encryption' => 'tls', // tls or ssl
                'from_email' => 'noreply@betrollover.com',
                'from_name' => 'SmartPicks Pro',
                'admin_email' => 'admin@betrollover.com'
            ];
            
            foreach ($settings as $setting) {
                $key = str_replace('email_', '', $setting['setting_key']);
                $this->config[$key] = $setting['value'];
            }
            
            // Convert string 'true'/'false' to boolean
            if (isset($this->config['enabled'])) {
                $this->config['enabled'] = ($this->config['enabled'] === 'true' || $this->config['enabled'] === '1' || $this->config['enabled'] === true);
            }
            
        } catch (Exception $e) {
            // Fallback to default config
            $errorMessage = $e->getMessage();
            $this->logger->warning('Failed to load email config from database, using defaults', [
                'error' => $errorMessage,
                'trace' => $e->getTraceAsString()
            ]);
            
            // Log the actual query being used for debugging
            error_log("MailService loadConfig error: " . $errorMessage);
            error_log("Query attempted: SELECT setting_key, `value` FROM platform_settings WHERE setting_key LIKE 'email_%'");
            
            $this->config = [
                'enabled' => false,
                'method' => 'mail',
                'from_email' => 'noreply@betrollover.com',
                'from_name' => 'SmartPicks Pro',
                'admin_email' => 'admin@betrollover.com'
            ];
        }
    }
    
    /**
     * Send email notification
     * @param string $to Email recipient
     * @param string $subject Email subject
     * @param string $message Email message (HTML or plain text)
     * @param string $replyTo Optional reply-to email
     * @return array ['success' => bool, 'message' => string]
     */
    public function sendEmail($to, $subject, $message, $replyTo = null) {
        if (!$this->config['enabled']) {
            $this->logger->info('Email sending is disabled');
            return [
                'success' => false,
                'message' => 'Email notifications are disabled'
            ];
        }
        
        if (empty($to) || empty($subject) || empty($message)) {
            return [
                'success' => false,
                'message' => 'Missing required email parameters'
            ];
        }
        
        try {
            $fromEmail = $this->config['from_email'] ?? 'noreply@betrollover.com';
            $fromName = $this->config['from_name'] ?? 'SmartPicks Pro';
            
            if ($this->config['method'] === 'smtp') {
                return $this->sendViaSMTP($to, $subject, $message, $fromEmail, $fromName, $replyTo);
            } else {
                return $this->sendViaMail($to, $subject, $message, $fromEmail, $fromName, $replyTo);
            }
        } catch (Exception $e) {
            $this->logger->error('Failed to send email', [
                'to' => $to,
                'subject' => $subject,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'message' => 'Failed to send email: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Send email via SMTP
     */
    private function sendViaSMTP($to, $subject, $message, $fromEmail, $fromName, $replyTo = null) {
        // Check if PHPMailer is available
        if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            return $this->sendViaPHPMailer($to, $subject, $message, $fromEmail, $fromName, $replyTo);
        }
        
        // Use native PHP SMTP implementation
        try {
            $host = $this->config['smtp_host'] ?? 'localhost';
            $port = intval($this->config['smtp_port'] ?? 587);
            $username = $this->config['smtp_username'] ?? '';
            $password = $this->config['smtp_password'] ?? '';
            $encryption = strtolower($this->config['smtp_encryption'] ?? 'tls');
            
            // Validate SMTP credentials
            if (empty($host) || empty($username) || empty($password)) {
                $this->logger->warning('SMTP credentials not configured, falling back to mail()');
                return $this->sendViaMail($to, $subject, $message, $fromEmail, $fromName, $replyTo);
            }
            
            // Use native SMTP implementation
            return $this->sendViaNativeSMTP($to, $subject, $message, $fromEmail, $fromName, $host, $port, $username, $password, $encryption, $replyTo);
            
        } catch (Exception $e) {
            $this->logger->error('SMTP send failed', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'SMTP send failed: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Send email via native PHP SMTP (using stream_socket_client)
     */
    private function sendViaNativeSMTP($to, $subject, $message, $fromEmail, $fromName, $host, $port, $username, $password, $encryption, $replyTo = null) {
        try {
            // Determine connection string
            $connectionString = $host . ':' . $port;
            $context = stream_context_create();
            
            // Enable SSL/TLS if needed
            if ($encryption === 'ssl') {
                $connectionString = 'ssl://' . $connectionString;
                stream_context_set_option($context, 'ssl', 'verify_peer', false);
                stream_context_set_option($context, 'ssl', 'verify_peer_name', false);
            }
            
            // Connect to SMTP server
            $socket = stream_socket_client($connectionString, $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
            
            if (!$socket) {
                throw new Exception("Failed to connect to SMTP server: $errstr ($errno)");
            }
            
            // Read server greeting
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '220') {
                throw new Exception("SMTP server error: $response");
            }
            
            // Send EHLO
            fputs($socket, "EHLO $host\r\n");
            $response = '';
            while ($line = fgets($socket, 515)) {
                $response .= $line;
                if (substr($line, 3, 1) === ' ') break;
            }
            
            // Start TLS if encryption is TLS
            if ($encryption === 'tls') {
                fputs($socket, "STARTTLS\r\n");
                $response = fgets($socket, 515);
                if (substr($response, 0, 3) !== '220') {
                    throw new Exception("STARTTLS failed: $response");
                }
                
                // Enable crypto
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                
                // Send EHLO again after TLS
                fputs($socket, "EHLO $host\r\n");
                $response = '';
                while ($line = fgets($socket, 515)) {
                    $response .= $line;
                    if (substr($line, 3, 1) === ' ') break;
                }
            }
            
            // Authenticate
            fputs($socket, "AUTH LOGIN\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '334') {
                throw new Exception("AUTH LOGIN failed: $response");
            }
            
            fputs($socket, base64_encode($username) . "\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '334') {
                throw new Exception("Username authentication failed: $response");
            }
            
            fputs($socket, base64_encode($password) . "\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '235') {
                throw new Exception("Password authentication failed: $response");
            }
            
            // Set sender
            fputs($socket, "MAIL FROM: <$fromEmail>\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '250') {
                throw new Exception("MAIL FROM failed: $response");
            }
            
            // Set recipient
            fputs($socket, "RCPT TO: <$to>\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '250') {
                throw new Exception("RCPT TO failed: $response");
            }
            
            // Send data
            fputs($socket, "DATA\r\n");
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '354') {
                throw new Exception("DATA command failed: $response");
            }
            
            // Prepare email headers
            $headers = [];
            $headers[] = "From: $fromName <$fromEmail>";
            $headers[] = "To: <$to>";
            $headers[] = "Subject: $subject";
            $headers[] = "MIME-Version: 1.0";
            $headers[] = "Content-Type: text/html; charset=UTF-8";
            if ($replyTo) {
                $headers[] = "Reply-To: <$replyTo>";
            }
            $headers[] = "X-Mailer: PHP/" . phpversion();
            
            // Send email
            fputs($socket, implode("\r\n", $headers) . "\r\n\r\n");
            fputs($socket, $message . "\r\n");
            fputs($socket, ".\r\n");
            
            $response = fgets($socket, 515);
            if (substr($response, 0, 3) !== '250') {
                throw new Exception("Email sending failed: $response");
            }
            
            // Quit
            fputs($socket, "QUIT\r\n");
            fgets($socket, 515);
            fclose($socket);
            
            $this->logger->info('Email sent successfully via SMTP', [
                'to' => $to,
                'subject' => $subject,
                'host' => $host
            ]);
            
            return [
                'success' => true,
                'message' => 'Email sent successfully via SMTP'
            ];
            
        } catch (Exception $e) {
            if (isset($socket) && is_resource($socket)) {
                fclose($socket);
            }
            $this->logger->error('Native SMTP send failed', [
                'to' => $to,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Send email via PHPMailer (if available)
     */
    private function sendViaPHPMailer($to, $subject, $message, $fromEmail, $fromName, $replyTo = null) {
        try {
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            
            // Server settings
            $mail->isSMTP();
            $mail->Host = $this->config['smtp_host'] ?? 'localhost';
            $mail->SMTPAuth = true;
            $mail->Username = $this->config['smtp_username'] ?? '';
            $mail->Password = $this->config['smtp_password'] ?? '';
            $mail->SMTPSecure = $this->config['smtp_encryption'] === 'ssl' ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = intval($this->config['smtp_port'] ?? 587);
            
            // Recipients
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($to);
            if ($replyTo) {
                $mail->addReplyTo($replyTo);
            }
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $message;
            
            $mail->send();
            
            $this->logger->info('Email sent successfully via PHPMailer', [
                'to' => $to,
                'subject' => $subject
            ]);
            
            return [
                'success' => true,
                'message' => 'Email sent successfully via PHPMailer'
            ];
            
        } catch (Exception $e) {
            $this->logger->error('PHPMailer send failed', [
                'to' => $to,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'message' => 'PHPMailer send failed: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Send email via PHP mail() function
     */
    private function sendViaMail($to, $subject, $message, $fromEmail, $fromName, $replyTo = null) {
        // Prepare headers
        $headers = [];
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-type: text/html; charset=UTF-8";
        $headers[] = "From: {$fromName} <{$fromEmail}>";
        
        if ($replyTo) {
            $headers[] = "Reply-To: {$replyTo}";
        }
        
        $headers[] = "X-Mailer: PHP/" . phpversion();
        
        // Convert message to HTML if it's plain text
        if (strip_tags($message) === $message) {
            $message = nl2br(htmlspecialchars($message));
            $message = "<html><body>{$message}</body></html>";
        }
        
        $headerString = implode("\r\n", $headers);
        
        // Send email
        $result = mail($to, $subject, $message, $headerString);
        
        if ($result) {
            $this->logger->info('Email sent successfully via mail()', [
                'to' => $to,
                'subject' => $subject
            ]);
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } else {
            $this->logger->error('Email send failed via mail()', [
                'to' => $to,
                'subject' => $subject
            ]);
            return [
                'success' => false,
                'message' => 'Failed to send email via mail() function'
            ];
        }
    }
    
    /**
     * Send notification to admin when tipster creates a pick for approval
     */
    public function notifyAdminPickPending($pickId, $tipsterId, $pickTitle) {
        try {
            // Get tipster info
            $tipster = $this->db->fetch("
                SELECT username, display_name, email 
                FROM users 
                WHERE id = ?
            ", [$tipsterId]);
            
            if (!$tipster) {
                throw new Exception('Tipster not found');
            }
            
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Unknown Tipster';
            $adminEmail = $this->config['admin_email'] ?? 'admin@betrollover.com';
            
            $subject = "New Pick Pending Approval - {$pickTitle}";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>New Pick Pending Approval</h2>
                        <p>A new pick has been created by a tipster and is awaiting your approval.</p>
                        
                        <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>Pick ID:</strong> #{$pickId}</p>
                            <p><strong>Pick Title:</strong> {$pickTitle}</p>
                            <p><strong>Tipster:</strong> {$tipsterName}</p>
                            <p><strong>Created:</strong> " . date('Y-m-d H:i:s') . "</p>
                        </div>
                        
                        <p>Please review and approve or reject this pick in the admin dashboard:</p>
                        <p>
                            <a href='" . $this->getBaseUrl() . "/admin_approve_pick' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Review Pick
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($adminEmail, $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send admin pick pending notification', [
                'pick_id' => $pickId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'message' => 'Failed to send notification: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get base URL for email links
     */
    public function getBaseUrl() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $path = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME'] ?? '');
        $path = str_replace('/app/controllers', '', $path);
        return $protocol . '://' . $host . $path;
    }
    
    /**
     * Send notification when pick is approved
     */
    public function notifyTipsterPickApproved($tipsterId, $pickId, $pickTitle) {
        try {
            $tipster = $this->db->fetch("
                SELECT username, display_name, email 
                FROM users 
                WHERE id = ?
            ", [$tipsterId]);
            
            if (!$tipster || empty($tipster['email'])) {
                $this->logger->warning('Tipster email not found, skipping notification', ['tipster_id' => $tipsterId]);
                return ['success' => false, 'message' => 'Tipster email not found'];
            }
            
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Tipster';
            
            $subject = "Your Pick Has Been Approved - {$pickTitle}";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2e7d32;'>Pick Approved! 🎉</h2>
                        <p>Hello {$tipsterName},</p>
                        <p>Great news! Your pick has been approved and is now live on the marketplace.</p>
                        
                        <div style='background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>Pick Title:</strong> {$pickTitle}</p>
                            <p><strong>Status:</strong> Approved and Live</p>
                        </div>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/tipster_dashboard' 
                               style='background-color: #2e7d32; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                View My Picks
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($tipster['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send tipster pick approved notification', [
                'pick_id' => $pickId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify tipster when their pick is rejected
     */
    public function notifyTipsterPickRejected($tipsterId, $pickId, $pickTitle, $rejectionReason = '') {
        try {
            $tipster = $this->db->fetch("SELECT username, display_name, email FROM users WHERE id = ?", [$tipsterId]);
            
            if (!$tipster || empty($tipster['email'])) {
                $this->logger->warning('Tipster email not found, skipping rejection notification', ['tipster_id' => $tipsterId]);
                return ['success' => false, 'message' => 'Tipster email not found'];
            }
            
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Tipster';
            
            $subject = "Pick Rejected - {$pickTitle}";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>Pick Rejected</h2>
                        <p>Hello {$tipsterName},</p>
                        <p>We're sorry to inform you that your pick has been reviewed and rejected.</p>
                        
                        <div style='background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;'>
                            <p><strong>Pick Title:</strong> {$pickTitle}</p>
                            <p><strong>Pick ID:</strong> #{$pickId}</p>";
            
            if (!empty($rejectionReason)) {
                $message .= "<p><strong>Reason:</strong> " . htmlspecialchars($rejectionReason) . "</p>";
            }
            
            $message .= "</div>
                        
                        <p>Please review the feedback and feel free to create a new pick.</p>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/create_pick' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Create New Pick
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($tipster['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send tipster pick rejected notification', [
                'pick_id' => $pickId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify admin when tipster application is submitted
     */
    public function notifyAdminTipsterApplication($applicationId, $userId, $username) {
        try {
            $user = $this->db->fetch("SELECT display_name, email FROM users WHERE id = ?", [$userId]);
            $displayName = $user['display_name'] ?? $username;
            
            $adminEmail = $this->config['admin_email'] ?? 'admin@betrollover.com';
            $subject = "New Tipster Application - {$displayName}";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>New Tipster Application</h2>
                        <p>A new tipster application has been submitted and is awaiting your review.</p>
                        
                        <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>Application ID:</strong> #{$applicationId}</p>
                            <p><strong>Applicant:</strong> {$displayName} ({$username})</p>
                            <p><strong>Submitted:</strong> " . date('Y-m-d H:i:s') . "</p>
                        </div>
                        
                        <p>Please review the application in the admin dashboard:</p>
                        <p>
                            <a href='" . $this->getBaseUrl() . "/admin_verification' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Review Application
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($adminEmail, $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send admin tipster application notification', [
                'application_id' => $applicationId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify user when tipster application is approved
     */
    public function notifyUserApplicationApproved($userId, $applicationId) {
        try {
            $user = $this->db->fetch("SELECT username, display_name, email FROM users WHERE id = ?", [$userId]);
            
            if (!$user || empty($user['email'])) {
                return ['success' => false, 'message' => 'User email not found'];
            }
            
            $userName = $user['display_name'] ?? $user['username'] ?? 'User';
            
            $subject = "Tipster Application Approved - Welcome to SmartPicks Pro!";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2e7d32;'>Congratulations! 🎉</h2>
                        <p>Hello {$userName},</p>
                        <p>Great news! Your tipster application has been approved.</p>
                        <p>You are now a verified tipster and can start creating picks!</p>
                        
                        <div style='background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>Status:</strong> Approved</p>
                            <p><strong>Application ID:</strong> #{$applicationId}</p>
                        </div>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/tipster_dashboard' 
                               style='background-color: #2e7d32; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Go to Tipster Dashboard
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($user['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send user application approved notification', [
                'application_id' => $applicationId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify user when tipster application is rejected
     */
    public function notifyUserApplicationRejected($userId, $applicationId, $rejectionReason = '') {
        try {
            $user = $this->db->fetch("SELECT username, display_name, email FROM users WHERE id = ?", [$userId]);
            
            if (!$user || empty($user['email'])) {
                return ['success' => false, 'message' => 'User email not found'];
            }
            
            $userName = $user['display_name'] ?? $user['username'] ?? 'User';
            
            $subject = "Tipster Application Status Update";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>Application Status Update</h2>
                        <p>Hello {$userName},</p>
                        <p>We're sorry to inform you that your tipster application has been reviewed and unfortunately not approved at this time.</p>
                        
                        <div style='background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;'>";
            
            if (!empty($rejectionReason)) {
                $message .= "<p><strong>Reason:</strong> " . htmlspecialchars($rejectionReason) . "</p>";
            }
            
            $message .= "</div>
                        
                        <p>You can reapply at any time. Please feel free to submit a new application.</p>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/become_tipster' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Apply Again
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($user['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send user application rejected notification', [
                'application_id' => $applicationId,
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify admin when payout request is submitted
     */
    public function notifyAdminPayoutRequest($payoutId, $tipsterId, $amount) {
        try {
            $tipster = $this->db->fetch("SELECT username, display_name FROM users WHERE id = ?", [$tipsterId]);
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Unknown';
            
            $adminEmail = $this->config['admin_email'] ?? 'admin@betrollover.com';
            $subject = "New Payout Request - GHS " . number_format($amount, 2);
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>New Payout Request</h2>
                        <p>A new payout request has been submitted and requires your review.</p>
                        
                        <div style='background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>Payout ID:</strong> #{$payoutId}</p>
                            <p><strong>Tipster:</strong> {$tipsterName}</p>
                            <p><strong>Amount:</strong> GHS " . number_format($amount, 2) . "</p>
                            <p><strong>Requested:</strong> " . date('Y-m-d H:i:s') . "</p>
                        </div>
                        
                        <p>Please review and process the payout request:</p>
                        <p>
                            <a href='" . $this->getBaseUrl() . "/admin_payouts' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Review Payout
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($adminEmail, $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send admin payout request notification', [
                'payout_id' => $payoutId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify tipster when payout request is approved
     */
    public function notifyTipsterPayoutApproved($tipsterId, $payoutId, $amount, $netAmount, $paymentMethod) {
        try {
            $tipster = $this->db->fetch("SELECT username, display_name, email FROM users WHERE id = ?", [$tipsterId]);
            
            if (!$tipster || empty($tipster['email'])) {
                return ['success' => false, 'message' => 'Tipster email not found'];
            }
            
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Tipster';
            $fee = $amount - $netAmount;
            
            $subject = "Payout Approved - GHS " . number_format($netAmount, 2);
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #2e7d32;'>Payout Approved! 💰</h2>
                        <p>Hello {$tipsterName},</p>
                        <p>Your payout request has been approved and processed.</p>
                        
                        <div style='background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>Payout ID:</strong> #{$payoutId}</p>
                            <p><strong>Gross Amount:</strong> GHS " . number_format($amount, 2) . "</p>
                            <p><strong>Platform Fee:</strong> GHS " . number_format($fee, 2) . "</p>
                            <p><strong>Net Amount:</strong> GHS " . number_format($netAmount, 2) . "</p>
                            <p><strong>Payment Method:</strong> " . htmlspecialchars($paymentMethod) . "</p>
                        </div>
                        
                        <p>The funds will be transferred to your account shortly.</p>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/tipster_financial_review' 
                               style='background-color: #2e7d32; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                View Financial Review
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($tipster['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send tipster payout approved notification', [
                'payout_id' => $payoutId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify tipster when payout request is rejected
     */
    public function notifyTipsterPayoutRejected($tipsterId, $payoutId, $amount, $rejectionReason = '') {
        try {
            $tipster = $this->db->fetch("SELECT username, display_name, email FROM users WHERE id = ?", [$tipsterId]);
            
            if (!$tipster || empty($tipster['email'])) {
                return ['success' => false, 'message' => 'Tipster email not found'];
            }
            
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Tipster';
            
            $subject = "Payout Request Rejected";
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #d32f2f;'>Payout Request Rejected</h2>
                        <p>Hello {$tipsterName},</p>
                        <p>We're sorry to inform you that your payout request has been rejected.</p>
                        
                        <div style='background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;'>
                            <p><strong>Payout ID:</strong> #{$payoutId}</p>
                            <p><strong>Amount:</strong> GHS " . number_format($amount, 2) . "</p>";
            
            if (!empty($rejectionReason)) {
                $message .= "<p><strong>Reason:</strong> " . htmlspecialchars($rejectionReason) . "</p>";
            }
            
            $message .= "</div>
                        
                        <p>The funds remain in your wallet. You can submit a new payout request.</p>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/payout_request' 
                               style='background-color: #d32f2f; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                Request Payout
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($tipster['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send tipster payout rejected notification', [
                'payout_id' => $payoutId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
    
    /**
     * Notify tipster when their pick is settled (won/lost)
     */
    public function notifyTipsterPickSettled($tipsterId, $pickId, $pickTitle, $result, $earnings = 0) {
        try {
            $tipster = $this->db->fetch("SELECT username, display_name, email FROM users WHERE id = ?", [$tipsterId]);
            
            if (!$tipster || empty($tipster['email'])) {
                return ['success' => false, 'message' => 'Tipster email not found'];
            }
            
            $tipsterName = $tipster['display_name'] ?? $tipster['username'] ?? 'Tipster';
            $isWon = ($result === 'won' || $result === 'win');
            $statusColor = $isWon ? '#2e7d32' : '#d32f2f';
            $statusBg = $isWon ? '#e8f5e8' : '#ffebee';
            $statusIcon = $isWon ? '🎉' : '😔';
            
            $subject = "Pick Settled - {$pickTitle} - " . ucfirst($result);
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: {$statusColor};'>Pick Settled {$statusIcon}</h2>
                        <p>Hello {$tipsterName},</p>
                        <p>Your pick has been settled.</p>
                        
                        <div style='background-color: {$statusBg}; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid {$statusColor};'>
                            <p><strong>Pick Title:</strong> {$pickTitle}</p>
                            <p><strong>Pick ID:</strong> #{$pickId}</p>
                            <p><strong>Result:</strong> <strong style='color: {$statusColor};'>" . ucfirst($result) . "</strong></p>";
            
            if ($isWon && $earnings > 0) {
                $message .= "<p><strong>Earnings Credited:</strong> GHS " . number_format($earnings, 2) . "</p>";
            }
            
            $message .= "</div>
                        
                        <p>
                            <a href='" . $this->getBaseUrl() . "/tipster_dashboard' 
                               style='background-color: {$statusColor}; color: white; padding: 10px 20px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;'>
                                View My Picks
                            </a>
                        </p>
                        
                        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
                        <p style='font-size: 12px; color: #666;'>
                            This is an automated notification from SmartPicks Pro.
                        </p>
                    </div>
                </body>
                </html>
            ";
            
            return $this->sendEmail($tipster['email'], $subject, $message);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to send tipster pick settled notification', [
                'pick_id' => $pickId,
                'tipster_id' => $tipsterId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => 'Failed to send notification: ' . $e->getMessage()];
        }
    }
}
?>

