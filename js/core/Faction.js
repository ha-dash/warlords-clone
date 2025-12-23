/**
 * Faction - Represents different factions/races in the game
 * Defines faction-specific characteristics, units, and bonuses
 */

export class Faction {
    constructor(name, displayName, description, color, bonuses = {}) {
        this.name = name;
        this.displayName = displayName;
        this.description = description;
        this.color = color;
        this.bonuses = bonuses;
        
        // Available units for this faction
        this.availableUnits = [];
        
        // Starting units and cities
        this.startingUnits = [];
        this.startingCities = [];
        
        console.log(`Faction created: ${displayName}`);
    }
    
    /**
     * Add an available unit type to this faction
     * @param {string} unitType - Unit type identifier
     * @param {Object} unitConfig - Unit configuration
     */
    addAvailableUnit(unitType, unitConfig = {}) {
        if (!this.availableUnits.find(unit => unit.type === unitType)) {
            this.availableUnits.push({
                type: unitType,
                config: unitConfig
            });
        }
    }
    
    /**
     * Remove an available unit type from this faction
     * @param {string} unitType - Unit type identifier
     */
    removeAvailableUnit(unitType) {
        this.availableUnits = this.availableUnits.filter(unit => unit.type !== unitType);
    }
    
    /**
     * Check if this faction can produce a unit type
     * @param {string} unitType - Unit type to check
     * @returns {boolean} - True if faction can produce this unit
     */
    canProduceUnit(unitType) {
        return this.availableUnits.some(unit => unit.type === unitType);
    }
    
    /**
     * Get unit configuration for a specific unit type
     * @param {string} unitType - Unit type
     * @returns {Object|null} - Unit configuration or null if not available
     */
    getUnitConfig(unitType) {
        const unit = this.availableUnits.find(unit => unit.type === unitType);
        return unit ? unit.config : null;
    }
    
    /**
     * Get all available unit types for this faction
     * @returns {Array} - Array of unit type strings
     */
    getAvailableUnitTypes() {
        return this.availableUnits.map(unit => unit.type);
    }
    
    /**
     * Add a starting unit for new games
     * @param {string} unitType - Unit type
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} config - Additional unit configuration
     */
    addStartingUnit(unitType, x, y, config = {}) {
        this.startingUnits.push({
            type: unitType,
            x: x,
            y: y,
            config: config
        });
    }
    
    /**
     * Add a starting city for new games
     * @param {string} cityName - City name
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} size - City size
     */
    addStartingCity(cityName, x, y, size = 1) {
        this.startingCities.push({
            name: cityName,
            x: x,
            y: y,
            size: size
        });
    }
    
    /**
     * Get faction bonus for a specific type
     * @param {string} bonusType - Type of bonus (e.g., 'movement', 'attack', 'defense')
     * @returns {number} - Bonus value (0 if no bonus)
     */
    getBonus(bonusType) {
        return this.bonuses[bonusType] || 0;
    }
    
    /**
     * Check if faction has a specific bonus
     * @param {string} bonusType - Type of bonus to check
     * @returns {boolean} - True if faction has this bonus
     */
    hasBonus(bonusType) {
        return bonusType in this.bonuses && this.bonuses[bonusType] !== 0;
    }
    
    /**
     * Serialize faction data
     * @returns {Object} - Serialized faction data
     */
    serialize() {
        return {
            name: this.name,
            displayName: this.displayName,
            description: this.description,
            color: this.color,
            bonuses: { ...this.bonuses },
            availableUnits: [...this.availableUnits],
            startingUnits: [...this.startingUnits],
            startingCities: [...this.startingCities]
        };
    }
    
    /**
     * Deserialize faction data
     * @param {Object} data - Serialized faction data
     * @returns {Faction} - New Faction instance
     */
    static deserialize(data) {
        const faction = new Faction(
            data.name,
            data.displayName,
            data.description,
            data.color,
            data.bonuses
        );
        
        faction.availableUnits = data.availableUnits || [];
        faction.startingUnits = data.startingUnits || [];
        faction.startingCities = data.startingCities || [];
        
        return faction;
    }
    
    /**
     * Get string representation of faction
     * @returns {string} - String representation
     */
    toString() {
        return `Faction(${this.name}, ${this.displayName})`;
    }
}

/**
 * FactionManager - Manages all available factions in the game
 */
export class FactionManager {
    constructor() {
        this.factions = new Map();
        this.initializeDefaultFactions();
    }
    
    /**
     * Initialize default factions for the game
     */
    initializeDefaultFactions() {
        // Humans faction
        const humans = new Faction(
            'HUMANS',
            'Humans',
            'Balanced faction with versatile units and good economic bonuses',
            '#0066CC',
            { gold: 0.1, production: 0.1 } // 10% bonus to gold and production
        );
        humans.addAvailableUnit('WARRIOR', { cost: 50 });
        humans.addAvailableUnit('ARCHER', { cost: 60 });
        humans.addAvailableUnit('CAVALRY', { cost: 80 });
        humans.addAvailableUnit('HERO', { cost: 0 });
        this.addFaction(humans);
        
        // Elves faction
        const elves = new Faction(
            'ELVES',
            'Elves',
            'Forest dwellers with bonuses to archery and movement in forests',
            '#00CC66',
            { archery: 0.2, forestMovement: 0.5 } // 20% archery bonus, 50% forest movement bonus
        );
        elves.addAvailableUnit('ARCHER', { cost: 50 }); // Cheaper archers
        elves.addAvailableUnit('RANGER', { cost: 70 });
        elves.addAvailableUnit('TREANT', { cost: 100 });
        elves.addAvailableUnit('HERO', { cost: 0 });
        this.addFaction(elves);
        
        // Demons faction
        const demons = new Faction(
            'DEMONS',
            'Demons',
            'Aggressive faction with powerful units and combat bonuses',
            '#CC0066',
            { attack: 0.15, intimidation: 0.1 } // 15% attack bonus, 10% intimidation
        );
        demons.addAvailableUnit('IMP', { cost: 40 });
        demons.addAvailableUnit('DEMON', { cost: 80 });
        demons.addAvailableUnit('BALROG', { cost: 150 });
        demons.addAvailableUnit('HERO', { cost: 0 });
        this.addFaction(demons);
        
        // Dwarves faction
        const dwarves = new Faction(
            'DWARVES',
            'Dwarves',
            'Hardy mountain folk with defensive bonuses and strong cities',
            '#8B4513',
            { defense: 0.2, mountainMovement: 0.5 } // 20% defense bonus, 50% mountain movement bonus
        );
        dwarves.addAvailableUnit('WARRIOR', { cost: 55 });
        dwarves.addAvailableUnit('CROSSBOW', { cost: 65 });
        dwarves.addAvailableUnit('BERSERKER', { cost: 90 });
        dwarves.addAvailableUnit('HERO', { cost: 0 });
        this.addFaction(dwarves);
        
        console.log(`FactionManager initialized with ${this.factions.size} factions`);
    }
    
    /**
     * Add a faction to the manager
     * @param {Faction} faction - Faction to add
     */
    addFaction(faction) {
        if (faction instanceof Faction) {
            this.factions.set(faction.name, faction);
            console.log(`Added faction: ${faction.displayName}`);
        }
    }
    
    /**
     * Remove a faction from the manager
     * @param {string} factionName - Name of faction to remove
     */
    removeFaction(factionName) {
        if (this.factions.has(factionName)) {
            this.factions.delete(factionName);
            console.log(`Removed faction: ${factionName}`);
        }
    }
    
    /**
     * Get a faction by name
     * @param {string} factionName - Name of faction
     * @returns {Faction|null} - Faction instance or null if not found
     */
    getFaction(factionName) {
        return this.factions.get(factionName) || null;
    }
    
    /**
     * Get all available factions
     * @returns {Array} - Array of all factions
     */
    getAllFactions() {
        return Array.from(this.factions.values());
    }
    
    /**
     * Get all faction names
     * @returns {Array} - Array of faction names
     */
    getFactionNames() {
        return Array.from(this.factions.keys());
    }
    
    /**
     * Check if a faction exists
     * @param {string} factionName - Name of faction to check
     * @returns {boolean} - True if faction exists
     */
    hasFaction(factionName) {
        return this.factions.has(factionName);
    }
    
    /**
     * Get faction choices for UI
     * @returns {Array} - Array of faction choice objects
     */
    getFactionChoices() {
        return this.getAllFactions().map(faction => ({
            name: faction.name,
            displayName: faction.displayName,
            description: faction.description,
            color: faction.color,
            bonuses: faction.bonuses
        }));
    }
    
    /**
     * Validate faction selection
     * @param {string} factionName - Faction name to validate
     * @returns {boolean} - True if valid faction
     */
    isValidFaction(factionName) {
        return this.hasFaction(factionName);
    }
    
    /**
     * Serialize all factions
     * @returns {Object} - Serialized factions data
     */
    serialize() {
        const serializedFactions = {};
        for (const [name, faction] of this.factions) {
            serializedFactions[name] = faction.serialize();
        }
        return serializedFactions;
    }
    
    /**
     * Deserialize factions data
     * @param {Object} data - Serialized factions data
     */
    deserialize(data) {
        this.factions.clear();
        for (const [name, factionData] of Object.entries(data)) {
            const faction = Faction.deserialize(factionData);
            this.factions.set(name, faction);
        }
    }
}

// Create and export a global faction manager instance
export const factionManager = new FactionManager();