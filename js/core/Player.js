/**
 * Player - Represents a player in the game
 * Manages player state, resources, and faction association
 */

export class Player {
    constructor(id, name, faction, color, isAI = false) {
        this.id = id;
        this.name = name;
        this.faction = faction;
        this.color = color;
        this.isAI = isAI;
        this.isEliminated = false;
        
        // Player resources
        this.resources = {
            gold: 1000 // Starting gold
        };
        
        // Player statistics
        this.stats = {
            unitsLost: 0,
            unitsKilled: 0,
            citiesCapture: 0,
            citiesLost: 0,
            battlesWon: 0,
            battlesLost: 0
        };
        
        // Turn state
        this.hasActed = false;
        
        console.log(`Player created: ${name} (${faction})`);
    }
    
    /**
     * Reset player for new turn
     */
    resetForTurn() {
        this.hasActed = false;
        console.log(`Player ${this.name} reset for new turn`);
    }
    
    /**
     * Eliminate this player from the game
     */
    eliminate() {
        this.isEliminated = true;
        console.log(`Player ${this.name} has been eliminated`);
    }
    
    /**
     * Add gold to player resources
     * @param {number} amount - Amount of gold to add
     */
    addGold(amount) {
        if (amount > 0) {
            this.resources.gold += amount;
            console.log(`Player ${this.name} gained ${amount} gold (total: ${this.resources.gold})`);
        }
    }
    
    /**
     * Spend gold from player resources
     * @param {number} amount - Amount of gold to spend
     * @returns {boolean} - True if successful, false if insufficient funds
     */
    spendGold(amount) {
        if (amount <= 0) {
            return false;
        }
        
        if (this.resources.gold >= amount) {
            this.resources.gold -= amount;
            console.log(`Player ${this.name} spent ${amount} gold (remaining: ${this.resources.gold})`);
            return true;
        }
        
        console.log(`Player ${this.name} cannot afford ${amount} gold (has: ${this.resources.gold})`);
        return false;
    }
    
    /**
     * Check if player can afford a cost
     * @param {number} cost - Cost to check
     * @returns {boolean} - True if player can afford it
     */
    canAfford(cost) {
        return this.resources.gold >= cost;
    }
    
    /**
     * Record a unit loss
     */
    recordUnitLoss() {
        this.stats.unitsLost++;
    }
    
    /**
     * Record a unit kill
     */
    recordUnitKill() {
        this.stats.unitsKilled++;
    }
    
    /**
     * Record a city capture
     */
    recordCityCapture() {
        this.stats.citiesCapture++;
    }
    
    /**
     * Record a city loss
     */
    recordCityLoss() {
        this.stats.citiesLost++;
    }
    
    /**
     * Record a battle victory
     */
    recordBattleWin() {
        this.stats.battlesWon++;
    }
    
    /**
     * Record a battle defeat
     */
    recordBattleLoss() {
        this.stats.battlesLost++;
    }
    
    /**
     * Get player's kill/death ratio
     * @returns {number} - K/D ratio
     */
    getKillDeathRatio() {
        return this.stats.unitsLost > 0 ? this.stats.unitsKilled / this.stats.unitsLost : this.stats.unitsKilled;
    }
    
    /**
     * Get player's win/loss ratio
     * @returns {number} - Win/Loss ratio
     */
    getWinLossRatio() {
        return this.stats.battlesLost > 0 ? this.stats.battlesWon / this.stats.battlesLost : this.stats.battlesWon;
    }
    
    /**
     * Serialize player data for saving
     * @returns {Object} - Serialized player data
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            faction: this.faction,
            color: this.color,
            isAI: this.isAI,
            isEliminated: this.isEliminated,
            resources: { ...this.resources },
            stats: { ...this.stats },
            hasActed: this.hasActed
        };
    }
    
    /**
     * Deserialize player data from save
     * @param {Object} data - Serialized player data
     * @returns {Player} - New Player instance
     */
    static deserialize(data) {
        const player = new Player(data.id, data.name, data.faction, data.color, data.isAI);
        player.isEliminated = data.isEliminated || false;
        player.resources = data.resources || { gold: 1000 };
        player.stats = data.stats || {
            unitsLost: 0,
            unitsKilled: 0,
            citiesCapture: 0,
            citiesLost: 0,
            battlesWon: 0,
            battlesLost: 0
        };
        player.hasActed = data.hasActed || false;
        return player;
    }
    
    /**
     * Get a summary of the player
     * @returns {Object} - Player summary
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            faction: this.faction,
            color: this.color,
            isAI: this.isAI,
            isEliminated: this.isEliminated,
            gold: this.resources.gold,
            killDeathRatio: this.getKillDeathRatio(),
            winLossRatio: this.getWinLossRatio()
        };
    }
    
    /**
     * Check if this player is equal to another player
     * @param {Player} other - Other player to compare
     * @returns {boolean} - True if players are equal
     */
    equals(other) {
        return other instanceof Player && this.id === other.id;
    }
    
    /**
     * Get string representation of player
     * @returns {string} - String representation
     */
    toString() {
        return `Player(${this.id}, ${this.name}, ${this.faction}, AI: ${this.isAI})`;
    }
}