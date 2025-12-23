/**
 * Integration tests for Save/Load system
 * Tests error handling for storage operations
 * Validates: Requirements 10.5
 */

import { SaveLoadManager } from '../core/SaveLoadManager.js';
import { GameState } from '../core/GameState.js';
import { Player } from '../core/Player.js';

describe('Save/Load Integration Tests', () => {
    let saveLoadManager;
    let originalLocalStorage;
    
    beforeEach(() => {
        // Save original localStorage
        originalLocalStorage = global.localStorage;
        
        // Create fresh instance
        saveLoadManager = new SaveLoadManager();
        
        // Mock localStorage with simple implementation
        global.localStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                this.data[key] = value;
            },
            removeItem(key) {
                delete this.data[key];
            },
            clear() {
                this.data = {};
            }
        };
    });
    
    afterEach(() => {
        // Restore original localStorage
        global.localStorage = originalLocalStorage;
    });
    
    test('should handle basic save and load cycle', () => {
        // Create a simple game state
        const gameState = new GameState();
        gameState.players = [new Player(0, 'Test Player', 'HUMANS', '#FF0000', false)];
        gameState.currentTurn = 5;
        gameState.activePlayer = 0;
        
        // Create a simple game manager mock
        const gameManager = {
            getCurrentPlayer: () => 0,
            getGamePhase: () => 'PLAYING',
            gameStartTime: Date.now()
        };
        
        // Test save
        const saveResult = saveLoadManager.saveGame(gameState, gameManager, 0, 'Test Save');
        
        expect(saveResult.success).toBe(true);
        expect(saveResult.slotId).toBe(0);
        expect(saveResult.saveName).toBe('Test Save');
        
        // Test load
        const loadResult = saveLoadManager.loadGame(0);
        
        expect(loadResult.success).toBe(true);
        expect(loadResult.slotId).toBe(0);
        expect(loadResult.saveData).toBeDefined();
        expect(loadResult.saveData.saveName).toBe('Test Save');
        expect(loadResult.saveData.gameState).toBeDefined();
    });
    
    test('should handle invalid slot IDs gracefully', () => {
        const gameState = new GameState();
        const gameManager = { getCurrentPlayer: () => 0, getGamePhase: () => 'PLAYING' };
        
        // Test invalid save slot
        const saveResult = saveLoadManager.saveGame(gameState, gameManager, -1);
        expect(saveResult.success).toBe(false);
        expect(saveResult.message).toContain('Invalid save slot');
        
        // Test invalid load slot
        const loadResult = saveLoadManager.loadGame(15);
        expect(loadResult.success).toBe(false);
        expect(loadResult.message).toContain('Invalid save slot');
    });
    
    test('should handle missing save data', () => {
        // Ensure localStorage is empty
        global.localStorage.clear();
        
        const loadResult = saveLoadManager.loadGame(0);
        
        expect(loadResult.success).toBe(false);
        expect(loadResult.message).toContain('No save data found');
    });
    
    test('should handle corrupted save data', () => {
        // Manually set corrupted data
        global.localStorage.setItem('warlords_save_0', 'invalid json');
        
        const loadResult = saveLoadManager.loadGame(0);
        
        expect(loadResult.success).toBe(false);
        expect(loadResult.message).toContain('An error occurred');
    });
    
    test('should handle localStorage not available', () => {
        // Remove localStorage completely
        const originalLS = global.localStorage;
        delete global.localStorage;
        
        const gameState = new GameState();
        const gameManager = { getCurrentPlayer: () => 0, getGamePhase: () => 'PLAYING' };
        
        const saveResult = saveLoadManager.saveGame(gameState, gameManager, 0);
        expect(saveResult.success).toBe(false);
        expect(saveResult.message).toContain('not available');
        
        const loadResult = saveLoadManager.loadGame(0);
        expect(loadResult.success).toBe(false);
        expect(loadResult.message).toContain('not available');
        
        // Restore localStorage for other tests
        global.localStorage = originalLS;
    });
    
    test('should return correct save slots information', () => {
        // Create some test saves
        const gameState = new GameState();
        gameState.players = [new Player(0, 'Test Player', 'HUMANS', '#FF0000', false)];
        const gameManager = { getCurrentPlayer: () => 0, getGamePhase: () => 'PLAYING' };
        
        // Save to slot 0
        saveLoadManager.saveGame(gameState, gameManager, 0, 'Save 1');
        
        // Save to slot 2
        saveLoadManager.saveGame(gameState, gameManager, 2, 'Save 3');
        
        // Add corrupted data to slot 1
        global.localStorage.setItem('warlords_save_1', 'invalid json');
        
        const slots = saveLoadManager.getSaveSlots();
        
        expect(slots).toHaveLength(10); // MAX_SAVE_SLOTS
        
        // Check slot 0 (valid save)
        expect(slots[0].exists).toBe(true);
        expect(slots[0].isValid).toBe(true);
        expect(slots[0].saveName).toBe('Save 1');
        
        // Check slot 1 (corrupted save)
        expect(slots[1].exists).toBe(true);
        expect(slots[1].isValid).toBe(false);
        expect(slots[1].error).toBe('Corrupted save data');
        
        // Check slot 2 (valid save)
        expect(slots[2].exists).toBe(true);
        expect(slots[2].isValid).toBe(true);
        expect(slots[2].saveName).toBe('Save 3');
        
        // Check slot 3 (empty)
        expect(slots[3].exists).toBe(false);
        expect(slots[3].isValid).toBe(false);
    });
    
    test('should handle delete operations', () => {
        // Create a save first
        const gameState = new GameState();
        const gameManager = { getCurrentPlayer: () => 0, getGamePhase: () => 'PLAYING' };
        
        saveLoadManager.saveGame(gameState, gameManager, 0, 'Test Save');
        
        // Verify save exists
        let slots = saveLoadManager.getSaveSlots();
        expect(slots[0].exists).toBe(true);
        
        // Delete the save
        const deleteResult = saveLoadManager.deleteSave(0);
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.message).toContain('deleted from slot 1');
        
        // Verify save is gone
        slots = saveLoadManager.getSaveSlots();
        expect(slots[0].exists).toBe(false);
        
        // Try to delete non-existent save
        const deleteResult2 = saveLoadManager.deleteSave(0);
        expect(deleteResult2.success).toBe(false);
        expect(deleteResult2.message).toContain('No save found');
    });
    
    test('should handle game results saving and loading', () => {
        const gameStats = {
            totalTurns: 50,
            winner: 'Player 1',
            playerStats: []
        };
        
        // Save results
        const saveResult = saveLoadManager.saveGameResults(gameStats);
        expect(saveResult.success).toBe(true);
        expect(saveResult.message).toContain('saved successfully');
        
        // Load results
        const results = saveLoadManager.getGameResults();
        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(1);
        expect(results[0].gameStats).toEqual(gameStats);
    });
    
    test('should provide storage information', () => {
        const storageInfo = saveLoadManager.getStorageInfo();
        
        expect(storageInfo.available).toBe(true);
        expect(typeof storageInfo.totalSize).toBe('number');
        expect(typeof storageInfo.saveCount).toBe('number');
        expect(storageInfo.maxSlots).toBe(10);
    });
    
    test('should clear all saves', () => {
        // Create some saves
        const gameState = new GameState();
        const gameManager = { getCurrentPlayer: () => 0, getGamePhase: () => 'PLAYING' };
        
        saveLoadManager.saveGame(gameState, gameManager, 0, 'Save 1');
        saveLoadManager.saveGame(gameState, gameManager, 1, 'Save 2');
        saveLoadManager.saveGameResults({ winner: 'Test' });
        
        // Verify saves exist
        let slots = saveLoadManager.getSaveSlots();
        expect(slots.filter(slot => slot.exists)).toHaveLength(2);
        
        let results = saveLoadManager.getGameResults();
        expect(results).toHaveLength(1);
        
        // Clear all saves
        const clearResult = saveLoadManager.clearAllSaves();
        expect(clearResult.success).toBe(true);
        expect(clearResult.message).toContain('cleared successfully');
        
        // Verify all saves are gone
        slots = saveLoadManager.getSaveSlots();
        expect(slots.filter(slot => slot.exists)).toHaveLength(0);
        
        results = saveLoadManager.getGameResults();
        expect(results).toHaveLength(0);
    });
    
    test('should provide user-friendly error messages', () => {
        const manager = new SaveLoadManager();
        
        // Test quota error
        const quotaError = new Error('Storage quota exceeded');
        expect(manager.getErrorMessage(quotaError)).toContain('Storage is full');
        
        // Test availability error
        const availabilityError = new Error('Local storage is not available');
        expect(manager.getErrorMessage(availabilityError)).toContain('not available in this browser');
        
        // Test no save data error
        const noSaveError = new Error('No save data found in slot 1');
        expect(manager.getErrorMessage(noSaveError)).toBe('No save data found in slot 1');
        
        // Test generic error
        const genericError = new Error('Something went wrong');
        expect(manager.getErrorMessage(genericError)).toContain('An error occurred');
    });
    
    test('should validate save data correctly', () => {
        const manager = new SaveLoadManager();
        
        // Valid save data
        const validSave = {
            version: '1.0',
            timestamp: Date.now(),
            gameState: {},
            gameManager: {}
        };
        expect(manager.isValidSaveData(validSave)).toBe(true);
        
        // Invalid save data (missing version)
        const invalidSave1 = {
            timestamp: Date.now(),
            gameState: {},
            gameManager: {}
        };
        expect(manager.isValidSaveData(invalidSave1)).toBe(false);
        
        // Invalid save data (missing gameState)
        const invalidSave2 = {
            version: '1.0',
            timestamp: Date.now(),
            gameManager: {}
        };
        expect(manager.isValidSaveData(invalidSave2)).toBe(false);
        
        // Null save data
        expect(manager.isValidSaveData(null)).toBe(false);
    });
});