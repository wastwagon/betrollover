<?php
/**
 * SmartPicks Pro - Accumulator Creation Page
 * Interface for creating multi-pick accumulators
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
    <title>Create Accumulator - SmartPicks Pro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .accumulator-builder {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        
        .builder-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .builder-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .builder-content {
            padding: 30px;
        }
        
        .step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
        }
        
        .step {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e9ecef;
            color: #6c757d;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 10px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .step.active {
            background: #667eea;
            color: white;
        }
        
        .step.completed {
            background: #28a745;
            color: white;
        }
        
        .step-line {
            width: 50px;
            height: 2px;
            background: #e9ecef;
            margin-top: 19px;
        }
        
        .fixture-card {
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .fixture-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
        }
        
        .fixture-card.selected {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.05);
        }
        
        .market-options {
            display: none;
            margin-top: 15px;
        }
        
        .market-options.show {
            display: block;
        }
        
        .market-option {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .market-option:hover {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.05);
        }
        
        .market-option.selected {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
        }
        
        .accumulator-picks {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            min-height: 200px;
        }
        
        .pick-item {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .pick-info {
            flex: 1;
        }
        
        .pick-odds {
            font-weight: bold;
            color: #28a745;
            font-size: 1.1em;
        }
        
        .remove-pick {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
        }
        
        .total-odds {
            background: #28a745;
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin-top: 15px;
        }
        
        .verification-alert {
            margin-top: 15px;
        }
        
        .btn-create {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            color: white;
            font-weight: bold;
        }
        
        .loading {
            display: none;
        }
        
        .loading.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="accumulator-builder">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <div class="builder-container">
                        <!-- Header -->
                        <div class="builder-header">
                            <h2><i class="fas fa-layer-group"></i> Create Accumulator</h2>
                            <p>Build your multi-pick accumulator with automatic verification</p>
                        </div>
                        
                        <div class="builder-content">
                            <!-- Step Indicator -->
                            <div class="step-indicator">
                                <div class="step active" id="step-1">1</div>
                                <div class="step-line"></div>
                                <div class="step" id="step-2">2</div>
                                <div class="step-line"></div>
                                <div class="step" id="step-3">3</div>
                                <div class="step-line"></div>
                                <div class="step" id="step-4">4</div>
                            </div>
                            
                            <!-- Step 1: Accumulator Details -->
                            <div id="step-content-1" class="step-content">
                                <h4><i class="fas fa-edit"></i> Accumulator Details</h4>
                                <form id="accumulator-form">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="title" class="form-label">Title *</label>
                                                <input type="text" class="form-control" id="title" name="title" 
                                                       placeholder="e.g., Premier League Weekend Acca" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="confidence" class="form-label">Confidence Level</label>
                                                <select class="form-control" id="confidence" name="confidence">
                                                    <option value="50">50% - Low</option>
                                                    <option value="65" selected>65% - Medium</option>
                                                    <option value="80">80% - High</option>
                                                    <option value="90">90% - Very High</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="description" class="form-label">Description</label>
                                        <textarea class="form-control" id="description" name="description" rows="3"
                                                  placeholder="Describe your accumulator strategy..."></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-create">
                                        <i class="fas fa-plus"></i> Create Accumulator
                                    </button>
                                </form>
                            </div>
                            
                            <!-- Step 2: Select Fixtures -->
                            <div id="step-content-2" class="step-content" style="display: none;">
                                <h4><i class="fas fa-calendar-alt"></i> Select Matches</h4>
                                <div class="mb-3">
                                    <input type="text" class="form-control" id="search-fixtures" 
                                           placeholder="Search matches...">
                                </div>
                                <div id="fixtures-container">
                                    <div class="text-center">
                                        <div class="spinner-border" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <p>Loading upcoming matches...</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Step 3: Select Markets -->
                            <div id="step-content-3" class="step-content" style="display: none;">
                                <h4><i class="fas fa-chart-line"></i> Select Markets</h4>
                                <div id="market-selection">
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle"></i> 
                                        Select a match first to see available markets and odds.
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Step 4: Review & Submit -->
                            <div id="step-content-4" class="step-content" style="display: none;">
                                <h4><i class="fas fa-check-circle"></i> Review & Submit</h4>
                                
                                <!-- Accumulator Picks -->
                                <div class="accumulator-picks">
                                    <h5>Your Accumulator Picks</h5>
                                    <div id="picks-list">
                                        <div class="text-muted">No picks added yet</div>
                                    </div>
                                    
                                    <!-- Total Odds -->
                                    <div class="total-odds">
                                        <h3>Total Odds: <span id="total-odds">1.00</span></h3>
                                        <small>Potential Return: <span id="potential-return">0.00</span> GHS (10 GHS stake)</small>
                                    </div>
                                </div>
                                
                                <!-- Verification Alert -->
                                <div id="verification-alert" class="verification-alert" style="display: none;"></div>
                                
                                <!-- Submit Button -->
                                <div class="text-center mt-4">
                                    <button id="submit-accumulator" class="btn btn-create btn-lg" disabled>
                                        <i class="fas fa-rocket"></i> Submit Accumulator
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Loading Modal -->
    <div class="modal fade" id="loadingModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-body text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3">Processing your accumulator...</p>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        class AccumulatorBuilder {
            constructor() {
                this.currentStep = 1;
                this.accumulatorId = null;
                this.selectedFixture = null;
                this.picks = [];
                this.fixtures = [];
                
                this.init();
            }
            
            init() {
                this.bindEvents();
                this.loadFixtures();
            }
            
            bindEvents() {
                // Accumulator form submission
                document.getElementById('accumulator-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.createAccumulator();
                });
                
                // Fixture search
                document.getElementById('search-fixtures').addEventListener('input', (e) => {
                    this.filterFixtures(e.target.value);
                });
                
                // Submit accumulator
                document.getElementById('submit-accumulator').addEventListener('click', () => {
                    this.submitAccumulator();
                });
            }
            
            async createAccumulator() {
                const formData = new FormData(document.getElementById('accumulator-form'));
                formData.append('action', 'create');
                
                try {
                    const response = await fetch('/app/controllers/accumulator.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.accumulatorId = result.accumulator_id;
                        this.nextStep();
                        this.showAlert('success', 'Accumulator created successfully!');
                    } else {
                        this.showAlert('danger', result.error);
                    }
                } catch (error) {
                    this.showAlert('danger', 'An error occurred while creating accumulator');
                }
            }
            
            async loadFixtures() {
                try {
                    const response = await fetch('/app/controllers/accumulator.php?action=get_fixtures');
                    const result = await response.json();
                    
                    if (result.success) {
                        this.fixtures = result.fixtures;
                        this.renderFixtures();
                    } else {
                        this.showAlert('danger', result.error);
                    }
                } catch (error) {
                    this.showAlert('danger', 'Failed to load fixtures');
                }
            }
            
            renderFixtures() {
                const container = document.getElementById('fixtures-container');
                
                if (this.fixtures.length === 0) {
                    container.innerHTML = '<div class="alert alert-info">No upcoming matches found</div>';
                    return;
                }
                
                container.innerHTML = this.fixtures.map(fixture => `
                    <div class="fixture-card" data-fixture-id="${fixture.id}" onclick="builder.selectFixture(${fixture.id})">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${fixture.home_team} vs ${fixture.away_team}</h6>
                                <small class="text-muted">${fixture.league_name}</small>
                            </div>
                            <div class="text-end">
                                <small class="text-muted">${new Date(fixture.match_date).toLocaleDateString()}</small>
                                <br>
                                <small class="text-muted">${new Date(fixture.match_date).toLocaleTimeString()}</small>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            
            filterFixtures(searchTerm) {
                const cards = document.querySelectorAll('.fixture-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    if (text.includes(searchTerm.toLowerCase())) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
            
            async selectFixture(fixtureId) {
                // Remove previous selection
                document.querySelectorAll('.fixture-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Select current fixture
                document.querySelector(`[data-fixture-id="${fixtureId}"]`).classList.add('selected');
                
                this.selectedFixture = fixtureId;
                
                // Load markets for this fixture
                await this.loadFixtureMarkets(fixtureId);
                
                // Move to step 3
                this.nextStep();
            }
            
            async loadFixtureMarkets(fixtureId) {
                try {
                    const response = await fetch(`/app/controllers/accumulator.php?action=get_odds&fixture_id=${fixtureId}`);
                    const result = await response.json();
                    
                    if (result.success) {
                        this.renderMarkets(result.odds);
                    } else {
                        this.showAlert('danger', result.error);
                    }
                } catch (error) {
                    this.showAlert('danger', 'Failed to load markets');
                }
            }
            
            renderMarkets(odds) {
                const container = document.getElementById('market-selection');
                
                // Group odds by market type
                const markets = {};
                odds.forEach(odd => {
                    if (!markets[odd.market_type]) {
                        markets[odd.market_type] = [];
                    }
                    markets[odd.market_type].push(odd);
                });
                
                container.innerHTML = Object.keys(markets).map(marketType => `
                    <div class="mb-4">
                        <h6>${marketType}</h6>
                        <div class="row">
                            ${markets[marketType].map(odd => `
                                <div class="col-md-4 mb-2">
                                    <div class="market-option" onclick="builder.selectMarket('${odd.market_type}', '${odd.selection}', ${odd.odds})">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span>${odd.selection}</span>
                                            <span class="text-success fw-bold">${odd.odds}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            }
            
            async selectMarket(marketType, selection, odds) {
                if (!this.accumulatorId || !this.selectedFixture) {
                    this.showAlert('danger', 'Please create accumulator and select fixture first');
                    return;
                }
                
                // Check if this exact pick already exists
                const existingPick = this.picks.find(pick => 
                    pick.fixture_id == this.selectedFixture && 
                    pick.market_type === marketType && 
                    pick.selection === selection
                );
                
                if (existingPick) {
                    this.showAlert('warning', 'This exact pick is already in your accumulator');
                    return;
                }
                
                const pickData = {
                    accumulator_id: this.accumulatorId,
                    fixture_id: this.selectedFixture,
                    market_type: marketType,
                    selection: selection,
                    odds: odds,
                    confidence_level: document.getElementById('confidence').value,
                    reasoning: document.getElementById('description').value
                };
                
                try {
                    const formData = new FormData();
                    Object.keys(pickData).forEach(key => {
                        formData.append(key, pickData[key]);
                    });
                    formData.append('action', 'add_pick');
                    
                    const response = await fetch('/app/controllers/accumulator.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.picks.push({
                            id: result.pick_id,
                            fixture_id: this.selectedFixture,
                            market_type: marketType,
                            selection: selection,
                            odds: odds,
                            title: `Pick ${this.picks.length + 1}`
                        });
                        
                        this.updatePicksDisplay();
                        this.verifyPicks();
                        this.showAlert('success', 'Pick added successfully!');
                    } else {
                        this.showAlert('danger', result.error);
                    }
                } catch (error) {
                    this.showAlert('danger', 'Failed to add pick');
                }
            }
            
            updatePicksDisplay() {
                const container = document.getElementById('picks-list');
                
                if (this.picks.length === 0) {
                    container.innerHTML = '<div class="text-muted">No picks added yet</div>';
                    document.getElementById('submit-accumulator').disabled = true;
                    return;
                }
                
                container.innerHTML = this.picks.map(pick => `
                    <div class="pick-item">
                        <div class="pick-info">
                            <strong>${pick.title}</strong><br>
                            <small class="text-muted">${pick.market_type} - ${pick.selection}</small>
                        </div>
                        <div class="pick-odds">${pick.odds}</div>
                        <button class="remove-pick" onclick="builder.removePick(${pick.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
                
                // Update total odds
                const totalOdds = this.picks.reduce((total, pick) => total * pick.odds, 1);
                document.getElementById('total-odds').textContent = totalOdds.toFixed(2);
                
                const potentialReturn = (totalOdds * 10).toFixed(2);
                document.getElementById('potential-return').textContent = potentialReturn;
                
                // Enable submit button
                document.getElementById('submit-accumulator').disabled = false;
                
                // Move to step 4
                this.nextStep();
            }
            
            async removePick(pickId) {
                try {
                    const formData = new FormData();
                    formData.append('action', 'remove_pick');
                    formData.append('accumulator_id', this.accumulatorId);
                    formData.append('pick_id', pickId);
                    
                    const response = await fetch('/app/controllers/accumulator.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.picks = this.picks.filter(pick => pick.id !== pickId);
                        this.updatePicksDisplay();
                        this.verifyPicks();
                        this.showAlert('success', 'Pick removed successfully!');
                    } else {
                        this.showAlert('danger', result.error);
                    }
                } catch (error) {
                    this.showAlert('danger', 'Failed to remove pick');
                }
            }
            
            async verifyPicks() {
                if (this.picks.length === 0) return;
                
                try {
                    const formData = new FormData();
                    formData.append('action', 'verify_picks');
                    formData.append('picks', JSON.stringify(this.picks));
                    formData.append('exclude_id', this.accumulatorId);
                    
                    const response = await fetch('/app/controllers/accumulator.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showVerificationResult(result.verification);
                    }
                } catch (error) {
                    console.error('Verification failed:', error);
                }
            }
            
            showVerificationResult(verification) {
                const container = document.getElementById('verification-alert');
                
                if (verification.status === 'blocked') {
                    container.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Duplicate Detected!</strong> This exact combination already exists.
                            Please modify your picks to make them unique.
                        </div>
                    `;
                    document.getElementById('submit-accumulator').disabled = true;
                } else if (verification.status === 'warning') {
                    container.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-circle"></i>
                            <strong>Similar Strategy Detected!</strong> 
                            Your picks are very similar to existing ones. Consider modifying them.
                        </div>
                    `;
                } else if (verification.status === 'info') {
                    container.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>Strategy Notice!</strong> 
                            Your picks use similar matches to existing ones, but with different markets.
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i>
                            <strong>Unique Accumulator!</strong> Your picks are completely unique.
                        </div>
                    `;
                }
                
                container.style.display = 'block';
            }
            
            async submitAccumulator() {
                if (!this.accumulatorId || this.picks.length === 0) {
                    this.showAlert('danger', 'Cannot submit empty accumulator');
                    return;
                }
                
                try {
                    const formData = new FormData();
                    formData.append('action', 'submit');
                    formData.append('accumulator_id', this.accumulatorId);
                    
                    const response = await fetch('/app/controllers/accumulator.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showAlert('success', 'Accumulator submitted successfully!');
                        setTimeout(() => {
                            window.location.href = '/app/controllers/accumulator.php?action=my_accumulators';
                        }, 2000);
                    } else {
                        this.showAlert('danger', result.error);
                    }
                } catch (error) {
                    this.showAlert('danger', 'Failed to submit accumulator');
                }
            }
            
            nextStep() {
                this.currentStep++;
                
                // Update step indicators
                document.querySelectorAll('.step').forEach((step, index) => {
                    if (index + 1 < this.currentStep) {
                        step.classList.add('completed');
                        step.classList.remove('active');
                    } else if (index + 1 === this.currentStep) {
                        step.classList.add('active');
                        step.classList.remove('completed');
                    } else {
                        step.classList.remove('active', 'completed');
                    }
                });
                
                // Show current step content
                document.querySelectorAll('.step-content').forEach((content, index) => {
                    content.style.display = index + 1 === this.currentStep ? 'block' : 'none';
                });
            }
            
            showAlert(type, message) {
                // Remove existing alerts
                document.querySelectorAll('.alert').forEach(alert => {
                    if (alert.classList.contains('alert-' + type)) {
                        alert.remove();
                    }
                });
                
                // Create new alert
                const alert = document.createElement('div');
                alert.className = `alert alert-${type} alert-dismissible fade show`;
                alert.innerHTML = `
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                
                // Insert at top of builder content
                const content = document.querySelector('.builder-content');
                content.insertBefore(alert, content.firstChild);
                
                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    alert.remove();
                }, 5000);
            }
        }
        
        // Initialize builder
        const builder = new AccumulatorBuilder();
    </script>
</body>
</html>
