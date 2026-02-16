<?php
/**
 * SmartPicks Pro - Social API
 * 
 * Handles social interactions: follow, like, share, comment
 */

require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../models/SocialFeatures.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Set JSON header
header('Content-Type: application/json');

// Check authentication
try {
    AuthMiddleware::checkAuth();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

$db = Database::getInstance();
$logger = Logger::getInstance();
$social = SocialFeatures::getInstance();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'follow_user':
            handleFollowUser();
            break;
        case 'unfollow_user':
            handleUnfollowUser();
            break;
        case 'like_pick':
            handleLikePick();
            break;
        case 'unlike_pick':
            handleUnlikePick();
            break;
        case 'share_pick':
            handleSharePick();
            break;
        case 'comment_pick':
            handleCommentPick();
            break;
        case 'get_followers':
            handleGetFollowers();
            break;
        case 'get_following':
            handleGetFollowing();
            break;
        case 'get_pick_likes':
            handleGetPickLikes();
            break;
        case 'get_pick_comments':
            handleGetPickComments();
            break;
        case 'get_user_feed':
            handleGetUserFeed();
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} catch (Exception $e) {
    $logger->error("Social API error", ['error' => $e->getMessage()]);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function handleFollowUser() {
    global $social;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $followingId = $input['following_id'] ?? 0;
    
    if (!$followingId) {
        echo json_encode(['success' => false, 'error' => 'Following ID required']);
        return;
    }
    
    $social->followUser($_SESSION['user_id'], $followingId);
    echo json_encode(['success' => true]);
}

function handleUnfollowUser() {
    global $social;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $followingId = $input['following_id'] ?? 0;
    
    if (!$followingId) {
        echo json_encode(['success' => false, 'error' => 'Following ID required']);
        return;
    }
    
    $social->unfollowUser($_SESSION['user_id'], $followingId);
    echo json_encode(['success' => true]);
}

function handleLikePick() {
    global $social;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $pickId = $input['pick_id'] ?? 0;
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    $social->likePick($_SESSION['user_id'], $pickId);
    echo json_encode(['success' => true]);
}

function handleUnlikePick() {
    global $social;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $pickId = $input['pick_id'] ?? 0;
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    $social->unlikePick($_SESSION['user_id'], $pickId);
    echo json_encode(['success' => true]);
}

function handleSharePick() {
    global $social;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $pickId = $input['pick_id'] ?? 0;
    $platform = $input['platform'] ?? 'internal';
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    $social->sharePick($_SESSION['user_id'], $pickId, $platform);
    echo json_encode(['success' => true]);
}

function handleCommentPick() {
    global $social;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $pickId = $input['pick_id'] ?? 0;
    $comment = $input['comment'] ?? '';
    
    if (!$pickId || empty(trim($comment))) {
        echo json_encode(['success' => false, 'error' => 'Pick ID and comment required']);
        return;
    }
    
    $commentId = $social->commentOnPick($_SESSION['user_id'], $pickId, $comment);
    echo json_encode(['success' => true, 'comment_id' => $commentId]);
}

function handleGetFollowers() {
    global $social;
    
    $userId = $_GET['user_id'] ?? $_SESSION['user_id'];
    $limit = $_GET['limit'] ?? 50;
    
    $followers = $social->getFollowers($userId, $limit);
    echo json_encode(['success' => true, 'followers' => $followers]);
}

function handleGetFollowing() {
    global $social;
    
    $userId = $_GET['user_id'] ?? $_SESSION['user_id'];
    $limit = $_GET['limit'] ?? 50;
    
    $following = $social->getFollowing($userId, $limit);
    echo json_encode(['success' => true, 'following' => $following]);
}

function handleGetPickLikes() {
    global $social;
    
    $pickId = $_GET['pick_id'] ?? 0;
    $limit = $_GET['limit'] ?? 50;
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    $likes = $social->getPickLikes($pickId, $limit);
    echo json_encode(['success' => true, 'likes' => $likes]);
}

function handleGetPickComments() {
    global $social;
    
    $pickId = $_GET['pick_id'] ?? 0;
    $limit = $_GET['limit'] ?? 50;
    
    if (!$pickId) {
        echo json_encode(['success' => false, 'error' => 'Pick ID required']);
        return;
    }
    
    $comments = $social->getPickComments($pickId, $limit);
    echo json_encode(['success' => true, 'comments' => $comments]);
}

function handleGetUserFeed() {
    global $social;
    
    $limit = $_GET['limit'] ?? 20;
    
    $feed = $social->getUserFeed($_SESSION['user_id'], $limit);
    echo json_encode(['success' => true, 'feed' => $feed]);
}
?>
