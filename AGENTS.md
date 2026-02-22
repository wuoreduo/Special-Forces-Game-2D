# AGENTS.md - Development Guide

## Project Overview

特战队射击游戏 2D is a vanilla JavaScript 2D side-scrolling shooter (Contra-style) with 5v5 team combat, AI teammates, 5 weapon types, and physics.

**Tech Stack:** HTML5 Canvas + CSS3 + JavaScript (ES6)

---

## Build / Run / Test

### Running the Game

No build step required. Runs directly in browser.

```bash
# Open directly
open index.html  # macOS
xdg-open index.html  # Linux

# Or use local server
python -m http.server 8080
npx http-server -p 8080
```

### Testing

No formal test framework. Manual testing via browser DevTools:
```javascript
window.game.state           // Check game state
window.game.players         // All player entities  
window.game.currentPlayer   // Currently controlled player
window.game.debugGodMode    // Toggle god mode
```

### Linting / Formatting

No linting or formatting tools configured.

---

## Code Style Guidelines

### File Organization

```
特战队射击游戏 2D/
├── index.html          # Main HTML (script tags define load order)
├── css/
│   └── style.css       # All styles
├── js/
│   ├── main.js         # Entry point
│   ├── game/           # Core systems (Game, Renderer, Physics, Camera)
│   ├── entities/       # Entity classes (Player, Projectile, Particle)
│   ├── weapons/        # Weapon classes and configs
│   ├── ai/             # AI controllers
│   ├── map/            # Map/level data
│   ├── ui/             # UI management
│   ├── pool/           # Object pool implementation
│   ├── audio/          # Audio system
│   └── utils/          # Utility functions
```

### JavaScript Conventions

**Naming:**
- Classes: `PascalCase` (e.g., `Player`, `Game`)
- Functions: `camelCase` (e.g., `shoot()`, `takeDamage()`)
- Private methods: `_prefix` (e.g., `_updateAI()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `WEAPONS`)

**Imports/Modules:**
- No ES6 modules - global script loading via `<script>` tags
- Dependencies loaded in `index.html` in order (base classes first)
- All classes attached to `window`: `window.ClassName = ClassName`

**Classes:**
- ES6 `class` syntax, extend base `Entity` class
- Constructor initializes all properties
- Private helper methods prefixed with `_`

```javascript
class Player extends Entity {
  constructor(x, y, team, isControlled = false) {
    super(x, y, 30, 50);
    this.team = team;
    this.isControlled = isControlled;
  }
  shoot(gameTime) { ... }
  _handleMovement(dt) { ... }
}
window.Player = Player;
```

**Comments:**
- Single-line: `// Comment text`
- File header: `// 游戏主类 - 游戏循环、状态管理`
- Comments in Chinese

### CSS Conventions

**Naming:** BEM-like (`.team-btn`, `.health-bar-fill`), utilities (`.hidden`, `.ui-screen`)

**Structure:** Reset → base → components (commented sections) → responsive (`@media`)

**Colors:** Hex colors, gradient backgrounds common for UI

### Error Handling

**Patterns:**
- Early returns for null/invalid states (guard clauses)
- Guard clauses at method start:
```javascript
if (!this.alive || this.reloading || !this.weapon) return [];
if (!player.alive) return false;
```
- Silent failures common (game continues running)
- Console logging for debugging in `main.js`

---

## Common Tasks

**Add a new weapon:**
1. Add config to `js/weapons/weapons.js` in `WEAPONS` object
2. Add button to weapon selection UI in `index.html`

**Add a new entity:**
1. Create class in `js/entities/` extending `Entity`
2. Add script tag in `index.html` after `Entity.js`
3. Instantiate in `Game._createPlayers()` or relevant method

**Modify physics:**
- Edit `js/game/Physics.js` for collision/physics logic
- Adjust values in `Player._applyPhysics()` for movement tuning

---

## Key Architecture Patterns

1. **Game Loop**: `requestAnimationFrame` in `Game.gameLoop()`
2. **Entity-Component-like**: Base `Entity` class, `Player`, `Projectile`, `Particle`
3. **Object Pool**: `ObjectPool` class for bullet/particle reuse
4. **Singleton-ish**: Systems attached to `Game` instance or `window`
5. **Data-Driven**: Weapon configs in `WEAPONS` constant

## Performance Considerations

- **Object pooling** for bullets and particles (reuse objects, reduce GC)
- **Distance squared** comparisons avoid unnecessary `Math.sqrt()`
- **Spatial hashing** for collision optimization
- **View frustum culling** - only render on-screen objects
- **AI throttled** to 30 FPS (not every frame)
