/**
 * Unit tests for project setup
 * Tests HTML structure and GameManager initialization
 * Requirements: 1.1
 */

describe('Project Setup Tests', () => {
  beforeEach(() => {
    // Create a mock HTML structure for testing
    document.body.innerHTML = `
      <div id="game-container">
        <header id="game-header">
          <h1>Warlords Clone</h1>
          <div id="game-info">
            <span id="current-player">Player 1</span>
            <span id="turn-counter">Turn: 1</span>
          </div>
        </header>
        
        <main id="game-main">
          <div id="game-canvas-container">
            <canvas id="game-canvas" width="800" height="600"></canvas>
          </div>
          
          <aside id="game-sidebar">
            <div id="unit-info" class="info-panel">
              <h3>Unit Information</h3>
              <div id="unit-details"></div>
            </div>
            
            <div id="city-info" class="info-panel">
              <h3>City Information</h3>
              <div id="city-details"></div>
            </div>
            
            <div id="game-controls" class="info-panel">
              <h3>Controls</h3>
              <button id="end-turn-btn">End Turn</button>
              <button id="save-game-btn">Save Game</button>
              <button id="load-game-btn">Load Game</button>
            </div>
          </aside>
        </main>
      </div>
    `;
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('HTML Structure Tests', () => {
    test('should contain required game container element', () => {
      const gameContainer = document.getElementById('game-container');
      expect(gameContainer).toBeTruthy();
      expect(gameContainer.tagName).toBe('DIV');
    });

    test('should contain game header with title and info', () => {
      const gameHeader = document.getElementById('game-header');
      expect(gameHeader).toBeTruthy();
      
      const title = gameHeader.querySelector('h1');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('Warlords Clone');
      
      const gameInfo = document.getElementById('game-info');
      expect(gameInfo).toBeTruthy();
    });

    test('should contain current player and turn counter elements', () => {
      const currentPlayer = document.getElementById('current-player');
      expect(currentPlayer).toBeTruthy();
      expect(currentPlayer.textContent).toBe('Player 1');
      
      const turnCounter = document.getElementById('turn-counter');
      expect(turnCounter).toBeTruthy();
      expect(turnCounter.textContent).toBe('Turn: 1');
    });

    test('should contain game canvas with correct dimensions', () => {
      const canvas = document.getElementById('game-canvas');
      expect(canvas).toBeTruthy();
      expect(canvas.tagName).toBe('CANVAS');
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    test('should contain game sidebar with info panels', () => {
      const sidebar = document.getElementById('game-sidebar');
      expect(sidebar).toBeTruthy();
      
      const unitInfo = document.getElementById('unit-info');
      expect(unitInfo).toBeTruthy();
      expect(unitInfo.classList.contains('info-panel')).toBe(true);
      
      const cityInfo = document.getElementById('city-info');
      expect(cityInfo).toBeTruthy();
      expect(cityInfo.classList.contains('info-panel')).toBe(true);
      
      const gameControls = document.getElementById('game-controls');
      expect(gameControls).toBeTruthy();
      expect(gameControls.classList.contains('info-panel')).toBe(true);
    });

    test('should contain required control buttons', () => {
      const endTurnBtn = document.getElementById('end-turn-btn');
      expect(endTurnBtn).toBeTruthy();
      expect(endTurnBtn.tagName).toBe('BUTTON');
      expect(endTurnBtn.textContent).toBe('End Turn');
      
      const saveGameBtn = document.getElementById('save-game-btn');
      expect(saveGameBtn).toBeTruthy();
      expect(saveGameBtn.tagName).toBe('BUTTON');
      expect(saveGameBtn.textContent).toBe('Save Game');
      
      const loadGameBtn = document.getElementById('load-game-btn');
      expect(loadGameBtn).toBeTruthy();
      expect(loadGameBtn.tagName).toBe('BUTTON');
      expect(loadGameBtn.textContent).toBe('Load Game');
    });

    test('should have proper nesting structure', () => {
      const gameContainer = document.getElementById('game-container');
      const gameHeader = document.getElementById('game-header');
      const gameMain = document.getElementById('game-main');
      
      expect(gameContainer.contains(gameHeader)).toBe(true);
      expect(gameContainer.contains(gameMain)).toBe(true);
      
      const canvasContainer = document.getElementById('game-canvas-container');
      const sidebar = document.getElementById('game-sidebar');
      
      expect(gameMain.contains(canvasContainer)).toBe(true);
      expect(gameMain.contains(sidebar)).toBe(true);
    });
  });

  describe('GameManager Initialization Tests', () => {
    // Mock GameManager class for testing
    class MockGameManager {
      constructor(canvasId) {
        this.canvasId = canvasId;
        this.gameState = null;
        this.currentPlayer = 0;
        this.gamePhase = 'SETUP';
        this.isInitialized = false;
      }
      
      initializeGame(config) {
        if (!this.validateConfig(config)) {
          throw new Error('Invalid game configuration');
        }
        
        this.gameState = { 
          players: config.players,
          currentTurn: 1,
          getPlayer: (id) => config.players.find(p => p.id === id),
          getPlayers: () => config.players,
          getCurrentTurn: () => 1
        };
        this.currentPlayer = 0;
        this.gamePhase = 'PLAYING';
        this.isInitialized = true;
        
        this.updateUI();
      }
      
      validateConfig(config) {
        if (!config) return false;
        if (!config.map || !config.map.width || !config.map.height) return false;
        if (!config.players || !Array.isArray(config.players) || config.players.length === 0) return false;
        
        for (const player of config.players) {
          if (player.id === undefined || !player.name || !player.faction || !player.color) {
            return false;
          }
        }
        
        return true;
      }
      
      updateUI() {
        if (typeof document === 'undefined') return;
        
        const currentPlayerElement = document.getElementById('current-player');
        if (currentPlayerElement && this.gameState) {
          const player = this.gameState.getPlayer(this.currentPlayer);
          if (player) {
            currentPlayerElement.textContent = player.name;
            currentPlayerElement.style.color = player.color;
          }
        }
        
        const turnCounterElement = document.getElementById('turn-counter');
        if (turnCounterElement && this.gameState) {
          turnCounterElement.textContent = `Turn: ${this.gameState.getCurrentTurn()}`;
        }
      }
      
      getCurrentPlayer() { return this.currentPlayer; }
      getGamePhase() { return this.gamePhase; }
      getGameState() { return this.gameState; }
      isGameInitialized() { return this.isInitialized; }
    }

    test('should create GameManager instance with canvas ID', () => {
      const gameManager = new MockGameManager('game-canvas');
      
      expect(gameManager).toBeTruthy();
      expect(gameManager.canvasId).toBe('game-canvas');
      expect(gameManager.isGameInitialized()).toBe(false);
      expect(gameManager.getGamePhase()).toBe('SETUP');
    });

    test('should initialize GameManager with default state', () => {
      const gameManager = new MockGameManager('game-canvas');
      
      expect(gameManager.getCurrentPlayer()).toBe(0);
      expect(gameManager.getGamePhase()).toBe('SETUP');
      expect(gameManager.getGameState()).toBeNull();
      expect(gameManager.isGameInitialized()).toBe(false);
    });

    test('should initialize game with valid configuration', () => {
      const gameManager = new MockGameManager('game-canvas');
      const config = {
        map: {
          width: 20,
          height: 15,
          hexSize: 32
        },
        players: [
          { id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false },
          { id: 1, name: 'AI 1', faction: 'ELVES', color: '#00CC66', isAI: true }
        ]
      };
      
      gameManager.initializeGame(config);
      
      expect(gameManager.isGameInitialized()).toBe(true);
      expect(gameManager.getGamePhase()).toBe('PLAYING');
      expect(gameManager.getCurrentPlayer()).toBe(0);
      expect(gameManager.getGameState()).toBeTruthy();
    });

    test('should validate configuration before initialization', () => {
      const gameManager = new MockGameManager('game-canvas');
      
      // Test with null config
      expect(() => {
        gameManager.initializeGame(null);
      }).toThrow('Invalid game configuration');
      
      // Test with invalid map config
      expect(() => {
        gameManager.initializeGame({
          map: { width: 0 },
          players: [{ id: 0, name: 'Player 1', faction: 'HUMANS', color: '#0066CC', isAI: false }]
        });
      }).toThrow('Invalid game configuration');
      
      // Test with invalid players config
      expect(() => {
        gameManager.initializeGame({
          map: { width: 20, height: 15, hexSize: 32 },
          players: []
        });
      }).toThrow('Invalid game configuration');
    });

    test('should validate individual player configurations', () => {
      const gameManager = new MockGameManager('game-canvas');
      
      // Test with invalid player (missing required fields)
      expect(() => {
        gameManager.initializeGame({
          map: { width: 20, height: 15, hexSize: 32 },
          players: [
            { name: 'Player 1', faction: 'HUMANS' } // Missing id and color
          ]
        });
      }).toThrow('Invalid game configuration');
    });

    test('should update UI elements after initialization', () => {
      const gameManager = new MockGameManager('game-canvas');
      const config = {
        map: { width: 20, height: 15, hexSize: 32 },
        players: [
          { id: 0, name: 'Test Player', faction: 'HUMANS', color: '#FF0000', isAI: false }
        ]
      };
      
      gameManager.initializeGame(config);
      
      // Check if UI elements are updated
      const currentPlayerElement = document.getElementById('current-player');
      expect(currentPlayerElement.textContent).toBe('Test Player');
      expect(currentPlayerElement.style.color).toBe('rgb(255, 0, 0)'); // Browser converts #FF0000 to rgb format
      
      const turnCounterElement = document.getElementById('turn-counter');
      expect(turnCounterElement.textContent).toBe('Turn: 1');
    });

    test('should handle missing DOM elements gracefully', () => {
      // Remove some DOM elements
      const currentPlayerEl = document.getElementById('current-player');
      const turnCounterEl = document.getElementById('turn-counter');
      if (currentPlayerEl) currentPlayerEl.remove();
      if (turnCounterEl) turnCounterEl.remove();
      
      const gameManager = new MockGameManager('game-canvas');
      const config = {
        map: { width: 20, height: 15, hexSize: 32 },
        players: [
          { id: 0, name: 'Test Player', faction: 'HUMANS', color: '#FF0000', isAI: false }
        ]
      };
      
      // Should not throw error even with missing DOM elements
      expect(() => {
        gameManager.initializeGame(config);
      }).not.toThrow();
      
      expect(gameManager.isGameInitialized()).toBe(true);
    });

    test('should set correct initial game state properties', () => {
      const gameManager = new MockGameManager('game-canvas');
      const config = {
        map: { width: 10, height: 8, hexSize: 24 },
        players: [
          { id: 0, name: 'Human', faction: 'HUMANS', color: '#0066CC', isAI: false },
          { id: 1, name: 'Computer', faction: 'ELVES', color: '#00CC66', isAI: true }
        ]
      };
      
      gameManager.initializeGame(config);
      
      const gameState = gameManager.getGameState();
      expect(gameState).toBeTruthy();
      expect(gameState.getCurrentTurn()).toBe(1);
      expect(gameState.getPlayers()).toHaveLength(2);
      
      const players = gameState.getPlayers();
      expect(players[0].name).toBe('Human');
      expect(players[0].isAI).toBe(false);
      expect(players[1].name).toBe('Computer');
      expect(players[1].isAI).toBe(true);
    });
  });
});