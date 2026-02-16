<!-- Create New Pick Section -->
<div class="card mb-4">
    <div class="card-header">
        <h3 class="card-title">🎯 Create New Accumulator Pick</h3>
    </div>
    <div class="card-body">
        <form method="POST">
            <input type="hidden" name="action" value="create_pick">
            
            <?= ViewHelper::formField('text', 'title', 'Pick Title', $_POST['title'] ?? '', ['required' => true, 'placeholder' => 'e.g., Weekend Premier League Accumulator']) ?>
            <?= ViewHelper::formField('textarea', 'description', 'Description (Optional)', $_POST['description'] ?? '', ['placeholder' => 'Describe your reasoning for these selections...']) ?>
            <?= ViewHelper::formField('number', 'price', 'Price (GHS)', $_POST['price'] ?? '5.00', ['required' => true, 'step' => '0.01', 'min' => '0']) ?>
            
            <h4>Selections (Minimum 2 required)</h4>
            <div id="selections-container">
                <div class="selection-row">
                    <?= ViewHelper::formField('text', 'selections[0][team]', 'Team Name', $_POST['selections'][0]['team'] ?? '', ['required' => true, 'placeholder' => 'Team Name']) ?>
                    <?= ViewHelper::formField('select', 'selections[0][market]', 'Market', $_POST['selections'][0]['market'] ?? '', ['required' => true, 'options' => [
                        '' => 'Select Market',
                        'Match Winner' => 'Match Winner',
                        'Over/Under Goals' => 'Over/Under Goals',
                        'Both Teams to Score' => 'Both Teams to Score',
                        'Correct Score' => 'Correct Score',
                        'Half Time Result' => 'Half Time Result',
                        'Double Chance' => 'Double Chance'
                    ]]) ?>
                    <?= ViewHelper::formField('text', 'selections[0][selection]', 'Selection', $_POST['selections'][0]['selection'] ?? '', ['required' => true, 'placeholder' => 'Selection']) ?>
                    <?= ViewHelper::formField('number', 'selections[0][odds]', 'Odds', $_POST['selections'][0]['odds'] ?? '', ['required' => true, 'step' => '0.01', 'min' => '1.01', 'placeholder' => 'Odds']) ?>
                    <button type="button" class="btn btn-danger" onclick="removeSelection(this)">Remove</button>
                </div>
                <div class="selection-row">
                    <?= ViewHelper::formField('text', 'selections[1][team]', 'Team Name', $_POST['selections'][1]['team'] ?? '', ['required' => true, 'placeholder' => 'Team Name']) ?>
                    <?= ViewHelper::formField('select', 'selections[1][market]', 'Market', $_POST['selections'][1]['market'] ?? '', ['required' => true, 'options' => [
                        '' => 'Select Market',
                        'Match Winner' => 'Match Winner',
                        'Over/Under Goals' => 'Over/Under Goals',
                        'Both Teams to Score' => 'Both Teams to Score',
                        'Correct Score' => 'Correct Score',
                        'Half Time Result' => 'Half Time Result',
                        'Double Chance' => 'Double Chance'
                    ]]) ?>
                    <?= ViewHelper::formField('text', 'selections[1][selection]', 'Selection', $_POST['selections'][1]['selection'] ?? '', ['required' => true, 'placeholder' => 'Selection']) ?>
                    <?= ViewHelper::formField('number', 'selections[1][odds]', 'Odds', $_POST['selections'][1]['odds'] ?? '', ['required' => true, 'step' => '0.01', 'min' => '1.01', 'placeholder' => 'Odds']) ?>
                    <button type="button" class="btn btn-danger" onclick="removeSelection(this)">Remove</button>
                </div>
            </div>
            
            <div class="mt-3">
                <button type="button" class="btn btn-warning" onclick="addSelection()">➕ Add Selection</button>
                <button type="submit" class="btn btn-success">🎯 Create Accumulator</button>
            </div>
        </form>
    </div>
</div>

<!-- My Picks Section -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title">📋 My Accumulator Picks</h3>
    </div>
    <div class="card-body">
        <?php if (empty($picks)): ?>
            <p class="text-muted">You haven't created any accumulator picks yet. Create your first one above!</p>
        <?php else: ?>
            <div class="grid grid-3">
                <?php foreach ($picks as $pick): ?>
                    <div class="pick-card">
                        <div class="pick-header">
                            <h5 class="pick-title"><?= ViewHelper::e($pick['title']) ?></h5>
                            <div class="pick-price"><?= ViewHelper::currency($pick['price']) ?></div>
                        </div>
                        
                        <?php if ($pick['description']): ?>
                            <p class="text-muted"><?= ViewHelper::truncate($pick['description'], 100) ?></p>
                        <?php endif; ?>
                        
                        <div class="pick-odds text-center">
                            <strong>Combined Odds: <?= ViewHelper::odds($pick['odds']) ?></strong>
                        </div>
                        
                        <div class="pick-selections">
                            <strong>Selections (<?= $pick['selections_count'] ?>):</strong><br>
                            <small><?= ViewHelper::truncate($pick['selections_summary'], 150) ?></small>
                        </div>
                        
                        <div class="pick-meta">
                            <div>
                                <?= ViewHelper::statusBadge($pick['status']) ?>
                                <br>
                                <small><?= ViewHelper::datetime($pick['created_at']) ?></small>
                            </div>
                            <div>
                                <form method="POST" style="display: inline;" onsubmit="return confirm('Delete this pick?')">
                                    <input type="hidden" name="action" value="delete_pick">
                                    <input type="hidden" name="pick_id" value="<?= $pick['id'] ?>">
                                    <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<style>
.selection-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto auto;
    gap: 10px;
    align-items: end;
    margin-bottom: 10px;
    padding: 10px;
    background: white;
    border-radius: 3px;
    border: 1px solid #ddd;
}

.pick-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.pick-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 10px;
}

.pick-title {
    color: #007bff;
    margin: 0;
    flex: 1;
}

.pick-price {
    background: #28a745;
    color: white;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.8em;
    font-weight: bold;
}

.pick-odds {
    background: #f8f9fa;
    padding: 10px;
    border-radius: 5px;
    margin: 10px 0;
}

.pick-selections {
    font-size: 0.9em;
    color: #666;
    margin: 10px 0;
}

.pick-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid #eee;
}

.badge {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.7em;
    font-weight: bold;
    text-transform: uppercase;
}

.badge-success { background: #28a745; color: white; }
.badge-warning { background: #ffc107; color: #212529; }
.badge-danger { background: #dc3545; color: white; }
.badge-secondary { background: #6c757d; color: white; }
</style>

<script>
let selectionCount = 2;

function addSelection() {
    const container = document.getElementById('selections-container');
    const newRow = document.createElement('div');
    newRow.className = 'selection-row';
    newRow.innerHTML = `
        <input type="text" name="selections[${selectionCount}][team]" placeholder="Team Name" required>
        <select name="selections[${selectionCount}][market]" required>
            <option value="">Select Market</option>
            <option value="Match Winner">Match Winner</option>
            <option value="Over/Under Goals">Over/Under Goals</option>
            <option value="Both Teams to Score">Both Teams to Score</option>
            <option value="Correct Score">Correct Score</option>
            <option value="Half Time Result">Half Time Result</option>
            <option value="Double Chance">Double Chance</option>
        </select>
        <input type="text" name="selections[${selectionCount}][selection]" placeholder="Selection" required>
        <input type="number" step="0.01" min="1.01" name="selections[${selectionCount}][odds]" placeholder="Odds" required>
        <button type="button" class="btn btn-danger" onclick="removeSelection(this)">Remove</button>
    `;
    container.appendChild(newRow);
    selectionCount++;
}

function removeSelection(button) {
    const container = document.getElementById('selections-container');
    if (container.children.length > 2) {
        button.parentElement.remove();
    } else {
        alert('Accumulator must have at least 2 selections.');
    }
}
</script>
