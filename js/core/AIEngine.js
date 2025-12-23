/**
 * AIEngine - Handles AI player decision making and actions
 * Implements AI logic for unit movement, combat, and city management
 * Requirements: 1.5, 7.2
 */

export class AIEngine {
    constructor(gameState) {
        this.gameState = gameState;
        this.difficulty = 'NORMAL'; // EASY, NORMAL, HARD
        this.personality = 'BALANCED'; // AGGRESSIVE, DEFENSIVE, BALANCED, ECONOMIC
        
        // AI decision weights (can be adjusted based on difficulty/personality)
        this.weights = {
            unitMovement: 1.0,
            combat: 1.2,
            cityProduction: 0.8,
            exploration: 0.6,
            defense: 0.9
        };
        
        // AI state tracking
        this.turnActions = [];
        this.lastDecisionTime = 0;
        this.thinkingTime = 1000; // Base thinking time in ms
        
        console.log('AIEngine initialized');
    }
    
    /**
     * Set AI difficulty level
     * @param {string} difficulty - Difficulty level (EASY, NORMAL, HARD)
     */
    setDifficulty(difficulty) {
        const validDifficulties = ['EASY', 'NORMAL', 'HARD'];
        if (!validDifficulties.includes(difficulty)) {
            console.warn(`Invalid difficulty: ${difficulty}, using NORMAL`);
            difficulty = 'NORMAL';
        }
        
        this.difficulty = difficulty;
        
        // Adjust weights based on difficulty
        switch (difficulty) {
            case 'EASY':
                this.weights.combat = 0.8;
                this.weights.defense = 0.7;
                this.thinkingTime = 500;
                break;
            case 'NORMAL':
                this.weights.combat = 1.2;
                this.weights.defense = 0.9;
                this.thinkingTime = 1000;
                break;
            case 'HARD':
                this.weights.combat = 1.5;
                this.weights.defense = 1.2;
                this.thinkingTime = 1500;
                break;
        }
        
        console.log(`AI difficulty set to ${difficulty}`);
    }
    
    /**
     * Set AI personality
     * @param {string} personality - AI personality (AGGRESSIVE, DEFENSIVE, BALANCED, ECONOMIC)
     */
    setPersonality(personality) {
        const validPersonalities = ['AGGRESSIVE', 'DEFENSIVE', 'BALANCED', 'ECONOMIC'];
        if (!validPersonalities.includes(personality)) {
            console.warn(`Invalid personality: ${personality}, using BALANCED`);
            personality = 'BALANCED';
        }
        
        this.personality = personality;
        
        // Adjust weights based on personality
        switch (personality) {
            case 'AGGRESSIVE':
                this.weights.combat = 1.8;
                this.weights.exploration = 1.2;
                this.weights.defense = 0.6;
                this.weights.cityProduction = 0.7;
                break;
            case 'DEFENSIVE':
                this.weights.combat = 0.8;
                this.weights.exploration = 0.4;
                this.weights.defense = 1.6;
                this.weights.cityProduction = 1.1;
                break;
            case 'ECONOMIC':
                this.weights.combat = 0.9;
                this.weights.exploration = 0.8;
                this.weights.defense = 1.0;
                this.weights.cityProduction = 1.5;
                break;
            case 'BALANCED':
            default:
                this.weights.combat = 1.2;
                this.weights.exploration = 0.6;
                this.weights.defense = 0.9;
                this.weights.cityProduction = 0.8;
                break;
        }
        
        console.log(`AI personality set to ${personality}`);
    }
    
    /**
     * Process AI turn for a player
     * @param {number} playerId - AI player ID
     * @returns {Promise} - Promise that resolves when AI turn is complete
     */
    async processAITurn(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player || !player.isAI) {
            console.error(`Invalid AI player: ${playerId}`);
            return;
        }
        
        console.log(`AIEngine: Processing turn for ${player.name}`);
        this.turnActions = [];
        this.lastDecisionTime = Date.now();
        
        try {
            // Phase 1: City Management
            await this.manageCities(playerId);
            
            // Phase 2: Unit Movement and Combat
            await this.manageUnits(playerId);
            
            // Phase 3: Strategic Decisions
            await this.makeStrategicDecisions(playerId);
            
            console.log(`AIEngine: Completed turn for ${player.name} with ${this.turnActions.length} actions`);
            
        } catch (error) {
            console.error(`AIEngine: Error processing turn for ${player.name}:`, error);
        }
    }
    
    /**
     * Manage cities for AI player
     * @param {number} playerId - AI player ID
     */
    async manageCities(playerId) {
        const cities = this.gameState.getPlayerCities(playerId);
        const player = this.gameState.getPlayer(playerId);
        
        console.log(`AIEngine: Managing ${cities.length} cities for player ${playerId}`);
        
        for (const city of cities) {
            await this.manageSingleCity(city, player);
        }
    }
    
    /**
     * Manage a single city
     * @param {City} city - City to manage
     * @param {Player} player - Player who owns the city
     */
    async manageSingleCity(city, player) {
        // Skip if city is already producing something
        if (city.currentProduction) {
            console.log(`AIEngine: City ${city.name} already producing ${city.currentProduction}`);
            return;
        }
        
        // Get available units to produce
        const availableUnits = city.getAvailableUnits(this.gameState.getPlayers());
        if (availableUnits.length === 0) {
            return;
        }
        
        // Evaluate what to produce based on current situation
        const productionChoice = this.evaluateProductionChoice(city, player, availableUnits);
        
        if (productionChoice) {
            const success = city.produceUnit(productionChoice, this.gameState.getPlayers());
            if (success) {
                this.turnActions.push({
                    type: 'CITY_PRODUCTION',
                    cityId: city.id,
                    unitType: productionChoice,
                    cost: city.getProductionCost(productionChoice, this.gameState.getPlayers())
                });
                console.log(`AIEngine: City ${city.name} started producing ${productionChoice}`);
            }
        }
        
        // Add small delay for realism
        await this.sleep(100);
    }
    
    /**
     * Evaluate what unit to produce in a city
     * @param {City} city - City to evaluate
     * @param {Player} player - Player who owns the city
     * @param {Array} availableUnits - Available unit types
     * @returns {string|null} - Unit type to produce or null
     */
    evaluateProductionChoice(city, player, availableUnits) {
        const scores = new Map();
        
        for (const unitType of availableUnits) {
            const cost = city.getProductionCost(unitType, this.gameState.getPlayers());
            
            // Skip if can't produce or can't afford
            if (cost < 0 || cost > player.resources.gold) {
                continue;
            }
            
            let score = 0;
            
            // Base score based on unit strength
            const unitConfig = this.getUnitConfig(unitType);
            if (unitConfig) {
                score += (unitConfig.attack + unitConfig.defense + unitConfig.movement) * 10;
            }
            
            // Adjust score based on current needs
            score += this.evaluateUnitNeed(unitType, player);
            
            // Adjust score based on cost efficiency
            if (cost > 0) {
                score = score / Math.sqrt(cost); // Prefer cost-effective units
            }
            
            // Apply personality weights
            score *= this.weights.cityProduction;
            
            scores.set(unitType, score);
        }
        
        // Return unit type with highest score
        if (scores.size === 0) {
            return null;
        }
        
        let bestUnit = null;
        let bestScore = -1;
        
        for (const [unitType, score] of scores) {
            if (score > bestScore) {
                bestScore = score;
                bestUnit = unitType;
            }
        }
        
        return bestUnit;
    }
    
    /**
     * Evaluate how much the AI needs a specific unit type
     * @param {string} unitType - Unit type to evaluate
     * @param {Player} player - Player to evaluate for
     * @returns {number} - Need score (higher = more needed)
     */
    evaluateUnitNeed(unitType, player) {
        const playerUnits = this.gameState.getPlayerUnits(player.id);
        const unitCounts = new Map();
        
        // Count existing units by type
        for (const unit of playerUnits) {
            unitCounts.set(unit.type, (unitCounts.get(unit.type) || 0) + 1);
        }
        
        const currentCount = unitCounts.get(unitType) || 0;
        let needScore = 0;
        
        // Basic need based on unit type
        switch (unitType) {
            case 'WARRIOR':
                // Always need some basic units
                needScore = Math.max(0, 3 - currentCount) * 20;
                break;
            case 'ARCHER':
                // Useful for defense and ranged combat
                needScore = Math.max(0, 2 - currentCount) * 15;
                break;
            case 'CAVALRY':
                // Good for mobility and offense
                needScore = Math.max(0, 2 - currentCount) * 25;
                break;
            case 'HERO':
                // Heroes are valuable but expensive to maintain
                needScore = Math.max(0, 1 - currentCount) * 50;
                break;
        }
        
        // Adjust based on personality
        if (this.personality === 'AGGRESSIVE') {
            if (unitType === 'CAVALRY' || unitType === 'HERO') {
                needScore *= 1.5;
            }
        } else if (this.personality === 'DEFENSIVE') {
            if (unitType === 'ARCHER' || unitType === 'WARRIOR') {
                needScore *= 1.3;
            }
        }
        
        return needScore;
    }
    
    /**
     * Manage units for AI player
     * @param {number} playerId - AI player ID
     */
    async manageUnits(playerId) {
        const units = this.gameState.getPlayerUnits(playerId);
        
        console.log(`AIEngine: Managing ${units.length} units for player ${playerId}`);
        
        // Sort units by priority (heroes first, then by attack power)
        const sortedUnits = units.sort((a, b) => {
            if (a.type === 'HERO' && b.type !== 'HERO') return -1;
            if (b.type === 'HERO' && a.type !== 'HERO') return 1;
            return b.getAttackValue() - a.getAttackValue();
        });
        
        for (const unit of sortedUnits) {
            if (this.gameState.canUnitMove(unit)) {
                await this.manageUnit(unit);
            }
        }
    }
    
    /**
     * Manage a single unit
     * @param {Unit} unit - Unit to manage
     */
    async manageUnit(unit) {
        // Look for combat opportunities first
        const combatTarget = this.findBestCombatTarget(unit);
        if (combatTarget) {
            await this.executeUnitCombat(unit, combatTarget);
            return;
        }
        
        // If no combat, look for movement opportunities
        const moveTarget = this.findBestMoveTarget(unit);
        if (moveTarget) {
            await this.executeUnitMovement(unit, moveTarget.x, moveTarget.y);
        }
        
        // Add small delay for realism
        await this.sleep(50);
    }
    
    /**
     * Find the best combat target for a unit
     * @param {Unit} unit - Unit looking for combat
     * @returns {Unit|null} - Best target or null if none found
     */
    findBestCombatTarget(unit) {
        const enemies = this.findNearbyEnemies(unit, 2); // Look within 2 hexes
        if (enemies.length === 0) {
            return null;
        }
        
        let bestTarget = null;
        let bestScore = -1;
        
        for (const enemy of enemies) {
            // Check if we can reach the enemy
            if (!this.canUnitReachTarget(unit, enemy.x, enemy.y)) {
                continue;
            }
            
            const score = this.evaluateCombatTarget(unit, enemy);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        }
        
        return bestTarget;
    }
    
    /**
     * Find nearby enemy units
     * @param {Unit} unit - Unit to search from
     * @param {number} range - Search range in hexes
     * @returns {Array} - Array of enemy units
     */
    findNearbyEnemies(unit, range) {
        const enemies = [];
        const allUnits = Array.from(this.gameState.getUnits().values());
        
        for (const otherUnit of allUnits) {
            if (otherUnit.owner === unit.owner || !otherUnit.isAlive()) {
                continue;
            }
            
            const distance = this.calculateDistance(unit.x, unit.y, otherUnit.x, otherUnit.y);
            if (distance <= range) {
                enemies.push(otherUnit);
            }
        }
        
        return enemies;
    }
    
    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} - Distance
     */
    calculateDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance for simplicity
    }
    
    /**
     * Check if unit can reach target coordinates
     * @param {Unit} unit - Unit to check
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {boolean} - True if unit can reach target
     */
    canUnitReachTarget(unit, targetX, targetY) {
        if (!this.gameState.getMap()) {
            return false;
        }
        
        // Check if target is adjacent (for combat)
        const distance = this.calculateDistance(unit.x, unit.y, targetX, targetY);
        if (distance === 1) {
            return true; // Adjacent, can attack directly
        }
        
        // Check if we can move adjacent to target
        const adjacentHexes = this.getAdjacentHexes(targetX, targetY);
        for (const hex of adjacentHexes) {
            if (this.gameState.canUnitMove(unit)) {
                const movementCost = this.gameState.movementManager.calculateMovementCost(unit, hex.x, hex.y);
                if (movementCost !== Infinity && movementCost <= unit.movement) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get adjacent hex coordinates
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @returns {Array} - Array of adjacent hex coordinates
     */
    getAdjacentHexes(x, y) {
        // For square grid, adjacent hexes are the 4 cardinal directions
        const adjacent = [
            { x: x - 1, y: y },     // West
            { x: x + 1, y: y },     // East
            { x: x, y: y - 1 },     // North
            { x: x, y: y + 1 }      // South
        ];
        
        // Filter out invalid coordinates if map exists
        const map = this.gameState.getMap();
        if (map && map.isValidCoordinate) {
            return adjacent.filter(hex => map.isValidCoordinate(hex.x, hex.y));
        }
        
        // If no map, return all adjacent hexes (for testing)
        return adjacent;
    }
    
    /**
     * Evaluate how good a combat target is
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} target - Target unit
     * @returns {number} - Target score (higher = better target)
     */
    evaluateCombatTarget(attacker, target) {
        let score = 0;
        
        // Base score from target value
        score += target.getAttackValue() * 10; // Prefer dangerous enemies
        score += target.cost * 0.5; // Prefer expensive enemies
        
        // Bonus for heroes
        if (target.type === 'HERO') {
            score += 100;
        }
        
        // Consider combat odds
        const attackPower = attacker.getAttackValue();
        const defensePower = target.getDefenseValue();
        
        if (attackPower > defensePower) {
            score += (attackPower - defensePower) * 20; // Bonus for favorable odds
        } else {
            score -= (defensePower - attackPower) * 10; // Penalty for unfavorable odds
        }
        
        // Consider target health
        const healthRatio = target.health / target.getMaxHealth();
        score += (1 - healthRatio) * 50; // Prefer wounded enemies
        
        // Apply personality weights
        score *= this.weights.combat;
        
        return score;
    }
    
    /**
     * Execute combat with a target
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} target - Target unit
     */
    async executeUnitCombat(attacker, target) {
        // Move adjacent to target if needed
        const distance = this.calculateDistance(attacker.x, attacker.y, target.x, target.y);
        if (distance > 1) {
            const adjacentHex = this.findBestAdjacentHex(attacker, target.x, target.y);
            if (adjacentHex) {
                const moveResult = this.gameState.moveUnit(attacker, adjacentHex.x, adjacentHex.y);
                if (moveResult.success) {
                    this.turnActions.push({
                        type: 'UNIT_MOVEMENT',
                        unitId: attacker.id,
                        fromX: moveResult.moveRecord.fromX,
                        fromY: moveResult.moveRecord.fromY,
                        toX: adjacentHex.x,
                        toY: adjacentHex.y,
                        cost: moveResult.moveRecord.cost
                    });
                }
            }
        }
        
        // Attack the target
        if (this.calculateDistance(attacker.x, attacker.y, target.x, target.y) === 1) {
            const combatResult = attacker.attackSync(target);
            if (combatResult.success) {
                this.turnActions.push({
                    type: 'UNIT_COMBAT',
                    attackerId: attacker.id,
                    targetId: target.id,
                    damage: combatResult.damage,
                    targetKilled: combatResult.targetKilled
                });
                
                console.log(`AIEngine: Unit ${attacker.id} attacked ${target.id} for ${combatResult.damage} damage`);
                
                // Remove dead unit from game state
                if (combatResult.targetKilled) {
                    this.gameState.removeUnit(target.id);
                    console.log(`AIEngine: Unit ${target.id} was destroyed`);
                }
            }
        }
    }
    
    /**
     * Find the best adjacent hex to move to for attacking a target
     * @param {Unit} unit - Unit that wants to attack
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {Object|null} - Best adjacent hex or null
     */
    findBestAdjacentHex(unit, targetX, targetY) {
        const adjacentHexes = this.getAdjacentHexes(targetX, targetY);
        let bestHex = null;
        let bestScore = -1;
        
        for (const hex of adjacentHexes) {
            // Check if we can move there
            const movementCost = this.gameState.movementManager.calculateMovementCost(unit, hex.x, hex.y);
            if (movementCost === Infinity || movementCost > unit.movement) {
                continue;
            }
            
            // Check if hex is occupied by friendly unit
            const occupant = this.gameState.getUnitAt(hex.x, hex.y);
            if (occupant && occupant.owner === unit.owner) {
                continue;
            }
            
            // Score based on terrain and tactical position
            let score = 100 - movementCost; // Prefer closer hexes
            
            // Add terrain bonuses if available
            const gameHex = this.gameState.getHex(hex.x, hex.y);
            if (gameHex && gameHex.getDefenseBonus) {
                score += gameHex.getDefenseBonus() * 10;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestHex = hex;
            }
        }
        
        return bestHex;
    }
    
    /**
     * Find the best movement target for a unit
     * @param {Unit} unit - Unit to find movement for
     * @returns {Object|null} - Best movement target or null
     */
    findBestMoveTarget(unit) {
        const reachableHexes = this.gameState.getUnitReachableHexes(unit);
        if (reachableHexes.length === 0) {
            return null;
        }
        
        let bestTarget = null;
        let bestScore = -1;
        
        for (const hex of reachableHexes) {
            const score = this.evaluateMovementTarget(unit, hex.x, hex.y);
            if (score > bestScore) {
                bestScore = score;
                bestTarget = hex;
            }
        }
        
        return bestTarget;
    }
    
    /**
     * Evaluate how good a movement target is
     * @param {Unit} unit - Unit considering movement
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {number} - Movement score (higher = better)
     */
    evaluateMovementTarget(unit, targetX, targetY) {
        let score = 0;
        
        // Prefer moving towards enemies
        const nearestEnemy = this.findNearestEnemy(unit);
        if (nearestEnemy) {
            const currentDistance = this.calculateDistance(unit.x, unit.y, nearestEnemy.x, nearestEnemy.y);
            const newDistance = this.calculateDistance(targetX, targetY, nearestEnemy.x, nearestEnemy.y);
            
            if (newDistance < currentDistance) {
                score += (currentDistance - newDistance) * 30; // Bonus for getting closer to enemies
            }
        }
        
        // Prefer moving towards enemy cities
        const nearestEnemyCity = this.findNearestEnemyCity(unit);
        if (nearestEnemyCity) {
            const currentDistance = this.calculateDistance(unit.x, unit.y, nearestEnemyCity.x, nearestEnemyCity.y);
            const newDistance = this.calculateDistance(targetX, targetY, nearestEnemyCity.x, nearestEnemyCity.y);
            
            if (newDistance < currentDistance) {
                score += (currentDistance - newDistance) * 20; // Bonus for getting closer to enemy cities
            }
        }
        
        // Prefer defensive positions
        const gameHex = this.gameState.getHex(targetX, targetY);
        if (gameHex && gameHex.getDefenseBonus) {
            score += gameHex.getDefenseBonus() * 15;
        }
        
        // Exploration bonus (prefer unexplored areas)
        score += this.getExplorationBonus(targetX, targetY);
        
        // Apply personality weights
        if (this.personality === 'AGGRESSIVE') {
            // Aggressive AI prefers moving towards enemies
            if (nearestEnemy) {
                const newDistance = this.calculateDistance(targetX, targetY, nearestEnemy.x, nearestEnemy.y);
                score += Math.max(0, 10 - newDistance) * 10;
            }
        } else if (this.personality === 'DEFENSIVE') {
            // Defensive AI prefers staying near own cities
            const nearestOwnCity = this.findNearestOwnCity(unit);
            if (nearestOwnCity) {
                const newDistance = this.calculateDistance(targetX, targetY, nearestOwnCity.x, nearestOwnCity.y);
                score += Math.max(0, 5 - newDistance) * 15;
            }
        }
        
        return score;
    }
    
    /**
     * Find nearest enemy unit
     * @param {Unit} unit - Unit to search from
     * @returns {Unit|null} - Nearest enemy or null
     */
    findNearestEnemy(unit) {
        const allUnits = Array.from(this.gameState.getUnits().values());
        let nearestEnemy = null;
        let nearestDistance = Infinity;
        
        for (const otherUnit of allUnits) {
            if (otherUnit.owner === unit.owner || !otherUnit.isAlive()) {
                continue;
            }
            
            const distance = this.calculateDistance(unit.x, unit.y, otherUnit.x, otherUnit.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = otherUnit;
            }
        }
        
        return nearestEnemy;
    }
    
    /**
     * Find nearest enemy city
     * @param {Unit} unit - Unit to search from
     * @returns {City|null} - Nearest enemy city or null
     */
    findNearestEnemyCity(unit) {
        const allCities = Array.from(this.gameState.getCities().values());
        let nearestCity = null;
        let nearestDistance = Infinity;
        
        for (const city of allCities) {
            if (city.owner === unit.owner) {
                continue;
            }
            
            const distance = this.calculateDistance(unit.x, unit.y, city.x, city.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestCity = city;
            }
        }
        
        return nearestCity;
    }
    
    /**
     * Find nearest own city
     * @param {Unit} unit - Unit to search from
     * @returns {City|null} - Nearest own city or null
     */
    findNearestOwnCity(unit) {
        const ownCities = this.gameState.getPlayerCities(unit.owner);
        let nearestCity = null;
        let nearestDistance = Infinity;
        
        for (const city of ownCities) {
            const distance = this.calculateDistance(unit.x, unit.y, city.x, city.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestCity = city;
            }
        }
        
        return nearestCity;
    }
    
    /**
     * Get exploration bonus for a hex
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} - Exploration bonus
     */
    getExplorationBonus(x, y) {
        // Simple exploration bonus - prefer hexes further from starting position
        // This is a placeholder - could be enhanced with fog of war system
        const mapCenter = {
            x: Math.floor((this.gameState.getMap()?.width || 20) / 2),
            y: Math.floor((this.gameState.getMap()?.height || 15) / 2)
        };
        
        const distanceFromCenter = this.calculateDistance(x, y, mapCenter.x, mapCenter.y);
        return Math.min(distanceFromCenter * 2, 20) * this.weights.exploration;
    }
    
    /**
     * Execute unit movement
     * @param {Unit} unit - Unit to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     */
    async executeUnitMovement(unit, targetX, targetY) {
        const moveResult = this.gameState.moveUnit(unit, targetX, targetY);
        if (moveResult.success) {
            this.turnActions.push({
                type: 'UNIT_MOVEMENT',
                unitId: unit.id,
                fromX: moveResult.moveRecord.fromX,
                fromY: moveResult.moveRecord.fromY,
                toX: targetX,
                toY: targetY,
                cost: moveResult.moveRecord.cost
            });
            
            console.log(`AIEngine: Unit ${unit.id} moved from (${moveResult.moveRecord.fromX}, ${moveResult.moveRecord.fromY}) to (${targetX}, ${targetY})`);
        }
    }
    
    /**
     * Make strategic decisions (long-term planning)
     * @param {number} playerId - AI player ID
     */
    async makeStrategicDecisions(playerId) {
        const player = this.gameState.getPlayer(playerId);
        
        // Evaluate overall strategic situation
        const situation = this.evaluateStrategicSituation(playerId);
        
        console.log(`AIEngine: Strategic situation for ${player.name}:`, situation);
        
        // Make strategic decisions based on situation
        // This is a placeholder for more complex strategic AI
        
        await this.sleep(100);
    }
    
    /**
     * Evaluate the strategic situation for a player
     * @param {number} playerId - Player ID to evaluate
     * @returns {Object} - Strategic situation assessment
     */
    evaluateStrategicSituation(playerId) {
        const player = this.gameState.getPlayer(playerId);
        const playerUnits = this.gameState.getPlayerUnits(playerId);
        const playerCities = this.gameState.getPlayerCities(playerId);
        
        // Count enemy units and cities
        let enemyUnits = 0;
        let enemyCities = 0;
        
        for (const otherPlayer of this.gameState.getPlayers()) {
            if (otherPlayer.id !== playerId && !otherPlayer.isEliminated) {
                enemyUnits += this.gameState.getPlayerUnits(otherPlayer.id).length;
                enemyCities += this.gameState.getPlayerCities(otherPlayer.id).length;
            }
        }
        
        const militaryStrength = this.calculateMilitaryStrength(playerUnits);
        const economicStrength = playerCities.length * 50 + player.resources.gold;
        
        return {
            ownUnits: playerUnits.length,
            ownCities: playerCities.length,
            enemyUnits: enemyUnits,
            enemyCities: enemyCities,
            gold: player.resources.gold,
            militaryStrength: militaryStrength,
            economicStrength: economicStrength,
            position: this.calculatePosition(militaryStrength, economicStrength, enemyUnits, enemyCities)
        };
    }
    
    /**
     * Calculate military strength of units
     * @param {Array} units - Array of units
     * @returns {number} - Military strength score
     */
    calculateMilitaryStrength(units) {
        return units.reduce((total, unit) => {
            if (!unit.isAlive()) return total;
            return total + unit.getAttackValue() + unit.getDefenseValue();
        }, 0);
    }
    
    /**
     * Calculate strategic position based on strength comparison
     * @param {number} militaryStrength - Own military strength
     * @param {number} economicStrength - Own economic strength
     * @param {number} enemyUnits - Number of enemy units
     * @param {number} enemyCities - Number of enemy cities
     * @returns {string} - Position assessment (WINNING, LOSING, EVEN)
     */
    calculatePosition(militaryStrength, economicStrength, enemyUnits, enemyCities) {
        const ownStrength = militaryStrength + economicStrength;
        const enemyStrength = enemyUnits * 10 + enemyCities * 50;
        
        if (ownStrength > enemyStrength * 1.2) {
            return 'WINNING';
        } else if (ownStrength < enemyStrength * 0.8) {
            return 'LOSING';
        } else {
            return 'EVEN';
        }
    }
    
    /**
     * Get unit configuration
     * @param {string} unitType - Unit type
     * @returns {Object|null} - Unit configuration or null
     */
    getUnitConfig(unitType) {
        // Fallback unit configs (avoid circular imports)
        const fallbackConfigs = {
            'WARRIOR': { attack: 3, defense: 2, movement: 2, cost: 50 },
            'ARCHER': { attack: 4, defense: 1, movement: 2, cost: 60 },
            'CAVALRY': { attack: 5, defense: 2, movement: 4, cost: 80 },
            'HERO': { attack: 6, defense: 4, movement: 3, cost: 0 }
        };
        return fallbackConfigs[unitType] || null;
    }
    
    /**
     * Sleep for specified milliseconds (for AI thinking simulation)
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get AI turn summary
     * @returns {Object} - Turn summary
     */
    getTurnSummary() {
        const summary = {
            totalActions: this.turnActions.length,
            actionTypes: {},
            thinkingTime: Date.now() - this.lastDecisionTime
        };
        
        for (const action of this.turnActions) {
            summary.actionTypes[action.type] = (summary.actionTypes[action.type] || 0) + 1;
        }
        
        return summary;
    }
    
    /**
     * Reset AI state for new turn
     */
    reset() {
        this.turnActions = [];
        this.lastDecisionTime = 0;
    }
    
    /**
     * Get string representation
     * @returns {string} - String representation
     */
    toString() {
        return `AIEngine(${this.difficulty}, ${this.personality})`;
    }
}