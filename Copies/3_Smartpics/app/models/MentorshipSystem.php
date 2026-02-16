<?php
/**
 * SmartPicks Pro - Mentorship System
 * 
 * Handles tipster mentorship, coaching, and knowledge sharing
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class MentorshipSystem {
    
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
     * Apply to become a mentor
     */
    public function applyToBeMentor($userId, $applicationData) {
        try {
            // Check if already a mentor
            $existing = $this->db->fetch("
                SELECT id FROM mentors WHERE user_id = ? AND status = 'active'
            ", [$userId]);
            
            if ($existing) {
                throw new Exception('Already a mentor');
            }
            
            // Insert mentor application
            $mentorId = $this->db->insert("
                INSERT INTO mentors 
                (user_id, bio, specialties, experience_years, hourly_rate, 
                 availability, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
            ", [
                $applicationData['bio'],
                $applicationData['specialties'],
                $applicationData['experience_years'],
                $applicationData['hourly_rate'],
                $applicationData['availability']
            ]);
            
            $this->logger->info("Mentor application submitted", [
                'user_id' => $userId,
                'mentor_id' => $mentorId
            ]);
            
            return $mentorId;
            
        } catch (Exception $e) {
            $this->logger->error("Error applying to be mentor", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            throw $e;
        }
    }
    
    /**
     * Approve mentor application (admin only)
     */
    public function approveMentor($mentorId, $adminId) {
        try {
            $this->db->execute("
                UPDATE mentors 
                SET status = 'active', approved_by = ?, approved_at = NOW() 
                WHERE id = ?
            ", [$adminId, $mentorId]);
            
            $this->logger->info("Mentor approved", [
                'mentor_id' => $mentorId,
                'admin_id' => $adminId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error approving mentor", [
                'error' => $e->getMessage(),
                'mentor_id' => $mentorId,
                'admin_id' => $adminId
            ]);
            throw $e;
        }
    }
    
    /**
     * Request mentorship
     */
    public function requestMentorship($userId, $mentorId, $requestData) {
        try {
            // Check if mentor is available
            $mentor = $this->db->fetch("
                SELECT * FROM mentors WHERE id = ? AND status = 'active'
            ", [$mentorId]);
            
            if (!$mentor) {
                throw new Exception('Mentor not available');
            }
            
            // Check if already has active mentorship
            $existing = $this->db->fetch("
                SELECT id FROM mentorship_requests 
                WHERE mentee_id = ? AND status = 'active'
            ", [$userId]);
            
            if ($existing) {
                throw new Exception('Already has active mentorship request');
            }
            
            // Insert mentorship request
            $requestId = $this->db->insert("
                INSERT INTO mentorship_requests 
                (mentee_id, mentor_id, goals, duration_weeks, budget, 
                 message, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
            ", [
                $userId,
                $mentorId,
                $requestData['goals'],
                $requestData['duration_weeks'],
                $requestData['budget'],
                $requestData['message']
            ]);
            
            $this->logger->info("Mentorship request submitted", [
                'user_id' => $userId,
                'mentor_id' => $mentorId,
                'request_id' => $requestId
            ]);
            
            return $requestId;
            
        } catch (Exception $e) {
            $this->logger->error("Error requesting mentorship", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'mentor_id' => $mentorId
            ]);
            throw $e;
        }
    }
    
    /**
     * Accept mentorship request
     */
    public function acceptMentorshipRequest($requestId, $mentorId) {
        try {
            // Update request status
            $this->db->execute("
                UPDATE mentorship_requests 
                SET status = 'accepted', accepted_at = NOW() 
                WHERE id = ? AND mentor_id = ?
            ", [$requestId, $mentorId]);
            
            // Create mentorship session
            $sessionId = $this->db->insert("
                INSERT INTO mentorship_sessions 
                (request_id, mentor_id, mentee_id, start_date, end_date, 
                 status, created_at) 
                VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? WEEK), 'active', NOW())
            ", [
                $requestId,
                $mentorId,
                $this->db->fetch("SELECT mentee_id FROM mentorship_requests WHERE id = ?", [$requestId])['mentee_id'],
                $this->db->fetch("SELECT duration_weeks FROM mentorship_requests WHERE id = ?", [$requestId])['duration_weeks']
            ]);
            
            $this->logger->info("Mentorship request accepted", [
                'request_id' => $requestId,
                'mentor_id' => $mentorId,
                'session_id' => $sessionId
            ]);
            
            return $sessionId;
            
        } catch (Exception $e) {
            $this->logger->error("Error accepting mentorship request", [
                'error' => $e->getMessage(),
                'request_id' => $requestId,
                'mentor_id' => $mentorId
            ]);
            throw $e;
        }
    }
    
    /**
     * Schedule mentorship session
     */
    public function scheduleSession($sessionId, $sessionData) {
        try {
            $sessionId = $this->db->insert("
                INSERT INTO mentorship_sessions 
                (session_id, mentor_id, mentee_id, scheduled_date, duration_minutes, 
                 session_type, notes, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())
            ", [
                $sessionData['session_id'],
                $sessionData['mentor_id'],
                $sessionData['mentee_id'],
                $sessionData['scheduled_date'],
                $sessionData['duration_minutes'],
                $sessionData['session_type'],
                $sessionData['notes']
            ]);
            
            $this->logger->info("Mentorship session scheduled", [
                'session_id' => $sessionId,
                'mentor_id' => $sessionData['mentor_id'],
                'mentee_id' => $sessionData['mentee_id']
            ]);
            
            return $sessionId;
            
        } catch (Exception $e) {
            $this->logger->error("Error scheduling mentorship session", [
                'error' => $e->getMessage(),
                'session_data' => $sessionData
            ]);
            throw $e;
        }
    }
    
    /**
     * Get available mentors
     */
    public function getAvailableMentors($specialty = null, $limit = 20) {
        try {
            $whereClause = "WHERE m.status = 'active'";
            $params = [];
            
            if ($specialty) {
                $whereClause .= " AND m.specialties LIKE ?";
                $params[] = "%{$specialty}%";
            }
            
            $params[] = $limit;
            
            return $this->db->fetchAll("
                SELECT 
                    m.*,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country,
                    tp.win_rate,
                    tp.total_picks,
                    tp.is_verified
                FROM mentors m
                JOIN users u ON m.user_id = u.id
                LEFT JOIN tipster_profiles tp ON u.id = tp.user_id
                {$whereClause}
                ORDER BY tp.win_rate DESC, m.experience_years DESC
                LIMIT ?
            ", $params);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting available mentors", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
    
    /**
     * Get mentorship requests for mentor
     */
    public function getMentorshipRequests($mentorId, $status = 'pending') {
        try {
            return $this->db->fetchAll("
                SELECT 
                    mr.*,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country
                FROM mentorship_requests mr
                JOIN users u ON mr.mentee_id = u.id
                WHERE mr.mentor_id = ? AND mr.status = ?
                ORDER BY mr.created_at DESC
            ", [$mentorId, $status]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting mentorship requests", [
                'error' => $e->getMessage(),
                'mentor_id' => $mentorId
            ]);
            return [];
        }
    }
    
    /**
     * Get mentorship sessions
     */
    public function getMentorshipSessions($userId, $role = 'mentee') {
        try {
            $whereClause = $role === 'mentee' 
                ? "WHERE ms.mentee_id = ?" 
                : "WHERE ms.mentor_id = ?";
            
            return $this->db->fetchAll("
                SELECT 
                    ms.*,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country
                FROM mentorship_sessions ms
                JOIN users u ON ms.{$role}_id = u.id
                {$whereClause}
                ORDER BY ms.created_at DESC
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting mentorship sessions", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'role' => $role
            ]);
            return [];
        }
    }
    
    /**
     * Add mentorship note
     */
    public function addMentorshipNote($sessionId, $userId, $note, $isPrivate = false) {
        try {
            $noteId = $this->db->insert("
                INSERT INTO mentorship_notes 
                (session_id, user_id, note, is_private, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ", [$sessionId, $userId, $note, $isPrivate]);
            
            $this->logger->info("Mentorship note added", [
                'session_id' => $sessionId,
                'user_id' => $userId,
                'note_id' => $noteId
            ]);
            
            return $noteId;
            
        } catch (Exception $e) {
            $this->logger->error("Error adding mentorship note", [
                'error' => $e->getMessage(),
                'session_id' => $sessionId,
                'user_id' => $userId
            ]);
            throw $e;
        }
    }
    
    /**
     * Rate mentorship session
     */
    public function rateMentorshipSession($sessionId, $userId, $rating, $review) {
        try {
            // Check if user is part of the session
            $session = $this->db->fetch("
                SELECT * FROM mentorship_sessions 
                WHERE id = ? AND (mentor_id = ? OR mentee_id = ?)
            ", [$sessionId, $userId, $userId]);
            
            if (!$session) {
                throw new Exception('Not authorized to rate this session');
            }
            
            // Insert rating
            $ratingId = $this->db->insert("
                INSERT INTO mentorship_ratings 
                (session_id, user_id, rating, review, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ", [$sessionId, $userId, $rating, $review]);
            
            // Update mentor's average rating
            $this->updateMentorRating($session['mentor_id']);
            
            $this->logger->info("Mentorship session rated", [
                'session_id' => $sessionId,
                'user_id' => $userId,
                'rating' => $rating,
                'rating_id' => $ratingId
            ]);
            
            return $ratingId;
            
        } catch (Exception $e) {
            $this->logger->error("Error rating mentorship session", [
                'error' => $e->getMessage(),
                'session_id' => $sessionId,
                'user_id' => $userId
            ]);
            throw $e;
        }
    }
    
    /**
     * Update mentor's average rating
     */
    private function updateMentorRating($mentorId) {
        try {
            $avgRating = $this->db->fetch("
                SELECT AVG(rating) as avg_rating 
                FROM mentorship_ratings mr
                JOIN mentorship_sessions ms ON mr.session_id = ms.id
                WHERE ms.mentor_id = ?
            ", [$mentorId])['avg_rating'];
            
            $this->db->execute("
                UPDATE mentors 
                SET average_rating = ? 
                WHERE user_id = ?
            ", [$avgRating, $mentorId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error updating mentor rating", [
                'error' => $e->getMessage(),
                'mentor_id' => $mentorId
            ]);
        }
    }
    
    /**
     * Get mentorship statistics
     */
    public function getMentorshipStats($userId, $role = 'mentee') {
        try {
            $whereClause = $role === 'mentee' 
                ? "WHERE ms.mentee_id = ?" 
                : "WHERE ms.mentor_id = ?";
            
            return $this->db->fetch("
                SELECT 
                    COUNT(ms.id) as total_sessions,
                    AVG(mr.rating) as average_rating,
                    COUNT(mr.id) as total_ratings,
                    SUM(ms.duration_minutes) as total_minutes
                FROM mentorship_sessions ms
                LEFT JOIN mentorship_ratings mr ON ms.id = mr.session_id
                {$whereClause}
            ", [$userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting mentorship stats", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'role' => $role
            ]);
            return [];
        }
    }
    
    /**
     * Get mentorship recommendations
     */
    public function getMentorshipRecommendations($userId) {
        try {
            // Get user's specialties and interests
            $userProfile = $this->db->fetch("
                SELECT specialties FROM tipster_profiles WHERE user_id = ?
            ", [$userId]);
            
            $specialties = ($userProfile && isset($userProfile['specialties'])) ? json_decode($userProfile['specialties'], true) : [];
            
            $recommendations = [];
            
            foreach ($specialties as $specialty) {
                $mentors = $this->getAvailableMentors($specialty, 5);
                $recommendations = array_merge($recommendations, $mentors);
            }
            
            // Remove duplicates
            $uniqueRecommendations = [];
            $seenIds = [];
            
            foreach ($recommendations as $mentor) {
                if (!in_array($mentor['id'], $seenIds)) {
                    $uniqueRecommendations[] = $mentor;
                    $seenIds[] = $mentor['id'];
                }
            }
            
            return array_slice($uniqueRecommendations, 0, 10);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting mentorship recommendations", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
}
?>
