<?php
/**
 * SmartPicks Pro - Paystack Payment Service
 * Handles Paystack payment gateway integration
 */

class PaystackService {
    
    private static $instance = null;
    private $secretKey;
    private $publicKey;
    private $baseUrl;
    private $logger;
    private $db;
    
    private function __construct() {
        // Load configuration
        require_once __DIR__ . '/../../config/config.php';
        require_once __DIR__ . '/Database.php';
        
        $this->logger = Logger::getInstance();
        
        // Initialize with your live keys first
        $this->secretKey = 'sk_live_7a5d6a4b0d156dd5a9ebb790296a096120b43cdf';
        $this->publicKey = 'pk_live_31ec7e4d0ed96a9169e7dfbd6265ce4f67dd0721';
        $this->baseUrl = 'https://api.paystack.co';
        
        try {
            $this->db = Database::getInstance();
            // Try to load settings from database
            $this->loadPaystackSettings();
        } catch (Exception $e) {
            // If database fails, keep using the live keys
            $this->logger->warning("Database connection failed, using live keys", [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Load Paystack settings from database
     */
    private function loadPaystackSettings() {
        try {
            // Try platform_settings table first (new system)
            $settings = $this->db->fetchAll("SELECT setting_key, value FROM platform_settings WHERE setting_key LIKE 'paystack_%'");
            
            // If no results, try old settings table
            if (empty($settings)) {
                $settings = $this->db->fetchAll("SELECT `key` as setting_key, value FROM settings WHERE `key` LIKE 'paystack_%'");
            }
            
            $paystackSettings = [];
            
            foreach ($settings as $setting) {
                $paystackSettings[$setting['setting_key']] = $setting['value'];
            }
            
            // Use database settings or fallback to your live keys
            $this->secretKey = $paystackSettings['paystack_secret_key'] ?? 'sk_live_7a5d6a4b0d156dd5a9ebb790296a096120b43cdf';
            $this->publicKey = $paystackSettings['paystack_public_key'] ?? 'pk_live_31ec7e4d0ed96a9169e7dfbd6265ce4f67dd0721';
            $this->baseUrl = 'https://api.paystack.co'; // Always use production URL
            
            // Determine if we're in test or live mode
            $mode = $paystackSettings['paystack_mode'] ?? 'live';
            
            // Use test keys if in test mode
            if ($mode === 'test') {
                $this->secretKey = $paystackSettings['paystack_test_secret_key'] ?? $this->secretKey;
                $this->publicKey = $paystackSettings['paystack_test_public_key'] ?? $this->publicKey;
                $this->baseUrl = 'https://api.paystack.co'; // Same URL for test and live
            }
            
            // Log the keys being used (without exposing them)
            $this->logger->info("Paystack settings loaded", [
                'mode' => $mode,
                'secret_key_prefix' => substr($this->secretKey, 0, 10) . '...',
                'public_key_prefix' => substr($this->publicKey, 0, 10) . '...',
                'base_url' => $this->baseUrl
            ]);
            
        } catch (Exception $e) {
            // Fallback to your live keys
            $this->secretKey = 'sk_live_7a5d6a4b0d156dd5a9ebb790296a096120b43cdf';
            $this->publicKey = 'pk_live_31ec7e4d0ed96a9169e7dfbd6265ce4f67dd0721';
            $this->baseUrl = 'https://api.paystack.co';
            
            $this->logger->warning("Failed to load Paystack settings from database, using live keys fallback", [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Initialize transaction
     */
    public function initializeTransaction($email, $amount, $reference, $callbackUrl = '') {
        try {
            $data = [
                'email' => $email,
                'amount' => $amount * 100, // Convert to kobo (smallest currency unit)
                'reference' => $reference,
                'callback_url' => $callbackUrl,
                'currency' => 'GHS'
            ];
            
            $response = $this->makeRequest('POST', '/transaction/initialize', $data);
            
            if ($response && $response['status']) {
                $this->logger->info("Paystack transaction initialized", [
                    'reference' => $reference,
                    'amount' => $amount,
                    'email' => $email
                ]);
                
                return [
                    'success' => true,
                    'authorization_url' => $response['data']['authorization_url'],
                    'access_code' => $response['data']['access_code'],
                    'reference' => $response['data']['reference']
                ];
            } else {
                throw new Exception($response['message'] ?? 'Failed to initialize transaction');
            }
            
        } catch (Exception $e) {
            $this->logger->error("Paystack initialization error", [
                'reference' => $reference,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Verify transaction
     */
    public function verifyTransaction($reference) {
        try {
            $response = $this->makeRequest('GET', '/transaction/verify/' . $reference);
            
            if ($response && $response['status']) {
                $transaction = $response['data'];
                
                $this->logger->info("Paystack transaction verified", [
                    'reference' => $reference,
                    'status' => $transaction['status'],
                    'amount' => $transaction['amount']
                ]);
                
                return [
                    'success' => true,
                    'verified' => true,
                    'status' => $transaction['status'],
                    'amount' => $transaction['amount'] / 100, // Convert back from kobo
                    'currency' => $transaction['currency'],
                    'reference' => $transaction['reference'],
                    'gateway_response' => $transaction['gateway_response'],
                    'customer' => $transaction['customer'],
                    'paid_at' => $transaction['paid_at']
                ];
            } else {
                return [
                    'success' => false,
                    'verified' => false,
                    'error' => $response['message'] ?? 'Transaction verification failed'
                ];
            }
            
        } catch (Exception $e) {
            $this->logger->error("Paystack verification error", [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'verified' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create customer
     */
    public function createCustomer($email, $firstName = '', $lastName = '', $phone = '') {
        try {
            $data = [
                'email' => $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => $phone
            ];
            
            $response = $this->makeRequest('POST', '/customer', $data);
            
            if ($response && $response['status']) {
                return [
                    'success' => true,
                    'customer_code' => $response['data']['customer_code'],
                    'email' => $response['data']['email']
                ];
            } else {
                throw new Exception($response['message'] ?? 'Failed to create customer');
            }
            
        } catch (Exception $e) {
            $this->logger->error("Paystack customer creation error", [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get banks for transfer (if needed)
     */
    public function getBanks() {
        try {
            $response = $this->makeRequest('GET', '/bank?currency=GHS');
            
            if ($response && $response['status']) {
                return [
                    'success' => true,
                    'banks' => $response['data']
                ];
            } else {
                throw new Exception($response['message'] ?? 'Failed to get banks');
            }
            
        } catch (Exception $e) {
            $this->logger->error("Paystack get banks error", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Test Paystack connection (simplified)
     */
    public function testConnection() {
        try {
            // Test with a simple endpoint that exists
            $response = $this->makeRequest('GET', '/bank?currency=GHS');
            
            if ($response && $response['status']) {
                return [
                    'success' => true,
                    'message' => 'Paystack API connection successful',
                    'banks_count' => count($response['data'])
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $response['message'] ?? 'Connection test failed'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create transfer recipient
     */
    public function createTransferRecipient($type, $name, $accountNumber, $bankCode, $email = '') {
        try {
            $data = [
                'type' => $type, // 'nuban' for bank accounts
                'name' => $name,
                'account_number' => $accountNumber,
                'bank_code' => $bankCode,
                'email' => $email
            ];
            
            $response = $this->makeRequest('POST', '/transferrecipient', $data);
            
            if ($response && $response['status']) {
                return [
                    'success' => true,
                    'recipient_code' => $response['data']['recipient_code'],
                    'details' => $response['data']['details']
                ];
            } else {
                throw new Exception($response['message'] ?? 'Failed to create transfer recipient');
            }
            
        } catch (Exception $e) {
            $this->logger->error("Paystack transfer recipient creation error", [
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Initiate transfer
     */
    public function initiateTransfer($amount, $recipient, $reference, $reason = '') {
        try {
            $data = [
                'source' => 'balance',
                'amount' => $amount * 100, // Convert to kobo
                'recipient' => $recipient,
                'reference' => $reference,
                'reason' => $reason,
                'currency' => 'GHS'
            ];
            
            $response = $this->makeRequest('POST', '/transfer', $data);
            
            if ($response && $response['status']) {
                $this->logger->info("Paystack transfer initiated", [
                    'reference' => $reference,
                    'amount' => $amount,
                    'recipient' => $recipient
                ]);
                
                return [
                    'success' => true,
                    'transfer_code' => $response['data']['transfer_code'],
                    'reference' => $response['data']['reference'],
                    'status' => $response['data']['status']
                ];
            } else {
                throw new Exception($response['message'] ?? 'Failed to initiate transfer');
            }
            
        } catch (Exception $e) {
            $this->logger->error("Paystack transfer initiation error", [
                'reference' => $reference,
                'amount' => $amount,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Make HTTP request to Paystack API
     */
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'Authorization: Bearer ' . $this->secretKey,
            'Content-Type: application/json'
        ];
        
        // Log request details (without sensitive data)
        $this->logger->info("Making Paystack API request", [
            'method' => $method,
            'endpoint' => $endpoint,
            'url' => $url,
            'secret_key_prefix' => substr($this->secretKey, 0, 10) . '...'
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($response === false) {
            $this->logger->error("cURL Error in Paystack request", ['error' => $error]);
            throw new Exception("cURL Error: " . $error);
        }
        
        $decodedResponse = json_decode($response, true);
        
        // Log response details
        $this->logger->info("Paystack API response", [
            'http_code' => $httpCode,
            'response_status' => $decodedResponse['status'] ?? 'unknown',
            'response_message' => $decodedResponse['message'] ?? 'no message'
        ]);
        
        if ($httpCode !== 200) {
            $this->logger->error("Paystack API error", [
                'http_code' => $httpCode,
                'response' => $decodedResponse,
                'endpoint' => $endpoint
            ]);
            throw new Exception("HTTP Error {$httpCode}: " . ($decodedResponse['message'] ?? 'Unknown error'));
        }
        
        return $decodedResponse;
    }
    
    /**
     * Generate unique reference
     */
    public function generateReference($prefix = 'SPP') {
        return $prefix . '_' . time() . '_' . rand(1000, 9999);
    }
    
    /**
     * Get public key for frontend
     */
    public function getPublicKey() {
        return $this->publicKey;
    }
    
    /**
     * Validate webhook signature
     */
    public function validateWebhook($payload, $signature) {
        $expectedSignature = hash_hmac('sha512', $payload, $this->secretKey);
        return hash_equals($expectedSignature, $signature);
    }
}
?>
