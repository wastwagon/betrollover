<?php
/**
 * SmartPicks Pro - Resource Center
 * Educational content for learning betting strategies
 */

// Session is already started in index.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/Logger.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

// Check authentication
AuthMiddleware::checkAuth();

$db = Database::getInstance();
$logger = Logger::getInstance();

$pageTitle = 'Resource Center - SmartPicks Pro';
$header = [
    'title' => 'Resource Center',
    'subtitle' => 'Learn Football Analysis & Betting Strategies'
];

$navigation = [
    ['label' => 'Dashboard', 'url' => '/dashboard', 'icon' => 'fas fa-tachometer-alt'],
    ['label' => 'My Picks', 'url' => '/pick-management', 'icon' => 'fas fa-chart-line'],
    ['label' => 'Marketplace', 'url' => '/pick-marketplace', 'icon' => 'fas fa-store'],
    ['label' => 'Resource Center', 'url' => '/resource-center', 'icon' => 'fas fa-book', 'active' => true],
    ['label' => 'Wallet', 'url' => '/wallet', 'icon' => 'fas fa-wallet'],
    ['label' => 'Profile', 'url' => '/profile', 'icon' => 'fas fa-user']
];

// Render the view
ob_start();
?>

<div class="grid grid-2">
    <!-- Quick Learning Stats -->
    <div class="card">
        <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-bar"></i> Your Learning Progress</h3>
        </div>
        <div class="grid grid-4">
            <div class="text-center">
                <h4 class="text-primary"><?= rand(5, 15) ?></h4>
                <small class="text-muted">Articles Read</small>
            </div>
            <div class="text-center">
                <h4 class="text-success"><?= rand(2, 8) ?></h4>
                <small class="text-muted">Strategies Learned</small>
            </div>
            <div class="text-center">
                <h4 class="text-info"><?= rand(10, 25) ?></h4>
                <small class="text-muted">Quiz Points</small>
            </div>
            <div class="text-center">
                <h4 class="text-warning"><?= rand(1, 5) ?></h4>
                <small class="text-muted">Certificates</small>
            </div>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="card">
        <div class="card-header">
            <h3 class="card-title"><i class="fas fa-bolt"></i> Quick Learning</h3>
        </div>
        <div class="grid grid-2">
            <button class="btn btn-primary" onclick="showLearningModal('beginner')">
                <i class="fas fa-play"></i> Start Learning
            </button>
            <button class="btn btn-info" onclick="showLearningModal('quiz')">
                <i class="fas fa-question-circle"></i> Take Quiz
            </button>
        </div>
        <div class="mt-3">
            <p class="text-muted">
                <i class="fas fa-info-circle"></i> 
                Educational content updated daily
            </p>
        </div>
    </div>
</div>

<!-- Learning Categories -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title"><i class="fas fa-graduation-cap"></i> Learning Categories</h3>
    </div>
    <div class="grid grid-3">
        <!-- Beginner Level -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="text-center">
                <div class="mb-3">
                    <i class="fas fa-seedling fa-3x text-success"></i>
                </div>
                <h4 class="text-success">Beginner Level</h4>
                <p class="text-muted">Start your learning journey</p>
                <div class="mb-3">
                    <small class="text-muted">5 Articles • 2 Videos • 1 Quiz</small>
                </div>
                <button class="btn btn-success" onclick="showLearningModal('beginner')">
                    <i class="fas fa-play"></i> Start Learning
                </button>
            </div>
        </div>

        <!-- Intermediate Level -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="text-center">
                <div class="mb-3">
                    <i class="fas fa-chart-line fa-3x text-warning"></i>
                </div>
                <h4 class="text-warning">Intermediate Level</h4>
                <p class="text-muted">Build on your knowledge</p>
                <div class="mb-3">
                    <small class="text-muted">8 Articles • 4 Videos • 2 Quizzes</small>
                </div>
                <button class="btn btn-warning" onclick="showLearningModal('intermediate')">
                    <i class="fas fa-play"></i> Continue Learning
                </button>
            </div>
        </div>

        <!-- Advanced Level -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="text-center">
                <div class="mb-3">
                    <i class="fas fa-trophy fa-3x text-danger"></i>
                </div>
                <h4 class="text-danger">Advanced Level</h4>
                <p class="text-muted">Master the strategies</p>
                <div class="mb-3">
                    <small class="text-muted">12 Articles • 6 Videos • 3 Quizzes</small>
                </div>
                <button class="btn btn-danger" onclick="showLearningModal('advanced')">
                    <i class="fas fa-play"></i> Master Level
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Featured Learning Content -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title"><i class="fas fa-star"></i> Featured Learning Content</h3>
    </div>
    <div class="grid grid-2">
        <!-- Article 1 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-file-alt text-primary"></i> Understanding Football Statistics</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Learn how to read and interpret football statistics for better analysis...</p>
            </div>
            <div class="grid grid-3">
                <div class="text-center">
                    <small class="text-muted">📖 Article</small>
                </div>
                <div class="text-center">
                    <small class="text-muted">⏱️ 10 min read</small>
                </div>
                <div class="text-center">
                    <small class="text-success">✅ Beginner</small>
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-primary">
                    <i class="fas fa-book-open"></i> Read Article
                </button>
            </div>
        </div>

        <!-- Article 2 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-chart-bar text-success"></i> Value Betting Concepts</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Discover the fundamentals of value betting and how to identify opportunities...</p>
            </div>
            <div class="grid grid-3">
                <div class="text-center">
                    <small class="text-muted">📖 Article</small>
                </div>
                <div class="text-center">
                    <small class="text-muted">⏱️ 15 min read</small>
                </div>
                <div class="text-center">
                    <small class="text-warning">✅ Intermediate</small>
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-success">
                    <i class="fas fa-book-open"></i> Read Article
                </button>
            </div>
        </div>

        <!-- Video 1 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-play-circle text-danger"></i> Bankroll Management</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Learn proper bankroll management techniques for responsible betting...</p>
            </div>
            <div class="grid grid-3">
                <div class="text-center">
                    <small class="text-muted">🎥 Video</small>
                </div>
                <div class="text-center">
                    <small class="text-muted">⏱️ 12 min</small>
                </div>
                <div class="text-center">
                    <small class="text-success">✅ Beginner</small>
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-danger">
                    <i class="fas fa-play"></i> Watch Video
                </button>
            </div>
        </div>

        <!-- Quiz 1 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-question-circle text-info"></i> Football Analysis Quiz</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Test your knowledge of football analysis and statistics...</p>
            </div>
            <div class="grid grid-3">
                <div class="text-center">
                    <small class="text-muted">❓ Quiz</small>
                </div>
                <div class="text-center">
                    <small class="text-muted">⏱️ 5 min</small>
                </div>
                <div class="text-center">
                    <small class="text-warning">✅ Intermediate</small>
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-info">
                    <i class="fas fa-play"></i> Take Quiz
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Learning Strategies -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title"><i class="fas fa-lightbulb"></i> Popular Learning Strategies</h3>
    </div>
    <div class="grid grid-2">
        <!-- Strategy 1 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-chart-line text-primary"></i> Statistical Analysis</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Learn how to analyze team performance, player statistics, and historical data to make informed predictions.</p>
            </div>
            <div class="mb-2">
                <div class="progress" style="height: 8px; border-radius: 4px;">
                    <div class="progress-bar bg-primary" style="width: 75%"></div>
                </div>
                <small class="text-muted">75% Complete</small>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-primary">
                    <i class="fas fa-play"></i> Continue Learning
                </button>
            </div>
        </div>

        <!-- Strategy 2 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-balance-scale text-success"></i> Value Betting</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Master the art of identifying value in betting markets and understanding odds movements.</p>
            </div>
            <div class="mb-2">
                <div class="progress" style="height: 8px; border-radius: 4px;">
                    <div class="progress-bar bg-success" style="width: 45%"></div>
                </div>
                <small class="text-muted">45% Complete</small>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-success">
                    <i class="fas fa-play"></i> Continue Learning
                </button>
            </div>
        </div>

        <!-- Strategy 3 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-shield-alt text-warning"></i> Risk Management</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Learn essential risk management techniques to protect your bankroll and bet responsibly.</p>
            </div>
            <div class="mb-2">
                <div class="progress" style="height: 8px; border-radius: 4px;">
                    <div class="progress-bar bg-warning" style="width: 30%"></div>
                </div>
                <small class="text-muted">30% Complete</small>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-warning">
                    <i class="fas fa-play"></i> Start Learning
                </button>
            </div>
        </div>

        <!-- Strategy 4 -->
        <div class="card" style="margin-bottom: 15px;">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-brain text-info"></i> Psychology of Betting</h5>
            </div>
            <div class="mb-2">
                <p class="text-muted">Understand the psychological aspects of betting and how to maintain discipline and emotional control.</p>
            </div>
            <div class="mb-2">
                <div class="progress" style="height: 8px; border-radius: 4px;">
                    <div class="progress-bar bg-info" style="width: 20%"></div>
                </div>
                <small class="text-muted">20% Complete</small>
            </div>
            <div class="mt-3">
                <button class="btn btn-sm btn-info">
                    <i class="fas fa-play"></i> Start Learning
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Learning Modal -->
<div id="learningModal" class="modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="modalTitle">Learning Content</h3>
            <span class="close" onclick="hideLearningModal()">&times;</span>
        </div>
        <div id="modalContent">
            <!-- Content will be loaded here -->
        </div>
    </div>
</div>

<style>
.progress {
    background-color: #e9ecef;
    border-radius: 4px;
}

.progress-bar {
    background-color: #007bff;
    border-radius: 4px;
    transition: width 0.6s ease;
}

.modal {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 0;
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 20px;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
}

.close {
    font-size: 24px;
    cursor: pointer;
    opacity: 0.8;
}

.close:hover {
    opacity: 1;
}
</style>

<script>
function showLearningModal(level) {
    const modal = document.getElementById('learningModal');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');
    
    let modalData = {};
    
    switch(level) {
        case 'beginner':
            modalData = {
                title: 'Beginner Learning Path',
                content: `
                    <div style="padding: 20px;">
                        <h4>🎓 Welcome to Beginner Level!</h4>
                        <p>Start your educational journey with these fundamental concepts:</p>
                        <ul>
                            <li>Understanding Football Statistics</li>
                            <li>Basic Betting Markets</li>
                            <li>Introduction to Odds</li>
                            <li>Bankroll Management Basics</li>
                            <li>Responsible Betting Practices</li>
                        </ul>
                        <div class="text-center mt-4">
                            <button class="btn btn-primary" onclick="startLearning('beginner')">
                                <i class="fas fa-play"></i> Start Learning
                            </button>
                        </div>
                    </div>
                `
            };
            break;
        case 'intermediate':
            modalData = {
                title: 'Intermediate Learning Path',
                content: `
                    <div style="padding: 20px;">
                        <h4>📈 Intermediate Level Content</h4>
                        <p>Build on your knowledge with these advanced topics:</p>
                        <ul>
                            <li>Advanced Statistical Analysis</li>
                            <li>Value Betting Strategies</li>
                            <li>Market Analysis Techniques</li>
                            <li>Risk Assessment Methods</li>
                            <li>Portfolio Management</li>
                        </ul>
                        <div class="text-center mt-4">
                            <button class="btn btn-warning" onclick="startLearning('intermediate')">
                                <i class="fas fa-play"></i> Continue Learning
                            </button>
                        </div>
                    </div>
                `
            };
            break;
        case 'advanced':
            modalData = {
                title: 'Advanced Learning Path',
                content: `
                    <div style="padding: 20px;">
                        <h4>🏆 Advanced Level Content</h4>
                        <p>Master these expert-level strategies:</p>
                        <ul>
                            <li>Professional Analysis Methods</li>
                            <li>Advanced Value Betting</li>
                            <li>Market Psychology</li>
                            <li>Risk Management Mastery</li>
                            <li>Portfolio Optimization</li>
                        </ul>
                        <div class="text-center mt-4">
                            <button class="btn btn-danger" onclick="startLearning('advanced')">
                                <i class="fas fa-play"></i> Master Level
                            </button>
                        </div>
                    </div>
                `
            };
            break;
        case 'quiz':
            modalData = {
                title: 'Knowledge Assessment',
                content: `
                    <div style="padding: 20px;">
                        <h4>❓ Test Your Knowledge</h4>
                        <p>Take a quiz to assess your understanding:</p>
                        <div class="grid grid-2">
                            <button class="btn btn-info" onclick="startQuiz('beginner')">
                                <i class="fas fa-question-circle"></i> Beginner Quiz
                            </button>
                            <button class="btn btn-warning" onclick="startQuiz('intermediate')">
                                <i class="fas fa-question-circle"></i> Intermediate Quiz
                            </button>
                        </div>
                    </div>
                `
            };
            break;
    }
    
    title.textContent = modalData.title;
    content.innerHTML = modalData.content;
    modal.style.display = 'flex';
}

function hideLearningModal() {
    document.getElementById('learningModal').style.display = 'none';
}

function startLearning(level) {
    alert(`Starting ${level} level learning content...`);
    hideLearningModal();
}

function startQuiz(level) {
    alert(`Starting ${level} level quiz...`);
    hideLearningModal();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('learningModal');
    if (event.target === modal) {
        hideLearningModal();
    }
}
</script>

<?php
$content = ob_get_clean();

// Include the base layout
require_once __DIR__ . '/../views/layouts/base.php';
?>
