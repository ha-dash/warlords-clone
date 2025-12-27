/**
 * RenderEngine3D - Handles all 3D rendering operations using Three.js
 * Replaces Canvas 2D rendering with WebGL-based 3D rendering
 */

import * as THREE from 'three';
import { modelLoader } from './ModelLoader.js';
import { TERRAIN_CONFIG } from './Hex.js';
import { TextureManager } from './TextureManager.js';
import { Camera } from './Camera.js';

export class RenderEngine3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a252f);
        
        // Camera (orthographic for top-down view, but with 3D depth)
        const aspect = this.canvas.width / this.canvas.height;
        this.camera3D = new THREE.OrthographicCamera(
            -this.canvas.width / 2, this.canvas.width / 2,
            this.canvas.height / 2, -this.canvas.height / 2,
            0.1, 10000
        );
        this.camera3D.position.set(0, 1000, 0); // Top-down view
        this.camera3D.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        this.setupLighting();

        // Legacy 2D camera for compatibility (will be synchronized with 3D camera)
        this.camera = new Camera(this.canvas.width, this.canvas.height);

        // Texture management (can still use 2D textures for terrain)
        this.textureManager = new TextureManager();

        // Configuration
        this.config = {
            hexSize: 32,
            hexSpacing: 2,
            hexHeight: 1, // Height of hex in 3D space
            gridColor: '#444444',
            selectedColor: '#FFD700',
            highlightColor: '#00FF00'
        };

        // Scene objects organized by type
        this.hexMeshes = new Map(); // Map of hex positions to mesh objects
        this.unitObjects = new Map(); // Map of unit IDs to Three.js objects
        this.cityObjects = new Map(); // Map of city IDs to Three.js objects
        this.selectionObjects = []; // Selection and highlight objects

        // UI state
        this.selectedHex = null;
        this.highlightedHexes = [];
        this.hoveredHex = null;

        // Performance settings
        this.performanceSettings = {
            enableViewportCulling: true,
            enableShadows: true,
            maxVisibleHexes: 1000
        };

        // Rendering statistics
        this.renderStats = {
            hexesRendered: 0,
            unitsRendered: 0,
            citiesRendered: 0,
            totalRenderTime: 0
        };

        // Animation tracking
        this.lastFrameTime = performance.now();
        this.fps = 0;

        console.log('RenderEngine3D initialized with Three.js');
    }

    /**
     * Setup lighting for the 3D scene
     */
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun) from top-left
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(500, 1000, 500);
        directionalLight.castShadow = this.performanceSettings.enableShadows;
        
        if (this.performanceSettings.enableShadows) {
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 2000;
            directionalLight.shadow.camera.left = -2000;
            directionalLight.shadow.camera.right = 2000;
            directionalLight.shadow.camera.top = 2000;
            directionalLight.shadow.camera.bottom = -2000;
        }
        
        this.scene.add(directionalLight);
        this.directionalLight = directionalLight;

        // Additional fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-500, 500, -500);
        this.scene.add(fillLight);
    }

    /**
     * Update camera dimensions when canvas is resized
     */
    updateViewport(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.renderer.setSize(width, height);
        
        // Update orthographic camera
        const aspect = width / height;
        const viewSize = Math.max(width, height);
        this.camera3D.left = -viewSize / 2;
        this.camera3D.right = viewSize / 2;
        this.camera3D.top = viewSize / (2 * aspect);
        this.camera3D.bottom = -viewSize / (2 * aspect);
        this.camera3D.updateProjectionMatrix();

        this.camera.canvasWidth = width;
        this.camera.canvasHeight = height;
    }

    /**
     * Main render method - renders the complete game state
     * @param {Object} gameState - Current game state
     */
    render(gameState) {
        if (!gameState) {
            this.renderer.render(this.scene, this.camera3D);
            return;
        }

        const renderStartTime = performance.now();

        // Update FPS
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        this.updateFPS(currentTime);

        // Reset render stats
        this.resetRenderStats();

        // Update camera position based on legacy camera
        this.updateCameraPosition();

        // Update scene
        this.updateScene(gameState);

        // Render
        this.renderer.render(this.scene, this.camera3D);

        // Update render statistics
        this.renderStats.totalRenderTime = performance.now() - renderStartTime;
    }

    /**
     * Update camera position from legacy 2D camera
     */
    updateCameraPosition() {
        // Update legacy camera first
        if (this.camera && typeof this.camera.update === 'function') {
            this.camera.update();
        }

        // Sync 3D camera with legacy camera system
        // For orthographic top-down view, we adjust the camera position
        const zoom = (this.camera && this.camera.zoom) ? this.camera.zoom : 1.0;
        const viewSize = Math.max(this.canvas.width, this.canvas.height) / zoom;
        
        this.camera3D.left = -viewSize / 2;
        this.camera3D.right = viewSize / 2;
        this.camera3D.top = viewSize / (2 * (this.canvas.width / this.canvas.height));
        this.camera3D.bottom = -viewSize / (2 * (this.canvas.width / this.canvas.height));
        this.camera3D.updateProjectionMatrix();

        // Position camera to center on world position
        const camX = (this.camera && this.camera.x) ? this.camera.x : 0;
        const camY = (this.camera && this.camera.y) ? this.camera.y : 0;
        this.camera3D.position.x = camX;
        this.camera3D.position.z = camY; // Y in 2D becomes Z in 3D
        this.camera3D.lookAt(camX, 0, camY);
    }

    /**
     * Update the 3D scene based on game state
     */
    updateScene(gameState) {
        const map = gameState.getMap();
        if (map) {
            this.updateHexMeshes(map);
        }

        this.updateCityObjects(gameState);
        this.updateUnitObjects(gameState);
        this.updateSelectionAndHighlights();
    }

    /**
     * Create or update hex meshes for the map
     */
    updateHexMeshes(map) {
        const hexSize = this.config.hexSize;
        const hexHeight = this.config.hexHeight;

        // Create hex meshes for visible hexes
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const hex = map.getHex(x, y);
                if (!hex) continue;

                const key = `${x},${y}`;
                
                if (!this.hexMeshes.has(key)) {
                    // Create new hex mesh
                    const mesh = this.createHexMesh(hex, hexSize, hexHeight);
                    if (mesh) {
                        this.hexMeshes.set(key, mesh);
                        this.scene.add(mesh);
                        this.renderStats.hexesRendered++;
                    }
                } else {
                    // Update existing mesh if needed
                    this.renderStats.hexesRendered++;
                }
            }
        }
    }

    /**
     * Create a 3D mesh for a hex
     */
    createHexMesh(hex, hexSize, hexHeight) {
        const terrainType = hex.terrain.toLowerCase();
        
        // Create hexagon geometry (flat top hex)
        const shape = new THREE.Shape();
        const radius = hexSize / 2;
        
        // Hexagon vertices (flat-top orientation)
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; // Start at top
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        shape.closePath();

        // Extrude to create 3D hex
        const extrudeSettings = {
            depth: hexHeight,
            bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Get terrain color
        const terrainConfig = TERRAIN_CONFIG[hex.terrain] || TERRAIN_CONFIG.PLAINS;
        const color = new THREE.Color(terrainConfig.color || '#90EE90');

        // Create material
        const material = new THREE.MeshLambertMaterial({ color: color });

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position mesh (convert hex grid coords to world coords)
        // Using offset coordinates (square grid style for simplicity)
        const worldX = hex.x * (hexSize + this.config.hexSpacing) + hexSize / 2;
        const worldZ = hex.y * (hexSize + this.config.hexSpacing) + hexSize / 2;
        mesh.position.set(worldX, hexHeight / 2, worldZ);

        // Add user data for reference
        mesh.userData.hex = hex;
        mesh.userData.hexX = hex.x;
        mesh.userData.hexY = hex.y;

        return mesh;
    }

    /**
     * Update city objects in the scene
     */
    updateCityObjects(gameState) {
        const cities = gameState.getCities();
        if (!cities) return;

        // TODO: Load and place 3D city models
        // For now, create simple placeholder meshes
        for (const city of cities.values()) {
            const key = `city_${city.id}`;
            
            if (!this.cityObjects.has(key)) {
                const cityMesh = this.createCityPlaceholder(city);
                if (cityMesh) {
                    this.cityObjects.set(key, cityMesh);
                    this.scene.add(cityMesh);
                }
            }
            
            this.renderStats.citiesRendered++;
        }
    }

    /**
     * Create a placeholder mesh for a city (temporary, will be replaced with 3D models)
     */
    createCityPlaceholder(city) {
        const hexSize = this.config.hexSize;
        const geometry = new THREE.CylinderGeometry(hexSize / 4, hexSize / 4, hexSize / 2, 8);
        
        // Get player color if available
        const gameState = window.gameManager?.gameState;
        let color = 0x888888;
        if (city.owner !== null && gameState) {
            const player = gameState.getPlayer(city.owner);
            if (player && player.color) {
                color = new THREE.Color(player.color).getHex();
            }
        }

        const material = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        
        const worldX = city.x * (hexSize + this.config.hexSpacing) + hexSize / 2;
        const worldZ = city.y * (hexSize + this.config.hexSpacing) + hexSize / 2;
        mesh.position.set(worldX, hexSize / 4, worldZ);

        mesh.userData.city = city;
        mesh.userData.type = 'city';
        
        return mesh;
    }

    /**
     * Update unit objects in the scene
     */
    updateUnitObjects(gameState) {
        const units = gameState.getUnits();
        if (!units) return;

        // TODO: Load and place 3D unit models
        // For now, create simple placeholder meshes
        for (const unit of units.values()) {
            const key = `unit_${unit.id}`;
            
            if (!this.unitObjects.has(key)) {
                const unitMesh = this.createUnitPlaceholder(unit);
                if (unitMesh) {
                    this.unitObjects.set(key, unitMesh);
                    this.scene.add(unitMesh);
                }
            }
            
            this.renderStats.unitsRendered++;
        }
    }

    /**
     * Create a placeholder mesh for a unit (temporary, will be replaced with 3D models)
     */
    createUnitPlaceholder(unit) {
        const hexSize = this.config.hexSize;
        const geometry = new THREE.ConeGeometry(hexSize / 6, hexSize / 3, 6);
        
        // Get player color if available
        const gameState = window.gameManager?.gameState;
        let color = 0xff4444;
        if (unit.owner !== null && gameState) {
            const player = gameState.getPlayer(unit.owner);
            if (player && player.color) {
                color = new THREE.Color(player.color).getHex();
            }
        }

        const material = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        
        const worldX = unit.x * (hexSize + this.config.hexSpacing) + hexSize / 2;
        const worldZ = unit.y * (hexSize + this.config.hexSpacing) + hexSize / 2;
        mesh.position.set(worldX, hexSize / 6, worldZ);

        mesh.userData.unit = unit;
        mesh.userData.type = 'unit';
        
        return mesh;
    }

    /**
     * Update selection and highlight indicators
     */
    updateSelectionAndHighlights() {
        // Remove old selection objects
        this.selectionObjects.forEach(obj => this.scene.remove(obj));
        this.selectionObjects = [];

        const hexSize = this.config.hexSize;

        // Add selection indicator
        if (this.selectedHex) {
            const selection = this.createHexOutline(
                this.selectedHex.x,
                this.selectedHex.y,
                hexSize,
                this.config.selectedColor,
                3
            );
            if (selection) {
                this.selectionObjects.push(selection);
                this.scene.add(selection);
            }
        }

        // Add highlight indicators
        this.highlightedHexes.forEach(hex => {
            const highlight = this.createHexOutline(
                hex.x || hex,
                hex.y !== undefined ? hex.y : hex,
                hexSize,
                this.config.highlightColor,
                2
            );
            if (highlight) {
                this.selectionObjects.push(highlight);
                this.scene.add(highlight);
            }
        });
    }

    /**
     * Create a hex outline for selection/highlighting
     */
    createHexOutline(hexX, hexY, hexSize, color, width) {
        const shape = new THREE.Shape();
        const radius = hexSize / 2;
        
        // Hexagon vertices
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        const worldX = hexX * (hexSize + this.config.hexSpacing) + hexSize / 2;
        const worldZ = hexY * (hexSize + this.config.hexSpacing) + hexSize / 2;
        mesh.position.set(worldX, 0.1, worldZ); // Slightly above ground
        mesh.rotation.x = -Math.PI / 2; // Rotate to lay flat

        return mesh;
    }

    /**
     * Set selected hex
     */
    setSelectedHex(hex) {
        this.selectedHex = hex;
    }

    /**
     * Set highlighted hexes
     */
    setHighlightedHexes(hexes) {
        this.highlightedHexes = hexes;
    }

    /**
     * Set hovered hex
     */
    setHoveredHex(hex) {
        this.hoveredHex = hex;
    }

    /**
     * Update FPS counter
     */
    updateFPS(currentTime) {
        // Simple FPS calculation (can be improved)
        this.fps = 1000 / (currentTime - this.lastFrameTime);
    }

    /**
     * Reset render statistics
     */
    resetRenderStats() {
        this.renderStats.hexesRendered = 0;
        this.renderStats.unitsRendered = 0;
        this.renderStats.citiesRendered = 0;
        this.renderStats.totalRenderTime = 0;
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Dispose of all geometries and materials
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry?.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material?.dispose();
                }
            }
        });

        // Clear maps
        this.hexMeshes.clear();
        this.unitObjects.clear();
        this.cityObjects.clear();
        this.selectionObjects = [];

        // Dispose renderer
        this.renderer.dispose();
    }

    /**
     * Get render statistics
     */
    getRenderStats() {
        return {
            ...this.renderStats,
            fps: this.fps,
            sceneObjects: this.scene.children.length
        };
    }

    // ========== Compatibility methods with RenderEngine interface ==========

    /**
     * Convert screen coordinates to hex coordinates
     */
    screenToHex(screenX, screenY) {
        if (!this.camera) return { x: 0, y: 0 };
        return this.camera.screenToHex(screenX, screenY, this.config.hexSize, this.config.hexSpacing);
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        if (!this.camera) return { x: screenX, y: screenY };
        return this.camera.screenToWorld(screenX, screenY);
    }

    /**
     * Move camera by offset
     */
    moveCameraBy(dx, dy) {
        if (this.camera && typeof this.camera.moveBy === 'function') {
            this.camera.moveBy(dx, dy);
        }
    }

    /**
     * Zoom in
     */
    zoomIn(factor = 1.2) {
        if (this.camera && typeof this.camera.zoomIn === 'function') {
            this.camera.zoomIn(factor);
        }
    }

    /**
     * Zoom out
     */
    zoomOut(factor = 1.2) {
        if (this.camera && typeof this.camera.zoomOut === 'function') {
            this.camera.zoomOut(factor);
        }
    }

    /**
     * Set selected hex
     */
    setSelectedHex(hexX, hexY) {
        if (typeof hexX === 'object') {
            // Handle object parameter {x, y}
            this.selectedHex = hexX;
        } else {
            this.selectedHex = { x: hexX, y: hexY };
        }
    }

    /**
     * Set highlighted hexes
     */
    setHighlightedHexes(hexes) {
        this.highlightedHexes = hexes || [];
    }

    /**
     * Set hovered hex
     */
    setHoveredHex(hexX, hexY) {
        if (typeof hexX === 'object') {
            this.hoveredHex = hexX;
        } else {
            this.hoveredHex = { x: hexX, y: hexY };
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedHex = null;
        this.highlightedHexes = [];
    }

    /**
     * Clear hovered hex
     */
    clearHoveredHex() {
        this.hoveredHex = null;
    }

    /**
     * Center camera on hex
     */
    centerOnHex(hexX, hexY) {
        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;
        const worldX = hexX * (hexSize + spacing) + hexSize / 2;
        const worldY = hexY * (hexSize + spacing) + hexSize / 2;
        
        if (this.camera && typeof this.camera.centerOn === 'function') {
            this.camera.centerOn(worldX, worldY);
        }
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        if (this.camera && typeof this.camera.reset === 'function') {
            this.camera.reset();
        }
    }

    /**
     * Zoom to fit entire map
     */
    zoomToFitMap(map) {
        if (!map || !this.camera) return;
        
        const hexSize = this.config.hexSize;
        const spacing = this.config.hexSpacing;
        const mapWidth = map.width * (hexSize + spacing);
        const mapHeight = map.height * (hexSize + spacing);
        
        if (typeof this.camera.zoomToFit === 'function') {
            this.camera.zoomToFit(mapWidth, mapHeight);
        }
    }

    /**
     * Handle canvas resize
     */
    handleCanvasResize(width, height) {
        this.updateViewport(width, height);
        if (this.camera && typeof this.camera.updateCanvasDimensions === 'function') {
            this.camera.updateCanvasDimensions(width, height);
        }
    }
}

