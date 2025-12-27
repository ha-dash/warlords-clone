/**
 * MapEditor - 3D Map Editor with real models and textures
 * Uses Three.js for 3D rendering with OBJ/MTL models from assets
 */

import * as THREE from 'three';
import { modelLoader } from '../core/ModelLoader.js';
import { Map } from '../core/Map.js';
import { Hex, TERRAIN_TYPES, TERRAIN_CONFIG } from '../core/Hex.js';

export class MapEditor {
    constructor() {
        this.canvas = document.getElementById('editor-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        // Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Perspective camera for better 3D view
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
        this.camera.position.set(50, 80, 50);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth - 350, window.innerHeight - 100);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup lighting
        this.setupLighting();

        // Editor state
        this.map = null;
        this.selectedTerrain = TERRAIN_TYPES.PLAINS;
        this.selectedBuilding = null;
        this.editMode = 'terrain'; // 'terrain', 'building', 'decoration'
        
        // 3D objects
        this.hexMeshes = new Map(); // Map of hex positions to Three.js meshes
        this.buildingObjects = new Map(); // Map of hex positions to building objects
        this.selectedHex = null;
        this.hoveredHex = null;

        // Camera controls
        this.isDragging = false;
        this.isRotating = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouseDownX = 0;
        this.mouseDownY = 0;
        this.cameraDistance = 150;
        this.cameraAngleX = Math.PI / 4;
        this.cameraAngleY = Math.PI / 4;

        // Configuration
        this.config = {
            hexSize: 3.5, // Size in 3D space
            hexHeight: 0.2,
            textureRepeat: 1
        };

        // Model paths mapping
        this.terrainModels = {
            [TERRAIN_TYPES.PLAINS]: [
                { obj: 'assets/terrain/tiles/base/hex_grass.obj', mtl: 'assets/terrain/tiles/base/hex_grass.mtl' }
            ],
            [TERRAIN_TYPES.WATER]: [
                { obj: 'assets/terrain/tiles/base/hex_water.obj', mtl: 'assets/terrain/tiles/base/hex_water.mtl' }
            ],
            [TERRAIN_TYPES.ROAD]: [
                { obj: 'assets/terrain/tiles/roads/hex_road_A.obj', mtl: 'assets/terrain/tiles/roads/hex_road_A.mtl' }
            ],
            [TERRAIN_TYPES.FOREST]: [
                { obj: 'assets/terrain/tiles/base/hex_grass.obj', mtl: 'assets/terrain/tiles/base/hex_grass.mtl' }
            ],
            [TERRAIN_TYPES.MOUNTAIN]: [
                { obj: 'assets/terrain/tiles/base/hex_grass_sloped_high.obj', mtl: 'assets/terrain/tiles/base/hex_grass_sloped_high.mtl' }
            ]
        };

        this.buildingModels = [
            { name: 'Мост A', obj: 'assets/terrain/buildings/neutral/building_bridge_A.obj', mtl: 'assets/terrain/buildings/neutral/building_bridge_A.mtl' },
            { name: 'Мост B', obj: 'assets/terrain/buildings/neutral/building_bridge_B.obj', mtl: 'assets/terrain/buildings/neutral/building_bridge_B.mtl' },
            { name: 'Разрушенное', obj: 'assets/terrain/buildings/neutral/building_destroyed.obj', mtl: 'assets/terrain/buildings/neutral/building_destroyed.mtl' },
            { name: 'Зернохранилище', obj: 'assets/terrain/buildings/neutral/building_grain.obj', mtl: 'assets/terrain/buildings/neutral/building_grain.mtl' },
            { name: 'Строительные леса', obj: 'assets/terrain/buildings/neutral/building_scaffolding.obj', mtl: 'assets/terrain/buildings/neutral/building_scaffolding.mtl' },
            { name: 'Сцена A', obj: 'assets/terrain/buildings/neutral/building_stage_A.obj', mtl: 'assets/terrain/buildings/neutral/building_stage_A.mtl' },
            { name: 'Сцена B', obj: 'assets/terrain/buildings/neutral/building_stage_B.obj', mtl: 'assets/terrain/buildings/neutral/building_stage_B.mtl' },
            { name: 'Сцена C', obj: 'assets/terrain/buildings/neutral/building_stage_C.obj', mtl: 'assets/terrain/buildings/neutral/building_stage_C.mtl' },
            { name: 'Каменная стена', obj: 'assets/terrain/buildings/neutral/wall_straight.obj', mtl: 'assets/terrain/buildings/neutral/wall_straight.mtl' },
            { name: 'Деревянный забор', obj: 'assets/terrain/buildings/neutral/fence_wood_straight.obj', mtl: 'assets/terrain/buildings/neutral/fence_wood_straight.mtl' },
            { name: 'Каменный забор', obj: 'assets/terrain/buildings/neutral/fence_stone_straight.obj', mtl: 'assets/terrain/buildings/neutral/fence_stone_straight.mtl' }
        ];

        // Load texture
        this.textureLoader = new THREE.TextureLoader();
        this.hexTexture = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the editor
     */
    async init() {
        try {
            // Create default map
            const width = parseInt(document.getElementById('map-width').value) || 20;
            const height = parseInt(document.getElementById('map-height').value) || 15;
            this.map = new Map(width, height);

            // Setup event listeners
            this.setupEventListeners();

            // Update loading status
            this.updateLoadingStatus('Загрузка текстур...');

            // Load textures (with timeout)
            try {
                await Promise.race([
                    this.loadTextures(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
            } catch (error) {
                console.warn('Texture loading timeout or error:', error);
                // Continue without texture
            }

            // Update loading status
            this.updateLoadingStatus('Загрузка моделей местности...', 'Это может занять некоторое время...');

            // Preload terrain models (with timeout and error handling)
            // Don't block initialization if loading takes too long
            try {
                await Promise.race([
                    this.preloadTerrainModels(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
                ]);
            } catch (error) {
                console.warn('Model loading timeout or error, continuing with fallback meshes:', error);
                // Continue with fallback meshes
            }

            // Update loading status
            this.updateLoadingStatus('Построение карты...');

            // Build initial map (this can work without models using fallback)
            await this.buildMap();

            // Start render loop
            this.animate();

            // Hide loading overlay
            setTimeout(() => {
                document.getElementById('loading-overlay').classList.add('hidden');
            }, 500);

            console.log('Map Editor initialized');
        } catch (error) {
            console.error('Failed to initialize Map Editor:', error);
            document.getElementById('loading-overlay').innerHTML = 
                '<div style="text-align: center;"><div>Ошибка инициализации редактора</div><div style="font-size: 14px; margin-top: 10px;">' + 
                error.message + '</div><button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Перезагрузить</button></div>';
        }
    }

    /**
     * Update loading status text
     */
    updateLoadingStatus(text, progress = '') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const textEl = document.getElementById('loading-text');
            const progressEl = document.getElementById('loading-progress');
            if (textEl) {
                textEl.textContent = text;
            }
            if (progressEl) {
                progressEl.textContent = progress;
            }
        }
    }

    /**
     * Load textures for hexes
     */
    async loadTextures() {
        try {
            // Load hex texture with progress callback
            this.hexTexture = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Texture loading timeout'));
                }, 5000);

                this.textureLoader.load(
                    'assets/terrain/tiles/base/hexagons_medieval.png',
                    (texture) => {
                        clearTimeout(timeout);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(this.config.textureRepeat, this.config.textureRepeat);
                        console.log('Hex texture loaded');
                        resolve(texture);
                    },
                    (progress) => {
                        // Progress callback (optional)
                        if (progress.total > 0) {
                            const percent = (progress.loaded / progress.total) * 100;
                            console.log(`Texture loading: ${percent.toFixed(0)}%`);
                        }
                    },
                    (error) => {
                        clearTimeout(timeout);
                        console.warn('Failed to load hex texture:', error);
                        reject(error);
                    }
                );
            });
        } catch (error) {
            console.warn('Failed to load hex texture, using fallback colors:', error);
            this.hexTexture = null; // Will use fallback colors
        }
    }

    /**
     * Preload terrain models
     */
    async preloadTerrainModels() {
        const modelsToLoad = [];
        
        for (const terrainType in this.terrainModels) {
            for (const model of this.terrainModels[terrainType]) {
                const key = `terrain_${terrainType}_${model.obj}`;
                modelsToLoad.push({
                    key,
                    obj: model.obj,
                    mtl: model.mtl
                });
            }
        }

        // Load building models
        for (const building of this.buildingModels) {
            const key = `building_${building.name}`;
            modelsToLoad.push({
                key,
                obj: building.obj,
                mtl: building.mtl
            });
        }

        // Preload models with error handling per model
        let loadedCount = 0;
        const totalModels = modelsToLoad.length;

        // Load models in batches to avoid overwhelming the system
        const batchSize = 3;
        for (let i = 0; i < modelsToLoad.length; i += batchSize) {
            const batch = modelsToLoad.slice(i, i + batchSize);
            const promises = batch.map(async (model) => {
                try {
                    await modelLoader.loadModel(model.key, model.obj, model.mtl);
                    loadedCount++;
                    this.updateLoadingStatus(`Загрузка моделей... ${loadedCount}/${totalModels}`);
                    return true;
                } catch (error) {
                    console.warn(`Failed to load model ${model.key}:`, error);
                    return false;
                }
            });

            await Promise.all(promises);
        }

        console.log(`Terrain models preloaded: ${loadedCount}/${totalModels} successful`);
    }

    /**
     * Setup lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Hemisphere light for more natural look
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        this.scene.add(hemisphereLight);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // UI controls
        document.getElementById('apply-size-btn').addEventListener('click', () => this.applyMapSize());
        document.getElementById('edit-mode').addEventListener('change', (e) => {
            this.editMode = e.target.value;
            this.updateUIPanels();
        });

        // Terrain buttons
        document.querySelectorAll('.terrain-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.terrain-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedTerrain = e.target.dataset.terrain;
            });
        });

        // Set default terrain selection
        document.querySelector('.terrain-btn[data-terrain="PLAINS"]').classList.add('active');

        // Building buttons (will be created dynamically)
        this.populateBuildingList();

        // Camera controls
        document.getElementById('reset-camera-btn').addEventListener('click', () => this.resetCamera());
        document.getElementById('center-map-btn').addEventListener('click', () => this.centerMap());

        // File operations
        document.getElementById('new-map-btn').addEventListener('click', () => this.newMap());
        document.getElementById('save-map-btn').addEventListener('click', () => this.saveMap());
        document.getElementById('load-map-btn').addEventListener('click', () => this.loadMap());
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /**
     * Populate building list in UI
     */
    populateBuildingList() {
        const buildingList = document.getElementById('building-list');
        buildingList.innerHTML = '';

        this.buildingModels.forEach((building, index) => {
            const btn = document.createElement('button');
            btn.className = 'building-btn';
            btn.textContent = building.name;
            btn.dataset.index = index;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.building-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedBuilding = building;
            });
            buildingList.appendChild(btn);
        });
    }

    /**
     * Update UI panels based on edit mode
     */
    updateUIPanels() {
        const terrainPanel = document.getElementById('terrain-panel');
        const buildingPanel = document.getElementById('building-panel');

        if (this.editMode === 'terrain') {
            terrainPanel.style.display = 'block';
            buildingPanel.style.display = 'none';
        } else if (this.editMode === 'building') {
            terrainPanel.style.display = 'none';
            buildingPanel.style.display = 'block';
        } else {
            terrainPanel.style.display = 'none';
            buildingPanel.style.display = 'none';
        }
    }

    /**
     * Build the map from hex data
     */
    async buildMap() {
        // Clear existing meshes
        this.hexMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            // Dispose geometry and materials
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        this.hexMeshes.clear();

        // Clear building objects
        this.buildingObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.buildingObjects.clear();

        // Create hex meshes (create fallback meshes first, then try to upgrade to models)
        const totalHexes = this.map.width * this.map.height;
        let processed = 0;

        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const hex = this.map.getHex(x, y);
                if (hex) {
                    try {
                        await this.createHexMesh(hex);
                    } catch (error) {
                        console.warn(`Failed to create hex mesh at (${x}, ${y}):`, error);
                        // Create fallback mesh
                        const fallbackMesh = this.createFallbackHexMesh(hex);
                        const worldPos = this.hexToWorld(hex.x, hex.y);
                        fallbackMesh.position.set(worldPos.x, 0, worldPos.z);
                        fallbackMesh.userData.hex = hex;
                        fallbackMesh.userData.hexX = hex.x;
                        fallbackMesh.userData.hexY = hex.y;
                        this.scene.add(fallbackMesh);
                        this.hexMeshes.set(`${hex.x},${hex.y}`, fallbackMesh);
                    }
                    processed++;
                    if (processed % 10 === 0) {
                        this.updateLoadingStatus(`Построение карты... ${Math.round((processed / totalHexes) * 100)}%`);
                        // Allow rendering between batches
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
        }

        console.log(`Map built: ${this.map.width}x${this.map.height}`);
    }

    /**
     * Create a 3D mesh for a hex with real model
     */
    async createHexMesh(hex) {
        const key = `${hex.x},${hex.y}`;

        // Remove old mesh if exists
        if (this.hexMeshes.has(key)) {
            const oldMesh = this.hexMeshes.get(key);
            this.scene.remove(oldMesh);
            // Dispose geometry and materials
            if (oldMesh.geometry) oldMesh.geometry.dispose();
            if (oldMesh.material) {
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach(m => {
                        if (m.map) m.map.dispose();
                        m.dispose();
                    });
                } else {
                    if (oldMesh.material.map) oldMesh.material.map.dispose();
                    oldMesh.material.dispose();
                }
            }
        }

        let mesh;

        // Try to load real 3D model, but use fallback if it fails or takes too long
        const terrainModel = this.terrainModels[hex.terrain];
        
        if (terrainModel && terrainModel.length > 0) {
            try {
                // Use real 3D model with timeout
                const modelKey = `terrain_${hex.terrain}_${terrainModel[0].obj}`;
                const modelPromise = modelLoader.loadModel(
                    modelKey,
                    terrainModel[0].obj,
                    terrainModel[0].mtl
                );

                // Add timeout to prevent hanging
                const model = await Promise.race([
                    modelPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Model load timeout')), 2000)
                    )
                ]);

                mesh = model.clone();

                // Scale model to fit hex size
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const maxSize = Math.max(size.x, size.z, size.y);
                if (maxSize > 0) {
                    const scale = this.config.hexSize / maxSize;
                    mesh.scale.set(scale, scale, scale);
                }
            } catch (error) {
                // Fallback to simple mesh if model loading fails
                console.warn(`Using fallback mesh for ${hex.terrain} at (${hex.x}, ${hex.y}):`, error.message);
                mesh = this.createFallbackHexMesh(hex);
            }
        } else {
            // No model available, use fallback
            mesh = this.createFallbackHexMesh(hex);
        }

        // Position mesh
        const worldPos = this.hexToWorld(hex.x, hex.y);
        mesh.position.set(worldPos.x, 0, worldPos.z);

        // Add texture if available
        if (this.hexTexture && mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                    if (!m.map || m.map !== this.hexTexture) {
                        if (m.map && m.map !== this.hexTexture) {
                            m.map.dispose();
                        }
                        m.map = this.hexTexture.clone();
                        m.needsUpdate = true;
                    }
                });
            } else {
                if (!mesh.material.map || mesh.material.map !== this.hexTexture) {
                    if (mesh.material.map && mesh.material.map !== this.hexTexture) {
                        mesh.material.map.dispose();
                    }
                    mesh.material.map = this.hexTexture.clone();
                    mesh.material.needsUpdate = true;
                }
            }
        }

        // Store hex reference
        mesh.userData.hex = hex;
        mesh.userData.hexX = hex.x;
        mesh.userData.hexY = hex.y;

        // Add to scene
        this.scene.add(mesh);
        this.hexMeshes.set(key, mesh);

        return mesh;
    }

    /**
     * Create fallback hex mesh (simple geometry)
     */
    createFallbackHexMesh(hex) {
        const shape = new THREE.Shape();
        const radius = this.config.hexSize / 2;

        // Create hexagon shape (flat-top)
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

        // Extrude
        const extrudeSettings = {
            depth: this.config.hexHeight,
            bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Get terrain color
        const terrainConfig = TERRAIN_CONFIG[hex.terrain] || TERRAIN_CONFIG.PLAINS;
        const color = new THREE.Color(terrainConfig.color || '#90EE90');

        // Create material with texture
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            map: this.hexTexture ? this.hexTexture.clone() : null
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        return mesh;
    }

    /**
     * Convert hex coordinates to world coordinates
     */
    hexToWorld(x, y) {
        // Hexagonal grid positioning (flat-top hexagons)
        const size = this.config.hexSize;
        const spacing = size * 0.05;
        const width = size + spacing;
        const height = size * Math.sqrt(3) / 2 + spacing;

        const worldX = x * width * 0.75;
        const worldZ = (y * height) + (x % 2 === 1 ? height / 2 : 0);

        // Center the map
        const offsetX = -(this.map.width * width * 0.75) / 2;
        const offsetZ = -(this.map.height * height) / 2;

        return {
            x: worldX + offsetX,
            z: worldZ + offsetZ
        };
    }


    /**
     * Mouse down event
     */
    onMouseDown(e) {
        if (e.button === 0) { // Left click
            this.mouseDownX = e.clientX;
            this.mouseDownY = e.clientY;
            this.isDragging = false;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        } else if (e.button === 2) { // Right click
            this.isRotating = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    /**
     * Mouse move event
     */
    onMouseMove(e) {
        // Update coordinates display
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Raycast to find hovered hex
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
            ((mouseX / rect.width) * 2 - 1),
            (-(mouseY / rect.height) * 2 + 1)
        );

        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(Array.from(this.hexMeshes.values()));

        if (intersects.length > 0) {
            const hex = intersects[0].object.userData.hex;
            if (hex) {
                this.hoveredHex = hex;
                this.updateHexInfo(hex);
                document.getElementById('coordinates').textContent = `Координаты: (${hex.x}, ${hex.y})`;
            }
        }

        // Handle dragging
        const dragThreshold = 5;
        if (e.buttons === 1 && (Math.abs(e.clientX - this.mouseDownX) > dragThreshold || Math.abs(e.clientY - this.mouseDownY) > dragThreshold)) {
            this.isDragging = true;
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;

            // Move camera
            const right = new THREE.Vector3();
            this.camera.getWorldDirection(right);
            right.cross(this.camera.up).normalize();

            this.camera.position.add(right.multiplyScalar(-deltaX * 0.1));
            this.camera.position.add(this.camera.up.clone().multiplyScalar(deltaY * 0.1));
            
            this.updateCameraPosition();
        }

        // Handle rotation (right mouse button)
        if (this.isRotating || e.buttons === 2) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;

            this.cameraAngleY += deltaX * 0.01;
            this.cameraAngleX += deltaY * 0.01;
            this.cameraAngleX = Math.max(0.1, Math.min(Math.PI / 2, this.cameraAngleX));

            this.updateCameraPosition();
        }

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    /**
     * Mouse up event
     */
    onMouseUp(e) {
        const wasDragging = this.isDragging;
        
        if (e.button === 0 && !wasDragging) {
            // Left click - edit hex
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2(
                ((mouseX / rect.width) * 2 - 1),
                (-(mouseY / rect.height) * 2 + 1)
            );

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(Array.from(this.hexMeshes.values()));

            if (intersects.length > 0) {
                const hex = intersects[0].object.userData.hex;
                if (hex) {
                    this.editHex(hex);
                }
            }
        }

        this.isDragging = false;
        this.isRotating = false;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    /**
     * Edit hex based on current edit mode
     */
    async editHex(hex) {
        if (this.editMode === 'terrain') {
            // Change terrain type
            hex.terrain = this.selectedTerrain;
            await this.createHexMesh(hex);
            document.getElementById('status-text').textContent = `Изменена местность: ${hex.getTerrainName()}`;
        } else if (this.editMode === 'building' && this.selectedBuilding) {
            // Place building
            await this.placeBuilding(hex, this.selectedBuilding);
            document.getElementById('status-text').textContent = `Размещено здание: ${this.selectedBuilding.name}`;
        }
    }

    /**
     * Place building on hex
     */
    async placeBuilding(hex, building) {
        const key = `${hex.x},${hex.y}`;

        // Remove existing building
        if (this.buildingObjects.has(key)) {
            const oldBuilding = this.buildingObjects.get(key);
            this.scene.remove(oldBuilding);
            if (oldBuilding.geometry) oldBuilding.geometry.dispose();
            if (oldBuilding.material) {
                if (Array.isArray(oldBuilding.material)) {
                    oldBuilding.material.forEach(m => m.dispose());
                } else {
                    oldBuilding.material.dispose();
                }
            }
            this.buildingObjects.delete(key);
        }

        try {
            // Load building model
            const modelKey = `building_${building.name}`;
            const model = await modelLoader.loadModel(modelKey, building.obj, building.mtl);
            const buildingMesh = model.clone();

            // Position building
            const worldPos = this.hexToWorld(hex.x, hex.y);
            buildingMesh.position.set(worldPos.x, this.config.hexHeight, worldPos.z);

            // Scale building appropriately
            const box = new THREE.Box3().setFromObject(buildingMesh);
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.z, size.y);
            const scale = (this.config.hexSize * 0.8) / maxSize;
            buildingMesh.scale.set(scale, scale, scale);

            buildingMesh.castShadow = true;
            buildingMesh.receiveShadow = true;

            this.scene.add(buildingMesh);
            this.buildingObjects.set(key, buildingMesh);
        } catch (error) {
            console.error('Failed to place building:', error);
        }
    }

    /**
     * Update hex info display
     */
    updateHexInfo(hex) {
        const info = document.getElementById('hex-info');
        info.innerHTML = `
            <strong>Координаты:</strong> (${hex.x}, ${hex.y})<br>
            <strong>Местность:</strong> ${hex.getTerrainName()}<br>
            <strong>Стоимость передвижения:</strong> ${hex.getMovementCost()}<br>
            <strong>Бонус защиты:</strong> ${hex.getDefenseBonus()}
        `;
    }

    /**
     * Wheel event for zooming
     */
    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY * 0.01;
        this.cameraDistance = Math.max(30, Math.min(500, this.cameraDistance + delta));
        this.updateCameraPosition();
    }

    /**
     * Update camera position based on angles and distance
     */
    updateCameraPosition() {
        const target = new THREE.Vector3(0, 0, 0);
        
        this.camera.position.x = target.x + this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
        this.camera.position.y = target.y + this.cameraDistance * Math.cos(this.cameraAngleX);
        this.camera.position.z = target.z + this.cameraDistance * Math.sin(this.cameraAngleX) * Math.sin(this.cameraAngleY);
        
        this.camera.lookAt(target);
    }

    /**
     * Window resize handler
     */
    onWindowResize() {
        const width = window.innerWidth - 350;
        const height = window.innerHeight - 100;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Apply new map size
     */
    async applyMapSize() {
        const width = parseInt(document.getElementById('map-width').value);
        const height = parseInt(document.getElementById('map-height').value);

        if (width < 5 || width > 100 || height < 5 || height > 100) {
            alert('Размер карты должен быть от 5x5 до 100x100');
            return;
        }

        this.map = new Map(width, height);
        await this.buildMap();
        this.centerMap();
        document.getElementById('status-text').textContent = `Карта изменена: ${width}x${height}`;
    }

    /**
     * Reset camera
     */
    resetCamera() {
        this.cameraDistance = 150;
        this.cameraAngleX = Math.PI / 4;
        this.cameraAngleY = Math.PI / 4;
        this.updateCameraPosition();
    }

    /**
     * Center camera on map
     */
    centerMap() {
        this.camera.lookAt(0, 0, 0);
        this.updateCameraPosition();
    }

    /**
     * Create new map
     */
    async newMap() {
        if (confirm('Создать новую карту? Все несохраненные изменения будут потеряны.')) {
            await this.applyMapSize();
        }
    }

    /**
     * Save map
     */
    saveMap() {
        const mapData = this.map.serialize();
        const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `map_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        document.getElementById('status-text').textContent = 'Карта сохранена';
    }

    /**
     * Load map
     */
    loadMap() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const mapData = JSON.parse(text);
                    this.map = Map.deserialize(mapData);
                    document.getElementById('map-width').value = this.map.width;
                    document.getElementById('map-height').value = this.map.height;
                    await this.buildMap();
                    this.centerMap();
                    document.getElementById('status-text').textContent = 'Карта загружена';
                } catch (error) {
                    alert('Ошибка загрузки карты: ' + error.message);
                }
            }
        };
        input.click();
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();
    }

    /**
     * Render the scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize editor when page loads
window.addEventListener('DOMContentLoaded', () => {
    new MapEditor();
});

