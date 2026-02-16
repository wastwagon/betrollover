<?php
/**
 * SmartPicks Pro - View Helper Functions
 * Utility functions for views
 */

class ViewHelper {
    
    /**
     * Render a view with data
     */
    public static function render($viewPath, $data = []) {
        extract($data);
        
        // Start output buffering
        ob_start();
        
        // Include the view file
        $fullPath = __DIR__ . '/../' . $viewPath . '.php';
        if (file_exists($fullPath)) {
            include $fullPath;
        } else {
            echo "View not found: {$viewPath}";
        }
        
        // Get the content
        $content = ob_get_clean();
        
        return $content;
    }
    
    /**
     * Render with layout
     */
    public static function renderWithLayout($viewPath, $data = [], $layout = 'layouts/base') {
        // Extract data for the view
        extract($data);
        
        // Render the view content
        $content = self::render($viewPath, $data);
        
        // Include layout with content
        $layoutPath = __DIR__ . '/../' . $layout . '.php';
        if (file_exists($layoutPath)) {
            include $layoutPath;
        } else {
            echo $content;
        }
    }
    
    /**
     * Format currency
     */
    public static function currency($amount, $currency = 'GHS') {
        return $currency . ' ' . number_format($amount, 2);
    }
    
    /**
     * Format odds
     */
    public static function odds($odds) {
        return number_format($odds, 2);
    }
    
    /**
     * Format date
     */
    public static function date($date, $format = 'M j, Y') {
        return date($format, strtotime($date));
    }
    
    /**
     * Format datetime
     */
    public static function datetime($datetime, $format = 'M j, Y H:i') {
        return date($format, strtotime($datetime));
    }
    
    /**
     * Truncate text
     */
    public static function truncate($text, $length = 100, $suffix = '...') {
        if (strlen($text) <= $length) {
            return $text;
        }
        return substr($text, 0, $length) . $suffix;
    }
    
    /**
     * Generate status badge HTML
     */
    public static function statusBadge($status) {
        $statuses = [
            'active' => ['class' => 'success', 'text' => 'Active'],
            'inactive' => ['class' => 'secondary', 'text' => 'Inactive'],
            'pending' => ['class' => 'warning', 'text' => 'Pending'],
            'approved' => ['class' => 'success', 'text' => 'Approved'],
            'rejected' => ['class' => 'danger', 'text' => 'Rejected'],
            'completed' => ['class' => 'success', 'text' => 'Completed'],
            'failed' => ['class' => 'danger', 'text' => 'Failed'],
            'cancelled' => ['class' => 'secondary', 'text' => 'Cancelled']
        ];
        
        $statusInfo = $statuses[$status] ?? ['class' => 'secondary', 'text' => ucfirst($status)];
        
        return "<span class='badge badge-{$statusInfo['class']}'>{$statusInfo['text']}</span>";
    }
    
    /**
     * Generate role badge HTML
     */
    public static function roleBadge($role) {
        $roles = [
            'admin' => ['class' => 'primary', 'text' => 'Admin'],
            'tipster' => ['class' => 'info', 'text' => 'Tipster'],
            'user' => ['class' => 'secondary', 'text' => 'User']
        ];
        
        $roleInfo = $roles[$role] ?? ['class' => 'secondary', 'text' => ucfirst($role)];
        
        return "<span class='badge badge-{$roleInfo['class']}'>{$roleInfo['text']}</span>";
    }
    
    /**
     * Generate pagination HTML
     */
    public static function pagination($currentPage, $totalPages, $baseUrl) {
        if ($totalPages <= 1) {
            return '';
        }
        
        $html = '<nav class="pagination-nav">';
        $html .= '<ul class="pagination">';
        
        // Previous button
        if ($currentPage > 1) {
            $html .= '<li><a href="' . $baseUrl . '?page=' . ($currentPage - 1) . '">&laquo; Previous</a></li>';
        }
        
        // Page numbers
        $start = max(1, $currentPage - 2);
        $end = min($totalPages, $currentPage + 2);
        
        if ($start > 1) {
            $html .= '<li><a href="' . $baseUrl . '?page=1">1</a></li>';
            if ($start > 2) {
                $html .= '<li><span>...</span></li>';
            }
        }
        
        for ($i = $start; $i <= $end; $i++) {
            $activeClass = $i === $currentPage ? 'active' : '';
            $html .= '<li class="' . $activeClass . '"><a href="' . $baseUrl . '?page=' . $i . '">' . $i . '</a></li>';
        }
        
        if ($end < $totalPages) {
            if ($end < $totalPages - 1) {
                $html .= '<li><span>...</span></li>';
            }
            $html .= '<li><a href="' . $baseUrl . '?page=' . $totalPages . '">' . $totalPages . '</a></li>';
        }
        
        // Next button
        if ($currentPage < $totalPages) {
            $html .= '<li><a href="' . $baseUrl . '?page=' . ($currentPage + 1) . '">Next &raquo;</a></li>';
        }
        
        $html .= '</ul>';
        $html .= '</nav>';
        
        return $html;
    }
    
    /**
     * Generate form field HTML
     */
    public static function formField($type, $name, $label, $value = '', $options = []) {
        $required = $options['required'] ?? false;
        $placeholder = $options['placeholder'] ?? '';
        $class = $options['class'] ?? '';
        $id = $options['id'] ?? $name;
        
        $html = '<div class="form-group">';
        $html .= '<label for="' . $id . '">' . htmlspecialchars($label);
        if ($required) {
            $html .= ' <span class="text-danger">*</span>';
        }
        $html .= '</label>';
        
        switch ($type) {
            case 'text':
            case 'email':
            case 'password':
            case 'number':
                $html .= '<input type="' . $type . '" id="' . $id . '" name="' . $name . '" value="' . htmlspecialchars($value) . '"';
                if ($placeholder) $html .= ' placeholder="' . htmlspecialchars($placeholder) . '"';
                if ($required) $html .= ' required';
                if ($class) $html .= ' class="' . $class . '"';
                $html .= '>';
                break;
                
            case 'textarea':
                $html .= '<textarea id="' . $id . '" name="' . $name . '"';
                if ($placeholder) $html .= ' placeholder="' . htmlspecialchars($placeholder) . '"';
                if ($required) $html .= ' required';
                if ($class) $html .= ' class="' . $class . '"';
                $html .= '>' . htmlspecialchars($value) . '</textarea>';
                break;
                
            case 'select':
                $html .= '<select id="' . $id . '" name="' . $name . '"';
                if ($required) $html .= ' required';
                if ($class) $html .= ' class="' . $class . '"';
                $html .= '>';
                
                if (isset($options['empty_option'])) {
                    $html .= '<option value="">' . htmlspecialchars($options['empty_option']) . '</option>';
                }
                
                foreach ($options['options'] as $optionValue => $optionLabel) {
                    $selected = $value == $optionValue ? ' selected' : '';
                    $html .= '<option value="' . htmlspecialchars($optionValue) . '"' . $selected . '>';
                    $html .= htmlspecialchars($optionLabel);
                    $html .= '</option>';
                }
                
                $html .= '</select>';
                break;
        }
        
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * Generate table HTML
     */
    public static function table($headers, $rows, $options = []) {
        $class = $options['class'] ?? 'table';
        $id = $options['id'] ?? '';
        
        $html = '<table';
        if ($class) $html .= ' class="' . $class . '"';
        if ($id) $html .= ' id="' . $id . '"';
        $html .= '>';
        
        // Headers
        $html .= '<thead><tr>';
        foreach ($headers as $header) {
            $html .= '<th>' . htmlspecialchars($header) . '</th>';
        }
        $html .= '</tr></thead>';
        
        // Rows
        $html .= '<tbody>';
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . $cell . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody>';
        
        $html .= '</table>';
        
        return $html;
    }
    
    /**
     * Generate card HTML
     */
    public static function card($title, $content, $options = []) {
        $class = $options['class'] ?? '';
        $header = $options['header'] ?? true;
        
        $html = '<div class="card';
        if ($class) $html .= ' ' . $class;
        $html .= '">';
        
        if ($header && $title) {
            $html .= '<div class="card-header">';
            $html .= '<h3 class="card-title">' . htmlspecialchars($title) . '</h3>';
            $html .= '</div>';
        }
        
        $html .= '<div class="card-body">';
        $html .= $content;
        $html .= '</div>';
        
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * Escape HTML
     */
    public static function e($string) {
        return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Generate URL
     */
    public static function url($path) {
        return '/' . ltrim($path, '/');
    }
    
    /**
     * Check if current page is active
     */
    public static function isActive($path) {
        $currentPath = $_SERVER['REQUEST_URI'] ?? '';
        return strpos($currentPath, $path) !== false;
    }
}
?>
