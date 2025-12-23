/**
 * Map - Manages the game map with hexagonal grid system
 * Handles terrain, pathfinding, and spatial queries
 */

import { Hex, TERRAIN_TYPES } from './Hex.js';

export class Map {
    constructor(width, height) {
        // Validate dimensions
        if (!width || !height || width <= 0 || height <= 0 || !Number.isInteger(width) || !Number.isInteger(height)) {
            throw new Error(`Invalid map dimensions: ${width}x${height}. Dimensions must be positive integers.`);
        }
        
        // Check for reasonable size limits to prevent memory issues
        if (width * height > 1000000) { // 1 million hexes max
            throw new Error(`Map too large: ${width}x${height}. Maximum size is 1000x1000.`);
        }
        
        this.width = width;
        this.height = height;
        this.hexes = new Array(width * height);
        
        // Initialize with empty plains
        this.initializeTerrain();
        
        console.log(`Map created: ${width}x${height}`);
    }
    
    /**
     * Initialize terrain with default plains
     */
    initializeTerrain() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = this.getIndex(x, y);
                this.hexes[index] = new Hex(x, y, TERRAIN_TYPES.PLAINS);
            }
        }
    }
    
    /**
     * Get array index from coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} - Array index
     */
    getIndex(x, y) {
        return y * this.width + x;
    }
    
    /**
     * Check if coordinates are valid
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if valid
     */
    isValidCoordinate(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    /**
     * Get hex at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Hex|null} - Hex object or null if invalid coordinates
     */
    getHex(x, y) {
        if (!this.isValidCoordinate(x, y)) {
            return null;
        }
        
        const index = this.getIndex(x, y);
        return this.hexes[index];
    }
    
    /**
     * Set hex at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Hex} hex - Hex object to set
     */
    setHex(x, y, hex) {
        if (!this.isValidCoordinate(x, y)) {
            throw new Error(`Invalid coordinates: (${x}, ${y})`);
        }
        
        const index = this.getIndex(x, y);
        this.hexes[index] = hex;
    }
    
    /**
     * Set terrain type at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} terrain - Terrain type
     */
    setTerrain(x, y, terrain) {
        const hex = this.getHex(x, y);
        if (hex) {
            hex.terrain = terrain;
        }
    }
    
    /**
     * Get neighboring hexes
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array} - Array of neighboring hex objects
     */
    getNeighbors(x, y) {
        const neighbors = [];
        
        // Square grid neighbors (4-directional)
        const directions = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            const neighbor = this.getHex(nx, ny);
            
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Get neighboring coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array} - Array of neighboring coordinate objects
     */
    getNeighborCoordinates(x, y) {
        const neighbors = [];
        
        const directions = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: 0 },  // East
            { dx: 0, dy: 1 },  // South
            { dx: -1, dy: 0 }  // West
        ];
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (this.isValidCoordinate(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        
        return neighbors;
    }
    
    /**
     * Calculate movement cost from one hex to another
     * @param {number} fromX - Source X coordinate
     * @param {number} fromY - Source Y coordinate
     * @param {number} toX - Destination X coordinate
     * @param {number} toY - Destination Y coordinate
     * @param {Object} unit - Unit making the move (optional)
     * @returns {number} - Movement cost, or Infinity if impassable
     */
    calculateMovementCost(fromX, fromY, toX, toY, unit = null) {
        const fromHex = this.getHex(fromX, fromY);
        const toHex = this.getHex(toX, toY);
        
        if (!fromHex || !toHex) {
            return Infinity;
        }
        
        // Check if destination is passable
        if (!toHex.isPassable(unit)) {
            return Infinity;
        }
        
        // Check if destination is occupied by another unit
        if (toHex.isOccupied() && toHex.unit !== unit) {
            // TODO: In the future, consider stacking rules
            return Infinity;
        }
        
        // Return the movement cost of the destination hex
        return toHex.getMovementCost(unit);
    }
    
    /**
     * Find path between two points using A* algorithm
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     * @param {Object} unit - Unit making the move (optional)
     * @returns {Array|null} - Array of coordinate objects representing the path, or null if no path
     */
    findPath(startX, startY, endX, endY, unit = null) {
        // Validate coordinates
        if (!this.isValidCoordinate(startX, startY) || !this.isValidCoordinate(endX, endY)) {
            return null;
        }
        
        // If start and end are the same, return empty path
        if (startX === endX && startY === endY) {
            return [];
        }
        
        // A* pathfinding implementation
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new globalThis.Map();
        const gScore = new globalThis.Map();
        const fScore = new globalThis.Map();
        
        const startKey = `${startX},${startY}`;
        const endKey = `${endX},${endY}`;
        
        // Initialize start node
        openSet.push({ x: startX, y: startY, key: startKey });
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(openSet[i].key) < fScore.get(current.key)) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            // Remove current from open set
            openSet.splice(currentIndex, 1);
            closedSet.add(current.key);
            
            // Check if we reached the goal
            if (current.key === endKey) {
                return this.reconstructPath(cameFrom, current);
            }
            
            // Check neighbors
            const neighbors = this.getNeighborCoordinates(current.x, current.y);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.has(neighborKey)) {
                    continue;
                }
                
                const movementCost = this.calculateMovementCost(
                    current.x, current.y, 
                    neighbor.x, neighbor.y, 
                    unit
                );
                
                if (movementCost === Infinity) {
                    continue; // Impassable
                }
                
                const tentativeGScore = gScore.get(current.key) + movementCost;
                
                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor.x, neighbor.y, endX, endY));
                    
                    // Add to open set if not already there
                    if (!openSet.some(node => node.key === neighborKey)) {
                        openSet.push({ x: neighbor.x, y: neighbor.y, key: neighborKey });
                    }
                }
            }
        }
        
        // No path found
        return null;
    }
    
    /**
     * Heuristic function for A* (Manhattan distance)
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @returns {number} - Heuristic distance
     */
    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    /**
     * Reconstruct path from A* algorithm
     * @param {Map} cameFrom - Map of parent nodes
     * @param {Object} current - Current node
     * @returns {Array} - Path as array of coordinates
     */
    reconstructPath(cameFrom, current) {
        const path = [{ x: current.x, y: current.y }];
        
        while (cameFrom.has(current.key)) {
            current = cameFrom.get(current.key);
            path.unshift({ x: current.x, y: current.y });
        }
        
        // Remove the starting position from the path
        path.shift();
        
        return path;
    }
    
    /**
     * Get all hexes within a certain range
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} range - Range in hexes
     * @returns {Array} - Array of hex objects within range
     */
    getHexesInRange(centerX, centerY, range) {
        const hexes = [];
        
        for (let y = Math.max(0, centerY - range); y <= Math.min(this.height - 1, centerY + range); y++) {
            for (let x = Math.max(0, centerX - range); x <= Math.min(this.width - 1, centerX + range); x++) {
                const distance = Math.abs(x - centerX) + Math.abs(y - centerY);
                if (distance <= range) {
                    const hex = this.getHex(x, y);
                    if (hex) {
                        hexes.push(hex);
                    }
                }
            }
        }
        
        return hexes;
    }
    
    /**
     * Get all reachable hexes for a unit with given movement points
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} movementPoints - Available movement points
     * @param {Object} unit - Unit making the move (optional)
     * @returns {Array} - Array of reachable hex coordinates with costs
     */
    getReachableHexes(startX, startY, movementPoints, unit = null) {
        const reachable = [];
        const visited = new Set();
        const queue = [{ x: startX, y: startY, cost: 0 }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) {
                continue;
            }
            
            visited.add(key);
            
            // Add to reachable if not the starting position
            if (!(current.x === startX && current.y === startY)) {
                reachable.push({
                    x: current.x,
                    y: current.y,
                    cost: current.cost
                });
            }
            
            // Check neighbors
            const neighbors = this.getNeighborCoordinates(current.x, current.y);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (visited.has(neighborKey)) {
                    continue;
                }
                
                const movementCost = this.calculateMovementCost(
                    current.x, current.y,
                    neighbor.x, neighbor.y,
                    unit
                );
                
                if (movementCost === Infinity) {
                    continue;
                }
                
                const totalCost = current.cost + movementCost;
                
                if (totalCost <= movementPoints) {
                    queue.push({
                        x: neighbor.x,
                        y: neighbor.y,
                        cost: totalCost
                    });
                }
            }
        }
        
        return reachable;
    }
    
    /**
     * Serialize map data
     * @returns {Object} - Serialized map data
     */
    serialize() {
        return {
            width: this.width,
            height: this.height,
            hexes: this.hexes.map(hex => hex.serialize())
        };
    }
    
    /**
     * Deserialize map data
     * @param {Object} data - Serialized map data
     * @returns {Map} - Map instance
     */
    static deserialize(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid map data for deserialization');
        }
        
        if (!data.width || !data.height || !Array.isArray(data.hexes)) {
            throw new Error('Missing required map data fields');
        }
        
        const map = new Map(data.width, data.height);
        
        if (data.hexes.length !== data.width * data.height) {
            throw new Error(`Hex array length mismatch: expected ${data.width * data.height}, got ${data.hexes.length}`);
        }
        
        for (let i = 0; i < data.hexes.length; i++) {
            try {
                map.hexes[i] = Hex.deserialize(data.hexes[i]);
            } catch (error) {
                console.warn(`Failed to deserialize hex at index ${i}:`, error);
                // Use default hex if deserialization fails
                const x = i % data.width;
                const y = Math.floor(i / data.width);
                map.hexes[i] = new Hex(x, y);
            }
        }
        
        return map;
    }
    
    /**
     * Get map statistics
     * @returns {Object} - Map statistics
     */
    getStatistics() {
        const terrainCounts = {};
        let occupiedHexes = 0;
        let cityHexes = 0;
        
        for (const hex of this.hexes) {
            // Count terrain types
            terrainCounts[hex.terrain] = (terrainCounts[hex.terrain] || 0) + 1;
            
            // Count occupied hexes
            if (hex.isOccupied()) {
                occupiedHexes++;
            }
            
            // Count city hexes
            if (hex.hasCity()) {
                cityHexes++;
            }
        }
        
        return {
            width: this.width,
            height: this.height,
            totalHexes: this.hexes.length,
            terrainCounts,
            occupiedHexes,
            cityHexes
        };
    }
    
    /**
     * Clear all units and cities from the map
     */
    clearUnitsAndCities() {
        for (const hex of this.hexes) {
            hex.removeUnit();
            hex.removeCity();
        }
    }
    
    /**
     * Get a string representation of the map
     * @returns {string} - String representation
     */
    toString() {
        return `Map(${this.width}x${this.height})`;
    }
}