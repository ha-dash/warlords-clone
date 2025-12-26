/**
 * RenderEngine - Handles all rendering operations for the Warlords Clone game
 * Manages Canvas drawing, sprites, UI elements, and visual effects
 */

import { TERRAIN_CONFIG } from './Hex.js';
import { Camera } from './Camera.js';
import { TextureManager } from './TextureManager.js';
import { CityRenderer } from './CityRenderer.js';

export class RenderEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get 2D rendering context');
        }

        // Camera system for viewport management
        this.camera = new Camera(this.canvas.width, this.canvas.height);

        // Texture management
        this.textureManager = new TextureManager();
        this.cityRenderer = new CityRenderer();


        // Rendering configuration
        this.config = {
            hexSize: 32,
            hexSpacing: 2,
            gridColor: '#444444',
            gridWidth: 1,
            selectedColor: '#FFD700',
            selectedWidth: 3,
            highlightColor: '#00FF00',
            highlightWidth: 2
        };

        // UI state
        this.selectedHex = null;
        this.highlightedHexes = [];
        this.hoveredHex = null;

        // Performance optimization
        this.performanceSettings = {
            enableViewportCulling: true,
            enableSpriteCache: true,
            enableDirtyRectangles: true,
            maxParticles: 100,
            cullMargin: 64 // Extra pixels around viewport for culling
        };

        // Dirty rectangle tracking for efficient redraws
        this.dirtyRectangles = [];
        this.lastRenderState = null;
        this.frameCount = 0;
        this.lastFPSTime = 0;
        this.fps = 0;

        // Rendering statistics
        this.renderStats = {
            hexesRendered: 0,
            unitsRendered: 0,
            citiesRendered: 0,
            effectsRendered: 0,
            particlesRendered: 0,
            totalRenderTime: 0,
            culledHexes: 0,
            culledUnits: 0,
            culledCities: 0
        };

        // Sprite management
        this.sprites = new Map();
        this.spriteCache = new Map();
        this.loadSprites();

        // Animation system
        this.animations = new Map();
        this.animationId = 0;
        this.lastFrameTime = 0;

        // Visual effects
        this.effects = [];
        this.particles = [];

        // Animation settings
        this.animationSettings = {
            unitMovementDuration: 500, // ms
            combatAnimationDuration: 800, // ms
            fadeInDuration: 300, // ms
            fadeOutDuration: 300, // ms
            pulseSpeed: 2.0, // Hz
            shakeIntensity: 3 // pixels
        };

        console.log('RenderEngine initialized with canvas:', canvasId);
    }

    /**
     * Load and initialize sprites
     */
    loadSprites() {
        // For now, we'll use simple colored rectangles as sprites
        // In the future, this could load actual image files
        this.sprites.set('unit_warrior', { color: '#FF4444', symbol: 'W' });
        this.sprites.set('unit_archer', { color: '#44FF44', symbol: 'A' });
        this.sprites.set('unit_cavalry', { color: '#4444FF', symbol: 'C' });
        this.sprites.set('unit_hero', { color: '#FFD700', symbol: 'H' });
        this.sprites.set('city_small', { color: '#888888', symbol: '●' });
        this.sprites.set('city_medium', { color: '#AAAAAA', symbol: '●' });
        this.sprites.set('city_large', { color: '#CCCCCC', symbol: '●' });

        // Pre-cache common sprite combinations
        this.preloadSpriteCache();

        // Load terrain textures
        this.loadTerrainTextures();
    }

    /**
     * Load terrain textures
     */
    loadTerrainTextures() {
        this.textureManager.loadTexture('plains', 'assets/terrain/plains.png');
        this.textureManager.loadTexture('plains_01', 'assets/terrain/plains.png');
        this.textureManager.loadTexture('plains_02', 'assets/terrain/plains_02.png');
        this.textureManager.loadTexture('plains_03', 'assets/terrain/plains_03.png');

        this.textureManager.loadTexture('forest', 'assets/terrain/forest.png');
        this.textureManager.loadTexture('mountain', 'assets/terrain/mountain.png');
        this.textureManager.loadTexture('water', 'assets/terrain/water.png');
        // this.textureManager.loadTexture('road', 'assets/terrain/road.png'); // Roads rendered procedurally for now
    }

    /**
     * Pre-load sprite cache with common combinations
     */
    preloadSpriteCache() {
        if (!this.performanceSettings.enableSpriteCache) return;

        const hexSize = this.config.hexSize;

        // Cache unit sprites at different sizes and opacities
        for (const [spriteKey, sprite] of this.sprites) {
            if (spriteKey.startsWith('unit_')) {
                for (const opacity of [1.0, 0.8, 0.6, 0.4, 0.2]) {
                    for (const scale of [1.0, 1.1, 0.9]) {
                        this.getCachedSprite(spriteKey, hexSize, opacity, scale);
                    }
                }
            }
        }
    }

    /**
     * Get cached sprite or create new one
     * @param {string} spriteKey - Sprite identifier
     * @param {number} size - Sprite size
     * @param {number} opacity - Sprite opacity
     * @param {number} scale - Sprite scale
     * @returns {HTMLCanvasElement} - Cached sprite canvas
     */
    getCachedSprite(spriteKey, size, opacity = 1.0, scale = 1.0) {
        if (!this.performanceSettings.enableSpriteCache) {
            return null;
        }

        const cacheKey = `${spriteKey}_${size}_${opacity.toFixed(2)}_${scale.toFixed(2)}`;

        if (this.spriteCache.has(cacheKey)) {
            return this.spriteCache.get(cacheKey);
        }

        // Create new cached sprite
        const sprite = this.sprites.get(spriteKey);
        if (!sprite) return null;

        const canvas = document.createElement('canvas');
        const scaledSize = size * scale;
        canvas.width = scaledSize;
        canvas.height = scaledSize;
        const ctx = canvas.getContext('2d');

        ctx.globalAlpha = opacity;

        // Draw sprite to cache canvas
        if (spriteKey.startsWith('unit_')) {
            const radius = scaledSize / 4;
            const centerX = scaledSize / 2;
            const centerY = scaledSize / 2;

            // Background circle
            ctx.fillStyle = sprite.color;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();

            // Symbol
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${Math.floor(scaledSize / 5)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sprite.symbol, centerX, centerY);
        } else if (spriteKey.startsWith('city_')) {
            const radius = scaledSize / 3;
            const centerX = scaledSize / 2;
            const centerY = scaledSize / 2;

            // Background circle
            ctx.fillStyle = sprite.color;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();

            // Symbol
            ctx.fillStyle = '#000000';
            ctx.font = `${Math.floor(scaledSize / 3)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sprite.symbol, centerX, centerY);
        }

        this.spriteCache.set(cacheKey, canvas);
        return canvas;
    }

    /**
     * Main render method - renders the complete game state
     * @param {Object} gameState - Current game state
     */
    render(gameState) {
        if (!gameState) {
            this.clearCanvas();
            return;
        }

        const renderStartTime = performance.now();

        // Calculate delta time for animations
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.updateFPS(currentTime);

        // Reset render statistics
        this.resetRenderStats();

        // Update animations
        this.updateAnimations(deltaTime);
        this.updateEffects(deltaTime);
        this.updateParticles(deltaTime);

        // Update camera smooth movement
        this.camera.update();

        // Check if we need to redraw (dirty rectangle optimization)
        if (this.performanceSettings.enableDirtyRectangles && !this.needsRedraw(gameState)) {
            return;
        }

        // Clear canvas
        this.clearCanvas();

        // Save context state
        this.ctx.save();

        // Apply camera transformations
        this.applyCameraTransform();

        try {
            // Render in order: map -> cities -> units -> UI overlays
            this.renderMapOptimized(gameState.getMap());
            this.renderCitiesOptimized(gameState);
            this.renderUnitsOptimized(gameState);
            this.renderSelectionAndHighlights();
            this.renderEffects();
            this.renderParticles();

        } catch (error) {
            console.error('Error during rendering:', error);
        } finally {
            // Restore context state
            this.ctx.restore();

            // Render UI elements that don't use camera transform
            this.renderUI(gameState);
        }

        // Update render statistics
        this.renderStats.totalRenderTime = performance.now() - renderStartTime;

        // Store current state for dirty rectangle checking
        this.lastRenderState = this.captureRenderState(gameState);
    }

    /**
     * Clear the entire canvas
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Fill with background color
        this.ctx.fillStyle = '#1a252f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Apply camera transformation to the context
     */
    applyCameraTransform() {
        // Translate to center of canvas
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Apply zoom
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // Apply camera position (negative because we're moving the world, not the camera)
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }

    /**
     * Render the game map with terrain (optimized version)
     * @param {Map} map - Game map object
     */
    renderMapOptimized(map) {
        if (!map) {
            return;
        }

        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;

        // Calculate visible area to optimize rendering
        const visibleArea = this.getVisibleAreaOptimized(map);

        // Render terrain hexes with culling
        for (let y = visibleArea.minY; y <= visibleArea.maxY; y++) {
            for (let x = visibleArea.minX; x <= visibleArea.maxX; x++) {
                const hex = map.getHex(x, y);
                if (hex) {
                    if (this.performanceSettings.enableViewportCulling && !this.isHexInViewport(x, y, hexSize, spacing)) {
                        this.renderStats.culledHexes++;
                        continue;
                    }

                    this.renderHex(hex, hexSize, spacing, map);
                    this.renderStats.hexesRendered++;
                }
            }
        }

        // Render grid lines only if zoomed in enough
        if (this.camera.zoom > 0.5) {
            this.renderGrid(map, visibleArea, hexSize, spacing);
        }
    }

    /**
     * Calculate visible area with performance optimizations
     * @param {Map} map - Game map
     * @returns {Object} - Visible area bounds
     */
    getVisibleAreaOptimized(map) {
        const hexSize = this.config.hexSize;
        const margin = Math.ceil(this.performanceSettings.cullMargin / hexSize);

        // Calculate world coordinates of canvas corners with culling margin
        const halfWidth = (this.canvas.width / (2 * this.camera.zoom)) + this.performanceSettings.cullMargin;
        const halfHeight = (this.canvas.height / (2 * this.camera.zoom)) + this.performanceSettings.cullMargin;

        const worldLeft = this.camera.x - halfWidth;
        const worldRight = this.camera.x + halfWidth;
        const worldTop = this.camera.y - halfHeight;
        const worldBottom = this.camera.y + halfHeight;

        // Convert to hex coordinates
        const minX = Math.max(0, Math.floor(worldLeft / hexSize) - margin);
        const maxX = Math.min(map.width - 1, Math.ceil(worldRight / hexSize) + margin);
        const minY = Math.max(0, Math.floor(worldTop / hexSize) - margin);
        const maxY = Math.min(map.height - 1, Math.ceil(worldBottom / hexSize) + margin);

        return { minX, maxX, minY, maxY };
    }

    /**
     * Check if hex is in viewport (fast check)
     * @param {number} hexX - Hex X coordinate
     * @param {number} hexY - Hex Y coordinate
     * @param {number} hexSize - Size of hex
     * @param {number} spacing - Spacing between hexes
     * @returns {boolean} - True if in viewport
     */
    isHexInViewport(hexX, hexY, hexSize, spacing) {
        const worldX = hexX * (hexSize + spacing);
        const worldY = hexY * (hexSize + spacing);

        const screenPos = this.camera.worldToScreen(worldX, worldY);
        const margin = this.performanceSettings.cullMargin;

        return screenPos.x > -margin &&
            screenPos.x < this.canvas.width + margin &&
            screenPos.y > -margin &&
            screenPos.y < this.canvas.height + margin;
    }

    /**
     * Render all cities (optimized version)
     * @param {Object} gameState - Game state
     */
    renderCitiesOptimized(gameState) {
        const cities = gameState.getCities();
        if (!cities) {
            return;
        }

        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;

        for (const city of cities.values()) {
            if (this.performanceSettings.enableViewportCulling && !this.isHexInViewport(city.x, city.y, hexSize, spacing)) {
                this.renderStats.culledCities++;
                continue;
            }

            this.renderCityOptimized(city, hexSize, spacing, gameState);
            this.renderStats.citiesRendered++;
        }
    }

    /**
     * Render a single city (optimized version)
     * @param {City} city - City to render
     * @param {number} hexSize - Size of hex
     * @param {number} spacing - Spacing between hexes
     * @param {Object} gameState - Game state for player info
     */
    renderCityOptimized(city, hexSize, spacing, gameState) {
        const x = city.x * (hexSize + spacing);
        const y = city.y * (hexSize + spacing);
        const centerX = x + hexSize / 2;
        const centerY = y + hexSize / 2;

        // Get city sprite based on size
        let spriteKey = 'city_small';
        if (city.size >= 3) {
            spriteKey = 'city_large';
        } else if (city.size >= 2) {
            spriteKey = 'city_medium';
        }

        // Try to use cached sprite first
        const cachedSprite = this.getCachedSprite(spriteKey, hexSize);
        if (cachedSprite) {
            this.ctx.drawImage(cachedSprite, centerX - hexSize / 2, centerY - hexSize / 2);
        } else {
            // Fallback to original rendering
            this.renderCity(city, hexSize, spacing);
        }

        // Draw owner color border
        if (city.owner !== null) {
            const player = gameState.getPlayer(city.owner);
            if (player) {
                this.ctx.strokeStyle = player.color;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, hexSize / 3, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        }
    }

    /**
     * Render all units (optimized version)
     * @param {Object} gameState - Game state
     */
    renderUnitsOptimized(gameState) {
        const units = gameState.getUnits();
        if (!units) {
            return;
        }

        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;

        for (const unit of units.values()) {
            // Get render position (may be different due to animations)
            const animationData = this.getUnitAnimationData(unit);
            const renderX = animationData ? animationData.currentX : unit.x;
            const renderY = animationData ? animationData.currentY : unit.y;

            if (this.performanceSettings.enableViewportCulling && !this.isHexInViewport(renderX, renderY, hexSize, spacing)) {
                this.renderStats.culledUnits++;
                continue;
            }

            this.renderUnit(unit, hexSize, spacing, gameState);
            this.renderStats.unitsRendered++;
        }
    }

    /**
     * Calculate visible area based on camera position and zoom
     * @param {Map} map - Game map
     * @returns {Object} - Visible area bounds
     */
    getVisibleArea(map) {
        const hexSize = this.config.hexSize;
        const margin = 2; // Extra hexes to render outside visible area

        // Calculate world coordinates of canvas corners
        const halfWidth = this.canvas.width / (2 * this.camera.zoom);
        const halfHeight = this.canvas.height / (2 * this.camera.zoom);

        const worldLeft = this.camera.x - halfWidth;
        const worldRight = this.camera.x + halfWidth;
        const worldTop = this.camera.y - halfHeight;
        const worldBottom = this.camera.y + halfHeight;

        // Convert to hex coordinates
        const minX = Math.max(0, Math.floor(worldLeft / hexSize) - margin);
        const maxX = Math.min(map.width - 1, Math.ceil(worldRight / hexSize) + margin);
        const minY = Math.max(0, Math.floor(worldTop / hexSize) - margin);
        const maxY = Math.min(map.height - 1, Math.ceil(worldBottom / hexSize) + margin);

        return { minX, maxX, minY, maxY };
    }

    /**
     * Render a single hex
     * @param {Hex} hex - Hex to render
     * @param {number} hexSize - Size of hex
     * @param {number} spacing - Spacing between hexes
     * @param {Map} map - Game map (optional, for neighbor checks)
     */
    renderHex(hex, hexSize, spacing, map = null) {
        const x = hex.x * (hexSize + spacing);
        const y = hex.y * (hexSize + spacing);

        // Draw hex background
        const terrainType = hex.terrain.toLowerCase();

        // Use variant texture based on position
        const texture = this.textureManager.getTextureVariant(terrainType, hex.x, hex.y);

        if (texture) {
            // Oversized rendering for smooth transitions
            const scale = 1.25; // 25% larger to overlap neighbors
            const drawSize = hexSize * scale;
            const offset = (drawSize - hexSize) / 2;

            // Randomize rotation for organic look (90 degree increments)
            // Use seeded random based on coords
            const seed = (hex.x * 12345) + (hex.y * 67890);

            // Only rotate 'organic' textures like plains or forest floor
            // Don't rotate mountains causing shadows to break logic
            const shouldRotate = terrainType.includes('plains') || terrainType.includes('grass');

            if (shouldRotate && (seed % 3 === 0)) {
                this.ctx.save();
                this.ctx.translate(x + hexSize / 2, y + hexSize / 2);
                this.ctx.rotate(Math.PI / 2 * (seed % 4));
                this.ctx.drawImage(texture, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                this.ctx.restore();
            } else {
                this.ctx.drawImage(texture, x - offset, y - offset, drawSize, drawSize);
            }

            // Draw border check debug - remove later
            // this.ctx.strokeStyle = 'red';
            // this.ctx.strokeRect(x, y, hexSize, hexSize);

        } else {
            // Fallback to color
            const terrainColor = hex.getTerrainColor();
            this.ctx.fillStyle = terrainColor;
            this.ctx.fillRect(x, y, hexSize, hexSize);
        }

        // Add terrain texture/pattern (simple for now)
        this.renderTerrainDetails(hex, x, y, hexSize, map);
    }

    /**
     * Render terrain-specific details
     * @param {Hex} hex - Hex to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Hex size
     * @param {Map} map - Map object for neighbor checks
     */
    renderTerrainDetails(hex, x, y, size, map = null) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;

        // Removed emoji rendering for textured terrains
        // Only render road overlays

        const terrainType = hex.terrain;

        // Render River
        if (hex.hasRiver) {
            const riverWidth = size / 4;
            const riverColor = '#4169E1'; // Royal Blue

            // Draw center node (unless it is a straight river, but simple node is fine for now)
            this.ctx.fillStyle = riverColor;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, riverWidth / 2, 0, Math.PI * 2);
            this.ctx.fill();

            if (map) {
                const neighbors = [
                    { dx: -1, dy: 0 },
                    { dx: 1, dy: 0 },
                    { dx: 0, dy: -1 },
                    { dx: 0, dy: 1 }
                ];

                neighbors.forEach(dir => {
                    const nx = hex.x + dir.dx;
                    const ny = hex.y + dir.dy;
                    const neighbor = map.getHex(nx, ny);

                    // Connect to other River hexes OR Water hexes
                    if (neighbor && (neighbor.hasRiver || neighbor.terrain === 'WATER')) {
                        const endX = centerX + dir.dx * size;
                        const endY = centerY + dir.dy * size;

                        this.ctx.strokeStyle = riverColor;
                        this.ctx.lineWidth = riverWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX, centerY);
                        this.ctx.lineTo(endX, endY);
                        this.ctx.stroke();

                        // Add river shimmer effect?
                        // Simple animated white line on top
                        const time = Date.now() / 1000;
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                        this.ctx.lineWidth = riverWidth / 3;
                        this.ctx.setLineDash([size / 4, size / 4]);
                        this.ctx.lineDashOffset = -time * 10;
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX, centerY);
                        this.ctx.lineTo(endX, endY);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]); // Reset
                    }
                });
            }
        }

        if (terrainType === 'ROAD') {
            const centerX = x + size / 2;
            const centerY = y + size / 2;

            // Road properties
            const roadWidth = size / 6;
            const borderRatio = 1.2;

            // Draw center node
            this.ctx.fillStyle = '#8B4513';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, roadWidth / 2, 0, Math.PI * 2);
            this.ctx.fill();

            if (map) {
                // Check neighbors: Left, Right, Up, Down
                const neighbors = [
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 },  // Right
                    { dx: 0, dy: -1 }, // Up
                    { dx: 0, dy: 1 }   // Down
                ];

                let hasConnection = false;

                neighbors.forEach(dir => {
                    const nx = hex.x + dir.dx;
                    const ny = hex.y + dir.dy;
                    const neighbor = map.getHex(nx, ny);

                    if (neighbor && neighbor.terrain === 'ROAD') {
                        hasConnection = true;

                        // Calculate end point (edge of hex slot)
                        // For square grid, this is just center to edge
                        const targetX = centerX + dir.dx * (size / 2 + size / 10); // Extend slightly to overlap next tile
                        const targetY = centerY + dir.dy * (size / 2 + size / 10);

                        // Draw Border first (wider)
                        this.ctx.strokeStyle = '#5c2d0c';
                        this.ctx.lineWidth = roadWidth * borderRatio;
                        this.ctx.lineCap = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX, centerY);
                        this.ctx.lineTo(targetX, targetY);
                        this.ctx.stroke();

                        // Draw Road (inner)
                        this.ctx.strokeStyle = '#8B4513';
                        this.ctx.lineWidth = roadWidth;
                        this.ctx.lineCap = 'round';
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX, centerY);
                        this.ctx.lineTo(targetX, targetY);
                        this.ctx.stroke();
                    }
                });

                // If no connections (isolated road), draw a small spot or default to horizontal?
                // For now, if no connections, let's just leave it as a spot (hub)
            }
        } else if (terrainType === 'WATER') {
            // Animated water shimmer
            const time = performance.now() / 2000;
            // Use x/y to offset phase so not all tiles shimmer identically
            const phase = (x / size) * 0.5 + (y / size) * 0.5;

            // Subtle white overlay with sine wave opacity
            const alpha = 0.05 + Math.sin(time + phase) * 0.03;

            if (alpha > 0) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
                this.ctx.fillRect(x, y, size, size);
            }
        }
    }

    /**
     * Render grid lines
     * @param {Map} map - Game map
     * @param {Object} visibleArea - Visible area bounds
     * @param {number} hexSize - Size of hex
     * @param {number} spacing - Spacing between hexes
     */
    renderGrid(map, visibleArea, hexSize, spacing) {
        this.ctx.strokeStyle = this.config.gridColor;
        this.ctx.lineWidth = this.config.gridWidth;
        this.ctx.beginPath();

        // Vertical lines
        for (let x = visibleArea.minX; x <= visibleArea.maxX + 1; x++) {
            const worldX = x * (hexSize + spacing);
            this.ctx.moveTo(worldX, visibleArea.minY * (hexSize + spacing));
            this.ctx.lineTo(worldX, (visibleArea.maxY + 1) * (hexSize + spacing));
        }

        // Horizontal lines
        for (let y = visibleArea.minY; y <= visibleArea.maxY + 1; y++) {
            const worldY = y * (hexSize + spacing);
            this.ctx.moveTo(visibleArea.minX * (hexSize + spacing), worldY);
            this.ctx.lineTo((visibleArea.maxX + 1) * (hexSize + spacing), worldY);
        }

        this.ctx.stroke();
    }

    /**
     * Render all cities
     * @param {Object} gameState - Game state
     */
    renderCities(gameState) {
        const cities = gameState.getCities();
        if (!cities) {
            return;
        }

        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;

        for (const city of cities.values()) {
            this.renderCity(city, hexSize, spacing);
        }
    }

    /**
     * Render a single city
     * @param {City} city - City to render
     * @param {number} hexSize - Size of hex
     * @param {number} spacing - Spacing between hexes
     */
    renderCity(city, hexSize, spacing) {
        const x = city.x * (hexSize + spacing);
        const y = city.y * (hexSize + spacing);
        const centerX = x + hexSize / 2;
        const centerY = y + hexSize / 2;

        // Determine Faction and Color
        let faction = 'neutral';
        let ownerColor = null;

        // CAUTION: gameState is global in main.js scope currently, but here we might need to access it properly
        // Ideally we pass gameState to renderCity or renderMap uses it
        // Depending on existing architecture, gameState might be available globally or via GameManager

        // HACK: Accessing global gameState if available, or try to get it
        const gs = window.gameManager ? window.gameManager.gameState : null;

        if (city.owner !== null && city.owner !== -1) { // -1 is Neutral
            if (gs) {
                const player = gs.getPlayer(city.owner);
                if (player) {
                    ownerColor = player.color;
                    faction = player.faction || 'human'; // Default to human if not set
                }
            }
        } else {
            // Neutral graphics
            faction = 'neutral';
            // ownerColor = '#555'; // Grey flag for neutral?
        }

        this.cityRenderer.drawCity(this.ctx, centerX, centerY, hexSize, faction, ownerColor, city.size);
    }

    /**
     * Render all units
     * @param {Object} gameState - Game state
     */
    renderUnits(gameState) {
        const units = gameState.getUnits();
        if (!units) {
            return;
        }

        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;

        for (const unit of units.values()) {
            this.renderUnit(unit, hexSize, spacing, gameState);
        }
    }

    /**
     * Render a single unit
     * @param {Unit} unit - Unit to render
     * @param {number} hexSize - Size of hex
     * @param {number} spacing - Spacing between hexes
     * @param {Object} gameState - Game state for player info
     */
    renderUnit(unit, hexSize, spacing, gameState) {
        // Check if unit has active animation
        const animationData = this.getUnitAnimationData(unit);
        let renderX = unit.x;
        let renderY = unit.y;
        let opacity = 1.0;
        let scale = 1.0;

        if (animationData) {
            switch (animationData.type) {
                case 'unitMovement':
                    renderX = animationData.currentX;
                    renderY = animationData.currentY;
                    break;
                case 'unitDeath':
                    opacity = animationData.opacity;
                    scale = animationData.scale;
                    break;
            }
        }

        // Check for shake effects
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;
        const shakeEffect = this.getShakeEffect(unit.x, unit.y);
        if (shakeEffect) {
            const elapsed = performance.now() - shakeEffect.startTime;
            const progress = elapsed / shakeEffect.duration;
            if (progress < 1) {
                const intensity = shakeEffect.intensity * (1 - progress);
                shakeOffsetX = (Math.random() - 0.5) * intensity * 2;
                shakeOffsetY = (Math.random() - 0.5) * intensity * 2;
            }
        }

        const x = renderX * (hexSize + spacing) + shakeOffsetX;
        const y = renderY * (hexSize + spacing) + shakeOffsetY;
        const centerX = x + hexSize / 2;
        const centerY = y + hexSize / 2;

        // Get unit sprite
        const spriteKey = `unit_${unit.type.toLowerCase()}`;
        const sprite = this.sprites.get(spriteKey);

        if (sprite) {
            this.ctx.save();
            this.ctx.globalAlpha = opacity;

            // Apply scale transformation
            if (scale !== 1.0) {
                this.ctx.translate(centerX, centerY);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-centerX, -centerY);
            }

            // Draw unit background with pulsing effect for selected units
            let unitRadius = hexSize / 4;
            if (this.selectedHex && this.selectedHex.x === Math.floor(renderX) && this.selectedHex.y === Math.floor(renderY)) {
                const pulseTime = performance.now() / 1000;
                const pulse = 1 + Math.sin(pulseTime * this.animationSettings.pulseSpeed) * 0.1;
                unitRadius *= pulse;
            }

            this.ctx.fillStyle = sprite.color;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, unitRadius, 0, 2 * Math.PI);
            this.ctx.fill();

            // Draw unit symbol
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `bold ${Math.floor(hexSize / 5)}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(sprite.symbol, centerX, centerY);

            // Draw owner color border
            const player = gameState.getPlayer(unit.owner);
            if (player) {
                this.ctx.strokeStyle = player.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, unitRadius, 0, 2 * Math.PI);
                this.ctx.stroke();
            }

            this.ctx.restore();

            // Draw health bar for damaged units
            if (unit.health < unit.getMaxHealth()) {
                this.renderHealthBar(unit, x, y, hexSize, opacity);
            }

            // Draw movement indicator if unit has moved
            if (unit.hasActed) {
                this.renderMovementIndicator(x, y, hexSize, opacity);
            }
        }
    }

    /**
     * Render unit health bar
     * @param {Unit} unit - Unit to render health for
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} hexSize - Size of hex
     * @param {number} opacity - Opacity for animation
     */
    renderHealthBar(unit, x, y, hexSize, opacity = 1.0) {
        const barWidth = hexSize * 0.8;
        const barHeight = 4;
        const barX = x + (hexSize - barWidth) / 2;
        const barY = y + hexSize - barHeight - 2;

        const healthPercent = unit.health / unit.getMaxHealth();

        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // Background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health bar
        const healthColor = healthPercent > 0.6 ? '#00FF00' :
            healthPercent > 0.3 ? '#FFFF00' : '#FF0000';
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Border
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        this.ctx.restore();
    }

    /**
     * Render movement indicator for units that have acted
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} hexSize - Size of hex
     * @param {number} opacity - Opacity for animation
     */
    renderMovementIndicator(x, y, hexSize, opacity = 1.0) {
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // Small gray dot in corner
        this.ctx.fillStyle = '#888888';
        this.ctx.beginPath();
        this.ctx.arc(x + hexSize - 6, y + 6, 3, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Render selection highlights and movement ranges
     */
    renderSelectionAndHighlights() {
        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;
        const time = performance.now() / 1000;

        // Render highlighted hexes (movement range, etc.) with pulsing effect
        for (const hex of this.highlightedHexes) {
            const x = hex.x * (hexSize + spacing);
            const y = hex.y * (hexSize + spacing);

            // Pulsing highlight effect
            const pulse = 0.7 + Math.sin(time * this.animationSettings.pulseSpeed * 1.5) * 0.3;
            this.ctx.globalAlpha = pulse;

            this.ctx.strokeStyle = this.config.highlightColor;
            this.ctx.lineWidth = this.config.highlightWidth;
            this.ctx.strokeRect(x, y, hexSize, hexSize);

            // Add subtle fill
            this.ctx.fillStyle = this.config.highlightColor;
            this.ctx.globalAlpha = pulse * 0.2;
            this.ctx.fillRect(x, y, hexSize, hexSize);

            this.ctx.globalAlpha = 1.0;
        }

        // Render selected hex with animated border
        if (this.selectedHex) {
            const x = this.selectedHex.x * (hexSize + spacing);
            const y = this.selectedHex.y * (hexSize + spacing);

            // Animated selection border
            const pulse = 0.8 + Math.sin(time * this.animationSettings.pulseSpeed) * 0.2;
            const lineWidth = this.config.selectedWidth * pulse;

            this.ctx.strokeStyle = this.config.selectedColor;
            this.ctx.lineWidth = lineWidth;
            this.ctx.strokeRect(x, y, hexSize, hexSize);

            // Add corner decorations
            this.renderSelectionCorners(x, y, hexSize, pulse);
        }

        // Render hovered hex with subtle animation
        if (this.hoveredHex) {
            const x = this.hoveredHex.x * (hexSize + spacing);
            const y = this.hoveredHex.y * (hexSize + spacing);

            // Subtle hover effect
            const hoverPulse = 0.6 + Math.sin(time * this.animationSettings.pulseSpeed * 2) * 0.4;

            this.ctx.globalAlpha = hoverPulse;
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(x, y, hexSize, hexSize);
            this.ctx.setLineDash([]); // Reset line dash
            this.ctx.globalAlpha = 1.0;
        }
    }

    /**
     * Render selection corner decorations
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Hex size
     * @param {number} pulse - Pulse factor
     */
    renderSelectionCorners(x, y, size, pulse) {
        const cornerSize = 8 * pulse;
        const offset = 2;

        this.ctx.strokeStyle = this.config.selectedColor;
        this.ctx.lineWidth = 2;

        // Top-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(x - offset, y - offset + cornerSize);
        this.ctx.lineTo(x - offset, y - offset);
        this.ctx.lineTo(x - offset + cornerSize, y - offset);
        this.ctx.stroke();

        // Top-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(x + size + offset - cornerSize, y - offset);
        this.ctx.lineTo(x + size + offset, y - offset);
        this.ctx.lineTo(x + size + offset, y - offset + cornerSize);
        this.ctx.stroke();

        // Bottom-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(x - offset, y + size + offset - cornerSize);
        this.ctx.lineTo(x - offset, y + size + offset);
        this.ctx.lineTo(x - offset + cornerSize, y + size + offset);
        this.ctx.stroke();

        // Bottom-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(x + size + offset - cornerSize, y + size + offset);
        this.ctx.lineTo(x + size + offset, y + size + offset);
        this.ctx.lineTo(x + size + offset, y + size + offset - cornerSize);
        this.ctx.stroke();
    }

    /**
     * Render UI elements that don't use camera transform
     * @param {Object} gameState - Game state
     */
    renderUI(gameState) {
        // Render minimap (placeholder)
        this.renderMinimap(gameState);

        // Render debug info if needed
        if (this.showDebugInfo) {
            this.renderDebugInfo(gameState);
        }
    }

    /**
     * Render minimap (placeholder implementation)
     * @param {Object} gameState - Game state
     */
    renderMinimap(gameState) {
        // Placeholder for minimap - could be implemented later
        // For now, just show camera position indicator
        const minimapSize = 100;
        const minimapX = this.canvas.width - minimapSize - 10;
        const minimapY = 10;

        // Minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

        // Minimap border
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

        // Camera position indicator
        const map = gameState.getMap();
        if (map) {
            const mapWidth = map.width * (this.config.hexSize + this.config.hexSpacing);
            const mapHeight = map.height * (this.config.hexSize + this.config.hexSpacing);

            const cameraX = minimapX + (this.camera.x / mapWidth) * minimapSize;
            const cameraY = minimapY + (this.camera.y / mapHeight) * minimapSize;

            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(cameraX, cameraY, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    /**
     * Render debug information
     * @param {Object} gameState - Game state
     */
    renderDebugInfo(gameState) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        const cameraInfo = this.camera.getDebugInfo();
        const perfStats = this.getPerformanceStats();

        const debugInfo = [
            `FPS: ${perfStats.fps}`,
            `Render Time: ${perfStats.renderTime}ms`,
            `Camera: ${cameraInfo.position}`,
            `Target: ${cameraInfo.target}`,
            `Zoom: ${cameraInfo.zoom} (${cameraInfo.targetZoom})`,
            `Canvas: ${cameraInfo.canvasSize}`,
            `Selected: ${this.selectedHex ? `(${this.selectedHex.x}, ${this.selectedHex.y})` : 'None'}`,
            `Hovered: ${this.hoveredHex ? `(${this.hoveredHex.x}, ${this.hoveredHex.y})` : 'None'}`,
            `Hexes: ${perfStats.hexesRendered} (${perfStats.culledHexes} culled)`,
            `Units: ${perfStats.unitsRendered} (${perfStats.culledUnits} culled)`,
            `Cities: ${perfStats.citiesRendered} (${perfStats.culledCities} culled)`,
            `Animations: ${perfStats.activeAnimations}`,
            `Effects: ${perfStats.activeEffects}`,
            `Particles: ${perfStats.activeParticles}`,
            `Cached Sprites: ${perfStats.cachedSprites}`
        ];

        // Background for debug info
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(5, 5, 250, debugInfo.length * 15 + 10);

        // Debug text
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < debugInfo.length; i++) {
            this.ctx.fillText(debugInfo[i], 10, 10 + i * 15);
        }
    }

    // Selection and highlighting methods

    /**
     * Set the selected hex
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setSelectedHex(x, y) {
        this.selectedHex = { x, y };
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedHex = null;
        this.highlightedHexes = [];
    }

    /**
     * Set highlighted hexes (for movement range, etc.)
     * @param {Array} hexes - Array of hex coordinates to highlight
     */
    setHighlightedHexes(hexes) {
        this.highlightedHexes = hexes || [];
    }

    /**
     * Set hovered hex
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setHoveredHex(x, y) {
        this.hoveredHex = { x, y };
    }

    /**
     * Clear hovered hex
     */
    clearHoveredHex() {
        this.hoveredHex = null;
    }

    // Utility methods

    /**
     * Get canvas dimensions
     * @returns {Object} - Canvas width and height
     */
    getCanvasDimensions() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Resize canvas
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        console.log(`Canvas resized to ${width}x${height}`);
    }

    /**
     * Toggle debug info display
     */
    toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }

    // Camera control methods

    /**
     * Move camera to position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    setCameraPosition(x, y) {
        this.camera.setPosition(x, y);
    }

    /**
     * Move camera smoothly to position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    moveCameraTo(x, y) {
        this.camera.moveTo(x, y);
    }

    /**
     * Move camera by offset
     * @param {number} dx - X offset
     * @param {number} dy - Y offset
     */
    moveCameraBy(dx, dy) {
        this.camera.moveBy(dx, dy);
    }

    /**
     * Set camera zoom level
     * @param {number} zoom - Zoom level
     */
    setCameraZoom(zoom) {
        this.camera.setZoom(zoom);
    }

    /**
     * Zoom camera smoothly to level
     * @param {number} zoom - Target zoom level
     */
    zoomCameraTo(zoom) {
        this.camera.zoomTo(zoom);
    }

    /**
     * Zoom in
     * @param {number} factor - Zoom factor
     */
    zoomIn(factor = 1.2) {
        this.camera.zoomIn(factor);
    }

    /**
     * Zoom out
     * @param {number} factor - Zoom factor
     */
    zoomOut(factor = 1.2) {
        this.camera.zoomOut(factor);
    }

    /**
     * Center camera on hex
     * @param {number} hexX - Hex X coordinate
     * @param {number} hexY - Hex Y coordinate
     */
    centerOnHex(hexX, hexY) {
        const worldX = hexX * (this.config.hexSize + this.config.hexSpacing) + this.config.hexSize / 2;
        const worldY = hexY * (this.config.hexSize + this.config.hexSpacing) + this.config.hexSize / 2;
        this.camera.centerOn(worldX, worldY);
    }

    /**
     * Zoom to fit entire map
     * @param {Map} map - Game map
     */
    zoomToFitMap(map) {
        if (!map) return;

        const mapWidth = map.width * (this.config.hexSize + this.config.hexSpacing);
        const mapHeight = map.height * (this.config.hexSize + this.config.hexSpacing);

        this.camera.zoomToFit(mapWidth, mapHeight);
    }

    // Coordinate conversion methods

    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} - World coordinates {x, y}
     */
    screenToWorld(screenX, screenY) {
        return this.camera.screenToWorld(screenX, screenY);
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} - Screen coordinates {x, y}
     */
    worldToScreen(worldX, worldY) {
        return this.camera.worldToScreen(worldX, worldY);
    }

    /**
     * Convert screen coordinates to hex coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} - Hex coordinates {x, y}
     */
    screenToHex(screenX, screenY) {
        return this.camera.screenToHex(screenX, screenY, this.config.hexSize, this.config.hexSpacing);
    }

    /**
     * Convert hex coordinates to screen coordinates
     * @param {number} hexX - Hex X coordinate
     * @param {number} hexY - Hex Y coordinate
     * @returns {Object} - Screen coordinates {x, y}
     */
    hexToScreen(hexX, hexY) {
        return this.camera.hexToScreen(hexX, hexY, this.config.hexSize, this.config.hexSpacing);
    }

    /**
     * Check if hex is visible on screen
     * @param {number} hexX - Hex X coordinate
     * @param {number} hexY - Hex Y coordinate
     * @returns {boolean} - True if visible
     */
    isHexVisible(hexX, hexY) {
        return this.camera.isHexVisible(hexX, hexY, this.config.hexSize, this.config.hexSpacing);
    }

    /**
     * Handle canvas resize
     * @param {number} width - New width
     * @param {number} height - New height
     */
    handleCanvasResize(width, height) {
        this.resizeCanvas(width, height);
        this.camera.updateCanvasDimensions(width, height);
    }

    /**
     * Get camera state for debugging
     * @returns {Object} - Camera debug info
     */
    getCameraDebugInfo() {
        return this.camera.getDebugInfo();
    }

    /**
     * Reset camera to default state
     */
    resetCamera() {
        this.camera.reset();
    }

    // Animation System

    /**
     * Create a new animation
     * @param {Object} config - Animation configuration
     * @returns {number} - Animation ID
     */
    createAnimation(config) {
        const id = this.animationId++;
        const animation = {
            id,
            type: config.type,
            startTime: performance.now(),
            duration: config.duration || 1000,
            easing: config.easing || 'easeInOut',
            onUpdate: config.onUpdate,
            onComplete: config.onComplete,
            data: config.data || {},
            completed: false
        };

        this.animations.set(id, animation);
        return id;
    }

    /**
     * Remove an animation
     * @param {number} id - Animation ID
     */
    removeAnimation(id) {
        this.animations.delete(id);
    }

    /**
     * Update all animations
     * @param {number} deltaTime - Time since last frame
     */
    updateAnimations(deltaTime) {
        const currentTime = performance.now();
        const completedAnimations = [];

        for (const [id, animation] of this.animations) {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            const easedProgress = this.applyEasing(progress, animation.easing);

            if (animation.onUpdate) {
                animation.onUpdate(easedProgress, animation.data);
            }

            if (progress >= 1 && !animation.completed) {
                animation.completed = true;
                if (animation.onComplete) {
                    animation.onComplete(animation.data);
                }
                completedAnimations.push(id);
            }
        }

        // Remove completed animations
        completedAnimations.forEach(id => this.removeAnimation(id));
    }

    /**
     * Apply easing function to progress
     * @param {number} t - Progress (0-1)
     * @param {string} easing - Easing type
     * @returns {number} - Eased progress
     */
    applyEasing(t, easing) {
        switch (easing) {
            case 'linear':
                return t;
            case 'easeIn':
                return t * t;
            case 'easeOut':
                return 1 - (1 - t) * (1 - t);
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
            case 'bounce':
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            default:
                return t;
        }
    }

    /**
     * Animate unit movement
     * @param {Unit} unit - Unit to animate
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Target X coordinate
     * @param {number} toY - Target Y coordinate
     * @param {Function} onComplete - Callback when animation completes
     */
    animateUnitMovement(unit, fromX, fromY, toX, toY, onComplete) {
        const animationData = {
            unit,
            fromX,
            fromY,
            toX,
            toY,
            currentX: fromX,
            currentY: fromY
        };

        return this.createAnimation({
            type: 'unitMovement',
            duration: this.animationSettings.unitMovementDuration,
            easing: 'easeInOut',
            data: animationData,
            onUpdate: (progress, data) => {
                data.currentX = data.fromX + (data.toX - data.fromX) * progress;
                data.currentY = data.fromY + (data.toY - data.fromY) * progress;
            },
            onComplete: (data) => {
                data.unit.x = data.toX;
                data.unit.y = data.toY;
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Animate combat between units
     * @param {Unit} attacker - Attacking unit
     * @param {Unit} defender - Defending unit
     * @param {Object} result - Combat result
     * @param {Function} onComplete - Callback when animation completes
     */
    animateCombat(attacker, defender, result, onComplete) {
        // Create combat shake effect
        this.createCombatShake(attacker.x, attacker.y);
        this.createCombatShake(defender.x, defender.y);

        // Create damage numbers
        if (result.damage > 0) {
            this.createDamageNumber(defender.x, defender.y, result.damage);
        }

        // Create combat flash effect
        this.createCombatFlash(defender.x, defender.y);

        // If unit dies, create death animation
        if (result.loser) {
            this.animateUnitDeath(result.loser, onComplete);
        } else if (onComplete) {
            setTimeout(onComplete, this.animationSettings.combatAnimationDuration);
        }
    }

    /**
     * Animate unit death
     * @param {Unit} unit - Unit that died
     * @param {Function} onComplete - Callback when animation completes
     */
    animateUnitDeath(unit, onComplete) {
        const animationData = {
            unit,
            opacity: 1.0,
            scale: 1.0
        };

        return this.createAnimation({
            type: 'unitDeath',
            duration: this.animationSettings.fadeOutDuration,
            easing: 'easeIn',
            data: animationData,
            onUpdate: (progress, data) => {
                data.opacity = 1.0 - progress;
                data.scale = 1.0 - progress * 0.5;
            },
            onComplete: (data) => {
                if (onComplete) onComplete();
            }
        });
    }

    /**
     * Create combat shake effect
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createCombatShake(x, y) {
        this.addEffect({
            type: 'shake',
            x,
            y,
            intensity: this.animationSettings.shakeIntensity,
            duration: 200,
            startTime: performance.now()
        });
    }

    /**
     * Create combat flash effect
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createCombatFlash(x, y) {
        this.addEffect({
            type: 'flash',
            x,
            y,
            color: '#FFFFFF',
            opacity: 0.8,
            duration: 150,
            startTime: performance.now()
        });
    }

    /**
     * Create damage number effect
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} damage - Damage amount
     */
    createDamageNumber(x, y, damage) {
        this.addEffect({
            type: 'damageNumber',
            x,
            y,
            damage,
            offsetY: 0,
            opacity: 1.0,
            duration: 1000,
            startTime: performance.now()
        });
    }

    /**
     * Add visual effect
     * @param {Object} effect - Effect configuration
     */
    addEffect(effect) {
        this.effects.push(effect);
    }

    /**
     * Update visual effects
     * @param {number} deltaTime - Time since last frame
     */
    updateEffects(deltaTime) {
        const currentTime = performance.now();

        this.effects = this.effects.filter(effect => {
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration;

            if (progress >= 1) {
                return false; // Remove completed effect
            }

            // Update effect based on type
            switch (effect.type) {
                case 'damageNumber':
                    effect.offsetY = -progress * 30; // Float upward
                    effect.opacity = 1.0 - progress;
                    break;
                case 'flash':
                    effect.opacity = 0.8 * (1.0 - progress);
                    break;
            }

            return true;
        });
    }

    /**
     * Render visual effects
     */
    renderEffects() {
        for (const effect of this.effects) {
            this.renderEffect(effect);
        }
    }

    /**
     * Render a single effect
     * @param {Object} effect - Effect to render
     */
    renderEffect(effect) {
        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;
        const x = effect.x * (hexSize + spacing) + hexSize / 2;
        const y = effect.y * (hexSize + spacing) + hexSize / 2;

        this.ctx.save();

        switch (effect.type) {
            case 'damageNumber':
                this.ctx.globalAlpha = effect.opacity;
                this.ctx.fillStyle = '#FF4444';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(`-${effect.damage}`, x, y + effect.offsetY);
                break;

            case 'flash':
                this.ctx.globalAlpha = effect.opacity;
                this.ctx.fillStyle = effect.color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, hexSize / 2, 0, 2 * Math.PI);
                this.ctx.fill();
                break;

            case 'shake':
                // Shake effect is applied to the entire rendering context
                // This is handled in the unit rendering
                break;
        }

        this.ctx.restore();
    }

    /**
     * Add particle effect
     * @param {Object} particle - Particle configuration
     */
    addParticle(particle) {
        this.particles.push({
            ...particle,
            startTime: performance.now(),
            id: this.animationId++
        });
    }

    /**
     * Update particles
     * @param {number} deltaTime - Time since last frame
     */
    updateParticles(deltaTime) {
        const currentTime = performance.now();

        this.particles = this.particles.filter(particle => {
            const elapsed = currentTime - particle.startTime;
            const progress = elapsed / particle.duration;

            if (progress >= 1) {
                return false; // Remove expired particle
            }

            // Update particle position and properties
            particle.x += particle.velocityX * deltaTime / 1000;
            particle.y += particle.velocityY * deltaTime / 1000;
            particle.velocityY += particle.gravity * deltaTime / 1000;
            particle.opacity = particle.startOpacity * (1 - progress);
            particle.size = particle.startSize * (1 - progress * 0.5);

            return true;
        });
    }

    /**
     * Render particles
     */
    renderParticles() {
        for (const particle of this.particles) {
            this.renderParticle(particle);
        }
    }

    /**
     * Render a single particle
     * @param {Object} particle - Particle to render
     */
    renderParticle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Create explosion particle effect
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - Particle color
     * @param {number} count - Number of particles
     */
    createExplosion(x, y, color = '#FF4444', count = 10) {
        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;
        const worldX = x * (hexSize + spacing) + hexSize / 2;
        const worldY = y * (hexSize + spacing) + hexSize / 2;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 50 + Math.random() * 50;

            this.addParticle({
                x: worldX,
                y: worldY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                gravity: 100,
                color,
                startOpacity: 1.0,
                opacity: 1.0,
                startSize: 3,
                size: 3,
                duration: 1000 + Math.random() * 500
            });
        }
    }

    /**
     * Get animation data for a unit
     * @param {Unit} unit - Unit to check
     * @returns {Object|null} - Animation data or null
     */
    getUnitAnimationData(unit) {
        for (const [id, animation] of this.animations) {
            if (animation.data.unit === unit) {
                return animation.data;
            }
        }
        return null;
    }

    /**
     * Get shake effect for coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} - Shake effect or null
     */
    getShakeEffect(x, y) {
        return this.effects.find(effect =>
            effect.type === 'shake' && effect.x === x && effect.y === y
        );
    }

    /**
     * Clear all animations and effects
     */
    clearAnimations() {
        this.animations.clear();
        this.effects = [];
        this.particles = [];
    }

    /**
     * Check if any animations are currently playing
     * @returns {boolean} - True if animations are active
     */
    hasActiveAnimations() {
        return this.animations.size > 0 || this.effects.length > 0 || this.particles.length > 0;
    }

    // Performance Optimization Methods

    /**
     * Update FPS counter
     * @param {number} currentTime - Current timestamp
     */
    updateFPS(currentTime) {
        this.frameCount++;

        if (currentTime - this.lastFPSTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSTime));
            this.frameCount = 0;
            this.lastFPSTime = currentTime;
        }
    }

    /**
     * Reset render statistics
     */
    resetRenderStats() {
        this.renderStats.hexesRendered = 0;
        this.renderStats.unitsRendered = 0;
        this.renderStats.citiesRendered = 0;
        this.renderStats.effectsRendered = 0;
        this.renderStats.particlesRendered = 0;
        this.renderStats.culledHexes = 0;
        this.renderStats.culledUnits = 0;
        this.renderStats.culledCities = 0;
    }

    /**
     * Check if redraw is needed (dirty rectangle optimization)
     * @param {Object} gameState - Current game state
     * @returns {boolean} - True if redraw is needed
     */
    needsRedraw(gameState) {
        if (!this.lastRenderState) {
            return true;
        }

        // Always redraw if animations are active
        if (this.hasActiveAnimations()) {
            return true;
        }

        // Always redraw if camera is moving
        if (this.camera.x !== this.camera.targetX ||
            this.camera.y !== this.camera.targetY ||
            this.camera.zoom !== this.camera.targetZoom) {
            return true;
        }

        // Check if game state has changed
        const currentState = this.captureRenderState(gameState);
        return !this.compareRenderStates(this.lastRenderState, currentState);
    }

    /**
     * Capture current render state for comparison
     * @param {Object} gameState - Game state
     * @returns {Object} - Render state snapshot
     */
    captureRenderState(gameState) {
        const state = {
            cameraX: this.camera.x,
            cameraY: this.camera.y,
            cameraZoom: this.camera.zoom,
            selectedHex: this.selectedHex ? { x: this.selectedHex.x, y: this.selectedHex.y } : null,
            hoveredHex: this.hoveredHex ? { x: this.hoveredHex.x, y: this.hoveredHex.y } : null,
            highlightedHexes: this.highlightedHexes.map(hex => ({ x: hex.x, y: hex.y })),
            units: [],
            cities: []
        };

        // Capture unit states
        try {
            const units = gameState.getUnits();
            if (units) {
                for (const unit of units.values()) {
                    state.units.push({
                        id: unit.id,
                        x: unit.x,
                        y: unit.y,
                        health: unit.health,
                        hasActed: unit.hasActed
                    });
                }
            }
        } catch (error) {
            // Ignore errors when capturing unit state
            console.warn('Error capturing unit state:', error);
        }

        // Capture city states
        try {
            const cities = gameState.getCities();
            if (cities) {
                for (const city of cities.values()) {
                    state.cities.push({
                        id: city.id,
                        x: city.x,
                        y: city.y,
                        owner: city.owner,
                        size: city.size
                    });
                }
            }
        } catch (error) {
            // Ignore errors when capturing city state
            console.warn('Error capturing city state:', error);
        }

        return state;
    }

    /**
     * Compare two render states
     * @param {Object} state1 - First state
     * @param {Object} state2 - Second state
     * @returns {boolean} - True if states are equal
     */
    compareRenderStates(state1, state2) {
        // Quick reference check
        if (state1 === state2) return true;
        if (!state1 || !state2) return false;

        // Compare camera state
        if (state1.cameraX !== state2.cameraX ||
            state1.cameraY !== state2.cameraY ||
            state1.cameraZoom !== state2.cameraZoom) {
            return false;
        }

        // Compare selection state
        if (!this.compareObjects(state1.selectedHex, state2.selectedHex) ||
            !this.compareObjects(state1.hoveredHex, state2.hoveredHex)) {
            return false;
        }

        // Compare highlighted hexes
        if (state1.highlightedHexes.length !== state2.highlightedHexes.length) {
            return false;
        }

        for (let i = 0; i < state1.highlightedHexes.length; i++) {
            if (!this.compareObjects(state1.highlightedHexes[i], state2.highlightedHexes[i])) {
                return false;
            }
        }

        // Compare units
        if (state1.units.length !== state2.units.length) {
            return false;
        }

        for (let i = 0; i < state1.units.length; i++) {
            if (!this.compareObjects(state1.units[i], state2.units[i])) {
                return false;
            }
        }

        // Compare cities
        if (state1.cities.length !== state2.cities.length) {
            return false;
        }

        for (let i = 0; i < state1.cities.length; i++) {
            if (!this.compareObjects(state1.cities[i], state2.cities[i])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Compare two objects for equality
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {boolean} - True if objects are equal
     */
    compareObjects(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (!obj1 || !obj2) return false;

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (const key of keys1) {
            if (obj1[key] !== obj2[key]) return false;
        }

        return true;
    }

    /**
     * Limit particles to maximum count for performance
     */
    limitParticles() {
        if (this.particles.length > this.performanceSettings.maxParticles) {
            // Remove oldest particles
            this.particles.splice(0, this.particles.length - this.performanceSettings.maxParticles);
        }
    }

    /**
     * Update particles with performance optimization
     * @param {number} deltaTime - Time since last frame
     */
    updateParticles(deltaTime) {
        const currentTime = performance.now();

        this.particles = this.particles.filter(particle => {
            const elapsed = currentTime - particle.startTime;
            const progress = elapsed / particle.duration;

            if (progress >= 1) {
                return false; // Remove expired particle
            }

            // Update particle position and properties
            particle.x += particle.velocityX * deltaTime / 1000;
            particle.y += particle.velocityY * deltaTime / 1000;
            particle.velocityY += particle.gravity * deltaTime / 1000;
            particle.opacity = particle.startOpacity * (1 - progress);
            particle.size = particle.startSize * (1 - progress * 0.5);

            return true;
        });

        // Limit particle count for performance
        this.limitParticles();
    }

    /**
     * Get performance statistics
     * @returns {Object} - Performance stats
     */
    getPerformanceStats() {
        return {
            fps: this.fps,
            renderTime: this.renderStats.totalRenderTime.toFixed(2),
            hexesRendered: this.renderStats.hexesRendered,
            unitsRendered: this.renderStats.unitsRendered,
            citiesRendered: this.renderStats.citiesRendered,
            effectsRendered: this.renderStats.effectsRendered,
            particlesRendered: this.renderStats.particlesRendered,
            culledHexes: this.renderStats.culledHexes,
            culledUnits: this.renderStats.culledUnits,
            culledCities: this.renderStats.culledCities,
            activeAnimations: this.animations.size,
            activeEffects: this.effects.length,
            activeParticles: this.particles.length,
            cachedSprites: this.spriteCache.size
        };
    }

    /**
     * Toggle performance optimizations
     * @param {string} optimization - Optimization to toggle
     */
    toggleOptimization(optimization) {
        if (this.performanceSettings.hasOwnProperty(optimization)) {
            this.performanceSettings[optimization] = !this.performanceSettings[optimization];
            console.log(`${optimization}: ${this.performanceSettings[optimization]}`);

            // Clear sprite cache if sprite caching is disabled
            if (optimization === 'enableSpriteCache' && !this.performanceSettings.enableSpriteCache) {
                this.spriteCache.clear();
            }
        }
    }

    /**
     * Clear sprite cache to free memory
     */
    clearSpriteCache() {
        this.spriteCache.clear();
        console.log('Sprite cache cleared');
    }

    /**
     * Force redraw on next frame
     */
    forceRedraw() {
        this.lastRenderState = null;
    }
}