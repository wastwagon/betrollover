<?php
/**
 * SmartPicks Pro - Marketplace Browse Page
 * Interface for browsing and purchasing accumulator picks
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
    <title>Marketplace - SmartPicks Pro</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .marketplace-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
        }
        
        .listing-card {
            border: 1px solid #e9ecef;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
            background: white;
        }
        
        .listing-card:hover {
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transform: translateY(-5px);
        }
        
        .seller-info {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .seller-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .seller-details h6 {
            margin: 0;
            font-weight: bold;
        }
        
        .seller-stats {
            font-size: 0.85em;
            color: #6c757d;
        }
        
        .listing-price {
            background: #28a745;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.1em;
        }
        
        .picks-preview {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .pick-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .pick-item:last-child {
            border-bottom: none;
        }
        
        .pick-odds {
            color: #28a745;
            font-weight: bold;
        }
        
        .total-odds {
            background: #667eea;
            color: white;
            padding: 10px;
            border-radius: 10px;
            text-align: center;
            margin: 15px 0;
        }
        
        .purchase-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 12px 25px;
            border-radius: 25px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .purchase-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .purchase-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .status-badge {
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-available {
            background: #d4edda;
            color: #155724;
        }
        
        .status-purchased {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-sold-out {
            background: #f8d7da;
            color: #721c24;
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
            padding: 10px 20px;
            margin-right: 10px;
            border-radius: 20px;
            transition: all 0.3s ease;
        }
        
        .filter-tab.active {
            background: #667eea;
            color: white;
        }
        
        .wallet-info {
            background: #e3f2fd;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
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
    </style>
</head>
<body>
    <!-- Marketplace Header -->
    <div class="marketplace-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1><i class="fas fa-store"></i> Marketplace</h1>
                    <p class="mb-0">Discover and purchase premium accumulator picks from top tipsters</p>
                </div>
                <div class="col-md-4 text-end">
                    <a href="/app/controllers/marketplace.php?action=list" class="btn btn-light">
                        <i class="fas fa-plus"></i> List Your Pick
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Wallet Info -->
        <div class="wallet-info">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h5><i class="fas fa-wallet"></i> Your Wallet</h5>
                    <p class="mb-0">Balance: <strong><?php echo number_format($walletBalance['balance'] ?? 0, 2); ?> <?php echo $walletBalance['currency'] ?? 'GHS'; ?></strong></p>
                </div>
                <div class="col-md-6 text-end">
                    <a href="/wallet" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Funds
                    </a>
                </div>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <button class="filter-tab active" data-filter="all">
                        <i class="fas fa-th"></i> All Listings
                    </button>
                    <button class="filter-tab" data-filter="available">
                        <i class="fas fa-check-circle"></i> Available
                    </button>
                    <button class="filter-tab" data-filter="purchased">
                        <i class="fas fa-shopping-cart"></i> My Purchases
                    </button>
                    <button class="filter-tab" data-filter="top_performers">
                        <i class="fas fa-star"></i> Top Performers
                    </button>
                </div>
                <div class="col-md-4">
                    <div class="input-group">
                        <input type="text" class="form-control" id="search-listings" placeholder="Search listings...">
                        <button class="btn btn-outline-secondary" type="button">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Listings Container -->
        <div id="listings-container">
            <div class="loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading marketplace listings...</p>
            </div>
        </div>

        <!-- Load More Button -->
        <div class="text-center mt-4" id="load-more-container" style="display: none;">
            <button id="load-more-btn" class="btn btn-outline-primary">
                <i class="fas fa-plus"></i> Load More Listings
            </button>
        </div>
    </div>

    <!-- Purchase Modal -->
    <div class="modal fade" id="purchaseModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-shopping-cart"></i> Purchase Accumulator
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="purchase-content">
                        <!-- Content loaded dynamically -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirm-purchase">Confirm Purchase</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        class Marketplace {
            constructor() {
                this.currentFilter = 'all';
                this.currentOffset = 0;
                this.currentLimit = 20;
                this.isLoading = false;
                this.selectedListing = null;
                
                this.init();
            }
            
            init() {
                this.bindEvents();
                this.loadListings();
            }
            
            bindEvents() {
                // Filter tabs
                document.querySelectorAll('.filter-tab').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        this.setFilter(e.target.dataset.filter);
                    });
                });
                
                // Search
                document.getElementById('search-listings').addEventListener('input', (e) => {
                    this.searchListings(e.target.value);
                });
                
                // Load more
                document.getElementById('load-more-btn').addEventListener('click', () => {
                    this.loadMoreListings();
                });
                
                // Purchase modal
                document.getElementById('confirm-purchase').addEventListener('click', () => {
                    this.confirmPurchase();
                });
            }
            
            setFilter(filter) {
                // Update active tab
                document.querySelectorAll('.filter-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
                
                this.currentFilter = filter;
                this.currentOffset = 0;
                this.loadListings();
            }
            
            async loadListings() {
                if (this.isLoading) return;
                
                this.isLoading = true;
                this.showLoading();
                
                try {
                    const params = new URLSearchParams({
                        action: 'get_listings',
                        limit: this.currentLimit,
                        offset: this.currentOffset
                    });
                    
                    const response = await fetch(`/app/controllers/marketplace.php?${params}`);
                    const result = await response.json();
                    
                    if (result.success) {
                        this.renderListings(result.listings, this.currentOffset === 0);
                        this.currentOffset += result.listings.length;
                        
                        // Show/hide load more button
                        if (result.listings.length === this.currentLimit) {
                            document.getElementById('load-more-container').style.display = 'block';
                        } else {
                            document.getElementById('load-more-container').style.display = 'none';
                        }
                    } else {
                        this.showError(result.error);
                    }
                } catch (error) {
                    this.showError('Failed to load listings');
                } finally {
                    this.isLoading = false;
                }
            }
            
            async loadMoreListings() {
                await this.loadListings();
            }
            
            renderListings(listings, replace = true) {
                const container = document.getElementById('listings-container');
                
                if (replace) {
                    container.innerHTML = '';
                }
                
                if (listings.length === 0 && replace) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-store"></i>
                            <h4>No Listings Found</h4>
                            <p>There are currently no accumulator picks available in the marketplace.</p>
                            <a href="/app/controllers/marketplace.php?action=list" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Be the First to List
                            </a>
                        </div>
                    `;
                    return;
                }
                
                listings.forEach(listing => {
                    const listingHtml = this.createListingHtml(listing);
                    container.insertAdjacentHTML('beforeend', listingHtml);
                });
            }
            
            createListingHtml(listing) {
                const statusClass = this.getStatusClass(listing.purchase_status);
                const statusText = this.getStatusText(listing.purchase_status);
                
                return `
                    <div class="listing-card" data-listing-id="${listing.id}">
                        <div class="row">
                            <div class="col-md-8">
                                <!-- Seller Info -->
                                <div class="seller-info">
                                    <div class="seller-avatar">
                                        ${listing.seller_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="seller-details">
                                        <h6>${listing.seller_name}</h6>
                                        <div class="seller-stats">
                                            <span class="badge bg-primary">Verified Tipster</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Listing Title -->
                                <h5 class="mb-3">${listing.title}</h5>
                                
                                <!-- Picks Preview -->
                                <div class="picks-preview">
                                    <h6><i class="fas fa-list"></i> Accumulator Picks (${listing.total_picks})</h6>
                                    <div class="pick-item">
                                        <span>Arsenal vs Chelsea - Match Winner - Home</span>
                                        <span class="pick-odds">2.50</span>
                                    </div>
                                    <div class="pick-item">
                                        <span>Liverpool vs Man City - Over/Under 2.5 - Over</span>
                                        <span class="pick-odds">1.85</span>
                                    </div>
                                    <div class="pick-item">
                                        <span>+ ${listing.total_picks - 2} more picks...</span>
                                    </div>
                                </div>
                                
                                <!-- Total Odds -->
                                <div class="total-odds">
                                    <strong>Total Odds: ${parseFloat(listing.total_odds).toFixed(2)}</strong>
                                </div>
                            </div>
                            
                            <div class="col-md-4 text-end">
                                <!-- Price -->
                                <div class="listing-price mb-3">
                                    ${parseFloat(listing.price).toFixed(2)} GHS
                                </div>
                                
                                <!-- Status -->
                                <div class="mb-3">
                                    <span class="status-badge ${statusClass}">${statusText}</span>
                                </div>
                                
                                <!-- Action Buttons -->
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-primary" onclick="marketplace.viewListing(${listing.id})">
                                        <i class="fas fa-eye"></i> View Details
                                    </button>
                                    ${this.getPurchaseButton(listing)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            getPurchaseButton(listing) {
                if (listing.purchase_status === 'purchased') {
                    return `<button class="btn btn-warning" disabled>
                        <i class="fas fa-check"></i> Already Purchased
                    </button>`;
                } else if (listing.purchase_status === 'sold_out') {
                    return `<button class="btn btn-secondary" disabled>
                        <i class="fas fa-times"></i> Sold Out
                    </button>`;
                } else {
                    return `<button class="btn purchase-btn" onclick="marketplace.showPurchaseModal(${listing.id})">
                        <i class="fas fa-shopping-cart"></i> Purchase
                    </button>`;
                }
            }
            
            getStatusClass(status) {
                switch (status) {
                    case 'available': return 'status-available';
                    case 'purchased': return 'status-purchased';
                    case 'sold_out': return 'status-sold-out';
                    default: return 'status-available';
                }
            }
            
            getStatusText(status) {
                switch (status) {
                    case 'available': return 'Available';
                    case 'purchased': return 'Purchased';
                    case 'sold_out': return 'Sold Out';
                    default: return 'Available';
                }
            }
            
            async showPurchaseModal(listingId) {
                try {
                    // Get listing details
                    const response = await fetch(`/app/controllers/marketplace.php?action=check_purchase_status&marketplace_id=${listingId}`);
                    const result = await response.json();
                    
                    if (result.success) {
                        if (!result.can_purchase) {
                            this.showError('Insufficient wallet balance');
                            return;
                        }
                        
                        // Show purchase modal
                        this.selectedListing = listingId;
                        this.renderPurchaseModal(result);
                        
                        const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
                        modal.show();
                    } else {
                        this.showError(result.error);
                    }
                } catch (error) {
                    this.showError('Failed to load purchase details');
                }
            }
            
            renderPurchaseModal(data) {
                const content = document.getElementById('purchase-content');
                content.innerHTML = `
                    <div class="text-center mb-4">
                        <i class="fas fa-shopping-cart fa-3x text-primary"></i>
                    </div>
                    
                    <div class="row text-center mb-4">
                        <div class="col-md-6">
                            <h6>Current Balance</h6>
                            <p class="h4 text-success">${parseFloat(data.wallet_balance).toFixed(2)} GHS</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Purchase Price</h6>
                            <p class="h4 text-primary">${parseFloat(data.listing_price).toFixed(2)} GHS</p>
                        </div>
                    </div>
                    
                    <div class="text-center mb-4">
                        <h6>Remaining Balance</h6>
                        <p class="h4 text-info">${parseFloat(data.wallet_balance - data.listing_price).toFixed(2)} GHS</p>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        <strong>Important:</strong> If this accumulator wins, you'll receive a full refund. 
                        If it loses, you'll get your money back.
                    </div>
                `;
            }
            
            async confirmPurchase() {
                if (!this.selectedListing) return;
                
                try {
                    const formData = new FormData();
                    formData.append('action', 'purchase');
                    formData.append('marketplace_id', this.selectedListing);
                    
                    const response = await fetch('/app/controllers/marketplace.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showSuccess('Accumulator purchased successfully!');
                        
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
                        modal.hide();
                        
                        // Refresh listings
                        this.currentOffset = 0;
                        this.loadListings();
                    } else {
                        this.showError(result.error);
                    }
                } catch (error) {
                    this.showError('Failed to complete purchase');
                }
            }
            
            viewListing(listingId) {
                window.location.href = `/app/controllers/marketplace.php?action=view&id=${listingId}`;
            }
            
            searchListings(query) {
                // Simple client-side search
                const cards = document.querySelectorAll('.listing-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    if (text.includes(query.toLowerCase())) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
            
            showLoading() {
                const container = document.getElementById('listings-container');
                container.innerHTML = `
                    <div class="loading">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading marketplace listings...</p>
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
        
        // Initialize marketplace
        const marketplace = new Marketplace();
    </script>
</body>
</html>

