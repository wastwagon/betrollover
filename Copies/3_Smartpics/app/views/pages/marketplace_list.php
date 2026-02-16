<?php
/**
 * SmartPicks Pro - Marketplace Listing Page
 * Interface for listing accumulator picks on the marketplace
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
    <title>List on Marketplace - SmartPicks Pro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .listing-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
        }
        
        .listing-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .listing-header-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .listing-content {
            padding: 40px;
        }
        
        .accumulator-card {
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .accumulator-card:hover {
            border-color: #667eea;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
        }
        
        .accumulator-card.selected {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.05);
        }
        
        .pricing-form {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 30px;
            margin-top: 30px;
        }
        
        .price-preview {
            background: #28a745;
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-top: 20px;
        }
        
        .btn-list {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .btn-list:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .tipster-info {
            background: #e3f2fd;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
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
        
        .picks-preview {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            border: 1px solid #e9ecef;
        }
        
        .pick-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .pick-item:last-child {
            border-bottom: none;
        }
        
        .pick-odds {
            color: #28a745;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <!-- Listing Header -->
    <div class="listing-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1><i class="fas fa-plus-circle"></i> List on Marketplace</h1>
                    <p class="mb-0">Sell your accumulator picks to other users and earn from your expertise</p>
                </div>
                <div class="col-md-4 text-end">
                    <a href="/app/controllers/marketplace.php" class="btn btn-light">
                        <i class="fas fa-arrow-left"></i> Back to Marketplace
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="row justify-content-center">
            <div class="col-lg-10">
                <div class="listing-container">
                    <!-- Header Section -->
                    <div class="listing-header-section">
                        <h3><i class="fas fa-star"></i> Become a Tipster</h3>
                        <p class="mb-0">Share your expertise and earn from successful predictions</p>
                    </div>
                    
                    <div class="listing-content">
                        <!-- Tipster Info -->
                        <div class="tipster-info">
                            <h5><i class="fas fa-info-circle"></i> How It Works</h5>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="text-center">
                                        <i class="fas fa-chart-line fa-2x text-primary mb-2"></i>
                                        <h6>Create Accumulator</h6>
                                        <p class="small">Build your multi-pick accumulator with analysis</p>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center">
                                        <i class="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                                        <h6>Set Your Price</h6>
                                        <p class="small">Choose how much users pay for your picks</p>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center">
                                        <i class="fas fa-trophy fa-2x text-warning mb-2"></i>
                                        <h6>Earn & Build Reputation</h6>
                                        <p class="small">Get paid when your picks win, build your following</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <?php if (empty($availableAccumulators)): ?>
                            <!-- Empty State -->
                            <div class="empty-state">
                                <i class="fas fa-layer-group"></i>
                                <h4>No Active Accumulators</h4>
                                <p>You need to have active accumulators to list on the marketplace.</p>
                                <a href="/app/controllers/accumulator.php" class="btn btn-primary">
                                    <i class="fas fa-plus"></i> Create Accumulator
                                </a>
                            </div>
                        <?php else: ?>
                            <!-- Select Accumulator -->
                            <div class="mb-4">
                                <h4><i class="fas fa-list"></i> Select Accumulator to List</h4>
                                <p class="text-muted">Choose which of your active accumulators you want to sell</p>
                            </div>
                            
                            <div class="row" id="accumulators-list">
                                <?php foreach ($availableAccumulators as $accumulator): ?>
                                    <div class="col-md-6 mb-3">
                                        <div class="accumulator-card" data-accumulator-id="<?php echo $accumulator['id']; ?>">
                                            <div class="d-flex justify-content-between align-items-start mb-3">
                                                <div>
                                                    <h6 class="mb-1"><?php echo htmlspecialchars($accumulator['title']); ?></h6>
                                                    <small class="text-muted">Created <?php echo date('M j, Y', strtotime($accumulator['created_at'])); ?></small>
                                                </div>
                                                <div class="text-end">
                                                    <span class="badge bg-primary"><?php echo $accumulator['total_picks']; ?> picks</span>
                                                </div>
                                            </div>
                                            
                                            <div class="picks-preview">
                                                <h6><i class="fas fa-chart-line"></i> Picks Preview</h6>
                                                <div class="pick-item">
                                                    <span>Arsenal vs Chelsea - Match Winner</span>
                                                    <span class="pick-odds">2.50</span>
                                                </div>
                                                <div class="pick-item">
                                                    <span>Liverpool vs Man City - Over/Under</span>
                                                    <span class="pick-odds">1.85</span>
                                                </div>
                                                <div class="pick-item">
                                                    <span>+ <?php echo max(0, $accumulator['total_picks'] - 2); ?> more picks</span>
                                                </div>
                                            </div>
                                            
                                            <div class="text-center">
                                                <strong>Total Odds: <?php echo number_format($accumulator['total_odds'], 2); ?></strong>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                            
                            <!-- Pricing Form -->
                            <div class="pricing-form" id="pricing-form" style="display: none;">
                                <h4><i class="fas fa-dollar-sign"></i> Set Your Price</h4>
                                <p class="text-muted">Choose how much users will pay for your accumulator picks</p>
                                
                                <form id="listing-form">
                                    <input type="hidden" id="selected-accumulator-id" name="accumulator_id">
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="price" class="form-label">Price (GHS) *</label>
                                                <input type="number" class="form-control" id="price" name="price" 
                                                       min="5" max="1000" step="0.01" required>
                                                <div class="form-text">Minimum: 5 GHS, Maximum: 1000 GHS</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="max_purchases" class="form-label">Max Purchases</label>
                                                <select class="form-control" id="max_purchases" name="max_purchases">
                                                    <option value="1">1 Purchase Only</option>
                                                    <option value="5">Up to 5 Purchases</option>
                                                    <option value="10">Up to 10 Purchases</option>
                                                    <option value="25">Up to 25 Purchases</option>
                                                    <option value="50">Up to 50 Purchases</option>
                                                </select>
                                                <div class="form-text">How many times can this be purchased?</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="description" class="form-label">Additional Notes</label>
                                        <textarea class="form-control" id="description" name="description" rows="3"
                                                  placeholder="Add any additional information about your picks..."></textarea>
                                    </div>
                                    
                                    <!-- Price Preview -->
                                    <div class="price-preview" id="price-preview" style="display: none;">
                                        <h5>Earnings Preview</h5>
                                        <div class="row text-center">
                                            <div class="col-md-4">
                                                <h6>Price per Sale</h6>
                                                <p class="h4">0.00 GHS</p>
                                            </div>
                                            <div class="col-md-4">
                                                <h6>Max Total Earnings</h6>
                                                <p class="h4">0.00 GHS</p>
                                            </div>
                                            <div class="col-md-4">
                                                <h6>Your Commission</h6>
                                                <p class="h4 text-success">0.00 GHS</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="text-center mt-4">
                                        <button type="submit" class="btn btn-list btn-lg">
                                            <i class="fas fa-rocket"></i> List on Marketplace
                                        </button>
                                    </div>
                                </form>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Success Modal -->
    <div class="modal fade" id="successModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-body text-center">
                    <i class="fas fa-check-circle fa-4x text-success mb-3"></i>
                    <h4>Successfully Listed!</h4>
                    <p>Your accumulator has been listed on the marketplace and is now available for purchase.</p>
                    <div class="d-grid gap-2">
                        <a href="/app/controllers/marketplace.php?action=my_listings" class="btn btn-primary">
                            <i class="fas fa-list"></i> View My Listings
                        </a>
                        <a href="/app/controllers/marketplace.php" class="btn btn-outline-primary">
                            <i class="fas fa-store"></i> Browse Marketplace
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        class MarketplaceListing {
            constructor() {
                this.selectedAccumulatorId = null;
                this.init();
            }
            
            init() {
                this.bindEvents();
            }
            
            bindEvents() {
                // Accumulator selection
                document.querySelectorAll('.accumulator-card').forEach(card => {
                    card.addEventListener('click', () => {
                        this.selectAccumulator(card);
                    });
                });
                
                // Price input
                document.getElementById('price').addEventListener('input', () => {
                    this.updatePricePreview();
                });
                
                // Max purchases
                document.getElementById('max_purchases').addEventListener('change', () => {
                    this.updatePricePreview();
                });
                
                // Form submission
                document.getElementById('listing-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitListing();
                });
            }
            
            selectAccumulator(card) {
                // Remove previous selection
                document.querySelectorAll('.accumulator-card').forEach(c => {
                    c.classList.remove('selected');
                });
                
                // Select current
                card.classList.add('selected');
                
                // Get accumulator ID
                this.selectedAccumulatorId = card.dataset.accumulatorId;
                document.getElementById('selected-accumulator-id').value = this.selectedAccumulatorId;
                
                // Show pricing form
                document.getElementById('pricing-form').style.display = 'block';
                
                // Scroll to pricing form
                document.getElementById('pricing-form').scrollIntoView({ behavior: 'smooth' });
            }
            
            updatePricePreview() {
                const price = parseFloat(document.getElementById('price').value) || 0;
                const maxPurchases = parseInt(document.getElementById('max_purchases').value) || 1;
                const commissionRate = 0.7; // 70% commission for tipster
                
                const maxTotalEarnings = price * maxPurchases;
                const tipsterEarnings = maxTotalEarnings * commissionRate;
                
                const preview = document.getElementById('price-preview');
                if (price > 0) {
                    preview.style.display = 'block';
                    preview.querySelector('.col-md-4:nth-child(1) .h4').textContent = `${price.toFixed(2)} GHS`;
                    preview.querySelector('.col-md-4:nth-child(2) .h4').textContent = `${maxTotalEarnings.toFixed(2)} GHS`;
                    preview.querySelector('.col-md-4:nth-child(3) .h4').textContent = `${tipsterEarnings.toFixed(2)} GHS`;
                } else {
                    preview.style.display = 'none';
                }
            }
            
            async submitListing() {
                if (!this.selectedAccumulatorId) {
                    this.showError('Please select an accumulator first');
                    return;
                }
                
                const formData = new FormData(document.getElementById('listing-form'));
                formData.append('action', 'list');
                
                try {
                    const response = await fetch('/app/controllers/marketplace.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Show success modal
                        const modal = new bootstrap.Modal(document.getElementById('successModal'));
                        modal.show();
                    } else {
                        this.showError(result.error);
                    }
                } catch (error) {
                    this.showError('Failed to list accumulator');
                }
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
                
                document.querySelector('.listing-content').insertBefore(alert, document.querySelector('.listing-content').firstChild);
            }
        }
        
        // Initialize listing
        const marketplaceListing = new MarketplaceListing();
    </script>
</body>
</html>

