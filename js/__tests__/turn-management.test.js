/**
 * Turn Management Tests
 * Tests for the turn-based game flow system
 */

import { GameManager } from '../core/GameManager.js';

describe('Turn Management System', () => {
    let gameManager;
    let mockConfig;
    
    beforeEach(() => {
        // Create a mock HTML structure for testing
        document.body.innerHTML = `
            <div id="game-container">
                <header id="game-header">
                    <h1>Warlords Clone</h1>
                    <div id="game-info">
                        <span id="current-player">Player 1</span>
                        <span id="turn-counter">Turn: 1</span>
                    </div>
                </header>
                
                <main id="game-main">
                    <div id="game-canvas-container">
                        <canvas id="game-canvas" width="800" height="600"></canvas>
                    </div>
                    
                    <aside id="game-sidebar">
                        <div id="unit-info" class="info-panel">
                            <h3>Unit Information</h3>
                            <div id="unit-details"></div>
                        </div>
                        
                        <div id="city-info" class="info-panel">
                            <h3>City Information</h3>
                            <div id="city-details"></div>
                        </div>
                        
                        <div id="game-controls" class="info-panel">
                            <h3>Controls</h3>
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
        
        mockConfig = {
            map: {
                width: 10,
                height: 10,
                hexSize: 32
            },
            players: [
                { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                { id: 1, name: 'AI 1', faction: 'ELVES', color: '#00CC66', isAI: true },
                { id: 2, name: 'AI 2', faction: 'DEMONS', color: '#CC0066', isAI: true }
            ]
        };
        
        gameManager.initializeGame(mockConfig);
    });
    
    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        delete global.localStorage;
    });
    
    describe('Turn Initialization', () => {
        test('should start with player 0', () => {
            expect(gameManager.getCurrentPlayer()).toBe(0);
            expect(gameManager.getGameState().getActivePlayer()).toBe(0);
        });
        
        test('should be in PLAYING phase', () => {
            expect(gameManager.getGamePhase()).toBe('PLAYING');
        });
        
        test('should have turn counter at 1', () => {
            expect(gameManager.getGameState().getCurrentTurn()).toBe(1);
        });
    });
    
    describe('Turn Progression', () => {
        test('should advance to next player when ending turn', () => {
            // Test with human players only to avoid AI complexity
            const humanConfig = {
                map: { width: 10, height: 10, hexSize: 32 },
                players: [
                    { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                    { id: 1, name: 'Player 2', faction: 'ELVES', color: '#00CC66', isAI: false },
                    { id: 2, name: 'Player 3', faction: 'DEMONS', color: '#CC0066', isAI: false }
                ]
            };
            
            const humanGameManager = new GameManager('game-canvas');
            humanGameManager.initializeGame(humanConfig);
            
            const initialPlayer = humanGameManager.getCurrentPlayer();
            humanGameManager.endTurn();
            
            // Should advance to next player
            expect(humanGameManager.getCurrentPlayer()).toBe((initialPlayer + 1) % 3);
        });
        
        test('should increment turn counter after full round', () => {
            // Test with human players only to avoid AI complexity
            const humanConfig = {
                map: { width: 10, height: 10, hexSize: 32 },
                players: [
                    { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                    { id: 1, name: 'Player 2', faction: 'ELVES', color: '#00CC66', isAI: false },
                    { id: 2, name: 'Player 3', faction: 'DEMONS', color: '#CC0066', isAI: false }
                ]
            };
            
            const humanGameManager = new GameManager('game-canvas');
            humanGameManager.initializeGame(humanConfig);
            
            const initialTurn = humanGameManager.getGameState().getCurrentTurn();
            
            // Complete a full round (3 players)
            humanGameManager.endTurn(); // Player 0 -> 1
            humanGameManager.endTurn(); // Player 1 -> 2
            humanGameManager.endTurn(); // Player 2 -> 0 (new round)
            
            expect(humanGameManager.getGameState().getCurrentTurn()).toBe(initialTurn + 1);
        });
        
        test('should reset player units at turn start', () => {
            const gameState = gameManager.getGameState();
            
            // Create a spy on the resetPlayerUnits method
            const originalReset = gameState.resetPlayerUnits;
            let resetCalled = false;
            let resetPlayerId = null;
            
            gameState.resetPlayerUnits = (playerId) => {
                resetCalled = true;
                resetPlayerId = playerId;
                return originalReset.call(gameState, playerId);
            };
            
            gameManager.startTurn(1);
            
            expect(resetCalled).toBe(true);
            expect(resetPlayerId).toBe(1);
            
            // Restore original method
            gameState.resetPlayerUnits = originalReset;
        });
    });
    
    describe('Player Management', () => {
        test('should get next player correctly', () => {
            expect(gameManager.getNextPlayer()).toBe(1);
            
            gameManager.currentPlayer = 1;
            expect(gameManager.getNextPlayer()).toBe(2);
            
            gameManager.currentPlayer = 2;
            expect(gameManager.getNextPlayer()).toBe(0);
        });
        
        test('should skip eliminated players', () => {
            // Eliminate player 1
            gameManager.getGameState().eliminatePlayer(1);
            
            gameManager.currentPlayer = 0;
            expect(gameManager.getNextPlayer()).toBe(2); // Should skip player 1
        });
    });
    
    describe('Victory Conditions', () => {
        test('should detect elimination victory', () => {
            const gameState = gameManager.getGameState();
            
            // Eliminate all but one player
            gameState.eliminatePlayer(1);
            gameState.eliminatePlayer(2);
            
            const result = gameManager.checkVictoryConditions();
            expect(result).toBe(true);
            expect(gameManager.getGamePhase()).toBe('ENDED');
        });
        
        test('should not end game with multiple active players', () => {
            const result = gameManager.checkVictoryConditions();
            expect(result).toBe(false);
            expect(gameManager.getGamePhase()).toBe('PLAYING');
        });
    });
    
    describe('AI Turn Processing', () => {
        test('should process AI turns automatically', async () => {
            const aiPlayer = gameManager.getGameState().getPlayer(1);
            expect(aiPlayer.isAI).toBe(true);
            
            // Create a spy on endTurn method
            const originalEndTurn = gameManager.endTurn;
            let endTurnCalled = false;
            
            gameManager.endTurn = () => {
                endTurnCalled = true;
                return originalEndTurn.call(gameManager);
            };
            
            // Start AI turn
            gameManager.startTurn(1);
            
            // Wait for AI processing to complete
            await new Promise(resolve => {
                const checkEndTurn = () => {
                    if (endTurnCalled) {
                        resolve();
                    } else {
                        setTimeout(checkEndTurn, 10);
                    }
                };
                checkEndTurn();
            });
            
            expect(endTurnCalled).toBe(true);
            
            // Restore original method
            gameManager.endTurn = originalEndTurn;
        });
    });
    
    describe('Game Statistics', () => {
        test('should calculate game statistics', () => {
            const stats = gameManager.calculateGameStatistics();
            
            expect(stats).toHaveProperty('totalTurns');
            expect(stats).toHaveProperty('playerStats');
            expect(stats).toHaveProperty('gameLength');
            expect(stats.playerStats).toHaveLength(3);
            
            // Check player stats structure
            const playerStat = stats.playerStats[0];
            expect(playerStat).toHaveProperty('id');
            expect(playerStat).toHaveProperty('name');
            expect(playerStat).toHaveProperty('faction');
            expect(playerStat).toHaveProperty('gold');
        });
    });
    
    describe('Turn Activities', () => {
        test('should process turn start activities', () => {
            const gameState = gameManager.getGameState();
            const player = gameState.getPlayer(0);
            const initialGold = player.resources.gold;
            
            gameManager.processTurnStart(0);
            
            // Should have generated income
            expect(player.resources.gold).toBeGreaterThan(initialGold);
        });
        
        test('should process turn end activities', () => {
            const gameState = gameManager.getGameState();
            const player = gameState.getPlayer(0);
            
            gameManager.processTurnEnd(0);
            
            // Player should be marked as having acted
            expect(player.hasActed).toBe(true);
        });
    });
});