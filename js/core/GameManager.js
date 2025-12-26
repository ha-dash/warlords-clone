/**
 * GameManager - Central controller for the Warlords Clone game
 * Coordinates all game systems and manages the main game loop
 */

import { GameState } from './GameState.js';
import { RenderEngine } from './RenderEngine.js';
import { InputEngine } from './InputEngine.js';
import { AIEngine } from './AIEngine.js';
import { SpellGenerator } from './SpellGenerator.js';
import { saveLoadManager } from './SaveLoadManager.js';
import { SaveLoadUI } from './SaveLoadUI.js';

export class GameManager {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.gameState = null;
        this.renderEngine = null;
        this.inputEngine = null;
        this.aiEngine = null;
        this.saveLoadUI = null;

        // Game flow control
        this.currentPlayer = 0;
        this.gamePhase = 'SETUP'; // SETUP, PLAYING, ENDED
        this.isInitialized = false;
        this.gameStartTime = null;

        console.log('GameManager created with canvas:', canvasId);
    }

    /**
     * Initialize the game with the given configuration
     * @param {Object} config - Game configuration object
     */
    initializeGame(config) {
        try {
            console.log('Initializing game with config:', config);

            // Validate configuration
            if (!this.validateConfig(config)) {
                throw new Error('Invalid game configuration');
            }

            // Initialize game state
            this.gameState = new GameState();
            this.gameState.initialize(config);

            // Initialize render engine
            this.renderEngine = new RenderEngine(this.canvasId);

            // Initialize input engine
            this.inputEngine = new InputEngine(this);

            // Initialize AI engine
            this.aiEngine = new AIEngine(this.gameState);

            // Initialize save/load UI
            this.saveLoadUI = new SaveLoadUI(this);

            // Set initial game state
            this.currentPlayer = 0;
            this.gamePhase = 'PLAYING';
            this.isInitialized = true;
            this.gameStartTime = Date.now();

            // Initial render
            this.render();

            // Update UI
            this.updateUI();

            console.log('Game initialized successfully');

        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }

    /**
     * Validate game configuration
     * @param {Object} config - Configuration to validate
     * @returns {boolean} - True if valid
     */
    validateConfig(config) {
        if (!config) {
            console.error('Config is null or undefined');
            return false;
        }

        if (!config.map || !config.map.width || !config.map.height) {
            console.error('Invalid map configuration');
            return false;
        }

        if (!config.players || !Array.isArray(config.players) || config.players.length === 0) {
            console.error('Invalid players configuration');
            return false;
        }

        // Validate each player
        for (const player of config.players) {
            if (player.id === undefined || !player.name || !player.faction || !player.color) {
                console.error('Invalid player configuration:', player);
                return false;
            }
        }

        return true;
    }

    /**
     * Start a turn for the specified player
     * @param {number} playerId - ID of the player whose turn to start
     */
    startTurn(playerId) {
        if (!this.isInitialized) {
            console.error('Game not initialized');
            return;
        }

        if (this.gamePhase !== 'PLAYING') {
            console.error('Game is not in playing phase');
            return;
        }

        console.log(`Starting turn for player ${playerId}`);

        this.currentPlayer = playerId;

        // Set active player in game state
        this.gameState.setActivePlayer(playerId);

        // Process turn start activities
        this.processTurnStart(playerId);

        // Update UI
        this.updateUI();

        // If it's an AI player, process AI turn
        const player = this.gameState.getPlayer(playerId);
        if (player && player.isAI) {
            this.processAITurn(playerId);
        }
    }

    /**
     * Process turn start activities for a player
     * @param {number} playerId - Player ID
     */
    processTurnStart(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) {
            console.error(`Player ${playerId} not found`);
            return;
        }

        console.log(`Processing turn start for ${player.name}`);

        // Reset unit actions and movement for current player
        this.gameState.resetPlayerUnits(playerId);

        // Handle unit maintenance (healing, upkeep, etc.)
        this.processUnitMaintenance(playerId);

        // Handle city production and resource generation
        this.processCityProduction(playerId);

        // Handle resource generation
        this.processResourceGeneration(playerId);

        // Notify observers
        this.gameState.notifyObservers('turnStarted', { playerId, player });

        console.log(`Turn start processing complete for ${player.name}`);
    }

    /**
     * Process unit maintenance for a player
     * @param {number} playerId - Player ID
     */
    processUnitMaintenance(playerId) {
        const units = this.gameState.getPlayerUnits(playerId);

        for (const unit of units) {
            // Reset unit actions
            unit.hasActed = false;

            // Handle hero-specific maintenance
            if (unit.type === 'HERO') {
                // Restore mana for heroes
                const manaRegen = SpellGenerator.calculateManaRegeneration(unit);
                unit.restoreMana(manaRegen);

                console.log(`Hero ${unit.heroName} restored ${manaRegen} mana`);
            }

            // TODO: Add healing logic when health system is implemented
            // TODO: Add upkeep costs when economy system is expanded
        }

        console.log(`Processed maintenance for ${units.length} units`);
    }

    /**
     * Process city production for a player
     * @param {number} playerId - Player ID
     */
    processCityProduction(playerId) {
        const cities = this.gameState.getPlayerCities(playerId);

        for (const city of cities) {
            // TODO: Process city production when city system is fully implemented
            // For now, just log the processing
            console.log(`Processing production for city ${city.name || city.id}`);
        }

        console.log(`Processed production for ${cities.length} cities`);
    }

    /**
     * Process resource generation for a player
     * @param {number} playerId - Player ID
     */
    processResourceGeneration(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) return;

        // Generate base income
        const baseIncome = 10; // Base gold per turn
        const cityIncome = this.gameState.getPlayerCities(playerId).length * 5; // Gold per city
        const totalIncome = baseIncome + cityIncome;

        player.addGold(totalIncome);

        console.log(`Generated ${totalIncome} gold for ${player.name}`);
    }

    /**
     * End the current player's turn
     */
    endTurn() {
        if (!this.isInitialized || this.gamePhase !== 'PLAYING') {
            console.error('Cannot end turn - game not in playing state');
            return;
        }

        const currentPlayer = this.gameState.getPlayer(this.currentPlayer);
        if (!currentPlayer) {
            console.error('Current player not found');
            return;
        }

        console.log(`Ending turn for player ${currentPlayer.name}`);

        // Process turn end activities
        this.processTurnEnd(this.currentPlayer);

        // Check for player eliminations
        this.checkAllPlayersForElimination();

        // Check victory conditions before moving to next player
        if (this.checkVictoryConditions()) {
            return; // Game ended
        }

        // Move to next player
        const nextPlayer = this.getNextPlayer();

        // Check if we completed a full round
        if (nextPlayer === 0) {
            // New round started
            this.gameState.incrementTurn();
            console.log(`New round started - Turn ${this.gameState.getCurrentTurn()}`);

            // Process round start activities
            this.processRoundStart();
        }

        this.startTurn(nextPlayer);
    }

    /**
     * Process turn end activities for a player
     * @param {number} playerId - Player ID
     */
    processTurnEnd(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) return;

        console.log(`Processing turn end for ${player.name}`);

        // Mark player as having acted this turn
        player.hasActed = true;

        // TODO: Process end-of-turn effects when implemented
        // - Unit abilities that trigger at turn end
        // - City effects that happen at turn end
        // - Spell effects that expire

        // Notify observers
        this.gameState.notifyObservers('turnEnded', { playerId, player });

        console.log(`Turn end processing complete for ${player.name}`);
    }

    /**
     * Process round start activities
     */
    processRoundStart() {
        console.log(`Processing round start for turn ${this.gameState.getCurrentTurn()}`);

        // TODO: Process global effects that happen each round
        // - Global spell effects
        // - Environmental changes
        // - Random events

        // Notify observers
        this.gameState.notifyObservers('roundStarted', {
            turn: this.gameState.getCurrentTurn()
        });

        console.log('Round start processing complete');
    }

    /**
     * Get the next player in turn order
     * @returns {number} - Next player ID
     */
    getNextPlayer() {
        const players = this.gameState.getPlayers();
        let nextPlayer = (this.currentPlayer + 1) % players.length;

        // Skip eliminated players
        let attempts = 0;
        while (this.gameState.isPlayerEliminated(nextPlayer) && attempts < players.length) {
            nextPlayer = (nextPlayer + 1) % players.length;
            attempts++;
        }

        // If all players are eliminated except current, game should end
        if (attempts >= players.length - 1) {
            console.warn('Only one or no players remaining');
        }

        return nextPlayer;
    }

    /**
     * Process AI turn
     * @param {number} playerId - AI player ID
     */
    async processAITurn(playerId) {
        if (!this.aiEngine) {
            console.error('AI Engine not initialized');
            this.endTurn();
            return;
        }

        console.log(`Processing AI turn for player ${playerId}`);

        try {
            // Processing logic delegated to AIEngine
            await this.aiEngine.processAITurn(playerId);

            // End turn after AI is done
            this.endTurn();
        } catch (error) {
            console.error(`Error during AI turn for player ${playerId}:`, error);
            // Ensure turn ends even if AI errors out to prevent softlock
            this.endTurn();
        }
    }

    /**
     * Process an action from the player or AI
     * @param {Object} action - Action object to process
     */
    processAction(action) {
        if (!this.isInitialized || this.gamePhase !== 'PLAYING') {
            console.error('Cannot process action - game not in playing state');
            return false;
        }

        console.log('Processing action:', action);

        try {
            switch (action.type) {
                case 'CAST_SPELL':
                    return this.processCastSpellAction(action);

                case 'USE_ITEM':
                    return this.processUseItemAction(action);

                case 'EQUIP_ITEM':
                    return this.processEquipItemAction(action);

                case 'EXPLORE_LOCATION':
                    return this.processExploreLocationAction(action);

                default:
                    console.warn('Unknown action type:', action.type);
                    return false;
            }
        } catch (error) {
            console.error('Error processing action:', error);
            return false;
        }
    }

    /**
     * Process spell casting action
     * @param {Object} action - Spell casting action
     * @returns {boolean} - True if successful
     */
    processCastSpellAction(action) {
        const { heroId, spellId, targetId, targetX, targetY } = action;

        // Get the hero
        const hero = this.gameState.getUnit(heroId);
        if (!hero || hero.type !== 'HERO') {
            console.error('Invalid hero for spell casting');
            return false;
        }

        // Check if it's the hero's owner's turn
        if (hero.owner !== this.currentPlayer) {
            console.error('Not the hero owner\'s turn');
            return false;
        }

        // Get target (if specified)
        let target = null;
        if (targetId) {
            target = this.gameState.getUnit(targetId);
        } else if (targetX !== undefined && targetY !== undefined) {
            // Target is a location
            target = { x: targetX, y: targetY };
        }

        // Cast the spell
        const result = hero.castSpell(spellId, target, this.gameState.getMap());

        if (result.success) {
            console.log(`${hero.heroName} successfully cast ${result.spell.name}`);

            // Apply spell effects to game state
            this.applySpellEffects(result);

            // Update UI
            this.updateUI();

            // Notify observers
            this.gameState.notifyObservers('spellCast', result);

            return true;
        } else {
            console.warn(`Spell casting failed: ${result.reason}`);
            return false;
        }
    }

    /**
     * Process item usage action
     * @param {Object} action - Item usage action
     * @returns {boolean} - True if successful
     */
    processUseItemAction(action) {
        const { heroId, itemId } = action;

        // Get the hero
        const hero = this.gameState.getUnit(heroId);
        if (!hero || hero.type !== 'HERO') {
            console.error('Invalid hero for item usage');
            return false;
        }

        // Check if it's the hero's owner's turn
        if (hero.owner !== this.currentPlayer) {
            console.error('Not the hero owner\'s turn');
            return false;
        }

        // Use the item
        const result = hero.useItem(itemId);

        if (result.success) {
            console.log(`${hero.heroName} successfully used item`);

            // Update UI
            this.updateUI();

            // Notify observers
            this.gameState.notifyObservers('itemUsed', { hero, result });

            return true;
        } else {
            console.warn(`Item usage failed: ${result.reason}`);
            return false;
        }
    }

    /**
     * Process item equipping action
     * @param {Object} action - Item equipping action
     * @returns {boolean} - True if successful
     */
    processEquipItemAction(action) {
        const { heroId, itemId } = action;

        // Get the hero
        const hero = this.gameState.getUnit(heroId);
        if (!hero || hero.type !== 'HERO') {
            console.error('Invalid hero for item equipping');
            return false;
        }

        // Check if it's the hero's owner's turn
        if (hero.owner !== this.currentPlayer) {
            console.error('Not the hero owner\'s turn');
            return false;
        }

        // Find the item (this would need to be expanded based on where items come from)
        // For now, assume the item is already in hero's inventory
        const item = hero.items.find(i => i.id === itemId);
        if (!item) {
            console.error('Item not found in hero inventory');
            return false;
        }

        // Equip the item
        const success = hero.equipItem(item);

        if (success) {
            console.log(`${hero.heroName} successfully equipped ${item.name}`);

            // Update UI
            this.updateUI();

            // Notify observers
            this.gameState.notifyObservers('itemEquipped', { hero, item });

            return true;
        } else {
            console.warn('Item equipping failed');
            return false;
        }
    }

    /**
     * Process location exploration action
     * @param {Object} action - Location exploration action
     * @returns {boolean} - True if successful
     */
    processExploreLocationAction(action) {
        const { heroId, locationType } = action;

        // Get the hero
        const hero = this.gameState.getUnit(heroId);
        if (!hero || hero.type !== 'HERO') {
            console.error('Invalid hero for location exploration');
            return false;
        }

        // Check if it's the hero's owner's turn
        if (hero.owner !== this.currentPlayer) {
            console.error('Not the hero owner\'s turn');
            return false;
        }

        // Import ItemGenerator dynamically to avoid circular dependencies
        import('./ItemGenerator.js').then(({ ItemGenerator }) => {
            const result = ItemGenerator.exploreLocation(hero, locationType);

            if (result.success && result.found) {
                if (result.rewardType === 'item' && result.reward) {
                    hero.equipItem(result.reward);
                } else if (result.rewardType === 'spell' && result.reward) {
                    hero.learnSpell(result.reward);
                }

                // Show message to player
                this.showMessage(result.message);

                // Update UI
                this.updateUI();

                // Notify observers
                this.gameState.notifyObservers('locationExplored', { hero, result });
            } else if (result.success) {
                // Nothing found
                this.showMessage(result.message);
            }
        }).catch(error => {
            console.error('Failed to process exploration:', error);
        });

        return true;
    }

    /**
     * Apply spell effects to the game state
     * @param {Object} spellResult - Result from casting a spell
     */
    applySpellEffects(spellResult) {
        if (!spellResult.success || !spellResult.effects) {
            return;
        }

        for (const effect of spellResult.effects) {
            switch (effect.type) {
                case 'damage':
                    if (effect.target && effect.target.takeDamage) {
                        console.log(`${effect.target.name || effect.target.id} takes ${effect.amount} damage from ${effect.spell}`);

                        // Check if target is destroyed
                        if (effect.target.health <= 0) {
                            this.handleUnitDestroyed(effect.target);
                        }
                    }
                    break;

                case 'healing':
                    if (effect.target && effect.target.heal) {
                        console.log(`${effect.target.name || effect.target.id} healed for ${effect.amount} by ${effect.spell}`);
                    }
                    break;

                case 'buff':
                    // Apply temporary buff (simplified - would need proper buff system)
                    console.log(`${effect.target.name || effect.target.id} buffed with +${effect.amount} ${effect.stat} for ${effect.duration} turns`);
                    break;

                case 'area_damage':
                    // Handle area damage (simplified)
                    console.log(`Area damage from ${effect.spell} at (${effect.center.x}, ${effect.center.y})`);
                    this.applyAreaDamage(effect.center, effect.radius, effect.damage);
                    break;

                case 'teleport':
                    console.log(`${effect.target.name || effect.target.id} can teleport up to ${effect.range} hexes`);
                    // Would need UI interaction to select destination
                    break;
            }
        }
    }

    /**
     * Apply area damage to units in range
     * @param {Object} center - Center point {x, y}
     * @param {number} radius - Damage radius
     * @param {number} damage - Damage amount
     */
    applyAreaDamage(center, radius, damage) {
        const map = this.gameState.getMap();
        if (!map) return;

        // Get all units within radius
        const allUnits = Array.from(this.gameState.getUnits().values());

        for (const unit of allUnits) {
            const distance = map.getDistance(center.x, center.y, unit.x, unit.y);

            if (distance <= radius) {
                console.log(`${unit.name || unit.id} takes ${damage} area damage`);
                unit.takeDamage(damage);

                if (unit.health <= 0) {
                    this.handleUnitDestroyed(unit);
                }
            }
        }
    }

    /**
     * Handle unit destruction
     * @param {Object} unit - Destroyed unit
     */
    handleUnitDestroyed(unit) {
        console.log(`Unit ${unit.name || unit.id} has been destroyed`);

        // Remove unit from game state
        this.gameState.removeUnit(unit.id);

        // Update player statistics
        const owner = this.gameState.getPlayer(unit.owner);
        if (owner) {
            owner.stats.unitsLost++;
        }

        // Notify observers
        this.gameState.notifyObservers('unitDestroyed', { unit });

        // Check for player elimination
        this.checkPlayerElimination(unit.owner);
    }

    /**
     * Check if victory conditions are met
     * @returns {boolean} - True if game should end
     */
    checkVictoryConditions() {
        if (!this.gameState) {
            return false;
        }

        console.log('Checking victory conditions...');

        const activePlayers = this.gameState.getActivePlayers();

        // Check if only one player remains (elimination victory)
        if (activePlayers.length <= 1) {
            const winner = activePlayers.length === 1 ? activePlayers[0] : null;
            this.handleGameEnd(winner, 'elimination');
            return true;
        }

        // Check city conquest victory
        const cityConquestWinner = this.checkCityConquestVictory();
        if (cityConquestWinner) {
            this.handleGameEnd(cityConquestWinner, 'city_conquest');
            return true;
        }

        // Check total domination victory (all enemy units eliminated)
        const dominationWinner = this.checkDominationVictory();
        if (dominationWinner) {
            this.handleGameEnd(dominationWinner, 'domination');
            return true;
        }

        // TODO: Add other victory conditions when implemented
        // - Economic victory (accumulate X gold)
        // - Artifact victory (collect special items)
        // - Time victory (survive X turns)

        return false;
    }

    /**
     * Check for city conquest victory condition
     * @returns {Object|null} - Winning player or null
     */
    checkCityConquestVictory() {
        const allCities = Array.from(this.gameState.getCities().values());

        if (allCities.length === 0) {
            return null; // No cities to conquer
        }

        // Group cities by owner
        const citiesByOwner = new Map();
        for (const city of allCities) {
            if (!citiesByOwner.has(city.owner)) {
                citiesByOwner.set(city.owner, []);
            }
            citiesByOwner.get(city.owner).push(city);
        }

        // Check if one player owns all cities
        if (citiesByOwner.size === 1) {
            const [ownerId] = citiesByOwner.keys();
            const winner = this.gameState.getPlayer(ownerId);

            if (winner && !winner.isEliminated) {
                console.log(`City conquest victory: ${winner.name} owns all ${allCities.length} cities`);
                return winner;
            }
        }

        return null;
    }

    /**
     * Check for domination victory condition (all enemy units eliminated)
     * @returns {Object|null} - Winning player or null
     */
    checkDominationVictory() {
        const allUnits = Array.from(this.gameState.getUnits().values());

        if (allUnits.length === 0) {
            return null; // No units exist
        }

        // Group units by owner
        const unitsByOwner = new Map();
        for (const unit of allUnits) {
            if (!unitsByOwner.has(unit.owner)) {
                unitsByOwner.set(unit.owner, []);
            }
            unitsByOwner.get(unit.owner).push(unit);
        }

        // Check if only one player has units remaining
        const playersWithUnits = Array.from(unitsByOwner.keys())
            .filter(playerId => {
                const player = this.gameState.getPlayer(playerId);
                return player && !player.isEliminated;
            });

        if (playersWithUnits.length === 1) {
            const winner = this.gameState.getPlayer(playersWithUnits[0]);
            console.log(`Domination victory: ${winner.name} has eliminated all enemy units`);
            return winner;
        }

        return null;
    }

    /**
     * Check if a player should be eliminated
     * @param {number} playerId - Player ID to check
     * @returns {boolean} - True if player should be eliminated
     */
    checkPlayerElimination(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player || player.isEliminated) {
            return false; // Already eliminated or doesn't exist
        }

        const playerUnits = this.gameState.getPlayerUnits(playerId);
        const playerCities = this.gameState.getPlayerCities(playerId);

        // Player is eliminated if they have no units and no cities
        // BUT only if the game has actually started with units/cities
        const totalUnits = this.gameState.getUnits().size;
        const totalCities = this.gameState.getCities().size;

        // Don't eliminate players if no units or cities exist in the game yet
        if (totalUnits === 0 && totalCities === 0) {
            return false;
        }

        if (playerUnits.length === 0 && playerCities.length === 0) {
            console.log(`Player ${player.name} should be eliminated - no units or cities remaining`);
            this.gameState.eliminatePlayer(playerId);
            return true;
        }

        return false;
    }

    /**
     * Check all players for elimination
     */
    checkAllPlayersForElimination() {
        const players = this.gameState.getPlayers();

        for (const player of players) {
            if (!player.isEliminated) {
                this.checkPlayerElimination(player.id);
            }
        }
    }

    /**
     * Handle game end
     * @param {Object} winner - Winning player or null for draw
     * @param {string} victoryType - Type of victory achieved
     */
    handleGameEnd(winner, victoryType = 'unknown') {
        console.log(`Game ended. Victory type: ${victoryType}. Winner:`, winner);

        this.gamePhase = 'ENDED';

        // Calculate game statistics
        const gameStats = this.calculateGameStatistics();

        // Update UI to show game end
        this.updateUI();

        // Show victory screen
        this.showVictoryScreen(winner, victoryType, gameStats);

        // Notify observers
        this.gameState.notifyObservers('gameEnded', {
            winner,
            victoryType,
            gameStats,
            turn: this.gameState.getCurrentTurn()
        });
    }

    /**
     * Calculate game statistics
     * @returns {Object} - Game statistics
     */
    calculateGameStatistics() {
        const players = this.gameState.getPlayers();
        const stats = {
            totalTurns: this.gameState.getCurrentTurn(),
            playerStats: [],
            gameLength: Date.now() - (this.gameStartTime || Date.now()),
            totalUnits: this.gameState.getUnits().size,
            totalCities: this.gameState.getCities().size
        };

        // Calculate individual player statistics
        for (const player of players) {
            const playerUnits = this.gameState.getPlayerUnits(player.id);
            const playerCities = this.gameState.getPlayerCities(player.id);

            stats.playerStats.push({
                id: player.id,
                name: player.name,
                faction: player.faction,
                isEliminated: player.isEliminated,
                gold: player.resources.gold,
                unitsRemaining: playerUnits.length,
                citiesControlled: playerCities.length,
                unitsLost: player.stats.unitsLost,
                unitsKilled: player.stats.unitsKilled,
                citiesCapture: player.stats.citiesCapture,
                citiesLost: player.stats.citiesLost,
                battlesWon: player.stats.battlesWon,
                battlesLost: player.stats.battlesLost,
                killDeathRatio: player.getKillDeathRatio(),
                winLossRatio: player.getWinLossRatio()
            });
        }

        return stats;
    }

    /**
     * Show victory screen with game statistics
     * @param {Object} winner - Winning player or null
     * @param {string} victoryType - Type of victory
     * @param {Object} gameStats - Game statistics
     */
    showVictoryScreen(winner, victoryType, gameStats) {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            console.log(`GAME OVER - ${winner ? `${winner.name} wins` : 'Draw'} (${victoryType})`);
            return;
        }

        // Create victory screen overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create victory screen content
        const victoryScreen = document.createElement('div');
        victoryScreen.style.cssText = `
            background-color: #2c3e50;
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        // Victory message
        const victoryMessage = this.getVictoryMessage(winner, victoryType);

        victoryScreen.innerHTML = `
            <h1 style="color: ${winner ? winner.color : '#ecf0f1'}; margin-bottom: 20px;">
                ${winner ? `${winner.name} Wins!` : 'Game Over - Draw'}
            </h1>
            <h2 style="color: #bdc3c7; margin-bottom: 30px;">
                ${victoryMessage}
            </h2>
            <div style="text-align: left; margin-bottom: 30px;">
                <h3>Game Statistics:</h3>
                <p><strong>Total Turns:</strong> ${gameStats.totalTurns}</p>
                <p><strong>Game Duration:</strong> ${this.formatGameDuration(gameStats.gameLength)}</p>
                <p><strong>Total Units:</strong> ${gameStats.totalUnits}</p>
                <p><strong>Total Cities:</strong> ${gameStats.totalCities}</p>
            </div>
            <div style="text-align: left; margin-bottom: 30px;">
                <h3>Player Statistics:</h3>
                ${this.formatPlayerStats(gameStats.playerStats)}
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="save-results-btn" style="padding: 10px 20px; background-color: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Save Results
                </button>
                <button id="new-game-btn" style="padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    New Game
                </button>
                <button id="close-victory-btn" style="padding: 10px 20px; background-color: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        overlay.appendChild(victoryScreen);
        document.body.appendChild(overlay);

        // Add event listeners
        document.getElementById('save-results-btn').addEventListener('click', () => {
            this.saveGameResults(gameStats);
        });

        document.getElementById('new-game-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.startNewGame();
        });

        document.getElementById('close-victory-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }

    /**
     * Get victory message based on victory type
     * @param {Object} winner - Winning player
     * @param {string} victoryType - Victory type
     * @returns {string} - Victory message
     */
    getVictoryMessage(winner, victoryType) {
        if (!winner) {
            return 'The game ended in a draw';
        }

        switch (victoryType) {
            case 'city_conquest':
                return 'Victory by capturing all enemy cities!';
            case 'domination':
                return 'Victory by eliminating all enemy forces!';
            case 'elimination':
                return 'Victory by eliminating all opponents!';
            default:
                return 'Victory achieved!';
        }
    }

    /**
     * Format game duration for display
     * @param {number} duration - Duration in milliseconds
     * @returns {string} - Formatted duration
     */
    formatGameDuration(duration) {
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Format player statistics for display
     * @param {Array} playerStats - Array of player statistics
     * @returns {string} - Formatted HTML string
     */
    formatPlayerStats(playerStats) {
        return playerStats.map(stats => `
            <div style="margin-bottom: 15px; padding: 10px; background-color: rgba(255,255,255,0.1); border-radius: 5px;">
                <strong style="color: ${this.gameState.getPlayer(stats.id)?.color || '#ecf0f1'};">
                    ${stats.name} (${stats.faction})
                </strong>
                ${stats.isEliminated ? ' - <em>Eliminated</em>' : ''}
                <br>
                <small>
                    Gold: ${stats.gold} | 
                    Units: ${stats.unitsRemaining} | 
                    Cities: ${stats.citiesControlled} | 
                    K/D: ${stats.killDeathRatio.toFixed(1)} | 
                    W/L: ${stats.winLossRatio.toFixed(1)}
                </small>
            </div>
        `).join('');
    }

    /**
     * Save game results to local storage
     * @param {Object} gameStats - Game statistics
     */
    saveGameResults(gameStats) {
        const result = saveLoadManager.saveGameResults(gameStats);

        if (result.success) {
            this.showMessage(result.message);
        } else {
            this.showMessage(result.message, 'error');
        }

        return result;
    }

    /**
     * Start a new game
     */
    startNewGame() {
        // Reset game state
        this.gamePhase = 'SETUP';
        this.currentPlayer = 0;
        this.gameStartTime = Date.now();

        // TODO: Show new game setup screen
        // For now, just reinitialize with default config
        const defaultConfig = {
            map: {
                width: 20,
                height: 15,
                hexSize: 32
            },
            players: [
                { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
                { id: 1, name: 'AI 1', faction: 'ELVES', color: '#00CC66', isAI: true },
                { id: 2, name: 'AI 2', faction: 'DEMONS', color: '#CC0066', isAI: true }
            ]
        };

        this.initializeGame(defaultConfig);
    }

    /**
     * Process AI turn
     * @param {number} playerId - AI player ID
     */
    processAITurn(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player || !player.isAI) {
            console.error('Invalid AI player for AI turn processing');
            return;
        }

        console.log(`Processing AI turn for player ${player.name}`);

        // Show AI thinking indicator
        this.showAIThinking(player);

        // Use AIEngine to process the turn
        if (this.aiEngine) {
            this.aiEngine.processAITurn(playerId).then(() => {
                this.hideAIThinking();

                // End AI turn after processing
                setTimeout(() => {
                    this.endTurn();
                }, 500);
            }).catch(error => {
                console.error('AI turn processing failed:', error);
                this.hideAIThinking();

                // Still end turn even if AI fails
                setTimeout(() => {
                    this.endTurn();
                }, 500);
            });
        } else {
            // Fallback to old behavior if AIEngine not available
            this.executeAIActions(playerId);
            this.hideAIThinking();

            // End AI turn after processing
            setTimeout(() => {
                this.endTurn();
            }, 500);
        }
    }

    /**
     * Execute AI actions for a turn
     * @param {number} playerId - AI player ID
     */
    executeAIActions(playerId) {
        const player = this.gameState.getPlayer(playerId);
        console.log(`Executing AI actions for ${player.name}`);

        // TODO: Implement actual AI decision making
        // For now, just log that AI is taking actions

        const units = this.gameState.getPlayerUnits(playerId);
        const cities = this.gameState.getPlayerCities(playerId);

        console.log(`AI ${player.name} has ${units.length} units and ${cities.length} cities`);

        // Simulate some AI actions
        if (units.length > 0) {
            console.log(`AI ${player.name} is moving units`);
        }

        if (cities.length > 0) {
            console.log(`AI ${player.name} is managing cities`);
        }
    }

    /**
     * Show AI thinking indicator
     * @param {Object} player - AI player
     */
    showAIThinking(player) {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            return;
        }

        const currentPlayerElement = document.getElementById('current-player');
        if (currentPlayerElement) {
            currentPlayerElement.textContent = `${player.name} (Thinking...)`;
            currentPlayerElement.style.color = player.color;
            currentPlayerElement.style.fontStyle = 'italic';
        }
    }

    /**
     * Hide AI thinking indicator
     */
    hideAIThinking() {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            return;
        }

        const currentPlayerElement = document.getElementById('current-player');
        if (currentPlayerElement) {
            currentPlayerElement.style.fontStyle = 'normal';
        }
    }

    /**
     * Save the current game state to a specific slot
     * @param {number} slotId - Save slot ID (0-9)
     * @param {string} saveName - Optional custom save name
     * @returns {Object} - Save result
     */
    saveGame(slotId = 0, saveName = null) {
        if (!this.isInitialized) {
            console.error('Cannot save - game not initialized');
            return {
                success: false,
                message: 'Game not initialized'
            };
        }

        try {
            const result = saveLoadManager.saveGame(this.gameState, this, slotId, saveName);

            if (result.success) {
                console.log('Game saved successfully');
                this.showMessage(result.message);
            } else {
                console.error('Failed to save game:', result.message);
                this.showMessage(result.message, 'error');
            }

            return result;

        } catch (error) {
            console.error('Failed to save game:', error);
            const errorMessage = 'Failed to save game!';
            this.showMessage(errorMessage, 'error');

            return {
                success: false,
                message: errorMessage,
                error: error.message
            };
        }
    }

    /**
     * Load a saved game from a specific slot
     * @param {number} slotId - Save slot ID to load from
     * @returns {Object} - Load result
     */
    loadGame(slotId = 0) {
        try {
            const result = saveLoadManager.loadGame(slotId);

            if (!result.success) {
                console.error('Failed to load game:', result.message);
                this.showMessage(result.message, 'error');
                return result;
            }

            const saveData = result.saveData;

            // Validate save data
            if (!saveData.gameState || !saveData.gameManager) {
                throw new Error('Invalid save data structure');
            }

            // Initialize engines if not already done
            if (!this.renderEngine && this.canvasId) {
                this.renderEngine = new RenderEngine(this.canvasId);
            }

            if (!this.inputEngine) {
                this.inputEngine = new InputEngine(this);
            }

            if (!this.aiEngine) {
                this.aiEngine = new AIEngine(null); // Will be set when gameState is restored
            }

            // Create new game state and deserialize
            this.gameState = new GameState();
            this.gameState.deserialize(saveData.gameState);

            // Update AI engine with new game state
            if (this.aiEngine) {
                this.aiEngine.gameState = this.gameState;
            }

            // Restore game manager state
            this.currentPlayer = saveData.gameManager.currentPlayer || 0;
            this.gamePhase = saveData.gameManager.gamePhase || 'PLAYING';
            this.gameStartTime = saveData.gameManager.gameStartTime || Date.now();
            this.isInitialized = true;

            // Update UI
            this.updateUI();

            console.log('Game loaded successfully');
            this.showMessage(result.message);

            return result;

        } catch (error) {
            console.error('Failed to load game:', error);
            const errorMessage = 'Failed to load game!';
            this.showMessage(errorMessage, 'error');

            return {
                success: false,
                message: errorMessage,
                error: error.message
            };
        }
    }

    /**
     * Delete a save from a specific slot
     * @param {number} slotId - Save slot ID to delete
     * @returns {Object} - Delete result
     */
    deleteSave(slotId) {
        try {
            const result = saveLoadManager.deleteSave(slotId);

            if (result.success) {
                this.showMessage(result.message);
            } else {
                this.showMessage(result.message, 'error');
            }

            return result;

        } catch (error) {
            console.error('Failed to delete save:', error);
            const errorMessage = 'Failed to delete save!';
            this.showMessage(errorMessage, 'error');

            return {
                success: false,
                message: errorMessage,
                error: error.message
            };
        }
    }

    /**
     * Get information about all save slots
     * @returns {Array} - Array of save slot information
     */
    getSaveSlots() {
        return saveLoadManager.getSaveSlots();
    }

    /**
     * Get storage usage information
     * @returns {Object} - Storage usage data
     */
    getStorageInfo() {
        return saveLoadManager.getStorageInfo();
    }

    /**
     * Show save dialog
     */
    showSaveDialog() {
        if (!this.isInitialized) {
            this.showMessage('Cannot save - game not initialized', 'error');
            return;
        }

        if (this.saveLoadUI) {
            this.saveLoadUI.showDialog('save');
        } else {
            // Fallback to simple save
            this.saveGame(0);
        }
    }

    /**
     * Show load dialog
     */
    showLoadDialog() {
        if (this.saveLoadUI) {
            this.saveLoadUI.showDialog('load');
        } else {
            // Fallback to simple load
            this.loadGame(0);
        }
    }

    /**
     * Quick save to first available slot
     */
    quickSave() {
        if (!this.isInitialized) {
            this.showMessage('Cannot save - game not initialized', 'error');
            return;
        }

        if (this.saveLoadUI) {
            this.saveLoadUI.showQuickSave();
        } else {
            // Fallback
            this.saveGame(0, 'Quick Save');
        }
    }

    /**
     * Quick load from most recent save
     */
    quickLoad() {
        if (this.saveLoadUI) {
            this.saveLoadUI.showQuickLoad();
        } else {
            // Fallback
            this.loadGame(0);
        }
    }

    /**
     * Update the user interface
     */
    updateUI() {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            return;
        }

        // Update current player display (legacy element)
        const currentPlayerElement = document.getElementById('current-player');
        if (currentPlayerElement && this.gameState) {
            const player = this.gameState.getPlayer(this.currentPlayer);
            if (player) {
                currentPlayerElement.textContent = player.name;
                currentPlayerElement.style.color = player.color;
            }
        }

        // Update new current player name element
        const currentPlayerNameElement = document.getElementById('current-player-name');
        if (currentPlayerNameElement && this.gameState) {
            const player = this.gameState.getPlayer(this.currentPlayer);
            if (player) {
                currentPlayerNameElement.textContent = player.name;
                currentPlayerNameElement.style.color = player.color;
            }
        }

        // Update turn counter (legacy element)
        const turnCounterElement = document.getElementById('turn-counter');
        if (turnCounterElement && this.gameState) {
            turnCounterElement.textContent = `Turn: ${this.gameState.getCurrentTurn()}`;
        }

        // Update new turn number element
        const turnNumberElement = document.getElementById('turn-number');
        if (turnNumberElement && this.gameState) {
            turnNumberElement.textContent = this.gameState.getCurrentTurn();
        }

        // Update game phase element
        const gamePhaseElement = document.getElementById('game-phase');
        if (gamePhaseElement) {
            gamePhaseElement.textContent = this.gamePhase;
        }

        // Update button states
        const endTurnBtn = document.getElementById('end-turn-btn');
        if (endTurnBtn) {
            const currentPlayer = this.gameState ? this.gameState.getPlayer(this.currentPlayer) : null;
            endTurnBtn.disabled = this.gamePhase !== 'PLAYING' || (currentPlayer && currentPlayer.isAI);

            // Update button text for AI turns
            if (currentPlayer && currentPlayer.isAI) {
                endTurnBtn.textContent = `${currentPlayer.name} is thinking...`;
            } else {
                endTurnBtn.textContent = 'End Turn';
            }
        }

        // Trigger render
        this.render();
    }

    /**
     * Render the game
     */
    render() {
        if (this.renderEngine && this.gameState) {
            this.renderEngine.render(this.gameState);
        }
    }

    /**
     * Show a message to the user
     * @param {string} message - Message to show
     * @param {string} type - Message type ('info' or 'error')
     */
    showMessage(message, type = 'info') {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            z-index: 1000;
            font-weight: bold;
            background-color: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    // Getters
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    getGamePhase() {
        return this.gamePhase;
    }

    getGameState() {
        return this.gameState;
    }

    isGameInitialized() {
        return this.isInitialized;
    }

    getRenderEngine() {
        return this.renderEngine;
    }

    getInputEngine() {
        return this.inputEngine;
    }
}