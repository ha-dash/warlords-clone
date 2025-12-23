/**
 * City integration tests
 * Tests city integration with GameState, Map, and other game systems
 */

import { City } from '../core/City.js';
import { GameState } from '../core/GameState.js';
import { Player } from '../core/Player.js';
import { UNIT_TYPES } from '../core/Unit.js';
import { Map as GameMap } from '../core/Map.js';
import { Hex, TERRAIN_TYPES } from '../core/Hex.js';

describe('City Integration', () => {
    let gameState;
    let city;
    let map;
    
    beforeEach(() => {
        // Create game state with test configuration
        gameState = new GameState();
        
        const config = {
            map: {
                width: 10,
                height: 10
            },
            players: [
                { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                { id: 1, name: 'Player 2', faction: 'ELVES', color: '#00CC66', isAI: false }
            ]
        };
        
        gameState.initialize(config);
        map = gameState.getMap();
        
        // Create test city
        city = new City('Test City', 0, 5, 5, 2);
    });
    
    describe('GameState Integration', () => {
        test('should add and retrieve cities from game state', () => {
            gameState.addCity(city);
            
            expect(gameState.getCity(city.id)).toBe(city);
            expect(gameState.cities.size).toBe(1);
        });
        
        test('should get player cities correctly', () => {
            const city1 = new City('City 1', 0, 3, 3, 1);
            const city2 = new City('City 2', 0, 7, 7, 1);
            const city3 = new City('City 3', 1, 2, 8, 1);
            
            gameState.addCity(city1);
            gameState.addCity(city2);
            gameState.addCity(city3);
            
            const player0Cities = gameState.getPlayerCities(0);
            const player1Cities = gameState.getPlayerCities(1);
            
            expect(player0Cities).toHaveLength(2);
            expect(player1Cities).toHaveLength(1);
            expect(player0Cities).toContain(city1);
            expect(player0Cities).toContain(city2);
            expect(player1Cities).toContain(city3);
        });
        
        test('should remove cities from game state', () => {
            gameState.addCity(city);
            expect(gameState.cities.size).toBe(1);
            
            gameState.removeCity(city.id);
            expect(gameState.cities.size).toBe(0);
            expect(gameState.getCity(city.id)).toBe(null);
        });
    });
    
    describe('Map Integration', () => {
        test('should place city on map hex', () => {
            const hex = map.getHex(5, 5);
            expect(hex).toBeDefined();
            
            // Place city on hex
            hex.setCity(city);
            
            expect(hex.hasCity()).toBe(true);
            expect(hex.city).toBe(city);
        });
        
        test('should remove city from map hex', () => {
            const hex = map.getHex(5, 5);
            hex.setCity(city);
            
            expect(hex.hasCity()).toBe(true);
            
            hex.removeCity();
            expect(hex.hasCity()).toBe(false);
            expect(hex.city).toBe(null);
        });
        
        test('should handle city placement on different terrain types', () => {
            const plainsHex = map.getHex(1, 1);
            const forestHex = map.getHex(2, 2);
            const mountainHex = map.getHex(3, 3);
            
            // Set different terrain types
            plainsHex.terrain = TERRAIN_TYPES.PLAINS;
            forestHex.terrain = TERRAIN_TYPES.FOREST;
            mountainHex.terrain = TERRAIN_TYPES.MOUNTAIN;
            
            // Cities should be placeable on all land terrain
            const city1 = new City('Plains City', 0, 1, 1, 1);
            const city2 = new City('Forest City', 0, 2, 2, 1);
            const city3 = new City('Mountain City', 0, 3, 3, 1);
            
            plainsHex.setCity(city1);
            forestHex.setCity(city2);
            mountainHex.setCity(city3);
            
            expect(plainsHex.hasCity()).toBe(true);
            expect(forestHex.hasCity()).toBe(true);
            expect(mountainHex.hasCity()).toBe(true);
        });
    });
    
    describe('Player Integration', () => {
        test('should work with player gold system', () => {
            const players = gameState.getPlayers();
            const player = players[0];
            
            // Set player gold
            player.resources.gold = 500;
            
            // Test production with player gold
            const result = city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(result).toBe(true);
            expect(player.resources.gold).toBe(450); // 500 - 50
        });
        
        test('should handle city ownership changes with player stats', () => {
            const players = gameState.getPlayers();
            const player1 = players[0];
            const player2 = players[1];
            
            // Track initial stats
            const initialLosses = player1.stats.citiesLost;
            const initialCaptures = player2.stats.citiesCapture;
            
            // Change city ownership
            city.changeOwner(1, players);
            
            expect(city.owner).toBe(1);
            expect(player1.stats.citiesLost).toBe(initialLosses + 1);
            expect(player2.stats.citiesCapture).toBe(initialCaptures + 1);
        });
        
        test('should process city turns and generate gold for players', () => {
            const players = gameState.getPlayers();
            const player = players[0];
            const initialGold = player.resources.gold;
            
            // Process city turn
            const results = city.processTurn(players);
            
            expect(results.goldGenerated).toBe(city.goldPerTurn);
            expect(player.resources.gold).toBe(initialGold + city.goldPerTurn);
        });
    });
    
    describe('Faction Integration', () => {
        test('should respect faction unit production rules', () => {
            const players = gameState.getPlayers();
            
            // Human city should be able to produce human units
            expect(city.canProduce(UNIT_TYPES.WARRIOR, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.ARCHER, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.CAVALRY, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.HERO, players)).toBe(true);
            
            // Change to elf city
            city.changeOwner(1, players);
            
            // Should still be able to produce basic units (elves have them too)
            expect(city.canProduce(UNIT_TYPES.ARCHER, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.HERO, players)).toBe(true);
        });
        
        test('should get correct production costs for different factions', () => {
            const players = gameState.getPlayers();
            
            // Human costs
            expect(city.getProductionCost(UNIT_TYPES.WARRIOR, players)).toBe(50);
            expect(city.getProductionCost(UNIT_TYPES.ARCHER, players)).toBe(60);
            
            // Change to elf city (elves have cheaper archers)
            city.changeOwner(1, players);
            expect(city.getProductionCost(UNIT_TYPES.ARCHER, players)).toBe(50); // Cheaper for elves
        });
    });
    
    describe('Serialization Integration', () => {
        test('should serialize and deserialize with game state', () => {
            // Add city to game state
            gameState.addCity(city);
            
            // Set up some state
            city.currentProduction = UNIT_TYPES.WARRIOR;
            city.productionProgress = 25;
            
            // Serialize game state
            const serialized = gameState.serialize();
            
            // Create new game state and deserialize
            const newGameState = new GameState();
            newGameState.deserialize(serialized);
            
            // Check city was restored
            const restoredCity = newGameState.getCity(city.id);
            expect(restoredCity).toBeDefined();
            expect(restoredCity.name).toBe(city.name);
            expect(restoredCity.owner).toBe(city.owner);
            expect(restoredCity.currentProduction).toBe(UNIT_TYPES.WARRIOR);
            expect(restoredCity.productionProgress).toBe(25);
        });
    });
    
    describe('Complete City Workflow', () => {
        test('should handle complete city production workflow', () => {
            const players = gameState.getPlayers();
            const player = players[0];
            
            // Add city to game state and map
            gameState.addCity(city);
            const hex = map.getHex(city.x, city.y);
            hex.setCity(city);
            
            // Set player gold
            player.resources.gold = 1000;
            
            // Start production
            const startResult = city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(startResult).toBe(true);
            expect(player.resources.gold).toBe(950);
            
            // Process several turns until unit is complete
            let completed = null;
            let turns = 0;
            while (!completed && turns < 10) {
                const turnResult = city.processTurn(players);
                completed = turnResult.unitCompleted;
                turns++;
            }
            
            expect(completed).toBe(UNIT_TYPES.WARRIOR);
            expect(city.currentProduction).toBe(null);
            expect(turns).toBeGreaterThan(0);
            expect(turns).toBeLessThan(10); // Should complete within reasonable time
        });
    });
});