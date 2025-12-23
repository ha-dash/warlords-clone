/**
 * Test for Unit.attack method integration with CombatSystem
 */

import { Unit, UNIT_TYPES } from '../core/Unit.js';
import { Hero } from '../core/Hero.js';
import { Hex, TERRAIN_TYPES } from '../core/Hex.js';

describe('Unit Attack Integration', () => {
    let attacker;
    let defender;
    let terrain;
    
    beforeEach(() => {
        attacker = new Unit(UNIT_TYPES.WARRIOR, 0, 0, 0);
        defender = new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0);
        terrain = new Hex(1, 0, TERRAIN_TYPES.FOREST);
    });
    
    test('unit attackSync method works with terrain bonuses', () => {
        const result = attacker.attackSync(defender, terrain);
        
        expect(result.success).toBe(true);
        expect(result.attacker).toBe(attacker);
        expect(result.target).toBe(defender);
        expect(result.terrain).toBe(terrain);
        expect(result.terrainDefenseBonus).toBe(1); // Forest bonus
        expect(typeof result.damage).toBe('number');
        expect(result.damage).toBeGreaterThanOrEqual(0);
        expect(attacker.hasActed).toBe(true);
    });
    
    test('hero gains experience when using attackSync', () => {
        const hero = new Hero('TestHero', 0, 0, 0);
        const enemy = new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0);
        
        const initialExperience = hero.experience;
        
        // Make sure hero wins
        hero.baseAttack = 20;
        enemy.health = 1;
        
        const result = hero.attackSync(enemy, terrain);
        
        expect(result.success).toBe(true);
        expect(result.defenderKilled).toBe(true);
        expect(hero.experience).toBeGreaterThan(initialExperience);
    });
    
    test('minimum damage is applied on successful hit', () => {
        // Set up scenario where attack barely succeeds
        attacker.baseAttack = 1;
        defender.baseDefense = 1;
        
        // Run multiple attacks to test minimum damage
        let foundMinimumDamage = false;
        for (let i = 0; i < 50; i++) {
            const testAttacker = new Unit(UNIT_TYPES.WARRIOR, 0, 0, 0);
            const testDefender = new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0);
            testAttacker.baseAttack = 1;
            testDefender.baseDefense = 1;
            
            const result = testAttacker.attackSync(testDefender);
            
            if (result.damage > 0) {
                expect(result.damage).toBeGreaterThanOrEqual(1);
                foundMinimumDamage = true;
            }
        }
        
        expect(foundMinimumDamage).toBe(true);
    });
    
    test('dead units cannot attack', () => {
        attacker.health = 0;
        
        const result = attacker.attackSync(defender);
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('Dead unit cannot attack');
    });
    
    test('units that have acted cannot attack again', () => {
        attacker.hasActed = true;
        
        const result = attacker.attackSync(defender);
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('already acted');
    });
});