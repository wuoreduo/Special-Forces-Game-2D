# AGENTS.md - Development Guide

## Project Overview

特战队射击游戏 2D (Special Forces Shooting Game 2D) is a vanilla JavaScript 2D side-scrolling shooter game similar to Contra. It features 5v5 team combat with AI teammates, 5 weapon types, and a complete physics system.

**Tech Stack:** HTML5 Canvas + CSS3 + JavaScript (ES6)

---

## Build / Run / Test Commands

### Running the Game

There is no build step required. The game runs directly in a browser.

```bash
# Option 1: Open directly in browser
# Double-click index.html or open with:
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows

# Option 2: Python local server
python -m http.server 8080
# Then visit: http://localhost:8080

# Option 3: Node.js server (requires http-server)
npx http-server -p 8080
```

### Testing

**No formal test framework exists.** Testing is manual:
1. Open the game in a browser (Chrome 80+, Firefox 75+, Edge 80+)
2. Use browser DevTools Console for debugging
3. Access `window.game` for the game instance (debugging)

### Linting / Formatting

**No linting or formatting tools are configured.** Code style is enforced by convention (see below).

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
- Classes: `PascalCase` (e.g., `Player`, `Game`, `Weapon`)
- Functions/Methods: `camelCase` (e.g., `shoot()`, `takeDamage()`)
- Private methods: `_prefixWithUnderscore` (e.g., `_updateAI()`, `_resizeCanvas()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `WEAPONS`)
- Files: Match class name or purpose (e.g., `Player.js`, `weapons.js`)

**Classes:**
- Use ES6 `class` syntax for all game entities
- Export via `window.ClassName = ClassName` pattern at file end
- Constructor initializes all properties
- Private helper methods prefixed with `_`

```javascript
class Player extends Entity {
  constructor(x, y, team, isControlled = false) {
    super(x, y, 30, 50);
    this.team = team;
    this.isControlled = isControlled;
  }

  // Public method
  shoot(gameTime) { ... }

  // Private helper
  _handleMovement(dt) { ... }
}

window.Player = Player;
```

**Comments:**
- Single-line: `// Comment text`
- File header: `// 游戏主类 - 游戏循环、状态管理` (brief purpose description)
- Comment in Chinese (matching project language)

**Code Structure:**
- No modules (ES6 import/export) - uses global script loading
- Dependencies loaded via `<script>` tags in `index.html` in order
- All classes attached to `window` for global access

### CSS Conventions

**Naming:**
- BEM-like pattern: `.block-element-modifier`
- Examples: `.team-btn`, `.health-bar-fill`, `.setting-row`
- Utility classes: `.hidden`, `.ui-screen`, `.ui-hud`

**Structure:**
- Reset first (`* { margin: 0; padding: 0; box-sizing: border-box; }`)
- Body/base styles
- Component sections with comments (`/* UI 通用样式 */`, `/* 队伍选择 */`)
- Responsive rules at end (`@media`)

**Colors:**
- Use hex colors with descriptive naming in classes
- Gradient backgrounds common for UI elements

### Error Handling

**Patterns:**
- Early returns for null/invalid states
- Guard clauses at method start:
```javascript
if (!this.alive || this.reloading || !this.weapon) return [];
if (!player.alive) return false;
```
- Silent failures common (game continues running)
- Console logging for debugging in `main.js`

### Performance Considerations

- **Object pooling** for bullets and particles (reuse objects, reduce GC)
- **Distance squared** comparisons avoid unnecessary `Math.sqrt()`
- **Spatial hashing** mentioned in README for collision optimization
- **View frustum culling** - only render on-screen objects
- **AI throttled** to 30 FPS (not every frame)

---

## Key Architecture Patterns

1. **Game Loop**: `requestAnimationFrame` in `Game.gameLoop()`
2. **Entity-Component-like**: Base `Entity` class with `Player`, `Projectile`, `Particle`
3. **Object Pool**: `ObjectPool` class for bullet/particle reuse
4. **Singleton-ish**: Systems attached to `Game` instance or `window`
5. **Data-Driven**: Weapon configs in `WEAPONS` constant object

---

## Cursor / Copilot Rules

**No existing rules found.** This file serves as the primary AI assistant guide.

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

## Browser Debugging Tips

```javascript
// Access game instance
window.game

// Common debug operations:
window.game.state           // Check game state
window.game.players         // All player entities
window.game.currentPlayer   // Currently controlled player
window.game.scores          // Current scores
window.game.settings        // Game settings
```
