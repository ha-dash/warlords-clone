/**
 * Unit - Base class for all game units
 * Handles unit properties, movement, and basic functionality
 * Requirements: 3.1, 4.1, 4.2, 4.4, 4.5
 */

export const UNIT_TYPES = {
    WARRIOR: 'WARRIOR',
    ARCHER: 'ARCHER',
    CAVALRY: 'CAVALRY',
    HERO: 'HERO'
};

export const UNIT_CONFIG = {
    [UNIT_TYPES.WARRIOR]: {
        health: 10,
        attack: 3,
        defense: 2,
        movement: 2,
        cost: 50,
        name: 'Warrior'
    },
    [UNIT_TYPES.ARCHER]: {
        health: 8,
        attack: 4,
        defense: 1,
        movement: 2,
        cost: 60,
        name: 'Archer'
    },
    [UNIT_TYPES.CAVALRY]: {
        health: 12,
        attack: 5,
        defense: 2,
        movement: 4,
        cost: 80,
        name: 'Cavalry'
    },
    [UNIT_TYPES.HERO]: {
        health: 20,
        attack: 6,
        defense: 4,
        movement: 3,
        cost: 0,
        name: 'Hero'
    }
};

let unitIdCounter = 1;

/**
 * Generate unique unit ID
 * @returns {string} - Unique unit ID
 */
function generateUnitId() {
    return `unit_${unitIdCounter++}`;
}

export class Unit {
    constructor(type, owner, x, y) {
        // Validate parameters
        if (!UNIT_CONFIG[type]) {
            throw new Error(`Invalid unit type: ${type}`);
        }
        if (typeof owner !== 'number' || owner < 0) {
            throw new Error(`Invalid owner: ${owner}`);
        }
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error(`Invalid coordinates: (${x}, ${y})`);
        }

        this.id = generateUnitId();
        this.type = type;
        this.owner = owner;
        this.x = x;
        this.y = y;

        // Get base stats from config
        const config = UNIT_CONFIG[type];
        this.maxHealth = config.health;
        this.health = config.health;
        this.baseAttack = config.attack;
        this.baseDefense = config.defense;
        this.maxMovement = config.movement;
        this.movement = config.movement; // Current movement points
        this.cost = config.cost;
        this.name = config.name;

        // Unit state
        this.hasActed = false;
        this.isSelected = false;
        this.items = []; // Inventory

        console.log(`Unit created: ${this.name} (${this.id}) at (${x}, ${y}) for player ${owner}`);
    }

    /**
     * Get current attack value (base + modifiers)
     * @returns {number} - Attack value
     */
    getAttackValue() {
        // Base implementation - can be overridden by subclasses
        return this.baseAttack;
    }

    /**
     * Get current defense value (base + modifiers)
     * @returns {number} - Defense value
     */
    getDefenseValue() {
        // Base implementation - can be overridden by subclasses
        return this.baseDefense;
    }

    /**
     * Get maximum health
     * @returns {number} - Maximum health
     */
    getMaxHealth() {
        return this.maxHealth;
    }

    /**
     * Get maximum movement points
     * @returns {number} - Maximum movement points
     */
    getMaxMovement() {
        return this.maxMovement;
    }

    /**
     * Check if unit is alive
     * @returns {boolean} - True if alive
     */
    isAlive() {
        return this.health > 0;
    }

    /**
     * Check if unit can move
     * @returns {boolean} - True if can move
     */
    canMove() {
        return this.isAlive() && this.movement > 0 && !this.hasActed;
    }

    /**
     * Check if unit can move to specific coordinates
     * @param {number} newX - Target X coordinate
     * @param {number} newY - Target Y coordinate
     * @param {Object} map - Game map
     * @returns {boolean} - True if can move to target
     */
    canMoveTo(newX, newY, map) {
        if (!this.canMove()) {
            return false;
        }

        if (!map || !map.isValidCoordinate(newX, newY)) {
            return false;
        }

        // Check if destination is reachable
        const path = map.findPath(this.x, this.y, newX, newY, this);
        if (!path) {
            return false;
        }

        // Calculate total movement cost
        let totalCost = 0;
        let currentX = this.x;
        let currentY = this.y;

        for (const step of path) {
            const cost = map.calculateMovementCost(currentX, currentY, step.x, step.y, this);
            if (cost === Infinity) {
                return false;
            }
            totalCost += cost;
            currentX = step.x;
            currentY = step.y;
        }

        return totalCost <= this.movement;
    }

    /**
     * Move unit to new coordinates
     * @param {number} newX - Target X coordinate
     * @param {number} newY - Target Y coordinate
     * @param {Object} map - Game map
     * @returns {boolean} - True if move successful
     */
    move(newX, newY, map) {
        if (!this.canMoveTo(newX, newY, map)) {
            console.warn(`Unit ${this.id} cannot move to (${newX}, ${newY})`);
            return false;
        }

        // Calculate movement cost
        const path = map.findPath(this.x, this.y, newX, newY, this);
        let totalCost = 0;
        let currentX = this.x;
        let currentY = this.y;

        for (const step of path) {
            const cost = map.calculateMovementCost(currentX, currentY, step.x, step.y, this);
            totalCost += cost;
            currentX = step.x;
            currentY = step.y;
        }

        // Update hex references
        const oldHex = map.getHex(this.x, this.y);
        const newHex = map.getHex(newX, newY);

        if (oldHex) {
            oldHex.removeUnit();
        }
        if (newHex) {
            newHex.setUnit(this);
        }

        // Update unit position and movement
        this.x = newX;
        this.y = newY;
        this.movement -= totalCost;

        console.log(`Unit ${this.id} moved to (${newX}, ${newY}), remaining movement: ${this.movement}`);
        return true;
    }

    /**
     * Attack another unit using the CombatSystem
     * @param {Unit} target - Target unit
     * @param {Hex} terrain - Terrain where combat takes place (optional)
     * @returns {Object} - Attack result
     */
    attack(target, terrain = null) {
        // Import CombatSystem dynamically to avoid circular imports
        return import('./CombatSystem.js').then(({ CombatSystem }) => {
            return CombatSystem.resolveCombat(this, target, terrain);
        });
    }

    /**
     * Attack another unit synchronously (for backward compatibility)
     * @param {Unit} target - Target unit
     * @param {Hex} terrain - Terrain where combat takes place (optional)
     * @returns {Object} - Attack result
     */
    attackSync(target, terrain = null) {
        if (!this.isAlive() || !target.isAlive()) {
            return { success: false, reason: 'Dead unit cannot attack or be attacked' };
        }

        if (this.hasActed) {
            return { success: false, reason: 'Unit has already acted this turn' };
        }

        // Calculate attack and defense values
        const attackValue = this.getAttackValue();
        const defenseValue = target.getDefenseValue();

        // Add terrain defense bonus
        let terrainDefenseBonus = 0;
        if (terrain && terrain.getDefenseBonus) {
            terrainDefenseBonus = terrain.getDefenseBonus();
        }

        // Roll dice for randomness (1-6 each)
        const attackRoll = Math.floor(Math.random() * 6) + 1;
        const defenseRoll = Math.floor(Math.random() * 6) + 1;

        const totalAttack = attackValue + attackRoll;
        const totalDefense = defenseValue + defenseRoll + terrainDefenseBonus;

        let damage = 0;
        if (totalAttack > totalDefense) {
            damage = Math.max(1, totalAttack - totalDefense); // Minimum 1 damage on successful hit
            target.takeDamage(damage);

            // Award experience to attacking hero
            if (this.gainExperience && !target.isAlive()) {
                // Simple experience calculation for backward compatibility
                let baseExperience = 10;
                if (target.type === 'HERO') baseExperience = 50;
                else if (target.type === 'CAVALRY') baseExperience = 20;
                else if (target.type === 'ARCHER') baseExperience = 15;

                this.gainExperience(baseExperience);
            }
        }

        // Mark as having acted
        this.hasActed = true;

        const result = {
            success: true,
            attacker: this,
            target: target,
            terrain: terrain,
            attackValue: attackValue,
            defenseValue: defenseValue,
            terrainDefenseBonus: terrainDefenseBonus,
            attackRoll: attackRoll,
            defenseRoll: defenseRoll,
            totalAttack: totalAttack,
            totalDefense: totalDefense,
            damage: damage,
            defenderKilled: !target.isAlive(),
            targetKilled: !target.isAlive() // For backward compatibility
        };

        console.log(`Unit ${this.id} attacked ${target.id}: ${damage} damage dealt`);
        return result;
    }

    /**
     * Take damage
     * @param {number} damage - Damage amount
     */
    takeDamage(damage) {
        if (damage <= 0) return;

        this.health = Math.max(0, this.health - damage);
        console.log(`Unit ${this.id} took ${damage} damage, health: ${this.health}/${this.maxHealth}`);

        if (!this.isAlive()) {
            console.log(`Unit ${this.id} has been destroyed`);
        }
    }

    /**
     * Heal unit
     * @param {number} amount - Heal amount
     */
    heal(amount) {
        if (amount <= 0) return;

        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        const actualHealing = this.health - oldHealth;

        if (actualHealing > 0) {
            console.log(`Unit ${this.id} healed for ${actualHealing}, health: ${this.health}/${this.maxHealth}`);
        }
    }

    /**
     * Reset unit for new turn
     */
    resetForTurn() {
        this.movement = this.maxMovement;
        this.hasActed = false;
        this.isSelected = false;
        console.log(`Unit ${this.id} reset for new turn`);
    }

    /**
     * Select this unit
     */
    select() {
        this.isSelected = true;
    }

    /**
     * Deselect this unit
     */
    deselect() {
        this.isSelected = false;
    }

    /**
     * Get unit display name
     * @returns {string} - Display name
     */
    getDisplayName() {
        return this.name;
    }

    /**
     * Get unit status summary
     * @returns {Object} - Status summary
     */
    getStatus() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            owner: this.owner,
            position: { x: this.x, y: this.y },
            health: this.health,
            maxHealth: this.maxHealth,
            movement: this.movement,
            maxMovement: this.maxMovement,
            attack: this.getAttackValue(),
            defense: this.getDefenseValue(),
            hasActed: this.hasActed,
            isSelected: this.isSelected,
            isAlive: this.isAlive(),
            canMove: this.canMove()
        };
    }

    /**
     * Serialize unit data
     * @returns {Object} - Serialized data
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            owner: this.owner,
            x: this.x,
            y: this.y,
            health: this.health,
            maxHealth: this.maxHealth,
            movement: this.movement,
            maxMovement: this.maxMovement,
            baseAttack: this.baseAttack,
            baseDefense: this.baseDefense,
            cost: this.cost,
            name: this.name,
            hasActed: this.hasActed,
            isSelected: this.isSelected
        };
    }

    /**
     * Deserialize unit data
     * @param {Object} data - Serialized data
     * @returns {Unit} - Unit instance
     */
    static deserialize(data) {
        const unit = new Unit(data.type, data.owner, data.x, data.y);

        // Restore state
        unit.id = data.id;
        unit.health = data.health;
        unit.maxHealth = data.maxHealth;
        unit.movement = data.movement;
        unit.maxMovement = data.maxMovement;
        unit.baseAttack = data.baseAttack;
        unit.baseDefense = data.baseDefense;
        unit.cost = data.cost;
        unit.name = data.name;
        unit.hasActed = data.hasActed;
        unit.isSelected = data.isSelected;

        return unit;
    }

    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        return `${this.name}(${this.id}) at (${this.x}, ${this.y}) - HP: ${this.health}/${this.maxHealth}`;
    }
}