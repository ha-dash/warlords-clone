/**
 * Item and Spell System Tests
 * Tests the integration of items and spells with heroes
 */

import { Hero } from '../core/Hero.js';
import { Item, ITEM_TEMPLATES } from '../core/Item.js';
import { Spell, SPELL_TEMPLATES } from '../core/Spell.js';
import { ItemGenerator } from '../core/ItemGenerator.js';
import { SpellGenerator } from '../core/SpellGenerator.js';

describe('Item System', () => {
    let hero;
    
    beforeEach(() => {
        hero = new Hero('TestHero', 0, 5, 5);
    });
    
    test('should create items from templates', () => {
        const sword = new Item('IRON_SWORD');
        
        expect(sword.name).toBe('Iron Sword');
        expect(sword.type).toBe('WEAPON');
        expect(sword.attackBonus).toBe(2);
        expect(sword.isConsumable).toBe(false);
    });
    
    test('should allow heroes to equip items', () => {
        const sword = new Item('IRON_SWORD');
        const success = hero.equipItem(sword);
        
        expect(success).toBe(true);
        expect(hero.items).toContain(sword);
        expect(sword.isEquipped).toBe(true);
    });
    
    test('should apply item bonuses to hero stats', () => {
        const baseAttack = hero.getAttackValue();
        const sword = new Item('IRON_SWORD');
        
        hero.equipItem(sword);
        
        expect(hero.getAttackValue()).toBe(baseAttack + sword.attackBonus);
    });
    
    test('should allow heroes to use consumable items', () => {
        const potion = new Item('HEALING_POTION');
        hero.items.push(potion); // Add to inventory directly
        
        // Damage hero first
        hero.takeDamage(10);
        const healthBefore = hero.health;
        
        const result = hero.useItem(potion.id);
        
        expect(result.success).toBe(true);
        expect(hero.health).toBeGreaterThan(healthBefore);
        expect(hero.items).not.toContain(potion); // Should be consumed
    });
    
    test('should create random items', () => {
        const item = Item.createRandom();
        
        expect(item).toBeInstanceOf(Item);
        expect(item.name).toBeDefined();
        expect(item.type).toBeDefined();
    });
    
    test('should serialize and deserialize items', () => {
        const originalItem = new Item('STEEL_SWORD');
        const serialized = originalItem.serialize();
        const deserialized = Item.deserialize(serialized);
        
        expect(deserialized.name).toBe(originalItem.name);
        expect(deserialized.type).toBe(originalItem.type);
        expect(deserialized.attackBonus).toBe(originalItem.attackBonus);
    });
});

describe('Spell System', () => {
    let hero;
    
    beforeEach(() => {
        hero = new Hero('TestMage', 0, 5, 5);
        hero.level = 3; // Give hero some levels for mana
    });
    
    test('should create spells from templates', () => {
        const spell = new Spell('MAGIC_MISSILE');
        
        expect(spell.name).toBe('Magic Missile');
        expect(spell.type).toBe('OFFENSIVE');
        expect(spell.manaCost).toBe(3);
        expect(spell.power).toBe(8);
    });
    
    test('should allow heroes to learn spells', () => {
        const spell = new Spell('HEAL');
        const success = hero.learnSpell(spell);
        
        expect(success).toBe(true);
        expect(hero.spells).toContain(spell);
    });
    
    test('should prevent learning spells that are too high level', () => {
        const lowLevelHero = new Hero('Novice', 0, 5, 5);
        const highLevelSpell = new Spell('METEOR');
        
        const success = lowLevelHero.learnSpell(highLevelSpell);
        
        expect(success).toBe(false);
        expect(lowLevelHero.spells).not.toContain(highLevelSpell);
    });
    
    test('should allow heroes to cast spells', () => {
        const spell = new Spell('CURE_LIGHT_WOUNDS');
        hero.learnSpell(spell);
        
        // Damage hero first
        hero.takeDamage(10);
        const healthBefore = hero.health;
        const manaBefore = hero.mana;
        
        const result = hero.castSpell(spell.id);
        
        expect(result.success).toBe(true);
        expect(hero.health).toBeGreaterThan(healthBefore);
        expect(hero.mana).toBe(manaBefore - spell.manaCost);
        expect(hero.hasActed).toBe(true);
    });
    
    test('should prevent casting spells without enough mana', () => {
        const spell = new Spell('HEAL'); // Lower mana cost spell
        hero.learnSpell(spell);
        hero.mana = 1; // Not enough mana (HEAL costs 4)
        
        const result = hero.castSpell(spell.id);
        
        expect(result.success).toBe(false);
        expect(result.reason).toBe('Not enough mana');
    });
    
    test('should restore mana each turn', () => {
        hero.mana = 5;
        const manaBefore = hero.mana;
        
        hero.resetForTurn();
        
        expect(hero.mana).toBeGreaterThan(manaBefore);
    });
    
    test('should serialize and deserialize spells', () => {
        const originalSpell = new Spell('FIREBALL');
        const serialized = originalSpell.serialize();
        const deserialized = Spell.deserialize(serialized);
        
        expect(deserialized.name).toBe(originalSpell.name);
        expect(deserialized.type).toBe(originalSpell.type);
        expect(deserialized.manaCost).toBe(originalSpell.manaCost);
        expect(deserialized.power).toBe(originalSpell.power);
    });
});

describe('ItemGenerator', () => {
    let hero;
    
    beforeEach(() => {
        hero = new Hero('Explorer', 0, 5, 5);
        hero.level = 5;
    });
    
    test('should generate exploration results', () => {
        const result = ItemGenerator.exploreLocation(hero, 'RUINS');
        
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
        
        if (result.found) {
            expect(result.reward).toBeDefined();
            expect(result.rewardType).toBeDefined();
        }
    });
    
    test('should create special locations', () => {
        const location = ItemGenerator.createSpecialLocation('TEMPLE', 10, 10);
        
        expect(location.type).toBe('TEMPLE');
        expect(location.name).toBeDefined();
        expect(location.x).toBe(10);
        expect(location.y).toBe(10);
        expect(location.explored).toBe(false);
    });
});

describe('SpellGenerator', () => {
    let hero;
    
    beforeEach(() => {
        hero = new Hero('Wizard', 0, 5, 5);
        hero.level = 5;
    });
    
    test('should get available spells for hero', () => {
        const availableSpells = SpellGenerator.getAvailableSpells(hero);
        
        expect(Array.isArray(availableSpells)).toBe(true);
        expect(availableSpells.length).toBeGreaterThan(0);
        
        // All spells should be learnable by the hero
        for (const spell of availableSpells) {
            expect(spell.manaCost).toBeLessThanOrEqual(hero.level * 2 + 5);
        }
    });
    
    test('should generate random spells', () => {
        const spell = SpellGenerator.generateRandomSpell(hero);
        
        if (spell) {
            expect(spell).toBeInstanceOf(Spell);
            expect(spell.name).toBeDefined();
        }
    });
    
    test('should calculate mana regeneration', () => {
        const regen = SpellGenerator.calculateManaRegeneration(hero);
        
        expect(regen).toBeGreaterThan(0);
        expect(typeof regen).toBe('number');
    });
    
    test('should check if hero can cast spells', () => {
        // Hero with no spells
        expect(SpellGenerator.canCastSpells(hero)).toBe(false);
        
        // Hero with spells and mana
        const spell = new Spell('HEAL');
        hero.learnSpell(spell);
        hero.mana = 10;
        hero.hasActed = false;
        
        expect(SpellGenerator.canCastSpells(hero)).toBe(true);
        
        // Hero who has already acted
        hero.hasActed = true;
        expect(SpellGenerator.canCastSpells(hero)).toBe(false);
    });
    
    test('should get castable spells', () => {
        const spell1 = new Spell('HEAL'); // 4 mana
        const spell2 = new Spell('METEOR'); // 12 mana
        
        hero.learnSpell(spell1);
        hero.learnSpell(spell2);
        hero.mana = 5; // Only enough for heal
        
        const castableSpells = SpellGenerator.getCastableSpells(hero);
        
        expect(castableSpells).toContain(spell1);
        expect(castableSpells).not.toContain(spell2);
    });
    
    test('should create spell scrolls', () => {
        const scroll = SpellGenerator.createSpellScroll('MAGIC_MISSILE');
        
        expect(scroll.name).toBe('Scroll of Magic Missile');
        expect(scroll.type).toBe('SPELL_SCROLL');
        expect(scroll.isConsumable).toBe(true);
        expect(typeof scroll.use).toBe('function');
        
        // Test using the scroll
        const result = scroll.use(hero);
        
        expect(result.success).toBe(true);
        expect(hero.spells.length).toBe(1);
        expect(hero.spells[0].name).toBe('Magic Missile');
    });
});

describe('Hero Integration with Items and Spells', () => {
    let hero;
    
    beforeEach(() => {
        hero = new Hero('TestHero', 0, 5, 5);
        hero.level = 5;
    });
    
    test('should serialize and deserialize hero with items and spells', () => {
        // Add items and spells
        const sword = new Item('STEEL_SWORD');
        const spell = new Spell('FIREBALL');
        
        hero.equipItem(sword);
        hero.learnSpell(spell);
        
        // Serialize
        const serialized = hero.serialize();
        
        // Deserialize
        const deserializedHero = Hero.deserialize(serialized);
        
        expect(deserializedHero.items.length).toBe(1);
        expect(deserializedHero.items[0].name).toBe('Steel Sword');
        expect(deserializedHero.spells.length).toBe(1);
        expect(deserializedHero.spells[0].name).toBe('Fireball');
    });
    
    test('should calculate correct stats with multiple items', () => {
        const baseAttack = hero.getAttackValue();
        const baseDefense = hero.getDefenseValue();
        
        const sword = new Item('STEEL_SWORD'); // +4 attack
        const armor = new Item('CHAIN_MAIL'); // +3 defense
        const ring = new Item('RING_OF_POWER'); // +2 attack, +2 defense
        
        hero.equipItem(sword);
        hero.equipItem(armor);
        hero.equipItem(ring);
        
        expect(hero.getAttackValue()).toBe(baseAttack + 4 + 2);
        expect(hero.getDefenseValue()).toBe(baseDefense + 3 + 2);
    });
    
    test('should handle item replacement correctly', () => {
        const ironSword = new Item('IRON_SWORD');
        const steelSword = new Item('STEEL_SWORD');
        
        // Equip iron sword
        hero.equipItem(ironSword);
        expect(hero.items.length).toBe(1);
        expect(ironSword.isEquipped).toBe(true);
        
        // Equip steel sword (should replace iron sword)
        hero.equipItem(steelSword);
        expect(hero.items.length).toBe(2);
        expect(ironSword.isEquipped).toBe(false);
        expect(steelSword.isEquipped).toBe(true);
    });
});