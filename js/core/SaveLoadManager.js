/**
 * SaveLoadManager - Handles persistent storage with Local Storage API
 * Supports multiple save slots and error handling for storage operations
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

export class SaveLoadManager {
    constructor() {
        this.SAVE_KEY_PREFIX = 'warlords_save_';
        this.SAVE_METADATA_KEY = 'warlords_save_metadata';
        this.RESULTS_KEY = 'warlords_results';
        this.MAX_SAVE_SLOTS = 10;
        this.MAX_RESULTS = 20;
        this.SAVE_VERSION = '1.0';
        
        console.log('SaveLoadManager initialized');
    }
    
    /**
     * Save game state to a specific slot
     * @param {Object} gameState - Game state to save
     * @param {Object} gameManager - Game manager instance
     * @param {number} slotId - Save slot ID (0-9)
     * @param {string} saveName - Optional custom save name
     * @returns {Object} - Save result with success status and message
     */
    saveGame(gameState, gameManager, slotId = 0, saveName = null) {
        try {
            // Validate inputs
            if (!gameState || !gameManager) {
                throw new Error('Invalid game state or game manager');
            }
            
            if (slotId < 0 || slotId >= this.MAX_SAVE_SLOTS) {
                throw new Error(`Invalid save slot: ${slotId}. Must be between 0 and ${this.MAX_SAVE_SLOTS - 1}`);
            }
            
            // Check if localStorage is available
            if (!this.isLocalStorageAvailable()) {
                throw new Error('Local storage is not available');
            }
            
            // Serialize game state
            const serializedState = gameState.serialize();
            
            // Create save data
            const saveData = {
                version: this.SAVE_VERSION,
                timestamp: Date.now(),
                slotId: slotId,
                saveName: saveName || `Save ${slotId + 1}`,
                gameState: serializedState,
                gameManager: {
                    currentPlayer: gameManager.getCurrentPlayer(),
                    gamePhase: gameManager.getGamePhase(),
                    gameStartTime: gameManager.gameStartTime || Date.now()
                },
                metadata: {
                    turn: gameState.getCurrentTurn(),
                    activePlayer: gameState.getActivePlayer(),
                    playerCount: gameState.getPlayers().length,
                    unitCount: gameState.getUnits().size,
                    cityCount: gameState.getCities().size
                }
            };
            
            // Save to localStorage
            const saveKey = this.SAVE_KEY_PREFIX + slotId;
            const saveDataString = JSON.stringify(saveData);
            
            // Check storage quota
            this.checkStorageQuota(saveDataString);
            
            localStorage.setItem(saveKey, saveDataString);
            
            // Update save metadata
            this.updateSaveMetadata(slotId, saveData);
            
            console.log(`Game saved successfully to slot ${slotId}`);
            
            return {
                success: true,
                message: `Game saved to slot ${slotId + 1}`,
                slotId: slotId,
                timestamp: saveData.timestamp,
                saveName: saveData.saveName
            };
            
        } catch (error) {
            console.error('Failed to save game:', error);
            
            return {
                success: false,
                message: this.getErrorMessage(error),
                error: error.message
            };
        }
    }
    
    /**
     * Load game state from a specific slot
     * @param {number} slotId - Save slot ID to load from
     * @returns {Object} - Load result with game data or error
     */
    loadGame(slotId = 0) {
        try {
            // Validate slot ID
            if (slotId < 0 || slotId >= this.MAX_SAVE_SLOTS) {
                throw new Error(`Invalid save slot: ${slotId}. Must be between 0 and ${this.MAX_SAVE_SLOTS - 1}`);
            }
            
            // Check if localStorage is available
            if (!this.isLocalStorageAvailable()) {
                throw new Error('Local storage is not available');
            }
            
            // Get save data
            const saveKey = this.SAVE_KEY_PREFIX + slotId;
            const saveDataString = localStorage.getItem(saveKey);
            
            if (!saveDataString) {
                throw new Error(`No save data found in slot ${slotId + 1}`);
            }
            
            // Parse save data
            const saveData = JSON.parse(saveDataString);
            
            // Validate save data
            this.validateSaveData(saveData);
            
            console.log(`Game loaded successfully from slot ${slotId}`);
            
            return {
                success: true,
                message: `Game loaded from slot ${slotId + 1}`,
                saveData: saveData,
                slotId: slotId
            };
            
        } catch (error) {
            console.error('Failed to load game:', error);
            
            return {
                success: false,
                message: this.getErrorMessage(error),
                error: error.message
            };
        }
    }
    
    /**
     * Delete a save from a specific slot
     * @param {number} slotId - Save slot ID to delete
     * @returns {Object} - Delete result
     */
    deleteSave(slotId) {
        try {
            if (slotId < 0 || slotId >= this.MAX_SAVE_SLOTS) {
                throw new Error(`Invalid save slot: ${slotId}`);
            }
            
            if (!this.isLocalStorageAvailable()) {
                throw new Error('Local storage is not available');
            }
            
            const saveKey = this.SAVE_KEY_PREFIX + slotId;
            
            // Check if save exists
            if (!localStorage.getItem(saveKey)) {
                throw new Error(`No save found in slot ${slotId + 1}`);
            }
            
            // Remove save
            localStorage.removeItem(saveKey);
            
            // Update metadata
            this.removeSaveFromMetadata(slotId);
            
            console.log(`Save deleted from slot ${slotId}`);
            
            return {
                success: true,
                message: `Save deleted from slot ${slotId + 1}`,
                slotId: slotId
            };
            
        } catch (error) {
            console.error('Failed to delete save:', error);
            
            return {
                success: false,
                message: this.getErrorMessage(error),
                error: error.message
            };
        }
    }
    
    /**
     * Get information about all save slots
     * @returns {Array} - Array of save slot information
     */
    getSaveSlots() {
        try {
            if (!this.isLocalStorageAvailable()) {
                return [];
            }
            
            const slots = [];
            
            for (let i = 0; i < this.MAX_SAVE_SLOTS; i++) {
                const saveKey = this.SAVE_KEY_PREFIX + i;
                const saveDataString = localStorage.getItem(saveKey);
                
                if (saveDataString) {
                    try {
                        const saveData = JSON.parse(saveDataString);
                        
                        slots.push({
                            slotId: i,
                            exists: true,
                            saveName: saveData.saveName || `Save ${i + 1}`,
                            timestamp: saveData.timestamp,
                            version: saveData.version,
                            metadata: saveData.metadata || {},
                            isValid: this.isValidSaveData(saveData)
                        });
                        
                    } catch (error) {
                        // Corrupted save data
                        slots.push({
                            slotId: i,
                            exists: true,
                            saveName: `Corrupted Save ${i + 1}`,
                            timestamp: null,
                            version: null,
                            metadata: {},
                            isValid: false,
                            error: 'Corrupted save data'
                        });
                    }
                } else {
                    slots.push({
                        slotId: i,
                        exists: false,
                        saveName: `Empty Slot ${i + 1}`,
                        timestamp: null,
                        version: null,
                        metadata: {},
                        isValid: false
                    });
                }
            }
            
            return slots;
            
        } catch (error) {
            console.error('Failed to get save slots:', error);
            return [];
        }
    }
    
    /**
     * Save game results/statistics
     * @param {Object} gameStats - Game statistics to save
     * @returns {Object} - Save result
     */
    saveGameResults(gameStats) {
        try {
            if (!this.isLocalStorageAvailable()) {
                throw new Error('Local storage is not available');
            }
            
            const results = {
                timestamp: Date.now(),
                gameStats: gameStats,
                version: this.SAVE_VERSION
            };
            
            // Get existing results
            const existingResults = this.getGameResults();
            
            // Add new result at the beginning
            existingResults.unshift(results);
            
            // Keep only the most recent results
            if (existingResults.length > this.MAX_RESULTS) {
                existingResults.splice(this.MAX_RESULTS);
            }
            
            // Save back to storage
            localStorage.setItem(this.RESULTS_KEY, JSON.stringify(existingResults));
            
            console.log('Game results saved successfully');
            
            return {
                success: true,
                message: 'Game results saved successfully',
                resultsCount: existingResults.length
            };
            
        } catch (error) {
            console.error('Failed to save game results:', error);
            
            return {
                success: false,
                message: this.getErrorMessage(error),
                error: error.message
            };
        }
    }
    
    /**
     * Get saved game results
     * @returns {Array} - Array of game results
     */
    getGameResults() {
        try {
            if (!this.isLocalStorageAvailable()) {
                return [];
            }
            
            const resultsString = localStorage.getItem(this.RESULTS_KEY);
            
            if (!resultsString) {
                return [];
            }
            
            const results = JSON.parse(resultsString);
            
            // Validate results array
            if (!Array.isArray(results)) {
                console.warn('Invalid results data, returning empty array');
                return [];
            }
            
            return results;
            
        } catch (error) {
            console.error('Failed to get game results:', error);
            return [];
        }
    }
    
    /**
     * Clear all saved data
     * @returns {Object} - Clear result
     */
    clearAllSaves() {
        try {
            if (!this.isLocalStorageAvailable()) {
                throw new Error('Local storage is not available');
            }
            
            // Remove all save slots
            for (let i = 0; i < this.MAX_SAVE_SLOTS; i++) {
                const saveKey = this.SAVE_KEY_PREFIX + i;
                localStorage.removeItem(saveKey);
            }
            
            // Remove metadata
            localStorage.removeItem(this.SAVE_METADATA_KEY);
            
            // Remove results
            localStorage.removeItem(this.RESULTS_KEY);
            
            console.log('All saves cleared');
            
            return {
                success: true,
                message: 'All saves cleared successfully'
            };
            
        } catch (error) {
            console.error('Failed to clear saves:', error);
            
            return {
                success: false,
                message: this.getErrorMessage(error),
                error: error.message
            };
        }
    }
    
    /**
     * Get storage usage information
     * @returns {Object} - Storage usage data
     */
    getStorageInfo() {
        try {
            if (!this.isLocalStorageAvailable()) {
                return {
                    available: false,
                    totalSize: 0,
                    usedSize: 0,
                    freeSize: 0,
                    saveCount: 0
                };
            }
            
            let totalSize = 0;
            let saveCount = 0;
            
            // Calculate size of all saves
            for (let i = 0; i < this.MAX_SAVE_SLOTS; i++) {
                const saveKey = this.SAVE_KEY_PREFIX + i;
                const saveData = localStorage.getItem(saveKey);
                if (saveData) {
                    totalSize += saveData.length;
                    saveCount++;
                }
            }
            
            // Add metadata and results size
            const metadata = localStorage.getItem(this.SAVE_METADATA_KEY);
            if (metadata) {
                totalSize += metadata.length;
            }
            
            const results = localStorage.getItem(this.RESULTS_KEY);
            if (results) {
                totalSize += results.length;
            }
            
            // Estimate total localStorage size (varies by browser, typically 5-10MB)
            const estimatedQuota = 5 * 1024 * 1024; // 5MB estimate
            
            return {
                available: true,
                totalSize: totalSize,
                usedSize: totalSize,
                freeSize: Math.max(0, estimatedQuota - totalSize),
                saveCount: saveCount,
                maxSlots: this.MAX_SAVE_SLOTS,
                quota: estimatedQuota
            };
            
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    // Private helper methods
    
    /**
     * Check if localStorage is available
     * @returns {boolean} - True if available
     */
    isLocalStorageAvailable() {
        try {
            if (typeof Storage === 'undefined' || typeof localStorage === 'undefined') {
                return false;
            }
            
            // Test localStorage functionality
            const testKey = '__test_storage__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Validate save data structure
     * @param {Object} saveData - Save data to validate
     * @throws {Error} - If save data is invalid
     */
    validateSaveData(saveData) {
        if (!saveData) {
            throw new Error('Save data is null or undefined');
        }
        
        if (!saveData.version) {
            throw new Error('Save data missing version');
        }
        
        if (!saveData.gameState) {
            throw new Error('Save data missing game state');
        }
        
        if (!saveData.gameManager) {
            throw new Error('Save data missing game manager state');
        }
        
        if (typeof saveData.timestamp !== 'number') {
            throw new Error('Save data missing or invalid timestamp');
        }
        
        // Version compatibility check
        if (saveData.version !== this.SAVE_VERSION) {
            console.warn(`Save data version mismatch: ${saveData.version} vs ${this.SAVE_VERSION}`);
            // For now, we'll allow loading different versions
            // In the future, we might need migration logic
        }
    }
    
    /**
     * Check if save data is valid (non-throwing version)
     * @param {Object} saveData - Save data to check
     * @returns {boolean} - True if valid
     */
    isValidSaveData(saveData) {
        try {
            this.validateSaveData(saveData);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check storage quota before saving
     * @param {string} dataString - Data string to save
     * @throws {Error} - If storage quota exceeded
     */
    checkStorageQuota(dataString) {
        try {
            // Try to save to a test key to check quota
            const testKey = '__quota_test__';
            localStorage.setItem(testKey, dataString);
            localStorage.removeItem(testKey);
            
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                throw new Error('Storage quota exceeded. Please delete some saves or clear browser data.');
            }
            throw error;
        }
    }
    
    /**
     * Update save metadata
     * @param {number} slotId - Slot ID
     * @param {Object} saveData - Save data
     */
    updateSaveMetadata(slotId, saveData) {
        try {
            const metadata = this.getSaveMetadata();
            
            metadata[slotId] = {
                slotId: slotId,
                saveName: saveData.saveName,
                timestamp: saveData.timestamp,
                version: saveData.version,
                metadata: saveData.metadata
            };
            
            localStorage.setItem(this.SAVE_METADATA_KEY, JSON.stringify(metadata));
            
        } catch (error) {
            console.warn('Failed to update save metadata:', error);
            // Non-critical error, don't throw
        }
    }
    
    /**
     * Remove save from metadata
     * @param {number} slotId - Slot ID to remove
     */
    removeSaveFromMetadata(slotId) {
        try {
            const metadata = this.getSaveMetadata();
            delete metadata[slotId];
            localStorage.setItem(this.SAVE_METADATA_KEY, JSON.stringify(metadata));
            
        } catch (error) {
            console.warn('Failed to remove save from metadata:', error);
            // Non-critical error, don't throw
        }
    }
    
    /**
     * Get save metadata
     * @returns {Object} - Save metadata
     */
    getSaveMetadata() {
        try {
            const metadataString = localStorage.getItem(this.SAVE_METADATA_KEY);
            return metadataString ? JSON.parse(metadataString) : {};
        } catch (error) {
            console.warn('Failed to get save metadata:', error);
            return {};
        }
    }
    
    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} - User-friendly error message
     */
    getErrorMessage(error) {
        if (error.message.includes('quota')) {
            return 'Storage is full. Please delete some saves or clear browser data.';
        }
        
        if (error.message.includes('not available')) {
            return 'Save/load functionality is not available in this browser.';
        }
        
        if (error.message.includes('No save data found')) {
            return error.message;
        }
        
        if (error.message.includes('No save found')) {
            return error.message;
        }
        
        if (error.message.includes('Invalid save slot')) {
            return error.message;
        }
        
        if (error.message.includes('Corrupted')) {
            return 'Save file is corrupted and cannot be loaded.';
        }
        
        // Generic error message
        return 'An error occurred while accessing save data. Please try again.';
    }
}

// Create singleton instance
export const saveLoadManager = new SaveLoadManager();