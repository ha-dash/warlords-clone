/**
 * Camera - Manages viewport, scrolling, and zooming for the game
 * Handles coordinate transformations between screen and world space
 */

export class Camera {
    constructor(canvasWidth, canvasHeight) {
        this.x = 0;
        this.y = 0;
        this.zoom = 1.0;
        this.minZoom = 0.25;
        this.maxZoom = 4.0;
        
        // Canvas dimensions for coordinate calculations
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Smooth movement properties
        this.targetX = 0;
        this.targetY = 0;
        this.targetZoom = 1.0;
        this.smoothing = 0.1; // Lower = smoother, higher = more responsive
        
        console.log('Camera initialized');
    }
    
    /**
     * Update camera dimensions when canvas is resized
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    updateCanvasDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
    
    /**
     * Set camera position immediately
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * Move camera to position with smooth animation
     * @param {number} x - Target world X coordinate
     * @param {number} y - Target world Y coordinate
     */
    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * Move camera by offset
     * @param {number} dx - X offset
     * @param {number} dy - Y offset
     */
    moveBy(dx, dy) {
        this.targetX += dx;
        this.targetY += dy;
    }
    
    /**
     * Set zoom level immediately
     * @param {number} zoom - Zoom level
     */
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.targetZoom = this.zoom;
    }
    
    /**
     * Set target zoom level with smooth animation
     * @param {number} zoom - Target zoom level
     */
    zoomTo(zoom) {
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }
    
    /**
     * Zoom in by a factor
     * @param {number} factor - Zoom factor (default 1.2)
     */
    zoomIn(factor = 1.2) {
        this.zoomTo(this.targetZoom * factor);
    }
    
    /**
     * Zoom out by a factor
     * @param {number} factor - Zoom factor (default 1.2)
     */
    zoomOut(factor = 1.2) {
        this.zoomTo(this.targetZoom / factor);
    }
    
    /**
     * Zoom to fit the entire map
     * @param {number} mapWidth - Map width in world units
     * @param {number} mapHeight - Map height in world units
     * @param {number} padding - Padding around map (default 50)
     */
    zoomToFit(mapWidth, mapHeight, padding = 50) {
        const availableWidth = this.canvasWidth - padding * 2;
        const availableHeight = this.canvasHeight - padding * 2;
        
        const zoomX = availableWidth / mapWidth;
        const zoomY = availableHeight / mapHeight;
        
        const fitZoom = Math.min(zoomX, zoomY);
        this.zoomTo(Math.max(this.minZoom, Math.min(this.maxZoom, fitZoom)));
        
        // Center on map
        this.moveTo(mapWidth / 2, mapHeight / 2);
    }
    
    /**
     * Center camera on a specific world coordinate
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     */
    centerOn(worldX, worldY) {
        this.moveTo(worldX, worldY);
    }
    
    /**
     * Update camera with smooth interpolation
     * Should be called each frame
     */
    update() {
        // Smooth position interpolation
        const positionDx = this.targetX - this.x;
        const positionDy = this.targetY - this.y;
        
        if (Math.abs(positionDx) > 0.1 || Math.abs(positionDy) > 0.1) {
            this.x += positionDx * this.smoothing;
            this.y += positionDy * this.smoothing;
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }
        
        // Smooth zoom interpolation
        const zoomDiff = this.targetZoom - this.zoom;
        
        if (Math.abs(zoomDiff) > 0.01) {
            this.zoom += zoomDiff * this.smoothing;
        } else {
            this.zoom = this.targetZoom;
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} - World coordinates {x, y}
     */
    screenToWorld(screenX, screenY) {
        // Adjust for canvas center
        const centeredX = screenX - this.canvasWidth / 2;
        const centeredY = screenY - this.canvasHeight / 2;
        
        // Apply inverse zoom
        const scaledX = centeredX / this.zoom;
        const scaledY = centeredY / this.zoom;
        
        // Apply camera position
        const worldX = scaledX + this.x;
        const worldY = scaledY + this.y;
        
        return { x: worldX, y: worldY };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} - Screen coordinates {x, y}
     */
    worldToScreen(worldX, worldY) {
        // Apply camera position
        const relativeX = worldX - this.x;
        const relativeY = worldY - this.y;
        
        // Apply zoom
        const scaledX = relativeX * this.zoom;
        const scaledY = relativeY * this.zoom;
        
        // Adjust for canvas center
        const screenX = scaledX + this.canvasWidth / 2;
        const screenY = scaledY + this.canvasHeight / 2;
        
        return { x: screenX, y: screenY };
    }
    
    /**
     * Convert screen coordinates to hex coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} hexSize - Size of hex in world units
     * @param {number} hexSpacing - Spacing between hexes
     * @returns {Object} - Hex coordinates {x, y}
     */
    screenToHex(screenX, screenY, hexSize, hexSpacing = 0) {
        const world = this.screenToWorld(screenX, screenY);
        const hexTotalSize = hexSize + hexSpacing;
        
        const hexX = Math.floor(world.x / hexTotalSize);
        const hexY = Math.floor(world.y / hexTotalSize);
        
        return { x: hexX, y: hexY };
    }
    
    /**
     * Convert hex coordinates to screen coordinates
     * @param {number} hexX - Hex X coordinate
     * @param {number} hexY - Hex Y coordinate
     * @param {number} hexSize - Size of hex in world units
     * @param {number} hexSpacing - Spacing between hexes
     * @returns {Object} - Screen coordinates {x, y}
     */
    hexToScreen(hexX, hexY, hexSize, hexSpacing = 0) {
        const hexTotalSize = hexSize + hexSpacing;
        const worldX = hexX * hexTotalSize + hexSize / 2; // Center of hex
        const worldY = hexY * hexTotalSize + hexSize / 2; // Center of hex
        
        return this.worldToScreen(worldX, worldY);
    }
    
    /**
     * Check if a world coordinate is visible on screen
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} margin - Extra margin around screen (default 0)
     * @returns {boolean} - True if visible
     */
    isWorldPointVisible(worldX, worldY, margin = 0) {
        const screen = this.worldToScreen(worldX, worldY);
        
        return screen.x >= -margin && 
               screen.x <= this.canvasWidth + margin &&
               screen.y >= -margin && 
               screen.y <= this.canvasHeight + margin;
    }
    
    /**
     * Check if a hex is visible on screen
     * @param {number} hexX - Hex X coordinate
     * @param {number} hexY - Hex Y coordinate
     * @param {number} hexSize - Size of hex
     * @param {number} hexSpacing - Spacing between hexes
     * @param {number} margin - Extra margin (default 0)
     * @returns {boolean} - True if visible
     */
    isHexVisible(hexX, hexY, hexSize, hexSpacing = 0, margin = 0) {
        const hexTotalSize = hexSize + hexSpacing;
        const worldX = hexX * hexTotalSize;
        const worldY = hexY * hexTotalSize;
        
        // Check all four corners of the hex
        const corners = [
            { x: worldX, y: worldY },
            { x: worldX + hexSize, y: worldY },
            { x: worldX, y: worldY + hexSize },
            { x: worldX + hexSize, y: worldY + hexSize }
        ];
        
        // If any corner is visible, the hex is visible
        return corners.some(corner => 
            this.isWorldPointVisible(corner.x, corner.y, margin)
        );
    }
    
    /**
     * Get the visible world bounds
     * @param {number} margin - Extra margin around visible area
     * @returns {Object} - Bounds {left, right, top, bottom}
     */
    getVisibleWorldBounds(margin = 0) {
        const topLeft = this.screenToWorld(-margin, -margin);
        const bottomRight = this.screenToWorld(
            this.canvasWidth + margin, 
            this.canvasHeight + margin
        );
        
        return {
            left: topLeft.x,
            right: bottomRight.x,
            top: topLeft.y,
            bottom: bottomRight.y
        };
    }
    
    /**
     * Get camera state for serialization
     * @returns {Object} - Camera state
     */
    getState() {
        return {
            x: this.x,
            y: this.y,
            zoom: this.zoom,
            targetX: this.targetX,
            targetY: this.targetY,
            targetZoom: this.targetZoom
        };
    }
    
    /**
     * Restore camera state from serialization
     * @param {Object} state - Camera state
     */
    setState(state) {
        this.x = state.x || 0;
        this.y = state.y || 0;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, state.zoom || 1.0));
        this.targetX = state.targetX || this.x;
        this.targetY = state.targetY || this.y;
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, state.targetZoom || this.zoom));
    }
    
    /**
     * Reset camera to default state
     */
    reset() {
        this.setPosition(0, 0);
        this.setZoom(1.0);
    }
    
    /**
     * Get debug information
     * @returns {Object} - Debug info
     */
    getDebugInfo() {
        return {
            position: `(${this.x.toFixed(1)}, ${this.y.toFixed(1)})`,
            target: `(${this.targetX.toFixed(1)}, ${this.targetY.toFixed(1)})`,
            zoom: this.zoom.toFixed(2),
            targetZoom: this.targetZoom.toFixed(2),
            canvasSize: `${this.canvasWidth}x${this.canvasHeight}`
        };
    }
}