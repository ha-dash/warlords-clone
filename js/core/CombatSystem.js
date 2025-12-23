/**
 * CombatSystem - Handles automatic combat resolution between units
 * Implements damage calculation, terrain bonuses, and random factors
 * Requirements: 3.5, 6.1, 6.2, 6.3, 6.4
 */

export class CombatSystem {
    /**
     * Resolve combat between two units
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} defender - Defending unit
     * @param {Hex} terrain - Terrain where combat takes place (optional)
     * @returns {Object} - Combat result
     */
    static resolveCombat(attacker, defender, terrain = null) {
        // Validate inputs
        if (!attacker || !defender) {
            throw new Error('Both attacker and defender must be provided');
        }
        
        if (!attacker.isAlive() || !defender.isAlive()) {
            return {
                success: false,
                reason: 'Dead units cannot participate in combat',
                attacker: attacker,
                defender: defender
            };
        }
        
        // Get base combat values
        const attackValue = attacker.getAttackValue();
        const defenseValue = defender.getDefenseValue();
        
        // Add terrain defense bonus
        let terrainDefenseBonus = 0;
        if (terrain && terrain.getDefenseBonus) {
            terrainDefenseBonus = terrain.getDefenseBonus();
        }
        
        // Roll dice for randomness (1-6 each)
        const attackRoll = this.rollDice();
        const defenseRoll = this.rollDice();
        
        // Calculate total values
        const totalAttack = attackValue + attackRoll;
        const totalDefense = defenseValue + defenseRoll + terrainDefenseBonus;
        
        // Determine damage
        let damage = 0;
        let winner = null;
        
        if (totalAttack > totalDefense) {
            damage = Math.max(1, totalAttack - totalDefense); // Minimum 1 damage on successful hit
            defender.takeDamage(damage);
            
            if (!defender.isAlive()) {
                winner = attacker;
                
                // Award experience to attacking hero
                if (attacker.gainExperience) {
                    const experienceGained = this.calculateExperienceGain(attacker, defender);
                    attacker.gainExperience(experienceGained);
                }
            }
        }
        
        // Mark attacker as having acted
        attacker.hasActed = true;
        
        // Create detailed combat result
        const result = {
            success: true,
            attacker: attacker,
            defender: defender,
            terrain: terrain,
            attackValue: attackValue,
            defenseValue: defenseValue,
            terrainDefenseBonus: terrainDefenseBonus,
            attackRoll: attackRoll,
            defenseRoll: defenseRoll,
            totalAttack: totalAttack,
            totalDefense: totalDefense,
            damage: damage,
            defenderKilled: !defender.isAlive(),
            winner: winner,
            timestamp: Date.now()
        };
        
        console.log(`Combat: ${attacker.getDisplayName()} vs ${defender.getDisplayName()}`);
        console.log(`Attack: ${attackValue}+${attackRoll}=${totalAttack}, Defense: ${defenseValue}+${defenseRoll}+${terrainDefenseBonus}=${totalDefense}`);
        console.log(`Damage: ${damage}, Defender ${defender.isAlive() ? 'survives' : 'destroyed'}`);
        
        return result;
    }
    
    /**
     * Roll a six-sided die
     * @returns {number} - Random number between 1 and 6
     */
    static rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }
    
    /**
     * Calculate experience gain for a hero after combat
     * @param {Unit} winner - Winning unit (must be a hero)
     * @param {Unit} loser - Defeated unit
     * @returns {number} - Experience points gained
     */
    static calculateExperienceGain(winner, loser) {
        // Only heroes gain experience
        if (!winner.gainExperience) {
            return 0;
        }
        
        // Base experience based on defeated unit type
        let baseExperience = 10; // Default for regular units
        
        if (loser.type === 'HERO') {
            baseExperience = 50; // More experience for defeating heroes
        } else if (loser.type === 'CAVALRY') {
            baseExperience = 20; // Strong units give more experience
        } else if (loser.type === 'ARCHER') {
            baseExperience = 15;
        } else if (loser.type === 'WARRIOR') {
            baseExperience = 10;
        }
        
        // Level difference modifier
        let levelModifier = 1.0;
        if (winner.level && loser.level) {
            const levelDifference = loser.level - winner.level;
            if (levelDifference > 0) {
                levelModifier = 1.0 + (levelDifference * 0.2); // More exp for defeating higher level units
            } else if (levelDifference < 0) {
                levelModifier = Math.max(0.1, 1.0 + (levelDifference * 0.1)); // Less exp for defeating lower level units
            }
        }
        
        const finalExperience = Math.floor(baseExperience * levelModifier);
        return Math.max(1, finalExperience); // Minimum 1 experience
    }
    
    /**
     * Check if two units can engage in combat
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} defender - Defending unit
     * @param {Map} map - Game map (optional, for future range checks)
     * @returns {Object} - Combat eligibility result
     */
    static canEngageInCombat(attacker, defender, map = null) {
        // Basic validation
        if (!attacker || !defender) {
            return {
                canFight: false,
                reason: 'Missing attacker or defender'
            };
        }
        
        if (!attacker.isAlive()) {
            return {
                canFight: false,
                reason: 'Attacker is not alive'
            };
        }
        
        if (!defender.isAlive()) {
            return {
                canFight: false,
                reason: 'Defender is not alive'
            };
        }
        
        if (attacker.hasActed) {
            return {
                canFight: false,
                reason: 'Attacker has already acted this turn'
            };
        }
        
        if (attacker.owner === defender.owner) {
            return {
                canFight: false,
                reason: 'Cannot attack units of the same player'
            };
        }
        
        // Check adjacency if map is provided
        if (map) {
            const attackerHex = map.getHex(attacker.x, attacker.y);
            const defenderHex = map.getHex(defender.x, defender.y);
            
            if (attackerHex && defenderHex) {
                if (!attackerHex.isAdjacentTo(defenderHex)) {
                    return {
                        canFight: false,
                        reason: 'Units must be adjacent to engage in combat'
                    };
                }
            }
        }
        
        return {
            canFight: true,
            reason: 'Combat is possible'
        };
    }
    
    /**
     * Simulate combat without actually executing it (for AI planning)
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} defender - Defending unit
     * @param {Hex} terrain - Terrain where combat takes place (optional)
     * @param {number} iterations - Number of simulations to run (default: 100)
     * @returns {Object} - Combat simulation results
     */
    static simulateCombat(attacker, defender, terrain = null, iterations = 100) {
        if (!attacker || !defender) {
            throw new Error('Both attacker and defender must be provided for simulation');
        }
        
        let attackerWins = 0;
        let defenderWins = 0;
        let totalDamageToDefender = 0;
        let totalDamageToAttacker = 0;
        
        const attackValue = attacker.getAttackValue();
        const defenseValue = defender.getDefenseValue();
        let terrainDefenseBonus = 0;
        
        if (terrain && terrain.getDefenseBonus) {
            terrainDefenseBonus = terrain.getDefenseBonus();
        }
        
        for (let i = 0; i < iterations; i++) {
            const attackRoll = this.rollDice();
            const defenseRoll = this.rollDice();
            
            const totalAttack = attackValue + attackRoll;
            const totalDefense = defenseValue + defenseRoll + terrainDefenseBonus;
            
            if (totalAttack > totalDefense) {
                const damage = Math.max(1, totalAttack - totalDefense);
                totalDamageToDefender += damage;
                
                if (damage >= defender.health) {
                    attackerWins++;
                }
            } else {
                defenderWins++;
            }
        }
        
        return {
            attackerWinRate: attackerWins / iterations,
            defenderWinRate: defenderWins / iterations,
            averageDamageToDefender: totalDamageToDefender / iterations,
            averageDamageToAttacker: totalDamageToAttacker / iterations,
            iterations: iterations,
            attackValue: attackValue,
            defenseValue: defenseValue,
            terrainDefenseBonus: terrainDefenseBonus
        };
    }
    
    /**
     * Handle post-combat cleanup (remove dead units, update map, etc.)
     * @param {Object} combatResult - Result from resolveCombat
     * @param {Map} map - Game map
     * @returns {Object} - Cleanup result
     */
    static handlePostCombatCleanup(combatResult, map) {
        if (!combatResult.success) {
            return { cleanupPerformed: false, reason: 'Combat was not successful' };
        }
        
        const actions = [];
        
        // Remove dead defender from map if killed
        if (combatResult.defenderKilled && map) {
            const defenderHex = map.getHex(combatResult.defender.x, combatResult.defender.y);
            if (defenderHex && defenderHex.unit === combatResult.defender) {
                defenderHex.removeUnit();
                actions.push(`Removed dead ${combatResult.defender.getDisplayName()} from map`);
            }
        }
        
        // Move attacker to defender's position if defender was killed
        if (combatResult.defenderKilled && map) {
            const attackerHex = map.getHex(combatResult.attacker.x, combatResult.attacker.y);
            const defenderHex = map.getHex(combatResult.defender.x, combatResult.defender.y);
            
            if (attackerHex && defenderHex) {
                // Remove attacker from old position
                attackerHex.removeUnit();
                
                // Move attacker to new position
                combatResult.attacker.x = combatResult.defender.x;
                combatResult.attacker.y = combatResult.defender.y;
                defenderHex.setUnit(combatResult.attacker);
                
                actions.push(`Moved ${combatResult.attacker.getDisplayName()} to conquered position`);
            }
        }
        
        return {
            cleanupPerformed: true,
            actions: actions,
            combatResult: combatResult
        };
    }
    
    /**
     * Get combat preview information for UI display
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} defender - Defending unit
     * @param {Hex} terrain - Terrain where combat takes place (optional)
     * @returns {Object} - Combat preview data
     */
    static getCombatPreview(attacker, defender, terrain = null) {
        if (!attacker || !defender) {
            return null;
        }
        
        const attackValue = attacker.getAttackValue();
        const defenseValue = defender.getDefenseValue();
        let terrainDefenseBonus = 0;
        
        if (terrain && terrain.getDefenseBonus) {
            terrainDefenseBonus = terrain.getDefenseBonus();
        }
        
        // Run a quick simulation to get win rates
        const simulation = this.simulateCombat(attacker, defender, terrain, 50);
        
        return {
            attacker: {
                name: attacker.getDisplayName(),
                health: attacker.health,
                maxHealth: attacker.getMaxHealth(),
                attack: attackValue,
                winRate: simulation.attackerWinRate
            },
            defender: {
                name: defender.getDisplayName(),
                health: defender.health,
                maxHealth: defender.getMaxHealth(),
                defense: defenseValue,
                terrainBonus: terrainDefenseBonus,
                winRate: simulation.defenderWinRate
            },
            terrain: terrain ? terrain.getTerrainName() : 'Unknown',
            averageDamage: simulation.averageDamageToDefender
        };
    }
}