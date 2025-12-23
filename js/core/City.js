/**
 * City - Represents cities that can be captured and produce units
 * Handles city ownership, unit production, and resource management
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { UNIT_TYPES, UNIT_CONFIG } from './Unit.js';
import { factionManager } from './Faction.js';

let cityIdCounter = 1;

/**
 * Generate unique city ID
 * @returns {string} - Unique city ID
 */
function generateCityId() {
    return `city_${cityIdCounter++}`;
}

export class City {
    constructor(name, owner, x, y, size = 1) {
        // Validate parameters
        if (!name || typeof name !== 'string') {
            throw new Error(`Invalid city name: ${name}`);
        }
        if (typeof owner !== 'number' || owner < 0) {
            throw new Error(`Invalid owner: ${owner}`);
        }
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error(`Invalid coordinates: (${x}, ${y})`);
        }
        if (typeof size !== 'number' || size < 1) {
            throw new Error(`Invalid city size: ${size}`);
        }

        this.id = generateCityId();
        this.name = name;
        this.owner = owner;
        this.x = x;
        this.y = y;
        this.size = size;
        
        // Production queue - array of unit types to produce
        this.production = [];
        
        // Garrison - units stationed in the city
        this.garrison = [];
        
        // City resources and production capacity
        this.goldPerTurn = this.calculateGoldProduction();
        this.productionCapacity = this.calculateProductionCapacity();
        
        // Production state
        this.currentProduction = null; // Currently producing unit
        this.productionProgress = 0; // Progress towards completing current production
        
        console.log(`City created: ${this.name} (${this.id}) at (${x}, ${y}) for player ${owner}, size ${size}`);
    }
    
    /**
     * Calculate gold production per turn based on city size
     * @returns {number} - Gold per turn
     */
    calculateGoldProduction() {
        return this.size * 50; // Base 50 gold per size level
    }
    
    /**
     * Calculate production capacity based on city size
     * @returns {number} - Production points per turn
     */
    calculateProductionCapacity() {
        return this.size * 10; // Base 10 production points per size level
    }
    
    /**
     * Get the faction of the city owner
     * @param {Array} players - Array of players
     * @returns {string|null} - Faction name or null if not found
     */
    getOwnerFaction(players) {
        const player = players.find(p => p.id === this.owner);
        return player ? player.faction : null;
    }
    
    /**
     * Check if city can produce a specific unit type
     * @param {string} unitType - Unit type to check
     * @param {Array} players - Array of players
     * @returns {boolean} - True if city can produce this unit
     */
    canProduce(unitType, players) {
        // Check if unit type exists
        if (!UNIT_CONFIG[unitType]) {
            return false;
        }
        
        // Get owner's faction
        const ownerFaction = this.getOwnerFaction(players);
        if (!ownerFaction) {
            return false;
        }
        
        // Check if faction can produce this unit type
        const faction = factionManager.getFaction(ownerFaction);
        if (!faction) {
            return false;
        }
        
        return faction.canProduceUnit(unitType);
    }
    
    /**
     * Get production cost for a unit type
     * @param {string} unitType - Unit type
     * @param {Array} players - Array of players
     * @returns {number} - Production cost in gold, or -1 if cannot produce
     */
    getProductionCost(unitType, players) {
        if (!this.canProduce(unitType, players)) {
            return -1;
        }
        
        // Get base cost from unit config
        let baseCost = UNIT_CONFIG[unitType].cost;
        
        // Heroes are free but can only be produced once per city
        if (unitType === UNIT_TYPES.HERO) {
            baseCost = 0;
        }
        
        // Get faction-specific cost modifications
        const ownerFaction = this.getOwnerFaction(players);
        if (ownerFaction) {
            const faction = factionManager.getFaction(ownerFaction);
            if (faction) {
                const unitConfig = faction.getUnitConfig(unitType);
                if (unitConfig && unitConfig.cost !== undefined) {
                    baseCost = unitConfig.cost;
                }
            }
        }
        
        return baseCost;
    }
    
    /**
     * Get all unit types this city can produce
     * @param {Array} players - Array of players
     * @returns {Array} - Array of producible unit types
     */
    getAvailableUnits(players) {
        const ownerFaction = this.getOwnerFaction(players);
        if (!ownerFaction) {
            return [];
        }
        
        const faction = factionManager.getFaction(ownerFaction);
        if (!faction) {
            return [];
        }
        
        return faction.getAvailableUnitTypes().filter(unitType => {
            // Check if unit type exists in UNIT_CONFIG
            return UNIT_CONFIG[unitType] !== undefined;
        });
    }
    
    /**
     * Start producing a unit
     * @param {string} unitType - Unit type to produce
     * @param {Array} players - Array of players
     * @returns {boolean} - True if production started successfully
     */
    produceUnit(unitType, players) {
        // Check if can produce this unit
        if (!this.canProduce(unitType, players)) {
            console.warn(`City ${this.name} cannot produce ${unitType}`);
            return false;
        }
        
        // Check if already producing something
        if (this.currentProduction) {
            console.warn(`City ${this.name} is already producing ${this.currentProduction}`);
            return false;
        }
        
        // Get production cost
        const cost = this.getProductionCost(unitType, players);
        if (cost < 0) {
            return false;
        }
        
        // Check if player can afford it
        const player = players.find(p => p.id === this.owner);
        if (!player) {
            console.warn(`City ${this.name} owner not found`);
            return false;
        }
        
        if (!player.canAfford(cost)) {
            console.warn(`Player ${player.name} cannot afford ${unitType} (cost: ${cost}, has: ${player.resources.gold})`);
            return false;
        }
        
        // Deduct cost and start production
        if (player.spendGold(cost)) {
            this.currentProduction = unitType;
            this.productionProgress = 0;
            console.log(`City ${this.name} started producing ${unitType} for ${cost} gold`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Process production for one turn
     * @returns {string|null} - Completed unit type or null if nothing completed
     */
    processProduction() {
        if (!this.currentProduction) {
            return null;
        }
        
        // Add production capacity to progress
        this.productionProgress += this.productionCapacity;
        
        // Get required production points for current unit
        const requiredProduction = this.getRequiredProductionPoints(this.currentProduction);
        
        // Check if production is complete
        if (this.productionProgress >= requiredProduction) {
            const completedUnit = this.currentProduction;
            this.currentProduction = null;
            this.productionProgress = 0;
            
            console.log(`City ${this.name} completed production of ${completedUnit}`);
            return completedUnit;
        }
        
        return null;
    }
    
    /**
     * Get required production points for a unit type
     * @param {string} unitType - Unit type
     * @returns {number} - Required production points
     */
    getRequiredProductionPoints(unitType) {
        if (!UNIT_CONFIG[unitType]) {
            return 100; // Default
        }
        
        // Production points roughly equal to unit cost
        const baseCost = UNIT_CONFIG[unitType].cost;
        
        // Heroes require special handling
        if (unitType === UNIT_TYPES.HERO) {
            return 200; // Heroes take longer to produce even though they're free
        }
        
        return Math.max(10, baseCost); // Minimum 10 production points
    }
    
    /**
     * Cancel current production
     * @param {Array} players - Array of players
     * @returns {boolean} - True if production was cancelled and refunded
     */
    cancelProduction(players) {
        if (!this.currentProduction) {
            return false;
        }
        
        // Calculate refund (partial refund based on progress)
        const cost = this.getProductionCost(this.currentProduction, players);
        const requiredProduction = this.getRequiredProductionPoints(this.currentProduction);
        const progressRatio = this.productionProgress / requiredProduction;
        const refund = Math.floor(cost * (1 - progressRatio));
        
        // Refund to player
        const player = players.find(p => p.id === this.owner);
        if (player && refund > 0) {
            player.addGold(refund);
        }
        
        console.log(`City ${this.name} cancelled production of ${this.currentProduction}, refunded ${refund} gold`);
        
        this.currentProduction = null;
        this.productionProgress = 0;
        
        return true;
    }
    
    /**
     * Change city ownership
     * @param {number} newOwner - New owner player ID
     * @param {Array} players - Array of players
     */
    changeOwner(newOwner, players) {
        if (typeof newOwner !== 'number' || newOwner < 0) {
            throw new Error(`Invalid new owner: ${newOwner}`);
        }
        
        const oldOwner = this.owner;
        this.owner = newOwner;
        
        // Cancel any current production when city changes hands
        if (this.currentProduction) {
            this.cancelProduction(players);
        }
        
        // Clear garrison (units flee or are captured)
        this.garrison = [];
        
        // Update player statistics
        const oldPlayer = players.find(p => p.id === oldOwner);
        const newPlayer = players.find(p => p.id === newOwner);
        
        if (oldPlayer) {
            oldPlayer.recordCityLoss();
        }
        if (newPlayer) {
            newPlayer.recordCityCapture();
        }
        
        console.log(`City ${this.name} ownership changed from player ${oldOwner} to player ${newOwner}`);
    }
    
    /**
     * Add unit to garrison
     * @param {Unit} unit - Unit to add to garrison
     */
    addToGarrison(unit) {
        if (unit && !this.garrison.includes(unit)) {
            this.garrison.push(unit);
            console.log(`Unit ${unit.id} added to ${this.name} garrison`);
        }
    }
    
    /**
     * Remove unit from garrison
     * @param {Unit} unit - Unit to remove from garrison
     */
    removeFromGarrison(unit) {
        const index = this.garrison.indexOf(unit);
        if (index !== -1) {
            this.garrison.splice(index, 1);
            console.log(`Unit ${unit.id} removed from ${this.name} garrison`);
        }
    }
    
    /**
     * Get garrison strength (total attack power)
     * @returns {number} - Total garrison attack power
     */
    getGarrisonStrength() {
        return this.garrison.reduce((total, unit) => {
            return total + (unit.isAlive() ? unit.getAttackValue() : 0);
        }, 0);
    }
    
    /**
     * Process city turn (generate gold, process production)
     * @param {Array} players - Array of players
     * @returns {Object} - Turn results
     */
    processTurn(players) {
        const results = {
            goldGenerated: 0,
            unitCompleted: null
        };
        
        // Generate gold for owner
        const player = players.find(p => p.id === this.owner);
        if (player) {
            const goldGenerated = this.goldPerTurn;
            player.addGold(goldGenerated);
            results.goldGenerated = goldGenerated;
        }
        
        // Process production
        const completedUnit = this.processProduction();
        if (completedUnit) {
            results.unitCompleted = completedUnit;
        }
        
        return results;
    }
    
    /**
     * Get city status summary
     * @param {Array} players - Array of players
     * @returns {Object} - City status
     */
    getStatus(players) {
        const ownerFaction = this.getOwnerFaction(players);
        const availableUnits = this.getAvailableUnits(players);
        
        return {
            id: this.id,
            name: this.name,
            owner: this.owner,
            ownerFaction: ownerFaction,
            position: { x: this.x, y: this.y },
            size: this.size,
            goldPerTurn: this.goldPerTurn,
            productionCapacity: this.productionCapacity,
            currentProduction: this.currentProduction,
            productionProgress: this.productionProgress,
            garrisonSize: this.garrison.length,
            garrisonStrength: this.getGarrisonStrength(),
            availableUnits: availableUnits
        };
    }
    
    /**
     * Serialize city data
     * @returns {Object} - Serialized data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            owner: this.owner,
            x: this.x,
            y: this.y,
            size: this.size,
            production: [...this.production],
            garrison: this.garrison.map(unit => unit.serialize()),
            goldPerTurn: this.goldPerTurn,
            productionCapacity: this.productionCapacity,
            currentProduction: this.currentProduction,
            productionProgress: this.productionProgress
        };
    }
    
    /**
     * Deserialize city data
     * @param {Object} data - Serialized data
     * @returns {City} - City instance
     */
    static deserialize(data) {
        const city = new City(data.name, data.owner, data.x, data.y, data.size);
        
        // Restore state
        city.id = data.id;
        city.production = data.production || [];
        city.goldPerTurn = data.goldPerTurn || city.calculateGoldProduction();
        city.productionCapacity = data.productionCapacity || city.calculateProductionCapacity();
        city.currentProduction = data.currentProduction || null;
        city.productionProgress = data.productionProgress || 0;
        
        // Garrison will be restored separately by the game state manager
        city.garrison = [];
        
        return city;
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        return `${this.name}(${this.id}) at (${this.x}, ${this.y}) - Owner: ${this.owner}, Size: ${this.size}`;
    }
}