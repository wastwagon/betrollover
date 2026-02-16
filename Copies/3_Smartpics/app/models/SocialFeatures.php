<?php
/**
 * SmartPicks Pro - Social Features
 * 
 * Handles social interactions: follow, like, share, comments
 */

// Include required dependencies
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Logger.php';

class SocialFeatures {
    
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
     * Follow a user
     */
    public function followUser($followerId, $followingId) {
        try {
            if ($followerId === $followingId) {
                throw new Exception('Cannot follow yourself');
            }
            
            // Check if already following
            $existing = $this->db->fetch("
                SELECT id FROM user_follows 
                WHERE follower_id = ? AND following_id = ?
            ", [$followerId, $followingId]);
            
            if ($existing) {
                throw new Exception('Already following this user');
            }
            
            // Insert follow
            $this->db->insert("
                INSERT INTO user_follows (follower_id, following_id, created_at) 
                VALUES (?, ?, NOW())
            ", [$followerId, $followingId]);
            
            // Update follower count
            $this->updateFollowerCount($followingId);
            
            $this->logger->info("User followed", [
                'follower_id' => $followerId,
                'following_id' => $followingId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error following user", [
                'error' => $e->getMessage(),
                'follower_id' => $followerId,
                'following_id' => $followingId
            ]);
            throw $e;
        }
    }
    
    /**
     * Unfollow a user
     */
    public function unfollowUser($followerId, $followingId) {
        try {
            $this->db->execute("
                DELETE FROM user_follows 
                WHERE follower_id = ? AND following_id = ?
            ", [$followerId, $followingId]);
            
            // Update follower count
            $this->updateFollowerCount($followingId);
            
            $this->logger->info("User unfollowed", [
                'follower_id' => $followerId,
                'following_id' => $followingId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error unfollowing user", [
                'error' => $e->getMessage(),
                'follower_id' => $followerId,
                'following_id' => $followingId
            ]);
            throw $e;
        }
    }
    
    /**
     * Like a pick
     */
    public function likePick($userId, $pickId) {
        try {
            // Check if already liked
            $existing = $this->db->fetch("
                SELECT id FROM pick_likes 
                WHERE user_id = ? AND pick_id = ?
            ", [$userId, $pickId]);
            
            if ($existing) {
                throw new Exception('Already liked this pick');
            }
            
            // Insert like
            $this->db->insert("
                INSERT INTO pick_likes (user_id, pick_id, created_at) 
                VALUES (?, ?, NOW())
            ", [$userId, $pickId]);
            
            // Update like count
            $this->updateLikeCount($pickId);
            
            $this->logger->info("Pick liked", [
                'user_id' => $userId,
                'pick_id' => $pickId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error liking pick", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'pick_id' => $pickId
            ]);
            throw $e;
        }
    }
    
    /**
     * Unlike a pick
     */
    public function unlikePick($userId, $pickId) {
        try {
            $this->db->execute("
                DELETE FROM pick_likes 
                WHERE user_id = ? AND pick_id = ?
            ", [$userId, $pickId]);
            
            // Update like count
            $this->updateLikeCount($pickId);
            
            $this->logger->info("Pick unliked", [
                'user_id' => $userId,
                'pick_id' => $pickId
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error unliking pick", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'pick_id' => $pickId
            ]);
            throw $e;
        }
    }
    
    /**
     * Share a pick
     */
    public function sharePick($userId, $pickId, $platform = 'internal') {
        try {
            // Insert share
            $this->db->insert("
                INSERT INTO pick_shares (user_id, pick_id, platform, created_at) 
                VALUES (?, ?, ?, NOW())
            ", [$userId, $pickId, $platform]);
            
            // Update share count
            $this->updateShareCount($pickId);
            
            $this->logger->info("Pick shared", [
                'user_id' => $userId,
                'pick_id' => $pickId,
                'platform' => $platform
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->error("Error sharing pick", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'pick_id' => $pickId
            ]);
            throw $e;
        }
    }
    
    /**
     * Comment on a pick
     */
    public function commentOnPick($userId, $pickId, $comment) {
        try {
            if (empty(trim($comment))) {
                throw new Exception('Comment cannot be empty');
            }
            
            // Insert comment
            $commentId = $this->db->insert("
                INSERT INTO pick_comments (user_id, pick_id, comment, created_at) 
                VALUES (?, ?, ?, NOW())
            ", [$userId, $pickId, $comment]);
            
            $this->logger->info("Pick commented", [
                'user_id' => $userId,
                'pick_id' => $pickId,
                'comment_id' => $commentId
            ]);
            
            return $commentId;
            
        } catch (Exception $e) {
            $this->logger->error("Error commenting on pick", [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'pick_id' => $pickId
            ]);
            throw $e;
        }
    }
    
    /**
     * Get user's followers
     */
    public function getFollowers($userId, $limit = 50) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country,
                    uf.created_at as followed_at
                FROM user_follows uf
                JOIN users u ON uf.follower_id = u.id
                WHERE uf.following_id = ?
                ORDER BY uf.created_at DESC
                LIMIT ?
            ", [$userId, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting followers", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Get user's following
     */
    public function getFollowing($userId, $limit = 50) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country,
                    uf.created_at as followed_at
                FROM user_follows uf
                JOIN users u ON uf.following_id = u.id
                WHERE uf.follower_id = ?
                ORDER BY uf.created_at DESC
                LIMIT ?
            ", [$userId, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting following", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Get pick likes
     */
    public function getPickLikes($pickId, $limit = 50) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    pl.created_at as liked_at
                FROM pick_likes pl
                JOIN users u ON pl.user_id = u.id
                WHERE pl.pick_id = ?
                ORDER BY pl.created_at DESC
                LIMIT ?
            ", [$pickId, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting pick likes", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId
            ]);
            return [];
        }
    }
    
    /**
     * Get pick comments
     */
    public function getPickComments($pickId, $limit = 50) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    pc.id,
                    pc.user_id,
                    pc.comment,
                    pc.created_at,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country
                FROM pick_comments pc
                JOIN users u ON pc.user_id = u.id
                WHERE pc.pick_id = ?
                ORDER BY pc.created_at ASC
                LIMIT ?
            ", [$pickId, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting pick comments", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId
            ]);
            return [];
        }
    }
    
    /**
     * Get user's feed
     */
    public function getUserFeed($userId, $limit = 20) {
        try {
            return $this->db->fetchAll("
                SELECT 
                    at.id,
                    at.title,
                    at.description,
                    at.total_odds,
                    at.price,
                    at.status,
                    at.views,
                    at.purchases,
                    at.created_at,
                    u.username,
                    u.display_name,
                    u.avatar,
                    u.country,
                    (SELECT COUNT(*) FROM pick_likes WHERE pick_id = at.id) as like_count,
                    (SELECT COUNT(*) FROM pick_comments WHERE pick_id = at.id) as comment_count,
                    (SELECT COUNT(*) FROM pick_shares WHERE pick_id = at.id) as share_count,
                    (SELECT COUNT(*) FROM pick_likes WHERE pick_id = at.id AND user_id = ?) as is_liked
                FROM accumulator_tickets at
                JOIN users u ON at.user_id = u.id
                WHERE at.user_id IN (
                    SELECT following_id FROM user_follows WHERE follower_id = ?
                ) OR at.user_id = ?
                ORDER BY at.created_at DESC
                LIMIT ?
            ", [$userId, $userId, $userId, $limit]);
            
        } catch (Exception $e) {
            $this->logger->error("Error getting user feed", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
            return [];
        }
    }
    
    /**
     * Update follower count
     */
    private function updateFollowerCount($userId) {
        try {
            $count = $this->db->fetch("
                SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?
            ", [$userId])['count'];
            
            $this->db->execute("
                UPDATE tipster_profiles 
                SET follower_count = ? 
                WHERE user_id = ?
            ", [$count, $userId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error updating follower count", [
                'error' => $e->getMessage(),
                'user_id' => $userId
            ]);
        }
    }
    
    /**
     * Update like count
     */
    private function updateLikeCount($pickId) {
        try {
            $count = $this->db->fetch("
                SELECT COUNT(*) as count FROM pick_likes WHERE pick_id = ?
            ", [$pickId])['count'];
            
            $this->db->execute("
                UPDATE accumulator_tickets 
                SET like_count = ? 
                WHERE id = ?
            ", [$count, $pickId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error updating like count", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId
            ]);
        }
    }
    
    /**
     * Update share count
     */
    private function updateShareCount($pickId) {
        try {
            $count = $this->db->fetch("
                SELECT COUNT(*) as count FROM pick_shares WHERE pick_id = ?
            ", [$pickId])['count'];
            
            $this->db->execute("
                UPDATE accumulator_tickets 
                SET share_count = ? 
                WHERE id = ?
            ", [$count, $pickId]);
            
        } catch (Exception $e) {
            $this->logger->error("Error updating share count", [
                'error' => $e->getMessage(),
                'pick_id' => $pickId
            ]);
        }
    }
    
    /**
     * Check if user is following another user
     */
    public function isFollowing($followerId, $followingId) {
        try {
            $result = $this->db->fetch("
                SELECT id FROM user_follows 
                WHERE follower_id = ? AND following_id = ?
            ", [$followerId, $followingId]);
            
            return $result ? true : false;
            
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Check if user has liked a pick
     */
    public function hasLiked($userId, $pickId) {
        try {
            $result = $this->db->fetch("
                SELECT id FROM pick_likes 
                WHERE user_id = ? AND pick_id = ?
            ", [$userId, $pickId]);
            
            return $result ? true : false;
            
        } catch (Exception $e) {
            return false;
        }
    }
}
?>
