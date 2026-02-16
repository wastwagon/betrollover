<?php
/**
 * SmartPicks Pro - Rankings Page
 * Display user rankings and leaderboards
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
    <title><?php echo $title; ?> - SmartPicks Pro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .rankings-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
        }
        
        .ranking-card {
            border: 1px solid #e9ecef;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .ranking-card:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .ranking-card.my-ranking {
            border: 2px solid #28a745;
            background: rgba(40, 167, 69, 0.05);
        }
        
        .ranking-card.top-3 {
            border: 2px solid #ffc107;
            background: rgba(255, 193, 7, 0.05);
        }
        
        .rank-position {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2em;
            color: white;
            margin-right: 20px;
        }
        
        .rank-1 {
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            color: #333;
        }
        
        .rank-2 {
            background: linear-gradient(135deg, #c0c0c0 0%, #e5e5e5 100%);
            color: #333;
        }
        
        .rank-3 {
            background: linear-gradient(135deg, #cd7f32 0%, #daa520 100%);
        }
        
        .rank-top {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .rank-normal {
            background: #6c757d;
        }
        
        .user-info {
            flex: 1;
        }
        
        .user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 1.2em;
            margin-right: 15px;
        }
        
        .performance-stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }
        
        .stat-label {
            font-size: 0.8em;
            color: #6c757d;
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
        
        .filter-tabs {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .filter-tab {
            background: none;
            border: none;
            padding: 12px 20px;
            margin-right: 10px;
            border-radius: 25px;
            transition: all 0.3s ease;
            color: #6c757d;
            font-weight: 500;
        }
        
        .filter-tab.active {
            background: #667eea;
            color: white;
        }
        
        .my-ranking-section {
            background: #e8f5e8;
            border: 2px solid #28a745;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .badge-rank {
            font-size: 0.9em;
            padding: 8px 12px;
            border-radius: 20px;
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
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }
        
        .empty-state i {
            font-size: 4em;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
        }
        
        .refresh-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <!-- Rankings Header -->
    <div class="rankings-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1><i class="fas fa-trophy"></i> <?php echo $title; ?></h1>
                    <p class="mb-0">Discover the top performing tipsters and track your progress</p>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-light refresh-btn" onclick="rankings.refreshRankings()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <?php if ($userId): ?>
                        <a href="/app/controllers/rankings.php?action=my_ranking" class="btn btn-light ms-2">
                            <i class="fas fa-user"></i> My Ranking
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- My Ranking Section (if logged in) -->
        <?php if ($myRanking && $myRanking['position']): ?>
            <div class="my-ranking-section">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h4><i class="fas fa-medal"></i> Your Current Position</h4>
                        <div class="d-flex align-items-center">
                            <div class="rank-position rank-<?php echo $myRanking['position'] <= 3 ? $myRanking['position'] : ($myRanking['position'] <= 10 ? 'top' : 'normal'); ?>">
                                #<?php echo $myRanking['position']; ?>
                            </div>
                            <div>
                                <h5 class="mb-1">Out of <?php echo $myRanking['total_users']; ?> users</h5>
                                <p class="mb-0">You're in the top <?php echo $myRanking['percentile']; ?>% of tipsters!</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <span class="badge badge-rank badge-top-performer">
                            <i class="fas fa-star"></i> Top Performer
                        </span>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <button class="filter-tab <?php echo $category === 'overall' ? 'active' : ''; ?>" 
                            onclick="rankings.setCategory('overall')">
                        <i class="fas fa-globe"></i> Overall
                    </button>
                    <button class="filter-tab <?php echo $category === 'monthly' ? 'active' : ''; ?>" 
                            onclick="rankings.setCategory('monthly')">
                        <i class="fas fa-calendar-alt"></i> Monthly
                    </button>
                    <button class="filter-tab <?php echo $category === 'weekly' ? 'active' : ''; ?>" 
                            onclick="rankings.setCategory('weekly')">
                        <i class="fas fa-calendar-week"></i> Weekly
                    </button>
                    <button class="filter-tab <?php echo $category === 'win_rate' ? 'active' : ''; ?>" 
                            onclick="rankings.setCategory('win_rate')">
                        <i class="fas fa-percentage"></i> Win Rate
                    </button>
                    <button class="filter-tab <?php echo $category === 'most_profitable' ? 'active' : ''; ?>" 
                            onclick="rankings.setCategory('most_profitable')">
                        <i class="fas fa-dollar-sign"></i> Most Profitable
                    </button>
                </div>
                <div class="col-md-4">
                    <div class="input-group">
                        <input type="text" class="form-control" id="search-rankings" placeholder="Search tipsters...">
                        <button class="btn btn-outline-secondary" type="button">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Rankings Container -->
        <div id="rankings-container">
            <div class="loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading rankings...</p>
            </div>
        </div>

        <!-- Load More Button -->
        <div class="text-center mt-4" id="load-more-container" style="display: none;">
            <button id="load-more-btn" class="btn btn-outline-primary">
                <i class="fas fa-plus"></i> Load More
            </button>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        class Rankings {
            constructor() {
                this.currentCategory = '<?php echo $category; ?>';
                this.currentOffset = 0;
                this.currentLimit = 50;
                this.isLoading = false;
                this.rankings = <?php echo json_encode($rankings); ?>;
                
                this.init();
            }
            
            init() {
                this.bindEvents();
                this.renderRankings();
            }
            
            bindEvents() {
                // Search
                document.getElementById('search-rankings').addEventListener('input', (e) => {
                    this.searchRankings(e.target.value);
                });
                
                // Load more
                document.getElementById('load-more-btn').addEventListener('click', () => {
                    this.loadMoreRankings();
                });
            }
            
            setCategory(category) {
                if (this.currentCategory === category) return;
                
                // Update active tab
                document.querySelectorAll('.filter-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelector(`[onclick="rankings.setCategory('${category}')"]`).classList.add('active');
                
                this.currentCategory = category;
                this.currentOffset = 0;
                this.loadRankings();
            }
            
            async loadRankings() {
                if (this.isLoading) return;
                
                this.isLoading = true;
                this.showLoading();
                
                try {
                    const params = new URLSearchParams({
                        action: 'get_rankings',
                        category: this.currentCategory,
                        limit: this.currentLimit,
                        offset: this.currentOffset
                    });
                    
                    const response = await fetch(`/app/controllers/rankings.php?${params}`);
                    const result = await response.json();
                    
                    if (result.success) {
                        this.rankings = result.rankings;
                        this.renderRankings();
                        this.currentOffset += result.rankings.length;
                        
                        // Show/hide load more button
                        if (result.rankings.length === this.currentLimit) {
                            document.getElementById('load-more-container').style.display = 'block';
                        } else {
                            document.getElementById('load-more-container').style.display = 'none';
                        }
                    } else {
                        this.showError(result.error);
                    }
                } catch (error) {
                    this.showError('Failed to load rankings');
                } finally {
                    this.isLoading = false;
                }
            }
            
            async loadMoreRankings() {
                try {
                    const params = new URLSearchParams({
                        action: 'get_rankings',
                        category: this.currentCategory,
                        limit: this.currentLimit,
                        offset: this.currentOffset
                    });
                    
                    const response = await fetch(`/app/controllers/rankings.php?${params}`);
                    const result = await response.json();
                    
                    if (result.success) {
                        this.rankings = this.rankings.concat(result.rankings);
                        this.renderRankings();
                        this.currentOffset += result.rankings.length;
                        
                        if (result.rankings.length < this.currentLimit) {
                            document.getElementById('load-more-container').style.display = 'none';
                        }
                    }
                } catch (error) {
                    this.showError('Failed to load more rankings');
                }
            }
            
            renderRankings() {
                const container = document.getElementById('rankings-container');
                
                if (this.rankings.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-trophy"></i>
                            <h4>No Rankings Available</h4>
                            <p>No tipsters found for this category. Be the first to create picks!</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = this.rankings.map(ranking => this.createRankingHtml(ranking)).join('');
            }
            
            createRankingHtml(ranking) {
                const rankClass = this.getRankClass(ranking.rank_position);
                const roiClass = this.getRoiClass(ranking.roi_percentage);
                const badges = this.generateBadges(ranking);
                
                return `
                    <div class="ranking-card ${this.isMyRanking(ranking) ? 'my-ranking' : ''} ${ranking.rank_position <= 3 ? 'top-3' : ''}">
                        <div class="d-flex align-items-center">
                            <div class="rank-position ${rankClass}">
                                #${ranking.rank_position}
                            </div>
                            
                            <div class="user-avatar">
                                ${ranking.display_name.charAt(0).toUpperCase()}
                            </div>
                            
                            <div class="user-info">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 class="mb-1">${ranking.display_name}</h5>
                                        <div class="badges mb-2">
                                            ${badges}
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="performance-stats">
                                    <div class="stat-item">
                                        <div class="stat-value ${roiClass}">${ranking.roi_percentage}%</div>
                                        <div class="stat-label">ROI</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${ranking.win_rate_percentage}%</div>
                                        <div class="stat-label">Win Rate</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${ranking.total_picks_created}</div>
                                        <div class="stat-label">Total Picks</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${parseFloat(ranking.total_amount_earned || 0).toFixed(2)}</div>
                                        <div class="stat-label">Earnings (GHS)</div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-value">${parseFloat(ranking.average_odds || 0).toFixed(2)}</div>
                                        <div class="stat-label">Avg Odds</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            getRankClass(position) {
                if (position === 1) return 'rank-1';
                if (position === 2) return 'rank-2';
                if (position === 3) return 'rank-3';
                if (position <= 10) return 'rank-top';
                return 'rank-normal';
            }
            
            getRoiClass(roi) {
                if (roi > 0) return 'roi-positive';
                if (roi < 0) return 'roi-negative';
                return 'roi-neutral';
            }
            
            generateBadges(ranking) {
                const badges = [];
                
                if (ranking.rank_position <= 3) {
                    badges.push('<span class="badge badge-rank badge-top-performer"><i class="fas fa-crown"></i> Top 3</span>');
                } else if (ranking.rank_position <= 10) {
                    badges.push('<span class="badge badge-rank badge-top-performer"><i class="fas fa-star"></i> Top 10</span>');
                }
                
                if (ranking.win_rate_percentage >= 70) {
                    badges.push('<span class="badge badge-rank badge-consistent"><i class="fas fa-target"></i> High Accuracy</span>');
                }
                
                if (ranking.roi_percentage >= 50) {
                    badges.push('<span class="badge badge-rank badge-rising-star"><i class="fas fa-chart-line"></i> High ROI</span>');
                }
                
                if (ranking.total_picks_created >= 50) {
                    badges.push('<span class="badge badge-rank badge-consistent"><i class="fas fa-layer-group"></i> Experienced</span>');
                }
                
                return badges.join(' ');
            }
            
            isMyRanking(ranking) {
                return ranking.user_id == <?php echo $userId ?: 'null'; ?>;
            }
            
            searchRankings(query) {
                const cards = document.querySelectorAll('.ranking-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    if (text.includes(query.toLowerCase())) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
            
            async refreshRankings() {
                this.currentOffset = 0;
                await this.loadRankings();
                this.showSuccess('Rankings refreshed successfully!');
            }
            
            showLoading() {
                const container = document.getElementById('rankings-container');
                container.innerHTML = `
                    <div class="loading">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading rankings...</p>
                    </div>
                `;
            }
            
            showError(message) {
                // Remove existing alerts
                document.querySelectorAll('.alert').forEach(alert => alert.remove());
                
                const alert = document.createElement('div');
                alert.className = 'alert alert-danger alert-dismissible fade show';
                alert.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                document.querySelector('.container').insertBefore(alert, document.querySelector('.container').firstChild);
            }
            
            showSuccess(message) {
                // Remove existing alerts
                document.querySelectorAll('.alert').forEach(alert => alert.remove());
                
                const alert = document.createElement('div');
                alert.className = 'alert alert-success alert-dismissible fade show';
                alert.innerHTML = `
                    <i class="fas fa-check-circle"></i> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                document.querySelector('.container').insertBefore(alert, document.querySelector('.container').firstChild);
            }
        }
        
        // Initialize rankings
        const rankings = new Rankings();
    </script>
</body>
</html>

