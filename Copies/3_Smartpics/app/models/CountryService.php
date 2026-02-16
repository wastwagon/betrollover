<?php
/**
 * SmartPicks Pro - Country Detection Service
 * Handles IP-based country detection and user location tracking
 */

class CountryService {
    
    private static $instance = null;
    private $db;
    private $logger;
    private $apiKey;
    
    private function __construct() {
        $this->db = Database::getInstance();
        $this->logger = Logger::getInstance();
        
        // Using ipapi.co (free tier: 1000 requests/day)
        // Alternative: ip-api.com, ipinfo.io, or GeoJS
        $this->apiKey = config('geoip.api_key', '');
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Detect country from IP address
     */
    public function detectCountry($ipAddress) {
        try {
            // Skip detection for local/private IPs
            if ($this->isPrivateIP($ipAddress)) {
                return [
                    'country' => 'Ghana',
                    'country_code' => 'GH',
                    'city' => 'Accra',
                    'region' => 'Greater Accra',
                    'timezone' => 'Africa/Accra'
                ];
            }
            
            // Try multiple services for reliability
            $result = $this->detectFromIPAPI($ipAddress);
            
            if (!$result || empty($result['country_code'])) {
                $result = $this->detectFromIPAPICom($ipAddress);
            }
            
            if (!$result || empty($result['country_code'])) {
                $result = $this->detectFromGeoJS($ipAddress);
            }
            
            // Fallback to Ghana if detection fails
            if (!$result || empty($result['country_code'])) {
                $result = [
                    'country' => 'Ghana',
                    'country_code' => 'GH',
                    'city' => 'Unknown',
                    'region' => 'Unknown',
                    'timezone' => 'Africa/Accra'
                ];
            }
            
            $this->logger->info("Country detected", [
                'ip' => $ipAddress,
                'country' => $result['country'],
                'country_code' => $result['country_code']
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("Error detecting country", [
                'ip' => $ipAddress,
                'error' => $e->getMessage()
            ]);
            
            // Return Ghana as fallback
            return [
                'country' => 'Ghana',
                'country_code' => 'GH',
                'city' => 'Unknown',
                'region' => 'Unknown',
                'timezone' => 'Africa/Accra'
            ];
        }
    }
    
    /**
     * Detect using ipapi.co
     */
    private function detectFromIPAPI($ipAddress) {
        try {
            $url = "http://ipapi.co/{$ipAddress}/json/";
            $response = $this->makeRequest($url);
            
            if ($response && isset($response['country_name'])) {
                return [
                    'country' => $response['country_name'],
                    'country_code' => $response['country_code'],
                    'city' => $response['city'] ?? 'Unknown',
                    'region' => $response['region'] ?? 'Unknown',
                    'timezone' => $response['timezone'] ?? 'UTC'
                ];
            }
            
            return null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Detect using ip-api.com
     */
    private function detectFromIPAPICom($ipAddress) {
        try {
            $url = "http://ip-api.com/json/{$ipAddress}";
            $response = $this->makeRequest($url);
            
            if ($response && $response['status'] === 'success') {
                return [
                    'country' => $response['country'],
                    'country_code' => $response['countryCode'],
                    'city' => $response['city'] ?? 'Unknown',
                    'region' => $response['regionName'] ?? 'Unknown',
                    'timezone' => $response['timezone'] ?? 'UTC'
                ];
            }
            
            return null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Detect using GeoJS
     */
    private function detectFromGeoJS($ipAddress) {
        try {
            $url = "https://get.geojs.io/v1/ip/country/{$ipAddress}";
            $response = $this->makeRequest($url);
            
            if ($response && isset($response['country'])) {
                // Get country name from code
                $countryName = $this->getCountryNameFromCode($response['country']);
                
                return [
                    'country' => $countryName,
                    'country_code' => $response['country'],
                    'city' => 'Unknown',
                    'region' => 'Unknown',
                    'timezone' => 'UTC'
                ];
            }
            
            return null;
            
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * Make HTTP request
     */
    private function makeRequest($url) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($response && $httpCode === 200) {
            return json_decode($response, true);
        }
        
        return null;
    }
    
    /**
     * Check if IP is private/local
     */
    private function isPrivateIP($ip) {
        return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }
    
    /**
     * Get country name from country code
     */
    private function getCountryNameFromCode($code) {
        $countries = [
            'GH' => 'Ghana',
            'NG' => 'Nigeria',
            'KE' => 'Kenya',
            'ZA' => 'South Africa',
            'EG' => 'Egypt',
            'MA' => 'Morocco',
            'TN' => 'Tunisia',
            'US' => 'United States',
            'GB' => 'United Kingdom',
            'DE' => 'Germany',
            'FR' => 'France',
            'IT' => 'Italy',
            'ES' => 'Spain',
            'BR' => 'Brazil',
            'IN' => 'India',
            'CN' => 'China',
            'JP' => 'Japan',
            'AU' => 'Australia',
            'CA' => 'Canada'
        ];
        
        return $countries[$code] ?? $code;
    }
    
    /**
     * Update user country information
     */
    public function updateUserCountry($userId, $ipAddress) {
        try {
            $countryInfo = $this->detectCountry($ipAddress);
            
            $this->db->query("
                UPDATE users 
                SET country = ?, 
                    country_code = ?,
                    last_ip = ?,
                    updated_at = NOW()
                WHERE id = ?
            ", [
                $countryInfo['country'],
                $countryInfo['country_code'],
                $ipAddress,
                $userId
            ]);
            
            $this->logger->info("User country updated", [
                'user_id' => $userId,
                'country' => $countryInfo['country'],
                'country_code' => $countryInfo['country_code'],
                'ip' => $ipAddress
            ]);
            
            return $countryInfo;
            
        } catch (Exception $e) {
            $this->logger->error("Error updating user country", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }
    
    /**
     * Get country flag emoji
     */
    public function getCountryFlag($countryCode) {
        $flags = [
            'GH' => '🇬🇭', 'NG' => '🇳🇬', 'KE' => '🇰🇪', 'ZA' => '🇿🇦',
            'EG' => '🇪🇬', 'MA' => '🇲🇦', 'TN' => '🇹🇳', 'US' => '🇺🇸',
            'GB' => '🇬🇧', 'DE' => '🇩🇪', 'FR' => '🇫🇷', 'IT' => '🇮🇹',
            'ES' => '🇪🇸', 'BR' => '🇧🇷', 'IN' => '🇮🇳', 'CN' => '🇨🇳',
            'JP' => '🇯🇵', 'AU' => '🇦🇺', 'CA' => '🇨🇦', 'NL' => '🇳🇱',
            'BE' => '🇧🇪', 'CH' => '🇨🇭', 'AT' => '🇦🇹', 'SE' => '🇸🇪',
            'NO' => '🇳🇴', 'DK' => '🇩🇰', 'FI' => '🇫🇮', 'IE' => '🇮🇪',
            'PT' => '🇵🇹', 'GR' => '🇬🇷', 'PL' => '🇵🇱', 'CZ' => '🇨🇿',
            'HU' => '🇭🇺', 'RO' => '🇷🇴', 'BG' => '🇧🇬', 'HR' => '🇭🇷',
            'SI' => '🇸🇮', 'SK' => '🇸🇰', 'LT' => '🇱🇹', 'LV' => '🇱🇻',
            'EE' => '🇪🇪', 'MT' => '🇲🇹', 'CY' => '🇨🇾', 'LU' => '🇱🇺'
        ];
        
        return $flags[$countryCode] ?? '🌍';
    }
    
    /**
     * Get country badge HTML
     */
    public function getCountryBadge($countryCode, $countryName, $showName = false) {
        $flag = $this->getCountryFlag($countryCode);
        $badgeClass = $this->getCountryBadgeClass($countryCode);
        
        $html = '<span class="country-badge ' . $badgeClass . '" title="' . htmlspecialchars($countryName) . '">';
        $html .= $flag;
        if ($showName) {
            $html .= ' ' . htmlspecialchars($countryName);
        }
        $html .= '</span>';
        
        return $html;
    }
    
    /**
     * Get country badge CSS class
     */
    private function getCountryBadgeClass($countryCode) {
        // Special styling for Ghana (primary country)
        if ($countryCode === 'GH') {
            return 'country-ghana';
        }
        
        // African countries
        $africanCountries = ['NG', 'KE', 'ZA', 'EG', 'MA', 'TN', 'DZ', 'LY', 'SD', 'ET'];
        if (in_array($countryCode, $africanCountries)) {
            return 'country-africa';
        }
        
        // European countries
        $europeanCountries = ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE'];
        if (in_array($countryCode, $europeanCountries)) {
            return 'country-europe';
        }
        
        // American countries
        $americanCountries = ['US', 'BR', 'CA', 'MX', 'AR', 'CL'];
        if (in_array($countryCode, $americanCountries)) {
            return 'country-americas';
        }
        
        // Asian countries
        $asianCountries = ['IN', 'CN', 'JP', 'KR', 'TH', 'SG'];
        if (in_array($countryCode, $asianCountries)) {
            return 'country-asia';
        }
        
        return 'country-other';
    }
    
    /**
     * Get platform statistics by country
     */
    public function getCountryStats() {
        try {
            return $this->db->fetchAll("
                SELECT 
                    country,
                    country_code,
                    COUNT(*) as user_count,
                    SUM(CASE WHEN role = 'tipster' THEN 1 ELSE 0 END) as tipster_count,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
                FROM users 
                WHERE country IS NOT NULL AND country_code IS NOT NULL
                GROUP BY country, country_code
                ORDER BY user_count DESC
            ");
            
        } catch (Exception $e) {
            $this->logger->error("Error getting country stats", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}
?>
