/**
 * Tests for RenderEngine class
 */

import { RenderEngine } from '../core/RenderEngine.js';
import { GameState } from '../core/GameState.js';
import { Map } from '../core/Map.js';
import { Hex } from '../core/Hex.js';

// Mock DOM elements for testing
const mockCanvas = {
    width: 800,
    height: 600,
    getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        stroke: () => {},
        fill: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        fillText: () => {},
        setLineDash: () => {},
        set fillStyle(value) {},
        set strokeStyle(value) {},
        set lineWidth(value) {},
        set font(value) {},
        set textAlign(value) {},
        set textBaseline(value) {}
    })
};

describe('RenderEngine', () => {
    let renderEngine;
    let gameState;
    let map;

    beforeEach(() => {
        // Create a mock HTML structure for testing
        document.body.innerHTML = `
            <div id="game-container">
                <canvas id="test-canvas" width="800" height="600"></canvas>
            </div>
        `;
        
        // Mock canvas getContext method
        const canvas = document.getElementById('test-canvas');
        canvas.getContext = () => ({
            clearRect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            arc: () => {},
            stroke: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: () => {},
            fillText: () => {},
            setLineDash: () => {},
            set fillStyle(value) {},
            set strokeStyle(value) {},
            set lineWidth(value) {},
            set font(value) {},
            set textAlign(value) {},
            set textBaseline(value) {}
        });
        
        // Create render engine
        renderEngine = new RenderEngine('test-canvas');
        
        // Create test game state
        gameState = new GameState();
        map = new Map(10, 8);
        
        // Mock gameState methods
        gameState.getMap = () => map;
        gameState.getCities = () => new Map();
        gameState.getUnits = () => new Map();
        gameState.getPlayer = () => ({ name: 'Test Player', color: '#FF0000' });
    });
    
    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
    });

    describe('Constructor', () => {
        test('should initialize with valid canvas ID', () => {
            expect(renderEngine).toBeDefined();
            expect(renderEngine.canvas).toBeDefined();
            expect(renderEngine.canvas.id).toBe('test-canvas');
            expect(renderEngine.ctx).toBeDefined();
            expect(renderEngine.camera).toBeDefined();
        });

        test('should throw error with invalid canvas ID', () => {
            expect(() => new RenderEngine('invalid-canvas')).toThrow('Canvas element with id \'invalid-canvas\' not found');
        });
    });

    describe('Rendering', () => {
        test('should render without errors', () => {
            expect(() => renderEngine.render(gameState)).not.toThrow();
        });

        test('should handle null game state', () => {
            expect(() => renderEngine.render(null)).not.toThrow();
        });

        test('should render map when provided', () => {
            renderEngine.render(gameState);
            
            // Verify map rendering was attempted
            expect(gameState.getMap()).toBe(map);
        });
    });

    describe('Camera Controls', () => {
        test('should set camera position', () => {
            renderEngine.setCameraPosition(100, 200);
            expect(renderEngine.camera.x).toBe(100);
            expect(renderEngine.camera.y).toBe(200);
        });

        test('should move camera smoothly', () => {
            renderEngine.moveCameraTo(150, 250);
            expect(renderEngine.camera.targetX).toBe(150);
            expect(renderEngine.camera.targetY).toBe(250);
        });

        test('should set zoom level', () => {
            renderEngine.setCameraZoom(2.0);
            expect(renderEngine.camera.zoom).toBe(2.0);
        });

        test('should zoom in and out', () => {
            const initialZoom = renderEngine.camera.zoom;
            
            renderEngine.zoomIn(1.5);
            expect(renderEngine.camera.targetZoom).toBe(initialZoom * 1.5);
            
            renderEngine.zoomOut(1.5);
            expect(renderEngine.camera.targetZoom).toBe(initialZoom);
        });

        test('should center on hex', () => {
            renderEngine.centerOnHex(5, 3);
            
            const expectedX = 5 * (renderEngine.config.hexSize + renderEngine.config.hexSpacing) + renderEngine.config.hexSize / 2;
            const expectedY = 3 * (renderEngine.config.hexSize + renderEngine.config.hexSpacing) + renderEngine.config.hexSize / 2;
            
            expect(renderEngine.camera.targetX).toBe(expectedX);
            expect(renderEngine.camera.targetY).toBe(expectedY);
        });
    });

    describe('Coordinate Conversion', () => {
        test('should convert screen to world coordinates', () => {
            const world = renderEngine.screenToWorld(400, 300);
            expect(world).toHaveProperty('x');
            expect(world).toHaveProperty('y');
            expect(typeof world.x).toBe('number');
            expect(typeof world.y).toBe('number');
        });

        test('should convert world to screen coordinates', () => {
            const screen = renderEngine.worldToScreen(100, 100);
            expect(screen).toHaveProperty('x');
            expect(screen).toHaveProperty('y');
            expect(typeof screen.x).toBe('number');
            expect(typeof screen.y).toBe('number');
        });

        test('should convert screen to hex coordinates', () => {
            const hex = renderEngine.screenToHex(400, 300);
            expect(hex).toHaveProperty('x');
            expect(hex).toHaveProperty('y');
            expect(Number.isInteger(hex.x)).toBe(true);
            expect(Number.isInteger(hex.y)).toBe(true);
        });

        test('should convert hex to screen coordinates', () => {
            const screen = renderEngine.hexToScreen(5, 3);
            expect(screen).toHaveProperty('x');
            expect(screen).toHaveProperty('y');
            expect(typeof screen.x).toBe('number');
            expect(typeof screen.y).toBe('number');
        });

        test('should check hex visibility', () => {
            const isVisible = renderEngine.isHexVisible(0, 0);
            expect(typeof isVisible).toBe('boolean');
        });
    });

    describe('Selection and Highlighting', () => {
        test('should set selected hex', () => {
            renderEngine.setSelectedHex(3, 4);
            expect(renderEngine.selectedHex).toEqual({ x: 3, y: 4 });
        });

        test('should clear selection', () => {
            renderEngine.setSelectedHex(3, 4);
            renderEngine.setHighlightedHexes([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
            
            renderEngine.clearSelection();
            
            expect(renderEngine.selectedHex).toBeNull();
            expect(renderEngine.highlightedHexes).toEqual([]);
        });

        test('should set highlighted hexes', () => {
            const hexes = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
            renderEngine.setHighlightedHexes(hexes);
            expect(renderEngine.highlightedHexes).toEqual(hexes);
        });

        test('should set and clear hovered hex', () => {
            renderEngine.setHoveredHex(5, 6);
            expect(renderEngine.hoveredHex).toEqual({ x: 5, y: 6 });
            
            renderEngine.clearHoveredHex();
            expect(renderEngine.hoveredHex).toBeNull();
        });
    });

    describe('Canvas Management', () => {
        test('should get canvas dimensions', () => {
            const dimensions = renderEngine.getCanvasDimensions();
            expect(dimensions).toEqual({ width: 800, height: 600 });
        });

        test('should resize canvas', () => {
            renderEngine.resizeCanvas(1024, 768);
            expect(renderEngine.canvas.width).toBe(1024);
            expect(renderEngine.canvas.height).toBe(768);
        });

        test('should handle canvas resize with camera update', () => {
            renderEngine.handleCanvasResize(1024, 768);
            expect(renderEngine.canvas.width).toBe(1024);
            expect(renderEngine.canvas.height).toBe(768);
            expect(renderEngine.camera.canvasWidth).toBe(1024);
            expect(renderEngine.camera.canvasHeight).toBe(768);
        });
    });

    describe('Debug Features', () => {
        test('should toggle debug info', () => {
            const initialState = renderEngine.showDebugInfo;
            renderEngine.toggleDebugInfo();
            expect(renderEngine.showDebugInfo).toBe(!initialState);
        });

        test('should get camera debug info', () => {
            const debugInfo = renderEngine.getCameraDebugInfo();
            expect(debugInfo).toHaveProperty('position');
            expect(debugInfo).toHaveProperty('zoom');
            expect(debugInfo).toHaveProperty('canvasSize');
        });

        test('should reset camera', () => {
            renderEngine.setCameraPosition(100, 200);
            renderEngine.setCameraZoom(2.0);
            
            renderEngine.resetCamera();
            
            expect(renderEngine.camera.x).toBe(0);
            expect(renderEngine.camera.y).toBe(0);
            expect(renderEngine.camera.zoom).toBe(1.0);
        });
    });
});