<!-- Search and Filters -->
<div class="card mb-4">
    <div class="card-header">
        <h3 class="card-title">🔍 Search & Filter Picks</h3>
    </div>
    <div class="card-body">
        <div class="grid grid-2">
            <form method="GET" style="display: flex; gap: 10px;">
                <input type="text" name="search" value="<?= ViewHelper::e($searchTerm) ?>" 
                       placeholder="Search picks by title or description..." style="flex: 1; padding: 8px;">
                <select name="sort" style="padding: 8px;">
                    <option value="price_low" <?= $sortBy === 'price_low' ? 'selected' : '' ?>>Price: Low to High</option>
                    <option value="price_high" <?= $sortBy === 'price_high' ? 'selected' : '' ?>>Price: High to Low</option>
                    <option value="odds_low" <?= $sortBy === 'odds_low' ? 'selected' : '' ?>>Odds: Low to High</option>
                    <option value="odds_high" <?= $sortBy === 'odds_high' ? 'selected' : '' ?>>Odds: High to Low</option>
                    <option value="popular" <?= $sortBy === 'popular' ? 'selected' : '' ?>>Most Popular</option>
                </select>
                <button type="submit" class="btn btn-primary">🔍 Search</button>
            </form>
            <div class="text-right">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <a href="/pick_management.php" class="btn btn-success">🎯 Create Pick</a>
                <?php else: ?>
                    <a href="/login" class="btn btn-warning">Login to Create Picks</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Marketplace Picks -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title">🎯 Available Accumulator Picks (<?= count($picks) ?> found)</h3>
    </div>
    <div class="card-body">
        <?php if (empty($picks)): ?>
            <div class="text-center p-5">
                <h3 class="text-muted">No picks found</h3>
                <p class="text-muted">
                    <?php if (!empty($searchTerm)): ?>
                        No picks match your search criteria. Try different keywords or browse all picks.
                    <?php else: ?>
                        No accumulator picks are currently available in the marketplace. 
                        <?php if (isset($_SESSION['user_id'])): ?>
                            <a href="/pick_management.php">Create the first one!</a>
                        <?php endif; ?>
                    <?php endif; ?>
                </p>
            </div>
        <?php else: ?>
            <div class="grid grid-3">
                <?php foreach ($picks as $pick): ?>
                    <div class="marketplace-pick-card">
                        <div class="pick-header">
                            <div class="pick-title"><?= ViewHelper::e($pick['title']) ?></div>
                            <div class="pick-price"><?= ViewHelper::currency($pick['price']) ?></div>
                        </div>
                        
                        <?php if ($pick['is_featured']): ?>
                            <div class="featured-badge">⭐ Featured</div>
                        <?php endif; ?>
                        
                        <div class="pick-tipster">
                            By: <strong><?= ViewHelper::e($pick['tipster_name']) ?></strong><br>
                            <small class="text-muted">@<?= ViewHelper::e($pick['tipster_username']) ?></small>
                        </div>
                        
                        <div class="pick-odds">
                            <strong>Combined Odds: <?= ViewHelper::odds($pick['odds']) ?></strong>
                        </div>
                        
                        <?php if ($pick['description']): ?>
                            <div class="pick-description">
                                <?= ViewHelper::truncate($pick['description'], 120) ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="pick-selections">
                            <strong>Selections (<?= $pick['selections_count'] ?>):</strong><br>
                            <small><?= ViewHelper::truncate($pick['selections_summary'], 150) ?></small>
                        </div>
                        
                        <div class="pick-meta">
                            <div class="pick-stats">
                                <span>👀 <?= $pick['views'] ?> views</span><br>
                                <span>🛒 <?= $pick['purchases'] ?> purchases</span><br>
                                <span>📅 <?= ViewHelper::date($pick['created_at']) ?></span>
                            </div>
                            <div>
                                <?php if (isset($_SESSION['user_id'])): ?>
                                    <?php if ($pick['tipster_id'] !== $_SESSION['user_id']): ?>
                                        <form method="POST" style="display: inline;">
                                            <input type="hidden" name="action" value="purchase_pick">
                                            <input type="hidden" name="pick_id" value="<?= $pick['id'] ?>">
                                            <button type="submit" class="btn btn-success btn-sm">
                                                🛒 Purchase
                                            </button>
                                        </form>
                                    <?php else: ?>
                                        <span class="text-muted">Your Pick</span>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <a href="/login" class="btn btn-warning btn-sm">
                                        Login to Purchase
                                    </a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<style>
.marketplace-pick-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
}

.marketplace-pick-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.pick-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 15px;
}

.pick-title {
    font-weight: bold;
    color: #007bff;
    font-size: 1.1em;
    margin: 0;
    flex: 1;
}

.pick-price {
    background: #28a745;
    color: white;
    padding: 5px 10px;
    border-radius: 15px;
    font-weight: bold;
    font-size: 0.9em;
}

.featured-badge {
    background: linear-gradient(45deg, #ff6b6b, #feca57);
    color: white;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.7em;
    font-weight: bold;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 10px;
}

.pick-tipster {
    color: #666;
    font-size: 0.9em;
    margin-bottom: 10px;
}

.pick-odds {
    font-size: 1.2em;
    font-weight: bold;
    color: #28a745;
    margin: 10px 0;
    text-align: center;
    background: #f8f9fa;
    padding: 10px;
    border-radius: 5px;
}

.pick-description {
    color: #555;
    font-style: italic;
    margin: 10px 0;
    padding: 10px;
    background: #f8f9fa;
    border-left: 3px solid #007bff;
    border-radius: 3px;
}

.pick-selections {
    font-size: 0.9em;
    color: #666;
    margin: 15px 0;
    line-height: 1.4;
}

.pick-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
    font-size: 0.9em;
    color: #666;
}

.pick-stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
</style>
