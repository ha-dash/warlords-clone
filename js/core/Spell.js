/**
 * Spell - Magic spells for heroes
 * Requirements: 4.5
 */

export const SPELL_TYPES = {
    OFFENSIVE: 'OFFENSIVE',
    DEFENSIVE: 'DEFENSIVE',
    UTILITY: 'UTILITY',
    HEALING: 'HEALING'
};

export const SPELL_TARGETS = {
    SELF: 'SELF',
    SINGLE_ENEMY: 'SINGLE_ENEMY',
    SINGLE_ALLY: 'SINGLE_ALLY',
    SINGLE_ANY: 'SINGLE_ANY',
    AREA: 'AREA',
    ALL_ENEMIES: 'ALL_ENEMIES',
    ALL_ALLIES: 'ALL_ALLIES'
};

export const SPELL_TEMPLATES = {
    // Offensive Spells
    MAGIC_MISSILE: {
        name: 'Magic Missile',
        type: SPELL_TYPES.OFFENSIVE,
        target: SPELL_TARGETS.SINGLE_ENEMY,
        manaCost: 3,
        power: 8,
        range: 2,
        description: 'A bolt of magical energy that strikes a single enemy.'
    },
    FIREBALL: {
        name: 'Fireball',
        type: SPELL_TYPES.OFFENSIVE,
        target: SPELL_TARGETS.AREA,
        manaCost: 6,
        power: 12,
        range: 3,
        areaSize: 1,
        description: 'A blazing sphere that explodes on impact, damaging nearby enemies.'
    },
    LIGHTNING_BOLT: {
        name: 'Lightning Bolt',
        type: SPELL_TYPES.OFFENSIVE,
        target: SPELL_TARGETS.SINGLE_ENEMY,
        manaCost: 5,
        power: 15,
        range: 4,
        description: 'A powerful bolt of lightning that strikes with devastating force.'
    },
    METEOR: {
        name: 'Meteor',
        type: SPELL_TYPES.OFFENSIVE,
        target: SPELL_TARGETS.AREA,
        manaCost: 12,
        power: 25,
        range: 5,
        areaSize: 2,
        description: 'Summons a meteor from the sky to devastate a large area.'
    },
    
    // Healing Spells
    HEAL: {
        name: 'Heal',
        type: SPELL_TYPES.HEALING,
        target: SPELL_TARGETS.SINGLE_ANY,
        manaCost: 4,
        power: 12,
        range: 1,
        description: 'Restores health to a single target.'
    },
    CURE_LIGHT_WOUNDS: {
        name: 'Cure Light Wounds',
        type: SPELL_TYPES.HEALING,
        target: SPELL_TARGETS.SELF,
        manaCost: 2,
        power: 8,
        range: 0,
        description: 'Heals minor wounds on the caster.'
    },
    MASS_HEAL: {
        name: 'Mass Heal',
        type: SPELL_TYPES.HEALING,
        target: SPELL_TARGETS.ALL_ALLIES,
        manaCost: 10,
        power: 8,
        range: 2,
        description: 'Heals all nearby allied units.'
    },
    RESURRECTION: {
        name: 'Resurrection',
        type: SPELL_TYPES.HEALING,
        target: SPELL_TARGETS.SINGLE_ALLY,
        manaCost: 15,
        power: 50, // Percentage of max health to restore
        range: 1,
        description: 'Brings a fallen ally back to life with partial health.'
    },
    
    // Defensive Spells
    SHIELD: {
        name: 'Shield',
        type: SPELL_TYPES.DEFENSIVE,
        target: SPELL_TARGETS.SINGLE_ANY,
        manaCost: 3,
        power: 3, // Defense bonus
        duration: 5, // turns
        range: 1,
        description: 'Creates a magical barrier that increases defense.'
    },
    ARMOR_OF_FAITH: {
        name: 'Armor of Faith',
        type: SPELL_TYPES.DEFENSIVE,
        target: SPELL_TARGETS.SELF,
        manaCost: 5,
        power: 5, // Defense bonus
        duration: 10,
        range: 0,
        description: 'Surrounds the caster with divine protection.'
    },
    BLESS: {
        name: 'Bless',
        type: SPELL_TYPES.DEFENSIVE,
        target: SPELL_TARGETS.SINGLE_ALLY,
        manaCost: 4,
        power: 2, // Attack and defense bonus
        duration: 8,
        range: 1,
        description: 'Blesses an ally, improving their combat abilities.'
    },
    
    // Utility Spells
    TELEPORT: {
        name: 'Teleport',
        type: SPELL_TYPES.UTILITY,
        target: SPELL_TARGETS.SELF,
        manaCost: 8,
        power: 5, // Movement range
        range: 0,
        description: 'Instantly transports the caster to a nearby location.'
    },
    HASTE: {
        name: 'Haste',
        type: SPELL_TYPES.UTILITY,
        target: SPELL_TARGETS.SINGLE_ANY,
        manaCost: 6,
        power: 2, // Movement bonus
        duration: 5,
        range: 1,
        description: 'Increases the target\'s movement speed.'
    },
    DISPEL_MAGIC: {
        name: 'Dispel Magic',
        type: SPELL_TYPES.UTILITY,
        target: SPELL_TARGETS.SINGLE_ANY,
        manaCost: 4,
        power: 0,
        range: 2,
        description: 'Removes magical effects from the target.'
    },
    SUMMON_ELEMENTAL: {
        name: 'Summon Elemental',
        type: SPELL_TYPES.UTILITY,
        target: SPELL_TARGETS.AREA,
        manaCost: 10,
        power: 0,
        range: 1,
        description: 'Summons an elemental creature to fight alongside you.'
    }
};

let spellIdCounter = 1;

export class Spell {
    constructor(template, customProperties = {}) {
        if (typeof template === 'string') {
            template = SPELL_TEMPLATES[template];
        }
        
        if (!template) {
            throw new Error('Invalid spell template');
        }
        
        // Basic properties
        this.id = `spell_${spellIdCounter++}`;
        this.name = template.name;
        this.type = template.type;
        this.target = template.target;
        this.manaCost = template.manaCost || 1;
        this.power = template.power || 0;
        this.range = template.range || 1;
        this.duration = template.duration || 0;
        this.areaSize = template.areaSize || 0;
        this.description = template.description || '';
        
        // Apply custom properties
        Object.assign(this, customProperties);
        
        console.log(`Spell created: ${this.name} (${this.id})`);
    }
    
    /**
     * Check if spell can be cast by a hero
     * @param {Hero} caster - Hero attempting to cast
     * @param {Object} target - Target for the spell (optional)
     * @param {Map} map - Game map for range checking (optional)
     * @returns {Object} - Validation result
     */
    canCast(caster, target = null, map = null) {
        if (!caster) {
            return { canCast: false, reason: 'No caster specified' };
        }
        
        // Check mana
        if (caster.mana < this.manaCost) {
            return { canCast: false, reason: 'Not enough mana' };
        }
        
        // Check if hero has already acted
        if (caster.hasActed) {
            return { canCast: false, reason: 'Hero has already acted this turn' };
        }
        
        // Check target requirements
        if (this.target !== SPELL_TARGETS.SELF && !target) {
            return { canCast: false, reason: 'Target required' };
        }
        
        // Check range if target and map are provided
        if (target && map && this.range > 0) {
            const distance = map.getDistance(caster.x, caster.y, target.x, target.y);
            if (distance > this.range) {
                return { canCast: false, reason: 'Target out of range' };
            }
        }
        
        // Check target type validity
        if (target) {
            const targetValid = this.isValidTarget(caster, target);
            if (!targetValid.valid) {
                return { canCast: false, reason: targetValid.reason };
            }
        }
        
        return { canCast: true };
    }
    
    /**
     * Check if target is valid for this spell
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Potential target
     * @returns {Object} - Validation result
     */
    isValidTarget(caster, target) {
        if (!target) {
            return { valid: false, reason: 'No target' };
        }
        
        switch (this.target) {
            case SPELL_TARGETS.SELF:
                return { valid: target === caster, reason: 'Can only target self' };
                
            case SPELL_TARGETS.SINGLE_ENEMY:
                return { 
                    valid: target.owner !== caster.owner, 
                    reason: 'Can only target enemies' 
                };
                
            case SPELL_TARGETS.SINGLE_ALLY:
                return { 
                    valid: target.owner === caster.owner, 
                    reason: 'Can only target allies' 
                };
                
            case SPELL_TARGETS.SINGLE_ANY:
                return { valid: true };
                
            default:
                return { valid: true };
        }
    }
    
    /**
     * Cast the spell
     * @param {Hero} caster - Hero casting the spell
     * @param {Object} target - Target for the spell (optional)
     * @param {Map} map - Game map (optional)
     * @returns {Object} - Spell result
     */
    cast(caster, target = null, map = null) {
        const canCast = this.canCast(caster, target, map);
        if (!canCast.canCast) {
            return { success: false, reason: canCast.reason };
        }
        
        // Consume mana and mark as acted
        caster.mana -= this.manaCost;
        caster.hasActed = true;
        
        // Apply spell effects
        const effects = this.applyEffects(caster, target, map);
        
        console.log(`${caster.heroName} cast ${this.name} (${caster.mana}/${caster.getMaxMana()} mana remaining)`);
        
        return {
            success: true,
            spell: this,
            caster: caster,
            target: target,
            effects: effects
        };
    }
    
    /**
     * Apply spell effects
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Spell target
     * @param {Map} map - Game map
     * @returns {Array} - Array of effects
     */
    applyEffects(caster, target, map) {
        const effects = [];
        
        switch (this.type) {
            case SPELL_TYPES.OFFENSIVE:
                effects.push(...this.applyOffensiveEffects(caster, target, map));
                break;
                
            case SPELL_TYPES.HEALING:
                effects.push(...this.applyHealingEffects(caster, target, map));
                break;
                
            case SPELL_TYPES.DEFENSIVE:
                effects.push(...this.applyDefensiveEffects(caster, target, map));
                break;
                
            case SPELL_TYPES.UTILITY:
                effects.push(...this.applyUtilityEffects(caster, target, map));
                break;
        }
        
        return effects;
    }
    
    /**
     * Apply offensive spell effects
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Spell target
     * @param {Map} map - Game map
     * @returns {Array} - Array of effects
     */
    applyOffensiveEffects(caster, target, map) {
        const effects = [];
        
        if (this.target === SPELL_TARGETS.SINGLE_ENEMY && target) {
            const damage = this.calculateDamage(caster, target);
            if (target.takeDamage) {
                target.takeDamage(damage);
                effects.push({
                    type: 'damage',
                    target: target,
                    amount: damage,
                    spell: this.name
                });
            }
        } else if (this.target === SPELL_TARGETS.AREA && map) {
            // Area effect damage (simplified - would need proper area targeting)
            effects.push({
                type: 'area_damage',
                center: target || caster,
                radius: this.areaSize,
                damage: this.power,
                spell: this.name
            });
        }
        
        return effects;
    }
    
    /**
     * Apply healing spell effects
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Spell target
     * @param {Map} map - Game map
     * @returns {Array} - Array of effects
     */
    applyHealingEffects(caster, target, map) {
        const effects = [];
        const healTarget = target || caster;
        
        if (healTarget && healTarget.heal) {
            const healing = this.power;
            const actualHealing = healTarget.heal(healing);
            effects.push({
                type: 'healing',
                target: healTarget,
                amount: actualHealing,
                spell: this.name
            });
        }
        
        return effects;
    }
    
    /**
     * Apply defensive spell effects
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Spell target
     * @param {Map} map - Game map
     * @returns {Array} - Array of effects
     */
    applyDefensiveEffects(caster, target, map) {
        const effects = [];
        const buffTarget = target || caster;
        
        // Apply temporary buff (simplified - would need proper buff system)
        effects.push({
            type: 'buff',
            target: buffTarget,
            stat: 'defense',
            amount: this.power,
            duration: this.duration,
            spell: this.name
        });
        
        return effects;
    }
    
    /**
     * Apply utility spell effects
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Spell target
     * @param {Map} map - Game map
     * @returns {Array} - Array of effects
     */
    applyUtilityEffects(caster, target, map) {
        const effects = [];
        
        switch (this.name) {
            case 'Teleport':
                effects.push({
                    type: 'teleport',
                    target: caster,
                    range: this.power,
                    spell: this.name
                });
                break;
                
            case 'Haste':
                effects.push({
                    type: 'buff',
                    target: target || caster,
                    stat: 'movement',
                    amount: this.power,
                    duration: this.duration,
                    spell: this.name
                });
                break;
                
            case 'Dispel Magic':
                effects.push({
                    type: 'dispel',
                    target: target || caster,
                    spell: this.name
                });
                break;
                
            default:
                effects.push({
                    type: 'utility',
                    target: target || caster,
                    spell: this.name
                });
                break;
        }
        
        return effects;
    }
    
    /**
     * Calculate damage for offensive spells
     * @param {Hero} caster - Spell caster
     * @param {Object} target - Damage target
     * @returns {number} - Damage amount
     */
    calculateDamage(caster, target) {
        let damage = this.power;
        
        // Add caster's level bonus
        damage += Math.floor(caster.level * 0.5);
        
        // Add some randomness
        const randomFactor = 0.8 + (Math.random() * 0.4); // 80% to 120%
        damage = Math.floor(damage * randomFactor);
        
        return Math.max(1, damage);
    }
    
    /**
     * Get spell summary for display
     * @returns {Object} - Spell summary
     */
    getSummary() {
        const details = [];
        
        details.push(`Cost: ${this.manaCost} MP`);
        if (this.range > 0) details.push(`Range: ${this.range}`);
        if (this.power > 0) details.push(`Power: ${this.power}`);
        if (this.duration > 0) details.push(`Duration: ${this.duration} turns`);
        if (this.areaSize > 0) details.push(`Area: ${this.areaSize}`);
        
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            target: this.target,
            description: this.description,
            details: details.join(', '),
            manaCost: this.manaCost
        };
    }
    
    /**
     * Create a random spell
     * @param {string} type - Spell type filter (optional)
     * @returns {Spell} - Random spell
     */
    static createRandom(type = null) {
        const templates = Object.keys(SPELL_TEMPLATES).filter(key => {
            const template = SPELL_TEMPLATES[key];
            if (type && template.type !== type) return false;
            return true;
        });
        
        if (templates.length === 0) {
            throw new Error('No matching spell templates found');
        }
        
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        return new Spell(randomTemplate);
    }
    
    /**
     * Create spell from template name
     * @param {string} templateName - Template name
     * @param {Object} customProperties - Custom properties (optional)
     * @returns {Spell} - New spell
     */
    static create(templateName, customProperties = {}) {
        return new Spell(templateName, customProperties);
    }
    
    /**
     * Serialize spell data
     * @returns {Object} - Serialized data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            target: this.target,
            manaCost: this.manaCost,
            power: this.power,
            range: this.range,
            duration: this.duration,
            areaSize: this.areaSize,
            description: this.description
        };
    }
    
    /**
     * Deserialize spell data
     * @param {Object} data - Serialized data
     * @returns {Spell} - Spell instance
     */
    static deserialize(data) {
        const spell = Object.create(Spell.prototype);
        Object.assign(spell, data);
        return spell;
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        return `${this.name} (${this.manaCost} MP, ${this.type})`;
    }
}