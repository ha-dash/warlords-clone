/**
 * Stack - Manages grouped unit movement
 * Handles multiple units moving together as a single entity
 * Requirements: 3.3
 */

let stackIdCounter = 1;

/**
 * Generate unique stack ID
 * @returns {string} - Unique stack ID
 */
function generateStackId() {
    return `stack_${stackIdCounter++}`;
}

export class Stack {
    constructor(x, y, owner) {
        // Validate parameters
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error(`Invalid coordinates: (${x}, ${y})`);
        }
        if (typeof owner !== 'number' || owner < 0) {
            throw new Error(`Invalid owner: ${owner}`);
        }

        this.id = generateStackId();
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.units = [];
        this.isSelected = false;
        
        console.log(`Stack created: ${this.id} at (${x}, ${y}) for player ${owner}`);
    }
    
    /**
     * Add unit to stack
     * @param {Unit} unit - Unit to add
     * @returns {boolean} - True if added successfully
     */
    addUnit(unit) {
        if (!unit || typeof unit !== 'object') {
            return false;
        }
        
        // Check if unit belongs to same player
        if (unit.owner !== this.owner) {
            console.warn(`Cannot add unit ${unit.id} to stack ${this.id}: different owners`);
            return false;
        }
        
        // Check if unit is at same position
        if (unit.x !== this.x || unit.y !== this.y) {
            console.warn(`Cannot add unit ${unit.id} to stack ${this.id}: different positions`);
            return false;
        }
        
        // Check if unit is already in this stack
        if (this.units.includes(unit)) {
            return false;
        }
        
        this.units.push(unit);
        console.log(`Unit ${unit.id} added to stack ${this.id} (${this.units.length} units total)`);
        return true;
    }
    
    /**
     * Remove unit from stack
     * @param {Unit} unit - Unit to remove
     * @returns {boolean} - True if removed successfully
     */
    removeUnit(unit) {
        const index = this.units.indexOf(unit);
        if (index === -1) {
            return false;
        }
        
        this.units.splice(index, 1);
        console.log(`Unit ${unit.id} removed from stack ${this.id} (${this.units.length} units remaining)`);
        return true;
    }
    
    /**
     * Remove unit by ID
     * @param {string} unitId - Unit ID to remove
     * @returns {Unit|null} - Removed unit or null
     */
    removeUnitById(unitId) {
        const unit = this.units.find(u => u.id === unitId);
        if (unit && this.removeUnit(unit)) {
            return unit;
        }
        return null;
    }
    
    /**
     * Get all units in stack
     * @returns {Array} - Array of units
     */
    getUnits() {
        return [...this.units];
    }
    
    /**
     * Get unit count
     * @returns {number} - Number of units in stack
     */
    getUnitCount() {
        return this.units.length;
    }
    
    /**
     * Check if stack is empty
     * @returns {boolean} - True if empty
     */
    isEmpty() {
        return this.units.length === 0;
    }
    
    /**
     * Get stack movement capacity (limited by slowest unit)
     * @returns {number} - Movement points available
     */
    getMovementCapacity() {
        if (this.isEmpty()) {
            return 0;
        }
        
        // Find the unit with the least remaining movement
        let minMovement = Infinity;
        for (const unit of this.units) {
            if (unit.movement < minMovement) {
                minMovement = unit.movement;
            }
        }
        
        return minMovement === Infinity ? 0 : minMovement;
    }
    
    /**
     * Check if stack can move
     * @returns {boolean} - True if can move
     */
    canMove() {
        if (this.isEmpty()) {
            return false;
        }
        
        // All units must be able to move
        return this.units.every(unit => unit.canMove()) && this.getMovementCapacity() > 0;
    }
    
    /**
     * Check if stack can move to specific coordinates
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
        
        // Check if destination hex can accommodate all units
        const targetHex = map.getHex(newX, newY);
        if (!targetHex) {
            return false;
        }
        
        // For now, assume only one stack per hex (can be enhanced later for stacking rules)
        if (targetHex.isOccupied() && (targetHex.unit.x !== this.x || targetHex.unit.y !== this.y)) {
            return false;
        }
        
        // Check if any unit in the stack can make the move
        // Use the first unit as representative for pathfinding
        const representativeUnit = this.units[0];
        if (!representativeUnit.canMoveTo(newX, newY, map)) {
            return false;
        }
        
        // Calculate movement cost for the stack
        const path = map.findPath(this.x, this.y, newX, newY, representativeUnit);
        if (!path) {
            return false;
        }
        
        let totalCost = 0;
        let currentX = this.x;
        let currentY = this.y;
        
        for (const step of path) {
            const cost = map.calculateMovementCost(currentX, currentY, step.x, step.y, representativeUnit);
            if (cost === Infinity) {
                return false;
            }
            totalCost += cost;
            currentX = step.x;
            currentY = step.y;
        }
        
        return totalCost <= this.getMovementCapacity();
    }
    
    /**
     * Move entire stack to new coordinates
     * @param {number} newX - Target X coordinate
     * @param {number} newY - Target Y coordinate
     * @param {Object} map - Game map
     * @returns {boolean} - True if move successful
     */
    move(newX, newY, map) {
        if (!this.canMoveTo(newX, newY, map)) {
            console.warn(`Stack ${this.id} cannot move to (${newX}, ${newY})`);
            return false;
        }
        
        // Calculate movement cost using representative unit
        const representativeUnit = this.units[0];
        const path = map.findPath(this.x, this.y, newX, newY, representativeUnit);
        let totalCost = 0;
        let currentX = this.x;
        let currentY = this.y;
        
        for (const step of path) {
            const cost = map.calculateMovementCost(currentX, currentY, step.x, step.y, representativeUnit);
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
        
        // Move all units in the stack
        for (const unit of this.units) {
            unit.x = newX;
            unit.y = newY;
            unit.movement -= totalCost;
        }
        
        // Update stack position
        this.x = newX;
        this.y = newY;
        
        // Set one unit as the hex occupant (for display purposes)
        if (newHex && this.units.length > 0) {
            newHex.setUnit(this.units[0]);
        }
        
        console.log(`Stack ${this.id} moved to (${newX}, ${newY}) with ${this.units.length} units`);
        return true;
    }
    
    /**
     * Split stack - remove specified units to form new stack
     * @param {Array} unitsToSplit - Units to move to new stack
     * @returns {Stack|null} - New stack or null if invalid
     */
    split(unitsToSplit) {
        if (!Array.isArray(unitsToSplit) || unitsToSplit.length === 0) {
            return null;
        }
        
        // Validate all units belong to this stack
        for (const unit of unitsToSplit) {
            if (!this.units.includes(unit)) {
                console.warn(`Unit ${unit.id} is not in stack ${this.id}`);
                return null;
            }
        }
        
        // Don't allow splitting all units (would leave empty stack)
        if (unitsToSplit.length >= this.units.length) {
            console.warn(`Cannot split all units from stack ${this.id}`);
            return null;
        }
        
        // Create new stack at same position
        const newStack = new Stack(this.x, this.y, this.owner);
        
        // Move units to new stack
        for (const unit of unitsToSplit) {
            this.removeUnit(unit);
            newStack.addUnit(unit);
        }
        
        console.log(`Stack ${this.id} split: ${unitsToSplit.length} units moved to new stack ${newStack.id}`);
        return newStack;
    }
    
    /**
     * Merge with another stack
     * @param {Stack} otherStack - Stack to merge with
     * @returns {boolean} - True if merge successful
     */
    merge(otherStack) {
        if (!otherStack || otherStack === this) {
            return false;
        }
        
        // Check if stacks belong to same player
        if (otherStack.owner !== this.owner) {
            console.warn(`Cannot merge stacks: different owners`);
            return false;
        }
        
        // Check if stacks are at same position
        if (otherStack.x !== this.x || otherStack.y !== this.y) {
            console.warn(`Cannot merge stacks: different positions`);
            return false;
        }
        
        // Move all units from other stack to this stack
        const unitsToMove = [...otherStack.units];
        for (const unit of unitsToMove) {
            otherStack.removeUnit(unit);
            this.addUnit(unit);
        }
        
        console.log(`Stack ${otherStack.id} merged into stack ${this.id} (${this.units.length} units total)`);
        return true;
    }
    
    /**
     * Get strongest unit in stack (highest attack)
     * @returns {Unit|null} - Strongest unit or null if empty
     */
    getStrongestUnit() {
        if (this.isEmpty()) {
            return null;
        }
        
        let strongest = this.units[0];
        for (const unit of this.units) {
            if (unit.getAttackValue() > strongest.getAttackValue()) {
                strongest = unit;
            }
        }
        
        return strongest;
    }
    
    /**
     * Get unit with highest defense in stack
     * @returns {Unit|null} - Most defensive unit or null if empty
     */
    getMostDefensiveUnit() {
        if (this.isEmpty()) {
            return null;
        }
        
        let mostDefensive = this.units[0];
        for (const unit of this.units) {
            if (unit.getDefenseValue() > mostDefensive.getDefenseValue()) {
                mostDefensive = unit;
            }
        }
        
        return mostDefensive;
    }
    
    /**
     * Get total attack value of stack
     * @returns {number} - Combined attack value
     */
    getTotalAttack() {
        return this.units.reduce((total, unit) => total + unit.getAttackValue(), 0);
    }
    
    /**
     * Get total defense value of stack
     * @returns {number} - Combined defense value
     */
    getTotalDefense() {
        return this.units.reduce((total, unit) => total + unit.getDefenseValue(), 0);
    }
    
    /**
     * Reset all units in stack for new turn
     */
    resetForTurn() {
        for (const unit of this.units) {
            unit.resetForTurn();
        }
        this.isSelected = false;
        console.log(`Stack ${this.id} reset for new turn`);
    }
    
    /**
     * Select this stack
     */
    select() {
        this.isSelected = true;
        for (const unit of this.units) {
            unit.select();
        }
    }
    
    /**
     * Deselect this stack
     */
    deselect() {
        this.isSelected = false;
        for (const unit of this.units) {
            unit.deselect();
        }
    }
    
    /**
     * Get stack display name
     * @returns {string} - Display name
     */
    getDisplayName() {
        if (this.isEmpty()) {
            return 'Empty Stack';
        }
        
        if (this.units.length === 1) {
            return this.units[0].getDisplayName();
        }
        
        return `Stack of ${this.units.length}`;
    }
    
    /**
     * Get stack status summary
     * @returns {Object} - Status summary
     */
    getStatus() {
        return {
            id: this.id,
            owner: this.owner,
            position: { x: this.x, y: this.y },
            unitCount: this.units.length,
            movementCapacity: this.getMovementCapacity(),
            totalAttack: this.getTotalAttack(),
            totalDefense: this.getTotalDefense(),
            canMove: this.canMove(),
            isSelected: this.isSelected,
            isEmpty: this.isEmpty(),
            units: this.units.map(unit => ({
                id: unit.id,
                type: unit.type,
                name: unit.getDisplayName(),
                health: unit.health,
                maxHealth: unit.getMaxHealth(),
                movement: unit.movement
            }))
        };
    }
    
    /**
     * Serialize stack data
     * @returns {Object} - Serialized data
     */
    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            owner: this.owner,
            units: this.units.map(unit => unit.serialize()),
            isSelected: this.isSelected
        };
    }
    
    /**
     * Deserialize stack data
     * @param {Object} data - Serialized data
     * @param {Function} unitDeserializer - Function to deserialize units
     * @returns {Stack} - Stack instance
     */
    static deserialize(data, unitDeserializer) {
        const stack = new Stack(data.x, data.y, data.owner);
        stack.id = data.id;
        stack.isSelected = data.isSelected;
        
        // Deserialize units
        if (data.units && Array.isArray(data.units)) {
            for (const unitData of data.units) {
                const unit = unitDeserializer(unitData);
                if (unit) {
                    stack.addUnit(unit);
                }
            }
        }
        
        return stack;
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        return `Stack ${this.id} at (${this.x}, ${this.y}) with ${this.units.length} units`;
    }
}