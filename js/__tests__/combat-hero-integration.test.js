/**
 * Integration test for Combat System and Hero Experience
 * Verifies that heroes gain experience when winning combat
 */

import { CombatSystem } from '../core/CombatSystem.js';
import { Hero } from '../core/Hero.js';
import { Unit, UNIT_TYPES } from '../core/Unit.js';
import { Hex, TERRAIN_TYPES } from '../core/Hex.js';

describe('Combat System and Hero Experience Integration', () => {
    let hero;
    let enemy;
    let terrain;
    
    beforeEach(() => {
        hero = new Hero('TestHero', 0, 0, 0);
        enemy = new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0);
        terrain = new Hex(1, 0, TERRAIN_TYPES.PLAINS);
    });
    
    test('hero gains experience when winning combat', () => {
        const initialExperience = hero.experience;
        const initialLevel = hero.level;
        
        // Ensure hero will win by giving high attack
        hero.baseAttack = 20;
        enemy.health = 1; // Make enemy easy to kill
        
        const result = CombatSystem.resolveCombat(hero, enemy, terrain);
        
        expect(result.success).toBe(true);
        expect(result.defenderKilled).toBe(true);
        expect(hero.experience).toBeGreaterThan(initialExperience);
        
        console.log(`Hero gained ${hero.experience - initialExperience} experience`);
    });
    
    test('hero levels up when gaining enough experience', () => {
        // Set hero close to level up
        hero.experience = 95; // Need 100 for level 2
        hero.baseAttack = 20;
        enemy.health = 1;
        
        const initialLevel = hero.level;
        const result = CombatSystem.resolveCombat(hero, enemy, terrain);
        
        expect(result.success).toBe(true);
        expect(result.defenderKilled).toBe(true);
        expect(hero.level).toBeGreaterThan(initialLevel);
        
        console.log(`Hero leveled up from ${initialLevel} to ${hero.level}`);
    });
    
    test('experience calculation varies by enemy type', () => {
        const heroEnemy = new Hero('EnemyHero', 1, 1, 0);
        const warriorEnemy = new Unit(UNIT_TYPES.WARRIOR, 1, 1, 0);
        
        const heroExp = CombatSystem.calculateExperienceGain(hero, heroEnemy);
        const warriorExp = CombatSystem.calculateExperienceGain(hero, warriorEnemy);
        
        expect(heroExp).toBeGreaterThan(warriorExp);
        console.log(`Hero vs Hero: ${heroExp} exp, Hero vs Warrior: ${warriorExp} exp`);
    });
    
    test('level difference affects experience gain', () => {
        const lowLevelEnemy = new Hero('Weak', 1, 1, 0);
        const highLevelEnemy = new Hero('Strong', 1, 1, 0);
        
        lowLevelEnemy.level = 1;
        highLevelEnemy.level = 3;
        hero.level = 2;
        
        const lowExp = CombatSystem.calculateExperienceGain(hero, lowLevelEnemy);
        const highExp = CombatSystem.calculateExperienceGain(hero, highLevelEnemy);
        
        expect(highExp).toBeGreaterThan(lowExp);
        console.log(`vs Lower level: ${lowExp} exp, vs Higher level: ${highExp} exp`);
    });
    
    test('non-heroes do not gain experience', () => {
        const warrior = new Unit(UNIT_TYPES.WARRIOR, 0, 0, 0);
        const experience = CombatSystem.calculateExperienceGain(warrior, enemy);
        
        expect(experience).toBe(0);
    });
    
    test('hero stats increase with level', () => {
        const initialAttack = hero.getAttackValue();
        const initialDefense = hero.getDefenseValue();
        const initialHealth = hero.getMaxHealth();
        
        // Force level up
        hero.experience = 1000;
        hero.checkLevelUp();
        
        expect(hero.level).toBeGreaterThan(1);
        expect(hero.getAttackValue()).toBeGreaterThanOrEqual(initialAttack);
        expect(hero.getDefenseValue()).toBeGreaterThanOrEqual(initialDefense);
        expect(hero.getMaxHealth()).toBeGreaterThan(initialHealth);
        
        console.log(`Level ${hero.level}: ATK ${hero.getAttackValue()}, DEF ${hero.getDefenseValue()}, HP ${hero.getMaxHealth()}`);
    });
});