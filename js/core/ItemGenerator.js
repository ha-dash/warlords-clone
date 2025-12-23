/**
 * ItemGenerator - Generates items for heroes exploring ruins and special locations
 * Requirements: 4.3
 */

import { Item, ITEM_TEMPLATES, ITEM_RARITY } from './Item.js';
import { Spell, SPELL_TEMPLATES } from './Spell.js';

export const LOCATION_TYPES = {
    RUINS: 'RUINS',
    TEMPLE: 'TEMPLE',
    TOWER: 'TOWER',
    CAVE: 'CAVE',
    TOMB: 'TOMB'
};

export class ItemGenerator {
    /**
     * Generate item for hero exploring a location
     * @param {Hero} hero - Hero exploring
     * @param {string} locationType - Type of location
     * @returns {Object} - Exploration result
     */
    static exploreLocation(hero, locationType = LOCATION_TYPES.RUINS) {
        if (!hero) {
            return { success: false, reason: 'No hero specified' };
        }
        
        // Base chance of finding something (can be modified by hero level)
        const baseChance = 0.6;
        const levelBonus = hero.level * 0.05;
        const findChance = Math.min(0.9, baseChance + levelBonus);
        
        if (Math.random() > findChance) {
            return {
                success: true,
                found: false,
                message: `${hero.heroName} explored the ${locationType.toLowerCase()} but found nothing of value.`
            };
        }
        
        // Determine what type of reward to give
        const rewardType = this.determineRewardType(locationType, hero);
        
        let reward = null;
        let message = '';
        
        switch (rewardType) {
            case 'item':
                reward = this.generateLocationItem(locationType, hero);
                message = `${hero.heroName} found ${reward.name} in the ${locationType.toLowerCase()}!`;
                break;
                
            case 'spell':
                reward = this.generateLocationSpell(locationType, hero);
                message = `${hero.heroName} learned ${reward.name} from ancient knowledge in the ${locationType.toLowerCase()}!`;
                break;
                
            case 'experience':
                const expGain = this.generateExperienceReward(locationType, hero);
                hero.gainExperience(expGain);
                message = `${hero.heroName} gained ${expGain} experience from exploring the ${locationType.toLowerCase()}!`;
                break;
                
            default:
                return {
                    success: true,
                    found: false,
                    message: `${hero.heroName} explored the ${locationType.toLowerCase()} but found nothing useful.`
                };
        }
        
        return {
            success: true,
            found: true,
            rewardType: rewardType,
            reward: reward,
            message: message
        };
    }
    
    /**
     * Determine what type of reward to give
     * @param {string} locationType - Type of location
     * @param {Hero} hero - Hero exploring
     * @returns {string} - Reward type
     */
    static determineRewardType(locationType, hero) {
        const weights = this.getRewardWeights(locationType);
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        
        for (const [rewardType, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return rewardType;
            }
        }
        
        return 'item'; // Fallback
    }
    
    /**
     * Get reward weights for different location types
     * @param {string} locationType - Type of location
     * @returns {Object} - Reward weights
     */
    static getRewardWeights(locationType) {
        const baseWeights = {
            item: 50,
            spell: 20,
            experience: 30
        };
        
        switch (locationType) {
            case LOCATION_TYPES.TEMPLE:
                return { item: 30, spell: 50, experience: 20 }; // More spells
                
            case LOCATION_TYPES.TOWER:
                return { item: 20, spell: 60, experience: 20 }; // Mostly spells
                
            case LOCATION_TYPES.TOMB:
                return { item: 70, spell: 10, experience: 20 }; // Mostly items
                
            case LOCATION_TYPES.CAVE:
                return { item: 60, spell: 15, experience: 25 }; // Items and experience
                
            case LOCATION_TYPES.RUINS:
            default:
                return baseWeights;
        }
    }
    
    /**
     * Generate an item appropriate for the location
     * @param {string} locationType - Type of location
     * @param {Hero} hero - Hero exploring
     * @returns {Item} - Generated item
     */
    static generateLocationItem(locationType, hero) {
        const rarity = this.determineItemRarity(hero.level);
        const itemType = this.determineItemType(locationType);
        
        // Filter templates by type and rarity
        const suitableTemplates = Object.keys(ITEM_TEMPLATES).filter(key => {
            const template = ITEM_TEMPLATES[key];
            const typeMatch = !itemType || template.type === itemType;
            const rarityMatch = template.rarity === rarity;
            return typeMatch && rarityMatch;
        });
        
        if (suitableTemplates.length === 0) {
            // Fallback to any item of the right rarity
            return Item.createRandom(null, rarity);
        }
        
        const randomTemplate = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];
        return new Item(randomTemplate);
    }
    
    /**
     * Generate a spell appropriate for the location
     * @param {string} locationType - Type of location
     * @param {Hero} hero - Hero exploring
     * @returns {Spell} - Generated spell
     */
    static generateLocationSpell(locationType, hero) {
        const spellType = this.determineSpellType(locationType);
        
        // Filter spells by type and hero level
        const suitableTemplates = Object.keys(SPELL_TEMPLATES).filter(key => {
            const template = SPELL_TEMPLATES[key];
            const typeMatch = !spellType || template.type === spellType;
            const levelMatch = template.manaCost <= (hero.level * 2 + 5); // Scale with level
            return typeMatch && levelMatch;
        });
        
        if (suitableTemplates.length === 0) {
            // Fallback to any spell the hero can learn
            return Spell.createRandom();
        }
        
        const randomTemplate = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)];
        return new Spell(randomTemplate);
    }
    
    /**
     * Generate experience reward
     * @param {string} locationType - Type of location
     * @param {Hero} hero - Hero exploring
     * @returns {number} - Experience amount
     */
    static generateExperienceReward(locationType, hero) {
        const baseExp = 20;
        const levelMultiplier = 1 + (hero.level * 0.1);
        
        const locationMultipliers = {
            [LOCATION_TYPES.RUINS]: 1.0,
            [LOCATION_TYPES.TEMPLE]: 1.2,
            [LOCATION_TYPES.TOWER]: 1.3,
            [LOCATION_TYPES.CAVE]: 0.8,
            [LOCATION_TYPES.TOMB]: 1.1
        };
        
        const multiplier = locationMultipliers[locationType] || 1.0;
        const randomFactor = 0.8 + (Math.random() * 0.4); // 80% to 120%
        
        return Math.floor(baseExp * levelMultiplier * multiplier * randomFactor);
    }
    
    /**
     * Determine item rarity based on hero level
     * @param {number} heroLevel - Hero's level
     * @returns {string} - Item rarity
     */
    static determineItemRarity(heroLevel) {
        const random = Math.random();
        
        if (heroLevel >= 8) {
            // High level heroes can find legendary items
            if (random < 0.05) return ITEM_RARITY.LEGENDARY;
            if (random < 0.20) return ITEM_RARITY.EPIC;
            if (random < 0.45) return ITEM_RARITY.RARE;
            if (random < 0.75) return ITEM_RARITY.UNCOMMON;
            return ITEM_RARITY.COMMON;
        } else if (heroLevel >= 5) {
            // Mid level heroes can find epic items
            if (random < 0.10) return ITEM_RARITY.EPIC;
            if (random < 0.35) return ITEM_RARITY.RARE;
            if (random < 0.65) return ITEM_RARITY.UNCOMMON;
            return ITEM_RARITY.COMMON;
        } else if (heroLevel >= 3) {
            // Low-mid level heroes can find rare items
            if (random < 0.20) return ITEM_RARITY.RARE;
            if (random < 0.50) return ITEM_RARITY.UNCOMMON;
            return ITEM_RARITY.COMMON;
        } else {
            // Low level heroes mostly find common items
            if (random < 0.30) return ITEM_RARITY.UNCOMMON;
            return ITEM_RARITY.COMMON;
        }
    }
    
    /**
     * Determine item type based on location
     * @param {string} locationType - Type of location
     * @returns {string|null} - Item type or null for any
     */
    static determineItemType(locationType) {
        const random = Math.random();
        
        switch (locationType) {
            case LOCATION_TYPES.TOMB:
                // Tombs often have weapons and armor
                return random < 0.5 ? 'WEAPON' : 'ARMOR';
                
            case LOCATION_TYPES.TEMPLE:
                // Temples often have accessories and consumables
                return random < 0.6 ? 'ACCESSORY' : 'CONSUMABLE';
                
            case LOCATION_TYPES.TOWER:
                // Towers often have magical accessories
                return 'ACCESSORY';
                
            case LOCATION_TYPES.CAVE:
                // Caves can have anything
                return null;
                
            case LOCATION_TYPES.RUINS:
            default:
                // Ruins can have anything
                return null;
        }
    }
    
    /**
     * Determine spell type based on location
     * @param {string} locationType - Type of location
     * @returns {string|null} - Spell type or null for any
     */
    static determineSpellType(locationType) {
        const random = Math.random();
        
        switch (locationType) {
            case LOCATION_TYPES.TEMPLE:
                // Temples favor healing and defensive spells
                return random < 0.6 ? 'HEALING' : 'DEFENSIVE';
                
            case LOCATION_TYPES.TOWER:
                // Towers favor offensive and utility spells
                return random < 0.6 ? 'OFFENSIVE' : 'UTILITY';
                
            case LOCATION_TYPES.TOMB:
                // Tombs favor offensive spells
                return 'OFFENSIVE';
                
            case LOCATION_TYPES.CAVE:
            case LOCATION_TYPES.RUINS:
            default:
                // Other locations can have any spell type
                return null;
        }
    }
    
    /**
     * Create a special location on the map
     * @param {string} locationType - Type of location
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} - Location data
     */
    static createSpecialLocation(locationType, x, y) {
        const locationNames = {
            [LOCATION_TYPES.RUINS]: ['Ancient Ruins', 'Forgotten Ruins', 'Crumbling Ruins', 'Lost Ruins'],
            [LOCATION_TYPES.TEMPLE]: ['Sacred Temple', 'Divine Temple', 'Holy Shrine', 'Ancient Temple'],
            [LOCATION_TYPES.TOWER]: ['Wizard Tower', 'Arcane Spire', 'Magic Tower', 'Mystic Tower'],
            [LOCATION_TYPES.CAVE]: ['Dark Cave', 'Hidden Cave', 'Deep Cavern', 'Crystal Cave'],
            [LOCATION_TYPES.TOMB]: ['Ancient Tomb', 'Royal Tomb', 'Cursed Tomb', 'Forgotten Crypt']
        };
        
        const names = locationNames[locationType] || ['Special Location'];
        const name = names[Math.floor(Math.random() * names.length)];
        
        return {
            type: locationType,
            name: name,
            x: x,
            y: y,
            explored: false,
            exploredBy: []
        };
    }
}