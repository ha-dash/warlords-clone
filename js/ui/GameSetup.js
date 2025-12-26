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
        this.container.innerHTML = `
            <div class="setup-panel" style="
                background: rgba(20, 20, 30, 0.95);
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                color: #fff;
                max-width: 500px;
                margin: 50px auto;
                font-family: 'Segoe UI', system-ui, sans-serif;
                border: 1px solid #444;
            ">
                <h1 style="color: #f1c40f; text-align: center; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px;">New Game</h1>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #aaa;">Map Size</label>
                    <select id="map-size" style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                        <option value="small">Small (20x15)</option>
                        <option value="medium" selected>Medium (40x30)</option>
                        <option value="large">Large (60x45)</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #aaa;">Your Faction</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="player-name" value="Player 1" placeholder="Name" style="flex: 1; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                        <select id="player-faction" style="flex: 1; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                            <option value="HUMANS">Humans</option>
                            <option value="ELVES">Elves</option>
                            <option value="DEMONS">Demons</option>
                            <option value="DWARVES">Dwarves</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #aaa;">Opponents</label>
                    <select id="opponent-count" style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                        <option value="1">1 Opponent</option>
                        <option value="2" selected>2 Opponents</option>
                        <option value="3">3 Opponents</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom: 30px;">
                    <label style="display: block; margin-bottom: 8px; color: #aaa;">Difficulty</label>
                    <select id="difficulty" style="width: 100%; padding: 10px; background: #333; border: 1px solid #555; color: white; border-radius: 4px;">
                        <option value="EASY">Easy</option>
                        <option value="NORMAL" selected>Normal</option>
                        <option value="HARD">Hard</option>
                    </select>
                </div>

                <button id="start-game-btn" style="
                    width: 100%;
                    padding: 15px;
                    background: #27ae60;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 1.1em;
                    font-weight: bold;
                    cursor: pointer;
                    transition: background 0.2s;
                ">Start Conquest</button>
            </div>
        `;

        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
    }

    startGame() {
        const mapSize = document.getElementById('map-size').value;
        const playerName = document.getElementById('player-name').value || 'Player';
        const playerFaction = document.getElementById('player-faction').value;
        const opponentCount = parseInt(document.getElementById('opponent-count').value);
        const difficulty = document.getElementById('difficulty').value;

        // Map dimensions
        let width = 40, height = 30;
        if (mapSize === 'small') { width = 20; height = 15; }
        if (mapSize === 'large') { width = 60; height = 45; }

        // Create player config
        const players = [
            {
                id: 0,
                name: playerName,
                faction: playerFaction,
                color: this.getFactionColor(playerFaction),
                isAI: false
            }
        ];

        // Generate opponents
        const factions = ['HUMANS', 'ELVES', 'DEMONS', 'DWARVES'].filter(f => f !== playerFaction);
        for (let i = 0; i < opponentCount; i++) {
            const faction = factions[i % factions.length];
            players.push({
                id: i + 1,
                name: `AI ${i + 1}`,
                faction: faction,
                color: this.getFactionColor(faction),
                isAI: true
            });
        }

        const config = {
            map: { width, height, hexSize: 32 },
            players: players,
            gameSettings: {
                difficultyLevel: difficulty,
                enableAnimations: true
            }
        };

        // Hide setup screen
        this.container.style.display = 'none';

        // Start game
        this.gameManager.initializeGame(config);
    }

    getFactionColor(faction) {
        switch (faction) {
            case 'HUMANS': return '#0066CC'; // Blue
            case 'ELVES': return '#00CC66';  // Green
            case 'DEMONS': return '#CC0066'; // Red/Pink
            case 'DWARVES': return '#8B4513'; // Brown
            default: return '#95a5a6';       // Grey
        }
    }
}
