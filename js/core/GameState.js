/**
 * GameState - Manages the complete state of the game
 * Handles state persistence, observers, and state validation
 */

import { Player } from './Player.js';
import { factionManager } from './Faction.js';
import { Map as GameMap } from './Map.js';
import { mapGenerator } from './MapGenerator.js';
import { MovementManager } from './MovementManager.js';

export class GameState {
    constructor() {
        // Core game state
        this.map = null;
        this.players = [];
        this.units = new Map();
        this.cities = new Map();
        this.currentTurn = 1;
        this.activePlayer = 0;

        // Movement manager for turn-based constraints
        this.movementManager = new MovementManager(this);

        // Observer pattern for state changes
        this.observers = [];

        console.log('GameState created');
    }

    /**
     * Initialize the game state with configuration
     * @param {Object} config - Game configuration
     */
    initialize(config) {
        try {
            console.log('Initializing GameState with config:', config);

            // Initialize players using Player class
            this.players = config.players.map(playerConfig => {
                // Validate faction exists
                if (!factionManager.isValidFaction(playerConfig.faction)) {
                    throw new Error(`Invalid faction: ${playerConfig.faction}`);
                }

                return new Player(
                    playerConfig.id,
                    playerConfig.name,
                    playerConfig.faction,
                    playerConfig.color,
                    playerConfig.isAI
                );
            });

            // Initialize map using MapGenerator
            this.map = mapGenerator.generateMap(
                config.map.width,
                config.map.height,
                config.map.generationOptions || {}
            );

            // Initialize empty collections for units and cities
            this.units.clear();
            // Initialize empty collections for units and cities
            this.units.clear();
            this.cities.clear();

            // Extract cities placed by the map generator
            // Iterate through all hexes to find cities
            for (let y = 0; y < this.map.height; y++) {
                for (let x = 0; x < this.map.width; x++) {
                    const hex = this.map.getHex(x, y);
                    if (hex && hex.city) {
                        // hex.city is the City object placed by MapGenerator
                        this.addCity(hex.city);
                    }
                }
            }

            // Distribute cities to players
            this.assignStartingCities(config.players);

            // Reset turn counter
            this.currentTurn = 1;
            this.activePlayer = 0;

            console.log('GameState initialized successfully');
            this.notifyObservers('gameInitialized', { config });

        } catch (error) {
            console.error('Failed to initialize GameState:', error);
            throw error;
        }
    }

    /**
     * Subscribe to state changes
     * @param {Function} observer - Observer function
     */
    subscribe(observer) {
        if (typeof observer === 'function') {
            this.observers.push(observer);
        }
    }

    /**
     * Unsubscribe from state changes
     * @param {Function} observer - Observer function to remove
     */
    unsubscribe(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notify all observers of state changes
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    notifyObservers(event, data = {}) {
        this.observers.forEach(observer => {
            try {
                observer(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    /**
     * Serialize the game state for saving
     * @returns {Object} - Serialized state
     */
    serialize() {
        return {
            players: this.players.map(player => player.serialize()),
            units: Array.from(this.units.entries()),
            cities: Array.from(this.cities.entries()),
            currentTurn: this.currentTurn,
            activePlayer: this.activePlayer,
            map: this.map ? this.map.serialize() : null
        };
    }

    /**
     * Deserialize and restore game state
     * @param {Object} data - Serialized state data
     */
    deserialize(data) {
        try {
            this.players = (data.players || []).map(playerData => Player.deserialize(playerData));
            this.units = new Map(data.units || []);
            this.cities = new Map(data.cities || []);
            this.currentTurn = data.currentTurn || 1;
            this.activePlayer = data.activePlayer || 0;

            // Deserialize map when Map system is implemented
            if (data.map) {
                try {
                    this.map = GameMap.deserialize(data.map);
                } catch (error) {
                    console.warn('Failed to deserialize map, creating empty map:', error);
                    this.map = null;
                }
            }

            console.log('GameState deserialized successfully');
            this.notifyObservers('gameLoaded', data);

        } catch (error) {
            console.error('Failed to deserialize GameState:', error);
            throw error;
        }
    }

    /**
     * Get player by ID
     * @param {number} playerId - Player ID
     * @returns {Object|null} - Player object or null
     */
    getPlayer(playerId) {
        return this.players.find(player => player.id === playerId) || null;
    }

    /**
     * Get all players
     * @returns {Array} - Array of player objects
     */
    getPlayers() {
        return [...this.players];
    }

    /**
     * Get all active (non-eliminated) players
     * @returns {Array} - Array of active player objects
     */
    getActivePlayers() {
        return this.players.filter(player => !player.isEliminated);
    }

    /**
     * Check if a player is eliminated
     * @param {number} playerId - Player ID
     * @returns {boolean} - True if player is eliminated
     */
    isPlayerEliminated(playerId) {
        const player = this.getPlayer(playerId);
        return player ? player.isEliminated : true;
    }

    /**
     * Eliminate a player
     * @param {number} playerId - Player ID to eliminate
     */
    eliminatePlayer(playerId) {
        const player = this.getPlayer(playerId);
        if (player) {
            player.eliminate();
            console.log(`Player ${player.name} has been eliminated`);
            this.notifyObservers('playerEliminated', { playerId, player });
        }
    }

    /**
     * Get player's faction
     * @param {number} playerId - Player ID
     * @returns {Faction|null} - Faction object or null
     */
    getPlayerFaction(playerId) {
        const player = this.getPlayer(playerId);
        return player ? factionManager.getFaction(player.faction) : null;
    }

    /**
     * Check if player can afford a cost
     * @param {number} playerId - Player ID
     * @param {number} cost - Cost to check
     * @returns {boolean} - True if player can afford it
     */
    canPlayerAfford(playerId, cost) {
        const player = this.getPlayer(playerId);
        return player ? player.canAfford(cost) : false;
    }

    /**
     * Make player spend gold
     * @param {number} playerId - Player ID
     * @param {number} amount - Amount to spend
     * @returns {boolean} - True if successful
     */
    playerSpendGold(playerId, amount) {
        const player = this.getPlayer(playerId);
        return player ? player.spendGold(amount) : false;
    }

    /**
     * Give gold to player
     * @param {number} playerId - Player ID
     * @param {number} amount - Amount to give
     */
    playerAddGold(playerId, amount) {
        const player = this.getPlayer(playerId);
        if (player) {
            player.addGold(amount);
        }
    }

    /**
     * Reset units for a player (clear their action flags)
     * @param {number} playerId - Player ID
     */
    resetPlayerUnits(playerId) {
        const player = this.getPlayer(playerId);
        if (player) {
            player.resetForTurn();
        }

        // Reset movement for player units using MovementManager
        this.movementManager.resetPlayerMovement(playerId);

        console.log(`Resetting units for player ${playerId}`);
        this.notifyObservers('unitsReset', { playerId });
    }

    /**
     * Get current turn number
     * @returns {number} - Current turn
     */
    getCurrentTurn() {
        return this.currentTurn;
    }

    /**
     * Increment turn counter
     */
    incrementTurn() {
        this.currentTurn++;
        console.log(`Turn incremented to ${this.currentTurn}`);
        this.notifyObservers('turnIncremented', { turn: this.currentTurn });
    }

    /**
     * Get active player ID
     * @returns {number} - Active player ID
     */
    getActivePlayer() {
        return this.activePlayer;
    }

    /**
     * Set active player
     * @param {number} playerId - Player ID to set as active
     */
    setActivePlayer(playerId) {
        if (this.getPlayer(playerId)) {
            this.activePlayer = playerId;
            this.notifyObservers('activePlayerChanged', { playerId });
        }
    }

    /**
     * Add a unit to the game state
     * @param {Object} unit - Unit object
     */
    addUnit(unit) {
        if (unit && unit.id) {
            this.units.set(unit.id, unit);
            this.notifyObservers('unitAdded', { unit });
        }
    }

    /**
     * Remove a unit from the game state
     * @param {string} unitId - Unit ID
     */
    removeUnit(unitId) {
        if (this.units.has(unitId)) {
            const unit = this.units.get(unitId);
            this.units.delete(unitId);
            this.notifyObservers('unitRemoved', { unitId, unit });
        }
    }

    /**
     * Get unit by ID
     * @param {string} unitId - Unit ID
     * @returns {Object|null} - Unit object or null
     */
    getUnit(unitId) {
        return this.units.get(unitId) || null;
    }

    /**
     * Get all units for a player
     * @param {number} playerId - Player ID
     * @returns {Array} - Array of unit objects
     */
    getPlayerUnits(playerId) {
        return Array.from(this.units.values()).filter(unit => unit.owner === playerId);
    }

    /**
     * Add a city to the game state
     * @param {Object} city - City object
     */
    addCity(city) {
        if (city && city.id) {
            this.cities.set(city.id, city);
            this.notifyObservers('cityAdded', { city });
        }
    }

    /**
     * Remove a city from the game state
     * @param {string} cityId - City ID
     */
    removeCity(cityId) {
        if (this.cities.has(cityId)) {
            const city = this.cities.get(cityId);
            this.cities.delete(cityId);
            this.notifyObservers('cityRemoved', { cityId, city });
        }
    }

    /**
     * Get city by ID
     * @param {string} cityId - City ID
     * @returns {Object|null} - City object or null
     */
    getCity(cityId) {
        return this.cities.get(cityId) || null;
    }

    /**
     * Get all cities for a player
     * @param {number} playerId - Player ID
     * @returns {Array} - Array of city objects
     */
    getPlayerCities(playerId) {
        return Array.from(this.cities.values()).filter(city => city.owner === playerId);
    }

    /**
     * Validate the current game state
     * @returns {boolean} - True if state is valid
     */
    validateState() {
        try {
            // Check players
            if (!Array.isArray(this.players) || this.players.length === 0) {
                console.error('Invalid players array');
                return false;
            }

            // Check turn number
            if (this.currentTurn < 1) {
                console.error('Invalid turn number');
                return false;
            }

            // Check active player
            if (!this.getPlayer(this.activePlayer)) {
                console.error('Invalid active player');
                return false;
            }

            // TODO: Add more validation when other systems are implemented

            return true;

        } catch (error) {
            console.error('State validation error:', error);
            return false;
        }
    }

    /**
     * Generate a new map with the given dimensions and options
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {Object} options - Generation options
     */
    generateNewMap(width, height, options = {}) {
        this.map = mapGenerator.generateMap(width, height, options);
        console.log('New map generated');
        this.notifyObservers('mapGenerated', { width, height, options });
    }

    /**
     * Generate a test map with specific pattern
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {string} pattern - Pattern type
     */
    generateTestMap(width, height, pattern = 'checkerboard') {
        this.map = mapGenerator.generateTestMap(width, height, pattern);
        console.log(`Test map generated with pattern: ${pattern}`);
        this.notifyObservers('testMapGenerated', { width, height, pattern });
    }

    /**
     * Get the game map
     * @returns {GameMap|null} - Game map or null
     */
    getMap() {
        return this.map;
    }

    /**
     * Get hex at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Hex|null} - Hex object or null
     */
    getHex(x, y) {
        return this.map ? this.map.getHex(x, y) : null;
    }

    /**
     * Find path between two points
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     * @param {Object} unit - Unit making the move (optional)
     * @returns {Array|null} - Path or null if no path found
     */
    findPath(startX, startY, endX, endY, unit = null) {
        return this.map ? this.map.findPath(startX, startY, endX, endY, unit) : null;
    }

    /**
     * Get reachable hexes for a unit
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} movementPoints - Available movement points
     * @param {Object} unit - Unit making the move (optional)
     * @returns {Array} - Array of reachable hex coordinates
     */
    getReachableHexes(startX, startY, movementPoints, unit = null) {
        return this.map ? this.map.getReachableHexes(startX, startY, movementPoints, unit) : [];
    }

    /**
     * Get unit at specific coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Unit|null} - Unit at coordinates or null
     */
    getUnitAt(x, y) {
        for (const unit of this.units.values()) {
            if (unit.x === x && unit.y === y) {
                return unit;
            }
        }
        return null;
    }

    /**
     * Get city at specific coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {City|null} - City at coordinates or null
     */
    getCityAt(x, y) {
        for (const city of this.cities.values()) {
            if (city.x === x && city.y === y) {
                return city;
            }
        }
        return null;
    }

    /**
     * Get movement range for a unit
     * @param {Unit} unit - Unit to get movement range for
     * @returns {Array} - Array of hex coordinates the unit can move to
     */
    getUnitMovementRange(unit) {
        if (!unit || !this.canUnitMove(unit)) {
            return [];
        }

        return this.getUnitReachableHexes(unit);
    }

    /**
     * Get all units
     * @returns {Map} - Map of all units
     */
    getUnits() {
        return this.units;
    }

    /**
     * Get all cities
     * @returns {Map} - Map of all cities
     */
    getCities() {
        return this.cities;
    }

    /**
     * Move a unit using movement manager
     * @param {Unit} unit - Unit to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {Object} - Movement result
     */
    moveUnit(unit, targetX, targetY) {
        return this.movementManager.moveUnit(unit, targetX, targetY);
    }

    /**
     * Move a stack using movement manager
     * @param {Stack} stack - Stack to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {Object} - Movement result
     */
    moveStack(stack, targetX, targetY) {
        return this.movementManager.moveStack(stack, targetX, targetY);
    }

    /**
     * Check if a unit can move
     * @param {Unit} unit - Unit to check
     * @returns {boolean} - True if unit can move
     */
    canUnitMove(unit) {
        return this.movementManager.canUnitMove(unit);
    }

    /**
     * Check if a stack can move
     * @param {Stack} stack - Stack to check
     * @returns {boolean} - True if stack can move
     */
    canStackMove(stack) {
        return this.movementManager.canStackMove(stack);
    }

    /**
     * Get reachable hexes for a unit with movement constraints
     * @param {Unit} unit - Unit to check
     * @returns {Array} - Array of reachable hex coordinates
     */
    getUnitReachableHexes(unit) {
        return this.movementManager.getReachableHexes(unit);
    }

    /**
     * Get reachable hexes for a stack with movement constraints
     * @param {Stack} stack - Stack to check
     * @returns {Array} - Array of reachable hex coordinates
     */
    getStackReachableHexes(stack) {
        return this.movementManager.getReachableHexesForStack(stack);
    }

    /**
     * Get movement statistics for current turn
     * @returns {Object} - Movement statistics
     */
    getMovementStatistics() {
        return this.movementManager.getMovementStatistics();
    }

    /**
     * Assign starting cities to players
     * @param {Array} playerConfigs - Player configurations
     */
    assignStartingCities(playerConfigs) {
        // Simple assignment:
        // 1. Get all cities
        const allCities = Array.from(this.cities.values());

        if (allCities.length < playerConfigs.length) {
            console.warn("Not enough cities for all players!");
        }

        // 2. Sort cities or pick random ones to be "Capitals"
        // For now, let's just pick the first N cities as capitals since map generator shuffled them

        for (let i = 0; i < playerConfigs.length; i++) {
            if (i < allCities.length) {
                const city = allCities[i];
                const player = this.getPlayer(playerConfigs[i].id);

                if (player) {
                    // Update city ownership
                    city.changeOwner(player.id, this.players);
                    city.size = 2; // Capitals start a bit bigger
                    // Rename to Capital? Maybe not, keep random fantasy names
                    console.log(`Assigned starting city ${city.name} to ${player.name}`);
                }
            }
        }
    }


    /**
     * Get a summary of the current game state
     * @returns {Object} - State summary
     */
    getStateSummary() {
        return {
            turn: this.currentTurn,
            activePlayer: this.activePlayer,
            playerCount: this.players.length,
            activePlayerCount: this.getActivePlayers().length,
            unitCount: this.units.size,
            cityCount: this.cities.size,
            isValid: this.validateState()
        };
    }
}