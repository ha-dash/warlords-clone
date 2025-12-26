/**
 * MapGenerator - Generates random maps with natural terrain and strategic balance
 * Uses noise-based generation for organic landscapes and smart city placement
 */

import { Map } from './Map.js';
import { TERRAIN_TYPES } from './Hex.js';
import { City } from './City.js';

export class MapGenerator {
    constructor() {
        this.noiseProfile = {
            frequency: 0.1,
            octaves: 3
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

        const config = {
            seed: options.seed || Math.random(),
            playerCount: options.players ? options.players.length : 2,
            cityDensity: options.cityDensity || 0.04 // 4% of land hexes are cities
        };

        const map = new Map(width, height);
        this.random = this.createSeededRandom(config.seed);

        // 1. Generate Base Terrain using Noise (Elevation + Moisture)
        this.generateTerrainWithNoise(map, config);

        // 2. Generate Rivers
        this.generateRivers(map, config);

        // 3. Place Cities
        const cities = this.placeCities(map, config);

        // 4. Connect Cities with Roads
        this.connectCities(map, cities);

        // 5. Cleanup (smoothing, removing single isolated walls)
        // this.applySmoothing(map);

        // 6. Register cities to the map (attaching objects to hexes for now)
        // Note: GameState needs to extract these later.
        cities.forEach(city => {
            const hex = map.getHex(city.x, city.y);
            if (hex) hex.setCity(city);
        });

        console.log(`Map generation completed. Cities placed: ${cities.length}`);
        return map;
    }

    /**
     * Create a seeded random number generator
     */
    createSeededRandom(seed) {
        let state = seed;
        return function () {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }

    /**
     * Generate terrain using Simplex-like noise approach
     */
    generateTerrainWithNoise(map, config) {
        const width = map.width;
        const height = map.height;

        // Simple 2D smooth noise implementation
        const noise2D = (x, y, seed) => {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            return (Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453) % 1;
        };

        // Value noise helper (interpolated)
        const interpolatedNoise = (x, y, seed, freq) => {
            const xVal = x * freq;
            const yVal = y * freq;
            const xi = Math.floor(xVal);
            const yi = Math.floor(yVal);
            const xf = xVal - xi;
            const yf = yVal - yi;

            // Smoothstep
            const u = xf * xf * (3.0 - 2.0 * xf);
            const v = yf * yf * (3.0 - 2.0 * yf);

            const n00 = noise2D(xi, yi, seed);
            const n10 = noise2D(xi + 1, yi, seed);
            const n01 = noise2D(xi, yi + 1, seed);
            const n11 = noise2D(xi + 1, yi + 1, seed);

            return (1 - v) * ((1 - u) * n00 + u * n10) + v * ((1 - u) * n01 + u * n11);
        };

        const fbm = (x, y, seed) => {
            let total = 0;
            let amplitude = 1;
            let frequency = 0.1;
            let maxValue = 0;
            for (let i = 0; i < 3; i++) {
                // Use abs for turbulence or simple sum for hills
                total += Math.abs(interpolatedNoise(x, y, seed, frequency) * amplitude);
                maxValue += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            return total / maxValue;
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Elevation Noise
                let elevation = fbm(x, y, config.seed);

                // Moisture Noise (offset seed)
                let moisture = fbm(x, y, config.seed + 123.45);

                // Terrain Rules
                let terrain = TERRAIN_TYPES.PLAINS;

                if (elevation < 0.30) {
                    terrain = TERRAIN_TYPES.WATER; // Deep Water / Water
                } else if (elevation > 0.75) {
                    terrain = TERRAIN_TYPES.MOUNTAIN;
                } else {
                    // Land
                    if (moisture > 0.6) {
                        terrain = TERRAIN_TYPES.FOREST;
                    } else {
                        terrain = TERRAIN_TYPES.PLAINS;
                    }
                }

                map.setTerrain(x, y, terrain);
            }
        }
    }

    /**
     * Generate rivers flowing from mountains to water
     */
    generateRivers(map, config) {
        // Find potential sources (Mountains) and sinks (Water)
        const sources = [];
        const sinks = [];

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const hex = map.getHex(x, y);
                if (hex.terrain === TERRAIN_TYPES.MOUNTAIN) {
                    sources.push(hex);
                } else if (hex.terrain === TERRAIN_TYPES.WATER) {
                    sinks.push(hex);
                }
            }
        }

        if (sources.length === 0 || sinks.length === 0) return;

        // Shuffle sources
        this.shuffleArray(sources);

        // Determine number of rivers
        const riverCount = Math.max(1, Math.floor(sources.length / 5));
        let createdRivers = 0;

        for (const source of sources) {
            if (createdRivers >= riverCount) break;

            // Find nearest water sink
            let nearestSink = null;
            let minDist = Infinity;

            for (const sink of sinks) {
                const dist = Math.abs(source.x - sink.x) + Math.abs(source.y - sink.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestSink = sink;
                }
            }

            // Only create river if distance is reasonable (not too short, not too long)
            if (nearestSink && minDist > 2 && minDist < 20) {
                const path = map.findPath(source.x, source.y, nearestSink.x, nearestSink.y, null, { ignorePassable: true });
                if (path) {
                    let riverAdded = false;
                    // Skip first (mountain) and last (water)
                    for (let i = 1; i < path.length - 1; i++) {
                        const pos = path[i];
                        const hex = map.getHex(pos.x, pos.y);
                        // Don't put rivers on mountains or existing water
                        if (hex && hex.terrain !== TERRAIN_TYPES.MOUNTAIN && hex.terrain !== TERRAIN_TYPES.WATER) {
                            hex.hasRiver = true;
                            riverAdded = true;
                        }
                    }
                    if (riverAdded) createdRivers++;
                }
            }
        }
        console.log(`Generated ${createdRivers} rivers.`);
    }

    /**
     * Place cities on valid terrain
     */
    placeCities(map, config) {
        const validHexes = [];
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const hex = map.getHex(x, y);
                if (hex.terrain === TERRAIN_TYPES.PLAINS || hex.terrain === TERRAIN_TYPES.FOREST) {
                    validHexes.push(hex);
                }
            }
        }

        // Shuffle valid hexes
        this.shuffleArray(validHexes);

        const cities = [];
        const cityNames = ["Stormwind", "Orgrimmar", "Ironforge", "Undercity", "Darnassus", "Thunder Bluff", "Exodar", "Silvermoon", "Solaris", "Lunaris", "Aethelgard", "Moradh", "Dun Kar", "Zul'Aman"];

        // Place Player Capitals first
        // Simple logic: Place far from each other?
        // For now, just pick random distinct spots

        let placedCount = 0;

        // Place Neutral Cities
        const targetCityCount = Math.floor(validHexes.length * config.cityDensity);

        for (const hex of validHexes) {
            if (cities.length >= targetCityCount) break;

            // Grid-based distance check to avoid overcrowding
            // Don't place city if another is within distance 3
            let tooClose = false;
            for (const c of cities) {
                const dist = Math.abs(c.x - hex.x) + Math.abs(c.y - hex.y);
                if (dist < 4) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                // Determine owner? For now, map generator creates neutral cities (owner -1 or 0 if player?)
                // Wait, players are 0, 1, 2. Neutral usually -1 or null.
                const name = cityNames[cities.length % cityNames.length] + (cities.length >= cityNames.length ? ` ${cities.length}` : "");
                const city = new City(name, -1, hex.x, hex.y, Math.floor(this.random() * 2) + 1);
                cities.push(city);
            }
        }

        return cities;
    }

    /**
     * Connect cities with roads using pathfinding
     */
    connectCities(map, cities) {
        if (cities.length < 2) return;

        // Connect each city to its nearest 2 neighbors
        cities.forEach(cityA => {
            // Find distances to all other cities
            const distances = cities
                .filter(cityB => cityB !== cityA)
                .map(cityB => ({
                    city: cityB,
                    dist: Math.abs(cityA.x - cityB.x) + Math.abs(cityA.y - cityB.y)
                }))
                .sort((a, b) => a.dist - b.dist);

            // Connect to nearest 2
            const nearest = distances.slice(0, 2);

            nearest.forEach(target => {
                const path = map.findPath(cityA.x, cityA.y, target.city.x, target.city.y);
                if (path) {
                    path.forEach(pos => {
                        const hex = map.getHex(pos.x, pos.y);
                        // Don't overwrite cities or water (unless bridge needed, but sticking to land)
                        // Actually pathfinding avoids obstacles.
                        // Only overwrite PLAINS/FOREST with ROAD
                        if (hex && !hex.hasCity() && hex.terrain !== TERRAIN_TYPES.WATER && hex.terrain !== TERRAIN_TYPES.MOUNTAIN) {
                            if (hex.terrain !== TERRAIN_TYPES.ROAD) {
                                map.setTerrain(pos.x, pos.y, TERRAIN_TYPES.ROAD);
                            }
                        }
                    });
                }
            });
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Existing test methods kept for compatibility but wrapped or ignored
    generateTestMap(width, height, pattern) {
        return this.generateMap(width, height); // Override test map with our cool map
    }
}

export const mapGenerator = new MapGenerator();