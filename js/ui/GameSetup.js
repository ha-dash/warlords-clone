/**
 * GameSetup - Setup screen for new game configuration
 * Uses shadcn/ui styled components
 */

export class GameSetup {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.container = document.getElementById('game-setup');

        if (!this.container) {
            console.error('Game setup container not found');
            return;
        }

        this.render();
    }

    render() {
        // Apply shadcn theme styles
        this.container.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000;
            background-color: hsl(var(--background) / 0.95);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
        `;

        this.container.innerHTML = `
            <div class="card" style="max-width: 500px; width: 90%; margin: 2rem auto;">
                <div class="card-header">
                    <h1 class="card-title" style="text-align: center; margin-bottom: 0.5rem;">New Game</h1>
                    <p class="card-description" style="text-align: center;">Configure your game settings</p>
                </div>
                
                <div class="card-content" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div class="tool-group">
                        <label class="label" for="map-size">Map Size</label>
                        <select id="map-size" class="input">
                            <option value="small">Small (20x15)</option>
                            <option value="medium" selected>Medium (40x30)</option>
                            <option value="large">Large (60x45)</option>
                        </select>
                    </div>

                    <div class="tool-group">
                        <label class="label" for="player-name">Your Faction</label>
                        <div style="display: flex; gap: 0.75rem;">
                            <input type="text" id="player-name" value="Player 1" placeholder="Name" class="input" style="flex: 1;">
                            <select id="player-faction" class="input" style="flex: 1;">
                                <option value="HUMANS">Humans</option>
                                <option value="ELVES">Elves</option>
                                <option value="DEMONS">Demons</option>
                                <option value="DWARVES">Dwarves</option>
                            </select>
                        </div>
                    </div>

                    <div class="tool-group">
                        <label class="label">Number of AI Players</label>
                        <input type="number" id="ai-players" value="2" min="1" max="7" class="input">
                    </div>

                    <div class="tool-group">
                        <label class="label">
                            <input type="checkbox" id="use-3d-rendering" checked style="margin-right: 0.5rem;">
                            Use 3D Rendering
                        </label>
                    </div>
                </div>
                
                <div class="card-footer" style="justify-content: flex-end; gap: 0.75rem;">
                    <button id="cancel-setup" class="btn btn-outline" style="width: auto;">Cancel</button>
                    <button id="start-game" class="btn btn-default" style="width: auto;">Start Game</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const startBtn = document.getElementById('start-game');
        const cancelBtn = document.getElementById('cancel-setup');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Don't hide setup on cancel, just reload page
                window.location.reload();
            });
        }
    }

    startGame() {
        const mapSize = document.getElementById('map-size').value;
        const playerName = document.getElementById('player-name').value || 'Player 1';
        const playerFaction = document.getElementById('player-faction').value;
        const aiPlayers = parseInt(document.getElementById('ai-players').value) || 2;
        const use3D = document.getElementById('use-3d-rendering').checked;

        // Map size configuration
        const sizeMap = {
            small: { width: 20, height: 15 },
            medium: { width: 40, height: 30 },
            large: { width: 60, height: 45 }
        };

        const dimensions = sizeMap[mapSize] || sizeMap.medium;

        const config = {
            mapWidth: dimensions.width,
            mapHeight: dimensions.height,
            players: [
                {
                    name: playerName,
                    faction: playerFaction,
                    isAI: false
                }
            ],
            aiPlayers: aiPlayers,
            gameSettings: {
                use3DRendering: use3D
            }
        };

        // Initialize game
        try {
            this.gameManager.initializeGame(config);
            
            // Hide setup screen
            if (this.container) {
                this.container.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to start game:', error);
            alert('Failed to start game: ' + error.message);
        }
    }
}
