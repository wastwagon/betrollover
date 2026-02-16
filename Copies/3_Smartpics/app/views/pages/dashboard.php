<div class="dashboard-stats mb-4">
    <div class="grid grid-4">
        <div class="card text-center">
            <div class="card-body">
                <h3 class="text-primary"><?= $stats['total_picks'] ?? 0 ?></h3>
                <p class="text-muted">My Picks</p>
            </div>
        </div>
        
        <div class="card text-center">
            <div class="card-body">
                <h3 class="text-success"><?= ViewHelper::currency($stats['total_earnings'] ?? 0) ?></h3>
                <p class="text-muted">Earnings</p>
            </div>
        </div>
        
        <div class="card text-center">
            <div class="card-body">
                <h3 class="text-info"><?= $stats['success_rate'] ?? 0 ?>%</h3>
                <p class="text-muted">Success Rate</p>
            </div>
        </div>
        
        <div class="card text-center">
            <div class="card-body">
                <h3 class="text-warning"><?= $stats['pending_picks'] ?? 0 ?></h3>
                <p class="text-muted">Pending</p>
            </div>
        </div>
    </div>
</div>

<div class="grid grid-2">
    <div class="card">
        <div class="card-header">
            <h3 class="card-title">Recent Picks</h3>
        </div>
        <div class="card-body">
            <?php if (!empty($recentPicks)): ?>
                <?php foreach ($recentPicks as $pick): ?>
                    <div class="pick-item mb-3 p-3" style="border: 1px solid #eee; border-radius: 5px;">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="mb-1"><?= ViewHelper::e($pick['title']) ?></h5>
                                <p class="text-muted mb-1"><?= ViewHelper::e($pick['description']) ?></p>
                                <small class="text-muted"><?= ViewHelper::datetime($pick['created_at']) ?></small>
                            </div>
                            <div class="text-right">
                                <?= ViewHelper::statusBadge($pick['status']) ?>
                                <br>
                                <span class="text-success font-weight-bold"><?= ViewHelper::odds($pick['odds']) ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <p class="text-muted">No recent picks found.</p>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="card">
        <div class="card-header">
            <h3 class="card-title">Quick Actions</h3>
        </div>
        <div class="card-body">
            <div class="d-grid gap-2">
                <a href="/pick_management.php" class="btn btn-success">🎯 Create New Pick</a>
                <a href="/pick_marketplace.php" class="btn btn-primary">🛒 Browse Marketplace</a>
                <a href="/profile" class="btn btn-info">👤 Update Profile</a>
                <?php if ($_SESSION['role'] === 'admin'): ?>
                    <a href="/admin_users.php" class="btn btn-warning">👥 Manage Users</a>
                    <a href="/admin_settings.php" class="btn btn-secondary">⚙️ System Settings</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<?php if (!empty($liveMatches)): ?>
<div class="card mt-4">
    <div class="card-header">
        <h3 class="card-title">⚽ Live Matches</h3>
    </div>
    <div class="card-body">
        <div class="grid grid-3">
            <?php foreach ($liveMatches as $match): ?>
                <div class="match-card p-3" style="border: 1px solid #eee; border-radius: 5px; text-align: center;">
                    <h6><?= ViewHelper::e($match['home_team']) ?> vs <?= ViewHelper::e($match['away_team']) ?></h6>
                    <p class="text-muted"><?= ViewHelper::e($match['league']) ?></p>
                    <div class="score">
                        <span class="text-primary font-weight-bold"><?= $match['home_score'] ?> - <?= $match['away_score'] ?></span>
                    </div>
                    <small class="text-success">LIVE</small>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>
<?php endif; ?>

<style>
.d-grid {
    display: grid;
}

.gap-2 {
    gap: 10px;
}

.d-flex {
    display: flex;
}

.justify-content-between {
    justify-content: space-between;
}

.align-items-start {
    align-items: flex-start;
}

.font-weight-bold {
    font-weight: bold;
}
</style>
