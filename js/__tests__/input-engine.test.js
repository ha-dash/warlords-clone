/**
 * Tests for InputEngine class
 * Validates input handling, keyboard shortcuts, and context menus
 */

import { InputEngine } from '../core/InputEngine.js';

describe('InputEngine', () => {
    let inputEngine;
    let mockGameManager;
    let mockCanvas;

    beforeEach(() => {
        // Create mock DOM structure
        document.body.innerHTML = `
            <div id="game-container">
                <canvas id="test-canvas" width="800" height="600"></canvas>
                <div id="unit-details"></div>
                <div id="city-details"></div>
                <div id="unit-info"></div>
            </div>
        `;

        mockCanvas = document.getElementById('test-canvas');
        
        // Create mock game manager
        mockGameManager = {
            canvasId: 'test-canvas',
            getRenderEngine: () => ({
                screenToHex: () => ({ x: 5, y: 5 }),
                setSelectedHex: () => {},
                setHighlightedHexes: () => {},
                clearSelection: () => {},
                setHoveredHex: () => {},
                clearHoveredHex: () => {},
                centerOnHex: () => {},
                moveCameraBy: () => {},
                zoomIn: () => {},
                zoomOut: () => {},
                resetCamera: () => {},
                zoomToFitMap: () => {}
            }),
            getGameState: () => ({
                getMap: () => ({
                    isValidCoordinate: () => true,
                    getHex: () => ({ 
                        terrain: 'PLAINS', 
                        getMovementCost: () => 1, 
                        getDefenseBonus: () => 0, 
                        x: 5, 
                        y: 5 
                    })
                }),
                getUnitAt: () => null,
                getCityAt: () => null,
                getUnitMovementRange: () => [],
                getPlayerUnits: () => [],
                getPlayer: (id) => ({ id, name: `Player ${id}`, color: '#0066CC' })
            }),
            getCurrentPlayer: () => 0,
            getGamePhase: () => 'PLAYING',
            endTurn: () => {},
            render: () => {},
            saveGame: () => {},
            loadGame: () => {}
        };

        inputEngine = new InputEngine(mockGameManager);
    });

    afterEach(() => {
        if (inputEngine) {
            inputEngine.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize with correct properties', () => {
            expect(inputEngine.gameManager).toBe(mockGameManager);
            expect(inputEngine.selectedUnit).toBeNull();
            expect(inputEngine.hoveredHex).toBeNull();
            expect(inputEngine.isDragging).toBe(false);
            expect(inputEngine.contextMenuVisible).toBe(false);
        });

        test('should have keyboard shortcuts configured', () => {
            expect(inputEngine.keyboardShortcuts).toBeDefined();
            expect(typeof inputEngine.keyboardShortcuts['w']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Space']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Escape']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['F5']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Ctrl+s']).toBe('function');
        });
    });

    describe('Keyboard Shortcuts', () => {
        test('should have camera movement shortcuts', () => {
            expect(typeof inputEngine.keyboardShortcuts['w']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['a']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['s']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['d']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['ArrowUp']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['ArrowDown']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['ArrowLeft']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['ArrowRight']).toBe('function');
        });

        test('should have zoom shortcuts', () => {
            expect(typeof inputEngine.keyboardShortcuts['+']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['=']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['-']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['_']).toBe('function');
        });

        test('should have game control shortcuts', () => {
            expect(typeof inputEngine.keyboardShortcuts['Space']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Enter']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Escape']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['f']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Home']).toBe('function');
        });

        test('should have save/load shortcuts', () => {
            expect(typeof inputEngine.keyboardShortcuts['F5']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['F9']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Ctrl+s']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Ctrl+o']).toBe('function');
        });

        test('should have unit selection shortcuts', () => {
            expect(typeof inputEngine.keyboardShortcuts['1']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['2']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['3']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['4']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Tab']).toBe('function');
            expect(typeof inputEngine.keyboardShortcuts['Shift+Tab']).toBe('function');
        });
    });

    describe('Context Menu', () => {
        test('should generate context menu items for empty hex', () => {
            const context = {
                unit: null,
                city: null,
                hex: { terrain: 'PLAINS', getMovementCost: () => 1 },
                hexCoords: { x: 5, y: 5 }
            };

            const items = inputEngine.getContextMenuItems(context);
            
            expect(items.length).toBeGreaterThan(0);
            expect(items.some(item => item.label === 'Center Camera')).toBe(true);
            expect(items.some(item => item.label === 'Terrain Info')).toBe(true);
            expect(items.some(item => item.label === 'End Turn')).toBe(true);
            expect(items.some(item => item.label === 'Save Game')).toBe(true);
            expect(items.some(item => item.label === 'Load Game')).toBe(true);
        });

        test('should include unit-specific actions for owned units', () => {
            const mockUnit = {
                owner: 0,
                type: 'WARRIOR',
                hasActed: false,
                x: 5,
                y: 5
            };

            const context = {
                unit: mockUnit,
                city: null,
                hex: { terrain: 'PLAINS' },
                hexCoords: { x: 5, y: 5 }
            };

            const items = inputEngine.getContextMenuItems(context);
            
            expect(items.some(item => item.label === 'Select Unit')).toBe(true);
            expect(items.some(item => item.label === 'Move Unit')).toBe(true);
            expect(items.some(item => item.label === 'Unit Details')).toBe(true);
            expect(items.some(item => item.label === 'Wait (Skip Turn)')).toBe(true);
            expect(items.some(item => item.label === 'Center on Unit')).toBe(true);
        });

        test('should include city-specific actions for owned cities', () => {
            const mockCity = {
                owner: 0,
                name: 'Test City',
                x: 5,
                y: 5
            };

            const context = {
                unit: null,
                city: mockCity,
                hex: { terrain: 'PLAINS' },
                hexCoords: { x: 5, y: 5 }
            };

            const items = inputEngine.getContextMenuItems(context);
            
            expect(items.some(item => item.label === 'Select City')).toBe(true);
            expect(items.some(item => item.label === 'Produce Units')).toBe(true);
            expect(items.some(item => item.label === 'City Details')).toBe(true);
            expect(items.some(item => item.label === 'City Management')).toBe(true);
        });

        test('should include attack actions for enemy units', () => {
            const mockEnemyUnit = {
                owner: 1, // Different from current player (0)
                type: 'WARRIOR',
                x: 5,
                y: 5
            };

            // Set up a selected unit for the current player
            inputEngine.selectedUnit = {
                owner: 0,
                type: 'WARRIOR',
                hasActed: false
            };

            const context = {
                unit: mockEnemyUnit,
                city: null,
                hex: { terrain: 'PLAINS' },
                hexCoords: { x: 5, y: 5 }
            };

            const items = inputEngine.getContextMenuItems(context);
            
            expect(items.some(item => item.label === 'Attack Unit')).toBe(true);
            expect(items.some(item => item.label === 'Enemy Unit Info')).toBe(true);
        });
    });

    describe('Unit Selection', () => {
        test('should select unit and update state', () => {
            const mockUnit = {
                id: 'unit1',
                owner: 0,
                type: 'WARRIOR',
                x: 5,
                y: 5,
                hasActed: false,
                health: 10,
                attack: 3,
                defense: 2,
                movement: 2,
                getMaxHealth: () => 10
            };

            inputEngine.selectUnit(mockUnit);

            expect(inputEngine.selectedUnit).toBe(mockUnit);
        });

        test('should clear selection', () => {
            const mockUnit = { id: 'unit1', owner: 0, x: 5, y: 5 };
            inputEngine.selectedUnit = mockUnit;

            inputEngine.clearSelection();

            expect(inputEngine.selectedUnit).toBeNull();
        });
    });

    describe('Terrain Information', () => {
        test('should display terrain info', () => {
            const mockHex = {
                terrain: 'FOREST',
                getMovementCost: () => 2,
                getDefenseBonus: () => 1,
                x: 5,
                y: 5
            };

            // This should not throw an error
            expect(() => {
                inputEngine.displayTerrainInfo(mockHex, 100, 100);
            }).not.toThrow();
        });

        test('should clear terrain info', () => {
            // This should not throw an error
            expect(() => {
                inputEngine.clearTerrainInfo();
            }).not.toThrow();
        });
    });

    describe('Utility Methods', () => {
        test('should provide getters for state', () => {
            expect(inputEngine.getSelectedUnit()).toBeNull();
            expect(inputEngine.getHoveredHex()).toBeNull();
            expect(inputEngine.isContextMenuVisible()).toBe(false);
        });

        test('should update game state reference', () => {
            const newGameState = { test: 'state' };
            inputEngine.updateGameState(newGameState);
            expect(inputEngine.gameState).toBe(newGameState);
        });

        test('should handle keyboard shortcuts help', () => {
            expect(() => {
                inputEngine.showKeyboardShortcuts();
                inputEngine.hideKeyboardShortcuts();
            }).not.toThrow();
        });
    });
});