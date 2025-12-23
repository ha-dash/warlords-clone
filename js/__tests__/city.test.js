/**
 * City class tests
 * Tests city ownership, unit production, and resource management
 */

import { City } from '../core/City.js';
import { Player } from '../core/Player.js';
import { UNIT_TYPES } from '../core/Unit.js';
import { factionManager } from '../core/Faction.js';

describe('City', () => {
    let players;
    let city;
    
    beforeEach(() => {
        // Create test players
        players = [
            new Player(0, 'Player 1', 'HUMANS', '#0066CC', false),
            new Player(1, 'Player 2', 'ELVES', '#00CC66', false)
        ];
        
        // Create test city
        city = new City('Test City', 0, 5, 5, 2);
    });
    
    describe('Constructor', () => {
        test('should create city with valid parameters', () => {
            expect(city.name).toBe('Test City');
            expect(city.owner).toBe(0);
            expect(city.x).toBe(5);
            expect(city.y).toBe(5);
            expect(city.size).toBe(2);
            expect(city.id).toBeDefined();
            expect(city.production).toEqual([]);
            expect(city.garrison).toEqual([]);
        });
        
        test('should throw error with invalid parameters', () => {
            expect(() => new City('', 0, 5, 5)).toThrow('Invalid city name');
            expect(() => new City('Test', -1, 5, 5)).toThrow('Invalid owner');
            expect(() => new City('Test', 0, 'x', 5)).toThrow('Invalid coordinates');
            expect(() => new City('Test', 0, 5, 5, 0)).toThrow('Invalid city size');
        });
        
        test('should calculate gold and production based on size', () => {
            const smallCity = new City('Small', 0, 0, 0, 1);
            const largeCity = new City('Large', 0, 0, 0, 3);
            
            expect(smallCity.goldPerTurn).toBe(50);
            expect(smallCity.productionCapacity).toBe(10);
            expect(largeCity.goldPerTurn).toBe(150);
            expect(largeCity.productionCapacity).toBe(30);
        });
    });
    
    describe('Faction and Unit Production', () => {
        test('should get owner faction correctly', () => {
            expect(city.getOwnerFaction(players)).toBe('HUMANS');
            
            city.owner = 1;
            expect(city.getOwnerFaction(players)).toBe('ELVES');
        });
        
        test('should check if can produce unit types', () => {
            // Humans can produce basic units
            expect(city.canProduce(UNIT_TYPES.WARRIOR, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.ARCHER, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.CAVALRY, players)).toBe(true);
            expect(city.canProduce(UNIT_TYPES.HERO, players)).toBe(true);
            
            // Invalid unit type
            expect(city.canProduce('INVALID_UNIT', players)).toBe(false);
        });
        
        test('should get production costs correctly', () => {
            expect(city.getProductionCost(UNIT_TYPES.WARRIOR, players)).toBe(50);
            expect(city.getProductionCost(UNIT_TYPES.ARCHER, players)).toBe(60);
            expect(city.getProductionCost(UNIT_TYPES.CAVALRY, players)).toBe(80);
            expect(city.getProductionCost(UNIT_TYPES.HERO, players)).toBe(0);
            
            // Invalid unit type
            expect(city.getProductionCost('INVALID_UNIT', players)).toBe(-1);
        });
        
        test('should get available units for faction', () => {
            const availableUnits = city.getAvailableUnits(players);
            expect(availableUnits).toContain(UNIT_TYPES.WARRIOR);
            expect(availableUnits).toContain(UNIT_TYPES.ARCHER);
            expect(availableUnits).toContain(UNIT_TYPES.CAVALRY);
            expect(availableUnits).toContain(UNIT_TYPES.HERO);
        });
    });
    
    describe('Unit Production', () => {
        test('should start production when player can afford it', () => {
            const player = players[0];
            player.resources.gold = 1000;
            
            const result = city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(result).toBe(true);
            expect(city.currentProduction).toBe(UNIT_TYPES.WARRIOR);
            expect(city.productionProgress).toBe(0);
            expect(player.resources.gold).toBe(950); // 1000 - 50
        });
        
        test('should fail production when player cannot afford it', () => {
            const player = players[0];
            player.resources.gold = 10; // Not enough for warrior (50 gold)
            
            const result = city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(result).toBe(false);
            expect(city.currentProduction).toBe(null);
            expect(player.resources.gold).toBe(10); // Unchanged
        });
        
        test('should fail production when already producing', () => {
            const player = players[0];
            player.resources.gold = 1000;
            
            // Start first production
            city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(city.currentProduction).toBe(UNIT_TYPES.WARRIOR);
            
            // Try to start second production
            const result = city.produceUnit(UNIT_TYPES.ARCHER, players);
            expect(result).toBe(false);
            expect(city.currentProduction).toBe(UNIT_TYPES.WARRIOR); // Still producing warrior
        });
        
        test('should process production over multiple turns', () => {
            const player = players[0];
            player.resources.gold = 1000;
            
            // Start production
            city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(city.currentProduction).toBe(UNIT_TYPES.WARRIOR);
            
            // Process production (warrior needs 50 points, city produces 20 per turn)
            let completed = city.processProduction();
            expect(completed).toBe(null); // Not complete yet
            expect(city.productionProgress).toBe(20);
            
            completed = city.processProduction();
            expect(completed).toBe(null); // Still not complete
            expect(city.productionProgress).toBe(40);
            
            completed = city.processProduction();
            expect(completed).toBe(UNIT_TYPES.WARRIOR); // Complete!
            expect(city.currentProduction).toBe(null);
            expect(city.productionProgress).toBe(0);
        });
        
        test('should cancel production with partial refund', () => {
            const player = players[0];
            player.resources.gold = 1000;
            
            // Start production
            city.produceUnit(UNIT_TYPES.WARRIOR, players);
            expect(player.resources.gold).toBe(950);
            
            // Make some progress
            city.processProduction();
            expect(city.productionProgress).toBe(20);
            
            // Cancel production
            const cancelled = city.cancelProduction(players);
            expect(cancelled).toBe(true);
            expect(city.currentProduction).toBe(null);
            expect(city.productionProgress).toBe(0);
            
            // Should get partial refund (60% progress means 40% refund = 20 gold)
            expect(player.resources.gold).toBeGreaterThan(950);
        });
    });
    
    describe('City Ownership', () => {
        test('should change ownership correctly', () => {
            expect(city.owner).toBe(0);
            
            city.changeOwner(1, players);
            expect(city.owner).toBe(1);
            expect(city.currentProduction).toBe(null); // Production cancelled
            expect(city.garrison).toEqual([]); // Garrison cleared
        });
        
        test('should update player statistics on ownership change', () => {
            const oldPlayer = players[0];
            const newPlayer = players[1];
            
            // Track initial stats
            const oldPlayerInitialLosses = oldPlayer.stats.citiesLost;
            const newPlayerInitialCaptures = newPlayer.stats.citiesCapture;
            
            city.changeOwner(1, players);
            
            expect(oldPlayer.stats.citiesLost).toBe(oldPlayerInitialLosses + 1);
            expect(newPlayer.stats.citiesCapture).toBe(newPlayerInitialCaptures + 1);
        });
    });
    
    describe('Turn Processing', () => {
        test('should generate gold for owner', () => {
            const player = players[0];
            const initialGold = player.resources.gold;
            
            const results = city.processTurn(players);
            
            expect(results.goldGenerated).toBe(city.goldPerTurn);
            expect(player.resources.gold).toBe(initialGold + city.goldPerTurn);
        });
        
        test('should complete unit production during turn processing', () => {
            const player = players[0];
            player.resources.gold = 1000;
            
            // Start production and advance to near completion
            city.produceUnit(UNIT_TYPES.WARRIOR, players);
            city.productionProgress = 45; // Almost done (needs 50)
            
            const results = city.processTurn(players);
            
            expect(results.unitCompleted).toBe(UNIT_TYPES.WARRIOR);
            expect(city.currentProduction).toBe(null);
        });
    });
    
    describe('Serialization', () => {
        test('should serialize and deserialize correctly', () => {
            // Set up city state
            city.currentProduction = UNIT_TYPES.WARRIOR;
            city.productionProgress = 25;
            
            // Serialize
            const serialized = city.serialize();
            expect(serialized.name).toBe(city.name);
            expect(serialized.owner).toBe(city.owner);
            expect(serialized.currentProduction).toBe(UNIT_TYPES.WARRIOR);
            expect(serialized.productionProgress).toBe(25);
            
            // Deserialize
            const deserialized = City.deserialize(serialized);
            expect(deserialized.name).toBe(city.name);
            expect(deserialized.owner).toBe(city.owner);
            expect(deserialized.x).toBe(city.x);
            expect(deserialized.y).toBe(city.y);
            expect(deserialized.size).toBe(city.size);
            expect(deserialized.currentProduction).toBe(UNIT_TYPES.WARRIOR);
            expect(deserialized.productionProgress).toBe(25);
        });
    });
    
    describe('Status and Information', () => {
        test('should provide comprehensive status', () => {
            const status = city.getStatus(players);
            
            expect(status.id).toBe(city.id);
            expect(status.name).toBe(city.name);
            expect(status.owner).toBe(city.owner);
            expect(status.ownerFaction).toBe('HUMANS');
            expect(status.position).toEqual({ x: 5, y: 5 });
            expect(status.size).toBe(2);
            expect(status.goldPerTurn).toBe(100);
            expect(status.productionCapacity).toBe(20);
            expect(status.availableUnits).toContain(UNIT_TYPES.WARRIOR);
        });
        
        test('should have meaningful string representation', () => {
            const str = city.toString();
            expect(str).toContain(city.name);
            expect(str).toContain(city.id);
            expect(str).toContain('5, 5');
            expect(str).toContain('Owner: 0');
            expect(str).toContain('Size: 2');
        });
    });
});