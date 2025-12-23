/**
 * SpellGenerator - Manages spell learning and magical abilities for heroes
 * Requirements: 4.5
 */

import { Spell, SPELL_TEMPLATES, SPELL_TYPES } from './Spell.js';

export const MAGIC_SCHOOLS = {
    ELEMENTAL: 'ELEMENTAL',
    DIVINE: 'DIVINE',
    ARCANE: 'ARCANE',
    NATURE: 'NATURE'
};

export const HERO_MAGIC_AFFINITIES = {
    // Different hero types have different magical affinities
    WARRIOR: { chance: 0.2, schools: [MAGIC_SCHOOLS.DIVINE] },
    MAGE: { chance: 0.9, schools: [MAGIC_SCHOOLS.ARCANE, MAGIC_SCHOOLS.ELEMENTAL] },
    CLERIC: { chance: 0.8, schools: [MAGIC_SCHOOLS.DIVINE] },
    RANGER: { chance: 0.4, schools: [MAGIC_SCHOOLS.NATURE] },
    PALADIN: { chance: 0.6, schools: [MAGIC_SCHOOLS.DIVINE] },
    WIZARD: { chance: 1.0, schools: [MAGIC_SCHOOLS.ARCANE, MAGIC_SCHOOLS.ELEMENTAL] }
};

export class SpellGenerator {
    /**
     * Check if a hero can learn magic
     * @param {Hero} hero - Hero to check
     * @returns {boolean} - True if hero can learn magic
     */
    static canLearnMagic(hero) {
        if (!hero) return false;
        
        // For now, assume all heroes can potentially learn magic
        // In a more complex system, this could be based on hero class/type
        return true;
    }
    
    /**
     * Get available spells for a hero to learn
     * @param {Hero} hero - Hero to get spells for
     * @param {string} school - Magic school filter (optional)
     * @returns {Array} - Array of available spells
     */
    static getAvailableSpells(hero, school = null) {
        if (!hero) return [];
        
        const availableSpells = [];
        
        for (const templateName of Object.keys(SPELL_TEMPLATES)) {
            const template = SPELL_TEMPLATES[templateName];
            
            // Check if hero already knows this spell
            if (hero.spells.find(s => s.name === template.name)) {
                continue;
            }
            
            // Check level requirements
            const requiredLevel = Math.ceil(template.manaCost / 2);
            if (hero.level < requiredLevel) {
                continue;
            }
            
            // Check school filter
            if (school && !this.spellBelongsToSchool(template, school)) {
                continue;
            }
            
            availableSpells.push(new Spell(template));
        }
        
        return availableSpells;
    }
    
    /**
     * Check if a spell belongs to a magic school
     * @param {Object} spellTemplate - Spell template
     * @param {string} school - Magic school
     * @returns {boolean} - True if spell belongs to school
     */
    static spellBelongsToSchool(spellTemplate, school) {
        // Simple mapping of spells to schools based on name/type
        const spellName = spellTemplate.name.toLowerCase();
        
        switch (school) {
            case MAGIC_SCHOOLS.ELEMENTAL:
                return spellName.includes('fire') || spellName.includes('lightning') || 
                       spellName.includes('ice') || spellName.includes('meteor') ||
                       spellTemplate.name === 'Magic Missile' || spellTemplate.name === 'Fireball';
                       
            case MAGIC_SCHOOLS.DIVINE:
                return spellTemplate.type === SPELL_TYPES.HEALING || 
                       spellName.includes('bless') || spellName.includes('cure') ||
                       spellName.includes('resurrection') || spellName.includes('armor of faith');
                       
            case MAGIC_SCHOOLS.ARCANE:
                return spellName.includes('teleport') || spellName.includes('dispel') ||
                       spellName.includes('haste') || spellName.includes('summon') ||
                       spellTemplate.name === 'Magic Missile';
                       
            case MAGIC_SCHOOLS.NATURE:
                return spellName.includes('heal') && !spellName.includes('cure') ||
                       spellName.includes('growth') || spellName.includes('thorn');
                       
            default:
                return true;
        }
    }
    
    /**
     * Generate a random spell for a hero to learn
     * @param {Hero} hero - Hero to generate spell for
     * @param {string} school - Magic school preference (optional)
     * @returns {Spell|null} - Generated spell or null
     */
    static generateRandomSpell(hero, school = null) {
        const availableSpells = this.getAvailableSpells(hero, school);
        
        if (availableSpells.length === 0) {
            return null;
        }
        
        return availableSpells[Math.floor(Math.random() * availableSpells.length)];
    }
    
    /**
     * Get spell learning cost
     * @param {Spell} spell - Spell to learn
     * @param {Hero} hero - Hero learning the spell
     * @returns {number} - Learning cost (could be gold, experience, etc.)
     */
    static getSpellLearningCost(spell, hero) {
        if (!spell || !hero) return 0;
        
        const baseCost = spell.manaCost * 10;
        const rarityMultiplier = this.getSpellRarityMultiplier(spell);
        
        return Math.floor(baseCost * rarityMultiplier);
    }
    
    /**
     * Get spell rarity multiplier
     * @param {Spell} spell - Spell to check
     * @returns {number} - Rarity multiplier
     */
    static getSpellRarityMultiplier(spell) {
        // Determine rarity based on mana cost and power
        const manaCost = spell.manaCost;
        
        if (manaCost >= 12) return 4.0; // Legendary
        if (manaCost >= 8) return 2.5;  // Epic
        if (manaCost >= 5) return 1.5;  // Rare
        if (manaCost >= 3) return 1.2;  // Uncommon
        return 1.0; // Common
    }
    
    /**
     * Create spell scrolls that can be found or purchased
     * @param {string} spellName - Name of spell template
     * @returns {Object} - Spell scroll item
     */
    static createSpellScroll(spellName) {
        const template = SPELL_TEMPLATES[spellName];
        if (!template) {
            throw new Error(`Unknown spell template: ${spellName}`);
        }
        
        return {
            id: `scroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `Scroll of ${template.name}`,
            type: 'SPELL_SCROLL',
            spellName: template.name,
            spellTemplate: template,
            description: `A magical scroll containing the spell "${template.name}". Use to learn the spell.`,
            value: this.getSpellLearningCost(new Spell(template), { level: 5 }), // Base value
            isConsumable: true,
            
            /**
             * Use the scroll to learn the spell
             * @param {Hero} hero - Hero using the scroll
             * @returns {Object} - Usage result
             */
            use(hero) {
                if (!hero) {
                    return { success: false, reason: 'No hero specified' };
                }
                
                const spell = new Spell(this.spellTemplate);
                const learned = hero.learnSpell(spell);
                
                if (learned) {
                    return {
                        success: true,
                        spell: spell,
                        message: `${hero.heroName} learned ${spell.name} from the scroll!`,
                        consumed: true
                    };
                } else {
                    return {
                        success: false,
                        reason: 'Could not learn spell',
                        consumed: false
                    };
                }
            }
        };
    }
    
    /**
     * Get spells by type
     * @param {string} spellType - Type of spells to get
     * @returns {Array} - Array of spell templates
     */
    static getSpellsByType(spellType) {
        return Object.keys(SPELL_TEMPLATES)
            .filter(key => SPELL_TEMPLATES[key].type === spellType)
            .map(key => SPELL_TEMPLATES[key]);
    }
    
    /**
     * Get starter spells for a new hero
     * @param {Hero} hero - New hero
     * @param {number} count - Number of starter spells (default 1)
     * @returns {Array} - Array of starter spells
     */
    static getStarterSpells(hero, count = 1) {
        if (!hero) return [];
        
        const starterSpellNames = [
            'CURE_LIGHT_WOUNDS',
            'MAGIC_MISSILE',
            'SHIELD'
        ];
        
        const spells = [];
        const shuffled = starterSpellNames.sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            spells.push(new Spell(shuffled[i]));
        }
        
        return spells;
    }
    
    /**
     * Calculate mana regeneration for a hero
     * @param {Hero} hero - Hero to calculate for
     * @returns {number} - Mana regeneration amount
     */
    static calculateManaRegeneration(hero) {
        if (!hero) return 0;
        
        let regen = 2; // Base regeneration
        
        // Add level bonus
        regen += Math.floor(hero.level / 3);
        
        // Add item bonuses (if hero has mana regeneration items)
        for (const item of hero.items) {
            if (item.manaRegenBonus) {
                regen += item.manaRegenBonus;
            }
        }
        
        return regen;
    }
    
    /**
     * Check if hero can cast any spells
     * @param {Hero} hero - Hero to check
     * @returns {boolean} - True if hero can cast spells
     */
    static canCastSpells(hero) {
        if (!hero || hero.spells.length === 0) return false;
        if (hero.hasActed) return false;
        
        // Check if hero has enough mana for any spell
        return hero.spells.some(spell => hero.mana >= spell.manaCost);
    }
    
    /**
     * Get castable spells for a hero
     * @param {Hero} hero - Hero to check
     * @returns {Array} - Array of castable spells
     */
    static getCastableSpells(hero) {
        if (!hero) return [];
        
        return hero.spells.filter(spell => {
            return hero.mana >= spell.manaCost && !hero.hasActed;
        });
    }
    
    /**
     * Apply spell effects to the game state
     * @param {Object} spellResult - Result from casting a spell
     * @param {Object} gameState - Current game state
     * @returns {Array} - Array of game state changes
     */
    static applySpellEffectsToGame(spellResult, gameState) {
        if (!spellResult.success || !spellResult.effects) {
            return [];
        }
        
        const changes = [];
        
        for (const effect of spellResult.effects) {
            switch (effect.type) {
                case 'damage':
                    if (effect.target && effect.target.takeDamage) {
                        changes.push({
                            type: 'unit_damaged',
                            target: effect.target,
                            damage: effect.amount,
                            spell: effect.spell
                        });
                    }
                    break;
                    
                case 'healing':
                    if (effect.target && effect.target.heal) {
                        changes.push({
                            type: 'unit_healed',
                            target: effect.target,
                            healing: effect.amount,
                            spell: effect.spell
                        });
                    }
                    break;
                    
                case 'buff':
                    changes.push({
                        type: 'unit_buffed',
                        target: effect.target,
                        stat: effect.stat,
                        amount: effect.amount,
                        duration: effect.duration,
                        spell: effect.spell
                    });
                    break;
                    
                case 'teleport':
                    changes.push({
                        type: 'unit_teleported',
                        target: effect.target,
                        range: effect.range,
                        spell: effect.spell
                    });
                    break;
                    
                case 'area_damage':
                    changes.push({
                        type: 'area_effect',
                        center: effect.center,
                        radius: effect.radius,
                        damage: effect.damage,
                        spell: effect.spell
                    });
                    break;
            }
        }
        
        return changes;
    }
}