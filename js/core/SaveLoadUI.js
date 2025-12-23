/**
 * SaveLoadUI - User interface for save/load operations
 * Provides graceful error handling and user feedback
 * Validates: Requirements 10.5
 */

import { saveLoadManager } from './SaveLoadManager.js';

export class SaveLoadUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.isOpen = false;
        this.currentMode = 'save'; // 'save' or 'load'
        
        console.log('SaveLoadUI initialized');
    }
    
    /**
     * Show the save/load dialog
     * @param {string} mode - 'save' or 'load'
     */
    showDialog(mode = 'save') {
        if (this.isOpen) {
            this.closeDialog();
        }
        
        this.currentMode = mode;
        this.isOpen = true;
        
        this.createDialog();
    }
    
    /**
     * Close the save/load dialog
     */
    closeDialog() {
        const dialog = document.getElementById('saveload-dialog');
        if (dialog) {
            document.body.removeChild(dialog);
        }
        
        this.isOpen = false;
    }
    
    /**
     * Create the save/load dialog
     */
    createDialog() {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            console.log(`${this.currentMode} dialog would be shown here`);
            return;
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'saveload-dialog';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1500;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create dialog content
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2c3e50;
            color: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            min-width: 600px;
        `;
        
        // Create dialog HTML
        dialog.innerHTML = this.createDialogHTML();
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Add event listeners
        this.addEventListeners();
        
        // Load save slots
        this.refreshSaveSlots();
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeDialog();
            }
        });
    }
    
    /**
     * Create the dialog HTML content
     * @returns {string} - HTML content
     */
    createDialogHTML() {
        const title = this.currentMode === 'save' ? 'Save Game' : 'Load Game';
        const actionButton = this.currentMode === 'save' ? 'Save' : 'Load';
        
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #ecf0f1;">${title}</h2>
                <button id="close-dialog-btn" style="background: #e74c3c; color: white; border: none; border-radius: 5px; padding: 8px 12px; cursor: pointer;">
                    ✕
                </button>
            </div>
            
            ${this.currentMode === 'save' ? this.createSaveNameInput() : ''}
            
            <div id="save-slots-container" style="margin-bottom: 20px;">
                <div style="text-align: center; color: #bdc3c7;">
                    Loading save slots...
                </div>
            </div>
            
            <div id="storage-info" style="margin-bottom: 20px; padding: 10px; background-color: rgba(255,255,255,0.1); border-radius: 5px; font-size: 12px; color: #bdc3c7;">
                Loading storage information...
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                ${this.currentMode === 'load' ? '<button id="delete-save-btn" style="padding: 10px 20px; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;" disabled>Delete</button>' : ''}
                <button id="refresh-btn" style="padding: 10px 20px; background-color: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Refresh
                </button>
                <button id="action-btn" style="padding: 10px 20px; background-color: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer;" disabled>
                    ${actionButton}
                </button>
                <button id="cancel-btn" style="padding: 10px 20px; background-color: #7f8c8d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Cancel
                </button>
            </div>
            
            <div id="error-message" style="margin-top: 15px; padding: 10px; background-color: #e74c3c; color: white; border-radius: 5px; display: none;">
            </div>
            
            <div id="success-message" style="margin-top: 15px; padding: 10px; background-color: #27ae60; color: white; border-radius: 5px; display: none;">
            </div>
        `;
    }
    
    /**
     * Create save name input HTML
     * @returns {string} - HTML for save name input
     */
    createSaveNameInput() {
        return `
            <div style="margin-bottom: 20px;">
                <label for="save-name-input" style="display: block; margin-bottom: 5px; color: #bdc3c7;">
                    Save Name (optional):
                </label>
                <input 
                    type="text" 
                    id="save-name-input" 
                    placeholder="Enter custom save name..."
                    style="width: 100%; padding: 8px; border: 1px solid #7f8c8d; border-radius: 4px; background-color: #34495e; color: white;"
                    maxlength="50"
                />
            </div>
        `;
    }
    
    /**
     * Add event listeners to dialog elements
     */
    addEventListeners() {
        // Close button
        const closeBtn = document.getElementById('close-dialog-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDialog());
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeDialog());
        }
        
        // Action button (Save/Load)
        const actionBtn = document.getElementById('action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => this.handleAction());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshSaveSlots());
        }
        
        // Delete button (load mode only)
        const deleteBtn = document.getElementById('delete-save-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDelete());
        }
    }
    
    /**
     * Refresh the save slots display
     */
    refreshSaveSlots() {
        const container = document.getElementById('save-slots-container');
        if (!container) return;
        
        try {
            // Show loading
            container.innerHTML = '<div style="text-align: center; color: #bdc3c7;">Loading save slots...</div>';
            
            // Get save slots
            const slots = saveLoadManager.getSaveSlots();
            
            // Create slots HTML
            let slotsHTML = '<div style="display: grid; grid-template-columns: 1fr; gap: 10px;">';
            
            for (const slot of slots) {
                slotsHTML += this.createSlotHTML(slot);
            }
            
            slotsHTML += '</div>';
            
            container.innerHTML = slotsHTML;
            
            // Add slot click listeners
            this.addSlotListeners();
            
            // Update storage info
            this.updateStorageInfo();
            
        } catch (error) {
            console.error('Failed to refresh save slots:', error);
            this.showError('Failed to load save slots: ' + error.message);
        }
    }
    
    /**
     * Create HTML for a save slot
     * @param {Object} slot - Save slot data
     * @returns {string} - HTML for the slot
     */
    createSlotHTML(slot) {
        const isSelected = this.selectedSlot === slot.slotId;
        const isDisabled = this.currentMode === 'load' && !slot.exists;
        
        let statusClass = 'available';
        let statusText = 'Empty';
        let statusColor = '#95a5a6';
        
        if (slot.exists) {
            if (slot.isValid) {
                statusClass = 'valid';
                statusText = 'Valid Save';
                statusColor = '#27ae60';
            } else {
                statusClass = 'invalid';
                statusText = 'Corrupted';
                statusColor = '#e74c3c';
            }
        }
        
        const borderColor = isSelected ? '#3498db' : '#7f8c8d';
        const backgroundColor = isSelected ? 'rgba(52, 152, 219, 0.2)' : 'rgba(255,255,255,0.05)';
        const cursor = isDisabled ? 'not-allowed' : 'pointer';
        const opacity = isDisabled ? '0.5' : '1';
        
        return `
            <div 
                class="save-slot" 
                data-slot-id="${slot.slotId}"
                style="
                    border: 2px solid ${borderColor};
                    border-radius: 8px;
                    padding: 15px;
                    background-color: ${backgroundColor};
                    cursor: ${cursor};
                    opacity: ${opacity};
                    transition: all 0.2s ease;
                "
                ${isDisabled ? 'data-disabled="true"' : ''}
            >
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: #ecf0f1;">
                            Slot ${slot.slotId + 1}: ${slot.saveName}
                        </h4>
                        <div style="font-size: 12px; color: ${statusColor}; font-weight: bold;">
                            ${statusText}
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: #bdc3c7;">
                        ${slot.timestamp ? new Date(slot.timestamp).toLocaleString() : 'Never used'}
                    </div>
                </div>
                
                ${slot.exists && slot.metadata ? this.createSlotMetadataHTML(slot.metadata) : ''}
                
                ${slot.error ? `<div style="color: #e74c3c; font-size: 12px; margin-top: 5px;">${slot.error}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * Create metadata HTML for a save slot
     * @param {Object} metadata - Save metadata
     * @returns {string} - Metadata HTML
     */
    createSlotMetadataHTML(metadata) {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; font-size: 12px; color: #bdc3c7;">
                <div>Turn: ${metadata.turn || 'N/A'}</div>
                <div>Players: ${metadata.playerCount || 'N/A'}</div>
                <div>Units: ${metadata.unitCount || 0}</div>
                <div>Cities: ${metadata.cityCount || 0}</div>
            </div>
        `;
    }
    
    /**
     * Add click listeners to save slots
     */
    addSlotListeners() {
        const slots = document.querySelectorAll('.save-slot');
        
        slots.forEach(slot => {
            if (slot.dataset.disabled === 'true') {
                return; // Skip disabled slots
            }
            
            slot.addEventListener('click', () => {
                const slotId = parseInt(slot.dataset.slotId);
                this.selectSlot(slotId);
            });
            
            // Hover effects
            slot.addEventListener('mouseenter', () => {
                if (slot.dataset.disabled !== 'true') {
                    slot.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
                }
            });
            
            slot.addEventListener('mouseleave', () => {
                if (slot.dataset.disabled !== 'true' && this.selectedSlot !== parseInt(slot.dataset.slotId)) {
                    slot.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
            });
        });
    }
    
    /**
     * Select a save slot
     * @param {number} slotId - Slot ID to select
     */
    selectSlot(slotId) {
        // Remove previous selection
        const previousSelected = document.querySelector('.save-slot[style*="rgba(52, 152, 219, 0.2)"]');
        if (previousSelected && parseInt(previousSelected.dataset.slotId) !== slotId) {
            previousSelected.style.backgroundColor = 'rgba(255,255,255,0.05)';
            previousSelected.style.borderColor = '#7f8c8d';
        }
        
        // Select new slot
        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
        if (slot) {
            slot.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
            slot.style.borderColor = '#3498db';
        }
        
        this.selectedSlot = slotId;
        
        // Enable action button
        const actionBtn = document.getElementById('action-btn');
        if (actionBtn) {
            actionBtn.disabled = false;
        }
        
        // Enable delete button for load mode
        const deleteBtn = document.getElementById('delete-save-btn');
        if (deleteBtn && this.currentMode === 'load') {
            const slots = saveLoadManager.getSaveSlots();
            const selectedSlotData = slots.find(s => s.slotId === slotId);
            deleteBtn.disabled = !selectedSlotData || !selectedSlotData.exists;
        }
    }
    
    /**
     * Handle the main action (Save/Load)
     */
    handleAction() {
        if (this.selectedSlot === undefined) {
            this.showError('Please select a save slot');
            return;
        }
        
        if (this.currentMode === 'save') {
            this.handleSave();
        } else {
            this.handleLoad();
        }
    }
    
    /**
     * Handle save operation
     */
    handleSave() {
        try {
            // Get custom save name
            const saveNameInput = document.getElementById('save-name-input');
            const saveName = saveNameInput ? saveNameInput.value.trim() : null;
            
            // Show loading
            this.showLoading('Saving game...');
            
            // Save game
            const result = this.gameManager.saveGame(this.selectedSlot, saveName);
            
            if (result.success) {
                this.showSuccess(result.message);
                
                // Refresh slots to show updated save
                setTimeout(() => {
                    this.refreshSaveSlots();
                }, 1000);
                
                // Close dialog after delay
                setTimeout(() => {
                    this.closeDialog();
                }, 2000);
                
            } else {
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Save operation failed:', error);
            this.showError('Save operation failed: ' + error.message);
        }
    }
    
    /**
     * Handle load operation
     */
    handleLoad() {
        try {
            // Show loading
            this.showLoading('Loading game...');
            
            // Load game
            const result = this.gameManager.loadGame(this.selectedSlot);
            
            if (result.success) {
                this.showSuccess(result.message);
                
                // Close dialog after delay
                setTimeout(() => {
                    this.closeDialog();
                }, 1500);
                
            } else {
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Load operation failed:', error);
            this.showError('Load operation failed: ' + error.message);
        }
    }
    
    /**
     * Handle delete operation
     */
    handleDelete() {
        if (this.selectedSlot === undefined) {
            this.showError('Please select a save slot to delete');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the save in slot ${this.selectedSlot + 1}?`)) {
            return;
        }
        
        try {
            // Show loading
            this.showLoading('Deleting save...');
            
            // Delete save
            const result = this.gameManager.deleteSave(this.selectedSlot);
            
            if (result.success) {
                this.showSuccess(result.message);
                
                // Refresh slots
                setTimeout(() => {
                    this.refreshSaveSlots();
                    this.selectedSlot = undefined;
                    
                    // Disable buttons
                    const actionBtn = document.getElementById('action-btn');
                    const deleteBtn = document.getElementById('delete-save-btn');
                    if (actionBtn) actionBtn.disabled = true;
                    if (deleteBtn) deleteBtn.disabled = true;
                }, 1000);
                
            } else {
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Delete operation failed:', error);
            this.showError('Delete operation failed: ' + error.message);
        }
    }
    
    /**
     * Update storage information display
     */
    updateStorageInfo() {
        const storageInfoElement = document.getElementById('storage-info');
        if (!storageInfoElement) return;
        
        try {
            const storageInfo = saveLoadManager.getStorageInfo();
            
            if (!storageInfo.available) {
                storageInfoElement.innerHTML = `
                    <div style="color: #e74c3c;">
                        ⚠️ Storage not available: ${storageInfo.error || 'Unknown error'}
                    </div>
                `;
                return;
            }
            
            const usedMB = (storageInfo.usedSize / 1024 / 1024).toFixed(2);
            const quotaMB = (storageInfo.quota / 1024 / 1024).toFixed(1);
            const usagePercent = ((storageInfo.usedSize / storageInfo.quota) * 100).toFixed(1);
            
            storageInfoElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Storage:</strong> ${usedMB} MB / ${quotaMB} MB (${usagePercent}% used)
                    </div>
                    <div>
                        <strong>Saves:</strong> ${storageInfo.saveCount} / ${storageInfo.maxSlots}
                    </div>
                </div>
                <div style="width: 100%; height: 4px; background-color: #7f8c8d; border-radius: 2px; margin-top: 5px;">
                    <div style="width: ${usagePercent}%; height: 100%; background-color: ${usagePercent > 80 ? '#e74c3c' : '#27ae60'}; border-radius: 2px;"></div>
                </div>
            `;
            
        } catch (error) {
            console.error('Failed to update storage info:', error);
            storageInfoElement.innerHTML = `
                <div style="color: #e74c3c;">
                    Failed to load storage information
                </div>
            `;
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.hideMessages();
        
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.hideMessages();
        
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * Show loading message
     * @param {string} message - Loading message
     */
    showLoading(message) {
        this.hideMessages();
        
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    ${message}
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            successElement.style.display = 'block';
        }
    }
    
    /**
     * Hide all messages
     */
    hideMessages() {
        const errorElement = document.getElementById('error-message');
        const successElement = document.getElementById('success-message');
        
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }
    
    /**
     * Show quick save dialog
     */
    showQuickSave() {
        // Find first available slot or use slot 0
        const slots = saveLoadManager.getSaveSlots();
        const availableSlot = slots.find(slot => !slot.exists) || slots[0];
        
        if (availableSlot) {
            const result = this.gameManager.saveGame(availableSlot.slotId, 'Quick Save');
            
            if (result.success) {
                this.gameManager.showMessage('Quick save successful!');
            } else {
                this.gameManager.showMessage(result.message, 'error');
            }
        }
    }
    
    /**
     * Show quick load dialog
     */
    showQuickLoad() {
        // Find most recent save
        const slots = saveLoadManager.getSaveSlots();
        const validSlots = slots.filter(slot => slot.exists && slot.isValid);
        
        if (validSlots.length === 0) {
            this.gameManager.showMessage('No saves available to load', 'error');
            return;
        }
        
        // Sort by timestamp and get most recent
        validSlots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const mostRecentSlot = validSlots[0];
        
        const result = this.gameManager.loadGame(mostRecentSlot.slotId);
        
        if (result.success) {
            this.gameManager.showMessage('Quick load successful!');
        } else {
            this.gameManager.showMessage(result.message, 'error');
        }
    }
}