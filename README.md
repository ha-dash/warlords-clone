# Warlords Clone

A modern web-based clone of the classic turn-based strategy game Warlords, built with HTML5, CSS3, and JavaScript.

## Project Structure

```
warlords-clone/
├── index.html          # Main HTML file with game UI
├── styles.css          # CSS styling for the game
├── package.json        # Project configuration
├── js/
│   ├── main.js         # Main entry point
│   └── core/
│       ├── GameManager.js  # Central game controller
│       └── GameState.js    # Game state management
└── .kiro/specs/warlords-clone/  # Specification documents
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Getting Started

### Running the Game

1. **Using Python (recommended):**
   ```bash
   python -m http.server 8000
   ```
   Then open http://localhost:8000 in your browser.

2. **Using Node.js:**
   ```bash
   npm start
   ```
   Then open http://localhost:8000 in your browser.

3. **Direct file access:**
   Simply open `index.html` in your web browser (some features may not work due to CORS restrictions).

### Current Features

- ✅ Basic project structure with HTML5 Canvas
- ✅ Responsive CSS styling with game-themed UI
- ✅ ES6 module system with proper imports/exports
- ✅ GameManager class with initialization methods
- ✅ GameState management with observer pattern
- ✅ Turn-based game flow foundation
- ✅ Save/Load system foundation
- ✅ Basic UI controls (End Turn, Save, Load buttons)

### Next Steps

This is the foundation implementation. The next tasks will add:
- Map and terrain system
- Unit management and movement
- Combat system
- City management
- AI system
- And more...

## UI Components

The project uses Shadcn UI components adapted for vanilla JavaScript. See [docs/shadcn-usage.md](docs/shadcn-usage.md) for usage instructions.

- **Theme**: Maia style with Cyan theme
- **Font**: Public Sans
- **Radius**: Large
- Components: Button, Card, Dialog, Input, Badge, Alert

## Development

The game is built using modern JavaScript (ES6+) with a modular architecture. Each system is designed to be independent and testable.

### Key Classes

- **GameManager**: Central controller that coordinates all game systems
- **GameState**: Manages complete game state with observer pattern for change notifications

### Browser Compatibility

- Modern browsers with ES6 module support
- HTML5 Canvas support required
- Local Storage support for save/load functionality