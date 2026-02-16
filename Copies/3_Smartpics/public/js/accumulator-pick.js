/**
 * SmartPicks Pro - Accumulator Pick JavaScript Component
 * 
 * This component provides client-side functionality for accumulator pick creation
 */

class AccumulatorPickManager {
    constructor() {
        this.picks = [];
        this.totalOdds = 1.0;
        this.maxPicks = 10;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadExistingPicks();
        this.updateDisplay();
    }
    
    setupEventListeners() {
        // Add pick button
        const addPickBtn = document.getElementById('addPickBtn');
        if (addPickBtn) {
            addPickBtn.addEventListener('click', () => this.addPick());
        }
        
        // Create accumulator button
        const createBtn = document.getElementById('createAccumulatorBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createAccumulator());
        }
        
        // Clear accumulator button
        const clearBtn = document.getElementById('clearAccumulatorBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAccumulator());
        }
        
        // Confidence slider
        const confidenceSlider = document.getElementById('confidenceSlider');
        const confidenceInput = document.getElementById('confidenceInput');
        
        if (confidenceSlider && confidenceInput) {
            confidenceSlider.addEventListener('input', () => {
                confidenceInput.value = confidenceSlider.value;
            });
            
            confidenceInput.addEventListener('input', () => {
                if (confidenceInput.value >= 50 && confidenceInput.value <= 100) {
                    confidenceSlider.value = confidenceInput.value;
                }
            });
        }
    }
    
    loadExistingPicks() {
        // Load picks from server if any exist
        this.fetchAccumulatorSummary();
    }
    
    addPick() {
        const pickData = this.getPickFormData();
        
        if (!this.validatePickData(pickData)) {
            return;
        }
        
        // Check for duplicates
        if (this.isDuplicatePick(pickData)) {
            this.showError('You already have a pick from this match in this market');
            return;
        }
        
        // Check pick limit
        if (this.picks.length >= this.maxPicks) {
            this.showError(`Maximum ${this.maxPicks} picks allowed per accumulator`);
            return;
        }
        
        // Add pick to local array
        this.picks.push(pickData);
        
        // Send to server
        this.sendPickToServer(pickData);
    }
    
    getPickFormData() {
        return {
            home_team: document.getElementById('homeTeam').value.trim(),
            away_team: document.getElementById('awayTeam').value.trim(),
            league: document.getElementById('league').value.trim(),
            country: document.getElementById('country').value.trim(),
            match_date: document.getElementById('matchDate').value + ' ' + document.getElementById('matchTime').value,
            market: document.getElementById('market').value,
            selection: document.getElementById('selection').value.trim(),
            odds: parseFloat(document.getElementById('odds').value)
        };
    }
    
    validatePickData(pickData) {
        const required = ['home_team', 'away_team', 'league', 'match_date', 'market', 'selection', 'odds'];
        
        for (const field of required) {
            if (!pickData[field]) {
                this.showError('All fields are required');
                return false;
            }
        }
        
        if (pickData.odds <= 1) {
            this.showError('Odds must be greater than 1.00');
            return false;
        }
        
        return true;
    }
    
    isDuplicatePick(pickData) {
        return this.picks.some(pick => 
            pick.home_team === pickData.home_team && 
            pick.away_team === pickData.away_team && 
            pick.market === pickData.market
        );
    }
    
    sendPickToServer(pickData) {
        const formData = new FormData();
        formData.append('action', 'add_pick');
        
        Object.keys(pickData).forEach(key => {
            formData.append(key, pickData[key]);
        });
        
        fetch('accumulator_pick_component.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showSuccess(data.message);
                this.updateDisplay();
                this.resetForm();
            } else {
                this.showError(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showError('Error adding pick to accumulator');
        });
    }
    
    removePick(index) {
        if (index < 0 || index >= this.picks.length) {
            this.showError('Invalid pick index');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'remove_pick');
        formData.append('index', index);
        
        fetch('accumulator_pick_component.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.picks.splice(index, 1);
                this.showSuccess(data.message);
                this.updateDisplay();
            } else {
                this.showError(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showError('Error removing pick from accumulator');
        });
    }
    
    clearAccumulator() {
        if (!confirm('Clear all picks from accumulator?')) {
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'clear_accumulator');
        
        fetch('accumulator_pick_component.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.picks = [];
                this.showSuccess(data.message);
                this.updateDisplay();
            } else {
                this.showError(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showError('Error clearing accumulator');
        });
    }
    
    createAccumulator() {
        if (this.picks.length === 0) {
            this.showError('Please add at least one pick to your accumulator');
            return;
        }
        
        const title = document.getElementById('accumulatorTitle').value.trim();
        const description = document.getElementById('accumulatorDescription').value.trim();
        const price = parseFloat(document.getElementById('accumulatorPrice').value);
        const confidence = parseInt(document.getElementById('confidenceInput').value);
        
        if (!title) {
            this.showError('Accumulator title is required');
            return;
        }
        
        if (price < 0) {
            this.showError('Price cannot be negative');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'create_accumulator');
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('confidence', confidence);
        
        fetch('accumulator_pick_component.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showSuccess(data.message);
                this.picks = [];
                this.updateDisplay();
                this.resetAccumulatorForm();
            } else {
                this.showError(data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showError('Error creating accumulator');
        });
    }
    
    fetchAccumulatorSummary() {
        const formData = new FormData();
        formData.append('action', 'get_summary');
        
        fetch('accumulator_pick_component.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.picks = data.data.picks || [];
                this.totalOdds = data.data.total_odds || 1.0;
                this.updateDisplay();
            }
        })
        .catch(error => {
            console.error('Error fetching accumulator summary:', error);
        });
    }
    
    updateDisplay() {
        this.updatePickCount();
        this.updatePicksList();
        this.updateTotalOdds();
        this.updateAccumulatorActions();
    }
    
    updatePickCount() {
        const pickCountElement = document.getElementById('pickCount');
        if (pickCountElement) {
            pickCountElement.textContent = this.picks.length;
        }
    }
    
    updatePicksList() {
        const accumulatorContent = document.getElementById('accumulatorContent');
        if (!accumulatorContent) return;
        
        if (this.picks.length === 0) {
            accumulatorContent.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-layer-group fa-3x mb-3"></i>
                    <p>No picks yet</p>
                    <small>Add picks to build your accumulator</small>
                </div>
            `;
        } else {
            let html = `
                <div class="pick-counter">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0">Picks Added</h5>
                        <span class="badge bg-primary">${this.picks.length}</span>
                    </div>
            `;
            
            this.picks.forEach((pick, index) => {
                const matchDate = new Date(pick.match_date);
                const dateStr = matchDate.toLocaleDateString();
                const timeStr = matchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                html += `
                    <div class="pick-item">
                        <div class="pick-details">
                            <div class="teams">${pick.home_team} vs ${pick.away_team}</div>
                            <div class="league-info">${pick.league} - ${pick.country}</div>
                            <div class="odds-section">
                                <div class="odds-row">
                                    <span class="selection-name">${pick.market}</span>
                                    <span class="odds-value">${pick.selection}</span>
                                </div>
                            </div>
                        </div>
                        <div class="pick-odds">${pick.odds}</div>
                        <button type="button" class="remove-pick" onclick="accumulatorManager.removePick(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
            
            html += '</div>';
            accumulatorContent.innerHTML = html;
        }
    }
    
    updateTotalOdds() {
        this.totalOdds = this.picks.reduce((acc, pick) => acc * parseFloat(pick.odds), 1.0);
        
        const totalOddsElement = document.querySelector('.total-odds-value');
        if (totalOddsElement) {
            totalOddsElement.textContent = this.totalOdds.toFixed(3);
        }
    }
    
    updateAccumulatorActions() {
        const accumulatorActions = document.getElementById('accumulatorActions');
        const accumulatorSummary = document.getElementById('accumulatorSummary');
        
        if (this.picks.length === 0) {
            if (accumulatorActions) accumulatorActions.style.display = 'none';
            if (accumulatorSummary) accumulatorSummary.style.display = 'none';
        } else {
            if (accumulatorActions) accumulatorActions.style.display = 'block';
            if (accumulatorSummary) accumulatorSummary.style.display = 'block';
            
            // Auto-generate title if empty
            const titleInput = document.getElementById('accumulatorTitle');
            if (titleInput && !titleInput.value) {
                const pickType = this.picks.length === 1 ? 'Single Pick' : `${this.picks.length}-Fold Accumulator`;
                titleInput.value = `${pickType} @ ${this.totalOdds.toFixed(3)} odds`;
            }
        }
    }
    
    resetForm() {
        const form = document.getElementById('pickEntryForm');
        if (form) {
            form.reset();
            // Set default date to today
            const matchDateInput = document.getElementById('matchDate');
            if (matchDateInput) {
                matchDateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }
    
    resetAccumulatorForm() {
        const form = document.getElementById('accumulatorForm');
        if (form) {
            form.reset();
        }
    }
    
    showError(message) {
        this.showMessage(message, 'danger');
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showMessage(message, type) {
        const messagesDiv = document.getElementById('messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
            setTimeout(() => {
                messagesDiv.innerHTML = '';
            }, 5000);
        }
    }
}

// Initialize accumulator manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.accumulatorManager = new AccumulatorPickManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccumulatorPickManager;
}
