/**
 * Turn Management Integration Tests
 * Tests the complete turn-based game flow with real game scenarios
 */

import { GameManager } from '../core/GameManager.js';

describe('Turn Management Integration', () => {
    let gameManager;
    
    beforeEach(() => {
        // Create a mock HTML structure for testing
        document.body.innerHTML = `
            <div id="game-container">
                <header id="game-header">
                    <div id="game-info">
                        <span id="current-player">Player 1</span>
                        <span id="turn-counter">Turn: 1</span>
                    </div>
                </header>
                <main id="game-main">
                    <canvas id="game-canvas" width="800" height="600"></canvas>
                    <aside id="game-sidebar">
                        <div id="game-controls">
                            <button id="end-turn-btn">End Turn</button>
                            <button id="save-game-btn">Save Game</button>
                            <button id="load-game-btn">Load Game</button>
                        </div>
                    </aside>
                </main>
            </div>
        `;
        
        // Mock localStorage
        global.localStorage = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        };
        
        gameManager = new GameManager('game-canvas');
    });
    
    afterEach(() => {
        document.body.innerHTML = '';
        delete global.localStorage;
    });
    
    describe('Complete Game Flow', () => {
        test('should handle a complete game session', () => {
            const config = {
                map: { width: 10, height: 10, hexSize: 32 },
                players: [
                    { id: 0, name: 'Human Player', faction: 'HUMANS', color: '#0066CC', isAI: false },
                    { id: 1, name: 'AI Player', faction: 'ELVES', color: '#00CC66', isAI: true }
                ]
            };
            
            // Initialize game
            gameManager.initializeGame(config);
            
            // Verify initial state
            expect(gameManager.getCurrentPlayer()).toBe(0);
            expect(gameManager.getGamePhase()).toBe('PLAYING');
            expect(gameManager.getGameState().getCurrentTurn()).toBe(1);
            
            // Human player ends turn
            gameManager.endTurn();
            
            // Should advance to AI player
            expect(gameManager.getCurrentPlayer()).toBe(1);
            
            // AI should process turn automatically (mocked to be synchronous)
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = (callback) => callback();
            
            // Let AI complete its turn
            gameManager.processAITurn(1);
            
            // Restore setTimeout
            global.setTimeout = originalSetTimeout;
            
            // Game should still be in playing state
            expect(gameManager.getGamePhase()).toBe('PLAYING');
        });
        
        test('should handle resource generation across turns', () => {
            const config = {
                map: { width: 5, height: 5, hexSize: 32 },
                players: [
                    { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                    { id: 1, name: 'Player 2', faction: 'ELVES', color: '#00CC66', isAI: false }
                ]
            };
            
            gameManager.initializeGame(config);
            
            const player1 = gameManager.getGameState().getPlayer(0);
            const initialGold = player1.resources.gold;
            
            // Process a few turns
            gameManager.endTurn(); // Player 0 -> 1
            gameManager.endTurn(); // Player 1 -> 0 (new round)
            
            // Player should have gained gold from resource generation
            expect(player1.resources.gold).toBeGreaterThan(initialGold);
        });
        
        test('should handle victory conditions correctly', () => {
            const config = {
                map: { width: 5, height: 5, hexSize: 32 },
                players: [
                    { id: 0, name: 'Winner', faction: 'HUMANS', color: '#0066CC', isAI: false },
                    { id: 1, name: 'Loser', faction: 'ELVES', color: '#00CC66', isAI: false }
                ]
            };
            
            gameManager.initializeGame(config);
            
            // Eliminate one player
            gameManager.getGameState().eliminatePlayer(1);
            
            // Check victory conditions
            const gameEnded = gameManager.checkVictoryConditions();
            
            expect(gameEnded).toBe(true);
            expect(gameManager.getGamePhase()).toBe('ENDED');
        });
        
        test('should maintain game statistics', () => {
            const config = {
                map: { width: 5, height: 5, hexSize: 32 },
                players: [
                    { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                    { id: 1, name: 'Player 2', faction: 'ELVES', color: '#00CC66', isAI: false }
                ]
            };
            
            gameManager.initializeGame(config);
            
            // Advance a few turns
            gameManager.endTurn();
            gameManager.endTurn();
            gameManager.endTurn();
            
            const stats = gameManager.calculateGameStatistics();
            
            expect(stats).toHaveProperty('totalTurns');
            expect(stats).toHaveProperty('playerStats');
            expect(stats).toHaveProperty('gameLength');
            expect(stats.totalTurns).toBeGreaterThan(1);
            expect(stats.playerStats).toHaveLength(2);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle invalid game states gracefully', () => {
            const config = {
                map: { width: 5, height: 5, hexSize: 32 },
                players: [
                    { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false }
                ]
            };
            
            gameManager.initializeGame(config);
            
            // Try to end turn when game is not initialized properly
            gameManager.gamePhase = 'SETUP';
            
            // Should not crash
            expect(() => gameManager.endTurn()).not.toThrow();
            
            // Game phase should remain SETUP
            expect(gameManager.getGamePhase()).toBe('SETUP');
        });
        
        test('should handle missing players gracefully', () => {
            const config = {
                map: { width: 5, height: 5, hexSize: 32 },
                players: [
                    { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false }
                ]
            };
            
            gameManager.initializeGame(config);
            
            // Try to get next player when only one player exists
            const nextPlayer = gameManager.getNextPlayer();
            
            // Should return the same player (wraps around)
            expect(nextPlayer).toBe(0);
        });
    });
});