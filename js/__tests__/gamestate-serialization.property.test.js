/**
 * Property-based tests for GameState serialization
 * Tests Property 16: Save/Load State Consistency
 * Validates: Requirements 10.1, 10.2, 10.3
 */

import fc from 'fast-check';
import { GameState } from '../core/GameState.js';
import { Player } from '../core/Player.js';

describe('GameState Serialization Property Tests', () => {
    /**
     * Property 16: Save/Load State Consistency
     * For any valid game state, saving and then loading should restore 
     * the exact same game state with all units, cities, turn information, 
     * and player data intact.
     * 
     * Feature: warlords-clone, Property 16: Save/Load State Consistency
     * Validates: Requirements 10.1, 10.2, 10.3
     */
    test('Property 16: Save/Load State Consistency', () => {
        // Generator for valid player data
        const playerArbitrary = fc.record({
            id: fc.integer({ min: 0, max: 7 }),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            faction: fc.constantFrom('HUMANS', 'ELVES', 'DEMONS', 'ORCS'),
            color: fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'),
            isAI: fc.boolean(),
            isEliminated: fc.boolean(),
            gold: fc.integer({ min: 0, max: 10000 }),
            hasActed: fc.boolean(),
            stats: fc.record({
                unitsLost: fc.integer({ min: 0, max: 100 }),
                unitsKilled: fc.integer({ min: 0, max: 100 }),
                citiesCapture: fc.integer({ min: 0, max: 50 }),
                citiesLost: fc.integer({ min: 0, max: 50 }),
                battlesWon: fc.integer({ min: 0, max: 100 }),
                battlesLost: fc.integer({ min: 0, max: 100 })
            })
        });

        // Generator for unit data (simplified since Unit class not implemented yet)
        const unitArbitrary = fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom('WARRIOR', 'ARCHER', 'CAVALRY', 'HERO'),
            owner: fc.integer({ min: 0, max: 7 }),
            x: fc.integer({ min: 0, max: 19 }),
            y: fc.integer({ min: 0, max: 14 }),
            health: fc.integer({ min: 1, max: 20 }),
            movement: fc.integer({ min: 1, max: 5 })
        });

        // Generator for city data (simplified since City class not implemented yet)
        const cityArbitrary = fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            name: fc.string({ minLength: 1, maxLength: 15 }),
            owner: fc.integer({ min: 0, max: 7 }),
            x: fc.integer({ min: 0, max: 19 }),
            y: fc.integer({ min: 0, max: 14 }),
            size: fc.integer({ min: 1, max: 5 })
        });

        // Generator for complete game state
        const gameStateArbitrary = fc.record({
            players: fc.array(playerArbitrary, { minLength: 1, maxLength: 8 }),
            units: fc.array(fc.tuple(fc.string(), unitArbitrary), { maxLength: 20 }),
            cities: fc.array(fc.tuple(fc.string(), cityArbitrary), { maxLength: 10 }),
            currentTurn: fc.integer({ min: 1, max: 1000 }),
            activePlayer: fc.integer({ min: 0, max: 7 })
        });

        fc.assert(
            fc.property(gameStateArbitrary, (stateData) => {
                // Create a GameState instance
                const gameState = new GameState();
                
                // Manually set up the game state with generated data
                gameState.players = stateData.players.map(playerData => {
                    const player = new Player(
                        playerData.id,
                        playerData.name,
                        playerData.faction,
                        playerData.color,
                        playerData.isAI
                    );
                    
                    // Set additional properties
                    player.isEliminated = playerData.isEliminated;
                    player.resources.gold = playerData.gold;
                    player.hasActed = playerData.hasActed;
                    player.stats = { ...playerData.stats };
                    
                    return player;
                });
                
                // Set up units and cities as Maps
                gameState.units = new Map(stateData.units);
                gameState.cities = new Map(stateData.cities);
                gameState.currentTurn = stateData.currentTurn;
                
                // Ensure activePlayer is valid (within bounds of players array)
                gameState.activePlayer = stateData.activePlayer % gameState.players.length;
                
                // Serialize the game state
                const serializedData = gameState.serialize();
                
                // Create a new GameState instance and deserialize
                const restoredGameState = new GameState();
                restoredGameState.deserialize(serializedData);
                
                // Verify that the restored state matches the original
                
                // Check basic properties
                expect(restoredGameState.currentTurn).toBe(gameState.currentTurn);
                expect(restoredGameState.activePlayer).toBe(gameState.activePlayer);
                
                // Check players
                expect(restoredGameState.players).toHaveLength(gameState.players.length);
                
                for (let i = 0; i < gameState.players.length; i++) {
                    const original = gameState.players[i];
                    const restored = restoredGameState.players[i];
                    
                    expect(restored.id).toBe(original.id);
                    expect(restored.name).toBe(original.name);
                    expect(restored.faction).toBe(original.faction);
                    expect(restored.color).toBe(original.color);
                    expect(restored.isAI).toBe(original.isAI);
                    expect(restored.isEliminated).toBe(original.isEliminated);
                    expect(restored.resources.gold).toBe(original.resources.gold);
                    expect(restored.hasActed).toBe(original.hasActed);
                    
                    // Check stats
                    expect(restored.stats.unitsLost).toBe(original.stats.unitsLost);
                    expect(restored.stats.unitsKilled).toBe(original.stats.unitsKilled);
                    expect(restored.stats.citiesCapture).toBe(original.stats.citiesCapture);
                    expect(restored.stats.citiesLost).toBe(original.stats.citiesLost);
                    expect(restored.stats.battlesWon).toBe(original.stats.battlesWon);
                    expect(restored.stats.battlesLost).toBe(original.stats.battlesLost);
                }
                
                // Check units
                expect(restoredGameState.units.size).toBe(gameState.units.size);
                for (const [unitId, unitData] of gameState.units) {
                    expect(restoredGameState.units.has(unitId)).toBe(true);
                    const restoredUnit = restoredGameState.units.get(unitId);
                    expect(restoredUnit).toEqual(unitData);
                }
                
                // Check cities
                expect(restoredGameState.cities.size).toBe(gameState.cities.size);
                for (const [cityId, cityData] of gameState.cities) {
                    expect(restoredGameState.cities.has(cityId)).toBe(true);
                    const restoredCity = restoredGameState.cities.get(cityId);
                    expect(restoredCity).toEqual(cityData);
                }
                
                // The property holds: serialization then deserialization preserves state
                return true;
            }),
            { 
                numRuns: 100,
                verbose: true
            }
        );
    });

    // Additional edge case tests for serialization
    test('should handle empty game state serialization', () => {
        const gameState = new GameState();
        
        // Initialize with minimal valid state
        gameState.players = [new Player(0, 'Test Player', 'HUMANS', '#FF0000', false)];
        gameState.currentTurn = 1;
        gameState.activePlayer = 0;
        
        const serialized = gameState.serialize();
        const restored = new GameState();
        restored.deserialize(serialized);
        
        expect(restored.currentTurn).toBe(1);
        expect(restored.activePlayer).toBe(0);
        expect(restored.players).toHaveLength(1);
        expect(restored.units.size).toBe(0);
        expect(restored.cities.size).toBe(0);
    });

    test('should handle game state with only units', () => {
        const gameState = new GameState();
        
        // Set up minimal state with units
        gameState.players = [new Player(0, 'Test Player', 'HUMANS', '#FF0000', false)];
        gameState.currentTurn = 5;
        gameState.activePlayer = 0;
        gameState.units.set('unit1', { id: 'unit1', type: 'WARRIOR', owner: 0 });
        gameState.units.set('unit2', { id: 'unit2', type: 'ARCHER', owner: 0 });
        
        const serialized = gameState.serialize();
        const restored = new GameState();
        restored.deserialize(serialized);
        
        expect(restored.units.size).toBe(2);
        expect(restored.units.get('unit1')).toEqual({ id: 'unit1', type: 'WARRIOR', owner: 0 });
        expect(restored.units.get('unit2')).toEqual({ id: 'unit2', type: 'ARCHER', owner: 0 });
    });

    test('should handle game state with only cities', () => {
        const gameState = new GameState();
        
        // Set up minimal state with cities
        gameState.players = [new Player(0, 'Test Player', 'HUMANS', '#FF0000', false)];
        gameState.currentTurn = 3;
        gameState.activePlayer = 0;
        gameState.cities.set('city1', { id: 'city1', name: 'Capital', owner: 0 });
        gameState.cities.set('city2', { id: 'city2', name: 'Outpost', owner: 0 });
        
        const serialized = gameState.serialize();
        const restored = new GameState();
        restored.deserialize(serialized);
        
        expect(restored.cities.size).toBe(2);
        expect(restored.cities.get('city1')).toEqual({ id: 'city1', name: 'Capital', owner: 0 });
        expect(restored.cities.get('city2')).toEqual({ id: 'city2', name: 'Outpost', owner: 0 });
    });
});