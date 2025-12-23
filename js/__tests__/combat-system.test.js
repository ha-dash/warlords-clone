/**
 * Unit tests for CombatSystem
 * Tests combat resolution, damage calculation, and terrain bonuses
 */

import { CombatSystem } from '../core/CombatSystem.js';
import { Unit, UNIT_TYPES } from '../core/Unit.js';
import { Hero } from '../core/Hero.js';
import { Hex, TERRAIN_TYPES } from '../core/Hex.js';

describe('CombatSystem', () => {
    let attacker;
    let defender;
    let plainsTerrain;
    let forestTerrain;
    
    beforeEach(() => {
        attacker = new Unit(UNIT_TYPES.WARRIOR, 0, 0, 0);
        defender = new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0);
        plainsTerrain = new Hex(1, 0, TERRAIN_TYPES.PLAINS);
        forestTerrain = new Hex(1, 0, TERRAIN_TYPES.FOREST);
    });
    
    test('combat resolution returns valid result', () => {
        const result = CombatSystem.resolveCombat(attacker, defender, plainsTerrain);
        
        expect(result.success).toBe(true);
        expect(result.attacker).toBe(attacker);
        expect(result.defender).toBe(defender);
        expect(result.terrain).toBe(plainsTerrain);
        expect(typeof result.damage).toBe('number');
        expect(result.damage).toBeGreaterThanOrEqual(0);
        expect(typeof result.attackRoll).toBe('number');
        expect(result.attackRoll).toBeGreaterThanOrEqual(1);
        expect(result.attackRoll).toBeLessThanOrEqual(6);
        expect(typeof result.defenseRoll).toBe('number');
        expect(result.defenseRoll).toBeGreaterThanOrEqual(1);
        expect(result.defenseRoll).toBeLessThanOrEqual(6);
    });
    
    test('terrain defense bonus is applied', () => {
        // Forest gives +1 defense bonus
        const plainsResult = CombatSystem.resolveCombat(attacker, defender, plainsTerrain);
        const forestResult = CombatSystem.resolveCombat(attacker, defender, forestTerrain);
        
        expect(plainsResult.terrainDefenseBonus).toBe(0);
        expect(forestResult.terrainDefenseBonus).toBe(1);
        expect(forestResult.totalDefense).toBe(forestResult.defenseValue + forestResult.defenseRoll + 1);
    });
    
    test('attacker is marked as having acted after combat', () => {
        expect(attacker.hasActed).toBe(false);
        
        CombatSystem.resolveCombat(attacker, defender, plainsTerrain);
        
        expect(attacker.hasActed).toBe(true);
    });
    
    test('dead units cannot participate in combat', () => {
        defender.health = 0;
        
        const result = CombatSystem.resolveCombat(attacker, defender, plainsTerrain);
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('Dead units cannot participate in combat');
    });
    
    test('units that have already acted cannot attack', () => {
        attacker.hasActed = true;
        
        const eligibility = CombatSystem.canEngageInCombat(attacker, defender);
        
        expect(eligibility.canFight).toBe(false);
        expect(eligibility.reason).toContain('already acted');
    });
    
    test('units of same player cannot fight each other', () => {
        defender.owner = attacker.owner;
        
        const eligibility = CombatSystem.canEngageInCombat(attacker, defender);
        
        expect(eligibility.canFight).toBe(false);
        expect(eligibility.reason).toContain('same player');
    });
    
    test('dice roll returns value between 1 and 6', () => {
        for (let i = 0; i < 100; i++) {
            const roll = CombatSystem.rollDice();
            expect(roll).toBeGreaterThanOrEqual(1);
            expect(roll).toBeLessThanOrEqual(6);
            expect(Number.isInteger(roll)).toBe(true);
        }
    });
    
    test('combat simulation returns reasonable results', () => {
        const simulation = CombatSystem.simulateCombat(attacker, defender, plainsTerrain, 100);
        
        expect(simulation.attackerWinRate).toBeGreaterThanOrEqual(0);
        expect(simulation.attackerWinRate).toBeLessThanOrEqual(1);
        expect(simulation.defenderWinRate).toBeGreaterThanOrEqual(0);
        expect(simulation.defenderWinRate).toBeLessThanOrEqual(1);
        expect(simulation.iterations).toBe(100);
        expect(typeof simulation.averageDamageToDefender).toBe('number');
    });
    
    test('combat preview provides useful information', () => {
        const preview = CombatSystem.getCombatPreview(attacker, defender, forestTerrain);
        
        expect(preview).toBeTruthy();
        expect(preview.attacker.name).toBe(attacker.getDisplayName());
        expect(preview.defender.name).toBe(defender.getDisplayName());
        expect(preview.defender.terrainBonus).toBe(1); // Forest bonus
        expect(preview.terrain).toBe('Forest');
        expect(typeof preview.attacker.winRate).toBe('number');
        expect(typeof preview.defender.winRate).toBe('number');
    });
    
    test('minimum damage is 1 on successful hit', () => {
        // Set up scenario where attack barely succeeds
        attacker.baseAttack = 1;
        defender.baseDefense = 1;
        
        // Run multiple combats to test minimum damage
        let foundMinimumDamage = false;
        for (let i = 0; i < 50; i++) {
            const result = CombatSystem.resolveCombat(
                new Unit(UNIT_TYPES.WARRIOR, 0, 0, 0),
                new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0),
                plainsTerrain
            );
            
            if (result.damage > 0) {
                expect(result.damage).toBeGreaterThanOrEqual(1);
                foundMinimumDamage = true;
            }
        }
        
        // We should have found at least one case where damage was dealt
        expect(foundMinimumDamage).toBe(true);
    });
});