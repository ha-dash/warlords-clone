/**
 * Main entry point for Warlords Clone
 * Initializes the game and sets up the main game loop
 * 
 * This is the final integration point that wires all systems together:
 * - GameManager (central coordinator)
 * - GameState (state management)
 * - RenderEngine (graphics and UI)
 * - InputEngine (user interaction)
 * - AIEngine (computer players)
 * - Save/Load system (persistence)
 */

import { GameManager } from './core/GameManager.js';

// Global game instance
let gameManager = null;
let gameLoopId = null;
let lastFrameTime = 0;

// Game loop configuration
const GAME_LOOP_CONFIG = {
    targetFPS: 60,
    maxDeltaTime: 1000 / 30, // Cap at 30 FPS minimum to prevent large jumps
    enableVSync: true
};

/**
 * Initialize the game when the DOM is loaded
 * This ensures proper initialization order of all systems
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Warlords Clone - Starting initialization...');
    
    try {
        // Validate browser environment
        if (!validateBrowserSupport()) {
            showError('Your browser does not support required features. Please use a modern browser.');
            return;
        }
        
        // Initialize the game manager (this will initialize all subsystems)
        console.log('Creating GameManager...');
        gameManager = new GameManager('game-canvas');
        
        // Set up UI event listeners before game initialization
        console.log('Setting up UI event listeners...');
        setupUIEventListeners();
        
        // Set up global error handling
        setupErrorHandling();
        
        // Initialize the game with default configuration
        console.log('Initializing game with default configuration...');
        const defaultConfig = createDefaultGameConfig();
        
        gameManager.initializeGame(defaultConfig);
        
        // Start the main game loop
        console.log('Starting main game loop...');
        startGameLoop();
        
        // Set up window event handlers
        setupWindowEventHandlers();
        
        console.log('Warlords Clone - Initialization complete!');
        
        // Show welcome message
        showMessage('Welcome to Warlords Clone! Click on units to select them, then click on hexes to move.');
        
    } catch (error) {
        console.error('Failed to initialize Warlords Clone:', error);
        showError(`Failed to initialize game: ${error.message}. Please refresh the page.`);
    }
});

/**
 * Validate browser support for required features
 * @returns {boolean} - True if browser is supported
 */
function validateBrowserSupport() {
    // Check for Canvas support
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.getContext('2d')) {
        console.error('Canvas 2D not supported');
        return false;
    }
    
    // Check for Local Storage support
    try {
        const testKey = '__warlords_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
    } catch (e) {
        console.error('Local Storage not supported');
        return false;
    }
    
    // Check for ES6 module support (already loaded if we get here)
    if (typeof Map === 'undefined' || typeof Set === 'undefined') {
        console.error('ES6 features not supported');
        return false;
    }
    
    return true;
}

/**
 * Create default game configuration
 * @returns {Object} - Default game configuration
 */
function createDefaultGameConfig() {
    return {
        map: {
            width: 20,
            height: 15,
            hexSize: 32
        },
        players: [
            { 
                id: 0, 
                name: 'Player 1', 
                faction: 'HUMANS', 
                color: '#0066CC', 
                isAI: false 
            },
            { 
                id: 1, 
                name: 'AI 1', 
                faction: 'ELVES', 
                color: '#00CC66', 
                isAI: true 
            },
            { 
                id: 2, 
                name: 'AI 2', 
                faction: 'DEMONS', 
                color: '#CC0066', 
                isAI: true 
            }
        ],
        gameSettings: {
            enableAnimations: true,
            enableSounds: false, // Not implemented yet
            autoSave: true,
            autoSaveInterval: 300000, // 5 minutes
            difficultyLevel: 'normal'
        }
    };
}

/**
 * Start the main game loop
 * This handles continuous rendering and game state updates
 */
function startGameLoop() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    
    lastFrameTime = performance.now();
    
    function gameLoop(currentTime) {
        try {
            // Calculate delta time
            const deltaTime = Math.min(currentTime - lastFrameTime, GAME_LOOP_CONFIG.maxDeltaTime);
            lastFrameTime = currentTime;
            
            // Update game systems
            if (gameManager && gameManager.isGameInitialized()) {
                // Update game logic (if needed for animations, etc.)
                updateGameLogic(deltaTime);
                
                // Render the game
                gameManager.render();
            }
            
            // Schedule next frame
            gameLoopId = requestAnimationFrame(gameLoop);
            
        } catch (error) {
            console.error('Error in game loop:', error);
            // Continue the loop even if there's an error
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }
    
    // Start the loop
    gameLoopId = requestAnimationFrame(gameLoop);
    console.log('Main game loop started');
}

/**
 * Update game logic (animations, effects, etc.)
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateGameLogic(deltaTime) {
    // This is where we would update:
    // - Animation systems
    // - Particle effects
    // - UI transitions
    // - Sound effects
    // - Auto-save timer
    
    // For now, this is mostly a placeholder for future enhancements
    // The main game logic is handled by the turn-based system in GameManager
}

/**
 * Set up window event handlers for proper cleanup and responsiveness
 */
function setupWindowEventHandlers() {
    // Handle window resize
    window.addEventListener('resize', () => {
        if (gameManager && gameManager.getRenderEngine()) {
            // Resize canvas to maintain aspect ratio
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                const container = canvas.parentElement;
                const containerRect = container.getBoundingClientRect();
                
                // Maintain aspect ratio while fitting container
                const aspectRatio = 4/3; // 800x600 default
                let newWidth = containerRect.width;
                let newHeight = newWidth / aspectRatio;
                
                if (newHeight > containerRect.height) {
                    newHeight = containerRect.height;
                    newWidth = newHeight * aspectRatio;
                }
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                canvas.style.width = newWidth + 'px';
                canvas.style.height = newHeight + 'px';
                
                // Update camera viewport
                const renderEngine = gameManager.getRenderEngine();
                if (renderEngine.camera) {
                    renderEngine.camera.setViewportSize(newWidth, newHeight);
                }
                
                // Trigger re-render
                gameManager.render();
            }
        }
    });
    
    // Handle page visibility changes (pause/resume)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden - pause game loop for performance
            if (gameLoopId) {
                cancelAnimationFrame(gameLoopId);
                gameLoopId = null;
                console.log('Game loop paused (page hidden)');
            }
        } else {
            // Page is visible - resume game loop
            if (!gameLoopId && gameManager) {
                startGameLoop();
                console.log('Game loop resumed (page visible)');
            }
        }
    });
    
    // Handle beforeunload for auto-save
    window.addEventListener('beforeunload', (event) => {
        if (gameManager && gameManager.isGameInitialized()) {
            try {
                // Quick auto-save before leaving
                gameManager.saveGame(9, 'Auto-save on exit');
                console.log('Auto-saved game before page unload');
            } catch (error) {
                console.error('Failed to auto-save on exit:', error);
            }
        }
    });
    
    // Handle keyboard shortcuts globally
    document.addEventListener('keydown', (event) => {
        // Global shortcuts that work regardless of focus
        switch (event.key) {
            case 'F11':
                // Let browser handle fullscreen
                break;
            case 'F5':
                // Let browser handle refresh, but warn about unsaved changes
                if (gameManager && gameManager.isGameInitialized()) {
                    event.preventDefault();
                    if (confirm('Are you sure you want to refresh? Any unsaved progress will be lost.')) {
                        location.reload();
                    }
                }
                break;
            default:
                // Let InputEngine handle other keys
                break;
        }
    });
}

/**
 * Set up global error handling
 */
function setupErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        console.error('Uncaught error:', event.error);
        showError('An unexpected error occurred. The game may not function properly.');
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError('An unexpected error occurred. The game may not function properly.');
    });
}
/**
 * Set up event listeners for UI elements
 * This ensures all UI controls are properly connected to game systems
 */
function setupUIEventListeners() {
    // End turn button
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        endTurnBtn.addEventListener('click', () => {
            if (gameManager && gameManager.isGameInitialized()) {
                const currentPlayer = gameManager.getGameState().getPlayer(gameManager.getCurrentPlayer());
                if (currentPlayer && !currentPlayer.isAI) {
                    gameManager.endTurn();
                }
            }
        });
    } else {
        console.warn('End turn button not found in DOM');
    }
    
    // Save game button
    const saveGameBtn = document.getElementById('save-game-btn');
    if (saveGameBtn) {
        saveGameBtn.addEventListener('click', () => {
            if (gameManager && gameManager.isGameInitialized()) {
                gameManager.showSaveDialog();
            } else {
                showMessage('Cannot save - game not initialized', 'error');
            }
        });
    } else {
        console.warn('Save game button not found in DOM');
    }
    
    // Load game button
    const loadGameBtn = document.getElementById('load-game-btn');
    if (loadGameBtn) {
        loadGameBtn.addEventListener('click', () => {
            if (gameManager) {
                gameManager.showLoadDialog();
            }
        });
    } else {
        console.warn('Load game button not found in DOM');
    }
    
    // Set up keyboard shortcuts for UI
    document.addEventListener('keydown', (event) => {
        if (!gameManager || !gameManager.isGameInitialized()) {
            return;
        }
        
        // Check for modifier keys to avoid conflicts
        if (event.ctrlKey || event.altKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    gameManager.quickSave();
                    break;
                case 'l':
                    event.preventDefault();
                    gameManager.quickLoad();
                    break;
                case 'n':
                    event.preventDefault();
                    if (confirm('Start a new game? Current progress will be lost.')) {
                        gameManager.startNewGame();
                    }
                    break;
            }
        }
    });
    
    // Set up context menu prevention on canvas (let InputEngine handle right-clicks)
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    console.log('UI event listeners set up successfully');
}

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    console.error('Error:', message);
    
    // Create error overlay
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #e74c3c;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 2000;
        text-align: center;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        max-width: 400px;
        font-family: Arial, sans-serif;
    `;
    errorDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">Error</h3>
        <p style="margin: 0 0 15px 0;">${message}</p>
        <button onclick="this.parentElement.remove()" style="
            background-color: #c0392b;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        ">Close</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove error after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

/**
 * Display informational message to user
 * @param {string} message - Message to display
 * @param {string} type - Message type ('info', 'success', 'warning', 'error')
 */
function showMessage(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    const colors = {
        info: '#3498db',
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        z-index: 1500;
        font-weight: bold;
        background-color: ${colors[type] || colors.info};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        max-width: 300px;
        font-family: Arial, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add CSS animation
    if (!document.getElementById('message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Remove message after 4 seconds with animation
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 4000);
}

/**
 * Clean up resources when page is unloaded
 */
function cleanup() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    if (gameManager) {
        // Perform any necessary cleanup
        console.log('Cleaning up game resources...');
    }
}

// Set up cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Export for potential external access and debugging
export { gameManager, showMessage, showError };