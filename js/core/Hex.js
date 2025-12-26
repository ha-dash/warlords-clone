/**
 * Hex - Represents a single hexagon on the game map
 * Contains terrain information and references to units/cities
 */

export const TERRAIN_TYPES = {
    PLAINS: 'PLAINS',
    FOREST: 'FOREST',
    MOUNTAIN: 'MOUNTAIN',
    WATER: 'WATER',
    ROAD: 'ROAD'
};

export const TERRAIN_CONFIG = {
    [TERRAIN_TYPES.PLAINS]: {
        movementCost: 1,
        defenseBonus: 0,
        passable: true,
        name: 'Plains',
        color: '#90EE90'
    },
    [TERRAIN_TYPES.FOREST]: {
        movementCost: 2,
        defenseBonus: 1,
        passable: true,
        name: 'Forest',
        color: '#228B22'
    },
    [TERRAIN_TYPES.MOUNTAIN]: {
        movementCost: 3,
        defenseBonus: 2,
        passable: true,
        name: 'Mountain',
        color: '#8B4513'
    },
    [TERRAIN_TYPES.WATER]: {
        movementCost: 999,
        defenseBonus: 0,
        passable: false,
        name: 'Water',
        color: '#4169E1'
    },
    [TERRAIN_TYPES.ROAD]: {
        movementCost: 0.5,
        defenseBonus: 0,
        passable: true,
        name: 'Road',
        color: '#D2B48C'
    }
};

export class Hex {
    constructor(x, y, terrain = TERRAIN_TYPES.PLAINS) {
        this.x = x;
        this.y = y;
        this.terrain = terrain;
        this.unit = null;
        this.city = null;
        this.hasRiver = false;

        // Validate terrain type
        if (!TERRAIN_CONFIG[terrain]) {
            throw new Error(`Invalid terrain type: ${terrain}`);
        }
    }

    /**
     * Get movement cost for this hex
     * @param {Object} unit - Unit attempting to move (optional, for future unit-specific costs)
     * @returns {number} - Movement cost
     */
    getMovementCost(unit = null) {
        const config = TERRAIN_CONFIG[this.terrain];
        if (!config) {
            throw new Error(`Unknown terrain type: ${this.terrain}`);
        }

        // TODO: In the future, consider unit-specific movement costs
        // For example, flying units might ignore terrain costs
        return config.movementCost;
    }

    /**
     * Get defense bonus for this hex
     * @returns {number} - Defense bonus
     */
    getDefenseBonus() {
        const config = TERRAIN_CONFIG[this.terrain];
        if (!config) {
            throw new Error(`Unknown terrain type: ${this.terrain}`);
        }

        return config.defenseBonus;
    }

    /**
     * Check if this hex is passable
     * @param {Object} unit - Unit attempting to move (optional, for future unit-specific passability)
     * @returns {boolean} - True if passable
     */
    isPassable(unit = null) {
        const config = TERRAIN_CONFIG[this.terrain];
        if (!config) {
            throw new Error(`Unknown terrain type: ${this.terrain}`);
        }

        // TODO: In the future, consider unit-specific passability
        // For example, flying units might pass over water
        return config.passable;
    }

    /**
     * Check if this hex is occupied by a unit
     * @returns {boolean} - True if occupied
     */
    isOccupied() {
        return this.unit !== null;
    }

    /**
     * Check if this hex has a city
     * @returns {boolean} - True if has city
     */
    hasCity() {
        return this.city !== null;
    }

    /**
     * Set the unit on this hex
     * @param {Object} unit - Unit to place
     */
    setUnit(unit) {
        this.unit = unit;
    }

    /**
     * Remove the unit from this hex
     */
    removeUnit() {
        this.unit = null;
    }

    /**
     * Set the city on this hex
     * @param {Object} city - City to place
     */
    setCity(city) {
        this.city = city;
    }

    /**
     * Remove the city from this hex
     */
    removeCity() {
        this.city = null;
    }

    /**
     * Get terrain configuration
     * @returns {Object} - Terrain configuration
     */
    getTerrainConfig() {
        return TERRAIN_CONFIG[this.terrain];
    }

    /**
     * Get terrain name
     * @returns {string} - Human-readable terrain name
     */
    getTerrainName() {
        const config = TERRAIN_CONFIG[this.terrain];
        return config ? config.name : 'Unknown';
    }

    /**
     * Get terrain color for rendering
     * @returns {string} - Hex color code
     */
    getTerrainColor() {
        const config = TERRAIN_CONFIG[this.terrain];
        return config ? config.color : '#FFFFFF';
    }

    /**
     * Get hex coordinates as string
     * @returns {string} - Coordinates string
     */
    getCoordinatesString() {
        return `(${this.x}, ${this.y})`;
    }

    /**
     * Check if this hex is adjacent to another hex
     * @param {Hex} otherHex - Other hex to check
     * @returns {boolean} - True if adjacent
     */
    isAdjacentTo(otherHex) {
        const dx = Math.abs(this.x - otherHex.x);
        const dy = Math.abs(this.y - otherHex.y);

        // In a square grid, adjacent means distance of 1 in x or y (but not both for diagonal)
        // For now using square grid logic, can be updated for hexagonal later
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    /**
     * Calculate distance to another hex
     * @param {Hex} otherHex - Other hex
     * @returns {number} - Distance
     */
    distanceTo(otherHex) {
        // Manhattan distance for square grid
        return Math.abs(this.x - otherHex.x) + Math.abs(this.y - otherHex.y);
    }

    /**
     * Serialize hex data
     * @returns {Object} - Serialized data
     */
    serialize() {
        return {
            x: this.x,
            y: this.y,
            terrain: this.terrain,
            unit: this.unit ? this.unit.id : null,
            city: this.city ? this.city.id : null,
            hasRiver: this.hasRiver
        };
    }

    /**
     * Deserialize hex data
     * @param {Object} data - Serialized data
     * @returns {Hex} - Hex instance
     */
    static deserialize(data) {
        const hex = new Hex(data.x, data.y, data.terrain);
        if (data.hasRiver) hex.hasRiver = true;
        // Note: units and cities will be restored by their respective systems
        return hex;
    }

    /**
     * Create a copy of this hex
     * @returns {Hex} - Copy of this hex
     */
    clone() {
        const clone = new Hex(this.x, this.y, this.terrain);
        clone.unit = this.unit;
        clone.city = this.city;
        clone.hasRiver = this.hasRiver;
        return clone;
    }

    /**
     * Get a string representation of this hex
     * @returns {string} - String representation
     */
    toString() {
        return `Hex(${this.x}, ${this.y}, ${this.terrain})`;
    }
}