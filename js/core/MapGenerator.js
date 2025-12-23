/**
 * MapGenerator - Generates random maps with balanced terrain distribution
 * Creates interesting and playable maps for the Warlords Clone game
 */

import { Map } from './Map.js';
import { TERRAIN_TYPES } from './Hex.js';

export class MapGenerator {
    constructor() {
        // Default terrain distribution percentages
        this.defaultTerrainDistribution = {
            [TERRAIN_TYPES.PLAINS]: 0.4,   // 40% plains
            [TERRAIN_TYPES.FOREST]: 0.25,  // 25% forest
            [TERRAIN_TYPES.MOUNTAIN]: 0.15, // 15% mountain
            [TERRAIN_TYPES.WATER]: 0.15,   // 15% water
            [TERRAIN_TYPES.ROAD]: 0.05     // 5% roads
        };
        
        // Terrain clustering settings
        this.clusterSettings = {
            [TERRAIN_TYPES.WATER]: { size: 3, probability: 0.7 },
            [TERRAIN_TYPES.MOUNTAIN]: { size: 2, probability: 0.6 },
            [TERRAIN_TYPES.FOREST]: { size: 2, probability: 0.5 }
        };
    }
    
    /**
     * Generate a random map with balanced terrain distribution
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {Object} options - Generation options
     * @returns {Map} - Generated map
     */
    generateMap(width, height, options = {}) {
        console.log(`Generating map: ${width}x${height}`);
        
        // Merge options with defaults
        const config = {
            terrainDistribution: { ...this.defaultTerrainDistribution, ...options.terrainDistribution },
            seed: options.seed || Math.random(),
            clustering: options.clustering !== false, // Default to true
            smoothing: options.smoothing !== false,   // Default to true
            ensureConnectivity: options.ensureConnectivity !== false // Default to true
        };
        
        // Create base map
        const map = new Map(width, height);
        
        // Set random seed for reproducible generation
        this.random = this.createSeededRandom(config.seed);
        
        // Generate terrain
        this.generateTerrain(map, config);
        
        // Apply clustering if enabled
        if (config.clustering) {
            this.applyClustering(map);
        }
        
        // Apply smoothing if enabled
        if (config.smoothing) {
            this.applySmoothing(map);
        }
        
        // Ensure connectivity if enabled
        if (config.ensureConnectivity) {
            this.ensureConnectivity(map);
        }
        
        // Add roads to connect important areas
        this.addRoads(map);
        
        console.log('Map generation completed');
        return map;
    }
    
    /**
     * Create a seeded random number generator
     * @param {number} seed - Random seed
     * @returns {Function} - Random function
     */
    createSeededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }
    
    /**
     * Generate basic terrain distribution
     * @param {Map} map - Map to populate
     * @param {Object} config - Generation configuration
     */
    generateTerrain(map, config) {
        const totalHexes = map.width * map.height;
        const terrainCounts = {};
        
        // Calculate target counts for each terrain type
        for (const [terrain, percentage] of Object.entries(config.terrainDistribution)) {
            terrainCounts[terrain] = Math.floor(totalHexes * percentage);
        }
        
        // Create array of terrain types based on distribution
        const terrainArray = [];
        for (const [terrain, count] of Object.entries(terrainCounts)) {
            for (let i = 0; i < count; i++) {
                terrainArray.push(terrain);
            }
        }
        
        // Fill remaining slots with plains
        while (terrainArray.length < totalHexes) {
            terrainArray.push(TERRAIN_TYPES.PLAINS);
        }
        
        // Shuffle the terrain array
        this.shuffleArray(terrainArray);
        
        // Assign terrain to hexes
        let index = 0;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                map.setTerrain(x, y, terrainArray[index]);
                index++;
            }
        }
    }
    
    /**
     * Apply terrain clustering to create more natural-looking terrain
     * @param {Map} map - Map to modify
     */
    applyClustering(map) {
        const newTerrain = new Array(map.width * map.height);
        
        // Copy current terrain
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const hex = map.getHex(x, y);
                newTerrain[map.getIndex(x, y)] = hex.terrain;
            }
        }
        
        // Apply clustering for specific terrain types
        for (const [terrain, settings] of Object.entries(this.clusterSettings)) {
            this.clusterTerrain(map, newTerrain, terrain, settings);
        }
        
        // Apply the new terrain
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                map.setTerrain(x, y, newTerrain[map.getIndex(x, y)]);
            }
        }
    }
    
    /**
     * Cluster specific terrain type
     * @param {Map} map - Map reference
     * @param {Array} terrain - Terrain array to modify
     * @param {string} terrainType - Terrain type to cluster
     * @param {Object} settings - Clustering settings
     */
    clusterTerrain(map, terrain, terrainType, settings) {
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const index = map.getIndex(x, y);
                
                if (terrain[index] === terrainType) {
                    // Try to expand this terrain in nearby hexes
                    const neighbors = map.getNeighborCoordinates(x, y);
                    
                    for (const neighbor of neighbors) {
                        const neighborIndex = map.getIndex(neighbor.x, neighbor.y);
                        
                        if (this.random() < settings.probability) {
                            terrain[neighborIndex] = terrainType;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Apply smoothing to reduce isolated terrain patches
     * @param {Map} map - Map to smooth
     */
    applySmoothing(map) {
        const changes = [];
        
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const hex = map.getHex(x, y);
                const neighbors = map.getNeighbors(x, y);
                
                // Count terrain types in neighborhood
                const terrainCounts = {};
                terrainCounts[hex.terrain] = 1; // Include current hex
                
                for (const neighbor of neighbors) {
                    terrainCounts[neighbor.terrain] = (terrainCounts[neighbor.terrain] || 0) + 1;
                }
                
                // Find most common terrain in neighborhood
                let mostCommon = hex.terrain;
                let maxCount = terrainCounts[hex.terrain];
                
                for (const [terrain, count] of Object.entries(terrainCounts)) {
                    if (count > maxCount) {
                        mostCommon = terrain;
                        maxCount = count;
                    }
                }
                
                // Change terrain if it's significantly outnumbered
                if (maxCount > terrainCounts[hex.terrain] + 1) {
                    changes.push({ x, y, terrain: mostCommon });
                }
            }
        }
        
        // Apply changes
        for (const change of changes) {
            map.setTerrain(change.x, change.y, change.terrain);
        }
    }
    
    /**
     * Ensure map connectivity by removing isolated water areas
     * @param {Map} map - Map to modify
     */
    ensureConnectivity(map) {
        // Find all land hexes
        const landHexes = [];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const hex = map.getHex(x, y);
                if (hex.terrain !== TERRAIN_TYPES.WATER) {
                    landHexes.push({ x, y });
                }
            }
        }
        
        if (landHexes.length === 0) {
            return; // No land to connect
        }
        
        // Use flood fill to find connected components
        const visited = new Set();
        const components = [];
        
        for (const landHex of landHexes) {
            const key = `${landHex.x},${landHex.y}`;
            if (!visited.has(key)) {
                const component = this.floodFillLand(map, landHex.x, landHex.y, visited);
                components.push(component);
            }
        }
        
        // If there are multiple components, connect them
        if (components.length > 1) {
            this.connectLandMasses(map, components);
        }
    }
    
    /**
     * Flood fill to find connected land areas
     * @param {Map} map - Map reference
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {Set} visited - Set of visited coordinates
     * @returns {Array} - Array of connected land hexes
     */
    floodFillLand(map, startX, startY, visited) {
        const component = [];
        const queue = [{ x: startX, y: startY }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) {
                continue;
            }
            
            visited.add(key);
            const hex = map.getHex(current.x, current.y);
            
            if (hex && hex.terrain !== TERRAIN_TYPES.WATER) {
                component.push(current);
                
                // Add neighbors to queue
                const neighbors = map.getNeighborCoordinates(current.x, current.y);
                for (const neighbor of neighbors) {
                    const neighborKey = `${neighbor.x},${neighbor.y}`;
                    if (!visited.has(neighborKey)) {
                        queue.push(neighbor);
                    }
                }
            }
        }
        
        return component;
    }
    
    /**
     * Connect isolated land masses with roads or plains
     * @param {Map} map - Map to modify
     * @param {Array} components - Array of land components
     */
    connectLandMasses(map, components) {
        // Sort components by size (largest first)
        components.sort((a, b) => b.length - a.length);
        
        const mainComponent = components[0];
        
        // Connect each smaller component to the main one
        for (let i = 1; i < components.length; i++) {
            const component = components[i];
            this.createConnection(map, mainComponent, component);
        }
    }
    
    /**
     * Create a connection between two land components
     * @param {Map} map - Map reference
     * @param {Array} component1 - First component
     * @param {Array} component2 - Second component
     */
    createConnection(map, component1, component2) {
        // Find closest points between components
        let minDistance = Infinity;
        let bestConnection = null;
        
        for (const hex1 of component1) {
            for (const hex2 of component2) {
                const distance = Math.abs(hex1.x - hex2.x) + Math.abs(hex1.y - hex2.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestConnection = { from: hex1, to: hex2 };
                }
            }
        }
        
        if (bestConnection) {
            // Create a path between the closest points
            const path = map.findPath(
                bestConnection.from.x, bestConnection.from.y,
                bestConnection.to.x, bestConnection.to.y
            );
            
            if (path) {
                // Convert water hexes in the path to plains
                for (const step of path) {
                    const hex = map.getHex(step.x, step.y);
                    if (hex && hex.terrain === TERRAIN_TYPES.WATER) {
                        map.setTerrain(step.x, step.y, TERRAIN_TYPES.PLAINS);
                    }
                }
            }
        }
    }
    
    /**
     * Add roads to connect important areas
     * @param {Map} map - Map to modify
     */
    addRoads(map) {
        // For now, just add some random roads
        // In the future, this could connect cities or strategic locations
        const roadCount = Math.floor((map.width * map.height) * 0.02); // 2% roads
        
        for (let i = 0; i < roadCount; i++) {
            const x = Math.floor(this.random() * map.width);
            const y = Math.floor(this.random() * map.height);
            const hex = map.getHex(x, y);
            
            // Only place roads on plains or replace existing roads
            if (hex && (hex.terrain === TERRAIN_TYPES.PLAINS || hex.terrain === TERRAIN_TYPES.ROAD)) {
                map.setTerrain(x, y, TERRAIN_TYPES.ROAD);
            }
        }
    }
    
    /**
     * Shuffle array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Generate a map with specific terrain layout for testing
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @param {string} pattern - Pattern type ('checkerboard', 'stripes', 'islands')
     * @returns {Map} - Generated map
     */
    generateTestMap(width, height, pattern = 'checkerboard') {
        const map = new Map(width, height);
        
        switch (pattern) {
            case 'checkerboard':
                this.generateCheckerboard(map);
                break;
            case 'stripes':
                this.generateStripes(map);
                break;
            case 'islands':
                this.generateIslands(map);
                break;
            default:
                console.warn(`Unknown pattern: ${pattern}, using checkerboard`);
                this.generateCheckerboard(map);
        }
        
        return map;
    }
    
    /**
     * Generate checkerboard pattern for testing
     * @param {Map} map - Map to populate
     */
    generateCheckerboard(map) {
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const terrain = (x + y) % 2 === 0 ? TERRAIN_TYPES.PLAINS : TERRAIN_TYPES.FOREST;
                map.setTerrain(x, y, terrain);
            }
        }
    }
    
    /**
     * Generate stripe pattern for testing
     * @param {Map} map - Map to populate
     */
    generateStripes(map) {
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const terrain = y % 3 === 0 ? TERRAIN_TYPES.MOUNTAIN : 
                              y % 3 === 1 ? TERRAIN_TYPES.FOREST : TERRAIN_TYPES.PLAINS;
                map.setTerrain(x, y, terrain);
            }
        }
    }
    
    /**
     * Generate islands pattern for testing
     * @param {Map} map - Map to populate
     */
    generateIslands(map) {
        // Fill with water first
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                map.setTerrain(x, y, TERRAIN_TYPES.WATER);
            }
        }
        
        // Create a few islands
        const islandCount = Math.max(2, Math.floor((map.width * map.height) / 50));
        
        for (let i = 0; i < islandCount; i++) {
            const centerX = Math.floor(Math.random() * map.width);
            const centerY = Math.floor(Math.random() * map.height);
            const radius = Math.floor(Math.random() * 3) + 2;
            
            // Create circular island
            for (let y = Math.max(0, centerY - radius); y <= Math.min(map.height - 1, centerY + radius); y++) {
                for (let x = Math.max(0, centerX - radius); x <= Math.min(map.width - 1, centerX + radius); x++) {
                    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    if (distance <= radius) {
                        const terrain = distance < radius * 0.5 ? TERRAIN_TYPES.PLAINS : TERRAIN_TYPES.FOREST;
                        map.setTerrain(x, y, terrain);
                    }
                }
            }
        }
    }
}

// Export singleton instance
export const mapGenerator = new MapGenerator();