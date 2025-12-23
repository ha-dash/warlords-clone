/**
 * Item - Equipment and consumables for heroes
 * Requirements: 4.3, 4.4
 */

export const ITEM_TYPES = {
    WEAPON: 'WEAPON',
    ARMOR: 'ARMOR',
    ACCESSORY: 'ACCESSORY',
    CONSUMABLE: 'CONSUMABLE'
};

export const ITEM_RARITY = {
    COMMON: 'COMMON',
    UNCOMMON: 'UNCOMMON',
    RARE: 'RARE',
    EPIC: 'EPIC',
    LEGENDARY: 'LEGENDARY'
};

export const ITEM_TEMPLATES = {
    // Weapons
    IRON_SWORD: {
        name: 'Iron Sword',
        type: ITEM_TYPES.WEAPON,
        rarity: ITEM_RARITY.COMMON,
        attackBonus: 2,
        description: 'A sturdy iron sword that increases attack power.'
    },
    STEEL_SWORD: {
        name: 'Steel Sword',
        type: ITEM_TYPES.WEAPON,
        rarity: ITEM_RARITY.UNCOMMON,
        attackBonus: 4,
        description: 'A well-crafted steel sword with superior sharpness.'
    },
    ENCHANTED_BLADE: {
        name: 'Enchanted Blade',
        type: ITEM_TYPES.WEAPON,
        rarity: ITEM_RARITY.RARE,
        attackBonus: 6,
        manaBonus: 5,
        description: 'A magical blade that enhances both combat and magical abilities.'
    },
    DRAGON_SLAYER: {
        name: 'Dragon Slayer',
        type: ITEM_TYPES.WEAPON,
        rarity: ITEM_RARITY.LEGENDARY,
        attackBonus: 10,
        description: 'A legendary weapon forged to slay the mightiest dragons.'
    },
    
    // Armor
    LEATHER_ARMOR: {
        name: 'Leather Armor',
        type: ITEM_TYPES.ARMOR,
        rarity: ITEM_RARITY.COMMON,
        defenseBonus: 1,
        description: 'Basic leather protection for light defense.'
    },
    CHAIN_MAIL: {
        name: 'Chain Mail',
        type: ITEM_TYPES.ARMOR,
        rarity: ITEM_RARITY.UNCOMMON,
        defenseBonus: 3,
        description: 'Interlocked metal rings providing solid protection.'
    },
    PLATE_ARMOR: {
        name: 'Plate Armor',
        type: ITEM_TYPES.ARMOR,
        rarity: ITEM_RARITY.RARE,
        defenseBonus: 5,
        healthBonus: 10,
        description: 'Heavy plate armor offering excellent protection.'
    },
    DRAGON_SCALE_ARMOR: {
        name: 'Dragon Scale Armor',
        type: ITEM_TYPES.ARMOR,
        rarity: ITEM_RARITY.LEGENDARY,
        defenseBonus: 8,
        healthBonus: 20,
        description: 'Armor crafted from dragon scales, nearly impenetrable.'
    },
    
    // Accessories
    RING_OF_POWER: {
        name: 'Ring of Power',
        type: ITEM_TYPES.ACCESSORY,
        rarity: ITEM_RARITY.RARE,
        attackBonus: 2,
        defenseBonus: 2,
        description: 'A magical ring that enhances all combat abilities.'
    },
    BOOTS_OF_SPEED: {
        name: 'Boots of Speed',
        type: ITEM_TYPES.ACCESSORY,
        rarity: ITEM_RARITY.UNCOMMON,
        movementBonus: 1,
        description: 'Enchanted boots that increase movement speed.'
    },
    AMULET_OF_HEALTH: {
        name: 'Amulet of Health',
        type: ITEM_TYPES.ACCESSORY,
        rarity: ITEM_RARITY.RARE,
        healthBonus: 15,
        description: 'A protective amulet that increases maximum health.'
    },
    CRYSTAL_OF_MANA: {
        name: 'Crystal of Mana',
        type: ITEM_TYPES.ACCESSORY,
        rarity: ITEM_RARITY.RARE,
        manaBonus: 10,
        description: 'A glowing crystal that increases magical energy.'
    },
    
    // Consumables
    HEALING_POTION: {
        name: 'Healing Potion',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: ITEM_RARITY.COMMON,
        healingPower: 15,
        description: 'A potion that restores health when consumed.'
    },
    MANA_POTION: {
        name: 'Mana Potion',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: ITEM_RARITY.COMMON,
        manaPower: 10,
        description: 'A potion that restores magical energy when consumed.'
    },
    ELIXIR_OF_STRENGTH: {
        name: 'Elixir of Strength',
        type: ITEM_TYPES.CONSUMABLE,
        rarity: ITEM_RARITY.UNCOMMON,
        temporaryAttackBonus: 5,
        duration: 3, // turns
        description: 'A powerful elixir that temporarily increases attack power.'
    }
};

let itemIdCounter = 1;

export class Item {
    constructor(template, customProperties = {}) {
        if (typeof template === 'string') {
            template = ITEM_TEMPLATES[template];
        }
        
        if (!template) {
            throw new Error('Invalid item template');
        }
        
        // Basic properties
        this.id = `item_${itemIdCounter++}`;
        this.name = template.name;
        this.type = template.type;
        this.rarity = template.rarity || ITEM_RARITY.COMMON;
        this.description = template.description || '';
        
        // Stat bonuses
        this.attackBonus = template.attackBonus || 0;
        this.defenseBonus = template.defenseBonus || 0;
        this.healthBonus = template.healthBonus || 0;
        this.manaBonus = template.manaBonus || 0;
        this.movementBonus = template.movementBonus || 0;
        
        // Consumable properties
        this.healingPower = template.healingPower || 0;
        this.manaPower = template.manaPower || 0;
        this.temporaryAttackBonus = template.temporaryAttackBonus || 0;
        this.temporaryDefenseBonus = template.temporaryDefenseBonus || 0;
        this.duration = template.duration || 0;
        
        // Special properties
        this.isConsumable = this.type === ITEM_TYPES.CONSUMABLE;
        this.isEquipped = false;
        
        // Apply custom properties
        Object.assign(this, customProperties);
        
        console.log(`Item created: ${this.name} (${this.id})`);
    }
    
    /**
     * Check if item can be equipped by a hero
     * @param {Hero} hero - Hero to check
     * @returns {boolean} - True if can be equipped
     */
    canEquip(hero) {
        if (!hero) return false;
        if (this.isConsumable) return false;
        
        // For now, allow any non-consumable item to be equipped
        // Could add level requirements, class restrictions, etc.
        return true;
    }
    
    /**
     * Use/consume the item
     * @param {Hero} hero - Hero using the item
     * @returns {Object} - Usage result
     */
    use(hero) {
        if (!hero) {
            return { success: false, reason: 'No hero specified' };
        }
        
        if (!this.isConsumable) {
            return { success: false, reason: 'Item is not consumable' };
        }
        
        const effects = [];
        
        // Apply healing
        if (this.healingPower > 0) {
            const healed = hero.heal(this.healingPower);
            effects.push({ type: 'healing', amount: healed });
        }
        
        // Apply mana restoration
        if (this.manaPower > 0) {
            hero.restoreMana(this.manaPower);
            effects.push({ type: 'mana', amount: this.manaPower });
        }
        
        // Apply temporary bonuses (simplified - would need proper buff system)
        if (this.temporaryAttackBonus > 0) {
            effects.push({ 
                type: 'temporary_buff', 
                stat: 'attack', 
                amount: this.temporaryAttackBonus,
                duration: this.duration 
            });
        }
        
        if (this.temporaryDefenseBonus > 0) {
            effects.push({ 
                type: 'temporary_buff', 
                stat: 'defense', 
                amount: this.temporaryDefenseBonus,
                duration: this.duration 
            });
        }
        
        console.log(`Hero ${hero.heroName} used ${this.name}`);
        
        return {
            success: true,
            effects: effects,
            consumed: true
        };
    }
    
    /**
     * Get item value for trading/selling
     * @returns {number} - Item value
     */
    getValue() {
        let value = 10; // Base value
        
        // Add value based on bonuses
        value += (this.attackBonus || 0) * 10;
        value += (this.defenseBonus || 0) * 10;
        value += (this.healthBonus || 0) * 2;
        value += (this.manaBonus || 0) * 3;
        value += (this.movementBonus || 0) * 15;
        value += (this.healingPower || 0) * 2;
        value += (this.manaPower || 0) * 3;
        
        // Multiply by rarity
        const rarityMultipliers = {
            [ITEM_RARITY.COMMON]: 1,
            [ITEM_RARITY.UNCOMMON]: 2,
            [ITEM_RARITY.RARE]: 4,
            [ITEM_RARITY.EPIC]: 8,
            [ITEM_RARITY.LEGENDARY]: 16
        };
        
        value *= rarityMultipliers[this.rarity] || 1;
        
        return Math.floor(value);
    }
    
    /**
     * Get item summary for display
     * @returns {Object} - Item summary
     */
    getSummary() {
        const bonuses = [];
        
        if (this.attackBonus > 0) bonuses.push(`+${this.attackBonus} ATK`);
        if (this.defenseBonus > 0) bonuses.push(`+${this.defenseBonus} DEF`);
        if (this.healthBonus > 0) bonuses.push(`+${this.healthBonus} HP`);
        if (this.manaBonus > 0) bonuses.push(`+${this.manaBonus} MP`);
        if (this.movementBonus > 0) bonuses.push(`+${this.movementBonus} MOV`);
        if (this.healingPower > 0) bonuses.push(`Heals ${this.healingPower} HP`);
        if (this.manaPower > 0) bonuses.push(`Restores ${this.manaPower} MP`);
        
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rarity: this.rarity,
            description: this.description,
            bonuses: bonuses.join(', '),
            value: this.getValue(),
            isConsumable: this.isConsumable,
            isEquipped: this.isEquipped
        };
    }
    
    /**
     * Create a random item
     * @param {string} type - Item type filter (optional)
     * @param {string} rarity - Rarity filter (optional)
     * @returns {Item} - Random item
     */
    static createRandom(type = null, rarity = null) {
        const templates = Object.keys(ITEM_TEMPLATES).filter(key => {
            const template = ITEM_TEMPLATES[key];
            if (type && template.type !== type) return false;
            if (rarity && template.rarity !== rarity) return false;
            return true;
        });
        
        if (templates.length === 0) {
            throw new Error('No matching item templates found');
        }
        
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        return new Item(randomTemplate);
    }
    
    /**
     * Create item from template name
     * @param {string} templateName - Template name
     * @param {Object} customProperties - Custom properties (optional)
     * @returns {Item} - New item
     */
    static create(templateName, customProperties = {}) {
        return new Item(templateName, customProperties);
    }
    
    /**
     * Serialize item data
     * @returns {Object} - Serialized data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rarity: this.rarity,
            description: this.description,
            attackBonus: this.attackBonus,
            defenseBonus: this.defenseBonus,
            healthBonus: this.healthBonus,
            manaBonus: this.manaBonus,
            movementBonus: this.movementBonus,
            healingPower: this.healingPower,
            manaPower: this.manaPower,
            temporaryAttackBonus: this.temporaryAttackBonus,
            temporaryDefenseBonus: this.temporaryDefenseBonus,
            duration: this.duration,
            isConsumable: this.isConsumable,
            isEquipped: this.isEquipped
        };
    }
    
    /**
     * Deserialize item data
     * @param {Object} data - Serialized data
     * @returns {Item} - Item instance
     */
    static deserialize(data) {
        const item = Object.create(Item.prototype);
        Object.assign(item, data);
        return item;
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        const bonuses = [];
        if (this.attackBonus > 0) bonuses.push(`+${this.attackBonus} ATK`);
        if (this.defenseBonus > 0) bonuses.push(`+${this.defenseBonus} DEF`);
        if (this.healthBonus > 0) bonuses.push(`+${this.healthBonus} HP`);
        if (this.manaBonus > 0) bonuses.push(`+${this.manaBonus} MP`);
        
        const bonusText = bonuses.length > 0 ? ` (${bonuses.join(', ')})` : '';
        return `${this.name}${bonusText}`;
    }
}