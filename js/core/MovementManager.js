/**
 * MovementManager - Handles movement point tracking and turn-based restrictions
 * Manages unit movement constraints and validation
 * Requirements: 3.4
 */

export class MovementManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.movementHistory = new Map(); // Track movement for undo/validation
        
        console.log('MovementManager initialized');
    }
    
    /**
     * Check if a unit can move (has movement points and hasn't acted)
     * @param {Unit} unit - Unit to check
     * @returns {boolean} - True if unit can move
     */
    canUnitMove(unit) {
        if (!unit || !unit.isAlive()) {
            return false;
        }
        
        // Check if it's the unit owner's turn
        if (unit.owner !== this.gameState.getActivePlayer()) {
            return false;
        }
        
        // Check if unit has movement points
        if (unit.movement <= 0) {
            return false;
        }
        
        // Check if unit has already acted this turn
        if (unit.hasActed) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if a stack can move
     * @param {Stack} stack - Stack to check
     * @returns {boolean} - True if stack can move
     */
    canStackMove(stack) {
        if (!stack || stack.isEmpty()) {
            return false;
        }
        
        // Check if it's the stack owner's turn
        if (stack.owner !== this.gameState.getActivePlayer()) {
            return false;
        }
        
        // All units in stack must be able to move
        return stack.canMove();
    }
    
    /**
     * Get available movement points for a unit
     * @param {Unit} unit - Unit to check
     * @returns {number} - Available movement points
     */
    getAvailableMovement(unit) {
        if (!this.canUnitMove(unit)) {
            return 0;
        }
        
        return unit.movement;
    }
    
    /**
     * Get available movement points for a stack (limited by slowest unit)
     * @param {Stack} stack - Stack to check
     * @returns {number} - Available movement points
     */
    getAvailableStackMovement(stack) {
        if (!this.canStackMove(stack)) {
            return 0;
        }
        
        return stack.getMovementCapacity();
    }
    
    /**
     * Calculate movement cost for a unit to move to target
     * @param {Unit} unit - Unit to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {number} - Movement cost, or Infinity if impossible
     */
    calculateMovementCost(unit, targetX, targetY) {
        if (!unit || !this.gameState.getMap()) {
            return Infinity;
        }
        
        const map = this.gameState.getMap();
        const path = map.findPath(unit.x, unit.y, targetX, targetY, unit);
        
        if (!path) {
            return Infinity;
        }
        
        let totalCost = 0;
        let currentX = unit.x;
        let currentY = unit.y;
        
        for (const step of path) {
            const cost = map.calculateMovementCost(currentX, currentY, step.x, step.y, unit);
            if (cost === Infinity) {
                return Infinity;
            }
            totalCost += cost;
            currentX = step.x;
            currentY = step.y;
        }
        
        return totalCost;
    }
    
    /**
     * Calculate movement cost for a stack to move to target
     * @param {Stack} stack - Stack to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {number} - Movement cost, or Infinity if impossible
     */
    calculateStackMovementCost(stack, targetX, targetY) {
        if (!stack || stack.isEmpty() || !this.gameState.getMap()) {
            return Infinity;
        }
        
        // Use representative unit for pathfinding
        const representativeUnit = stack.getUnits()[0];
        return this.calculateMovementCost(representativeUnit, targetX, targetY);
    }
    
    /**
     * Check if unit can afford to move to target
     * @param {Unit} unit - Unit to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {boolean} - True if unit can afford the move
     */
    canAffordMove(unit, targetX, targetY) {
        if (!this.canUnitMove(unit)) {
            return false;
        }
        
        const cost = this.calculateMovementCost(unit, targetX, targetY);
        return cost !== Infinity && cost <= unit.movement;
    }
    
    /**
     * Check if stack can afford to move to target
     * @param {Stack} stack - Stack to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {boolean} - True if stack can afford the move
     */
    canStackAffordMove(stack, targetX, targetY) {
        if (!this.canStackMove(stack)) {
            return false;
        }
        
        const cost = this.calculateStackMovementCost(stack, targetX, targetY);
        const availableMovement = this.getAvailableStackMovement(stack);
        
        return cost !== Infinity && cost <= availableMovement;
    }
    
    /**
     * Get all reachable hexes for a unit
     * @param {Unit} unit - Unit to check
     * @returns {Array} - Array of reachable hex coordinates
     */
    getReachableHexes(unit) {
        if (!this.canUnitMove(unit) || !this.gameState.getMap()) {
            return [];
        }
        
        const map = this.gameState.getMap();
        return map.getReachableHexes(unit.x, unit.y, unit.movement, unit);
    }
    
    /**
     * Get all reachable hexes for a stack
     * @param {Stack} stack - Stack to check
     * @returns {Array} - Array of reachable hex coordinates
     */
    getReachableHexesForStack(stack) {
        if (!this.canStackMove(stack) || !this.gameState.getMap()) {
            return [];
        }
        
        const map = this.gameState.getMap();
        const representativeUnit = stack.getUnits()[0];
        const availableMovement = this.getAvailableStackMovement(stack);
        
        return map.getReachableHexes(stack.x, stack.y, availableMovement, representativeUnit);
    }
    
    /**
     * Execute unit movement with validation
     * @param {Unit} unit - Unit to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {Object} - Movement result
     */
    moveUnit(unit, targetX, targetY) {
        // Validate movement
        if (!this.canUnitMove(unit)) {
            return {
                success: false,
                reason: 'Unit cannot move',
                unit: unit
            };
        }
        
        if (!this.canAffordMove(unit, targetX, targetY)) {
            return {
                success: false,
                reason: 'Insufficient movement points',
                unit: unit,
                required: this.calculateMovementCost(unit, targetX, targetY),
                available: unit.movement
            };
        }
        
        // Record movement for history
        const moveRecord = {
            unitId: unit.id,
            fromX: unit.x,
            fromY: unit.y,
            toX: targetX,
            toY: targetY,
            cost: this.calculateMovementCost(unit, targetX, targetY),
            turn: this.gameState.getCurrentTurn(),
            timestamp: Date.now()
        };
        
        // Execute the move
        const map = this.gameState.getMap();
        const success = unit.move(targetX, targetY, map);
        
        if (success) {
            // Store movement record
            if (!this.movementHistory.has(this.gameState.getCurrentTurn())) {
                this.movementHistory.set(this.gameState.getCurrentTurn(), []);
            }
            this.movementHistory.get(this.gameState.getCurrentTurn()).push(moveRecord);
            
            console.log(`MovementManager: Unit ${unit.id} moved from (${moveRecord.fromX}, ${moveRecord.fromY}) to (${targetX}, ${targetY})`);
            
            return {
                success: true,
                unit: unit,
                moveRecord: moveRecord,
                remainingMovement: unit.movement
            };
        } else {
            return {
                success: false,
                reason: 'Movement execution failed',
                unit: unit
            };
        }
    }
    
    /**
     * Execute stack movement with validation
     * @param {Stack} stack - Stack to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {Object} - Movement result
     */
    moveStack(stack, targetX, targetY) {
        // Validate movement
        if (!this.canStackMove(stack)) {
            return {
                success: false,
                reason: 'Stack cannot move',
                stack: stack
            };
        }
        
        if (!this.canStackAffordMove(stack, targetX, targetY)) {
            return {
                success: false,
                reason: 'Insufficient movement points',
                stack: stack,
                required: this.calculateStackMovementCost(stack, targetX, targetY),
                available: this.getAvailableStackMovement(stack)
            };
        }
        
        // Record movement for history
        const moveRecord = {
            stackId: stack.id,
            unitIds: stack.getUnits().map(u => u.id),
            fromX: stack.x,
            fromY: stack.y,
            toX: targetX,
            toY: targetY,
            cost: this.calculateStackMovementCost(stack, targetX, targetY),
            turn: this.gameState.getCurrentTurn(),
            timestamp: Date.now()
        };
        
        // Execute the move
        const map = this.gameState.getMap();
        const success = stack.move(targetX, targetY, map);
        
        if (success) {
            // Store movement record
            if (!this.movementHistory.has(this.gameState.getCurrentTurn())) {
                this.movementHistory.set(this.gameState.getCurrentTurn(), []);
            }
            this.movementHistory.get(this.gameState.getCurrentTurn()).push(moveRecord);
            
            console.log(`MovementManager: Stack ${stack.id} moved from (${moveRecord.fromX}, ${moveRecord.fromY}) to (${targetX}, ${targetY})`);
            
            return {
                success: true,
                stack: stack,
                moveRecord: moveRecord,
                remainingMovement: this.getAvailableStackMovement(stack)
            };
        } else {
            return {
                success: false,
                reason: 'Movement execution failed',
                stack: stack
            };
        }
    }
    
    /**
     * Reset movement for all units of a player
     * @param {number} playerId - Player ID
     */
    resetPlayerMovement(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) {
            return;
        }
        
        // Reset all player units
        const playerUnits = this.gameState.getPlayerUnits(playerId);
        for (const unit of playerUnits) {
            unit.resetForTurn();
        }
        
        console.log(`MovementManager: Reset movement for player ${playerId} (${playerUnits.length} units)`);
    }
    
    /**
     * Reset movement for all units (new turn)
     */
    resetAllMovement() {
        for (const unit of this.gameState.units.values()) {
            unit.resetForTurn();
        }
        
        console.log('MovementManager: Reset movement for all units');
    }
    
    /**
     * Get movement history for a turn
     * @param {number} turn - Turn number (optional, defaults to current turn)
     * @returns {Array} - Array of movement records
     */
    getMovementHistory(turn = null) {
        const targetTurn = turn || this.gameState.getCurrentTurn();
        return this.movementHistory.get(targetTurn) || [];
    }
    
    /**
     * Get total movement used by a unit this turn
     * @param {Unit} unit - Unit to check
     * @returns {number} - Total movement used
     */
    getMovementUsedThisTurn(unit) {
        const history = this.getMovementHistory();
        let totalUsed = 0;
        
        for (const record of history) {
            if (record.unitId === unit.id || (record.unitIds && record.unitIds.includes(unit.id))) {
                totalUsed += record.cost;
            }
        }
        
        return totalUsed;
    }
    
    /**
     * Check if any unit has moved this turn
     * @param {number} playerId - Player ID (optional)
     * @returns {boolean} - True if any unit has moved
     */
    hasAnyUnitMoved(playerId = null) {
        const history = this.getMovementHistory();
        
        if (playerId === null) {
            return history.length > 0;
        }
        
        // Check if any unit belonging to the player has moved
        const playerUnits = this.gameState.getPlayerUnits(playerId);
        const playerUnitIds = new Set(playerUnits.map(u => u.id));
        
        return history.some(record => {
            if (record.unitId && playerUnitIds.has(record.unitId)) {
                return true;
            }
            if (record.unitIds && record.unitIds.some(id => playerUnitIds.has(id))) {
                return true;
            }
            return false;
        });
    }
    
    /**
     * Get movement statistics for current turn
     * @returns {Object} - Movement statistics
     */
    getMovementStatistics() {
        const history = this.getMovementHistory();
        const stats = {
            totalMoves: history.length,
            unitMoves: 0,
            stackMoves: 0,
            totalMovementUsed: 0,
            playerStats: {}
        };
        
        for (const record of history) {
            if (record.unitId) {
                stats.unitMoves++;
            } else if (record.stackId) {
                stats.stackMoves++;
            }
            
            stats.totalMovementUsed += record.cost;
            
            // Track per-player stats
            const unit = this.gameState.getUnit(record.unitId || record.unitIds[0]);
            if (unit) {
                const playerId = unit.owner;
                if (!stats.playerStats[playerId]) {
                    stats.playerStats[playerId] = {
                        moves: 0,
                        movementUsed: 0
                    };
                }
                stats.playerStats[playerId].moves++;
                stats.playerStats[playerId].movementUsed += record.cost;
            }
        }
        
        return stats;
    }
    
    /**
     * Clear movement history for a turn
     * @param {number} turn - Turn number (optional, defaults to current turn)
     */
    clearMovementHistory(turn = null) {
        const targetTurn = turn || this.gameState.getCurrentTurn();
        this.movementHistory.delete(targetTurn);
        console.log(`MovementManager: Cleared movement history for turn ${targetTurn}`);
    }
    
    /**
     * Clear all movement history
     */
    clearAllMovementHistory() {
        this.movementHistory.clear();
        console.log('MovementManager: Cleared all movement history');
    }
    
    /**
     * Validate movement constraints for game state
     * @returns {Object} - Validation result
     */
    validateMovementConstraints() {
        const issues = [];
        const activePlayerId = this.gameState.getActivePlayer();
        
        // Check all units
        for (const unit of this.gameState.units.values()) {
            // Units not belonging to active player should not be able to move
            if (unit.owner !== activePlayerId && this.canUnitMove(unit)) {
                issues.push(`Unit ${unit.id} (owner ${unit.owner}) can move but it's player ${activePlayerId}'s turn`);
            }
            
            // Units with no movement should not be able to move
            if (unit.movement <= 0 && this.canUnitMove(unit)) {
                issues.push(`Unit ${unit.id} has no movement but can still move`);
            }
            
            // Units that have acted should not be able to move
            if (unit.hasActed && this.canUnitMove(unit)) {
                issues.push(`Unit ${unit.id} has acted but can still move`);
            }
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        const stats = this.getMovementStatistics();
        return `MovementManager: ${stats.totalMoves} moves this turn, ${stats.totalMovementUsed} movement used`;
    }
}