/**
 * Hero - Special unit with leveling, items, and spells
 * Extends Unit with hero-specific features
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */

import { Unit, UNIT_TYPES } from './Unit.js';
import { Item, ITEM_TYPES } from './Item.js';
import { Spell, SPELL_TYPES } from './Spell.js';

export const HERO_NAMES = [
    'Aldric', 'Brenna', 'Caelan', 'Dara', 'Ewan', 'Fiona',
    'Gareth', 'Hilda', 'Ivan', 'Jora', 'Kael', 'Luna',
    'Magnus', 'Nora', 'Osric', 'Petra', 'Quinn', 'Rhea',
    'Soren', 'Tara', 'Ulric', 'Vera', 'Willem', 'Xara',
    'Yorick', 'Zara'
];

export const EXPERIENCE_LEVELS = [
    0,    // Level 1
    100,  // Level 2
    250,  // Level 3
    450,  // Level 4
    700,  // Level 5
    1000, // Level 6
    1350, // Level 7
    1750, // Level 8
    2200, // Level 9
    2700  // Level 10 (max)
];

export class Hero extends Unit {
    constructor(name, owner, x, y) {
        super(UNIT_TYPES.HERO, owner, x, y);
        
        // Hero-specific properties
        this.heroName = name || this.generateRandomName();
        this.level = 1;
        this.experience = 0;
        this.items = [];
        this.spells = [];
        this.maxMana = 10;
        this.mana = 10;
        
        // Override display name
        this.name = this.heroName;
        
        console.log(`Hero created: ${this.heroName} (${this.id}) at level ${this.level}`);
    }
    
    /**
     * Generate random hero name
     * @returns {string} - Random hero name
     */
    generateRandomName() {
        return HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)];
    }
    
    /**
     * Get current attack value including item bonuses
     * @returns {number} - Total attack value
     */
    getAttackValue() {
        let attack = this.baseAttack;
        
        // Add level bonus
        attack += Math.floor((this.level - 1) * 0.5);
        
        // Add item bonuses
        for (const item of this.items) {
            if (item.attackBonus) {
                attack += item.attackBonus;
            }
        }
        
        return Math.floor(attack);
    }
    
    /**
     * Get current defense value including item bonuses
     * @returns {number} - Total defense value
     */
    getDefenseValue() {
        let defense = this.baseDefense;
        
        // Add level bonus
        defense += Math.floor((this.level - 1) * 0.3);
        
        // Add item bonuses
        for (const item of this.items) {
            if (item.defenseBonus) {
                defense += item.defenseBonus;
            }
        }
        
        return Math.floor(defense);
    }
    
    /**
     * Get maximum health including level bonuses
     * @returns {number} - Maximum health
     */
    getMaxHealth() {
        let maxHealth = this.maxHealth;
        
        // Add level bonus
        maxHealth += (this.level - 1) * 2;
        
        // Add item bonuses
        for (const item of this.items) {
            if (item.healthBonus) {
                maxHealth += item.healthBonus;
            }
        }
        
        return maxHealth;
    }
    
    /**
     * Get maximum movement including item bonuses
     * @returns {number} - Maximum movement
     */
    getMaxMovement() {
        let movement = this.maxMovement;
        
        // Add item bonuses
        for (const item of this.items) {
            if (item.movementBonus) {
                movement += item.movementBonus;
            }
        }
        
        return movement;
    }
    
    /**
     * Get maximum mana including level bonuses
     * @returns {number} - Maximum mana
     */
    getMaxMana() {
        let maxMana = this.maxMana;
        
        // Add level bonus
        maxMana += (this.level - 1) * 2;
        
        // Add item bonuses
        for (const item of this.items) {
            if (item.manaBonus) {
                maxMana += item.manaBonus;
            }
        }
        
        return maxMana;
    }
    
    /**
     * Gain experience points
     * @param {number} amount - Experience amount
     */
    gainExperience(amount) {
        if (amount <= 0) return;
        
        const oldLevel = this.level;
        this.experience += amount;
        
        console.log(`Hero ${this.heroName} gained ${amount} experience (${this.experience} total)`);
        
        // Check for level up
        this.checkLevelUp();
        
        if (this.level > oldLevel) {
            console.log(`Hero ${this.heroName} leveled up from ${oldLevel} to ${this.level}!`);
        }
    }
    
    /**
     * Check if hero should level up
     */
    checkLevelUp() {
        const maxLevel = EXPERIENCE_LEVELS.length;
        
        while (this.level < maxLevel && this.experience >= EXPERIENCE_LEVELS[this.level]) {
            this.levelUp();
        }
    }
    
    /**
     * Level up the hero
     */
    levelUp() {
        if (this.level >= EXPERIENCE_LEVELS.length) {
            return; // Already at max level
        }
        
        const oldMaxHealth = this.getMaxHealth();
        const oldMaxMana = this.getMaxMana();
        
        this.level++;
        
        // Update current health and mana to match new maximums
        const newMaxHealth = this.getMaxHealth();
        const newMaxMana = this.getMaxMana();
        
        this.health += (newMaxHealth - oldMaxHealth);
        this.mana += (newMaxMana - oldMaxMana);
        
        console.log(`Hero ${this.heroName} reached level ${this.level}!`);
        console.log(`Stats: ATK ${this.getAttackValue()}, DEF ${this.getDefenseValue()}, HP ${this.health}/${newMaxHealth}, MP ${this.mana}/${newMaxMana}`);
    }
    
    /**
     * Equip an item
     * @param {Item} item - Item to equip
     * @returns {boolean} - True if equipped successfully
     */
    equipItem(item) {
        if (!item || !(item instanceof Item)) {
            console.warn('Invalid item provided to equipItem');
            return false;
        }
        
        // Check if item can be equipped
        if (!item.canEquip(this)) {
            console.warn(`Hero ${this.heroName} cannot equip ${item.name}`);
            return false;
        }
        
        // Check if hero already has this item
        if (this.items.find(i => i.id === item.id)) {
            console.warn(`Hero ${this.heroName} already has item ${item.name}`);
            return false;
        }
        
        // For equipment slots, check if we need to unequip existing items
        // (simplified - could add proper slot management later)
        if (item.type === ITEM_TYPES.WEAPON) {
            const existingWeapon = this.items.find(i => i.type === ITEM_TYPES.WEAPON && i.isEquipped);
            if (existingWeapon) {
                existingWeapon.isEquipped = false;
                console.log(`Hero ${this.heroName} unequipped ${existingWeapon.name} to equip ${item.name}`);
            }
        }
        
        // Equip the item
        item.isEquipped = true;
        this.items.push(item);
        
        console.log(`Hero ${this.heroName} equipped ${item.name}`);
        return true;
    }
    
    /**
     * Unequip an item
     * @param {string} itemId - Item ID to unequip
     * @returns {Item|null} - Unequipped item or null
     */
    unequipItem(itemId) {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            return null;
        }
        
        const item = this.items.splice(itemIndex, 1)[0];
        item.isEquipped = false;
        console.log(`Hero ${this.heroName} unequipped ${item.name}`);
        return item;
    }
    
    /**
     * Use a consumable item
     * @param {string} itemId - Item ID to use
     * @returns {Object} - Usage result
     */
    useItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        
        if (!item) {
            return { success: false, reason: 'Item not found' };
        }
        
        if (!item.isConsumable) {
            return { success: false, reason: 'Item is not consumable' };
        }
        
        // Use the item
        const result = item.use(this);
        
        if (result.success && result.consumed) {
            // Remove consumed item from inventory
            const itemIndex = this.items.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                this.items.splice(itemIndex, 1);
            }
        }
        
        return result;
    }
    
    /**
     * Learn a spell
     * @param {Spell} spell - Spell to learn
     * @returns {boolean} - True if learned successfully
     */
    learnSpell(spell) {
        if (!spell || !(spell instanceof Spell)) {
            console.warn('Invalid spell provided to learnSpell');
            return false;
        }
        
        // Check if hero already knows this spell
        if (this.spells.find(s => s.id === spell.id)) {
            console.warn(`Hero ${this.heroName} already knows spell ${spell.name}`);
            return false;
        }
        
        // Check level requirements (simplified - could add more complex requirements)
        const requiredLevel = Math.ceil(spell.manaCost / 2);
        if (this.level < requiredLevel) {
            console.warn(`Hero ${this.heroName} needs level ${requiredLevel} to learn ${spell.name}`);
            return false;
        }
        
        this.spells.push(spell);
        console.log(`Hero ${this.heroName} learned spell ${spell.name}`);
        return true;
    }
    
    /**
     * Cast a spell
     * @param {string} spellId - Spell ID to cast
     * @param {Object} target - Target for the spell (optional)
     * @param {Map} map - Game map for range checking (optional)
     * @returns {Object} - Spell result
     */
    castSpell(spellId, target = null, map = null) {
        const spell = this.spells.find(s => s.id === spellId);
        
        if (!spell) {
            return { success: false, reason: 'Spell not known' };
        }
        
        // Use the spell's cast method
        return spell.cast(this, target, map);
    }
    
    /**
     * Restore mana
     * @param {number} amount - Mana amount to restore
     */
    restoreMana(amount) {
        if (amount <= 0) return;
        
        const oldMana = this.mana;
        this.mana = Math.min(this.getMaxMana(), this.mana + amount);
        const actualRestore = this.mana - oldMana;
        
        if (actualRestore > 0) {
            console.log(`Hero ${this.heroName} restored ${actualRestore} mana (${this.mana}/${this.getMaxMana()})`);
        }
        
        return actualRestore;
    }
    
    /**
     * Reset hero for new turn
     */
    resetForTurn() {
        super.resetForTurn();
        
        // Restore some mana each turn
        this.restoreMana(2);
    }
    
    /**
     * Get experience needed for next level
     * @returns {number} - Experience needed, or 0 if at max level
     */
    getExperienceToNextLevel() {
        if (this.level >= EXPERIENCE_LEVELS.length) {
            return 0; // At max level
        }
        
        return EXPERIENCE_LEVELS[this.level] - this.experience;
    }
    
    /**
     * Get hero display name
     * @returns {string} - Display name
     */
    getDisplayName() {
        return `${this.heroName} (Lv.${this.level})`;
    }
    
    /**
     * Get hero status summary
     * @returns {Object} - Status summary
     */
    getStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            heroName: this.heroName,
            level: this.level,
            experience: this.experience,
            experienceToNext: this.getExperienceToNextLevel(),
            mana: this.mana,
            maxMana: this.getMaxMana(),
            itemCount: this.items.length,
            spellCount: this.spells.length,
            items: this.items.map(item => ({ id: item.id, name: item.name })),
            spells: this.spells.map(spell => ({ id: spell.id, name: spell.name, manaCost: spell.manaCost }))
        };
    }
    
    /**
     * Serialize hero data
     * @returns {Object} - Serialized data
     */
    serialize() {
        const baseData = super.serialize();
        
        return {
            ...baseData,
            heroName: this.heroName,
            level: this.level,
            experience: this.experience,
            items: this.items.map(item => item.serialize()),
            spells: this.spells.map(spell => spell.serialize()),
            maxMana: this.maxMana,
            mana: this.mana
        };
    }
    
    /**
     * Deserialize hero data
     * @param {Object} data - Serialized data
     * @returns {Hero} - Hero instance
     */
    static deserialize(data) {
        const hero = new Hero(data.heroName, data.owner, data.x, data.y);
        
        // Restore base unit state
        hero.id = data.id;
        hero.health = data.health;
        hero.maxHealth = data.maxHealth;
        hero.movement = data.movement;
        hero.maxMovement = data.maxMovement;
        hero.baseAttack = data.baseAttack;
        hero.baseDefense = data.baseDefense;
        hero.cost = data.cost;
        hero.hasActed = data.hasActed;
        hero.isSelected = data.isSelected;
        
        // Restore hero-specific state
        hero.level = data.level;
        hero.experience = data.experience;
        hero.items = (data.items || []).map(itemData => Item.deserialize(itemData));
        hero.spells = (data.spells || []).map(spellData => Spell.deserialize(spellData));
        hero.maxMana = data.maxMana;
        hero.mana = data.mana;
        
        return hero;
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        return `Hero ${this.heroName} (Lv.${this.level}) at (${this.x}, ${this.y}) - HP: ${this.health}/${this.getMaxHealth()}, MP: ${this.mana}/${this.getMaxMana()}`;
    }
}