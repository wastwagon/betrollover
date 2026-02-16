<?php
/**
 * SmartPicks Pro - My Ranking Page
 * Display user's personal ranking and performance
 */

// Get user data
$user = $_SESSION['user'] ?? null;
$userId = $_SESSION['user_id'] ?? null;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Ranking - SmartPicks Pro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .profile-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
        }
        
        .profile-card {
            border: 1px solid #e9ecef;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .user-avatar-large {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 2em;
            margin-right: 20px;
        }
        
        .ranking-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 5px;
        }
        
        .badge-top-performer {
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            color: #333;
        }
        
        .badge-rising-star {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
        }
        
        .badge-consistent {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .badge-improving {
            background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%);
            color: white;
        }
        
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .performance-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .performance-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .performance-value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .performance-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
        }
        
        .roi-positive {
            color: #28a745;
        }
        
        .roi-negative {
            color: #dc3545;
        }
        
        .roi-neutral {
            color: #6c757d;
        }
        
        .ranking-position {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
        }
        
        .ranking-category {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 10px;
        }
        
        .ranking-category-name {
            font-weight: bold;
            color: #333;
        }
        
        .ranking-category-position {
            font-size: 1.2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .recent-accumulator {
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            transition: all 0.3s ease;
        }
        
        .recent-accumulator:hover {
            background: #f8f9fa;
        }
        
        .accumulator-status {
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-won {
            background: #d4edda;
            color: #155724;
        }
        
        .status-lost {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .progress-ring {
            width: 120px;
            height: 120px;
            margin: 0 auto;
        }
        
        .progress-ring-circle {
            fill: transparent;
            stroke: #667eea;
            stroke-width: 8;
            stroke-linecap: round;
            transform: rotate(-90deg);
            transform-origin: 50% 50%;
            transition: stroke-dasharray 0.5s ease;
        }
        
        .progress-ring-text {
            text-anchor: middle;
            dominant-baseline: middle;
            font-size: 1.5em;
            font-weight: bold;
            fill: #333;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
        }
        
        .stat-label {
            font-size: 0.8em;
            color: #6c757d;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <!-- Profile Header -->
    <div class="profile-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center">
                        <div class="user-avatar-large">
                            <?php echo strtoupper(substr($user['username'] ?? 'User', 0, 1)); ?>
                        </div>
                        <div>
                            <h1><?php echo htmlspecialchars($user['username'] ?? 'User'); ?></h1>
                            <p class="mb-0">Your tipster performance and rankings</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 text-end">
                    <a href="/app/controllers/rankings.php" class="btn btn-light">
                        <i class="fas fa-trophy"></i> View All Rankings
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Performance Overview -->
        <div class="performance-grid">
            <div class="performance-card">
                <div class="performance-value roi-<?php echo $performance['roi_percentage'] > 0 ? 'positive' : ($performance['roi_percentage'] < 0 ? 'negative' : 'neutral'); ?>">
                    <?php echo number_format($performance['roi_percentage'] ?? 0, 1); ?>%
                </div>
                <div class="performance-label">ROI</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-value">
                    <?php echo number_format($performance['win_rate_percentage'] ?? 0, 1); ?>%
                </div>
                <div class="performance-label">Win Rate</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-value">
                    <?php echo $performance['total_picks_created'] ?? 0; ?>
                </div>
                <div class="performance-label">Total Picks</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-value">
                    GHS <?php echo number_format($performance['total_amount_earned'] ?? 0, 2); ?>
                </div>
                <div class="performance-label">Total Earnings</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-value">
                    <?php echo number_format($performance['average_odds'] ?? 0, 2); ?>
                </div>
                <div class="performance-label">Average Odds</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-value">
                    <?php echo $performance['total_accumulators_created'] ?? 0; ?>
                </div>
                <div class="performance-label">Accumulators</div>
            </div>
        </div>

        <div class="row">
            <!-- Rankings by Category -->
            <div class="col-md-6">
                <div class="profile-card">
                    <h4><i class="fas fa-trophy"></i> Your Rankings</h4>
                    
                    <?php foreach ($rankings as $category => $ranking): ?>
                        <div class="ranking-category">
                            <div class="ranking-category-name">
                                <?php 
                                $categoryNames = [
                                    'overall' => 'Overall Ranking',
                                    'monthly' => 'Monthly Ranking',
                                    'weekly' => 'Weekly Ranking',
                                    'win_rate' => 'Win Rate Ranking',
                                    'most_profitable' => 'Profitability Ranking'
                                ];
                                echo $categoryNames[$category] ?? ucfirst($category);
                                ?>
                            </div>
                            <div class="ranking-category-position">
                                #<?php echo $ranking['position'] ?? 'N/A'; ?>
                                <?php if ($ranking['total_users'] ?? 0): ?>
                                    <small class="text-muted">/ <?php echo $ranking['total_users']; ?></small>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                    
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="updateMyRankings()">
                            <i class="fas fa-sync-alt"></i> Update Rankings
                        </button>
                    </div>
                </div>
            </div>

            <!-- Recent Performance -->
            <div class="col-md-6">
                <div class="profile-card">
                    <h4><i class="fas fa-chart-line"></i> Recent Performance</h4>
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value"><?php echo $stats['total_created'] ?? 0; ?></div>
                            <div class="stat-label">Created</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value"><?php echo $stats['total_won'] ?? 0; ?></div>
                            <div class="stat-label">Won</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value"><?php echo $stats['total_lost'] ?? 0; ?></div>
                            <div class="stat-label">Lost</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value"><?php echo $stats['total_pending'] ?? 0; ?></div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                    
                    <?php if ($stats['total_created'] ?? 0): ?>
                        <div class="progress-ring">
                            <svg width="120" height="120">
                                <circle class="progress-ring-circle" cx="60" cy="60" r="50"
                                        stroke-dasharray="<?php echo 2 * M_PI * 50 * ($stats['total_won'] / $stats['total_created']); ?> 314"></circle>
                                <text class="progress-ring-text" x="60" y="60">
                                    <?php echo round(($stats['total_won'] / $stats['total_created']) * 100); ?>%
                                </text>
                            </svg>
                        </div>
                        <p class="text-center text-muted">Win Rate Visualization</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Recent Accumulators -->
        <div class="profile-card">
            <h4><i class="fas fa-history"></i> Recent Accumulators</h4>
            
            <?php if (empty($recentAccumulators)): ?>
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>No accumulators yet</h5>
                    <p class="text-muted">Start creating picks to see your performance here!</p>
                    <a href="/app/controllers/accumulator.php" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create Your First Accumulator
                    </a>
                </div>
            <?php else: ?>
                <div class="row">
                    <?php foreach ($recentAccumulators as $accumulator): ?>
                        <div class="col-md-6 mb-3">
                            <div class="recent-accumulator">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <h6 class="mb-0"><?php echo htmlspecialchars($accumulator['title']); ?></h6>
                                    <span class="accumulator-status status-<?php echo $accumulator['status']; ?>">
                                        <?php echo ucfirst($accumulator['status']); ?>
                                    </span>
                                </div>
                                
                                <div class="row text-center">
                                    <div class="col-4">
                                        <div class="stat-value"><?php echo $accumulator['total_picks']; ?></div>
                                        <div class="stat-label">Picks</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="stat-value"><?php echo number_format($accumulator['combined_odds'] ?? 0, 2); ?></div>
                                        <div class="stat-label">Combined Odds</div>
                                    </div>
                                    <div class="col-4">
                                        <div class="stat-value">GHS <?php echo number_format($accumulator['amount'] ?? 0, 2); ?></div>
                                        <div class="stat-label">Amount</div>
                                    </div>
                                </div>
                                
                                <div class="mt-2">
                                    <small class="text-muted">
                                        Created: <?php echo date('M j, Y', strtotime($accumulator['created_at'])); ?>
                                    </small>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <div class="text-center mt-3">
                    <a href="/app/controllers/accumulator.php" class="btn btn-outline-primary">
                        <i class="fas fa-plus"></i> Create New Accumulator
                    </a>
                </div>
            <?php endif; ?>
        </div>

        <!-- Performance Badges -->
        <div class="profile-card">
            <h4><i class="fas fa-medal"></i> Your Achievements</h4>
            
            <div id="achievements-container">
                <!-- Achievements will be loaded here -->
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        class MyRankings {
            constructor() {
                this.init();
            }
            
            init() {
                this.loadAchievements();
            }
            
            async loadAchievements() {
                try {
                    // Generate achievements based on performance
                    const achievements = this.generateAchievements();
                    this.renderAchievements(achievements);
                } catch (error) {
                    console.error('Failed to load achievements:', error);
                }
            }
            
            generateAchievements() {
                const achievements = [];
                const performance = <?php echo json_encode($performance); ?>;
                const stats = <?php echo json_encode($stats); ?>;
                
                // ROI achievements
                if (performance.roi_percentage >= 100) {
                    achievements.push({
                        icon: 'fas fa-rocket',
                        title: 'High Flyer',
                        description: 'Achieved 100%+ ROI',
                        badge: 'badge-top-performer'
                    });
                } else if (performance.roi_percentage >= 50) {
                    achievements.push({
                        icon: 'fas fa-chart-line',
                        title: 'Rising Star',
                        description: 'Achieved 50%+ ROI',
                        badge: 'badge-rising-star'
                    });
                }
                
                // Win rate achievements
                if (performance.win_rate_percentage >= 80) {
                    achievements.push({
                        icon: 'fas fa-bullseye',
                        title: 'Sharpshooter',
                        description: '80%+ Win Rate',
                        badge: 'badge-consistent'
                    });
                } else if (performance.win_rate_percentage >= 70) {
                    achievements.push({
                        icon: 'fas fa-target',
                        title: 'Accurate',
                        description: '70%+ Win Rate',
                        badge: 'badge-consistent'
                    });
                }
                
                // Volume achievements
                if (stats.total_created >= 100) {
                    achievements.push({
                        icon: 'fas fa-layer-group',
                        title: 'Veteran',
                        description: 'Created 100+ Picks',
                        badge: 'badge-consistent'
                    });
                } else if (stats.total_created >= 50) {
                    achievements.push({
                        icon: 'fas fa-layer-group',
                        title: 'Experienced',
                        description: 'Created 50+ Picks',
                        badge: 'badge-improving'
                    });
                }
                
                // Consistency achievements
                if (stats.total_won >= 10 && performance.win_rate_percentage >= 60) {
                    achievements.push({
                        icon: 'fas fa-medal',
                        title: 'Consistent',
                        description: '10+ Wins with 60%+ Rate',
                        badge: 'badge-consistent'
                    });
                }
                
                return achievements;
            }
            
            renderAchievements(achievements) {
                const container = document.getElementById('achievements-container');
                
                if (achievements.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-trophy fa-3x text-muted mb-3"></i>
                            <h5>No achievements yet</h5>
                            <p class="text-muted">Keep creating successful picks to earn achievements!</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = achievements.map(achievement => `
                    <div class="d-flex align-items-center p-3 border rounded mb-3">
                        <div class="ranking-badge ${achievement.badge} me-3">
                            <i class="${achievement.icon}"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">${achievement.title}</h6>
                            <p class="mb-0 text-muted">${achievement.description}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Initialize
        const myRankings = new MyRankings();
        
        // Update rankings function
        async function updateMyRankings() {
            try {
                const response = await fetch('/app/controllers/rankings.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=update_rankings&category=overall'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    location.reload();
                } else {
                    alert('Failed to update rankings: ' + result.error);
                }
            } catch (error) {
                alert('Failed to update rankings');
            }
        }
    </script>
</body>
</html>
