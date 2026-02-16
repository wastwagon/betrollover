<?php
/**
 * SmartPicks Pro - Logger Class
 * Handles all logging functionality - Single Central Log File
 */

class Logger {
    private static $instance = null;
    private $logPath;
    private $logFile = 'error.log'; // Single log file for everything
    
    private function __construct() {
        $this->logPath = __DIR__ . '/../../storage/logs/';
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Log an error message
     */
    public function error($message, $context = []) {
        $this->writeLog('ERROR', $message, $context);
    }
    
    /**
     * Log an info message
     */
    public function info($message, $context = []) {
        $this->writeLog('INFO', $message, $context);
    }
    
    /**
     * Log a warning message
     */
    public function warning($message, $context = []) {
        $this->writeLog('WARNING', $message, $context);
    }
    
    /**
     * Log database operations
     */
    public function database($message, $context = []) {
        $this->writeLog('DATABASE', $message, $context);
    }
    
    /**
     * Log access/security events
     */
    public function access($message, $context = []) {
        $this->writeLog('ACCESS', $message, $context);
    }
    
    /**
     * Write to single log file
     */
    private function writeLog($level, $message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' | Context: ' . json_encode($context) : '';
        $logEntry = "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
        
        $filepath = $this->logPath . $this->logFile;
        
        // Create directory if it doesn't exist
        if (!is_dir($this->logPath)) {
            mkdir($this->logPath, 0755, true);
        }
        
        // Write to single log file
        file_put_contents($filepath, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Get recent log entries from single log file
     */
    public function getLog($lines = 50) {
        $filepath = $this->logPath . $this->logFile;
        
        if (!file_exists($filepath)) {
            return [];
        }
        
        $logContent = file_get_contents($filepath);
        $logLines = explode(PHP_EOL, $logContent);
        
        // Get last N lines
        return array_slice(array_filter($logLines), -$lines);
    }
    
    /**
     * Clear the log file
     */
    public function clearLog() {
        $filepath = $this->logPath . $this->logFile;
        
        if (file_exists($filepath)) {
            file_put_contents($filepath, '');
            return true;
        }
        
        return false;
    }
    
    /**
     * Get log file size
     */
    public function getLogSize() {
        $filepath = $this->logPath . $this->logFile;
        
        if (file_exists($filepath)) {
            return filesize($filepath);
        }
        
        return 0;
    }
    
    /**
     * Get log file path
     */
    public function getLogPath() {
        return $this->logPath . $this->logFile;
    }
}
?>
