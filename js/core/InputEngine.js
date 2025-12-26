/**
 * InputEngine - Handles all user input for the Warlords Clone game
 * Manages mouse clicks, keyboard shortcuts, unit selection, and movement commands
 */

export class InputEngine {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.renderEngine = gameManager.getRenderEngine();
        this.gameState = gameManager.getGameState();

        // Input state
        this.selectedUnit = null;
        this.hoveredHex = null;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.dragStartPos = { x: 0, y: 0 };
        this.contextMenuVisible = false;

        // Keyboard shortcuts configuration
        this.keyboardShortcuts = {
            // Camera controls
            'w': () => this.moveCameraUp(),
            'a': () => this.moveCameraLeft(),
            's': () => this.moveCameraDown(),
            'd': () => this.moveCameraRight(),
            'ArrowUp': () => this.moveCameraUp(),
            'ArrowLeft': () => this.moveCameraLeft(),
            'ArrowDown': () => this.moveCameraDown(),
            'ArrowRight': () => this.moveCameraRight(),

            // Zoom controls
            '+': () => this.zoomIn(),
            '=': () => this.zoomIn(),
            '-': () => this.zoomOut(),
            '_': () => this.zoomOut(),

            // Game controls
            'Escape': () => this.clearSelection(),
            'Space': () => this.endTurn(),
            'Enter': () => this.endTurn(),
            'f': () => this.fitMapToScreen(),
            'Home': () => this.resetCamera(),
            'c': () => this.centerOnSelectedUnit(),

            // Unit controls
            'Delete': () => this.deleteSelectedUnit(),
            'Tab': () => this.selectNextUnit(),
            'Shift+Tab': () => this.selectPreviousUnit(),

            // Save/Load (Requirement 10.1, 10.2)
            'F5': () => this.quickSave(),
            'F9': () => this.quickLoad(),
            'Ctrl+s': () => this.quickSave(),
            'Ctrl+o': () => this.quickLoad(),

            // UI shortcuts
            'h': () => this.toggleHelp(),
            'i': () => this.toggleUnitInfo(),
            'm': () => this.toggleMinimap(),
            '1': () => this.selectUnitType('WARRIOR'),
            '2': () => this.selectUnitType('ARCHER'),
            '3': () => this.selectUnitType('CAVALRY'),
            '4': () => this.selectUnitType('HERO')
        };

        this.setupEventListeners();
        console.log('InputEngine initialized');
    }

    /**
     * Set up all event listeners for input handling
     */
    setupEventListeners() {
        const canvas = document.getElementById(this.gameManager.canvasId);
        if (!canvas) {
            console.error('Canvas not found for input handling');
            return;
        }

        // Mouse event listeners
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable browser context menu

        // Keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Window events
        window.addEventListener('resize', () => this.handleWindowResize());

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => this.handleDocumentClick(e));

        console.log('Input event listeners set up');
    }

    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseDown(event) {
        if (!this.renderEngine) return;

        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.lastMousePos = { x, y };
        this.dragStartPos = { x, y };

        // Hide context menu if visible
        this.hideContextMenu();

        if (event.button === 0) { // Left click
            this.handleLeftClick(x, y, event);
        } else if (event.button === 1) { // Middle click - start camera drag
            this.isDragging = true;
            event.preventDefault();
        } else if (event.button === 2) { // Right click
            this.handleRightClick(x, y, event);
        }
    }

    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        if (!this.renderEngine) return;

        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Handle camera dragging
        if (this.isDragging) {
            const dx = x - this.lastMousePos.x;
            const dy = y - this.lastMousePos.y;

            // Move camera in opposite direction (drag to pan)
            this.renderEngine.moveCameraBy(-dx / this.renderEngine.camera.zoom, -dy / this.renderEngine.camera.zoom);
            this.gameManager.render();
        }

        // Handle hex hovering for terrain information (Requirement 2.4)
        this.handleMouseHover(x, y);

        this.lastMousePos = { x, y };
    }

    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseUp(event) {
        if (event.button === 1) { // Middle click release
            this.isDragging = false;
        }
    }

    /**
     * Handle mouse wheel events for zooming
     * @param {WheelEvent} event - Wheel event
     */
    handleMouseWheel(event) {
        if (!this.renderEngine) return;

        event.preventDefault();

        const zoomFactor = 1.1;
        const rect = event.target.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Get world position before zoom
        const worldPos = this.renderEngine.screenToWorld(mouseX, mouseY);

        // Apply zoom
        if (event.deltaY < 0) {
            this.renderEngine.zoomIn(zoomFactor);
        } else {
            this.renderEngine.zoomOut(zoomFactor);
        }

        // Get world position after zoom
        const newWorldPos = this.renderEngine.screenToWorld(mouseX, mouseY);

        // Adjust camera to keep mouse position fixed
        const worldDx = worldPos.x - newWorldPos.x;
        const worldDy = worldPos.y - newWorldPos.y;
        this.renderEngine.moveCameraBy(worldDx, worldDy);

        this.gameManager.render();
    }

    /**
     * Handle left mouse clicks - unit selection and movement (Requirements 3.1, 3.2)
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @param {MouseEvent} event - Original mouse event
     */
    handleLeftClick(x, y, event) {
        if (!this.gameState || this.gameManager.getGamePhase() !== 'PLAYING') return;

        // Convert screen coordinates to hex coordinates
        const hexCoords = this.renderEngine.screenToHex(x, y);
        const map = this.gameState.getMap();

        if (!map || !map.isValidCoordinate(hexCoords.x, hexCoords.y)) {
            return;
        }

        const hex = map.getHex(hexCoords.x, hexCoords.y);
        if (!hex) return;

        // Check if there's a unit on this hex
        const unit = this.gameState.getUnitAt(hexCoords.x, hexCoords.y);

        // Check if there's a city on this hex
        const city = this.gameState.getCityAt(hexCoords.x, hexCoords.y);

        if (unit && unit.owner === this.gameManager.getCurrentPlayer()) {
            // Select our own unit (Requirement 3.1)
            this.selectUnit(unit);
        } else if (city && city.owner === this.gameManager.getCurrentPlayer()) {
            // Select our own city
            this.selectCity(city);
        } else if (this.selectedUnit) {
            // Try to move selected unit or attack (Requirement 3.2)
            this.handleUnitAction(this.selectedUnit, hexCoords.x, hexCoords.y);
        } else {
            // Clear selection
            this.clearSelection();
        }

        this.gameManager.render();
    }

    /**
     * Handle right mouse clicks - context menus (Requirement 9.3)
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @param {MouseEvent} event - Original mouse event
     */
    handleRightClick(x, y, event) {
        // Convert to hex coordinates
        const hexCoords = this.renderEngine.screenToHex(x, y);
        const map = this.gameState.getMap();

        if (!map || !map.isValidCoordinate(hexCoords.x, hexCoords.y)) {
            return;
        }

        // Check what's on this hex
        const unit = this.gameState.getUnitAt(hexCoords.x, hexCoords.y);
        const city = this.gameState.getCityAt(hexCoords.x, hexCoords.y);
        const hex = map.getHex(hexCoords.x, hexCoords.y);

        // Show context menu with available actions
        this.showContextMenu(x, y, { unit, city, hex, hexCoords });
    }

    /**
     * Handle mouse hovering for terrain information display (Requirement 2.4)
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     */
    handleMouseHover(x, y) {
        if (!this.gameState) return;

        // Convert screen coordinates to hex coordinates
        const hexCoords = this.renderEngine.screenToHex(x, y);
        const map = this.gameState.getMap();

        if (!map || !map.isValidCoordinate(hexCoords.x, hexCoords.y)) {
            this.clearHover();
            return;
        }

        const hex = map.getHex(hexCoords.x, hexCoords.y);
        if (!hex) {
            this.clearHover();
            return;
        }

        // Update hovered hex if it changed
        if (!this.hoveredHex || this.hoveredHex.x !== hexCoords.x || this.hoveredHex.y !== hexCoords.y) {
            this.hoveredHex = hexCoords;
            this.renderEngine.setHoveredHex(hexCoords.x, hexCoords.y);

            // Display terrain information (Requirement 2.4)
            this.displayTerrainInfo(hex, x, y);

            this.gameManager.render();
        }
    }

    /**
     * Handle keyboard input - shortcuts (Requirement 9.4)
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        // Check if we're typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Handle modifier key combinations
        let keyCombo = '';
        if (event.ctrlKey) keyCombo += 'Ctrl+';
        if (event.shiftKey) keyCombo += 'Shift+';
        if (event.altKey) keyCombo += 'Alt+';
        keyCombo += event.key;

        // Try the full key combination first
        let shortcut = this.keyboardShortcuts[keyCombo];
        if (!shortcut) {
            // Fall back to just the key
            shortcut = this.keyboardShortcuts[event.key];
        }

        if (shortcut) {
            shortcut();
            event.preventDefault();
        }
    }

    /**
     * Handle keyboard up events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        // Currently no specific key up handling needed
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        if (!this.renderEngine) return;

        const canvas = document.getElementById(this.gameManager.canvasId);
        if (!canvas) return;

        // Update canvas size to match container
        const container = canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.renderEngine.handleCanvasResize(rect.width, rect.height);
            this.gameManager.render();
        }
    }

    /**
     * Handle document clicks to hide context menu
     * @param {MouseEvent} event - Click event
     */
    handleDocumentClick(event) {
        if (this.contextMenuVisible) {
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu && !contextMenu.contains(event.target)) {
                this.hideContextMenu();
            }
        }
    }

    /**
     * Select a unit (Requirement 3.1)
     * @param {Unit} unit - Unit to select
     */
    selectUnit(unit) {
        this.selectedUnit = unit;
        this.renderEngine.setSelectedHex(unit.x, unit.y);

        // Show movement range (Requirement 3.2)
        if (this.gameState) {
            const movementRange = this.gameState.getUnitMovementRange(unit);
            this.renderEngine.setHighlightedHexes(movementRange);
        }

        // Update unit info display (Requirement 9.2)
        this.displayUnitInfo(unit);

        console.log('Selected unit:', unit);
    }

    /**
     * Select a city
     * @param {City} city - City to select
     */
    selectCity(city) {
        // Clear unit selection
        this.selectedUnit = null;
        this.renderEngine.setSelectedHex(city.x, city.y);
        this.renderEngine.setHighlightedHexes([]);

        // Update city info display (Requirement 9.2)
        this.displayCityInfo(city);

        console.log('Selected city:', city);
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        this.selectedUnit = null;
        this.renderEngine.clearSelection();
        this.clearUnitInfo();
        this.clearCityInfo();
    }

    /**
     * Clear hover state
     */
    clearHover() {
        this.hoveredHex = null;
        this.renderEngine.clearHoveredHex();
        this.clearTerrainInfo();
    }

    /**
     * Handle unit action (movement or attack) (Requirement 3.2)
     * @param {Unit} unit - Unit to act with
     * @param {number} targetX - Target hex X coordinate
     * @param {number} targetY - Target hex Y coordinate
     */
    handleUnitAction(unit, targetX, targetY) {
        if (!this.gameState) return;

        // Check if target is in movement range
        const movementRange = this.gameState.getUnitMovementRange(unit);
        const canMoveTo = movementRange.some(hex => hex.x === targetX && hex.y === targetY);

        if (canMoveTo) {
            // Move unit
            const success = this.gameState.moveUnit(unit, targetX, targetY);
            if (success) {
                this.selectUnit(unit); // Refresh selection and movement range
                console.log(`Moved unit to (${targetX}, ${targetY})`);
            }
        } else {
            // Check for attack target
            const targetUnit = this.gameState.getUnitAt(targetX, targetY);
            if (targetUnit && targetUnit.owner !== unit.owner) {
                // Initiate combat (Requirement 3.5)
                const combatResult = this.gameState.initiateCombat(unit, targetUnit);
                if (combatResult) {
                    console.log('Combat initiated:', combatResult);
                    this.selectUnit(unit); // Refresh selection
                }
            }
        }
    }

    /**
     * Show context menu with available actions (Requirement 9.3)
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @param {Object} context - Context object with unit, city, hex info
     */
    showContextMenu(x, y, context) {
        // Remove existing context menu
        this.hideContextMenu();

        const contextMenu = document.createElement('div');
        contextMenu.id = 'context-menu';
        contextMenu.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            border: 1px solid #666;
            border-radius: 4px;
            padding: 8px 0;
            z-index: 1000;
            min-width: 150px;
            font-size: 14px;
        `;

        const menuItems = this.getContextMenuItems(context);

        menuItems.forEach((item, index) => {
            const menuItem = document.createElement('div');

            if (item.label === '---') {
                // Separator
                menuItem.style.cssText = `
                    height: 1px;
                    background: #444;
                    margin: 4px 0;
                `;
            } else {
                menuItem.style.cssText = `
                    padding: 8px 16px;
                    cursor: ${item.enabled ? 'pointer' : 'not-allowed'};
                    color: ${item.enabled ? 'white' : '#666'};
                    font-size: 13px;
                    border-bottom: ${index < menuItems.length - 1 ? '1px solid #333' : 'none'};
                    transition: background-color 0.2s;
                `;
                menuItem.textContent = item.label;

                if (item.enabled) {
                    menuItem.addEventListener('click', () => {
                        item.action();
                        this.hideContextMenu();
                    });

                    menuItem.addEventListener('mouseenter', () => {
                        menuItem.style.backgroundColor = '#444';
                    });

                    menuItem.addEventListener('mouseleave', () => {
                        menuItem.style.backgroundColor = 'transparent';
                    });
                }
            }

            contextMenu.appendChild(menuItem);
        });

        document.body.appendChild(contextMenu);
        this.contextMenuVisible = true;

        // Adjust position if menu goes off screen
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${y - rect.height}px`;
        }
    }

    /**
     * Get context menu items based on context
     * @param {Object} context - Context object
     * @returns {Array} - Array of menu items
     */
    getContextMenuItems(context) {
        const items = [];
        const currentPlayer = this.gameManager.getCurrentPlayer();

        // Unit actions
        if (context.unit) {
            if (context.unit.owner === currentPlayer) {
                items.push({
                    label: 'Select Unit',
                    enabled: true,
                    action: () => this.selectUnit(context.unit)
                });

                if (!context.unit.hasActed) {
                    items.push({
                        label: 'Move Unit',
                        enabled: true,
                        action: () => this.selectUnit(context.unit)
                    });

                    items.push({
                        label: 'Wait (Skip Turn)',
                        enabled: true,
                        action: () => this.waitUnit(context.unit)
                    });
                }

                items.push({
                    label: 'Center on Unit',
                    enabled: true,
                    action: () => this.renderEngine.centerOnHex(context.unit.x, context.unit.y)
                });

                items.push({
                    label: 'Unit Details',
                    enabled: true,
                    action: () => this.showUnitDetails(context.unit)
                });

                // Hero-specific actions
                if (context.unit.type === 'HERO') {
                    items.push({
                        label: 'Hero Stats',
                        enabled: true,
                        action: () => this.showHeroStats(context.unit)
                    });

                    if (context.unit.items && context.unit.items.length > 0) {
                        items.push({
                            label: 'Manage Items',
                            enabled: true,
                            action: () => this.showItemManagement(context.unit)
                        });
                    }
                }
            } else {
                items.push({
                    label: 'Attack Unit',
                    enabled: this.selectedUnit && this.selectedUnit.owner === currentPlayer && !this.selectedUnit.hasActed,
                    action: () => this.handleUnitAction(this.selectedUnit, context.hexCoords.x, context.hexCoords.y)
                });

                items.push({
                    label: 'Enemy Unit Info',
                    enabled: true,
                    action: () => this.showUnitDetails(context.unit)
                });
            }
        }

        // City actions
        if (context.city) {
            if (context.city.owner === currentPlayer) {
                items.push({
                    label: 'Select City',
                    enabled: true,
                    action: () => this.selectCity(context.city)
                });

                items.push({
                    label: 'Produce Units',
                    enabled: true,
                    action: () => this.showCityProduction(context.city)
                });

                items.push({
                    label: 'City Management',
                    enabled: true,
                    action: () => this.showCityManagement(context.city)
                });
            } else if (context.city.owner === null) {
                items.push({
                    label: 'Capture City',
                    enabled: this.selectedUnit && this.selectedUnit.owner === currentPlayer,
                    action: () => this.handleUnitAction(this.selectedUnit, context.hexCoords.x, context.hexCoords.y)
                });
            } else {
                items.push({
                    label: 'Attack City',
                    enabled: this.selectedUnit && this.selectedUnit.owner === currentPlayer && !this.selectedUnit.hasActed,
                    action: () => this.handleUnitAction(this.selectedUnit, context.hexCoords.x, context.hexCoords.y)
                });
            }

            items.push({
                label: 'City Details',
                enabled: true,
                action: () => this.showCityDetails(context.city)
            });
        }

        // Movement actions (if unit is selected)
        if (this.selectedUnit && this.selectedUnit.owner === currentPlayer && !this.selectedUnit.hasActed) {
            const movementRange = this.gameState.getUnitMovementRange(this.selectedUnit);
            const canMoveTo = movementRange.some(hex => hex.x === context.hexCoords.x && hex.y === context.hexCoords.y);

            if (canMoveTo && !context.unit && !context.city) {
                items.push({
                    label: 'Move Here',
                    enabled: true,
                    action: () => this.handleUnitAction(this.selectedUnit, context.hexCoords.x, context.hexCoords.y)
                });
            }
        }

        // General actions
        items.push({
            label: 'Center Camera',
            enabled: true,
            action: () => {
                this.renderEngine.centerOnHex(context.hexCoords.x, context.hexCoords.y);
                this.gameManager.render();
            }
        });

        items.push({
            label: 'Terrain Info',
            enabled: true,
            action: () => this.showTerrainDetails(context.hex)
        });

        // Game actions
        if (items.length > 0) {
            items.push({ label: '---', enabled: false, action: () => { } }); // Separator
        }

        items.push({
            label: 'End Turn',
            enabled: this.gameManager.getGamePhase() === 'PLAYING',
            action: () => this.endTurn()
        });

        items.push({
            label: 'Save Game',
            enabled: true,
            action: () => this.gameManager.showSaveDialog()
        });

        items.push({
            label: 'Load Game',
            enabled: true,
            action: () => this.gameManager.showLoadDialog()
        });

        return items;
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.remove();
            this.contextMenuVisible = false;
        }
    }

    /**
     * Display terrain information (Requirement 2.4)
     * @param {Hex} hex - Hex to display info for
     * @param {number} x - Mouse X position
     * @param {number} y - Mouse Y position
     */
    displayTerrainInfo(hex, x, y) {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') return;

        // Create or update terrain info display
        let terrainInfo = document.getElementById('terrain-info');
        if (!terrainInfo) {
            terrainInfo = document.createElement('div');
            terrainInfo.id = 'terrain-info';
            terrainInfo.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                white-space: nowrap;
            `;
            document.body.appendChild(terrainInfo);
        }

        // Update content
        const movementCost = hex.getMovementCost();
        const defenseBonus = hex.getDefenseBonus ? hex.getDefenseBonus() : 0;

        terrainInfo.innerHTML = `
            <div><strong>${hex.terrain}</strong></div>
            <div>Movement Cost: ${movementCost}</div>
            <div>Defense Bonus: +${defenseBonus}</div>
            <div>Position: (${hex.x}, ${hex.y})</div>
        `;

        // Position near mouse cursor
        terrainInfo.style.left = `${x + 10}px`;
        terrainInfo.style.top = `${y - 10}px`;
        terrainInfo.style.display = 'block';
    }

    /**
     * Clear terrain information display
     */
    clearTerrainInfo() {
        const terrainInfo = document.getElementById('terrain-info');
        if (terrainInfo) {
            terrainInfo.style.display = 'none';
        }
    }

    /**
     * Display unit information in UI (Requirement 9.2)
     * @param {Unit} unit - Unit to display info for
     */
    displayUnitInfo(unit) {
        try {
            const unitDetails = document.getElementById('unit-details');
            if (unitDetails) {
                const owner = this.gameState.getPlayer(unit.owner);
                const ownerName = owner ? owner.name : 'Unknown';

                unitDetails.innerHTML = `
                    <div><strong>${unit.type}</strong></div>
                    <div>Owner: ${ownerName}</div>
                    <div>Health: ${unit.health}/${unit.getMaxHealth()}</div>
                    <div>Attack: ${unit.attack}</div>
                    <div>Defense: ${unit.defense}</div>
                    <div>Movement: ${unit.movement}</div>
                    <div>Position: (${unit.x}, ${unit.y})</div>
                    <div>Has Acted: ${unit.hasActed ? 'Yes' : 'No'}</div>
                `;
            }
        } catch (error) {
            console.error('Error displaying unit info:', error);
        }
    }

    /**
     * Display city information in UI
     * @param {City} city - City to display info for
     */
    displayCityInfo(city) {
        try {
            const cityDetails = document.getElementById('city-details');
            if (cityDetails) {
                const owner = city.owner !== null ? this.gameState.getPlayer(city.owner) : null;
                const ownerName = owner ? owner.name : 'Neutral';

                cityDetails.innerHTML = `
                    <div><strong>${city.name}</strong></div>
                    <div>Owner: ${ownerName}</div>
                    <div>Size: ${city.size}</div>
                    <div>Production: ${city.production ? city.production.type : 'None'}</div>
                    <div>Position: (${city.x}, ${city.y})</div>
                `;
            }
        } catch (error) {
            console.error('Error displaying city info:', error);
        }
    }

    /**
     * Clear unit information display
     */
    clearUnitInfo() {
        const unitDetails = document.getElementById('unit-details');
        if (unitDetails) {
            unitDetails.innerHTML = '<div>No unit selected</div>';
        }
    }

    /**
     * Display city information in UI (Requirement 9.2)
     * @param {City} city - City to display info for
     */


    /**
     * Clear city information display
     */
    clearCityInfo() {
        const cityDetails = document.getElementById('city-details');
        if (cityDetails) {
            cityDetails.innerHTML = '<div>No city selected</div>';
        }
    }

    // Keyboard shortcut actions

    moveCameraUp() {
        this.renderEngine.moveCameraBy(0, -50);
        this.gameManager.render();
    }

    moveCameraDown() {
        this.renderEngine.moveCameraBy(0, 50);
        this.gameManager.render();
    }

    moveCameraLeft() {
        this.renderEngine.moveCameraBy(-50, 0);
        this.gameManager.render();
    }

    moveCameraRight() {
        this.renderEngine.moveCameraBy(50, 0);
        this.gameManager.render();
    }

    zoomIn() {
        this.renderEngine.zoomIn(1.2);
        this.gameManager.render();
    }

    zoomOut() {
        this.renderEngine.zoomOut(1.2);
        this.gameManager.render();
    }

    fitMapToScreen() {
        const map = this.gameState ? this.gameState.getMap() : null;
        if (map) {
            this.renderEngine.zoomToFitMap(map);
            this.gameManager.render();
        }
    }

    resetCamera() {
        this.renderEngine.resetCamera();
        this.gameManager.render();
    }

    endTurn() {
        if (this.gameManager.getGamePhase() === 'PLAYING') {
            this.gameManager.endTurn();
        }
    }

    centerOnSelectedUnit() {
        if (this.selectedUnit) {
            this.renderEngine.centerOnHex(this.selectedUnit.x, this.selectedUnit.y);
            this.gameManager.render();
        }
    }

    selectNextUnit() {
        if (!this.gameState) return;

        const playerUnits = this.gameState.getPlayerUnits(this.gameManager.getCurrentPlayer());
        if (playerUnits.length === 0) return;

        let currentIndex = -1;
        if (this.selectedUnit) {
            currentIndex = playerUnits.findIndex(unit => unit.id === this.selectedUnit.id);
        }

        const nextIndex = (currentIndex + 1) % playerUnits.length;
        this.selectUnit(playerUnits[nextIndex]);
        this.gameManager.render();
    }

    selectPreviousUnit() {
        if (!this.gameState) return;

        const playerUnits = this.gameState.getPlayerUnits(this.gameManager.getCurrentPlayer());
        if (playerUnits.length === 0) return;

        let currentIndex = -1;
        if (this.selectedUnit) {
            currentIndex = playerUnits.findIndex(unit => unit.id === this.selectedUnit.id);
        }

        const prevIndex = currentIndex <= 0 ? playerUnits.length - 1 : currentIndex - 1;
        this.selectUnit(playerUnits[prevIndex]);
        this.gameManager.render();
    }

    selectUnitType(unitType) {
        if (!this.gameState) return;

        const playerUnits = this.gameState.getPlayerUnits(this.gameManager.getCurrentPlayer());
        const unitsOfType = playerUnits.filter(unit => unit.type === unitType);

        if (unitsOfType.length === 0) return;

        // If we have a selected unit of this type, select the next one
        let currentIndex = -1;
        if (this.selectedUnit && this.selectedUnit.type === unitType) {
            currentIndex = unitsOfType.findIndex(unit => unit.id === this.selectedUnit.id);
        }

        const nextIndex = (currentIndex + 1) % unitsOfType.length;
        this.selectUnit(unitsOfType[nextIndex]);
        this.gameManager.render();
    }

    toggleHelp() {
        // TODO: Implement help overlay
        console.log('Toggle help - showing keyboard shortcuts');
        this.showKeyboardShortcuts();
    }

    toggleUnitInfo() {
        const unitInfo = document.getElementById('unit-info');
        if (unitInfo) {
            unitInfo.style.display = unitInfo.style.display === 'none' ? 'block' : 'none';
        }
    }

    toggleMinimap() {
        // TODO: Implement minimap toggle
        console.log('Toggle minimap');
    }

    deleteSelectedUnit() {
        if (this.selectedUnit && this.selectedUnit.owner === this.gameManager.getCurrentPlayer()) {
            // TODO: Implement unit deletion if allowed by game rules
            console.log('Delete unit requested for:', this.selectedUnit);
        }
    }

    confirmAction() {
        // TODO: Implement action confirmation
        console.log('Action confirmed');
    }

    quickSave() {
        this.gameManager.quickSave();
    }

    quickLoad() {
        this.gameManager.quickLoad();
    }

    // Detail display methods

    showUnitDetails(unit) {
        // TODO: Show detailed unit information in a modal or expanded panel
        console.log('Show unit details:', unit);
        this.displayUnitInfo(unit);
    }

    showHeroStats(hero) {
        // TODO: Show detailed hero statistics and progression
        console.log('Show hero stats:', hero);
        this.displayUnitInfo(hero);
    }

    showItemManagement(hero) {
        // TODO: Show item management interface for hero
        console.log('Show item management for:', hero);
    }

    waitUnit(unit) {
        // Mark unit as having acted (skip turn)
        if (unit && unit.owner === this.gameManager.getCurrentPlayer()) {
            unit.hasActed = true;
            this.clearSelection();
            this.gameManager.render();
            console.log('Unit waiting (turn skipped):', unit);
        }
    }

    showCityManagement(city) {
        // TODO: Show comprehensive city management interface
        console.log('Show city management for:', city);
        this.displayCityInfo(city);
    }

    showKeyboardShortcuts() {
        // Create help overlay showing keyboard shortcuts
        this.hideKeyboardShortcuts(); // Remove existing if any

        const helpOverlay = document.createElement('div');
        helpOverlay.id = 'keyboard-shortcuts-help';
        helpOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 2000;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: monospace;
            font-size: 14px;
        `;

        helpOverlay.innerHTML = `
            <h3 style="margin-top: 0; text-align: center;">Keyboard Shortcuts</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4>Camera Controls</h4>
                    <div>W, A, S, D / Arrow Keys - Move camera</div>
                    <div>+, = - Zoom in</div>
                    <div>-, _ - Zoom out</div>
                    <div>F - Fit map to screen</div>
                    <div>Home - Reset camera</div>
                    <div>C - Center on selected unit</div>
                    
                    <h4>Game Controls</h4>
                    <div>Space / Enter - End turn</div>
                    <div>Escape - Clear selection</div>
                    <div>Tab - Select next unit</div>
                    <div>Shift+Tab - Select previous unit</div>
                </div>
                <div>
                    <h4>Unit Selection</h4>
                    <div>1 - Select warrior</div>
                    <div>2 - Select archer</div>
                    <div>3 - Select cavalry</div>
                    <div>4 - Select hero</div>
                    <div>Delete - Skip unit turn</div>
                    
                    <h4>Save/Load</h4>
                    <div>F5 / Ctrl+S - Quick save</div>
                    <div>F9 / Ctrl+O - Quick load</div>
                    
                    <h4>UI</h4>
                    <div>H - Toggle this help</div>
                    <div>I - Toggle unit info panel</div>
                    <div>M - Toggle minimap</div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="close-help-btn" style="padding: 8px 16px; background: #333; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">Close (H or Escape)</button>
            </div>
        `;

        document.body.appendChild(helpOverlay);

        // Add close button functionality
        const closeBtn = document.getElementById('close-help-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideKeyboardShortcuts());
        }

        // Close on escape or H key
        const closeHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') {
                this.hideKeyboardShortcuts();
                document.removeEventListener('keydown', closeHandler);
            }
        };
        document.addEventListener('keydown', closeHandler);
    }

    hideKeyboardShortcuts() {
        const helpOverlay = document.getElementById('keyboard-shortcuts-help');
        if (helpOverlay) {
            helpOverlay.remove();
        }
    }

    showCityDetails(city) {
        // TODO: Show detailed city information in a modal or expanded panel
        console.log('Show city details:', city);
        this.displayCityInfo(city);
    }

    showCityProduction(city) {
        // TODO: Show city production interface
        console.log('Show city production for:', city);
    }

    showTerrainDetails(hex) {
        // TODO: Show detailed terrain information
        console.log('Show terrain details:', hex);
    }

    // Getters

    getSelectedUnit() {
        return this.selectedUnit;
    }

    getHoveredHex() {
        return this.hoveredHex;
    }

    isContextMenuVisible() {
        return this.contextMenuVisible;
    }

    /**
     * Update references when game state changes
     * @param {GameState} gameState - New game state
     */
    updateGameState(gameState) {
        this.gameState = gameState;
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        const canvas = document.getElementById(this.gameManager.canvasId);
        if (canvas) {
            canvas.removeEventListener('mousedown', this.handleMouseDown);
            canvas.removeEventListener('mousemove', this.handleMouseMove);
            canvas.removeEventListener('mouseup', this.handleMouseUp);
            canvas.removeEventListener('wheel', this.handleMouseWheel);
            canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        }

        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('click', this.handleDocumentClick);
        window.removeEventListener('resize', this.handleWindowResize);

        this.hideContextMenu();
        this.clearTerrainInfo();

        console.log('InputEngine destroyed');
    }
}