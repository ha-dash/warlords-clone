/**
 * AIEngine Tests
 * Tests for AI decision making and actions
 */

import { AIEngine } from '../core/AIEngine.js';
import { GameState } from '../core/GameState.js';
import { Player } from '../core/Player.js';
import { Unit } from '../core/Unit.js';
import { City } from '../core/City.js';

describe('AIEngine', () => {
    let gameState;
    let aiEngine;
    let aiPlayer;
    let humanPlayer;

    beforeEach(() => {
        // Create game state
        gameState = new GameState();
        
        // Create players
        humanPlayer = new Player(0, 'Human', 'HUMANS', '#0066CC', false);
        aiPlayer = new Player(1, 'AI', 'ELVES', '#00CC66', true);
        
        gameState.players = [humanPlayer, aiPlayer];
        gameState.activePlayer = 1; // AI player's turn
        
        // Create AI engine
        aiEngine = new AIEngine(gameState);
    });

    describe('Initialization', () => {
        test('should create AIEngine with default settings', () => {
            expect(aiEngine).toBeDefined();
            expect(aiEngine.difficulty).toBe('NORMAL');
            expect(aiEngine.personality).toBe('BALANCED');
            expect(aiEngine.gameState).toBe(gameState);
        });

        test('should set difficulty correctly', () => {
            aiEngine.setDifficulty('HARD');
            expect(aiEngine.difficulty).toBe('HARD');
            expect(aiEngine.weights.combat).toBeGreaterThan(1.2);
        });

        test('should set personality correctly', () => {
            aiEngine.setPersonality('AGGRESSIVE');
            expect(aiEngine.personality).toBe('AGGRESSIVE');
            expect(aiEngine.weights.combat).toBeGreaterThan(1.5);
        });

        test('should handle invalid difficulty gracefully', () => {
            aiEngine.setDifficulty('INVALID');
            expect(aiEngine.difficulty).toBe('NORMAL');
        });

        test('should handle invalid personality gracefully', () => {
            aiEngine.setPersonality('INVALID');
            expect(aiEngine.personality).toBe('BALANCED');
        });
    });

    describe('City Management', () => {
        test('should evaluate production choices', () => {
            // Create a city for AI player
            const city = new City('AI City', aiPlayer.id, 5, 5, 1);
            gameState.addCity(city);
            
            // Give AI player some gold
            aiPlayer.addGold(500);
            
            const availableUnits = ['WARRIOR', 'ARCHER'];
            const choice = aiEngine.evaluateProductionChoice(city, aiPlayer, availableUnits);
            
            expect(choice).toBeDefined();
            expect(availableUnits).toContain(choice);
        });

        test('should not produce units if cannot afford', () => {
            const city = new City('Poor City', aiPlayer.id, 5, 5, 1);
            gameState.addCity(city);
            
            // AI player has no gold
            aiPlayer.resources.gold = 0;
            
            // Only include units that cost gold (exclude heroes which are free)
            const availableUnits = ['WARRIOR', 'ARCHER', 'CAVALRY'];
            const choice = aiEngine.evaluateProductionChoice(city, aiPlayer, availableUnits);
            
            // Should return null since player can't afford any units
            expect(choice).toBeNull();
        });

        test('should evaluate unit need correctly', () => {
            // Test need for warriors when player has none
            const needScore = aiEngine.evaluateUnitNeed('WARRIOR', aiPlayer);
            expect(needScore).toBeGreaterThan(0);
        });
    });

    describe('Unit Management', () => {
        test('should find nearby enemies', () => {
            // Create AI unit
            const aiUnit = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            gameState.addUnit(aiUnit);
            
            // Create enemy unit nearby
            const enemyUnit = new Unit('WARRIOR', humanPlayer.id, 6, 5);
            gameState.addUnit(enemyUnit);
            
            const enemies = aiEngine.findNearbyEnemies(aiUnit, 2);
            expect(enemies).toHaveLength(1);
            expect(enemies[0]).toBe(enemyUnit);
        });

        test('should not find distant enemies', () => {
            // Create AI unit
            const aiUnit = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            gameState.addUnit(aiUnit);
            
            // Create enemy unit far away
            const enemyUnit = new Unit('WARRIOR', humanPlayer.id, 10, 10);
            gameState.addUnit(enemyUnit);
            
            const enemies = aiEngine.findNearbyEnemies(aiUnit, 2);
            expect(enemies).toHaveLength(0);
        });

        test('should calculate distance correctly', () => {
            const distance = aiEngine.calculateDistance(0, 0, 3, 4);
            expect(distance).toBe(7); // Manhattan distance
        });

        test('should evaluate combat targets', () => {
            const attacker = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            const target = new Unit('ARCHER', humanPlayer.id, 6, 5);
            
            const score = aiEngine.evaluateCombatTarget(attacker, target);
            expect(score).toBeGreaterThan(0);
        });

        test('should find nearest enemy', () => {
            // Create AI unit
            const aiUnit = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            gameState.addUnit(aiUnit);
            
            // Create enemy units at different distances
            const nearEnemy = new Unit('WARRIOR', humanPlayer.id, 6, 5);
            const farEnemy = new Unit('WARRIOR', humanPlayer.id, 10, 10);
            gameState.addUnit(nearEnemy);
            gameState.addUnit(farEnemy);
            
            const nearest = aiEngine.findNearestEnemy(aiUnit);
            expect(nearest).toBe(nearEnemy);
        });
    });

    describe('Strategic Evaluation', () => {
        test('should evaluate strategic situation', () => {
            // Add some units and cities
            const aiUnit = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            const aiCity = new City('AI City', aiPlayer.id, 3, 3);
            gameState.addUnit(aiUnit);
            gameState.addCity(aiCity);
            
            const situation = aiEngine.evaluateStrategicSituation(aiPlayer.id);
            
            expect(situation).toHaveProperty('ownUnits', 1);
            expect(situation).toHaveProperty('ownCities', 1);
            expect(situation).toHaveProperty('militaryStrength');
            expect(situation).toHaveProperty('economicStrength');
        });

        test('should calculate military strength', () => {
            const units = [
                new Unit('WARRIOR', aiPlayer.id, 5, 5),
                new Unit('ARCHER', aiPlayer.id, 6, 6)
            ];
            
            const strength = aiEngine.calculateMilitaryStrength(units);
            expect(strength).toBeGreaterThan(0);
        });

        test('should evaluate position correctly', () => {
            // Create a winning scenario
            for (let i = 0; i < 5; i++) {
                const unit = new Unit('WARRIOR', aiPlayer.id, i, i);
                gameState.addUnit(unit);
            }
            
            const situation = aiEngine.evaluateStrategicSituation(aiPlayer.id);
            expect(['WINNING', 'LOSING', 'EVEN']).toContain(situation.position);
        });
    });

    describe('Utility Functions', () => {
        test('should get adjacent hexes', () => {
            const adjacent = aiEngine.getAdjacentHexes(5, 5);
            expect(adjacent).toHaveLength(4); // 4 cardinal directions
            
            // Check that all adjacent hexes are actually adjacent
            for (const hex of adjacent) {
                const distance = aiEngine.calculateDistance(5, 5, hex.x, hex.y);
                expect(distance).toBe(1);
            }
        });

        test('should get unit config', () => {
            const config = aiEngine.getUnitConfig('WARRIOR');
            expect(config).toBeDefined();
            expect(config).toHaveProperty('attack');
            expect(config).toHaveProperty('defense');
        });

        test('should handle invalid unit config', () => {
            const config = aiEngine.getUnitConfig('INVALID_UNIT');
            expect(config).toBeNull();
        });
    });

    describe('Turn Processing', () => {
        test('should process AI turn without errors', async () => {
            // Create a simple game setup
            const aiUnit = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            const aiCity = new City('AI City', aiPlayer.id, 3, 3);
            gameState.addUnit(aiUnit);
            gameState.addCity(aiCity);
            
            // Give AI some gold
            aiPlayer.addGold(200);
            
            // Process AI turn
            await expect(aiEngine.processAITurn(aiPlayer.id)).resolves.not.toThrow();
        });

        test('should handle invalid player gracefully', async () => {
            // Try to process turn for non-AI player
            await expect(aiEngine.processAITurn(humanPlayer.id)).resolves.not.toThrow();
        });

        test('should generate turn summary', async () => {
            const aiUnit = new Unit('WARRIOR', aiPlayer.id, 5, 5);
            gameState.addUnit(aiUnit);
            
            await aiEngine.processAITurn(aiPlayer.id);
            
            const summary = aiEngine.getTurnSummary();
            expect(summary).toHaveProperty('totalActions');
            expect(summary).toHaveProperty('actionTypes');
            expect(summary).toHaveProperty('thinkingTime');
        });
    });

    describe('Personality Effects', () => {
        test('aggressive personality should prefer combat', () => {
            aiEngine.setPersonality('AGGRESSIVE');
            expect(aiEngine.weights.combat).toBeGreaterThan(1.5);
        });

        test('defensive personality should prefer defense', () => {
            aiEngine.setPersonality('DEFENSIVE');
            expect(aiEngine.weights.defense).toBeGreaterThan(1.5);
        });

        test('economic personality should prefer production', () => {
            aiEngine.setPersonality('ECONOMIC');
            expect(aiEngine.weights.cityProduction).toBeGreaterThan(1.2);
        });
    });
});